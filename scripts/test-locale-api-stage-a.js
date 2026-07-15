'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const zlib = require('zlib');
const { performance } = require('perf_hooks');
const { getDb } = require('../server/lib/db');
const { createLocaleRegistry, loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { createLocalePublicationPolicy } = require('../server/lib/localePublicationPolicy');
const { readPublicProducts } = require('../server/lib/publicProducts');
const { readPublicContentBlock, compactLocalizedTree, compactLocalizedContentBlock } = require('../server/lib/publicContentBlocks');
const { readLocalizedProducts, readLocalizedProduct } = require('../server/lib/localizedPublicCatalog');
const { run: generateManifest } = require('./generate-browser-locale-manifest');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = 3315;
const BASE_URL = 'http://127.0.0.1:' + PORT;

function instrumentDb(db) {
    const state = { prepares: 0 };
    return {
        state,
        prepare: function (sql) {
            state.prepares += 1;
            return db.prepare(sql);
        }
    };
}

function syntheticRegistry(localeCount) {
    const locales = {};
    const supportedLocales = [];
    for (let index = 0; index < localeCount; index += 1) {
        const first = String.fromCharCode(97 + Math.floor(index / 26));
        const second = String.fromCharCode(97 + (index % 26));
        const code = index === 0 ? 'en' : first + second;
        supportedLocales.push(code);
        locales[code] = {
            label: code,
            pathPrefix: code === 'en' ? '' : '/' + code,
            fallbackLocale: code === 'en' ? null : 'en',
            includeInSitemap: true
        };
    }
    return createLocaleRegistry({ defaultLocale: 'en', supportedLocales, locales, plannedLocales: {} });
}

function waitForServer(child) {
    return new Promise(function (resolve, reject) {
        let output = '';
        const timer = setTimeout(function () {
            reject(new Error('Server startup timed out. Output: ' + output));
        }, 15000);
        child.stdout.on('data', function (chunk) {
            output += chunk.toString();
            if (output.indexOf('Server running on') !== -1) {
                clearTimeout(timer);
                resolve();
            }
        });
        child.stderr.on('data', function (chunk) { output += chunk.toString(); });
        child.once('exit', function (code) {
            clearTimeout(timer);
            reject(new Error('Server exited before startup with code ' + code + '. Output: ' + output));
        });
    });
}

async function request(pathname, headers) {
    const started = performance.now();
    const response = await fetch(BASE_URL + pathname, { headers: headers || {} });
    const ttfbMs = performance.now() - started;
    const text = response.status === 304 ? '' : await response.text();
    return {
        response,
        text,
        json: text ? JSON.parse(text) : null,
        rawBytes: Buffer.byteLength(text),
        gzipBytes: text ? zlib.gzipSync(text).length : 0,
        ttfbMs
    };
}

function directLocaleStrings(value, locale, output) {
    const result = output || [];
    if (!value || typeof value !== 'object') return result;
    if (Array.isArray(value)) {
        value.forEach(function (item) { directLocaleStrings(item, locale, result); });
        return result;
    }
    const camelSuffix = locale.charAt(0).toUpperCase() + locale.slice(1);
    Object.keys(value).forEach(function (key) {
        const isDirect = (key.endsWith('_' + locale) || key.endsWith(camelSuffix))
            && !key.endsWith('_patch_' + locale)
            && !key.endsWith('Patch' + camelSuffix);
        if (isDirect && typeof value[key] === 'string' && value[key].trim()) result.push(value[key]);
        directLocaleStrings(value[key], locale, result);
    });
    return result;
}

function assertNoLocalizedKeys(value, label) {
    const serialized = JSON.stringify(value);
    assert(!/"[^"]*(?:_(?:en|ar|fr|ru|pt|cn)|(?:En|Ar|Fr|Ru|Pt|Cn))"\s*:/.test(serialized), label + ' leaked localized or private fields');
    assert(!/(?:Patch(?:En|Ar|Fr|Ru|Pt|Cn)|_patch_(?:en|ar|fr|ru|pt|cn))"/.test(serialized), label + ' leaked legacy patch fields');
}

async function main() {
    const registry = loadLocaleRegistry();
    assert.deepStrictEqual(registry.publicEntries.map(function (entry) { return entry.code; }), ['en', 'ar', 'fr', 'ru']);
    assert.strictEqual(registry.get('pt').state, 'planned');
    assert.strictEqual(registry.get('pt').isPublic, false);
    assert.strictEqual(registry.get('pt').includeInSitemap, false);
    assert.throws(function () {
        createLocaleRegistry({
            defaultLocale: 'en',
            supportedLocales: ['en'],
            locales: { en: { includeInSitemap: true } },
            plannedLocales: { en: { includeInSitemap: false } }
        });
    }, /both supported and planned/);
    assert.throws(function () {
        createLocaleRegistry({
            defaultLocale: 'en',
            supportedLocales: ['en'],
            locales: { en: { includeInSitemap: true } },
            plannedLocales: { es: { workflowState: 'published', includeInSitemap: false } }
        });
    }, /invalid planned state/);
    generateManifest({ check: true });

    const compactFixture = {
        neutral: 'keep',
        title_en: 'English title',
        title_ar: 'Arabic title',
        title_fr: 'French title',
        title_ru: 'Russian title',
        title_pt: 'Portuguese title',
        name_cn: 'Private Chinese name',
        nested: { label_en: 'English fallback', label_ar: '' }
    };
    assert.deepStrictEqual(compactLocalizedTree(compactFixture, 'ar', registry.entries.map(function (entry) { return entry.code; })), {
        neutral: 'keep',
        nested: { label: 'English fallback' },
        title: 'Arabic title'
    });
    ['applications', 'innovation', 'page-blocks'].forEach(function (slug) {
        const block = readPublicContentBlock(slug);
        assert(block, slug + ' content block must exist');
        ['ar', 'fr', 'ru'].forEach(function (locale) {
            const expectedValues = directLocaleStrings(block.body, locale);
            assert(expectedValues.length > 0, slug + ' must contain direct ' + locale + ' translations for this regression test');
            const compact = compactLocalizedContentBlock(block, locale, registry.entries.map(function (entry) { return entry.code; }));
            const serialized = JSON.stringify(compact);
            expectedValues.forEach(function (value) {
                assert(serialized.includes(JSON.stringify(value)), slug + ' lost a direct ' + locale + ' translation');
            });
            assertNoLocalizedKeys(compact, slug + '?locale=' + locale);
        });
    });

    const policy = createLocalePublicationPolicy(registry);
    assert.deepStrictEqual(policy.publicationMatrix([{ id: 1, status: 'published' }, { id: 2, status: 'draft' }]), {
        1: ['en', 'ar', 'fr', 'ru'],
        2: []
    });

    const listDb = instrumentDb(getDb());
    const localized = readLocalizedProducts('en', listDb);
    assert.strictEqual(listDb.state.prepares, 3, 'localized product list must use three bounded SQL queries');
    assert(localized.length > 0);
    assert(!Object.prototype.hasOwnProperty.call(localized[0], 'nameAr'));
    assert(!Object.prototype.hasOwnProperty.call(localized[0], 'description'));
    assert(!Object.prototype.hasOwnProperty.call(localized[0], 'specs'));

    const detailDb = instrumentDb(getDb());
    const detail = readLocalizedProduct(localized[0].slug, 'ar', detailDb);
    assert(detail);
    assert.strictEqual(detailDb.state.prepares, 4, 'direct localized detail must use four bounded SQL queries');
    assert(Array.isArray(detail.specs));
    assert(Array.isArray(detail.images));
    assert(!Object.prototype.hasOwnProperty.call(detail, 'nameFr'));

    const payloadBytes = Buffer.byteLength(JSON.stringify(localized));
    [4, 10, 20].forEach(function (count) {
        const synthetic = syntheticRegistry(count);
        assert.strictEqual(synthetic.publicEntries.length, count);
        assert.strictEqual(Buffer.byteLength(JSON.stringify(localized)), payloadBytes, 'single-locale payload must not grow with registry size');
    });

    const child = spawn(process.execPath, ['server/app.js'], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    try {
        await waitForServer(child);
        const legacy = await request('/api/products');
        assert.strictEqual(legacy.response.status, 200);
        assert(Array.isArray(legacy.json));
        assert(Object.prototype.hasOwnProperty.call(legacy.json[0], 'nameAr'));
        assert.strictEqual(legacy.response.headers.get('cache-control'), 'no-store');
        assert.deepStrictEqual(legacy.json, readPublicProducts());

        const metrics = [];
        for (const locale of ['en', 'ar', 'fr', 'ru']) {
            const result = await request('/api/products?locale=' + locale);
            assert.strictEqual(result.response.status, 200);
            assert.strictEqual(result.json.ok, true);
            assert.strictEqual(result.json.meta.locale, locale);
            assert(Array.isArray(result.json.data));
            assert(!Object.prototype.hasOwnProperty.call(result.json.data[0], 'nameAr'));
            assert(!Object.prototype.hasOwnProperty.call(result.json.data[0], 'description'));
            assert.strictEqual(result.response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
            assert(result.response.headers.get('etag'));
            metrics.push({ locale, rawBytes: result.rawBytes, gzipBytes: result.gzipBytes, ttfbMs: Number(result.ttfbMs.toFixed(1)) });
        }

        const english = await request('/api/products?locale=en');
        const corsResponse = await request('/api/products?locale=en', { Origin: 'https://example.com' });
        const vary = String(corsResponse.response.headers.get('vary') || '').toLowerCase().split(',').map(function (value) { return value.trim(); });
        assert(vary.includes('origin'), 'localized response must preserve Vary: Origin');
        assert(vary.includes('accept-encoding'), 'localized response must append Vary: Accept-Encoding');
        const notModified = await request('/api/products?locale=en', { 'If-None-Match': english.response.headers.get('etag') });
        assert.strictEqual(notModified.response.status, 304);
        assert.strictEqual(notModified.response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');

        const productDetail = await request('/api/products/' + encodeURIComponent(localized[0].slug) + '?locale=fr');
        assert.strictEqual(productDetail.response.status, 200);
        assert(Array.isArray(productDetail.json.data.images));
        assert(Array.isArray(productDetail.json.data.specs));

        for (const endpoint of ['/api/product-categories?locale=ru', '/api/certifications?locale=ar', '/api/content-blocks/home?locale=fr']) {
            const result = await request(endpoint);
            assert.strictEqual(result.response.status, 200, endpoint);
            assert.strictEqual(result.json.ok, true, endpoint);
            assertNoLocalizedKeys(result.json.data, endpoint);
        }

        const planned = await request('/api/products?locale=pt');
        assert.strictEqual(planned.response.status, 404);
        assert.strictEqual(planned.json.error.code, 'LOCALE_NOT_AVAILABLE');
        const invalid = await request('/api/products?locale=xx-invalid');
        assert.strictEqual(invalid.response.status, 400);
        assert.strictEqual(invalid.json.error.code, 'INVALID_LOCALE');

        console.log(JSON.stringify({
            products: localized.length,
            legacy: { rawBytes: legacy.rawBytes, gzipBytes: legacy.gzipBytes },
            localized: metrics,
            syntheticLocaleCounts: [4, 10, 20],
            queryCounts: { list: listDb.state.prepares, detail: detailDb.state.prepares }
        }, null, 2));
        console.log('Stage A locale API checks passed.');
    } finally {
        child.kill('SIGTERM');
        await new Promise(function (resolve) {
            if (child.exitCode != null) return resolve();
            child.once('exit', resolve);
            setTimeout(resolve, 3000);
        });
    }
}

main().catch(function (err) {
    console.error(err.stack || err.message);
    process.exitCode = 1;
});
