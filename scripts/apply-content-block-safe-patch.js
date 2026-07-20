require('./lib/archived-legacy-writer-guard').assertArchivedLegacyWriterAllowed(__filename);

const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const homeDir = process.env.USERPROFILE || os.homedir();
const stageDir = path.join(homeDir || root, 'Desktop', 'new', 'stage');
const defaultDbPath = process.env.DB_PATH
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(root, process.env.DB_PATH))
    : path.join(root, 'data', 'longxiang.db');
const allowedLocales = ['fr', 'ru'];
const knownLocaleCodes = ['en', 'ar', 'fr', 'ru', 'pt'];

function localeSuffix(locale) {
    return String(locale || '').charAt(0).toUpperCase() + String(locale || '').slice(1);
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function localePathPattern(locale) {
    const code = escapeRegExp(locale);
    const suffix = escapeRegExp(localeSuffix(locale));
    return new RegExp('(^|[._])(' + code + ')([._]|$)|(^|[a-z0-9])(' + suffix + ')([A-Z0-9_]|$)');
}

function defaultInputPathFor(locale) {
    return path.join(stageDir, locale + '-content-blocks-safe-patch.json');
}

function defaultReportPathFor(locale) {
    return path.join(stageDir, locale + '-content-blocks-safe-patch-apply.md');
}

function parseArgs(argv) {
    const args = {
        locale: 'ru',
        dryRun: false,
        apply: false,
        requireCleanBoundary: false,
        input: '',
        db: defaultDbPath,
        report: '',
        backup: ''
    };
    const valueOptions = new Set(['locale', 'input', 'db', 'report', 'backup']);
    let inputProvided = false;
    let reportProvided = false;

    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg === '--apply') {
            args.apply = true;
        } else if (arg === '--require-clean-boundary') {
            args.requireCleanBoundary = true;
        } else if (arg.startsWith('--')) {
            const eqIndex = arg.indexOf('=');
            const name = arg.slice(2, eqIndex === -1 ? undefined : eqIndex);
            if (!valueOptions.has(name)) throw new Error('Unknown option: ' + arg);
            if (eqIndex !== -1) {
                args[name] = arg.slice(eqIndex + 1);
            } else {
                const value = argv[index + 1];
                if (!value || value.startsWith('--')) throw new Error('Missing value for --' + name);
                args[name] = value;
                index += 1;
            }
            if (name === 'input') inputProvided = true;
            if (name === 'report') reportProvided = true;
        } else {
            throw new Error('Unexpected argument: ' + arg);
        }
    }

    args.locale = String(args.locale || 'ru').trim().toLowerCase();
    if (!allowedLocales.includes(args.locale)) {
        throw new Error('Unsupported locale: ' + args.locale + '. Allowed: ' + allowedLocales.join(', ') + '.');
    }
    if (!args.dryRun && !args.apply) throw new Error('Use either --dry-run or --apply.');
    if (args.dryRun && args.apply) throw new Error('--dry-run and --apply cannot be used together.');
    if (!inputProvided) args.input = defaultInputPathFor(args.locale);
    if (!reportProvided) args.report = defaultReportPathFor(args.locale);
    args.input = path.resolve(args.input);
    args.db = path.resolve(args.db);
    args.report = path.resolve(args.report);
    args.backup = args.backup ? path.resolve(args.backup) : '';
    if (args.apply && !args.backup) throw new Error('--apply requires --backup <path>.');
    return args;
}

function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readLocaleConfig() {
    const configPath = path.join(root, 'config', 'locales.json');
    const config = readJsonFile(configPath);
    const supportedLocales = Array.isArray(config.supportedLocales) ? config.supportedLocales : [];
    const plannedLocales = config.plannedLocales && typeof config.plannedLocales === 'object'
        ? Object.keys(config.plannedLocales)
        : [];
    return { supportedLocales, plannedLocales };
}

function parseObjectJson(value, label, errors) {
    try {
        const parsed = JSON.parse(value || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            errors.push(label + ' must parse to a JSON object.');
            return {};
        }
        return parsed;
    } catch (err) {
        errors.push(label + ' is not valid JSON: ' + err.message);
        return {};
    }
}

function isArrayPatchKey(key) {
    return /^index_\d+$/.test(String(key || ''));
}

function deepMerge(base, patch) {
    if (Array.isArray(base) && patch && typeof patch === 'object' && !Array.isArray(patch)) {
        const patchKeys = Object.keys(patch);
        if (patchKeys.length && patchKeys.every(isArrayPatchKey)) {
            const output = base.slice();
            patchKeys.forEach((key) => {
                const index = Number(key.slice('index_'.length));
                const baseValue = output[index];
                const patchValue = patch[key];
                if (
                    patchValue
                    && typeof patchValue === 'object'
                    && !Array.isArray(patchValue)
                    && baseValue
                    && typeof baseValue === 'object'
                    && !Array.isArray(baseValue)
                ) {
                    output[index] = deepMerge(baseValue, patchValue);
                } else {
                    output[index] = patchValue;
                }
            });
            return output;
        }
        return patch;
    }

    const output = Array.isArray(base) ? base.slice() : Object.assign({}, base || {});
    Object.keys(patch || {}).forEach((key) => {
        const patchValue = patch[key];
        const baseValue = output[key];
        if (
                    patchValue
                    && typeof patchValue === 'object'
                    && !Array.isArray(patchValue)
                    && baseValue
                    && typeof baseValue === 'object'
                ) {
            output[key] = deepMerge(baseValue, patchValue);
        } else {
            output[key] = patchValue;
        }
    });
    return output;
}

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function collectPatchPaths(value, prefix, paths) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        paths.push(prefix || '[]');
        return;
    }
    Object.keys(value).forEach((key) => {
        const next = prefix ? prefix + '.' + key : key;
        const child = value[key];
        if (child && typeof child === 'object' && !Array.isArray(child)) {
            collectPatchPaths(child, next, paths);
        } else {
            paths.push(next);
        }
    });
}

function collectExpectedValues(value, prefix, values) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        values.push({ path: prefix || '[]', value });
        return;
    }
    Object.keys(value).forEach((key) => {
        const next = prefix ? prefix + '.' + key : key;
        const child = value[key];
        if (child && typeof child === 'object' && !Array.isArray(child)) {
            collectExpectedValues(child, next, values);
        } else {
            values.push({ path: next, value: child });
        }
    });
}

function readObjectPath(value, patchPath) {
    return String(patchPath || '').split('.').filter(Boolean).reduce((current, key) => {
        if (current == null) return undefined;
        if (Array.isArray(current) && isArrayPatchKey(key)) return current[Number(key.slice('index_'.length))];
        return current[key];
    }, value);
}

function sameJsonValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function isLocaleScopedPath(patchPath, locale) {
    return localePathPattern(locale).test(String(patchPath || ''));
}

function isExplicitNonTargetLocalePath(patchPath, locale) {
    const value = String(patchPath || '');
    return knownLocaleCodes
        .filter((code) => code !== locale)
        .some((code) => localePathPattern(code).test(value));
}

function collectCleanBoundaryIssues(base, patch, args, prefix, insideTargetLocale, issues) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return;

    Object.keys(patch).forEach((key) => {
        const patchValue = patch[key];
        const patchPath = prefix ? prefix + '.' + key : key;
        const targetsOtherLocale = isExplicitNonTargetLocalePath(patchPath, args.locale);
        const targetsCurrentLocale = insideTargetLocale || isLocaleScopedPath(patchPath, args.locale);

        if (targetsOtherLocale) {
            issues.nonTarget.push(patchPath);
            return;
        }

        if (targetsCurrentLocale) {
            if (isPlainObject(patchValue)) {
                const baseValue = isPlainObject(base) || Array.isArray(base) ? base[key] : undefined;
                collectCleanBoundaryIssues(baseValue, patchValue, args, patchPath, true, issues);
            }
            return;
        }

        if (!isPlainObject(base) || !hasOwn(base, key)) {
            issues.neutral.push(patchPath);
            return;
        }

        const baseValue = base[key];
        if (!isPlainObject(baseValue) || !isPlainObject(patchValue)) {
            issues.neutral.push(patchPath);
            return;
        }

        collectCleanBoundaryIssues(baseValue, patchValue, args, patchPath, false, issues);
    });
}

function summarize(values, limit) {
    const selected = values.slice(0, limit);
    return selected.join(', ') + (values.length > limit ? ' ... +' + (values.length - limit) : '');
}

function validateExpectedCurrent(row, current, item, errors, blockers) {
    if (!item.expected || item.expected.body_json_current == null) return;
    const expected = item.expected.body_json_current;
    if (!isPlainObject(expected)) {
        errors.push('contentBlocks item ' + row.slug + ' expected.body_json_current must be an object.');
        return;
    }

    const expectedValues = [];
    collectExpectedValues(expected, '', expectedValues);
    expectedValues.forEach((entry) => {
        const actual = readObjectPath(current, entry.path);
        if (!sameJsonValue(actual, entry.value)) {
            blockers.push('contentBlocks item ' + row.slug + ' body_json.' + entry.path + ' expected value mismatch.');
        }
    });
}

function validateInput(data, args, errors) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Input JSON must be an object.');
        return;
    }
    if (!data.meta || data.meta.locale !== args.locale) {
        errors.push('meta.locale must be ' + args.locale + '.');
    }
    if (!Array.isArray(data.contentBlocks) || !data.contentBlocks.length) {
        errors.push('contentBlocks must be a non-empty array.');
    }
    if (data.meta && data.meta.counts && data.meta.counts.contentBlocks !== data.contentBlocks.length) {
        errors.push('meta.counts.contentBlocks must match contentBlocks length ' + data.contentBlocks.length + '.');
    }
    const localeConfig = readLocaleConfig();
    if (data.meta && JSON.stringify(data.meta.supportedLocales) !== JSON.stringify(localeConfig.supportedLocales)) {
        errors.push('meta.supportedLocales must match ' + JSON.stringify(localeConfig.supportedLocales) + '.');
    }
    if (data.meta && JSON.stringify(data.meta.plannedOnlyLocales) !== JSON.stringify(localeConfig.plannedLocales)) {
        errors.push('meta.plannedOnlyLocales must stay ' + JSON.stringify(localeConfig.plannedLocales) + '.');
    }
}

function backupPathError(backupPath, dbPath) {
    if (!backupPath) return '';
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

function analyzeContentBlocks(db, data, args, errors, blockers) {
    const rows = db.prepare(`
        SELECT id, slug, body_json, status, version
        FROM content_blocks
        WHERE status = 'published'
        ORDER BY sort_order ASC, slug ASC
    `).all();
    const expectedIds = new Set(rows.map((row) => String(row.id)));
    const rowsById = new Map(rows.map((row) => [String(row.id), row]));
    const rowsBySlug = new Map(rows.map((row) => [row.slug, row]));
    const seenIds = new Set();
    const records = [];

    (data.contentBlocks || []).forEach((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            errors.push('contentBlocks item must be an object.');
            return;
        }
        if (item.target && item.target.locale !== args.locale) {
            errors.push('contentBlocks item ' + (item.id || item.slug || '?') + ' target.locale must be ' + args.locale + '.');
        }
        const patch = item.target && item.target.body_json_patch;
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
            errors.push('contentBlocks item ' + (item.id || item.slug || '?') + ' target.body_json_patch must be an object.');
            return;
        }

        const row = rowsById.get(String(item.id)) || rowsBySlug.get(item.slug);
        if (!row) {
            errors.push('contentBlocks item ' + (item.id || item.slug || '?') + ' does not match a published content block.');
            return;
        }
        const rowId = String(row.id);
        if (seenIds.has(rowId)) {
            errors.push('contentBlocks maps multiple input records to row ' + rowId + '.');
            return;
        }
        seenIds.add(rowId);

        const current = parseObjectJson(row.body_json, 'content_blocks ' + row.slug + ' body_json', errors);
        validateExpectedCurrent(row, current, item, errors, blockers);
        const merged = deepMerge(current, patch);
        const patchPaths = [];
        collectPatchPaths(patch, '', patchPaths);

        if (args.requireCleanBoundary) {
            const cleanBoundaryIssues = { nonTarget: [], neutral: [] };
            collectCleanBoundaryIssues(current, patch, args, '', false, cleanBoundaryIssues);
            if (cleanBoundaryIssues.nonTarget.length) {
                blockers.push('contentBlocks item ' + row.slug + ' targets non-target locale paths: ' + summarize(cleanBoundaryIssues.nonTarget, 8) + '.');
            }
            if (cleanBoundaryIssues.neutral.length) {
                blockers.push('contentBlocks item ' + row.slug + ' targets non-locale-scoped paths: ' + summarize(cleanBoundaryIssues.neutral, 8) + '.');
            }
        }

        try {
            JSON.stringify(merged);
        } catch (err) {
            errors.push('contentBlocks item ' + row.slug + ' merged JSON is not serializable: ' + err.message);
        }

        records.push({
            id: row.id,
            slug: row.slug,
            patchPathCount: patchPaths.length,
            patchPaths,
            body_json: JSON.stringify(merged),
            changed: JSON.stringify(current) !== JSON.stringify(merged)
        });
    });

    const missing = Array.from(expectedIds).filter((id) => !seenIds.has(id));
    if (missing.length) {
        errors.push('contentBlocks input is missing published rows: ' + summarize(missing, 12) + '.');
    }
    if ((data.contentBlocks || []).length !== rows.length) {
        errors.push('contentBlocks input count must match current published count ' + rows.length
            + ', current: ' + (data.contentBlocks || []).length + '.');
    }

    return {
        expected: rows.length,
        input: (data.contentBlocks || []).length,
        records
    };
}

async function createDatabaseBackup(db, backupPath) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    await db.backup(backupPath);
    return fs.statSync(backupPath).size;
}

function applyRecords(db, records) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        UPDATE content_blocks
        SET body_json = @body_json,
            version = COALESCE(version, 0) + 1,
            updated_at = @updated_at
        WHERE id = @id
    `);
    const transaction = db.transaction(() => {
        records.forEach((record) => {
            const result = stmt.run({
                id: record.id,
                body_json: record.body_json,
                updated_at: now
            });
            if (result.changes !== 1) {
                throw new Error('content_blocks ' + record.slug + ' expected to update exactly one row, changed ' + result.changes + '.');
            }
        });
    });
    transaction();
    return records.length;
}

function renderReport(report) {
    const lines = [
        '# ' + report.locale + ' content_blocks safe patch report',
        '',
        '- Generated at: ' + report.generatedAt,
        '- Mode: ' + report.mode,
        '- Locale: ' + report.locale,
        '- Input: `' + report.inputPath + '`',
        '- Database: `' + report.dbPath + '`',
        '- Database changed: ' + (report.databaseChanged ? 'yes' : 'no'),
        '- Clean boundary required: ' + (report.requireCleanBoundary ? 'yes' : 'no'),
        '- Backup path: ' + (report.backupPath ? '`' + report.backupPath + '`' : 'none'),
        '- Backup size: ' + (report.backupSizeBytes == null ? 'not created' : report.backupSizeBytes + ' bytes'),
        '- Expected published content_blocks: ' + report.expected,
        '- Input contentBlocks: ' + report.input,
        '- Apply blockers: ' + report.blockers.length,
        '- Applied rows: ' + report.appliedRows,
        '',
        '## Patch Summary',
        '',
        '| slug | patch paths | changed |',
        '| --- | ---: | --- |'
    ];

    report.records.forEach((record) => {
        lines.push('| ' + record.slug + ' | ' + record.patchPathCount + ' | ' + (record.changed ? 'yes' : 'no') + ' |');
    });

    lines.push('', '## Blockers', '');
    if (report.blockers.length) {
        report.blockers.forEach((message) => lines.push('- ' + message));
    } else {
        lines.push('None.');
    }

    lines.push('', '## Errors', '');
    if (report.errors.length) {
        report.errors.forEach((message) => lines.push('- ' + message));
    } else {
        lines.push('None.');
    }

    return lines.join('\n') + '\n';
}

async function run(rawArgs) {
    const args = parseArgs(rawArgs || process.argv);
    const errors = [];
    const blockers = [];
    const report = {
        generatedAt: new Date().toISOString(),
        mode: args.apply ? 'apply' : 'dry-run',
        locale: args.locale,
        inputPath: args.input,
        dbPath: args.db,
        requireCleanBoundary: args.requireCleanBoundary,
        databaseChanged: false,
        backupPath: '',
        backupSizeBytes: null,
        expected: 0,
        input: 0,
        records: [],
        blockers,
        errors,
        appliedRows: 0
    };

    if (!fs.existsSync(args.input)) errors.push('Input file does not exist: ' + args.input);
    if (!fs.existsSync(args.db)) errors.push('Database file does not exist: ' + args.db);
    if (args.apply) {
        const backupError = backupPathError(args.backup, args.db);
        if (backupError) errors.push(backupError);
    }

    let data = null;
    if (!errors.length) {
        try {
            data = readJsonFile(args.input);
            validateInput(data, args, errors);
        } catch (err) {
            errors.push('Input JSON cannot be parsed: ' + err.message);
        }
    }

    let db = null;
    try {
        if (!errors.length) {
            db = new Database(args.db, { readonly: !args.apply, fileMustExist: true });
            const summary = analyzeContentBlocks(db, data, args, errors, blockers);
            report.expected = summary.expected;
            report.input = summary.input;
            report.records = summary.records;

            if (args.apply && !errors.length && !blockers.length) {
                report.backupPath = args.backup;
                report.backupSizeBytes = await createDatabaseBackup(db, args.backup);
                report.appliedRows = applyRecords(db, summary.records);
                report.databaseChanged = true;
            }
        }
    } catch (err) {
        errors.push('content_blocks safe patch ' + report.mode + ' failed: ' + err.message);
    } finally {
        if (db) db.close();
    }

    fs.mkdirSync(path.dirname(args.report), { recursive: true });
    fs.writeFileSync(args.report, renderReport(report), 'utf8');

    if (errors.length || blockers.length) {
        console.error(args.locale + ' content_blocks safe patch ' + report.mode + ' failed. Report: ' + args.report);
        errors.forEach((message) => console.error('- ' + message));
        blockers.forEach((message) => console.error('- ' + message));
        process.exitCode = 1;
        return report;
    }

    console.log(args.locale + ' content_blocks safe patch ' + report.mode + ' passed.');
    console.log('Report: ' + args.report);
    console.log('Database changed: ' + (report.databaseChanged ? 'yes' : 'no'));
    return report;
}

if (require.main === module) {
    run(process.argv).catch((err) => {
        console.error(err && err.stack ? err.stack : err.message);
        process.exit(1);
    });
}

module.exports = { run };
