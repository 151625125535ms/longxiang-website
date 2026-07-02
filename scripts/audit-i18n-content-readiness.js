const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const {
    loadLocaleConfig,
    plannedLocaleEntries,
    plannedPageShellsForVerification
} = require('./i18n-page-model');

const root = path.resolve(__dirname, '..');
const homeDir = process.env.USERPROFILE || os.homedir();
if (!homeDir) throw new Error('Unable to resolve user home directory for desktop report output.');
const stageDir = path.join(homeDir, 'Desktop', 'new', 'stage');
const localeConfigPath = path.join(root, 'config', 'locales.json');
const dbPath = path.join(root, 'data', 'longxiang.db');
const siteOrigin = 'https://www.lxenelectric.com';
const siteHost = new URL(siteOrigin).hostname;
const expectedSupportedLocales = ['en', 'ar', 'fr'];
const defaultTargetLocales = ['fr'];
const defaultPlannedOnlyLocales = ['pt'];
const allowedTargetLocales = ['fr', 'ru'];
const requiredPlannedOnlyLocales = ['pt'];
const requiredLocaleColumns = {
    products: [
        'name',
        'short_desc',
        'description',
        'seo_title',
        'seo_description',
        'seo_keywords'
    ],
    categories: [
        'name'
    ],
    certifications: [
        'name',
        'category_label',
        'issuer',
        'description'
    ]
};

const failures = [];
const warnings = [];

function argValue(name, fallback) {
    const prefix = '--' + name + '=';
    const withEquals = process.argv.find((arg) => arg.indexOf(prefix) === 0);
    if (withEquals) return withEquals.slice(prefix.length);

    const index = process.argv.indexOf('--' + name);
    if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

    return fallback;
}

function parseLocaleList(value, fallback) {
    const source = value == null ? fallback.join(',') : value;
    return String(source)
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

function fail(message) {
    failures.push(message);
}

function warn(message) {
    warnings.push(message);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function abortIfFailures() {
    if (!failures.length) return;
    console.error('i18n content readiness audit failed:');
    failures.forEach((message) => console.error('- ' + message));
    process.exit(1);
}

function unique(values) {
    return Array.from(new Set(values));
}

function formatList(values) {
    return values.length ? values.join(', ') : 'none';
}

function readText(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fileExists(relativePath) {
    return fs.existsSync(path.join(root, relativePath));
}

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function stripTags(value) {
    return String(value || '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseAttributes(source) {
    const attrs = {};
    const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        const name = match[1].toLowerCase();
        attrs[name] = (match[2] != null ? match[2] : (match[3] != null ? match[3] : (match[4] || ''))).trim();
    }

    return attrs;
}

function collectTags(source, tagName) {
    const tags = [];
    const pattern = new RegExp('<\\s*' + tagName + '\\b([^>]*)>', 'gi');
    let match;

    while ((match = pattern.exec(source || '')) !== null) {
        tags.push({ raw: match[0], attrs: parseAttributes(match[1]) });
    }

    return tags;
}

function firstElementText(source, tagName) {
    const pattern = new RegExp('<\\s*' + tagName + '\\b[^>]*>([\\s\\S]*?)<\\s*/\\s*' + tagName + '\\s*>', 'i');
    const match = pattern.exec(source || '');
    return match ? stripTags(match[1]) : '';
}

function findMetaByName(html, name) {
    return collectTags(html, 'meta')
        .map((tag) => tag.attrs)
        .find((attrs) => String(attrs.name || '').toLowerCase() === name.toLowerCase());
}

function findLinks(html, rel) {
    return collectTags(html, 'link')
        .map((tag) => tag.attrs)
        .filter((attrs) => String(attrs.rel || '').toLowerCase().split(/\s+/).indexOf(rel) !== -1);
}

function normalizePathPrefix(value) {
    const prefix = String(value || '').trim().replace(/\/+$/, '');
    if (!prefix || prefix === '/') return '';
    return prefix.charAt(0) === '/' ? prefix : '/' + prefix;
}

function hrefUsesPrefix(href, prefix, basePath) {
    const normalizedPrefix = normalizePathPrefix(prefix);
    if (!normalizedPrefix) return false;

    const value = String(href || '').trim();
    if (!value) return false;

    try {
        const baseUrl = new URL(basePath || '/', siteOrigin);
        const parsed = new URL(value, baseUrl);
        if (parsed.hostname && parsed.hostname !== siteHost) return false;
        return parsed.pathname === normalizedPrefix || parsed.pathname.indexOf(normalizedPrefix + '/') === 0;
    } catch (err) {
        const normalized = value.replace(/\\/g, '/').replace(/^[.\/]+/, '/');
        return normalized === normalizedPrefix || normalized.indexOf(normalizedPrefix + '/') === 0;
    }
}

function localeDirectoryExists(locale) {
    const prefix = String(locale.pathPrefix || '').replace(/^\/+/, '').replace(/\/+$/, '');
    return Boolean(prefix) && fs.existsSync(path.join(root, prefix));
}

function validateLocaleConfig(config, targetLocales, plannedOnlyLocales) {
    assert(JSON.stringify(config.supportedLocales) === JSON.stringify(expectedSupportedLocales),
        'supportedLocales must be en/ar/fr. Current: ' + formatList(config.supportedLocales || []));

    const configuredPlanned = plannedLocaleEntries(config);
    const plannedCodes = configuredPlanned.map((locale) => locale.code);

    targetLocales.forEach((code) => {
        const locale = config.locales && config.locales[code];
        const planned = configuredPlanned.find((entry) => entry.code === code);

        assert(Boolean(locale || planned), code + ' must be configured as active or planned locale.');
        if (locale) {
            assert(config.supportedLocales.indexOf(code) !== -1, code + ' active locale must enter supportedLocales.');
            assert(plannedCodes.indexOf(code) === -1, code + ' active locale must not remain in plannedLocales.');
            assert(locale.includeInSitemap === true, code + ' active locale must keep includeInSitemap=true.');
        }
        if (planned) {
            assert(planned.includeInSitemap === false, code + ' activation candidate must keep includeInSitemap=false while planned.');
            assert(config.supportedLocales.indexOf(code) === -1, code + ' activation candidate must not enter supportedLocales yet.');
            assert(!config.locales[code], code + ' activation candidate must not enter active locales yet.');
        }
    });

    plannedOnlyLocales.forEach((code) => {
        const locale = configuredPlanned.find((entry) => entry.code === code);
        assert(Boolean(locale), code + ' must remain in plannedLocales.');
        if (!locale) return;

        assert(locale.includeInSitemap === false, code + ' planned locale must keep includeInSitemap=false.');
        assert(config.supportedLocales.indexOf(code) === -1, code + ' must not enter supportedLocales.');
        assert(!config.locales[code], code + ' must not enter active locales.');
    });

    plannedOnlyLocales.forEach((code) => {
        assert(targetLocales.indexOf(code) === -1, code + ' is planned-only and must not be a target locale.');
    });
}

function validateRequestedLocales(targetLocales, plannedOnlyLocales) {
    targetLocales.forEach((code) => {
        assert(allowedTargetLocales.indexOf(code) !== -1,
            code + ' is not an allowed E5 target locale. Allowed target locales: ' + allowedTargetLocales.join(', '));
    });

    requiredPlannedOnlyLocales.forEach((code) => {
        assert(plannedOnlyLocales.indexOf(code) !== -1, code + ' must remain listed as a planned-only locale.');
        assert(targetLocales.indexOf(code) === -1, code + ' must not be included in E5 target locales.');
    });
}

function auditPlannedShells(config, targetLocales, plannedOnlyLocales) {
    const plannedLocales = plannedLocaleEntries(config);
    const plannedCodes = plannedLocales.map((locale) => locale.code);
    const requestedCodes = unique(plannedOnlyLocales.concat(
        targetLocales.filter((code) => plannedCodes.indexOf(code) !== -1)
    ));
    const plannedPrefixes = plannedLocales
        .filter((locale) => requestedCodes.indexOf(locale.code) !== -1)
        .map((locale) => locale.pathPrefix)
        .filter(Boolean);
    const shells = plannedPageShellsForVerification(config, root)
        .filter((shell) => requestedCodes.indexOf(shell.locale) !== -1);
    const summaries = {};

    requestedCodes.forEach((code) => {
        summaries[code] = {
            files: 0,
            existing: 0,
            missing: [],
            noindex: 0,
            plannedHrefIssues: 0,
            plannedHreflangIssues: 0,
            titles: [],
            h1: []
        };
    });

    shells.forEach((shell) => {
        const locale = plannedLocales.find((entry) => entry.code === shell.locale);
        const summary = summaries[shell.locale];
        if (!summary || !locale) return;

        summary.files += 1;

        if (localeDirectoryExists(locale)) {
            assert(shell.exists, shell.file + ' is required because ' + shell.locale + ' directory exists.');
        }

        if (!shell.exists) {
            summary.missing.push(shell.file);
            return;
        }

        summary.existing += 1;
        const html = readText(shell.file);
        const robots = findMetaByName(html, 'robots');
        const robotsContent = robots ? String(robots.content || '').toLowerCase() : '';
        const links = findLinks(html, 'canonical').concat(findLinks(html, 'alternate'));

        if (robotsContent.indexOf('noindex') !== -1 && robotsContent.indexOf('follow') !== -1) {
            summary.noindex += 1;
        } else {
            fail(shell.file + ' must keep robots noindex, follow while planned.');
        }

        links.forEach((attrs) => {
            plannedPrefixes.forEach((prefix) => {
                if (hrefUsesPrefix(attrs.href, prefix, shell.path)) {
                    summary.plannedHrefIssues += 1;
                    fail(shell.file + ' canonical/alternate must not point to planned locale path: ' + attrs.href);
                }
            });

            const hreflang = String(attrs.hreflang || '').toLowerCase();
            if (requestedCodes.indexOf(hreflang) !== -1) {
                summary.plannedHreflangIssues += 1;
                fail(shell.file + ' must not include planned hreflang="' + hreflang + '".');
            }
        });

        summary.titles.push({ file: shell.file, value: firstElementText(html, 'title') });
        summary.h1.push({ file: shell.file, value: firstElementText(html, 'h1') });
    });

    return summaries;
}

function tableExists(db, tableName) {
    return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function countRows(db, tableName, whereClause) {
    if (!tableExists(db, tableName)) return null;
    const sql = 'SELECT COUNT(*) AS count FROM ' + tableName + (whereClause ? ' WHERE ' + whereClause : '');
    return db.prepare(sql).get().count;
}

function tableColumns(db, tableName) {
    if (!tableExists(db, tableName)) return [];
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().map((row) => row.name);
}

function countRowsWithAvailableFilter(db, tableName, filters) {
    const columns = tableColumns(db, tableName);
    const filter = (filters || []).find((item) => columns.indexOf(item.column) !== -1);
    return countRows(db, tableName, filter ? filter.where : '');
}

function whereClauseWithAvailableFilter(db, tableName, filters) {
    const columns = tableColumns(db, tableName);
    const filter = (filters || []).find((item) => columns.indexOf(item.column) !== -1);
    return filter ? filter.where : '';
}

function hasLocaleColumn(columns, locale) {
    return columns.some((name) => new RegExp('(^|_)' + locale + '$', 'i').test(name));
}

function requiredColumnsForLocale(tableName, locale) {
    return (requiredLocaleColumns[tableName] || []).map((field) => field + '_' + locale);
}

function localeColumnReadiness(tableName, columns, locale) {
    const required = requiredColumnsForLocale(tableName, locale);
    const missing = required.filter((column) => columns.indexOf(column) === -1);

    return {
        hasAny: hasLocaleColumn(columns, locale),
        complete: required.length ? missing.length === 0 : hasLocaleColumn(columns, locale),
        missing
    };
}

function safeJsonParse(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch (err) {
        return null;
    }
}

function scanLocaleKeys(value, locales, counts) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach((item) => scanLocaleKeys(item, locales, counts));
        return;
    }

    Object.keys(value).forEach((key) => {
        const normalizedKey = key.toLowerCase();
        locales.forEach((locale) => {
            const suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
            if (normalizedKey === locale || normalizedKey.endsWith('_' + locale) || key.endsWith(suffix)) {
                if (hasText(String(value[key] == null ? '' : value[key]))) counts[locale] += 1;
            }
        });
        scanLocaleKeys(value[key], locales, counts);
    });
}

function auditDatabase(targetLocales) {
    const summary = {
        available: false,
        counts: {},
        columns: {},
        contentBlockLocaleKeys: {},
        contentBlockSlugs: []
    };

    targetLocales.forEach((locale) => {
        summary.contentBlockLocaleKeys[locale] = 0;
    });

    if (!fs.existsSync(dbPath)) {
        warn('SQLite database not found: ' + dbPath);
        return summary;
    }

    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    summary.available = true;

    try {
        summary.counts.products = countRowsWithAvailableFilter(db, 'products', [
            { column: 'status', where: "status = 'published'" }
        ]);
        summary.counts.categories = countRowsWithAvailableFilter(db, 'categories', [
            { column: 'status', where: "status = 'active'" },
            { column: 'is_active', where: 'is_active = 1' }
        ]);
        summary.counts.certifications = countRowsWithAvailableFilter(db, 'certifications', [
            { column: 'status', where: "status = 'published'" }
        ]);
        summary.counts.contentBlocks = countRowsWithAvailableFilter(db, 'content_blocks', [
            { column: 'status', where: "status = 'published'" }
        ]);

        ['products', 'categories', 'certifications', 'content_blocks'].forEach((table) => {
            const columns = tableColumns(db, table);
            summary.columns[table] = targetLocales.reduce((acc, locale) => {
                acc[locale] = localeColumnReadiness(table, columns, locale);
                return acc;
            }, {});
        });

        ['products', 'categories', 'certifications'].forEach((table) => {
            targetLocales.forEach((locale) => {
                const readiness = summary.columns[table] && summary.columns[table][locale];
                if (readiness && !readiness.complete) {
                    fail(table + ' is missing required ' + locale + ' columns: ' + readiness.missing.join(', '));
                }
            });
        });

        if (tableExists(db, 'content_blocks')) {
            const contentBlockColumns = tableColumns(db, 'content_blocks');
            if (contentBlockColumns.indexOf('slug') === -1 || contentBlockColumns.indexOf('body_json') === -1) {
                warn('content_blocks table is missing slug or body_json; locale key scan skipped.');
            } else {
                const whereClause = whereClauseWithAvailableFilter(db, 'content_blocks', [
                    { column: 'status', where: "status = 'published'" }
                ]);
                const rows = db.prepare(
                    'SELECT slug, body_json FROM content_blocks'
                    + (whereClause ? ' WHERE ' + whereClause : '')
                    + ' ORDER BY slug'
                ).all();
            summary.contentBlockSlugs = rows.map((row) => row.slug);
            rows.forEach((row) => {
                const parsed = safeJsonParse(row.body_json);
                scanLocaleKeys(parsed, targetLocales, summary.contentBlockLocaleKeys);
            });
            }
        }
    } finally {
        db.close();
    }

    return summary;
}

function collectProductTemplateRows(limit) {
    if (!fs.existsSync(dbPath)) return [];
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
        if (!tableExists(db, 'products')) return [];
        const columns = tableColumns(db, 'products');
        const selectExpression = (column) => columns.indexOf(column) !== -1 ? column : "'' AS " + column;
        const whereClause = columns.indexOf('status') !== -1 ? " WHERE status = 'published'" : '';
        const orderBy = [
            columns.indexOf('sort_order') !== -1 ? 'sort_order ASC' : '',
            columns.indexOf('id') !== -1 ? 'id ASC' : ''
        ].filter(Boolean);
        const sql = 'SELECT '
            + ['id', 'slug', 'name_en', 'short_desc_en'].map(selectExpression).join(', ')
            + ' FROM products'
            + whereClause
            + (orderBy.length ? ' ORDER BY ' + orderBy.join(', ') : '')
            + ' LIMIT ?';
        return db.prepare(sql).all(limit);
    } finally {
        db.close();
    }
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

function renderShellSection(shellSummary) {
    return Object.keys(shellSummary).sort().map((code) => {
        const item = shellSummary[code];
        return [
            '### ' + code,
            '',
            '- 页面壳数量: ' + item.files,
            '- 已存在页面壳: ' + item.existing,
            '- noindex 页面壳: ' + item.noindex,
            '- 缺失页面壳: ' + (item.missing.length ? item.missing.join(', ') : '无'),
            '- planned canonical/alternate 路径问题: ' + item.plannedHrefIssues,
            '- planned hreflang 问题: ' + item.plannedHreflangIssues,
            '',
            '| 文件 | title | h1 |',
            '| --- | --- | --- |',
            item.titles.map((title, index) => {
                const h1 = item.h1[index] || {};
                return '| `' + title.file + '` | ' + (title.value || '') + ' | ' + (h1.value || '') + ' |';
            }).join('\n')
        ].join('\n');
    }).join('\n\n');
}

function renderDatabaseSection(databaseSummary, targetLocales) {
    const lines = [
        '## 数据库只读统计',
        '',
        '- 数据库可读: ' + (databaseSummary.available ? '是' : '否'),
        '- published products: ' + (databaseSummary.counts.products == null ? '未知' : databaseSummary.counts.products),
        '- active categories: ' + (databaseSummary.counts.categories == null ? '未知' : databaseSummary.counts.categories),
        '- published certifications: ' + (databaseSummary.counts.certifications == null ? '未知' : databaseSummary.counts.certifications),
        '- published content_blocks: ' + (databaseSummary.counts.contentBlocks == null ? '未知' : databaseSummary.counts.contentBlocks),
        '',
        '### fr/ru 字段承载迹象',
        '',
        '| 表 | ' + targetLocales.join(' | ') + ' |',
        '| --- | ' + targetLocales.map(() => '---').join(' | ') + ' |'
    ];

    Object.keys(databaseSummary.columns).forEach((table) => {
        lines.push('| `' + table + '` | ' + targetLocales.map((locale) => {
            const readiness = databaseSummary.columns[table][locale];
            if (!readiness) return '无';
            if (readiness.complete) return '完整';
            if (readiness.hasAny) return '缺失: ' + readiness.missing.join(', ');
            return '无';
        }).join(' | ') + ' |');
    });

    lines.push('', '### content_blocks locale key 迹象', '');
    targetLocales.forEach((locale) => {
        lines.push('- ' + locale + ': ' + databaseSummary.contentBlockLocaleKeys[locale] + ' 个 locale key 命中');
    });

    lines.push('', '### content_blocks slugs', '');
    lines.push(databaseSummary.contentBlockSlugs.length ? databaseSummary.contentBlockSlugs.map((slug) => '- `' + slug + '`').join('\n') : '无');

    return lines.join('\n');
}

function renderReport(targetLocales, plannedOnlyLocales, shellSummary, databaseSummary) {
    return [
        '# E5 内容准备度只读报告',
        '',
        '生成时间: ' + new Date().toISOString(),
        '项目路径: ' + root,
        '',
        '## 结论',
        '',
        '- 正式准备目标: ' + targetLocales.join(', '),
        '- planned 预留位: ' + plannedOnlyLocales.join(', '),
        '- 本报告只读项目文件和数据库，未写数据库、未改后台、未导入翻译。',
        '- pt 只作为 planned 保护对象，不生成 pt 翻译模板；ru 仅在显式指定时生成待启用候选模板。',
        '',
        '## planned 页面壳保护状态',
        '',
        renderShellSection(shellSummary),
        '',
        renderDatabaseSection(databaseSummary, targetLocales),
        '',
        '## 后续提示',
        '',
        '- fr 已作为当前 active 语言启用；ru 可作为待启用候选目标；pt 仍不应启用。',
        '- sitemap URL count 必须等于当前数据库和 active sitemap locale 动态计算值。',
        '- pt 不参与当前内容准备。'
    ].join('\n');
}

function renderTemplate(locale, productRows, databaseSummary) {
    const lines = [
        '# ' + locale + ' 翻译准备模板',
        '',
        '生成时间: ' + new Date().toISOString(),
        '',
        '说明: 这是人工翻译准备模板，不会写入数据库，也不会启用语言。',
        '',
        '## 静态页面壳',
        '',
        '| 页面 | title_' + locale + ' | meta_description_' + locale + ' | h1_' + locale + ' |',
        '| --- | --- | --- | --- |'
    ];

    [
        'index.html',
        'about.html',
        'products.html',
        'solutions.html',
        'education.html',
        'certifications.html',
        'compare.html',
        'contact.html',
        'product-detail.html',
        '404.html'
    ].forEach((file) => {
        lines.push('| `' + locale + '/' + file + '` |  |  |  |');
    });

    lines.push(
        '',
        '## 产品内容样例',
        '',
        '| id | slug | English name | English short description | name_' + locale + ' | short_desc_' + locale + ' |',
        '| --- | --- | --- | --- | --- | --- |'
    );

    productRows.forEach((row) => {
        lines.push('| `' + row.id + '` | `' + (row.slug || '') + '` | ' + (row.name_en || '') + ' | ' + (row.short_desc_en || '') + ' |  |  |');
    });

    lines.push('', '## content_blocks slugs', '');
    lines.push(databaseSummary.contentBlockSlugs.length ? databaseSummary.contentBlockSlugs.map((slug) => '- `' + slug + '`').join('\n') : '无');

    return lines.join('\n');
}

function assertNoPlannedOnlyTemplate(plannedOnlyLocales) {
    plannedOnlyLocales.forEach((locale) => {
        const templatePath = path.join(stageDir, 'e5-' + locale + '-translation-template.md');
        if (fs.existsSync(templatePath)) warn(locale + ' is planned-only, but a historical template exists: ' + templatePath);
    });
}

function main() {
    const targetLocales = unique(parseLocaleList(argValue('locales', null), defaultTargetLocales));
    const plannedOnlyLocales = unique(parseLocaleList(argValue('planned', null), defaultPlannedOnlyLocales));
    const config = loadLocaleConfig(localeConfigPath);

    validateRequestedLocales(targetLocales, plannedOnlyLocales);
    validateLocaleConfig(config, targetLocales, plannedOnlyLocales);
    assertNoPlannedOnlyTemplate(plannedOnlyLocales);
    abortIfFailures();

    const shellSummary = auditPlannedShells(config, targetLocales, plannedOnlyLocales);
    const databaseSummary = auditDatabase(targetLocales);
    const productRows = collectProductTemplateRows(20);

    writeFile(
        path.join(stageDir, 'e5-content-readiness-report.md'),
        renderReport(targetLocales, plannedOnlyLocales, shellSummary, databaseSummary)
    );

    targetLocales.forEach((locale) => {
        writeFile(
            path.join(stageDir, 'e5-' + locale + '-translation-template.md'),
            renderTemplate(locale, productRows, databaseSummary)
        );
    });

    if (warnings.length) {
        console.warn('i18n content readiness warnings:');
        warnings.forEach((message) => console.warn('- ' + message));
    }

    if (failures.length) {
        console.error('i18n content readiness audit failed:');
        failures.forEach((message) => console.error('- ' + message));
        process.exit(1);
    }

    console.log('i18n content readiness audit passed.');
    console.log('Report: ' + path.join(stageDir, 'e5-content-readiness-report.md'));
    console.log('Templates: ' + targetLocales.map((locale) => path.join(stageDir, 'e5-' + locale + '-translation-template.md')).join(', '));
    console.log('Planned-only locales: ' + formatList(plannedOnlyLocales));
}

if (require.main === module) {
    main();
}
