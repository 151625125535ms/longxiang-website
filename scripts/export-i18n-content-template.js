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
if (!homeDir) throw new Error('Unable to resolve user home directory for desktop output.');

const stageDir = path.join(homeDir, 'Desktop', 'new', 'stage');
const localeConfigPath = path.join(root, 'config', 'locales.json');
const dbPath = path.join(root, 'data', 'longxiang.db');
const expectedSupportedLocales = ['en', 'ar'];
const allowedTargetLocales = ['fr'];
const requiredPlannedOnlyLocales = ['pt'];
const expectedCounts = {
    productCategories: 13,
    products: 40,
    certifications: 76,
    staticPages: 10,
    contentBlocks: 14
};

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

function unique(values) {
    return Array.from(new Set(values));
}

function fail(message) {
    throw new Error(message);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function formatList(values) {
    return values.length ? values.join(', ') : 'none';
}

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function readText(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
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

function firstBodyText(source) {
    const match = /<\s*body\b[^>]*>([\s\S]*?)<\s*\/\s*body\s*>/i.exec(source || '');
    return match ? excerpt(stripTags(match[1]), 260) : '';
}

function findMetaByName(html, name) {
    return collectTags(html, 'meta')
        .map((tag) => tag.attrs)
        .find((attrs) => String(attrs.name || '').toLowerCase() === name.toLowerCase());
}

function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch (err) {
        return fallback;
    }
}

function excerpt(value, length) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    const limit = length || 180;
    return text.length > limit ? text.slice(0, limit - 3).trimEnd() + '...' : text;
}

function md(value) {
    return String(value == null ? '' : value)
        .replace(/\r?\n/g, '<br>')
        .replace(/\|/g, '\\|')
        .trim();
}

function tableExists(db, tableName) {
    return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function requiredTable(db, tableName) {
    assert(tableExists(db, tableName), tableName + ' table is required.');
}

function collectStringPaths(value, prefix, paths) {
    if (value == null) return;
    if (typeof value === 'string') {
        if (hasText(value)) paths.push({ path: prefix || '$', sample: excerpt(value, 120) });
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => collectStringPaths(item, (prefix || '$') + '[' + index + ']', paths));
        return;
    }

    if (typeof value === 'object') {
        Object.keys(value).forEach((key) => {
            const nextPrefix = prefix ? prefix + '.' + key : key;
            collectStringPaths(value[key], nextPrefix, paths);
        });
    }
}

function bodySummary(body) {
    const parsed = body || {};
    const paths = [];
    collectStringPaths(parsed, '', paths);
    return {
        topLevelKeys: Object.keys(parsed),
        stringPathCount: paths.length,
        stringPathSamples: paths.slice(0, 40)
    };
}

function validateLocaleConfig(config, targetLocale, plannedOnlyLocales) {
    assert(JSON.stringify(config.supportedLocales) === JSON.stringify(expectedSupportedLocales),
        'supportedLocales must remain en/ar. Current: ' + formatList(config.supportedLocales || []));

    assert(allowedTargetLocales.indexOf(targetLocale) !== -1,
        targetLocale + ' is not an allowed target locale. Allowed: ' + allowedTargetLocales.join(', '));

    const plannedLocales = plannedLocaleEntries(config);
    const requestedCodes = unique([targetLocale].concat(plannedOnlyLocales));

    requestedCodes.forEach((code) => {
        const locale = plannedLocales.find((entry) => entry.code === code);
        assert(Boolean(locale), code + ' must remain in plannedLocales.');
        assert(config.supportedLocales.indexOf(code) === -1, code + ' must not enter supportedLocales.');
        assert(!config.locales[code], code + ' must not enter active locales.');
        assert(locale.includeInSitemap === false, code + ' planned locale must keep includeInSitemap=false.');
    });

    requiredPlannedOnlyLocales.forEach((code) => {
        assert(plannedOnlyLocales.indexOf(code) !== -1, code + ' must be passed as a planned-only locale.');
        assert(targetLocale !== code, code + ' is planned-only and cannot be exported as target content.');
    });

    plannedOnlyLocales.forEach((code) => {
        assert(code !== targetLocale, code + ' is planned-only and cannot be the target locale.');
    });
}

function collectStaticPages(config, targetLocale) {
    return plannedPageShellsForVerification(config, root)
        .filter((shell) => shell.locale === targetLocale)
        .map((shell) => {
            assert(shell.exists, shell.file + ' must exist before exporting a content template.');
            const html = readText(shell.file);
            const description = findMetaByName(html, 'description');
            return {
                file: shell.file,
                path: shell.path,
                source: {
                    title: firstElementText(html, 'title'),
                    metaDescription: description ? String(description.content || '').trim() : '',
                    h1: firstElementText(html, 'h1'),
                    bodyExcerpt: firstBodyText(html)
                },
                target: {
                    ['title_' + targetLocale]: '',
                    ['meta_description_' + targetLocale]: '',
                    ['h1_' + targetLocale]: '',
                    ['hero_copy_' + targetLocale]: ''
                }
            };
        });
}

function collectProductCategories(db, targetLocale) {
    requiredTable(db, 'categories');
    return db.prepare(`
        SELECT
            c.id,
            c.type,
            c.parent_id,
            c.slug,
            c.name_en,
            c.name_ar,
            c.sort_order,
            parent.slug AS parent_slug,
            parent.name_en AS parent_name_en
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE c.type = 'product'
            AND COALESCE(c.is_active, 1) = 1
        ORDER BY c.sort_order ASC, c.id ASC
    `).all().map((row) => ({
        id: row.id,
        type: row.type,
        parentId: row.parent_id,
        parentSlug: row.parent_slug || '',
        parentNameEn: row.parent_name_en || '',
        slug: row.slug || '',
        sortOrder: row.sort_order,
        source: {
            name_en: row.name_en || '',
            name_ar: row.name_ar || ''
        },
        target: {
            ['name_' + targetLocale]: ''
        }
    }));
}

function collectProducts(db, targetLocale) {
    requiredTable(db, 'products');
    requiredTable(db, 'categories');
    return db.prepare(`
        SELECT
            p.id,
            p.slug,
            p.category_id,
            p.product_group,
            p.sub_category,
            p.status,
            p.sort_order,
            p.name_en,
            p.name_ar,
            p.short_desc_en,
            p.short_desc_ar,
            p.description_en,
            p.description_ar,
            p.seo_title,
            p.seo_description,
            p.seo_keywords,
            c.slug AS category_slug,
            c.name_en AS category_name_en
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published'
        ORDER BY p.sort_order ASC, p.id ASC
    `).all().map((row) => ({
        id: row.id,
        slug: row.slug || '',
        categoryId: row.category_id,
        categorySlug: row.category_slug || '',
        categoryNameEn: row.category_name_en || '',
        productGroup: row.product_group || '',
        subCategory: row.sub_category || '',
        sortOrder: row.sort_order,
        source: {
            name_en: row.name_en || '',
            name_ar: row.name_ar || '',
            short_desc_en: row.short_desc_en || '',
            short_desc_ar: row.short_desc_ar || '',
            description_en: row.description_en || '',
            description_ar: row.description_ar || '',
            seo_title: row.seo_title || '',
            seo_description: row.seo_description || '',
            seo_keywords: row.seo_keywords || ''
        },
        target: {
            ['name_' + targetLocale]: '',
            ['short_desc_' + targetLocale]: '',
            ['description_' + targetLocale]: '',
            ['seo_title_' + targetLocale]: '',
            ['seo_description_' + targetLocale]: '',
            ['seo_keywords_' + targetLocale]: ''
        }
    }));
}

function collectCertifications(db, targetLocale) {
    requiredTable(db, 'certifications');
    return db.prepare(`
        SELECT
            id,
            legacy_id,
            status,
            sort_order,
            name_en,
            name_ar,
            category_label_en,
            category_label_ar,
            issuer_en,
            issuer_ar,
            expiry_date,
            description_en,
            description_ar
        FROM certifications
        WHERE status = 'published'
        ORDER BY sort_order ASC, id ASC
    `).all().map((row) => ({
        id: row.id,
        legacyId: row.legacy_id || '',
        sortOrder: row.sort_order,
        expiryDate: row.expiry_date || '',
        source: {
            name_en: row.name_en || '',
            name_ar: row.name_ar || '',
            category_label_en: row.category_label_en || '',
            category_label_ar: row.category_label_ar || '',
            issuer_en: row.issuer_en || '',
            issuer_ar: row.issuer_ar || '',
            description_en: row.description_en || '',
            description_ar: row.description_ar || ''
        },
        target: {
            ['name_' + targetLocale]: '',
            ['issuer_' + targetLocale]: '',
            ['description_' + targetLocale]: ''
        },
        readOnlyFallback: {
            note: 'category_label_' + targetLocale + ' is intentionally not a fillable target field in this stage.'
        }
    }));
}

function collectContentBlocks(db, targetLocale) {
    requiredTable(db, 'content_blocks');
    return db.prepare(`
        SELECT
            id,
            slug,
            title_en,
            title_ar,
            body_json,
            sort_order,
            version
        FROM content_blocks
        WHERE status = 'published'
        ORDER BY sort_order ASC, slug ASC
    `).all().map((row) => {
        const body = safeJsonParse(row.body_json, {});
        return {
            id: row.id,
            slug: row.slug || '',
            sortOrder: row.sort_order,
            version: row.version,
            source: {
                title_en: row.title_en || '',
                title_ar: row.title_ar || '',
                body_json: body,
                body_summary: bodySummary(body)
            },
            target: {
                locale: targetLocale,
                title_key_suggestion: 'title_' + targetLocale,
                body_json_patch: {}
            }
        };
    });
}

function validateCounts(template) {
    const counts = template.meta.counts;
    const failures = [];

    Object.keys(expectedCounts).forEach((key) => {
        if (counts[key] !== expectedCounts[key]) {
            failures.push(key + ' expected ' + expectedCounts[key] + ', got ' + counts[key]);
        }
    });

    if (failures.length) {
        fail('Template coverage count mismatch: ' + failures.join('; '));
    }
}

function renderCategoriesMarkdown(categories, locale) {
    const lines = [
        '## Product categories',
        '',
        '| id | slug | parent | English name | Arabic name | name_' + locale + ' |',
        '| --- | --- | --- | --- | --- | --- |'
    ];

    categories.forEach((item) => {
        lines.push([
            item.id,
            '`' + md(item.slug) + '`',
            md(item.parentSlug),
            md(item.source.name_en),
            md(item.source.name_ar),
            md(item.target['name_' + locale])
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    });

    return lines.join('\n');
}

function renderProductsMarkdown(products, locale) {
    const lines = [
        '## Products',
        '',
        'Use the JSON template for full descriptions. This Markdown view keeps long source fields as excerpts.',
        '',
        '| id | slug | category | English name | English short description | name_' + locale + ' | short_desc_' + locale + ' | description_' + locale + ' | seo_title_' + locale + ' | seo_description_' + locale + ' | seo_keywords_' + locale + ' |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    ];

    products.forEach((item) => {
        lines.push([
            item.id,
            '`' + md(item.slug) + '`',
            md(item.categorySlug),
            md(item.source.name_en),
            md(excerpt(item.source.short_desc_en, 160)),
            md(item.target['name_' + locale]),
            md(item.target['short_desc_' + locale]),
            md(item.target['description_' + locale]),
            md(item.target['seo_title_' + locale]),
            md(item.target['seo_description_' + locale]),
            md(item.target['seo_keywords_' + locale])
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    });

    return lines.join('\n');
}

function renderCertificationsMarkdown(certifications, locale) {
    const lines = [
        '## Certifications',
        '',
        '| id | legacy id | English name | English issuer | English description | name_' + locale + ' | issuer_' + locale + ' | description_' + locale + ' |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |'
    ];

    certifications.forEach((item) => {
        lines.push([
            item.id,
            md(item.legacyId),
            md(item.source.name_en),
            md(item.source.issuer_en),
            md(excerpt(item.source.description_en, 160)),
            md(item.target['name_' + locale]),
            md(item.target['issuer_' + locale]),
            md(item.target['description_' + locale])
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    });

    return lines.join('\n');
}

function renderStaticPagesMarkdown(staticPages, locale) {
    const lines = [
        '## Static page shells',
        '',
        '| file | current title | current meta description | current h1 | title_' + locale + ' | meta_description_' + locale + ' | h1_' + locale + ' | hero_copy_' + locale + ' |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |'
    ];

    staticPages.forEach((item) => {
        lines.push([
            '`' + md(item.file) + '`',
            md(item.source.title),
            md(item.source.metaDescription),
            md(item.source.h1),
            md(item.target['title_' + locale]),
            md(item.target['meta_description_' + locale]),
            md(item.target['h1_' + locale]),
            md(item.target['hero_copy_' + locale])
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    });

    return lines.join('\n');
}

function renderContentBlocksMarkdown(blocks, locale) {
    const lines = [
        '## Content blocks',
        '',
        'Use the JSON template to inspect full body_json. Markdown lists top-level keys and string-path samples for translation planning.',
        '',
        '| id | slug | English title | top-level keys | string paths | body_json_' + locale + '_patch |',
        '| --- | --- | --- | --- | --- | --- |'
    ];

    blocks.forEach((item) => {
        lines.push([
            item.id,
            '`' + md(item.slug) + '`',
            md(item.source.title_en),
            md(item.source.body_summary.topLevelKeys.join(', ')),
            item.source.body_summary.stringPathCount,
            '`{}`'
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    });

    lines.push('', '### Content block string path samples', '');
    blocks.forEach((item) => {
        lines.push('#### `' + item.slug + '`');
        if (!item.source.body_summary.stringPathSamples.length) {
            lines.push('');
            lines.push('- No string paths found.');
            lines.push('');
            return;
        }
        item.source.body_summary.stringPathSamples.slice(0, 20).forEach((sample) => {
            lines.push('- `' + md(sample.path) + '`: ' + md(sample.sample));
        });
        lines.push('');
    });

    return lines.join('\n');
}

function renderMarkdown(template) {
    const locale = template.meta.locale;
    const counts = template.meta.counts;
    return [
        '# ' + locale + ' content entry template',
        '',
        'Generated at: ' + template.meta.generatedAt,
        'Project root: ' + template.meta.projectRoot,
        '',
        'This is a read-only content preparation template. It does not write to the database and does not enable any locale.',
        '',
        '## Coverage',
        '',
        '| area | count |',
        '| --- | --- |',
        '| active product categories | ' + counts.productCategories + ' |',
        '| published products | ' + counts.products + ' |',
        '| published certifications | ' + counts.certifications + ' |',
        '| static page shells | ' + counts.staticPages + ' |',
        '| published content_blocks | ' + counts.contentBlocks + ' |',
        '',
        'Planned-only locales: ' + template.meta.plannedOnlyLocales.join(', '),
        '',
        renderCategoriesMarkdown(template.productCategories, locale),
        '',
        renderProductsMarkdown(template.products, locale),
        '',
        renderCertificationsMarkdown(template.certifications, locale),
        '',
        renderStaticPagesMarkdown(template.staticPages, locale),
        '',
        renderContentBlocksMarkdown(template.contentBlocks, locale),
        ''
    ].join('\n');
}

function writeOutputs(template) {
    fs.mkdirSync(stageDir, { recursive: true });
    const markdownPath = path.join(stageDir, template.meta.locale + '-content-entry-template.md');
    const jsonPath = path.join(stageDir, template.meta.locale + '-content-entry-template.json');

    fs.writeFileSync(markdownPath, renderMarkdown(template), 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(template, null, 2) + '\n', 'utf8');

    return { markdownPath, jsonPath };
}

function buildTemplate(targetLocale, plannedOnlyLocales) {
    assert(fs.existsSync(dbPath), 'SQLite database not found: ' + dbPath);

    const config = loadLocaleConfig(localeConfigPath);
    validateLocaleConfig(config, targetLocale, plannedOnlyLocales);

    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
        const productCategories = collectProductCategories(db, targetLocale);
        const products = collectProducts(db, targetLocale);
        const certifications = collectCertifications(db, targetLocale);
        const staticPages = collectStaticPages(config, targetLocale);
        const contentBlocks = collectContentBlocks(db, targetLocale);
        const template = {
            meta: {
                generatedAt: new Date().toISOString(),
                projectRoot: root,
                locale: targetLocale,
                plannedOnlyLocales,
                supportedLocales: config.supportedLocales,
                note: 'Read-only template for translation/content entry. Do not import without separate approval.',
                counts: {
                    productCategories: productCategories.length,
                    products: products.length,
                    certifications: certifications.length,
                    staticPages: staticPages.length,
                    contentBlocks: contentBlocks.length
                }
            },
            productCategories,
            products,
            certifications,
            staticPages,
            contentBlocks
        };

        validateCounts(template);
        return template;
    } finally {
        db.close();
    }
}

function main() {
    const targetLocale = String(argValue('locale', 'fr')).trim().toLowerCase();
    const plannedOnlyLocales = unique(parseLocaleList(argValue('planned', null), requiredPlannedOnlyLocales));
    const template = buildTemplate(targetLocale, plannedOnlyLocales);
    const output = writeOutputs(template);

    console.log('i18n content template export passed.');
    console.log('Locale: ' + targetLocale);
    console.log('Markdown: ' + output.markdownPath);
    console.log('JSON: ' + output.jsonPath);
    console.log('Counts: ' + JSON.stringify(template.meta.counts));
    console.log('Planned-only locales: ' + plannedOnlyLocales.join(', '));
}

if (require.main === module) {
    try {
        main();
    } catch (err) {
        console.error('i18n content template export failed:');
        console.error('- ' + err.message);
        process.exit(1);
    }
}
