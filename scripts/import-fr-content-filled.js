const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, quiet: true });
}

const homeDir = process.env.USERPROFILE || os.homedir();
const stageDir = path.join(homeDir || root, 'Desktop', 'new', 'stage');
const defaultInputPath = path.join(stageDir, 'fr-content-entry-filled.json');
const defaultReportPath = path.join(stageDir, 'e8g3-fr-import-dry-run.md');
const defaultDbPath = process.env.DB_PATH
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(root, process.env.DB_PATH))
    : path.join(root, 'data', 'longxiang.db');
const expectedCounts = {
    productCategories: 13,
    products: 40,
    certifications: 76,
    staticPages: 10,
    contentBlocks: 14
};
const expectedSupportedLocales = ['en', 'ar'];
const expectedPlannedOnlyLocales = ['pt'];
const plannedLocaleCodes = ['fr', 'ru', 'pt'];
const expectedSitemapUrlCount = 96;
const contentBlockLocalePathPattern = /(^|[._])(fr)([._]|$)|(^|[a-z0-9])(Fr)([A-Z0-9_]|$)/;
const contentBlockNonTargetLocalePathPattern = /(^|[._])(en|ar)([._]|$)|(^|[a-z0-9])(En|Ar)([A-Z0-9_]|$)/;
const collectionSpecs = {
    productCategories: {
        table: 'categories',
        label: 'product categories',
        fields: ['name_fr']
    },
    products: {
        table: 'products',
        label: 'products',
        fields: [
            'name_fr',
            'short_desc_fr',
            'description_fr',
            'seo_title_fr',
            'seo_description_fr',
            'seo_keywords_fr'
        ]
    },
    certifications: {
        table: 'certifications',
        label: 'certifications',
        fields: ['name_fr', 'issuer_fr', 'description_fr']
    },
    contentBlocks: {
        table: 'content_blocks',
        label: 'content blocks',
        fields: ['body_json']
    }
};

function parseArgs(argv) {
    const args = {
        dryRun: false,
        apply: false,
        requireCleanBoundary: false,
        input: defaultInputPath,
        db: defaultDbPath,
        report: defaultReportPath
    };
    const valueOptions = new Set(['input', 'db', 'report']);

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
            if (!valueOptions.has(name)) {
                throw new Error('Unknown option: ' + arg);
            }
            if (eqIndex !== -1) {
                args[name] = arg.slice(eqIndex + 1);
            } else {
                const value = argv[index + 1];
                if (!value || value.startsWith('--')) throw new Error('Missing value for --' + name);
                args[name] = value;
                index += 1;
            }
        } else {
            throw new Error('Unexpected argument: ' + arg);
        }
    }

    args.input = path.resolve(args.input);
    args.db = path.resolve(args.db);
    args.report = path.resolve(args.report);
    return args;
}

function arraysEqual(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function tableExists(db, tableName) {
    return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function tableColumns(db, tableName) {
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().map((row) => row.name);
}

function selectOne(db, tableName, whereClause, params) {
    return db.prepare('SELECT * FROM ' + tableName + ' WHERE ' + whereClause + ' LIMIT 1').get(params);
}

function matchRecord(db, tableName, columns, item, collectionName) {
    const attempts = [];

    if (item.id != null && columns.includes('id')) {
        attempts.push({
            label: 'id',
            run: () => selectOne(db, tableName, 'id = @id', { id: item.id })
        });
    }

    if (collectionName === 'productCategories') {
        if (hasText(item.type) && hasText(item.slug) && columns.includes('type') && columns.includes('slug')) {
            attempts.push({
                label: 'type+slug',
                run: () => selectOne(db, tableName, 'type = @type AND slug = @slug', {
                    type: item.type,
                    slug: item.slug
                })
            });
        }
        if (hasText(item.slug) && columns.includes('slug')) {
            attempts.push({
                label: 'slug',
                run: () => selectOne(db, tableName, 'slug = @slug', { slug: item.slug })
            });
        }
    }

    if (collectionName === 'products') {
        if (hasText(item.slug) && columns.includes('slug')) {
            attempts.push({
                label: 'slug',
                run: () => selectOne(db, tableName, 'slug = @slug', { slug: item.slug })
            });
        }
    }

    if (collectionName === 'certifications') {
        if (hasText(item.legacyId) && columns.includes('legacy_id')) {
            attempts.push({
                label: 'legacy_id',
                run: () => selectOne(db, tableName, 'legacy_id = @legacyId', { legacyId: item.legacyId })
            });
        }
    }

    if (collectionName === 'contentBlocks') {
        if (hasText(item.slug) && columns.includes('slug')) {
            attempts.push({
                label: 'slug',
                run: () => selectOne(db, tableName, 'slug = @slug', { slug: item.slug })
            });
        }
    }

    for (const attempt of attempts) {
        const row = attempt.run();
        if (row) return { row, matchedBy: attempt.label };
    }

    return { row: null, matchedBy: '' };
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

function deepMerge(base, patch) {
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
            && !Array.isArray(baseValue)
        ) {
            output[key] = deepMerge(baseValue, patchValue);
        } else {
            output[key] = patchValue;
        }
    });
    return output;
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

function isLocaleScopedContentBlockPath(patchPath) {
    return contentBlockLocalePathPattern.test(String(patchPath || ''));
}

function isExplicitNonTargetLocaleContentBlockPath(patchPath) {
    return contentBlockNonTargetLocalePathPattern.test(String(patchPath || ''));
}

function summarizePaths(paths, limit) {
    const selected = paths.slice(0, limit);
    return selected.join(', ') + (paths.length > limit ? ' ... +' + (paths.length - limit) : '');
}

function validateFilledData(data, errors) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Input JSON must be an object.');
        return;
    }

    if (!data.meta || data.meta.locale !== 'fr') errors.push('meta.locale must be fr.');
    if (!arraysEqual(data.meta && data.meta.supportedLocales, expectedSupportedLocales)) {
        errors.push('meta.supportedLocales must stay ["en","ar"].');
    }
    if (!arraysEqual(data.meta && data.meta.plannedOnlyLocales, expectedPlannedOnlyLocales)) {
        errors.push('meta.plannedOnlyLocales must stay ["pt"].');
    }
    if (!data.meta || !data.meta.counts || typeof data.meta.counts !== 'object' || Array.isArray(data.meta.counts)) {
        errors.push('meta.counts must exist and be an object.');
    }

    Object.keys(expectedCounts).forEach((key) => {
        const value = data[key];
        if (!Array.isArray(value)) {
            errors.push(key + ' must be an array.');
            return;
        }
        if (value.length !== expectedCounts[key]) {
            errors.push(key + ' count must be ' + expectedCounts[key] + ', current: ' + value.length + '.');
        }
        if (data.meta && data.meta.counts && data.meta.counts[key] !== expectedCounts[key]) {
            errors.push('meta.counts.' + key + ' must be ' + expectedCounts[key] + '.');
        }
    });
}

function validateTargetFields(collectionName, item, allowedFields, errors) {
    const target = item.target || {};
    const targetKeys = Object.keys(target);
    const extra = targetKeys.filter((field) => !allowedFields.includes(field));
    const enArFields = targetKeys.filter((field) => /(^|_)(en|ar)$/i.test(field));

    if (extra.length) {
        errors.push(collectionName + ' item ' + item.id + ' has unsupported target fields: ' + extra.join(', '));
    }
    if (enArFields.length) {
        errors.push(collectionName + ' item ' + item.id + ' targets en/ar fields: ' + enArFields.join(', '));
    }

    allowedFields.forEach((field) => {
        if (!hasOwn(target, field)) {
            errors.push(collectionName + ' item ' + item.id + ' is missing target.' + field + '.');
        }
    });
}

function analyzeCollection(db, data, collectionName, tableColumnsByName, errors, blockers) {
    const spec = collectionSpecs[collectionName];
    const columns = tableColumnsByName[spec.table] || [];
    const rows = Array.isArray(data[collectionName]) ? data[collectionName] : [];
    const unmatched = [];
    const matchedBy = {};
    const contentBlockPreview = [];
    let matched = 0;

    rows.forEach((item) => {
        const allowedFields = collectionName === 'contentBlocks'
            ? ['locale', 'title_key_suggestion', 'body_json_patch']
            : spec.fields;

        validateTargetFields(collectionName, item, allowedFields, errors);

        if (collectionName === 'contentBlocks') {
            if (item.target && item.target.locale !== 'fr') {
                errors.push('contentBlocks item ' + item.id + ' target.locale must be fr.');
            }
            if (!item.target || !item.target.body_json_patch || typeof item.target.body_json_patch !== 'object' || Array.isArray(item.target.body_json_patch)) {
                errors.push('contentBlocks item ' + item.id + ' target.body_json_patch must be an object.');
            }
        }

        const match = matchRecord(db, spec.table, columns, item, collectionName);
        if (!match.row) {
            unmatched.push({
                id: item.id == null ? '' : item.id,
                slug: item.slug || item.legacyId || '',
                label: item.source && (item.source.name_en || item.source.title_en) || ''
            });
            return;
        }

        matched += 1;
        matchedBy[match.matchedBy] = (matchedBy[match.matchedBy] || 0) + 1;

        if (collectionName === 'contentBlocks') {
            const currentJson = parseObjectJson(match.row.body_json, 'content_blocks ' + item.id + ' body_json', errors);
            const patch = item.target && item.target.body_json_patch || {};
            const merged = deepMerge(currentJson, patch);
            try {
                JSON.stringify(merged);
            } catch (err) {
                errors.push('contentBlocks item ' + item.id + ' merged JSON is not serializable: ' + err.message);
            }
            const patchPaths = [];
            collectPatchPaths(patch, '', patchPaths);
            const nonTargetLocalePaths = patchPaths.filter(isExplicitNonTargetLocaleContentBlockPath);
            const neutralPaths = patchPaths.filter((patchPath) => {
                return !isLocaleScopedContentBlockPath(patchPath)
                    && !isExplicitNonTargetLocaleContentBlockPath(patchPath);
            });

            if (nonTargetLocalePaths.length) {
                blockers.push('contentBlocks item ' + item.id + ' (' + (item.slug || match.row.slug || '')
                    + ') patch targets en/ar paths: ' + summarizePaths(nonTargetLocalePaths, 8) + '.');
            }
            if (neutralPaths.length) {
                blockers.push('contentBlocks item ' + item.id + ' (' + (item.slug || match.row.slug || '')
                    + ') patch targets non-locale-scoped paths that could change existing en fallback behavior: '
                    + summarizePaths(neutralPaths, 8) + '.');
            }
            contentBlockPreview.push({
                id: item.id,
                slug: item.slug || match.row.slug || '',
                matchedBy: match.matchedBy,
                patchPathCount: patchPaths.length,
                patchPaths,
                mergedTopLevelKeys: Object.keys(merged).sort()
            });
        }
    });

    if (unmatched.length) {
        errors.push(collectionName + ' has unmatched records: '
            + unmatched.map((item) => item.id || item.slug || item.label || 'unknown').join(', ') + '.');
    }

    return {
        collectionName,
        label: spec.label,
        table: spec.table,
        expected: expectedCounts[collectionName],
        input: rows.length,
        matched,
        unmatched,
        matchedBy,
        fields: spec.fields,
        contentBlockPreview
    };
}

function extractFrontendLocaleConfig(source, errors) {
    const match = source.match(/var\s+LOCALE_CONFIG\s*=\s*({[\s\S]*?})\s*;\s*\r?\n\s*var\s+STATIC_PAGE_BASE_PATHS/);
    if (!match) {
        errors.push('js/main.js LOCALE_CONFIG was not found.');
        return null;
    }
    try {
        return vm.runInNewContext('(' + match[1] + ')', Object.create(null), { timeout: 1000 });
    } catch (err) {
        errors.push('js/main.js LOCALE_CONFIG cannot be parsed: ' + err.message);
        return null;
    }
}

function collectUrlEntries(xml) {
    const matches = xml.match(/<url\b[\s\S]*?<\/url>/g);
    return matches || [];
}

function assertXmlExcludesPlannedLocale(xml, label, errors) {
    plannedLocaleCodes.forEach((code) => {
        const prefix = '/' + code + '/';
        if (xml.includes('https://www.lxenelectric.com' + prefix) || xml.includes(prefix)) {
            errors.push(label + ' must not contain planned locale path ' + prefix + '.');
        }
        if (xml.includes('hreflang="' + code + '"') || xml.includes("hreflang='" + code + "'")) {
            errors.push(label + ' must not contain hreflang=' + code + '.');
        }
    });
}

function validateCleanBoundary(errors) {
    const boundary = {
        localeConfig: false,
        frontendConfig: false,
        sitemapXml: false,
        sitemapXmlUrlCount: null,
        generatedSitemap: false,
        generatedSitemapUrlCount: null
    };
    const localeConfigPath = path.join(root, 'config', 'locales.json');
    const frontendPath = path.join(root, 'js', 'main.js');
    const sitemapPath = path.join(root, 'sitemap.xml');
    const localeConfig = readJsonFile(localeConfigPath);

    if (!arraysEqual(localeConfig.supportedLocales, expectedSupportedLocales)) {
        errors.push('config/locales.json supportedLocales must stay ["en","ar"].');
    }
    plannedLocaleCodes.forEach((code) => {
        const planned = localeConfig.plannedLocales && localeConfig.plannedLocales[code];
        if (!planned) errors.push(code + ' must remain in config/locales.json plannedLocales.');
        if (planned && planned.includeInSitemap !== false) {
            errors.push(code + ' planned locale includeInSitemap must be false.');
        }
        if (localeConfig.locales && localeConfig.locales[code]) {
            errors.push(code + ' must not enter active locales.');
        }
    });
    boundary.localeConfig = true;

    const frontendConfig = extractFrontendLocaleConfig(fs.readFileSync(frontendPath, 'utf8'), errors);
    if (frontendConfig) {
        plannedLocaleCodes.forEach((code) => {
            if (frontendConfig.supportedLocales && frontendConfig.supportedLocales.includes(code)) {
                errors.push(code + ' must not enter js/main.js LOCALE_CONFIG.supportedLocales.');
            }
            if (frontendConfig.locales && frontendConfig.locales[code]) {
                errors.push(code + ' must not enter js/main.js LOCALE_CONFIG.locales.');
            }
        });
        boundary.frontendConfig = true;
    }

    if (fs.existsSync(sitemapPath)) {
        const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
        const urlCount = collectUrlEntries(sitemapXml).length;
        boundary.sitemapXmlUrlCount = urlCount;
        if (urlCount !== expectedSitemapUrlCount) {
            errors.push('sitemap.xml URL count must be ' + expectedSitemapUrlCount + ', current: ' + urlCount + '.');
        }
        assertXmlExcludesPlannedLocale(sitemapXml, 'sitemap.xml', errors);
        boundary.sitemapXml = true;
    }

    try {
        const previousDotenvQuiet = process.env.DOTENV_CONFIG_QUIET;
        let generatedXml;
        try {
            process.env.DOTENV_CONFIG_QUIET = 'true';
            generatedXml = require('./generate-sitemap').buildSitemap();
        } finally {
            if (previousDotenvQuiet === undefined) {
                delete process.env.DOTENV_CONFIG_QUIET;
            } else {
                process.env.DOTENV_CONFIG_QUIET = previousDotenvQuiet;
            }
        }
        const urlCount = collectUrlEntries(generatedXml).length;
        boundary.generatedSitemapUrlCount = urlCount;
        if (urlCount !== expectedSitemapUrlCount) {
            errors.push('Generated sitemap URL count must be ' + expectedSitemapUrlCount + ', current: ' + urlCount + '.');
        }
        assertXmlExcludesPlannedLocale(generatedXml, 'generated sitemap', errors);
        boundary.generatedSitemap = true;
    } catch (err) {
        errors.push('Generated sitemap boundary check failed: ' + err.message);
    }

    return boundary;
}

function validateDatabase(db, errors) {
    const requiredTables = ['products', 'categories', 'certifications', 'content_blocks'];
    const requiredColumns = {
        products: collectionSpecs.products.fields,
        categories: collectionSpecs.productCategories.fields,
        certifications: collectionSpecs.certifications.fields,
        content_blocks: ['body_json']
    };
    const tableColumnsByName = {};

    requiredTables.forEach((table) => {
        if (!tableExists(db, table)) {
            errors.push('Missing database table: ' + table + '.');
            tableColumnsByName[table] = [];
            return;
        }
        const columns = tableColumns(db, table);
        tableColumnsByName[table] = columns;
        requiredColumns[table].forEach((column) => {
            if (!columns.includes(column)) {
                errors.push('Missing database column: ' + table + '.' + column + '.');
            }
        });
    });

    return tableColumnsByName;
}

function renderMatchedBy(value) {
    const keys = Object.keys(value || {});
    return keys.length ? keys.map((key) => key + ': ' + value[key]).join(', ') : 'none';
}

function renderReport(report) {
    const lines = [
        '# E8g-3 French import dry-run report',
        '',
        '- Generated at: ' + report.generatedAt,
        '- Project root: `' + root + '`',
        '- Input file: `' + report.inputPath + '`',
        '- Database path: `' + report.dbPath + '`',
        '- Dry run only: yes',
        '- Database changed: no',
        '- Filled file changed: no',
        '- Clean boundary required: ' + (report.requireCleanBoundary ? 'yes' : 'no'),
        '- sitemap.xml URL count: ' + (report.boundary.sitemapXmlUrlCount == null ? 'not checked' : report.boundary.sitemapXmlUrlCount),
        '- Generated sitemap URL count: ' + (report.boundary.generatedSitemapUrlCount == null ? 'not checked' : report.boundary.generatedSitemapUrlCount),
        '- Apply blockers: ' + report.blockers.length,
        '- May enter E8g-4: ' + (report.errors.length || report.blockers.length ? 'no' : 'yes'),
        '',
        '## Input counts',
        '',
        '| Collection | Expected | Current |',
        '| --- | ---: | ---: |'
    ];

    Object.keys(expectedCounts).forEach((key) => {
        lines.push('| ' + key + ' | ' + expectedCounts[key] + ' | ' + report.inputCounts[key] + ' |');
    });

    lines.push('', '## Mapping preview', '');
    lines.push('| Collection | Table | Input | Matched | Unmatched | Matched by | Preview fields |');
    lines.push('| --- | --- | ---: | ---: | ---: | --- | --- |');
    report.collectionSummaries.forEach((item) => {
        lines.push('| ' + item.collectionName
            + ' | `' + item.table + '`'
            + ' | ' + item.input
            + ' | ' + item.matched
            + ' | ' + item.unmatched.length
            + ' | ' + renderMatchedBy(item.matchedBy)
            + ' | `' + item.fields.join('`, `') + '` |');
    });

    const unmatched = report.collectionSummaries.flatMap((item) => item.unmatched.map((row) => ({
        collection: item.collectionName,
        id: row.id,
        slug: row.slug,
        label: row.label
    })));
    lines.push('', '## Unmatched records', '');
    if (unmatched.length) {
        lines.push('| Collection | ID | Slug or legacy ID | Label |');
        lines.push('| --- | --- | --- | --- |');
        unmatched.forEach((item) => {
            lines.push('| ' + item.collection + ' | `' + item.id + '` | `' + item.slug + '` | ' + item.label + ' |');
        });
    } else {
        lines.push('None.');
    }

    lines.push('', '## content_blocks merge preview', '');
    const contentSummary = report.collectionSummaries.find((item) => item.collectionName === 'contentBlocks');
    if (contentSummary && contentSummary.contentBlockPreview.length) {
        lines.push('| ID | Slug | Matched by | Patch paths | Merged top-level keys |');
        lines.push('| --- | --- | --- | ---: | --- |');
        contentSummary.contentBlockPreview.forEach((item) => {
            lines.push('| `' + item.id + '` | `' + item.slug + '` | '
                + item.matchedBy + ' | ' + item.patchPathCount + ' | `'
                + item.mergedTopLevelKeys.join('`, `') + '` |');
        });
        lines.push('', '### Patch paths', '');
        contentSummary.contentBlockPreview.forEach((item) => {
            lines.push('- `' + item.slug + '`: ' + (item.patchPaths.length ? item.patchPaths.map((p) => '`' + p + '`').join(', ') : 'none'));
        });
    } else {
        lines.push('No matched content block patches.');
    }

    lines.push(
        '',
        '## staticPages',
        '',
        '- staticPages records are intentionally skipped by this database dry-run.',
        '- Static page HTML translation remains a separate future stage.',
        '',
        '## Clean boundary',
        '',
        '- config/locales.json checked: ' + (report.boundary.localeConfig ? 'yes' : 'no'),
        '- js/main.js LOCALE_CONFIG checked: ' + (report.boundary.frontendConfig ? 'yes' : 'no'),
        '- sitemap.xml checked: ' + (report.boundary.sitemapXml ? 'yes' : 'no'),
        '- generated sitemap checked: ' + (report.boundary.generatedSitemap ? 'yes' : 'no'),
        '',
        '## Apply blockers',
        ''
    );

    if (report.blockers.length) {
        report.blockers.forEach((message) => lines.push('- ' + message));
    } else {
        lines.push('None.');
    }

    lines.push(
        '',
        '## Errors',
        ''
    );

    if (report.errors.length) {
        report.errors.forEach((message) => lines.push('- ' + message));
    } else {
        lines.push('None.');
    }

    lines.push('', '## Warnings', '');
    if (report.warnings.length) {
        report.warnings.forEach((message) => lines.push('- ' + message));
    } else {
        lines.push('None.');
    }

    return lines.join('\n') + '\n';
}

function main() {
    const errors = [];
    const warnings = [];
    let args;

    try {
        args = parseArgs(process.argv);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    if (args.apply) {
        console.error('Real import is not authorized in this stage.');
        process.exit(1);
    }

    if (!args.dryRun) {
        console.error('This stage only supports --dry-run. Real import is not authorized.');
        process.exit(1);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        inputPath: args.input,
        dbPath: args.db,
        requireCleanBoundary: args.requireCleanBoundary,
        inputCounts: {},
        collectionSummaries: [],
        boundary: {
            localeConfig: false,
            frontendConfig: false,
            sitemapXml: false,
            sitemapXmlUrlCount: null,
            generatedSitemap: false,
            generatedSitemapUrlCount: null
        },
        blockers: [],
        errors,
        warnings
    };

    if (!fs.existsSync(args.input)) {
        errors.push('Input file does not exist: ' + args.input);
    }
    if (!fs.existsSync(args.db)) {
        errors.push('Database file does not exist: ' + args.db);
    }

    let data = null;
    if (!errors.length) {
        try {
            data = readJsonFile(args.input);
            validateFilledData(data, errors);
            Object.keys(expectedCounts).forEach((key) => {
                report.inputCounts[key] = Array.isArray(data[key]) ? data[key].length : 0;
            });
        } catch (err) {
            errors.push('Input JSON cannot be parsed: ' + err.message);
        }
    }

    if (args.requireCleanBoundary) {
        report.boundary = validateCleanBoundary(errors);
    }

    if (data && fs.existsSync(args.db)) {
        let db = null;
        try {
            db = new Database(args.db, { readonly: true, fileMustExist: true });
            const tableColumnsByName = validateDatabase(db, errors);
            Object.keys(collectionSpecs).forEach((collectionName) => {
                report.collectionSummaries.push(analyzeCollection(db, data, collectionName, tableColumnsByName, errors, report.blockers));
            });
        } catch (err) {
            errors.push('Database dry-run failed: ' + err.message);
        } finally {
            if (db) db.close();
        }
    }

    fs.mkdirSync(path.dirname(args.report), { recursive: true });
    fs.writeFileSync(args.report, renderReport(report), 'utf8');

    if (warnings.length) {
        console.warn('Dry-run warnings:');
        warnings.forEach((message) => console.warn('- ' + message));
    }

    if (errors.length) {
        console.error('Dry-run failed. Report: ' + args.report);
        errors.forEach((message) => console.error('- ' + message));
        process.exit(1);
    }

    if (report.blockers.length) {
        console.warn('French import dry-run completed with apply blockers.');
    } else {
        console.log('French import dry-run passed.');
    }
    console.log('Report: ' + args.report);
    console.log('Database changed: no');
}

if (require.main === module) {
    main();
}
