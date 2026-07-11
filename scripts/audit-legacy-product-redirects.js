#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { localeEntries } = require('../server/lib/i18nRoutes');
const { APPROVED_LEGACY_ALIAS_REDIRECTS } = require('../server/lib/legacyProductRedirect');

function optionValue(name, fallback) {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
}

const BASE = String(optionValue('--base', 'http://127.0.0.1:3000')).replace(/\/+$/, '');
const BASE_URL = new URL(BASE + '/');
const CONCURRENCY = Math.max(1, Number(optionValue('--concurrency', '8')) || 8);
const EXPECTED_CONFLICTS = ['3phase-3limb', '3phase-5limb'];

function publicIdentifier(product) {
    return String(product && (product.slug || product.id) || '').trim();
}

function inventory(products) {
    const direct = new Set();
    products.forEach(function (product) {
        [product.id, product.slug].filter(Boolean).forEach(function (identifier) {
            direct.add(identifier);
        });
    });

    const aliasRows = [];
    products.forEach(function (product) {
        (product.aliases || []).forEach(function (alias) {
            aliasRows.push({ alias, target: publicIdentifier(product) });
        });
    });

    const byAlias = new Map();
    aliasRows.forEach(function (row) {
        if (!byAlias.has(row.alias)) byAlias.set(row.alias, new Set());
        byAlias.get(row.alias).add(row.target);
    });

    const safe = [];
    const conflicts = [];
    byAlias.forEach(function (targets, alias) {
        if (targets.size === 1 && !direct.has(alias)) safe.push([alias, Array.from(targets)[0]]);
        else conflicts.push(alias);
    });

    return {
        products: products.length,
        aliasRecords: aliasRows.length,
        safeAliasMap: safe.sort(function (left, right) { return left[0].localeCompare(right[0]); }),
        conflicts: conflicts.sort()
    };
}

function localizedOldPath(locale) {
    return locale.pathPrefix + '/product-detail.html';
}

function localizedCleanPath(locale, identifier) {
    return locale.pathPrefix + '/products/' + encodeURIComponent(identifier);
}

function oldUrl(locale, identifier, extraQuery) {
    const query = identifier == null ? '' : '?id=' + encodeURIComponent(identifier);
    return BASE + localizedOldPath(locale) + query + (extraQuery || '');
}

async function responseWithBody(url, method) {
    const response = await fetch(url, {
        method: method || 'GET',
        redirect: 'manual',
        headers: { 'user-agent': 'Longxiang-Stage2B-Audit/1.0' }
    });
    const body = method === 'HEAD' ? '' : await response.text();
    return { response, body };
}

function cleanLocation(response, expectedPath, label) {
    assert.strictEqual(response.status, 301, label + ' status must be 301');
    const location = response.headers.get('location') || '';
    assert(location, label + ' must include Location');
    const resolved = new URL(location, BASE_URL);
    assert.strictEqual(resolved.origin, BASE_URL.origin, label + ' must not redirect off-site');
    assert.strictEqual(resolved.pathname, expectedPath, label + ' target path mismatch');
    assert.strictEqual(resolved.search, '', label + ' target must not retain query');
    assert.strictEqual(resolved.hash, '', label + ' target must not retain fragment');
    return location;
}

async function verifyRedirect(testCase) {
    const url = oldUrl(testCase.locale, testCase.source, '&utm_source=legacy&gclid=test');
    const getResult = await responseWithBody(url, 'GET');
    const getLocation = cleanLocation(getResult.response, testCase.expectedPath, testCase.label + ' GET');
    const headResult = await responseWithBody(url, 'HEAD');
    const headLocation = cleanLocation(headResult.response, testCase.expectedPath, testCase.label + ' HEAD');
    assert.strictEqual(new URL(headLocation, BASE_URL).href, new URL(getLocation, BASE_URL).href,
        testCase.label + ' GET and HEAD Location mismatch');
}

async function runPool(items, worker) {
    let index = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, items.length || 1) }, async function () {
        while (index < items.length) {
            const current = items[index];
            index += 1;
            await worker(current);
        }
    });
    await Promise.all(workers);
}

async function verifyInvalid(locale, suffix, label) {
    const url = BASE + localizedOldPath(locale) + suffix;
    const getResult = await responseWithBody(url, 'GET');
    assert.strictEqual(getResult.response.status, 404, label + ' GET must be 404');
    assert(/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']/i.test(getResult.body),
        label + ' must return the noindex 404 shell');
    const headResult = await responseWithBody(url, 'HEAD');
    assert.strictEqual(headResult.response.status, 404, label + ' HEAD must be 404');
    assert.strictEqual(headResult.response.headers.get('location'), null, label + ' must not redirect');
}

async function main() {
    const productsResponse = await fetch(BASE + '/api/products', {
        headers: { 'user-agent': 'Longxiang-Stage2B-Audit/1.0' }
    });
    assert(productsResponse.ok, 'public product API status must be 200, got ' + productsResponse.status);
    const productsBody = await productsResponse.json();
    const products = Array.isArray(productsBody)
        ? productsBody
        : (Array.isArray(productsBody && productsBody.data)
            ? productsBody.data
            : (productsBody && productsBody.data && Array.isArray(productsBody.data.items)
                ? productsBody.data.items
                : (Array.isArray(productsBody && productsBody.items) ? productsBody.items : [])));
    const localeList = localeEntries().filter(function (locale) {
        return locale.includeInSitemap;
    });
    const currentInventory = inventory(products);

    assert.strictEqual(products.length, 38, 'product preflight count changed');
    assert.deepStrictEqual(localeList.map(function (locale) { return locale.code; }), ['en', 'ar', 'fr', 'ru'],
        'legacy redirect audit locale set must remain en/ar/fr/ru');
    assert.strictEqual(currentInventory.aliasRecords, 30, 'alias record preflight count changed');
    assert.strictEqual(currentInventory.safeAliasMap.length, 28, 'safe alias preflight count changed');
    assert.deepStrictEqual(currentInventory.conflicts, EXPECTED_CONFLICTS, 'alias conflict preflight changed');
    assert.deepStrictEqual(
        currentInventory.safeAliasMap,
        Object.entries(APPROVED_LEGACY_ALIAS_REDIRECTS)
            .sort(function (left, right) { return left[0].localeCompare(right[0]); }),
        'approved alias whitelist targets differ from current reviewed safe alias mappings'
    );

    const cases = [];
    products.forEach(function (product) {
        localeList.forEach(function (locale) {
            const target = publicIdentifier(product);
            cases.push({
                kind: 'legacy_id',
                locale,
                source: product.id,
                expectedPath: localizedCleanPath(locale, target),
                label: locale.code + ' legacy_id ' + product.id
            });
            cases.push({
                kind: 'slug',
                locale,
                source: product.slug,
                expectedPath: localizedCleanPath(locale, target),
                label: locale.code + ' slug ' + product.slug
            });
        });
    });

    Object.entries(APPROVED_LEGACY_ALIAS_REDIRECTS).forEach(function ([alias, target]) {
        localeList.forEach(function (locale) {
            cases.push({
                kind: 'approved_alias',
                locale,
                source: alias,
                expectedPath: localizedCleanPath(locale, target),
                label: locale.code + ' approved alias ' + alias
            });
        });
    });

    EXPECTED_CONFLICTS.forEach(function (identifier) {
        localeList.forEach(function (locale) {
            cases.push({
                kind: 'conflict',
                locale,
                source: identifier,
                expectedPath: localizedCleanPath(locale, identifier),
                label: locale.code + ' direct-over-alias conflict ' + identifier
            });
        });
    });

    await runPool(cases, verifyRedirect);

    const invalidSuffixes = [
        { suffix: '', label: 'missing id' },
        { suffix: '?id=', label: 'empty id' },
        { suffix: '?id=s13&id=SCBH15', label: 'duplicate id' },
        { suffix: '?id%5B%5D=s13', label: 'array id' },
        { suffix: '?id=unknown-product', label: 'unknown id' },
        { suffix: '?id=%20s13', label: 'leading whitespace id' },
        { suffix: '?id=%E0%A4%A', label: 'malformed encoding id' }
    ];
    const invalidCases = [];
    localeList.forEach(function (locale) {
        invalidSuffixes.forEach(function (item) {
            invalidCases.push({ locale, suffix: item.suffix, label: locale.code + ' ' + item.label });
        });
    });
    await runPool(invalidCases, function (item) {
        return verifyInvalid(item.locale, item.suffix, item.label);
    });

    const targetPaths = Array.from(new Set(cases.map(function (testCase) {
        return testCase.expectedPath;
    })));
    await runPool(targetPaths, async function (targetPath) {
        const target = await responseWithBody(BASE + targetPath, 'HEAD');
        assert.strictEqual(target.response.status, 200, targetPath + ' clean target must return 200 without a redirect chain');
        assert.strictEqual(target.response.headers.get('location'), null, targetPath + ' clean target must not redirect');
    });

    const counts = cases.reduce(function (acc, item) {
        acc[item.kind] = (acc[item.kind] || 0) + 1;
        return acc;
    }, {});
    const uniqueOldUrls = new Set(cases.map(function (testCase) {
        return localizedOldPath(testCase.locale) + '?id=' + encodeURIComponent(testCase.source);
    }));

    console.log('Legacy product redirect audit base: ' + BASE);
    console.log('Published products: ' + products.length);
    console.log('Legacy ID redirects: ' + counts.legacy_id);
    console.log('Formal slug redirects: ' + counts.slug);
    console.log('Approved alias redirects: ' + counts.approved_alias);
    console.log('Direct-over-alias conflict redirects: ' + counts.conflict);
    console.log('Valid redirect checks: ' + cases.length);
    console.log('Unique valid old URLs: ' + uniqueOldUrls.size);
    console.log('Invalid 404 cases: ' + invalidCases.length);
    console.log('Clean 200 targets without redirect chains: ' + targetPaths.length);
    console.log('GET/HEAD parity: passed');
    console.log('Query/fragment dropping: passed');
}

main().catch(function (err) {
    console.error(err.stack || err.message || err);
    process.exit(1);
});
