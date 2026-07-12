const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function readPatchFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asPatchText(value) {
    return value == null ? '' : String(value);
}

function trimForReport(value) {
    const text = asPatchText(value).replace(/\r?\n/g, ' / ').replace(/\|/g, '\\|');
    return text.length > 180 ? text.slice(0, 177) + '...' : text;
}

function assertSafeIdentifier(value, label) {
    const text = String(value || '');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text)) throw new Error(label + ' is not a safe SQL identifier.');
    return text;
}

function backupPathError(backupPath, dbPath) {
    if (!backupPath) return '--apply requires --backup <path>.';
    if (path.resolve(backupPath).toLowerCase() === path.resolve(dbPath).toLowerCase()) {
        return '--backup must not point to the active database file.';
    }
    if (fs.existsSync(backupPath)) {
        const stat = fs.statSync(backupPath);
        return stat.isDirectory()
            ? '--backup must point to a new database backup file, not an existing directory.'
            : '--backup must point to a new file so an existing recovery point is not overwritten.';
    }
    return '';
}

async function createDatabaseBackup(db, backupPath) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    await db.backup(backupPath);
    return fs.statSync(backupPath).size;
}

function readProductColumns(db) {
    return new Set(db.prepare('PRAGMA table_info(products)').all().map((row) => row.name));
}

function matchProduct(db, item, blockers) {
    const attempts = [];
    if (Number.isInteger(item.row_id)) {
        attempts.push({ label: 'row_id', run: () => db.prepare('SELECT * FROM products WHERE id = ?').all(item.row_id) });
    }
    if (typeof item.slug === 'string' && item.slug.trim()) {
        attempts.push({ label: 'slug', run: () => db.prepare('SELECT * FROM products WHERE slug = ?').all(item.slug.trim()) });
    }
    if (typeof item.legacy_id === 'string' && item.legacy_id.trim()) {
        attempts.push({ label: 'legacy_id', run: () => db.prepare('SELECT * FROM products WHERE legacy_id = ?').all(item.legacy_id.trim()) });
    }
    if (item.id != null && String(item.id).trim()) {
        attempts.push({
            label: 'id-as-slug-or-legacy',
            run: () => db.prepare('SELECT * FROM products WHERE slug = ? OR legacy_id = ?').all(String(item.id), String(item.id))
        });
    }
    if (!attempts.length) {
        blockers.push('products item is missing row_id, slug, legacy_id, or id.');
        return null;
    }
    for (const attempt of attempts) {
        const rows = attempt.run();
        if (rows.length === 1) return { row: rows[0], matchedBy: attempt.label };
        if (rows.length > 1) {
            blockers.push('products item matched multiple rows by ' + attempt.label + '.');
            return null;
        }
    }
    blockers.push('products item did not match any row: ' + JSON.stringify({
        row_id: item.row_id,
        slug: item.slug,
        legacy_id: item.legacy_id,
        id: item.id
    }));
    return null;
}

function validatePolicyMetadata(data, policy, policyExplicit, errors) {
    const inputPolicy = isPlainObject(data && data.meta) && typeof data.meta.policy === 'string'
        ? data.meta.policy.trim()
        : '';
    if (policyExplicit && !inputPolicy) {
        errors.push('Explicit --policy requires meta.policy in the patch input.');
    } else if (inputPolicy && inputPolicy !== policy.id) {
        errors.push('Patch input meta.policy ' + inputPolicy + ' does not match CLI policy ' + policy.id + '.');
    }
    policy.validateMetadata(isPlainObject(data && data.meta) ? data.meta : {}).forEach((message) => errors.push(message));
}

function validatePatchShape(data, columns, policy, errors) {
    if (!isPlainObject(data)) {
        errors.push('Patch input must be a JSON object.');
        return [];
    }
    if (!Array.isArray(data.products)) {
        errors.push('Patch input must include a products array.');
        return [];
    }
    const allowedFields = new Set(policy.allowedFields);
    data.products.forEach((item, index) => {
        if (!isPlainObject(item)) {
            errors.push('products[' + index + '] must be an object.');
            return;
        }
        if (!isPlainObject(item.expected)) errors.push('products[' + index + '].expected must be an object.');
        if (!isPlainObject(item.target)) errors.push('products[' + index + '].target must be an object.');
        const targetFields = Object.keys(item.target || {});
        const expectedFields = Object.keys(item.expected || {});
        if (!targetFields.length) errors.push('products[' + index + '].target must include at least one field.');
        targetFields.forEach((field) => {
            if (!allowedFields.has(field)) {
                errors.push('products[' + index + '] has unsupported target field: ' + field + ' for policy ' + policy.id + '.');
            }
            if (!columns.has(field)) errors.push('products[' + index + '] targets missing products column: ' + field + '.');
            if (!expectedFields.includes(field)) errors.push('products[' + index + '] is missing expected.' + field + '.');
            if (item.target && typeof item.target[field] !== 'string') errors.push('products[' + index + '].target.' + field + ' must be a string.');
            if (item.expected && typeof item.expected[field] !== 'string') errors.push('products[' + index + '].expected.' + field + ' must be a string.');
            if (allowedFields.has(field) && typeof item.target[field] === 'string' && typeof item.expected[field] === 'string') {
                policy.validateChange({
                    field,
                    expected: item.expected[field],
                    target: item.target[field],
                    operation: data.meta && data.meta.operation
                }).forEach((message) => {
                    errors.push('products[' + index + '].target.' + field + ' ' + message);
                });
            }
        });
        expectedFields.forEach((field) => {
            if (!targetFields.includes(field)) errors.push('products[' + index + '].expected.' + field + ' has no matching target field.');
            if (!allowedFields.has(field)) errors.push('products[' + index + '] has unsupported expected field: ' + field + ' for policy ' + policy.id + '.');
        });
    });
    return data.products;
}

function analyzeProducts(db, items, columns, policy, blockers) {
    const allowedFields = new Set(policy.allowedFields);
    const records = [];
    items.forEach((item, index) => {
        const match = matchProduct(db, item, blockers);
        if (!match) return;
        const changes = [];
        Object.keys(item.target || {}).forEach((field) => {
            if (!allowedFields.has(field) || !columns.has(field)) return;
            const before = asPatchText(match.row[field]);
            const expected = asPatchText(item.expected[field]);
            const after = asPatchText(item.target[field]);
            if (before !== expected) {
                blockers.push('products[' + index + '] ' + (match.row.slug || match.row.legacy_id || match.row.id) + '.' + field + ' expected value mismatch.');
                return;
            }
            if (before === after) return;
            changes.push({ field, before, after });
        });
        records.push({
            index,
            rowId: match.row.id,
            slug: match.row.slug || '',
            legacyId: match.row.legacy_id || '',
            status: match.row.status || '',
            matchedBy: match.matchedBy,
            changes
        });
    });
    return records;
}

function applyRecords(db, records) {
    const timestamp = new Date().toISOString();
    const changed = records.filter((record) => record.changes.length);
    if (!changed.length) return 0;
    const transaction = db.transaction(() => {
        changed.forEach((record) => {
            const fields = record.changes.map((change) => assertSafeIdentifier(change.field, 'products field'));
            const assignments = fields.map((field) => field + ' = @' + field).join(', ');
            const params = { __rowId: record.rowId, updated_at: timestamp };
            record.changes.forEach((change) => { params[change.field] = change.after; });
            const result = db.prepare(
                'UPDATE products SET ' + assignments + ', version = COALESCE(version, 0) + 1, updated_at = @updated_at WHERE id = @__rowId'
            ).run(params);
            if (result.changes !== 1) {
                throw new Error('products ' + (record.slug || record.legacyId || record.rowId) + ' expected to update exactly one row, changed ' + result.changes + '.');
            }
        });
    });
    transaction();
    return changed.length;
}

function writeReport(report) {
    fs.mkdirSync(path.dirname(report.reportPath), { recursive: true });
    const fieldCounts = {};
    report.records.forEach((record) => record.changes.forEach((change) => {
        fieldCounts[change.field] = (fieldCounts[change.field] || 0) + 1;
    }));
    const lines = [
        '# products field safe patch report',
        '',
        '- Mode: ' + report.mode,
        '- Policy: ' + report.policyId,
        '- Operation: ' + report.operation,
        '- Database: `' + report.dbPath + '`',
        '- Input: `' + report.inputPath + '`',
        '- Dry run only: ' + (report.mode === 'dry-run' ? 'yes' : 'no'),
        '- Database changed: ' + (report.databaseChanged ? 'yes' : 'no'),
        '- Backup path: ' + (report.backupPath ? '`' + report.backupPath + '`' : 'none'),
        '- Backup size: ' + (report.backupSizeBytes == null ? 'not created' : report.backupSizeBytes + ' bytes'),
        '- Input products: ' + report.inputCount,
        '- Matched products: ' + report.records.length,
        '- Changed products: ' + report.records.filter((record) => record.changes.length).length,
        '- Field changes: ' + report.records.reduce((sum, record) => sum + record.changes.length, 0),
        '- Field counts: ' + (Object.keys(fieldCounts).length ? Object.keys(fieldCounts).sort().map((field) => field + '=' + fieldCounts[field]).join(', ') : 'none'),
        '- Apply blockers: ' + report.blockers.length,
        '- Errors: ' + report.errors.length,
        ''
    ];
    lines.push('## Changes', '');
    if (!report.records.some((record) => record.changes.length)) {
        lines.push('None.', '');
    } else {
        lines.push('| Product | Matched by | Field | Before | After |');
        lines.push('| --- | --- | --- | --- | --- |');
        report.records.forEach((record) => record.changes.forEach((change) => {
            lines.push('| `' + (record.slug || record.legacyId || record.rowId) + '` | ' + record.matchedBy + ' | `' + change.field + '` | ' + trimForReport(change.before) + ' | ' + trimForReport(change.after) + ' |');
        }));
        lines.push('');
    }
    if (report.blockers.length) {
        lines.push('## Apply blockers', '');
        report.blockers.forEach((blocker) => lines.push('- ' + blocker));
        lines.push('');
    }
    if (report.errors.length) {
        lines.push('## Errors', '');
        report.errors.forEach((error) => lines.push('- ' + error));
        lines.push('');
    }
    fs.writeFileSync(report.reportPath, lines.join('\n'), 'utf8');
}

async function runProductFieldPatch(options) {
    const mode = options.mode;
    if (mode !== 'dry-run' && mode !== 'apply') throw new Error('mode must be dry-run or apply.');
    const policy = options.policy;
    if (!policy || !policy.id || !Array.isArray(policy.allowedFields)) throw new Error('A valid product field patch policy is required.');
    const errors = [];
    const blockers = [];
    const data = readPatchFile(options.inputPath);
    validatePolicyMetadata(data, policy, Boolean(options.policyExplicit), errors);
    if (mode === 'apply') {
        const backupError = backupPathError(options.backupPath, options.dbPath);
        if (backupError) errors.push(backupError);
    }
    let db = null;
    const report = {
        mode,
        policyId: policy.id,
        operation: isPlainObject(data.meta) && data.meta.operation ? data.meta.operation : 'legacy',
        dbPath: options.dbPath,
        inputPath: options.inputPath,
        reportPath: options.reportPath,
        backupPath: '',
        backupSizeBytes: null,
        databaseChanged: false,
        inputCount: Array.isArray(data && data.products) ? data.products.length : 0,
        records: [],
        blockers,
        errors
    };
    try {
        db = new Database(options.dbPath, { readonly: mode !== 'apply', fileMustExist: true });
        const columns = readProductColumns(db);
        const items = validatePatchShape(data, columns, policy, errors);
        if (!errors.length) report.records = analyzeProducts(db, items, columns, policy, blockers);
        if (mode === 'apply' && !errors.length && !blockers.length) {
            report.backupPath = options.backupPath;
            report.backupSizeBytes = await createDatabaseBackup(db, options.backupPath);
            report.databaseChanged = applyRecords(db, report.records) > 0;
        }
    } finally {
        if (db) db.close();
    }
    writeReport(report);
    return report;
}

module.exports = {
    runProductFieldPatch
};
