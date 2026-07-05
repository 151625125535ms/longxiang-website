#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');

const DEFAULT_BASE_URL = 'https://www.lxenelectric.com';
const SUPPORTED_LOCALES = ['en', 'ar', 'fr', 'ru'];
const LOCALE_PREFIX = {
    en: '',
    ar: '/ar',
    fr: '/fr',
    ru: '/ru'
};
const CONTENT_PAGE_REQUIREMENTS = [
    { basePath: '/about.html', type: 'AboutPage', breadcrumb: true },
    { basePath: '/solutions.html', type: 'WebPage', breadcrumb: true },
    { basePath: '/education.html', type: 'WebPage', breadcrumb: true },
    { basePath: '/certifications.html', type: 'CollectionPage', breadcrumb: true },
    { basePath: '/compare.html', type: 'WebPage', breadcrumb: true }
];
const PRODUCT_LIST_REQUIREMENTS = [
    { basePath: '/products.html', type: 'CollectionPage' }
];
const HIGH_RISK_PRODUCT_FIELDS = ['offers', 'review', 'aggregateRating', 'price', 'availability'];

function argValue(name, fallback) {
    const index = process.argv.indexOf(name);
    if (index === -1 || index + 1 >= process.argv.length) return fallback;
    return process.argv[index + 1];
}

function normalizeBaseUrl(value) {
    return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function localizedPath(basePath, locale) {
    const prefix = LOCALE_PREFIX[locale] || '';
    if (basePath === '/') return prefix ? `${prefix}/` : '/';
    return `${prefix}${basePath}`;
}

function normalizePath(pathname) {
    let path = String(pathname || '/').split('?')[0].split('#')[0];
    if (path === '/index.html') return '/';
    return path.replace(/\/index\.html$/i, '/');
}

function parseSitemap(xml) {
    return Array.from(String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/g))
        .map((match) => match[1].trim())
        .filter(Boolean);
}

function schemaObjects(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(schemaObjects);
    if (typeof value !== 'object') return [];
    const current = [value];
    if (Array.isArray(value['@graph'])) current.push(...value['@graph'].flatMap(schemaObjects));
    return current;
}

function schemaTypes(schema) {
    const type = schema && schema['@type'];
    if (!type) return [];
    return Array.isArray(type) ? type : [type];
}

function hasSchemaType(schemas, type) {
    return schemas.some((schema) => schemaTypes(schema).includes(type));
}

function firstSchemaByType(schemas, type) {
    return schemas.find((schema) => schemaTypes(schema).includes(type)) || null;
}

function languageForPath(pathname) {
    if (pathname.startsWith('/ar/')) return 'ar';
    if (pathname.startsWith('/fr/')) return 'fr';
    if (pathname.startsWith('/ru/')) return 'ru';
    return 'en';
}

function schemaUrlMatchesCanonical(schemaUrl, canonicalUrl, allowOriginMismatch) {
    if (!schemaUrl || schemaUrl === canonicalUrl) return true;
    if (!allowOriginMismatch) return false;
    try {
        const schemaParsed = new URL(schemaUrl);
        const canonicalParsed = new URL(canonicalUrl);
        return schemaParsed.pathname === canonicalParsed.pathname && schemaParsed.search === canonicalParsed.search;
    } catch (err) {
        return false;
    }
}

function expectedRequirements() {
    const requirements = [];
    for (const locale of SUPPORTED_LOCALES) {
        for (const item of CONTENT_PAGE_REQUIREMENTS) {
            requirements.push({
                path: localizedPath(item.basePath, locale),
                locale,
                type: item.type,
                breadcrumb: item.breadcrumb
            });
        }
        for (const item of PRODUCT_LIST_REQUIREMENTS) {
            requirements.push({
                path: localizedPath(item.basePath, locale),
                locale,
                type: item.type,
                breadcrumb: false
            });
        }
    }
    return requirements;
}

async function inspectUrl(browser, url) {
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.evaluate(() => {
            const candidates = [
                window.longxiangContentPagePromise,
                window.longxiangProductDetailPromise,
                window.longxiangProductsListPromise,
                window.longxiangEducationPromise
            ].filter((value) => value && typeof value.then === 'function');
            if (!candidates.length) return Promise.resolve();
            return Promise.race([
                Promise.allSettled(candidates),
                new Promise((resolve) => setTimeout(resolve, 6000))
            ]);
        });
        await page.waitForTimeout(2000);
        return await page.evaluate(() => ({
            href: window.location.href,
            canonical: document.querySelector('link[rel="canonical"]')?.href || '',
            robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
            lang: document.documentElement.getAttribute('lang') || '',
            jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node, index) => ({
                index,
                auto: node.getAttribute('data-schema-auto') || '',
                text: node.textContent || ''
            })),
            microdataCount: document.querySelectorAll('[itemscope]').length,
            rdfaCount: document.querySelectorAll('[typeof], [property], [vocab]').length
        }));
    } finally {
        await page.close();
    }
}

async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function run() {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: limit }, run));
    return results;
}

async function main() {
    const baseUrl = normalizeBaseUrl(argValue('--base', DEFAULT_BASE_URL));
    const baseHostname = new URL(baseUrl).hostname;
    const allowOriginMismatch = baseHostname === '127.0.0.1' || baseHostname === 'localhost';
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const sitemapResponse = await fetch(sitemapUrl);
    if (!sitemapResponse.ok) {
        throw new Error(`Failed to fetch sitemap: ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }
    const sitemapXml = await sitemapResponse.text();
    const urls = parseSitemap(sitemapXml).map((url) => {
        const parsed = new URL(url);
        return new URL(parsed.pathname + parsed.search + parsed.hash, `${baseUrl}/`).href;
    });
    const ptUrls = urls.filter((url) => /\/pt(\/|$)/.test(new URL(url).pathname));

    const browser = await chromium.launch({ headless: true });
    const parseErrors = [];
    const loadErrors = [];
    const ptSchemaExposures = [];
    const highRiskProductFields = [];
    const schemaTypeCounts = new Map();
    const pageResults = [];

    try {
        await mapLimit(urls, 4, async (url) => {
            let inspection;
            try {
                inspection = await inspectUrl(browser, url);
            } catch (err) {
                loadErrors.push({ url, error: err.message });
                return;
            }
            const parsedSchemas = [];
            inspection.jsonLd.forEach((entry) => {
                const text = String(entry.text || '').trim();
                if (!text) return;
                try {
                    parsedSchemas.push(...schemaObjects(JSON.parse(text)));
                } catch (err) {
                    parseErrors.push({ url, index: entry.index, error: err.message });
                }
            });
            parsedSchemas.forEach((schema) => {
                schemaTypes(schema).forEach((type) => {
                    schemaTypeCounts.set(type, (schemaTypeCounts.get(type) || 0) + 1);
                });
                if (schemaTypes(schema).includes('Product')) {
                    HIGH_RISK_PRODUCT_FIELDS.forEach((field) => {
                        if (Object.prototype.hasOwnProperty.call(schema, field)) {
                            highRiskProductFields.push({ url, field });
                        }
                    });
                }
                const raw = JSON.stringify(schema);
                if (schema.inLanguage === 'pt' || raw.includes('https://www.lxenelectric.com/pt/') || raw.includes('"/pt/')) {
                    ptSchemaExposures.push({ url, type: schemaTypes(schema).join(',') || 'unknown' });
                }
            });
            pageResults.push({
                url,
                path: normalizePath(new URL(url).pathname),
                canonical: inspection.canonical,
                lang: inspection.lang,
                schemas: parsedSchemas,
                schemaTypes: Array.from(new Set(parsedSchemas.flatMap(schemaTypes))),
                microdataCount: inspection.microdataCount,
                rdfaCount: inspection.rdfaCount
            });
        });
    } finally {
        await browser.close();
    }

    const resultByPath = new Map(pageResults.map((item) => [item.path, item]));
    const missingRequiredSchemas = [];
    const schemaMismatches = [];

    expectedRequirements().forEach((requirement) => {
        const result = resultByPath.get(requirement.path);
        if (!result) {
            missingRequiredSchemas.push({ path: requirement.path, reason: 'not in sitemap results' });
            return;
        }
        const schema = firstSchemaByType(result.schemas, requirement.type);
        if (!schema) {
            missingRequiredSchemas.push({ path: requirement.path, expectedType: requirement.type });
            return;
        }
        if (schema.url && !schemaUrlMatchesCanonical(schema.url, result.canonical, allowOriginMismatch)) {
            schemaMismatches.push({ path: requirement.path, field: 'url', expected: result.canonical, actual: schema.url });
        }
        const expectedLanguage = languageForPath(requirement.path);
        if (schema.inLanguage && schema.inLanguage !== expectedLanguage) {
            schemaMismatches.push({ path: requirement.path, field: 'inLanguage', expected: expectedLanguage, actual: schema.inLanguage });
        }
        if (requirement.breadcrumb && !hasSchemaType(result.schemas, 'BreadcrumbList')) {
            missingRequiredSchemas.push({ path: requirement.path, expectedType: 'BreadcrumbList' });
        }
    });

    const typeSummary = Array.from(schemaTypeCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');

    console.log(`Schema audit base: ${baseUrl}`);
    console.log(`Sitemap URL count: ${urls.length}`);
    console.log(`Visited URL count: ${pageResults.length}`);
    console.log(`Schema types: ${typeSummary || 'none'}`);
    console.log(`Missing required schemas: ${missingRequiredSchemas.length}`);
    console.log(`Schema mismatches: ${schemaMismatches.length}`);
    console.log(`JSON-LD parse errors: ${parseErrors.length}`);
    console.log(`Load errors: ${loadErrors.length}`);
    console.log(`Product high-risk fields: ${highRiskProductFields.length}`);
    console.log(`pt URLs in sitemap: ${ptUrls.length}`);
    console.log(`pt schema exposures: ${ptSchemaExposures.length}`);

    const failures = [
        ...loadErrors.map((item) => `LOAD ${item.url}: ${item.error}`),
        ...parseErrors.map((item) => `PARSE ${item.url} #${item.index}: ${item.error}`),
        ...missingRequiredSchemas.map((item) => `MISSING ${item.path}: ${item.expectedType || item.reason}`),
        ...schemaMismatches.map((item) => `MISMATCH ${item.path} ${item.field}: expected ${item.expected}, got ${item.actual}`),
        ...highRiskProductFields.map((item) => `HIGH_RISK_PRODUCT_FIELD ${item.url}: ${item.field}`),
        ...ptUrls.map((url) => `PT_SITEMAP_URL ${url}`),
        ...ptSchemaExposures.map((item) => `PT_SCHEMA ${item.url}: ${item.type}`)
    ];

    if (failures.length) {
        console.error(failures.join('\n'));
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
