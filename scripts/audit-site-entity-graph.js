#!/usr/bin/env node
'use strict';

const { chromium } = require('@playwright/test');

const SITE_ORIGIN = 'https://www.lxenelectric.com';
const ORGANIZATION_ID = SITE_ORIGIN + '/#organization';
const WEBSITE_ID = SITE_ORIGIN + '/#website';
const PAGE_TYPES = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage']);
const HIGH_RISK_PRODUCT_FIELDS = new Set([
    'offers', 'price', 'priceCurrency', 'availability', 'review', 'reviews', 'aggregateRating'
]);

function argValue(name, fallback) {
    const index = process.argv.indexOf(name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasArg(name) {
    return process.argv.includes(name);
}

function normalizeBaseUrl(value) {
    const parsed = new URL(value || 'http://127.0.0.1:3000');
    parsed.pathname = '/';
    parsed.search = '';
    parsed.hash = '';
    return parsed.href.replace(/\/$/, '');
}

function parseSitemap(xml) {
    return Array.from(String(xml || '').matchAll(/<loc>(.*?)<\/loc>/gi)).map(function (match) {
        return match[1].replace(/&amp;/g, '&');
    });
}

function mapToBase(url, baseUrl) {
    const parsed = new URL(url);
    return new URL(parsed.pathname + parsed.search, baseUrl + '/').href;
}

function urlMatches(actual, expected, allowOriginMismatch) {
    if (actual === expected) return true;
    if (!allowOriginMismatch || !actual || !expected) return false;
    try {
        const actualUrl = new URL(actual);
        const expectedUrl = new URL(expected);
        return actualUrl.pathname === expectedUrl.pathname
            && actualUrl.search === expectedUrl.search
            && actualUrl.hash === expectedUrl.hash;
    } catch (err) {
        return false;
    }
}

function canonicalFromHtml(html) {
    const tags = Array.from(String(html || '').matchAll(/<link\b[^>]*>/gi));
    for (const match of tags) {
        const tag = match[0];
        if (!/\brel\s*=\s*(["'])canonical\1/i.test(tag)) continue;
        const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
        if (href) return href[2];
    }
    return '';
}

function jsonLdTexts(html) {
    return Array.from(String(html || '').matchAll(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )).map(function (match) { return match[1]; });
}

function definitionNodes(value) {
    const output = [];
    const seen = new Set();
    function visit(candidate) {
        if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) return;
        seen.add(candidate);
        if (Array.isArray(candidate)) {
            candidate.forEach(visit);
            return;
        }
        if (candidate['@type']) output.push(candidate);
        Object.keys(candidate).forEach(function (key) { visit(candidate[key]); });
    }
    visit(value);
    return output;
}

function schemaTypes(node) {
    const type = node && node['@type'];
    if (!type) return [];
    return Array.isArray(type) ? type.map(String) : [String(type)];
}

function hasType(node, type) {
    return schemaTypes(node).includes(type);
}

function findHighRiskFields(value, path, output) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) { findHighRiskFields(item, path + '[' + index + ']', output); });
        return;
    }
    Object.keys(value).forEach(function (key) {
        if (HIGH_RISK_PRODUCT_FIELDS.has(key)) output.push(path + '.' + key);
        findHighRiskFields(value[key], path + '.' + key, output);
    });
}

function findPhoneFields(value, path, output) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) { findPhoneFields(item, path + '[' + index + ']', output); });
        return;
    }
    Object.keys(value).forEach(function (key) {
        const lowerKey = key.toLowerCase();
        const fieldPath = path + '.' + key;
        if (['telephone', 'phone', 'mobile', 'faxnumber'].includes(lowerKey)) output.push(fieldPath);
        if (typeof value[key] === 'string' && /(?:^|["'\s])(tel:|https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/)/i.test(value[key])) {
            output.push(fieldPath);
        }
        findPhoneFields(value[key], fieldPath, output);
    });
}

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce(function (output, key) {
        output[key] = stableValue(value[key]);
        return output;
    }, {});
}

function structuralSignature(analysis) {
    return (analysis.schemas || []).map(function (schema) {
        return JSON.stringify(stableValue(schema));
    }).sort();
}

function expectedPageType(canonicalPath) {
    if (/\/about\.html$/.test(canonicalPath)) return 'AboutPage';
    if (/\/(?:certifications|products)\.html$/.test(canonicalPath)) return 'CollectionPage';
    if (/\/contact\.html$/.test(canonicalPath)) return 'ContactPage';
    return 'WebPage';
}

function expectedPageLanguage(canonicalPath) {
    const match = String(canonicalPath || '').match(/^\/(ar|fr|ru)(?:\/|$)/);
    return match ? match[1] : 'en';
}

function analyzeHtml(mode, requestedUrl, html, failures) {
    const canonical = canonicalFromHtml(html);
    const parsedSchemas = [];
    const parseErrors = [];
    jsonLdTexts(html).forEach(function (text, index) {
        try {
            parsedSchemas.push(JSON.parse(text));
        } catch (err) {
            parseErrors.push({ index, error: err.message });
            failures.push(mode + ' ' + requestedUrl + ' JSON-LD parse error #' + index + ': ' + err.message);
        }
    });
    const nodes = parsedSchemas.flatMap(definitionNodes);
    const organizations = nodes.filter(function (node) { return hasType(node, 'Organization'); });
    const websites = nodes.filter(function (node) { return hasType(node, 'WebSite'); });
    const localBusinesses = nodes.filter(function (node) { return hasType(node, 'LocalBusiness'); });
    const products = nodes.filter(function (node) { return hasType(node, 'Product'); });
    const pages = nodes.filter(function (node) {
        return schemaTypes(node).some(function (type) { return PAGE_TYPES.has(type); });
    });
    const requestedPath = new URL(requestedUrl).pathname;
    const requestedHostname = new URL(requestedUrl).hostname;
    const allowOriginMismatch = requestedHostname === '127.0.0.1' || requestedHostname === 'localhost';
    let canonicalUrl = '';
    try {
        canonicalUrl = canonical ? new URL(canonical, requestedUrl).href : '';
    } catch (err) {
        failures.push(mode + ' ' + requestedUrl + ' invalid canonical: ' + canonical);
    }
    const canonicalPath = canonicalUrl ? new URL(canonicalUrl).pathname : '';
    const isDomainHomeDuplicate = canonicalPath === '/' && (requestedPath === '/' || requestedPath === '/index.html');

    if (!canonicalUrl) failures.push(mode + ' ' + requestedUrl + ' missing canonical');
    if (pages.length !== 1) failures.push(mode + ' ' + requestedUrl + ' page entity count ' + pages.length + ', expected 1');
    if (pages.length === 1 && canonicalUrl) {
        const page = pages[0];
        const expectedPageId = canonicalUrl.replace(/#.*$/, '') + '#webpage';
        const expectedType = expectedPageType(canonicalPath);
        const expectedLanguage = expectedPageLanguage(canonicalPath);
        if (!hasType(page, expectedType)) {
            failures.push(mode + ' ' + requestedUrl + ' page type mismatch: expected ' + expectedType
                + ', got ' + schemaTypes(page).join(','));
        }
        if (page.inLanguage !== expectedLanguage) {
            failures.push(mode + ' ' + requestedUrl + ' page language mismatch: expected ' + expectedLanguage
                + ', got ' + String(page.inLanguage || ''));
        }
        if (!urlMatches(page['@id'], expectedPageId, allowOriginMismatch)) {
            failures.push(mode + ' ' + requestedUrl + ' page @id mismatch: ' + String(page['@id'] || ''));
        }
        if (!urlMatches(page.url, canonicalUrl, allowOriginMismatch)) {
            failures.push(mode + ' ' + requestedUrl + ' page url mismatch: ' + String(page.url || ''));
        }
        if (!page.isPartOf || page.isPartOf['@id'] !== WEBSITE_ID || Object.keys(page.isPartOf).length !== 1) {
            failures.push(mode + ' ' + requestedUrl + ' invalid WebSite reference');
        }
        if (/\/(?:about|contact)\.html$/.test(canonicalPath)) {
            if (!page.about || page.about['@id'] !== ORGANIZATION_ID || Object.keys(page.about).length !== 1) {
                failures.push(mode + ' ' + requestedUrl + ' invalid Organization reference');
            }
        }
        if (/\/contact\.html$/.test(canonicalPath) && !hasType(page, 'ContactPage')) {
            failures.push(mode + ' ' + requestedUrl + ' Contact must use ContactPage');
        }
    }

    if (isDomainHomeDuplicate) {
        if (organizations.length !== 1) failures.push(mode + ' ' + requestedUrl + ' Organization count ' + organizations.length + ', expected 1');
        if (websites.length !== 1) failures.push(mode + ' ' + requestedUrl + ' WebSite count ' + websites.length + ', expected 1');
        const organization = organizations[0];
        const website = websites[0];
        if (organization) {
            if (organization['@id'] !== ORGANIZATION_ID) failures.push(mode + ' ' + requestedUrl + ' Organization @id mismatch');
            if (organization.name !== 'Longxiang Electric') failures.push(mode + ' ' + requestedUrl + ' Organization name mismatch');
            if (organization.legalName !== 'Henan Longxiang Electric Co., Ltd.') failures.push(mode + ' ' + requestedUrl + ' Organization legalName mismatch');
        }
        if (website) {
            if (website['@id'] !== WEBSITE_ID) failures.push(mode + ' ' + requestedUrl + ' WebSite @id mismatch');
            if (website.name !== 'Longxiang Electric') failures.push(mode + ' ' + requestedUrl + ' WebSite name mismatch');
            if (!website.publisher || website.publisher['@id'] !== ORGANIZATION_ID || Object.keys(website.publisher).length !== 1) {
                failures.push(mode + ' ' + requestedUrl + ' invalid WebSite publisher');
            }
        }
    } else {
        if (organizations.length) failures.push(mode + ' ' + requestedUrl + ' redefines Organization');
        if (websites.length) failures.push(mode + ' ' + requestedUrl + ' redefines WebSite');
    }
    if (localBusinesses.length) failures.push(mode + ' ' + requestedUrl + ' defines LocalBusiness');
    if (products.length) failures.push(mode + ' ' + requestedUrl + ' defines Product schema');

    const definitionIds = nodes.map(function (node) { return node['@id']; }).filter(Boolean);
    const duplicateIds = Array.from(new Set(definitionIds.filter(function (id, index) {
        return definitionIds.indexOf(id) !== index;
    })));
    duplicateIds.forEach(function (id) {
        failures.push(mode + ' ' + requestedUrl + ' duplicate definition @id: ' + id);
    });

    const serialized = JSON.stringify(parsedSchemas);
    const normalizedEmailText = serialized.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toLowerCase();
    const normalizedDigits = serialized.replace(/\D/g, '');
    const sensitive = [];
    if (normalizedDigits.includes('17513354200')) sensitive.push('domestic phone');
    if (normalizedEmailText.includes('hnlxdq2003@163.com')) sensitive.push('domestic email');
    if (/whats\s*app|wa\.me\//i.test(serialized)) sensitive.push('WhatsApp');
    if (/100\s*million\s*RMB|100\s*مليون\s*يوان/i.test(serialized)) sensitive.push('legacy registered capital');
    if (/lxelec\.cn/i.test(serialized)) sensitive.push('.cn schema URL');
    if (/https:\/\/www\.lxenelectric\.com\/pt\/|"inLanguage":"pt"/i.test(serialized)) sensitive.push('planned pt');
    const phoneFields = [];
    parsedSchemas.forEach(function (schema, index) {
        findPhoneFields(schema, 'schema[' + index + ']', phoneFields);
    });
    phoneFields.forEach(function (field) { sensitive.push('phone field ' + field); });
    sensitive.forEach(function (finding) {
        failures.push(mode + ' ' + requestedUrl + ' sensitive/schema exposure: ' + finding);
    });

    const highRiskFields = [];
    parsedSchemas.forEach(function (schema, index) {
        findHighRiskFields(schema, 'schema[' + index + ']', highRiskFields);
    });
    highRiskFields.forEach(function (field) {
        failures.push(mode + ' ' + requestedUrl + ' high-risk Product field: ' + field);
    });

    return {
        mode,
        requestedUrl,
        requestedPath,
        canonical: canonicalUrl,
        schemas: parsedSchemas,
        nodes,
        parseErrors,
        organizations: organizations.length,
        websites: websites.length,
        localBusinesses: localBusinesses.length,
        pages: pages.length,
        duplicateIds,
        sensitive,
        highRiskFields,
        phoneFields,
        signature: null
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
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
}

async function inspectRaw(url, failures) {
    let response;
    try {
        response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    } catch (err) {
        failures.push('RAW ' + url + ' load error: ' + err.message);
        return null;
    }
    if (response.status !== 200) {
        failures.push('RAW ' + url + ' status ' + response.status + ', expected 200');
        return null;
    }
    return analyzeHtml('RAW', url, await response.text(), failures);
}

async function inspectRendered(browser, url, failures) {
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.evaluate(() => {
            const promises = [
                window.longxiangContentPagePromise,
                window.longxiangProductDetailPromise,
                window.longxiangProductsListPromise,
                window.longxiangEducationPromise
            ].filter((value) => value && typeof value.then === 'function');
            if (!promises.length) return Promise.resolve();
            return Promise.race([
                Promise.allSettled(promises),
                new Promise((resolve) => setTimeout(resolve, 5000))
            ]);
        });
        await page.waitForTimeout(250);
        const snapshot = await page.evaluate(() => ({
            html: document.documentElement.outerHTML,
            href: window.location.href
        }));
        return analyzeHtml('RENDERED', url, snapshot.html, failures);
    } catch (err) {
        failures.push('RENDERED ' + url + ' load error: ' + err.message);
        return null;
    } finally {
        await page.close();
    }
}

function typeCounts(results) {
    const counts = new Map();
    results.filter(Boolean).forEach(function (result) {
        result.nodes.forEach(function (node) {
            schemaTypes(node).forEach(function (type) {
                counts.set(type, (counts.get(type) || 0) + 1);
            });
        });
    });
    return Object.fromEntries(Array.from(counts.entries()).sort(function (a, b) { return a[0].localeCompare(b[0]); }));
}

async function main() {
    const baseUrl = normalizeBaseUrl(argValue('--base', 'http://127.0.0.1:3000'));
    const expectedCount = Number(argValue('--expected-count', '184'));
    const rawOnly = hasArg('--raw-only');
    const renderedOnly = hasArg('--rendered-only');
    const runRaw = !renderedOnly;
    const runRendered = !rawOnly;
    const failures = [];

    const sitemapResponse = await fetch(baseUrl + '/sitemap.xml', { signal: AbortSignal.timeout(30000) });
    if (!sitemapResponse.ok) throw new Error('Failed to fetch sitemap: ' + sitemapResponse.status);
    const sitemapUrls = parseSitemap(await sitemapResponse.text()).map(function (url) {
        return mapToBase(url, baseUrl);
    });
    if (sitemapUrls.length !== expectedCount) {
        failures.push('Sitemap URL count ' + sitemapUrls.length + ', expected ' + expectedCount);
    }

    const extras = [
        '/index.html', '/ar/', '/fr/', '/ru/',
        '/products.html?group=transformer',
        '/ar/products.html?group=transformer',
        '/fr/products.html?group=transformer',
        '/ru/products.html?group=transformer'
    ].map(function (path) { return new URL(path, baseUrl + '/').href; });
    const auditUrls = Array.from(new Set(sitemapUrls.concat(extras)));

    let rawResults = [];
    let renderedResults = [];
    if (runRaw) rawResults = await mapLimit(auditUrls, 12, function (url) { return inspectRaw(url, failures); });
    if (runRendered) {
        const browser = await chromium.launch({ headless: true });
        try {
            renderedResults = await mapLimit(auditUrls, 6, function (url) { return inspectRendered(browser, url, failures); });
        } finally {
            await browser.close();
        }
    }

    if (runRaw && runRendered) {
        const renderedByUrl = new Map(renderedResults.filter(Boolean).map(function (result) {
            return [result.requestedUrl, result];
        }));
        rawResults.filter(Boolean).forEach(function (raw) {
            const rendered = renderedByUrl.get(raw.requestedUrl);
            if (!rendered) return;
            raw.signature = structuralSignature(raw);
            rendered.signature = structuralSignature(rendered);
            if (JSON.stringify(raw.signature) !== JSON.stringify(rendered.signature)) {
                failures.push('RAW/RENDERED entity mismatch ' + raw.requestedUrl);
            }
        });
    }

    const redirectUrl = new URL('/product-detail.html?id=anti-short-amorphous', baseUrl + '/').href;
    const redirectResponse = await fetch(redirectUrl, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const redirectLocation = redirectResponse.headers.get('location') || '';
    if (redirectResponse.status !== 301 || !/\/products\/anti-short-amorphous$/.test(redirectLocation)) {
        failures.push('Legacy redirect mismatch: status=' + redirectResponse.status + ' location=' + redirectLocation);
    }
    const missingUrl = new URL('/stage2d-entity-graph-missing', baseUrl + '/').href;
    const missingResponse = await fetch(missingUrl, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (missingResponse.status !== 404) failures.push('Missing route status ' + missingResponse.status + ', expected 404');

    const rawValid = rawResults.filter(Boolean);
    const renderedValid = renderedResults.filter(Boolean);
    const countFailures = function (pattern) {
        return failures.filter(function (failure) { return pattern.test(failure); }).length;
    };
    const summary = {
        base: baseUrl,
        sitemapUrlCount: sitemapUrls.length,
        auditedUrlCount: auditUrls.length,
        rawVisited: rawValid.length,
        renderedVisited: renderedValid.length,
        rawTypeCounts: typeCounts(rawValid),
        renderedTypeCounts: typeCounts(renderedValid),
        rawOrganizationDefinitions: rawValid.filter(function (r) { return r.organizations; }).map(function (r) { return r.requestedPath; }),
        rawWebSiteDefinitions: rawValid.filter(function (r) { return r.websites; }).map(function (r) { return r.requestedPath; }),
        renderedOrganizationDefinitions: renderedValid.filter(function (r) { return r.organizations; }).map(function (r) { return r.requestedPath; }),
        renderedWebSiteDefinitions: renderedValid.filter(function (r) { return r.websites; }).map(function (r) { return r.requestedPath; }),
        localBusinessDefinitions: rawValid.reduce(function (sum, r) { return sum + r.localBusinesses; }, 0)
            + renderedValid.reduce(function (sum, r) { return sum + r.localBusinesses; }, 0),
        jsonLdParseErrors: rawValid.reduce(function (sum, r) { return sum + r.parseErrors.length; }, 0)
            + renderedValid.reduce(function (sum, r) { return sum + r.parseErrors.length; }, 0),
        duplicateDefinitionIds: rawValid.reduce(function (sum, r) { return sum + r.duplicateIds.length; }, 0)
            + renderedValid.reduce(function (sum, r) { return sum + r.duplicateIds.length; }, 0),
        missingOrMismatchedPageIds: countFailures(/page @id mismatch|page entity count/),
        invalidIsPartOf: countFailures(/invalid WebSite reference/),
        invalidPublisher: countFailures(/invalid WebSite publisher/),
        pageTypeMismatches: countFailures(/page type mismatch/),
        pageLanguageMismatches: countFailures(/page language mismatch/),
        canonicalEntityMismatches: countFailures(/missing canonical|invalid canonical|page url mismatch|page @id mismatch/),
        rawRenderedEntityMismatches: countFailures(/RAW\/RENDERED entity mismatch/),
        sensitiveFindings: rawValid.reduce(function (sum, r) { return sum + r.sensitive.length; }, 0)
            + renderedValid.reduce(function (sum, r) { return sum + r.sensitive.length; }, 0),
        cnSchemaExposures: countFailures(/\.cn schema URL/),
        plannedPtExposures: countFailures(/planned pt/),
        highRiskProductFields: rawValid.reduce(function (sum, r) { return sum + r.highRiskFields.length; }, 0)
            + renderedValid.reduce(function (sum, r) { return sum + r.highRiskFields.length; }, 0),
        loadErrors: countFailures(/load error/),
        legacyRedirect: { status: redirectResponse.status, location: redirectLocation },
        missingRouteStatus: missingResponse.status,
        failures
    };

    console.log(JSON.stringify(summary, null, 2));
    if (failures.length) process.exitCode = 1;
}

if (require.main === module) {
    main().catch(function (err) {
        console.error(err && err.stack || err);
        process.exitCode = 1;
    });
}

module.exports = {
    analyzeHtml,
    definitionNodes,
    structuralSignature
};
