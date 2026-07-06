#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');

const DEFAULT_BASE_URL = 'https://www.lxenelectric.com';
const PRODUCT_PATH_PATTERN = /^\/(?:ar\/|fr\/|ru\/)?products\/[^/?#]+\/?$/;
const REQUIRED_HREFLANGS = ['en', 'ar', 'fr', 'ru', 'x-default'];
const HIGH_RISK_PRODUCT_FIELDS = ['offers', 'price', 'availability', 'review', 'aggregateRating'];

function argValue(name, fallback) {
    const index = process.argv.indexOf(name);
    if (index === -1 || index + 1 >= process.argv.length) return fallback;
    return process.argv[index + 1];
}

function hasFlag(name) {
    return process.argv.indexOf(name) !== -1;
}

function normalizeBaseUrl(value) {
    return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function parseSitemap(xml) {
    return Array.from(String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/g))
        .map((match) => match[1].trim())
        .filter(Boolean);
}

function mapUrlToBase(url, baseUrl) {
    const parsed = new URL(url);
    return new URL(parsed.pathname + parsed.search + parsed.hash, baseUrl + '/').href;
}

function normalizeUrl(value, baseUrl) {
    if (!value) return '';
    try {
        return new URL(value, baseUrl).href;
    } catch (err) {
        return String(value || '').trim();
    }
}

function firstMatch(source, pattern) {
    const match = String(source || '').match(pattern);
    return match ? match[1].trim() : '';
}

function parseAttributes(tag) {
    const attrs = {};
    String(tag || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g, function (_, name, __, value) {
        attrs[name.toLowerCase()] = value;
        return '';
    });
    return attrs;
}

function rawHeadLinks(html, rel) {
    return Array.from(String(html || '').matchAll(/<link\b[^>]*>/gi))
        .map((match) => parseAttributes(match[0]))
        .filter((attrs) => String(attrs.rel || '').toLowerCase() === rel);
}

function rawMetaContent(html, name) {
    const metas = Array.from(String(html || '').matchAll(/<meta\b[^>]*>/gi)).map((match) => parseAttributes(match[0]));
    const lower = String(name || '').toLowerCase();
    const found = metas.find((attrs) => String(attrs.name || '').toLowerCase() === lower || String(attrs.property || '').toLowerCase() === lower);
    return found ? String(found.content || '') : '';
}

function jsonLdEntriesFromHtml(html) {
    return Array.from(String(html || '').matchAll(/<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi))
        .map((match, index) => {
            const attrs = Object.assign({}, parseAttributes(match[1]), parseAttributes(match[2]));
            return {
                index,
                auto: attrs['data-schema-auto'] || '',
                text: match[3] || ''
            };
        });
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

function firstSchemaByType(schemas, type) {
    return schemas.find((schema) => schemaTypes(schema).indexOf(type) !== -1) || null;
}

function parseJsonLd(entries, url, failures, scope) {
    const parsed = [];
    entries.forEach((entry) => {
        const text = String(entry.text || '').trim();
        if (!text) return;
        try {
            parsed.push(...schemaObjects(JSON.parse(text)));
        } catch (err) {
            failures.push({
                severity: 'Critical',
                code: scope + '_JSON_LD_PARSE',
                url,
                detail: '#' + entry.index + ' ' + err.message
            });
        }
    });
    return parsed;
}

function hrefMap(links, baseUrl) {
    return links.reduce((acc, attrs) => {
        const lang = String(attrs.hreflang || '').toLowerCase();
        if (!lang) return acc;
        acc[lang] = normalizeUrl(attrs.href, baseUrl);
        return acc;
    }, {});
}

function productHighRiskFields(schema) {
    if (!schema || typeof schema !== 'object') return [];
    return HIGH_RISK_PRODUCT_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(schema, field));
}

function containsPtExposure(value) {
    const text = JSON.stringify(value || '');
    return /hreflang=["']pt["']/i.test(text)
        || /\/pt(?:\/|["'?#<])/i.test(text)
        || /"inLanguage"\s*:\s*"pt"/i.test(text);
}

function inspectRawHtml(url, html) {
    const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const canonicalLinks = rawHeadLinks(html, 'canonical');
    const alternateLinks = rawHeadLinks(html, 'alternate');
    const jsonLdEntries = jsonLdEntriesFromHtml(html);
    const failures = [];
    const schemas = parseJsonLd(jsonLdEntries, url, failures, 'RAW');
    const pageSchema = firstSchemaByType(schemas, 'WebPage');
    const productSchema = firstSchemaByType(schemas, 'Product');
    const breadcrumbSchema = firstSchemaByType(schemas, 'BreadcrumbList');
    const canonical = canonicalLinks[0] ? normalizeUrl(canonicalLinks[0].href, url) : '';
    const alternates = hrefMap(alternateLinks, url);

    if (!title) failures.push({ severity: 'Important', code: 'RAW_MISSING_TITLE', url });
    if (!rawMetaContent(html, 'description')) failures.push({ severity: 'Important', code: 'RAW_MISSING_DESCRIPTION', url });
    if (canonicalLinks.length !== 1) failures.push({ severity: 'Critical', code: 'RAW_CANONICAL_COUNT', url, detail: String(canonicalLinks.length) });
    if (canonical && canonical !== url) failures.push({ severity: 'Important', code: 'RAW_CANONICAL_MISMATCH', url, detail: canonical });
    REQUIRED_HREFLANGS.forEach((lang) => {
        if (!alternates[lang]) failures.push({ severity: 'Critical', code: 'RAW_MISSING_HREFLANG', url, detail: lang });
    });
    if (!pageSchema) failures.push({ severity: 'Critical', code: 'RAW_MISSING_WEBPAGE_SCHEMA', url });
    if (!breadcrumbSchema) failures.push({ severity: 'Critical', code: 'RAW_MISSING_BREADCRUMB_SCHEMA', url });
    if (pageSchema && pageSchema.url && normalizeUrl(pageSchema.url, url) !== canonical) {
        failures.push({ severity: 'Important', code: 'RAW_WEBPAGE_SCHEMA_URL_MISMATCH', url, detail: pageSchema.url });
    }
    if (productSchema) {
        failures.push({ severity: 'Critical', code: 'RAW_PRODUCT_SCHEMA_EXPOSED', url });
        productHighRiskFields(productSchema).forEach((field) => {
            failures.push({ severity: 'Critical', code: 'RAW_PRODUCT_HIGH_RISK_FIELD', url, detail: field });
        });
    }
    if (containsPtExposure({ canonical, alternates, schemas })) {
        failures.push({ severity: 'Critical', code: 'RAW_PT_EXPOSURE', url });
    }

    return {
        title,
        description: rawMetaContent(html, 'description'),
        canonical,
        alternates,
        pageSchema: Boolean(pageSchema),
        productSchema: Boolean(productSchema),
        breadcrumbSchema: Boolean(breadcrumbSchema),
        failures
    };
}

async function inspectRendered(browser, url, raw) {
    const page = await browser.newPage();
    try {
        const productMatch = new URL(url).pathname.match(/\/products\/([^/]+)\/?$/);
        const productId = productMatch ? productMatch[1] : '';
        const productResponse = productId
            ? page.waitForResponse((response) => {
                try {
                    const parsed = new URL(response.url());
                    return parsed.pathname === '/api/products/' + productId && response.ok();
                } catch (err) {
                    return false;
                }
            }, { timeout: 15000 }).catch(() => null)
            : Promise.resolve(null);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await productResponse;
        await page.evaluate(() => {
            const candidates = [
                window.longxiangContentPagePromise,
                window.longxiangProductDetailPromise,
                window.longxiangProductsListPromise
            ].filter((value) => value && typeof value.then === 'function');
            if (!candidates.length) return Promise.resolve();
            return Promise.race([
                Promise.allSettled(candidates),
                new Promise((resolve) => setTimeout(resolve, 8000))
            ]);
        });
        await page.waitForFunction(() => {
            const h1 = document.querySelector('h1');
            const pageSchema = document.querySelector('script[data-schema-auto="product-page"]');
            let schemaName = '';
            try {
                schemaName = pageSchema ? String(JSON.parse(pageSchema.textContent || '{}').name || '').trim() : '';
            } catch (err) {
                schemaName = '';
            }
            const h1Text = h1 && h1.textContent ? h1.textContent.trim() : '';
            return Boolean(
                h1Text
                && schemaName
                && h1Text === schemaName
                && document.querySelector('script[data-schema-auto="product-breadcrumb"]')
            );
        }, null, { timeout: 10000 }).catch(() => {});
        if (raw && raw.canonical) {
            await page.waitForFunction((expected) => {
                const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
                const alternates = {};
                Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).forEach((node) => {
                    alternates[String(node.getAttribute('hreflang') || '').toLowerCase()] = node.href || '';
                });
                return canonical === expected.canonical
                    && Object.keys(expected.alternates || {}).every((lang) => alternates[lang] === expected.alternates[lang]);
            }, {
                canonical: raw.canonical,
                alternates: raw.alternates || {}
            }, { timeout: 10000 }).catch(() => {});
        }
        await page.waitForTimeout(1500);
        return await page.evaluate(() => ({
            title: document.title || '',
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            h1: document.querySelector('h1')?.textContent?.trim() || '',
            canonical: document.querySelector('link[rel="canonical"]')?.href || '',
            alternates: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((node) => ({
                hreflang: node.getAttribute('hreflang') || '',
                href: node.href || ''
            })),
            robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
            lang: document.documentElement.getAttribute('lang') || '',
            jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node, index) => ({
                index,
                auto: node.getAttribute('data-schema-auto') || '',
                text: node.textContent || ''
            }))
        }));
    } finally {
        await page.close();
    }
}

function inspectRenderedResult(url, raw, rendered) {
    const failures = [];
    const schemas = parseJsonLd(rendered.jsonLd || [], url, failures, 'RENDERED');
    const pageSchema = firstSchemaByType(schemas, 'WebPage');
    const productSchema = firstSchemaByType(schemas, 'Product');
    const breadcrumbSchema = firstSchemaByType(schemas, 'BreadcrumbList');
    const alternates = hrefMap(rendered.alternates || [], url);
    const canonical = normalizeUrl(rendered.canonical, url);

    if (!rendered.title) failures.push({ severity: 'Important', code: 'RENDERED_MISSING_TITLE', url });
    if (!rendered.description) failures.push({ severity: 'Important', code: 'RENDERED_MISSING_DESCRIPTION', url });
    // H1 is a visible-page signal and can be verified by browser spot checks.
    // This script is a hard gate for raw/rendered SEO tags and structured data.
    if (!canonical) failures.push({ severity: 'Critical', code: 'RENDERED_MISSING_CANONICAL', url });
    if (canonical && raw.canonical && canonical !== raw.canonical) {
        failures.push({ severity: 'Important', code: 'RAW_RENDERED_CANONICAL_MISMATCH', url, detail: canonical + ' != ' + raw.canonical });
    }
    REQUIRED_HREFLANGS.forEach((lang) => {
        if (!alternates[lang]) failures.push({ severity: 'Critical', code: 'RENDERED_MISSING_HREFLANG', url, detail: lang });
        if (raw.alternates[lang] && alternates[lang] && raw.alternates[lang] !== alternates[lang]) {
            failures.push({ severity: 'Important', code: 'RAW_RENDERED_HREFLANG_MISMATCH', url, detail: lang });
        }
    });
    if (!pageSchema) failures.push({ severity: 'Critical', code: 'RENDERED_MISSING_WEBPAGE_SCHEMA', url });
    if (!breadcrumbSchema) failures.push({ severity: 'Critical', code: 'RENDERED_MISSING_BREADCRUMB_SCHEMA', url });
    if (pageSchema && pageSchema.url && normalizeUrl(pageSchema.url, url) !== canonical) {
        failures.push({ severity: 'Important', code: 'RENDERED_WEBPAGE_SCHEMA_URL_MISMATCH', url, detail: pageSchema.url });
    }
    if (productSchema) {
        failures.push({ severity: 'Critical', code: 'RENDERED_PRODUCT_SCHEMA_EXPOSED', url });
        productHighRiskFields(productSchema).forEach((field) => {
            failures.push({ severity: 'Critical', code: 'RENDERED_PRODUCT_HIGH_RISK_FIELD', url, detail: field });
        });
    }
    if (containsPtExposure({ canonical, alternates, schemas })) {
        failures.push({ severity: 'Critical', code: 'RENDERED_PT_EXPOSURE', url });
    }

    return {
        title: rendered.title,
        description: rendered.description,
        h1: rendered.h1,
        canonical,
        alternates,
        pageSchema: Boolean(pageSchema),
        productSchema: Boolean(productSchema),
        breadcrumbSchema: Boolean(breadcrumbSchema),
        failures
    };
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
    const expectedCount = Number(argValue('--expected-count', 152));
    const jsonPath = argValue('--json', '');
    const renderedOnly = hasFlag('--rendered-only');
    const sitemapResponse = await fetch(baseUrl + '/sitemap.xml');
    if (!sitemapResponse.ok) throw new Error('Failed to fetch sitemap: ' + sitemapResponse.status);
    const sitemapXml = await sitemapResponse.text();
    const urls = parseSitemap(sitemapXml)
        .map((url) => mapUrlToBase(url, baseUrl))
        .filter((url) => PRODUCT_PATH_PATTERN.test(new URL(url).pathname));

    const failures = [];
    if (expectedCount && urls.length !== expectedCount) {
        failures.push({ severity: 'Critical', code: 'PRODUCT_DETAIL_URL_COUNT', detail: String(urls.length) });
    }

    const browser = await chromium.launch({ headless: true });
    const results = [];
    try {
        await mapLimit(urls, 4, async (url) => {
            const pageResult = { url, raw: null, rendered: null, failures: [] };
            try {
                const response = await fetch(url);
                const html = await response.text();
                if (!response.ok) {
                    pageResult.failures.push({ severity: 'Critical', code: 'RAW_STATUS', url, detail: String(response.status) });
                }
                pageResult.raw = inspectRawHtml(url, html);
                pageResult.failures.push(...pageResult.raw.failures);
            } catch (err) {
                pageResult.failures.push({ severity: 'Critical', code: 'RAW_FETCH_ERROR', url, detail: err.message });
            }

            if (!renderedOnly) {
                try {
                    const rendered = await inspectRendered(browser, url, pageResult.raw);
                    pageResult.rendered = inspectRenderedResult(url, pageResult.raw || { canonical: '', alternates: {} }, rendered);
                    pageResult.failures.push(...pageResult.rendered.failures);
                } catch (err) {
                    pageResult.failures.push({ severity: 'Critical', code: 'RENDERED_LOAD_ERROR', url, detail: err.message });
                }
            }
            results.push(pageResult);
        });
    } finally {
        await browser.close();
    }

    results.forEach((item) => failures.push(...item.failures));

    const summary = {
        baseUrl,
        productDetailUrlCount: urls.length,
        expectedCount,
        rawWebPageSchemaCount: results.filter((item) => item.raw && item.raw.pageSchema).length,
        rawProductSchemaCount: results.filter((item) => item.raw && item.raw.productSchema).length,
        rawBreadcrumbSchemaCount: results.filter((item) => item.raw && item.raw.breadcrumbSchema).length,
        rawCanonicalCount: results.filter((item) => item.raw && item.raw.canonical).length,
        rawHreflangCompleteCount: results.filter((item) => item.raw && REQUIRED_HREFLANGS.every((lang) => item.raw.alternates[lang])).length,
        renderedWebPageSchemaCount: results.filter((item) => item.rendered && item.rendered.pageSchema).length,
        renderedProductSchemaCount: results.filter((item) => item.rendered && item.rendered.productSchema).length,
        renderedBreadcrumbSchemaCount: results.filter((item) => item.rendered && item.rendered.breadcrumbSchema).length,
        renderedCanonicalCount: results.filter((item) => item.rendered && item.rendered.canonical).length,
        renderedHreflangCompleteCount: results.filter((item) => item.rendered && REQUIRED_HREFLANGS.every((lang) => item.rendered.alternates[lang])).length,
        failureCount: failures.length
    };

    console.log('Product detail raw SEO audit base: ' + baseUrl);
    console.log('Product detail URL count: ' + summary.productDetailUrlCount);
    console.log('Raw canonical: ' + summary.rawCanonicalCount + '/' + summary.productDetailUrlCount);
    console.log('Raw complete hreflang: ' + summary.rawHreflangCompleteCount + '/' + summary.productDetailUrlCount);
    console.log('Raw WebPage Schema: ' + summary.rawWebPageSchemaCount + '/' + summary.productDetailUrlCount);
    console.log('Raw Product Schema exposures: ' + summary.rawProductSchemaCount);
    console.log('Raw BreadcrumbList: ' + summary.rawBreadcrumbSchemaCount + '/' + summary.productDetailUrlCount);
    console.log('Rendered WebPage Schema: ' + summary.renderedWebPageSchemaCount + '/' + summary.productDetailUrlCount);
    console.log('Rendered Product Schema exposures: ' + summary.renderedProductSchemaCount);
    console.log('Rendered BreadcrumbList: ' + summary.renderedBreadcrumbSchemaCount + '/' + summary.productDetailUrlCount);
    console.log('Failures: ' + failures.length);

    if (jsonPath) {
        const fs = require('fs');
        fs.writeFileSync(jsonPath, JSON.stringify({ summary, failures, results }, null, 2));
    }

    if (failures.length) {
        failures.slice(0, 80).forEach((failure) => {
            console.error([failure.code, failure.url || '', failure.detail || ''].filter(Boolean).join(' | '));
        });
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
