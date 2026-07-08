const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const Database = require('better-sqlite3');
const { expectedSitemapUrlCount } = require('./sitemap-count-model');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, quiet: true });
}

const homeDir = process.env.USERPROFILE || os.homedir();
const stageDir = path.join(homeDir || root, 'Desktop', 'new', 'stage');
const defaultDbPath = process.env.DB_PATH
    ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(root, process.env.DB_PATH))
    : path.join(root, 'data', 'longxiang.db');
const localeConfigPath = path.join(root, 'config', 'locales.json');
const requiredCollections = ['productCategories', 'products', 'certifications', 'staticPages', 'contentBlocks'];
const defaultLocale = 'fr';
const sourceLocales = ['en', 'ar'];
let targetLocale = defaultLocale;
let collectionSpecs = buildCollectionSpecs(targetLocale);

function defaultInputPathFor(locale) {
    return path.join(stageDir, locale + '-content-entry-filled.json');
}

function defaultReportPathFor(locale) {
    if (locale === 'fr') return path.join(stageDir, 'e8g3-fr-import-dry-run.md');
    return path.join(stageDir, locale + '-content-import-dry-run.md');
}

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

function buildCollectionSpecs(locale) {
    return {
        productCategories: {
            table: 'categories',
            label: 'product categories',
            fields: ['name_' + locale]
        },
        products: {
            table: 'products',
            label: 'products',
            fields: [
                'name_' + locale,
                'short_desc_' + locale,
                'description_' + locale,
                'seo_title_' + locale,
                'seo_description_' + locale,
                'seo_keywords_' + locale
            ]
        },
        certifications: {
            table: 'certifications',
            label: 'certifications',
            fields: ['name_' + locale, 'issuer_' + locale, 'description_' + locale]
        },
        contentBlocks: {
            table: 'content_blocks',
            label: 'content blocks',
            fields: ['body_json']
        }
    };
}

function configureTargetLocale(locale) {
    targetLocale = String(locale || defaultLocale).trim().toLowerCase();
    const importableLocales = localeMetadata().importableLocales;
    if (!importableLocales.includes(targetLocale)) {
        throw new Error('Unsupported import locale: ' + targetLocale + '. Allowed active content targets: ' + importableLocales.join(', ') + '.');
    }
    collectionSpecs = buildCollectionSpecs(targetLocale);
}

function parseArgs(argv) {
    const args = {
        locale: defaultLocale,
        dryRun: false,
        apply: false,
        requireCleanBoundary: false,
        skipContentBlocks: false,
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
        } else if (arg === '--skip-content-blocks') {
            args.skipContentBlocks = true;
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
            if (name === 'input') inputProvided = true;
            if (name === 'report') reportProvided = true;
        } else {
            throw new Error('Unexpected argument: ' + arg);
        }
    }

    args.locale = String(args.locale || defaultLocale).trim().toLowerCase();
    if (!inputProvided) args.input = defaultInputPathFor(args.locale);
    if (!reportProvided) args.report = defaultReportPathFor(args.locale);
    args.input = path.resolve(args.input);
    args.db = path.resolve(args.db);
    args.report = path.resolve(args.report);
    args.backup = args.backup ? path.resolve(args.backup) : '';
    return args;
}

function arraysEqual(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

function unique(values) {
    return Array.from(new Set(values));
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

function localeMetadata() {
    const config = readJsonFile(localeConfigPath);
    const supportedLocales = Array.isArray(config.supportedLocales) ? config.supportedLocales : [];
    const activeLocaleCodes = Object.keys(config.locales || {});
    const plannedOnlyLocales = Object.keys(config.plannedLocales || {});
    const importableLocales = supportedLocales.filter((code) => {
        return sourceLocales.indexOf(code) === -1 && config.locales && config.locales[code];
    });

    return {
        config,
        supportedLocales,
        activeLocaleCodes,
        plannedOnlyLocales,
        importableLocales,
        knownLocaleCodes: unique(supportedLocales.concat(plannedOnlyLocales))
    };
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

function expectedRowsForCollection(db, collectionName) {
    if (collectionName === 'productCategories') {
        return db.prepare(`
            SELECT id
            FROM categories
            WHERE type = 'product'
                AND COALESCE(is_active, 1) = 1
            ORDER BY sort_order ASC, id ASC
        `).all();
    }

    if (collectionName === 'products') {
        return db.prepare(`
            SELECT id
            FROM products
            WHERE status = 'published'
            ORDER BY sort_order ASC, id ASC
        `).all();
    }

    if (collectionName === 'certifications') {
        return db.prepare(`
            SELECT id
            FROM certifications
            WHERE status = 'published'
            ORDER BY sort_order ASC, id ASC
        `).all();
    }

    if (collectionName === 'contentBlocks') {
        return db.prepare(`
            SELECT id
            FROM content_blocks
            WHERE status = 'published'
            ORDER BY sort_order ASC, slug ASC
        `).all();
    }

    return [];
}

function expectedCoverageForCollection(db, collectionName, errors) {
    try {
        const rows = expectedRowsForCollection(db, collectionName);
        return {
            collectionName,
            count: rows.length,
            rowIds: new Set(rows.map((row) => String(row.id)))
        };
    } catch (err) {
        errors.push(collectionName + ' expected coverage query failed: ' + err.message);
        return {
            collectionName,
            count: 0,
            rowIds: new Set()
        };
    }
}

function summarizeIds(ids, limit) {
    const selected = ids.slice(0, limit);
    return selected.join(', ') + (ids.length > limit ? ' ... +' + (ids.length - limit) : '');
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
    return localePathPattern(targetLocale).test(String(patchPath || ''));
}

function isExplicitNonTargetLocaleContentBlockPath(patchPath) {
    const value = String(patchPath || '');
    return localeMetadata().knownLocaleCodes
        .filter((code) => code !== targetLocale)
        .some((code) => localePathPattern(code).test(value));
}

function summarizePaths(paths, limit) {
    const selected = paths.slice(0, limit);
    return selected.join(', ') + (paths.length > limit ? ' ... +' + (paths.length - limit) : '');
}

function validateFilledData(data, errors, collectionNames, locale) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Input JSON must be an object.');
        return;
    }

    if (!data.meta || data.meta.locale !== locale) errors.push('meta.locale must be ' + locale + '.');
    const localeMeta = localeMetadata();
    if (!arraysEqual(data.meta && data.meta.supportedLocales, localeMeta.supportedLocales)) {
        errors.push('meta.supportedLocales must match current supported locales '
            + JSON.stringify(localeMeta.supportedLocales) + '.');
    }
    if (!arraysEqual(data.meta && data.meta.plannedOnlyLocales, localeMeta.plannedOnlyLocales)) {
        errors.push('meta.plannedOnlyLocales must match current planned locales '
            + JSON.stringify(localeMeta.plannedOnlyLocales) + '.');
    }
    if (!data.meta || !data.meta.counts || typeof data.meta.counts !== 'object' || Array.isArray(data.meta.counts)) {
        errors.push('meta.counts must exist and be an object.');
    }

    collectionNames.forEach((key) => {
        const value = data[key];
        if (!Array.isArray(value)) {
            errors.push(key + ' must be an array.');
            return;
        }
        if (value.length <= 0) {
            errors.push(key + ' must contain at least one item.');
        }
        if (data.meta && data.meta.counts && data.meta.counts[key] !== value.length) {
            errors.push('meta.counts.' + key + ' must match ' + key + ' length ' + value.length + '.');
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

function analyzeCollection(db, data, collectionName, tableColumnsByName, expectedCoverage, errors, blockers) {
    const spec = collectionSpecs[collectionName];
    const columns = tableColumnsByName[spec.table] || [];
    const rows = Array.isArray(data[collectionName]) ? data[collectionName] : [];
    const expectedCount = expectedCoverage && Number.isInteger(expectedCoverage.count) ? expectedCoverage.count : rows.length;
    const expectedRowIds = expectedCoverage && expectedCoverage.rowIds ? expectedCoverage.rowIds : new Set();
    const unmatched = [];
    const matchedBy = {};
    const matchedRowIds = new Set();
    const duplicateMatchedRowIds = [];
    const contentBlockPreview = [];
    const applyRecords = [];
    let matched = 0;

    rows.forEach((item) => {
        const allowedFields = collectionName === 'contentBlocks'
            ? ['locale', 'title_key_suggestion', 'body_json_patch']
            : spec.fields;

        validateTargetFields(collectionName, item, allowedFields, errors);

        if (collectionName === 'contentBlocks') {
            if (item.target && item.target.locale !== targetLocale) {
                errors.push('contentBlocks item ' + item.id + ' target.locale must be ' + targetLocale + '.');
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
        const matchedRowId = String(match.row.id);
        if (matchedRowIds.has(matchedRowId)) {
            duplicateMatchedRowIds.push(matchedRowId);
        } else {
            matchedRowIds.add(matchedRowId);
        }

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
                    + ') patch targets non-target locale paths: ' + summarizePaths(nonTargetLocalePaths, 8) + '.');
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
        } else {
            const target = item.target || {};
            const values = {};
            spec.fields.forEach((field) => {
                values[field] = target[field] == null ? null : target[field];
            });
            applyRecords.push({
                table: spec.table,
                rowId: match.row.id,
                itemId: item.id == null ? '' : item.id,
                slug: item.slug || item.legacyId || '',
                fields: values
            });
        }
    });

    if (unmatched.length) {
        errors.push(collectionName + ' has unmatched records: '
            + unmatched.map((item) => item.id || item.slug || item.label || 'unknown').join(', ') + '.');
    }
    if (rows.length !== expectedCount) {
        errors.push(collectionName + ' input count must match current database eligible count '
            + expectedCount + ', current: ' + rows.length + '.');
    }
    if (duplicateMatchedRowIds.length) {
        errors.push(collectionName + ' maps multiple input records to the same database rows: '
            + summarizeIds(duplicateMatchedRowIds, 12) + '.');
    }
    if (expectedRowIds.size) {
        const unexpectedMatchedIds = Array.from(matchedRowIds).filter((id) => !expectedRowIds.has(id));
        const missingExpectedIds = Array.from(expectedRowIds).filter((id) => !matchedRowIds.has(id));
        if (unexpectedMatchedIds.length) {
            errors.push(collectionName + ' input contains records outside the current database eligible set: '
                + summarizeIds(unexpectedMatchedIds, 12) + '.');
        }
        if (missingExpectedIds.length) {
            errors.push(collectionName + ' input is missing current database eligible rows: '
                + summarizeIds(missingExpectedIds, 12) + '.');
        }
    }

    return {
        collectionName,
        label: spec.label,
        table: spec.table,
        expected: expectedCount,
        input: rows.length,
        matched,
        unmatched,
        matchedBy,
        fields: spec.fields,
        applyRecords,
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

function currentPlannedLocaleCodes() {
    const localeConfigPath = path.join(root, 'config', 'locales.json');
    const localeConfig = readJsonFile(localeConfigPath);
    return Object.keys(localeConfig.plannedLocales || {});
}

function assertXmlExcludesPlannedLocale(xml, label, errors) {
    currentPlannedLocaleCodes().forEach((code) => {
        const prefix = '/' + code + '/';
        if (xml.includes('https://www.lxenelectric.com' + prefix) || xml.includes(prefix)) {
            errors.push(label + ' must not contain planned locale path ' + prefix + '.');
        }
        if (xml.includes('hreflang="' + code + '"') || xml.includes("hreflang='" + code + "'")) {
            errors.push(label + ' must not contain hreflang=' + code + '.');
        }
    });
}

function validateCleanBoundary(errors, warnings, args) {
    const boundary = {
        localeConfig: false,
        frontendConfig: false,
        sitemapXml: false,
        sitemapXmlUrlCount: null,
        generatedSitemap: false,
        generatedSitemapUrlCount: null,
        expectedSitemapUrlCount: null,
        sitemapStaticUrlCount: null,
        sitemapEligibleProductCount: null,
        sitemapLocaleCount: null,
        sitemapProductUrlCount: null
    };
    const frontendPath = path.join(root, 'js', 'main.js');
    const sitemapPath = path.join(root, 'sitemap.xml');
    const localeConfig = readJsonFile(localeConfigPath);
    const localeMeta = localeMetadata();
    let sitemapCountModel = null;

    try {
        sitemapCountModel = expectedSitemapUrlCount({ dbPath: args && args.db });
        boundary.expectedSitemapUrlCount = sitemapCountModel.expectedUrlCount;
        boundary.sitemapStaticUrlCount = sitemapCountModel.staticUrlCount;
        boundary.sitemapEligibleProductCount = sitemapCountModel.eligibleProductCount;
        boundary.sitemapLocaleCount = sitemapCountModel.sitemapLocaleCount;
        boundary.sitemapProductUrlCount = sitemapCountModel.productUrlCount;
    } catch (err) {
        errors.push('Dynamic sitemap URL count model failed: ' + err.message);
    }

    if (!arraysEqual(localeConfig.supportedLocales || [], localeMeta.activeLocaleCodes)) {
        errors.push('config/locales.json supportedLocales must match active locale keys '
            + JSON.stringify(localeMeta.activeLocaleCodes) + '.');
    }
    Object.keys(localeConfig.plannedLocales || {}).forEach((code) => {
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
        Object.keys(localeConfig.plannedLocales || {}).forEach((code) => {
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
        if (sitemapCountModel && urlCount !== sitemapCountModel.expectedUrlCount) {
            warnings.push('sitemap.xml URL count current: ' + urlCount
                + ', dynamic expected: ' + sitemapCountModel.expectedUrlCount
                + '. Static sitemap.xml is not used as the production runtime sitemap hard gate.');
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
        if (sitemapCountModel && urlCount !== sitemapCountModel.expectedUrlCount) {
            errors.push('Generated sitemap URL count must be dynamic expected '
                + sitemapCountModel.expectedUrlCount + ', current: ' + urlCount + '.');
        }
        assertXmlExcludesPlannedLocale(generatedXml, 'generated sitemap', errors);
        boundary.generatedSitemap = true;
    } catch (err) {
        errors.push('Generated sitemap boundary check failed: ' + err.message);
    }

    return boundary;
}

function validateDatabase(db, errors, collectionNames) {
    const requiredTables = Array.from(new Set(collectionNames.map((name) => collectionSpecs[name].table)));
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

function activeExpectedCoverages(db, collectionNames, errors) {
    const output = {};
    collectionNames.forEach((collectionName) => {
        output[collectionName] = expectedCoverageForCollection(db, collectionName, errors);
    });
    return output;
}

function renderMatchedBy(value) {
    const keys = Object.keys(value || {});
    return keys.length ? keys.map((key) => key + ': ' + value[key]).join(', ') : 'none';
}

function normalizedFilePath(value) {
    const resolved = path.resolve(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function backupPathError(backupPath, dbPath) {
    if (normalizedFilePath(backupPath) === normalizedFilePath(dbPath)) {
        return '--backup must not point to the active database file.';
    }

    if (fs.existsSync(backupPath)) {
        const stat = fs.statSync(backupPath);
        if (stat.isDirectory()) {
            return '--backup must point to a new database backup file, not an existing directory.';
        }
        return '--backup must point to a new file so an existing recovery point is not overwritten.';
    }

    return '';
}

function activeCollectionNames(args) {
    return Object.keys(collectionSpecs).filter((collectionName) => {
        return !(args.skipContentBlocks && collectionName === 'contentBlocks');
    });
}

function assertSafeIdentifier(value, label) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new Error(label + ' contains unsafe SQL identifier: ' + value);
    }
    return value;
}

async function createDatabaseBackup(db, backupPath) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    await db.backup(backupPath);
    const stat = fs.statSync(backupPath);
    return {
        path: backupPath,
        sizeBytes: stat.size
    };
}

function applyImportRecords(db, collectionSummaries) {
    const appliedCounts = {};
    const applyableSummaries = collectionSummaries.filter((summary) => summary.collectionName !== 'contentBlocks');

    const transaction = db.transaction(() => {
        applyableSummaries.forEach((summary) => {
            const table = assertSafeIdentifier(summary.table, summary.collectionName + ' table');
            const fields = summary.fields.map((field) => assertSafeIdentifier(field, summary.collectionName + ' field'));
            if (!fields.length) return;

            const assignments = fields.map((field) => field + ' = @' + field).join(', ');
            const statement = db.prepare('UPDATE ' + table + ' SET ' + assignments + ' WHERE id = @__rowId');
            let changed = 0;

            summary.applyRecords.forEach((record) => {
                const params = Object.assign({ __rowId: record.rowId }, record.fields);
                const result = statement.run(params);
                if (result.changes !== 1) {
                    throw new Error(summary.collectionName + ' item ' + (record.itemId || record.slug || record.rowId)
                        + ' expected to update exactly one row, changed ' + result.changes + '.');
                }
                changed += result.changes;
            });

            appliedCounts[summary.collectionName] = changed;
        });
    });

    transaction();
    return appliedCounts;
}

function renderReport(report) {
    const lines = [
        '# ' + report.locale + ' content import report',
        '',
        '- Generated at: ' + report.generatedAt,
        '- Locale: ' + report.locale,
        '- Project root: `' + root + '`',
        '- Input file: `' + report.inputPath + '`',
        '- Database path: `' + report.dbPath + '`',
        '- Mode: ' + report.mode,
        '- Dry run only: ' + (report.mode === 'dry-run' ? 'yes' : 'no'),
        '- Database changed: ' + (report.databaseChanged ? 'yes' : 'no'),
        '- Filled file changed: no',
        '- Clean boundary required: ' + (report.requireCleanBoundary ? 'yes' : 'no'),
        '- contentBlocks skipped: ' + (report.contentBlocksSkipped ? 'yes' : 'no'),
        '- Active import collections: ' + report.activeCollections.join(', '),
        '- Backup path: ' + (report.backupPath ? '`' + report.backupPath + '`' : 'none'),
        '- Backup size: ' + (report.backupSizeBytes == null ? 'not created' : report.backupSizeBytes + ' bytes'),
        '- Expected sitemap URL count: ' + (report.boundary.expectedSitemapUrlCount == null ? 'not checked' : report.boundary.expectedSitemapUrlCount),
        '- sitemap.xml URL count: ' + (report.boundary.sitemapXmlUrlCount == null ? 'not checked' : report.boundary.sitemapXmlUrlCount),
        '- Generated sitemap URL count: ' + (report.boundary.generatedSitemapUrlCount == null ? 'not checked' : report.boundary.generatedSitemapUrlCount),
        '- Sitemap static URLs: ' + (report.boundary.sitemapStaticUrlCount == null ? 'not checked' : report.boundary.sitemapStaticUrlCount),
        '- Sitemap eligible products: ' + (report.boundary.sitemapEligibleProductCount == null ? 'not checked' : report.boundary.sitemapEligibleProductCount),
        '- Sitemap locale count: ' + (report.boundary.sitemapLocaleCount == null ? 'not checked' : report.boundary.sitemapLocaleCount),
        '- Sitemap product URLs: ' + (report.boundary.sitemapProductUrlCount == null ? 'not checked' : report.boundary.sitemapProductUrlCount),
        '- Apply blockers: ' + report.blockers.length,
        '- May enter next import step: ' + (report.errors.length || report.blockers.length ? 'no' : 'yes'),
        '',
        '## Input counts',
        '',
        '| Collection | Expected from current DB/model | Input array | meta.counts |',
        '| --- | ---: | ---: | ---: |'
    ];

    requiredCollections.forEach((key) => {
        const expected = report.expectedCounts[key] == null ? 'not checked' : report.expectedCounts[key];
        const current = report.inputCounts[key] == null ? 0 : report.inputCounts[key];
        const metaCount = report.metaCounts[key] == null ? 'not provided' : report.metaCounts[key];
        lines.push('| ' + key + ' | ' + expected + ' | ' + current + ' | ' + metaCount + ' |');
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
    if (report.contentBlocksSkipped) {
        lines.push('Skipped by --skip-content-blocks. No content_blocks patch was analyzed or applied in this mode.');
    } else if (contentSummary && contentSummary.contentBlockPreview.length) {
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

    lines.push('', '## Applied records', '');
    const appliedKeys = Object.keys(report.appliedCounts || {});
    if (appliedKeys.length) {
        lines.push('| Collection | Rows updated |');
        lines.push('| --- | ---: |');
        appliedKeys.forEach((key) => {
            lines.push('| ' + key + ' | ' + report.appliedCounts[key] + ' |');
        });
    } else {
        lines.push('None. This was a dry-run or validation-only execution.');
    }

    lines.push(
        '',
        '## staticPages',
        '',
        '- staticPages records are intentionally skipped by this database import script.',
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

async function main() {
    const errors = [];
    const warnings = [];
    let args;

    try {
        args = parseArgs(process.argv);
        configureTargetLocale(args.locale);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    if (args.dryRun && args.apply) {
        console.error('--dry-run and --apply cannot be used together.');
        process.exit(1);
    }

    if (!args.dryRun && !args.apply) {
        console.error('Use either --dry-run or --apply.');
        process.exit(1);
    }

    if (args.apply) {
        if (!args.skipContentBlocks) {
            console.error('--apply requires --skip-content-blocks in this stage.');
            process.exit(1);
        }
        if (!args.backup) {
            console.error('--apply requires --backup <path>.');
            process.exit(1);
        }
        const backupError = backupPathError(args.backup, args.db);
        if (backupError) {
            console.error(backupError);
            process.exit(1);
        }
        args.requireCleanBoundary = true;
    }

    const selectedCollectionNames = activeCollectionNames(args);
    if (!selectedCollectionNames.length) {
        console.error('No active collections selected.');
        process.exit(1);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        locale: targetLocale,
        inputPath: args.input,
        dbPath: args.db,
        mode: args.apply ? 'apply' : 'dry-run',
        requireCleanBoundary: args.requireCleanBoundary,
        contentBlocksSkipped: args.skipContentBlocks,
        activeCollections: selectedCollectionNames,
        databaseChanged: false,
        backupPath: '',
        backupSizeBytes: null,
        appliedCounts: {},
        expectedCounts: {},
        inputCounts: {},
        metaCounts: {},
        collectionSummaries: [],
        boundary: {
            localeConfig: false,
            frontendConfig: false,
            sitemapXml: false,
            sitemapXmlUrlCount: null,
            generatedSitemap: false,
            generatedSitemapUrlCount: null,
            expectedSitemapUrlCount: null,
            sitemapStaticUrlCount: null,
            sitemapEligibleProductCount: null,
            sitemapLocaleCount: null,
            sitemapProductUrlCount: null
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
            validateFilledData(data, errors, requiredCollections, targetLocale);
            requiredCollections.forEach((key) => {
                report.inputCounts[key] = Array.isArray(data[key]) ? data[key].length : 0;
                report.metaCounts[key] = data.meta && data.meta.counts ? data.meta.counts[key] : null;
            });
        } catch (err) {
            errors.push('Input JSON cannot be parsed: ' + err.message);
        }
    }

    if (args.requireCleanBoundary) {
        report.boundary = validateCleanBoundary(errors, warnings, args);
    }

    if (data && fs.existsSync(args.db)) {
        let db = null;
        try {
            db = new Database(args.db, { readonly: !args.apply, fileMustExist: true });
            const tableColumnsByName = validateDatabase(db, errors, selectedCollectionNames);
            const expectedCoverages = activeExpectedCoverages(db, selectedCollectionNames, errors);
            requiredCollections.forEach((key) => {
                if (key === 'staticPages') {
                    report.expectedCounts[key] = 'not database-backed';
                } else if (expectedCoverages[key]) {
                    report.expectedCounts[key] = expectedCoverages[key].count;
                } else if (key === 'contentBlocks' && args.skipContentBlocks) {
                    report.expectedCounts[key] = 'skipped';
                } else {
                    report.expectedCounts[key] = 'not checked';
                }
            });
            selectedCollectionNames.forEach((collectionName) => {
                report.collectionSummaries.push(analyzeCollection(
                    db,
                    data,
                    collectionName,
                    tableColumnsByName,
                    expectedCoverages[collectionName],
                    errors,
                    report.blockers
                ));
            });

            if (args.apply && !errors.length && !report.blockers.length) {
                const backup = await createDatabaseBackup(db, args.backup);
                report.backupPath = backup.path;
                report.backupSizeBytes = backup.sizeBytes;
                report.appliedCounts = applyImportRecords(db, report.collectionSummaries);
                report.databaseChanged = true;
            }
        } catch (err) {
            errors.push('Database ' + report.mode + ' failed: ' + err.message);
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
        console.error(targetLocale + ' import ' + report.mode + ' failed. Report: ' + args.report);
        errors.forEach((message) => console.error('- ' + message));
        process.exit(1);
    }

    if (report.blockers.length) {
        console.warn(targetLocale + ' import dry-run completed with apply blockers.');
    } else if (args.apply) {
        console.log(targetLocale + ' import apply passed.');
    } else {
        console.log(targetLocale + ' import dry-run passed.');
    }
    console.log('Report: ' + args.report);
    console.log('Database changed: ' + (report.databaseChanged ? 'yes' : 'no'));
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err && err.stack ? err.stack : err.message);
        process.exit(1);
    });
}
