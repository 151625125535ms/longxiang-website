const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createVerifiedSqliteBackupFromConnection } = require('../../server/lib/sqliteBackup');
const {
    ARABIC_SEO_SOURCE_FIELDS,
    asSourceText,
    sourceSnapshotHash
} = require('./product-arabic-seo-source');
const { validateArabicSeoPatchPair } = require('./product-arabic-seo-patch-pair');
const { loadLocaleRegistry } = require('../../server/lib/localeRegistry');
const { createTranslationWriter } = require('../../server/lib/translationWriter');

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
    const matches = [];
    let failed = false;
    for (const attempt of attempts) {
        const rows = attempt.run();
        if (rows.length === 1) {
            matches.push({ row: rows[0], matchedBy: attempt.label });
            continue;
        }
        if (rows.length > 1) {
            blockers.push('products item matched multiple rows by ' + attempt.label + '.');
        } else {
            blockers.push('products item did not match a row by ' + attempt.label + '.');
        }
        failed = true;
    }
    if (failed || !matches.length) return null;
    const rowIds = new Set(matches.map((match) => match.row.id));
    if (rowIds.size !== 1) {
        blockers.push('products item identity fields resolve to different rows: ' + matches.map(function (match) {
            return match.matchedBy + '=' + match.row.id;
        }).join(', ') + '.');
        return null;
    }
    return {
        row: matches[0].row,
        matchedBy: matches.map((match) => match.matchedBy).join('+')
    };
}

function validatePolicyMetadata(data, policy, policyExplicit, mode, errors) {
    const inputPolicy = isPlainObject(data && data.meta) && typeof data.meta.policy === 'string'
        ? data.meta.policy.trim()
        : '';
    if (policyExplicit && !inputPolicy) {
        errors.push('Explicit --policy requires meta.policy in the patch input.');
    } else if (inputPolicy && inputPolicy !== policy.id) {
        errors.push('Patch input meta.policy ' + inputPolicy + ' does not match CLI policy ' + policy.id + '.');
    }
    policy.validateMetadata(isPlainObject(data && data.meta) ? data.meta : {}, { mode }).forEach((message) => errors.push(message));
}

function validateRollbackPair(data, policy, mode, pairedForwardPath, errors) {
    const operation = isPlainObject(data && data.meta) ? data.meta.operation : '';
    const rollbackGuard = policy.rollbackGuard || {};
    if (operation !== 'rollback' || !rollbackGuard.pairedForward) return null;
    if (!pairedForwardPath) {
        errors.push('rollback requires --paired-forward <path>.');
        return null;
    }
    let pairedForward;
    try {
        pairedForward = readPatchFile(pairedForwardPath);
    } catch (err) {
        errors.push('Unable to read paired forward patch: ' + (err && err.message ? err.message : String(err)));
        return null;
    }
    const pairValidation = typeof policy.validatePatchPair === 'function'
        ? policy.validatePatchPair(pairedForward, data)
        : validateArabicSeoPatchPair(pairedForward, data);
    pairValidation.errors.forEach((message) => errors.push(message));
    if (mode === 'apply' && rollbackGuard.approvedForwardForApply
        && (!pairedForward.meta || pairedForward.meta.approval_status !== 'approved')) {
        errors.push('rollback apply requires the paired forward patch approval_status to be approved.');
    }
    return pairedForward;
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
    const operation = isPlainObject(data.meta) ? data.meta.operation : '';
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
        (policy.requiredFields || []).forEach(function (field) {
            if (!targetFields.includes(field)) errors.push('products[' + index + '] is missing target.' + field + '.');
            if (!expectedFields.includes(field)) errors.push('products[' + index + '] is missing expected.' + field + '.');
        });
        (policy.requiredIdentityFields || []).forEach(function (field) {
            const value = item[field];
            const valid = field === 'row_id'
                ? Number.isInteger(value) && value > 0
                : typeof value === 'string' && Boolean(value.trim());
            if (!valid) errors.push('products[' + index + '].' + field + ' is required by policy ' + policy.id + '.');
        });
        if (policy.requiredStatus && (typeof item.status !== 'string' || !item.status.trim())) {
            errors.push('products[' + index + '].status is required by policy ' + policy.id + '.');
        }
        const forwardGuard = policy.forwardGuard || {};
        if (operation === 'forward' && forwardGuard.expectedVersion) {
            if (!Number.isInteger(item.expectedVersion) || item.expectedVersion < 0) {
                errors.push('products[' + index + '].expectedVersion must be a non-negative integer.');
            }
        }
        if (operation === 'forward' && Array.isArray(forwardGuard.sourceFields)) {
            if (!isPlainObject(item.sourceExpected)) {
                errors.push('products[' + index + '].sourceExpected must be an object.');
            } else {
                const sourceFields = Object.keys(item.sourceExpected);
                forwardGuard.sourceFields.forEach(function (field) {
                    if (!sourceFields.includes(field)) errors.push('products[' + index + '].sourceExpected is missing ' + field + '.');
                    if (sourceFields.includes(field) && typeof item.sourceExpected[field] !== 'string') {
                        errors.push('products[' + index + '].sourceExpected.' + field + ' must be a string.');
                    }
                });
                sourceFields.forEach(function (field) {
                    if (!forwardGuard.sourceFields.includes(field)) {
                        errors.push('products[' + index + '].sourceExpected has unsupported field ' + field + '.');
                    }
                });
            }
        }
        if (operation === 'forward' && forwardGuard.sourceSnapshotHash) {
            if (typeof item.sourceSnapshotHash !== 'string' || !/^[a-f0-9]{64}$/i.test(item.sourceSnapshotHash)) {
                errors.push('products[' + index + '].sourceSnapshotHash must be a SHA-256 hex value.');
            }
        }
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
                    operation: data.meta && data.meta.operation,
                    meta: data.meta || {}
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

function validateMatchedProduct(item, row, index, policy, operation, blockers) {
    if (policy.requiredStatus) {
        if (row.status === 'deleted') blockers.push('products[' + index + '] resolves to a deleted product.');
        if (asPatchText(row.status) !== asPatchText(item.status)) {
            blockers.push('products[' + index + '] status mismatch.');
        }
    }

    const forwardGuard = policy.forwardGuard || {};
    if (operation !== 'forward') return;
    if (forwardGuard.expectedVersion && Number(row.version || 0) !== Number(item.expectedVersion)) {
        blockers.push('products[' + index + '] expectedVersion mismatch.');
    }
    (forwardGuard.sourceFields || []).forEach(function (field) {
        if (asSourceText(row[field]) !== asSourceText(item.sourceExpected && item.sourceExpected[field])) {
            blockers.push('products[' + index + '].sourceExpected.' + field + ' mismatch.');
        }
    });
    if (forwardGuard.sourceSnapshotHash) {
        const currentHash = sourceSnapshotHash(row);
        if (currentHash !== String(item.sourceSnapshotHash || '').toLowerCase()) {
            blockers.push('products[' + index + '] sourceSnapshotHash mismatch.');
        }
    }
}

function validateRecordSet(db, records, policy, operation, blockers) {
    const seen = new Set();
    records.forEach(function (record) {
        if (seen.has(record.rowId)) blockers.push('products resolved row id is duplicated: ' + record.rowId + '.');
        seen.add(record.rowId);
    });

    const forwardGuard = policy.forwardGuard || {};
    if (operation !== 'forward' || !forwardGuard.exactActiveSet) return;
    const activeIds = db.prepare("SELECT id FROM products WHERE status != 'deleted' ORDER BY id").all().map(function (row) {
        return row.id;
    });
    const patchIds = Array.from(seen).sort(function (a, b) { return a - b; });
    const missing = activeIds.filter(function (id) { return !seen.has(id); });
    const activeSet = new Set(activeIds);
    const extra = patchIds.filter(function (id) { return !activeSet.has(id); });
    if (missing.length || extra.length || activeIds.length !== patchIds.length) {
        blockers.push('forward patch product set does not equal the current status != deleted set; missing=[' + missing.join(',') + '], extra=[' + extra.join(',') + '].');
    }
}

function analyzeProducts(db, data, items, columns, policy, blockers) {
    const allowedFields = new Set(policy.allowedFields);
    const operation = isPlainObject(data.meta) ? data.meta.operation : '';
    const records = [];
    items.forEach((item, index) => {
        const match = matchProduct(db, item, blockers);
        if (!match) return;
        validateMatchedProduct(item, match.row, index, policy, operation, blockers);
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
            changes,
            item,
            beforeRow: match.row
        });
    });
    validateRecordSet(db, records, policy, operation, blockers);
    return records;
}

function assertUnchangedFields(record, afterRow, allowedFields) {
    const mutable = new Set(allowedFields.concat(['version', 'updated_at']));
    Object.keys(record.beforeRow).forEach(function (field) {
        if (mutable.has(field)) return;
        if (record.beforeRow[field] !== afterRow[field]) {
            throw new Error('products ' + record.rowId + ' changed unauthorized field ' + field + '.');
        }
    });
}

function tableExists(db, tableName) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function localeForLegacyField(field) {
    if (/_ar$/i.test(field)) return 'ar';
    if (/_fr$/i.test(field)) return 'fr';
    if (/_ru$/i.test(field)) return 'ru';
    if (/_en$/i.test(field) || /^(?:seo_title|seo_description|seo_keywords)$/i.test(field)) return 'en';
    return '';
}

// TRANSLATION_WRITER_SYNC: dynamic product field patches must not bypass published revisions.
function syncPatchedTranslationRevisions(db, record) {
    if (!tableExists(db, 'product_translations')) return;
    const locales = [...new Set(record.changes.map(function (change) {
        return localeForLegacyField(change.field);
    }).filter(Boolean))].filter(function (locale) {
        return Boolean(db.prepare(`
            SELECT 1 FROM product_translations
            WHERE product_id = ? AND locale = ? AND revision_state = 'published'
            LIMIT 1
        `).get(record.rowId, locale));
    });
    if (!locales.length) return;
    createTranslationWriter({ db, registry: loadLocaleRegistry() }).publishLegacyWrite({
        entityType: 'product',
        entityId: record.rowId,
        locales,
        actor: { username: 'product-field-safe-patch' }
    });
}

function applyRecords(db, data, items, columns, policy) {
    const timestamp = new Date().toISOString();
    const operation = isPlainObject(data.meta) ? data.meta.operation : '';
    const transaction = db.transaction(function () {
        const blockers = [];
        const records = analyzeProducts(db, data, items, columns, policy, blockers);
        if (blockers.length) {
            const error = new Error('Patch final transaction validation failed.');
            error.patchBlockers = blockers;
            throw error;
        }
        const changed = records.filter((record) => record.changes.length);
        changed.forEach((record) => {
            const fields = record.changes.map((change) => assertSafeIdentifier(change.field, 'products field'));
            const assignments = fields.map((field) => field + ' = @' + field).join(', ');
            const conditions = ['id = @__rowId'];
            const params = { __rowId: record.rowId, updated_at: timestamp };
            record.changes.forEach((change) => { params[change.field] = change.after; });
            if (policy.requiredStatus) {
                conditions.push("COALESCE(status, '') = @__status");
                params.__status = asPatchText(record.item.status);
            }
            if (operation === 'forward' && policy.forwardGuard && policy.forwardGuard.expectedVersion) {
                conditions.push('COALESCE(version, 0) = @__expectedVersion');
                params.__expectedVersion = Number(record.item.expectedVersion);
            }
            Object.keys(record.item.expected || {}).forEach(function (field) {
                const safeField = assertSafeIdentifier(field, 'products expected field');
                conditions.push("COALESCE(" + safeField + ", '') = @__expected_" + safeField);
                params['__expected_' + safeField] = asPatchText(record.item.expected[field]);
            });
            const result = db.prepare(
                'UPDATE products SET ' + assignments + ', version = COALESCE(version, 0) + 1, updated_at = @updated_at WHERE ' + conditions.join(' AND ')
            ).run(params);
            if (result.changes !== 1) {
                throw new Error('products ' + (record.slug || record.legacyId || record.rowId) + ' expected to update exactly one row, changed ' + result.changes + '.');
            }
            const afterRow = db.prepare('SELECT * FROM products WHERE id = ?').get(record.rowId);
            Object.keys(record.item.target || {}).forEach(function (field) {
                if (asPatchText(afterRow[field]) !== asPatchText(record.item.target[field])) {
                    throw new Error('products ' + record.rowId + '.' + field + ' did not reach the requested target value.');
                }
            });
            assertUnchangedFields(record, afterRow, policy.allowedFields);
            syncPatchedTranslationRevisions(db, record);
        });
        return { changedCount: changed.length, records };
    });
    return transaction.immediate();
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
        '- Backup verified: ' + (report.backupVerified ? 'yes' : 'no'),
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
    validatePolicyMetadata(data, policy, Boolean(options.policyExplicit), mode, errors);
    validateRollbackPair(data, policy, mode, options.pairedForwardPath, errors);
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
        backupVerified: false,
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
        if (!errors.length) report.records = analyzeProducts(db, data, items, columns, policy, blockers);
        if (mode === 'apply' && !errors.length && !blockers.length) {
            report.backupPath = options.backupPath;
            const backupResult = await createVerifiedSqliteBackupFromConnection(db, {
                sourcePath: options.dbPath,
                backupPath: options.backupPath
            });
            report.backupSizeBytes = backupResult.sizeBytes;
            report.backupVerified = true;
            if (typeof options.beforeApplyTransaction === 'function') {
                await options.beforeApplyTransaction({ dbPath: options.dbPath, report });
            }
            try {
                const applyResult = applyRecords(db, data, items, columns, policy);
                report.records = applyResult.records;
                report.databaseChanged = applyResult.changedCount > 0;
            } catch (err) {
                if (Array.isArray(err && err.patchBlockers)) {
                    err.patchBlockers.forEach(function (blocker) { blockers.push(blocker); });
                } else {
                    throw err;
                }
            }
        }
    } catch (err) {
        errors.push(err && err.message ? err.message : String(err));
    } finally {
        if (db) db.close();
    }
    writeReport(report);
    return report;
}

module.exports = {
    runProductFieldPatch
};
