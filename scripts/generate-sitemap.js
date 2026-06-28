const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { resolveDbPath } = require('../server/lib/db');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://www.lxenelectric.com').replace(/\/+$/, '');
const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'sitemap.xml');
const LOCALE_CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'locales.json');

const STATIC_PAGES = [
    { path: '/', changefreq: 'weekly', priority: '1.0', file: 'index.html' },
    { path: '/about.html', changefreq: 'monthly', priority: '0.8', file: 'about.html', block: 'about-us' },
    { path: '/products.html', changefreq: 'weekly', priority: '0.9', file: 'products.html', block: 'product-pages' },
    { path: '/solutions.html', changefreq: 'monthly', priority: '0.8', file: 'solutions.html', block: 'solutions' },
    { path: '/education.html', changefreq: 'monthly', priority: '0.5', file: 'education.html', block: 'education' },
    { path: '/certifications.html', changefreq: 'monthly', priority: '0.7', file: 'certifications.html', block: 'certifications' },
    { path: '/compare.html', changefreq: 'monthly', priority: '0.5', file: 'compare.html', block: 'compare' },
    { path: '/contact.html', changefreq: 'monthly', priority: '0.8', file: 'contact.html', block: 'contact' },
    { path: '/ar/index.html', changefreq: 'weekly', priority: '0.8', file: 'ar/index.html' },
    { path: '/ar/about.html', changefreq: 'monthly', priority: '0.6', file: 'ar/about.html', block: 'about-us' },
    { path: '/ar/products.html', changefreq: 'weekly', priority: '0.7', file: 'ar/products.html', block: 'product-pages' },
    { path: '/ar/solutions.html', changefreq: 'monthly', priority: '0.6', file: 'ar/solutions.html', block: 'solutions' },
    { path: '/ar/education.html', changefreq: 'monthly', priority: '0.4', file: 'ar/education.html', block: 'education' },
    { path: '/ar/certifications.html', changefreq: 'monthly', priority: '0.5', file: 'ar/certifications.html', block: 'certifications' },
    { path: '/ar/compare.html', changefreq: 'monthly', priority: '0.5', file: 'ar/compare.html', block: 'compare' },
    { path: '/ar/contact.html', changefreq: 'monthly', priority: '0.6', file: 'ar/contact.html', block: 'contact' }
];

function toIsoDate(value) {
    let timestamp = Number(value);
    if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < 100000000000) {
        timestamp *= 1000;
    }
    const date = Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp) : new Date();
    return date.toISOString().slice(0, 10);
}

function fileLastModified(file) {
    try {
        return fs.statSync(path.join(PROJECT_ROOT, file)).mtime;
    } catch (err) {
        return null;
    }
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildUrl(pathname) {
    return SITE_ORIGIN + pathname;
}

function openReadonlyDb() {
    const db = new Database(resolveDbPath(), { readonly: true, fileMustExist: true });
    db.pragma('query_only = ON');
    return db;
}

function loadLocaleConfig() {
    const parsed = JSON.parse(fs.readFileSync(LOCALE_CONFIG_PATH, 'utf8'));
    const localeMap = parsed.locales || {};
    const supportedLocales = Array.isArray(parsed.supportedLocales) && parsed.supportedLocales.length
        ? parsed.supportedLocales
        : Object.keys(localeMap);

    return {
        defaultLocale: parsed.defaultLocale || supportedLocales[0] || 'en',
        supportedLocales: supportedLocales,
        locales: localeMap
    };
}

function normalizePathPrefix(value) {
    const prefix = String(value || '').trim().replace(/\/+$/, '');
    if (!prefix || prefix === '/') return '';
    return prefix.charAt(0) === '/' ? prefix : '/' + prefix;
}

const LOCALE_CONFIG = loadLocaleConfig();

function localeEntry(code) {
    const locale = LOCALE_CONFIG.locales[code] || {};
    const prefix = normalizePathPrefix(locale.pathPrefix);

    return {
        code: code,
        hreflang: locale.hreflang || locale.htmlLang || code,
        pathPrefix: prefix,
        homePath: locale.homePath || (prefix ? prefix + '/index.html' : '/'),
        includeInSitemap: locale.includeInSitemap !== false
    };
}

function sitemapLocaleEntries() {
    return LOCALE_CONFIG.supportedLocales
        .map(localeEntry)
        .filter(function (locale) {
            return locale.includeInSitemap;
        });
}

const SITEMAP_LOCALES = sitemapLocaleEntries();
const DEFAULT_LOCALE = localeEntry(LOCALE_CONFIG.defaultLocale);

function localeForPath(pathname) {
    const normalized = String(pathname || '/');
    const matches = SITEMAP_LOCALES.slice().sort(function (a, b) {
        return b.pathPrefix.length - a.pathPrefix.length;
    });

    for (let i = 0; i < matches.length; i += 1) {
        const locale = matches[i];
        if (normalized === locale.homePath) return locale;
        if (locale.pathPrefix && (normalized === locale.pathPrefix || normalized.indexOf(locale.pathPrefix + '/') === 0)) {
            return locale;
        }
    }

    return DEFAULT_LOCALE;
}

function baseStaticPath(pathname) {
    const normalized = String(pathname || '/');
    const locale = localeForPath(normalized);

    if (normalized === locale.homePath) return '/';
    if (locale.pathPrefix && normalized.indexOf(locale.pathPrefix + '/') === 0) {
        return '/' + normalized.slice(locale.pathPrefix.length + 1);
    }
    return normalized;
}

function localizedStaticPath(basePath, locale) {
    if (basePath === '/') return locale.homePath;
    return locale.pathPrefix + basePath;
}

function localizedProductPath(encodedId, locale) {
    return locale.pathPrefix + '/products/' + encodedId;
}

function alternateLinks(defaultHref, entries) {
    return entries.concat([
        { hreflang: 'x-default', href: defaultHref }
    ]);
}

function staticAlternates(pathname) {
    const basePath = baseStaticPath(pathname);
    const entries = SITEMAP_LOCALES.map(function (locale) {
        return {
            hreflang: locale.hreflang,
            href: buildUrl(localizedStaticPath(basePath, locale))
        };
    });

    return alternateLinks(buildUrl(localizedStaticPath(basePath, DEFAULT_LOCALE)), entries);
}

function productAlternates(encodedId) {
    const entries = SITEMAP_LOCALES.map(function (locale) {
        return {
            hreflang: locale.hreflang,
            href: buildUrl(localizedProductPath(encodedId, locale))
        };
    });

    return alternateLinks(buildUrl(localizedProductPath(encodedId, DEFAULT_LOCALE)), entries);
}

function productPriority(locale) {
    return locale.code === DEFAULT_LOCALE.code ? '0.7' : '0.6';
}

function productPublicId(product) {
    return String(product.slug || product.legacy_id || product.id || '').trim();
}

function readContentBlockUpdatedAt(db) {
    const rows = db.prepare(`
        SELECT slug, updated_at
        FROM content_blocks
        WHERE status = 'published'
    `).all();
    const bySlug = {};
    rows.forEach(function (row) {
        bySlug[row.slug] = row.updated_at;
    });
    return bySlug;
}

function readPublishedProducts(db) {
    return db.prepare(`
        SELECT
            p.id,
            p.legacy_id,
            p.slug,
            p.updated_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.type = 'product'
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
        ORDER BY p.sort_order, p.id
    `).all();
}

function makeEntry(loc, lastmod, changefreq, priority, alternates) {
    const alternateLinks = alternates.map(function (alternate) {
        return '    <xhtml:link rel="alternate" hreflang="' + escapeXml(alternate.hreflang)
            + '" href="' + escapeXml(alternate.href) + '" />';
    });

    return [
        '  <url>',
        '    <loc>' + escapeXml(loc) + '</loc>'
    ].concat(alternateLinks, [
        '    <lastmod>' + escapeXml(lastmod) + '</lastmod>',
        '    <changefreq>' + escapeXml(changefreq) + '</changefreq>',
        '    <priority>' + escapeXml(priority) + '</priority>',
        '  </url>'
    ]).join('\n');
}

function buildSitemap() {
    const db = openReadonlyDb();
    try {
        const contentUpdatedAt = readContentBlockUpdatedAt(db);
        const entries = [];

        STATIC_PAGES.forEach(function (page) {
            const fileMtime = fileLastModified(page.file);
            const lastmodSource = page.block && contentUpdatedAt[page.block]
                ? contentUpdatedAt[page.block]
                : (fileMtime ? fileMtime.getTime() : Date.now());
            entries.push(makeEntry(
                buildUrl(page.path),
                toIsoDate(lastmodSource),
                page.changefreq,
                page.priority,
                staticAlternates(page.path)
            ));
        });

        readPublishedProducts(db).forEach(function (product) {
            const id = productPublicId(product);
            if (!id) return;
            const encodedId = encodeURIComponent(id);
            const lastmod = toIsoDate(product.updated_at);
            SITEMAP_LOCALES.forEach(function (locale) {
                entries.push(makeEntry(
                    buildUrl(localizedProductPath(encodedId, locale)),
                    lastmod,
                    'monthly',
                    productPriority(locale),
                    productAlternates(encodedId)
                ));
            });
        });

        return '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + entries.join('\n')
            + '\n</urlset>\n';
    } finally {
        db.close();
    }
}

function main(argv) {
    const args = Array.isArray(argv) ? argv : process.argv.slice(2);
    const dryRun = args.indexOf('--dry-run') !== -1;
    const xml = buildSitemap();
    const urlCount = (xml.match(/<url>/g) || []).length;

    if (dryRun) {
        console.log('Sitemap dry run (no file written):', OUTPUT_PATH);
        console.log('URL count:', urlCount);
        return;
    }

    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    console.log('Sitemap generated:', OUTPUT_PATH);
    console.log('URL count:', urlCount);
}

if (require.main === module) {
    main();
}

module.exports = {
    buildSitemap,
    main
};
