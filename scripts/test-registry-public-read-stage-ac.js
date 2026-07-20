'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { createVerifiedSqliteBackup } = require('../server/lib/sqliteBackup');
const { runMigrations } = require('../server/db/migrations');
const stageBMigration = require('../server/db/migrations/0007_translation_revisions');
const { analyzeTranslationBackfill, applyTranslationBackfill } = require('../server/lib/translationBackfill');
const { analyzeContentOverlayMigration, applyContentOverlayMigration } = require('../server/lib/contentOverlayMigration');
const { createLocaleRegistry, loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { createRevisionLocalePublicationPolicy } = require('../server/lib/localePublicationPolicy');
const {
    PublicTranslationReadError,
    createPublicTranslationReadAdapter,
    revisionReadiness
} = require('../server/lib/publicTranslationReadAdapter');
const { createRuntimePublicSiteDataSource } = require('../server/lib/publicSiteDataSource');
const {
    productSeoTitle,
    productSeoDescription,
    productPageJsonLd
} = require('../server/lib/productDetailSeoRenderer');
const productPresentation = require('../js/product-page-presentation');
const { databaseFingerprint } = require('../server/lib/publicTranslationReadParity');
const { sendRevisionSourceNotReady } = require('../server/lib/localizedApiResponse');
const { buildSitemap } = require('./generate-sitemap');
const {
    loadLocaleConfig,
    sitemapLocaleEntries,
    staticPagesForSitemap
} = require('./i18n-page-model');

const SOURCE_DB = path.join(__dirname, '..', 'data', 'longxiang.db');
const SYNTHETIC_LOCALE = 'zz';

function publicEntryConfig(entry, overrides) {
    return Object.assign({
        label: entry.label,
        nativeLabel: entry.nativeLabel,
        htmlLang: entry.htmlLang,
        hreflang: entry.hreflang,
        dir: entry.dir,
        pathPrefix: entry.pathPrefix,
        homePath: entry.homePath,
        fallbackLocale: entry.fallbackLocale,
        includeInSitemap: entry.includeInSitemap
    }, overrides || {});
}

function syntheticRegistry() {
    const current = loadLocaleRegistry();
    return createLocaleRegistry({
        defaultLocale: 'en',
        supportedLocales: ['en', 'ar', 'fr', 'ru', SYNTHETIC_LOCALE],
        locales: {
            en: publicEntryConfig(current.get('en')),
            ar: publicEntryConfig(current.get('ar')),
            fr: publicEntryConfig(current.get('fr')),
            ru: publicEntryConfig(current.get('ru')),
            zz: publicEntryConfig(current.get('en'), {
                label: 'Synthetic',
                nativeLabel: 'Synthetic',
                htmlLang: SYNTHETIC_LOCALE,
                hreflang: SYNTHETIC_LOCALE,
                pathPrefix: '/zz',
                homePath: '/zz/',
                fallbackLocale: 'en'
            })
        },
        plannedLocales: {
            pt: publicEntryConfig(current.get('pt'), {
                includeInSitemap: false
            })
        }
    });
}

function prepareRevisionData(db, registry) {
    stageBMigration.up(db);
    runMigrations(db);
    const backfill = analyzeTranslationBackfill({ db, registry });
    assert.strictEqual(backfill.blockers.length, 0, JSON.stringify(backfill.blockers, null, 2));
    if (backfill.specCodes.length || backfill.revisions.length) {
        applyTranslationBackfill({
            db,
            registry,
            expectedPlanHash: backfill.planHash,
            actor: { username: 'stage-ac-registry-test' }
        });
    }
    const overlays = analyzeContentOverlayMigration({ db, registry });
    assert.strictEqual(overlays.blockers.length, 0, JSON.stringify(overlays.blockers, null, 2));
    if (overlays.blocks.length) {
        applyContentOverlayMigration({
            db,
            registry,
            expectedPlanHash: overlays.planHash,
            actor: { username: 'stage-ac-registry-test' }
        });
    }
}

function installSyntheticPublishedRevisions(db) {
    const now = Date.now();
    db.transaction(function () {
        db.prepare(`
            INSERT INTO product_translations
                (product_id, locale, revision_no, revision_state, base_revision_id,
                 name, short_description, description, seo_title, seo_description,
                 seo_keywords, version, created_by, updated_by, created_at, updated_at, published_at)
            SELECT product_id, @locale, 1, 'published', NULL,
                'ZZ ' || name,
                'ZZ ' || COALESCE(short_description, ''),
                'ZZ ' || COALESCE(description, ''),
                'ZZ ' || COALESCE(NULLIF(seo_title, ''), name),
                'ZZ ' || COALESCE(NULLIF(seo_description, ''), short_description, ''),
                COALESCE(seo_keywords, ''), 1, @actor, @actor, @now, @now, @now
            FROM product_translations
            WHERE locale = 'en' AND revision_state = 'published'
        `).run({ locale: SYNTHETIC_LOCALE, actor: 'synthetic-locale-test', now });
        db.prepare(`
            INSERT INTO category_translations
                (category_id, locale, revision_no, revision_state, base_revision_id,
                 name, version, created_by, updated_by, created_at, updated_at, published_at)
            SELECT category_id, @locale, 1, 'published', NULL,
                'ZZ ' || name, 1, @actor, @actor, @now, @now, @now
            FROM category_translations
            WHERE locale = 'en' AND revision_state = 'published'
        `).run({ locale: SYNTHETIC_LOCALE, actor: 'synthetic-locale-test', now });
        db.prepare(`
            INSERT INTO certification_translations
                (certification_id, locale, revision_no, revision_state, base_revision_id,
                 name, category_label, issuer, description, version,
                 created_by, updated_by, created_at, updated_at, published_at)
            SELECT certification_id, @locale, 1, 'published', NULL,
                'ZZ ' || name,
                'ZZ ' || COALESCE(category_label, ''),
                'ZZ ' || COALESCE(issuer, ''),
                'ZZ ' || COALESCE(description, ''),
                1, @actor, @actor, @now, @now, @now
            FROM certification_translations
            WHERE locale = 'en' AND revision_state = 'published'
        `).run({ locale: SYNTHETIC_LOCALE, actor: 'synthetic-locale-test', now });
        db.prepare(`
            INSERT INTO content_block_translations
                (content_block_id, locale, revision_no, revision_state, base_revision_id,
                 title, schema_version, translation_json, base_structure_hash, version,
                 created_by, updated_by, created_at, updated_at, published_at)
            SELECT content_block_id, @locale, 1, 'published', NULL,
                'ZZ ' || title, schema_version, translation_json, base_structure_hash, 1,
                @actor, @actor, @now, @now, @now
            FROM content_block_translations
            WHERE locale = 'en' AND revision_state = 'published'
        `).run({ locale: SYNTHETIC_LOCALE, actor: 'synthetic-locale-test', now });
        db.prepare(`
            INSERT INTO product_spec_translation_values
                (product_translation_id, product_spec_id, label, value_text)
            SELECT target.id, value.product_spec_id,
                'ZZ ' || COALESCE(value.label, ''),
                COALESCE(value.value_text, '')
            FROM product_translations target
            JOIN product_translations source
                ON source.product_id = target.product_id
                AND source.locale = 'en'
                AND source.revision_state = 'published'
            JOIN product_spec_translation_values value
                ON value.product_translation_id = source.id
            WHERE target.locale = @locale AND target.revision_state = 'published'
        `).run({ locale: SYNTHETIC_LOCALE });
    }).immediate();
}

function queryCounter(db) {
    let count = 0;
    const proxy = new Proxy(db, {
        get: function (target, property) {
            if (property === 'prepare') {
                return function (sql) {
                    count += 1;
                    return target.prepare(sql);
                };
            }
            const value = target[property];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
    return {
        db: proxy,
        reset: function () { count = 0; },
        count: function () { return count; }
    };
}

function assertNormalizedShape(value) {
    const serialized = JSON.stringify(value);
    assert(!/"(?:name|shortDesc|description|seoTitle|seoDescription)(?:Ar|Fr|Ru|Zz)"/.test(serialized));
    assert(!/"(?:name|short_desc|description|seo_title|seo_description)_(?:en|ar|fr|ru|zz)"/.test(serialized));
}

function assertSyntheticReads(db, registry) {
    const before = databaseFingerprint(db);
    const adapter = createPublicTranslationReadAdapter({ db, registry, source: 'revision' });
    const products = adapter.readLocalizedProducts(SYNTHETIC_LOCALE);
    assert(products.length > 0);
    assert(products[0].name.startsWith('ZZ '));
    assert.strictEqual(products[0].localization.requestedLocale, SYNTHETIC_LOCALE);
    assert.strictEqual(products[0].localization.fallbackApplied, false);
    assertNormalizedShape(products);

    const identifier = products[0].slug || products[0].id;
    const product = adapter.readLocalizedProduct(identifier, SYNTHETIC_LOCALE);
    assert(product.seoTitle.startsWith('ZZ '));
    assert(product.seoDescription.startsWith('ZZ '));
    assert(product.specs.length > 0);
    assertNormalizedShape(product);

    const categories = adapter.readLocalizedProductCategories(SYNTHETIC_LOCALE);
    const certifications = adapter.readLocalizedCertifications(SYNTHETIC_LOCALE);
    const contentBlock = adapter.readLocalizedContentBlock('product-pages', SYNTHETIC_LOCALE);
    assert(categories.length > 0 && categories[0].label.startsWith('ZZ '));
    assert(certifications.length > 0 && certifications[0].name.startsWith('ZZ '));
    assert(contentBlock && contentBlock.title.startsWith('ZZ '));
    assertNormalizedShape(categories);
    assertNormalizedShape(certifications);
    assertNormalizedShape(contentBlock);

    assert.throws(function () {
        adapter.readLocalizedProducts('pt');
    }, function (error) {
        return error instanceof PublicTranslationReadError && error.code === 'LOCALE_NOT_PUBLIC';
    });

    const source = createRuntimePublicSiteDataSource({ publicRead: adapter, db, registry });
    const ssrProduct = source.readProduct(identifier, registry.get(SYNTHETIC_LOCALE));
    const ssrProducts = source.readProducts(registry.get(SYNTHETIC_LOCALE));
    const ssrTaxonomy = source.readProductCategories(registry.get(SYNTHETIC_LOCALE));
    const ssrBlock = source.readContentBlock('product-pages', registry.get(SYNTHETIC_LOCALE));
    assert.strictEqual(ssrProduct.name, product.name);
    assert.strictEqual(ssrProducts[0].name, products[0].name);
    assert.strictEqual(ssrTaxonomy[0].label, categories[0].label);
    assert.strictEqual(ssrBlock.title, contentBlock.title);
    assert(ssrProduct.publication.locales.includes(SYNTHETIC_LOCALE));
    assertNormalizedShape(ssrProduct);

    assert(productSeoTitle(ssrProduct, SYNTHETIC_LOCALE).startsWith('ZZ '));
    assert(productSeoDescription(ssrProduct, SYNTHETIC_LOCALE).startsWith('ZZ '));
    const jsonLd = productPageJsonLd(ssrProduct, SYNTHETIC_LOCALE, 'https://example.test/zz/products/' + identifier, 'https://example.test');
    assert.strictEqual(jsonLd.inLanguage, SYNTHETIC_LOCALE);
    assert(String(jsonLd.name || '').startsWith('ZZ '));

    const rendered = productPresentation.presentDetail({
        locale: SYNTHETIC_LOCALE,
        product: ssrProduct,
        products: ssrProducts,
        contentBlock: ssrBlock
    });
    assert.strictEqual(rendered.hero.title, ssrProduct.name);
    assert(rendered.fragments.title.includes('ZZ '));
    assert.deepStrictEqual(databaseFingerprint(db), before, 'synthetic public reads must be read-only');
}

function assertRevisionSitemap(db, registry) {
    const before = databaseFingerprint(db);
    const xml = buildSitemap({ db, registry, source: 'revision' });
    const config = loadLocaleConfig(path.join(__dirname, '..', 'config', 'locales.json'));
    const productCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM products product
        JOIN categories category ON category.id = product.category_id
        LEFT JOIN categories parent ON parent.id = category.parent_id
        WHERE product.status = 'published'
            AND category.type = 'product' AND category.is_active = 1
            AND (category.parent_id IS NULL OR parent.is_active = 1)
    `).get().count;
    const expectedUrls = staticPagesForSitemap(config).length
        + Number(productCount) * sitemapLocaleEntries(config).length;
    assert.strictEqual((xml.match(/<url>/g) || []).length, expectedUrls);
    assert(!xml.includes('/pt/'));
    assert(xml.includes('hreflang="ar"'));
    assert(xml.includes('hreflang="fr"'));
    assert(xml.includes('hreflang="ru"'));
    assert.deepStrictEqual(databaseFingerprint(db), before, 'revision sitemap generation must be read-only');
}

function assertRevision503Contract() {
    let status = null;
    let body = null;
    const response = {
        status: function (value) { status = value; return this; },
        json: function (value) { body = value; return this; }
    };
    const originalError = console.error;
    console.error = function () {};
    try {
        assert.strictEqual(sendRevisionSourceNotReady(response, {
            code: 'REVISION_SOURCE_NOT_READY',
            details: { internal: 'not-public' }
        }, { route: 'test' }), true);
    } finally {
        console.error = originalError;
    }
    assert.strictEqual(status, 503);
    assert.deepStrictEqual(body, {
        ok: false,
        error: {
            code: 'REVISION_SOURCE_NOT_READY',
            message: 'Published revision content is not ready.'
        }
    });
    assert.strictEqual(sendRevisionSourceNotReady(response, { status: 503, code: 'OTHER_FAILURE' }), false);
}

function freePort() {
    return new Promise(function (resolve, reject) {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', function () {
            const port = server.address().port;
            server.close(function () { resolve(port); });
        });
    });
}

async function waitForHealth(origin, child, logs) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (child.exitCode != null) throw new Error('revision HTTP fixture exited early:\n' + logs());
        try {
            const response = await fetch(origin + '/api/health');
            if (response.ok) return;
        } catch (error) {}
        await new Promise(function (resolve) { setTimeout(resolve, 100); });
    }
    throw new Error('revision HTTP fixture did not become healthy:\n' + logs());
}

async function stopChild(child) {
    if (child.exitCode != null) return;
    await new Promise(function (resolve) {
        const timer = setTimeout(function () {
            if (child.exitCode == null) child.kill('SIGKILL');
        }, 3000);
        child.once('exit', function () { clearTimeout(timer); resolve(); });
        child.kill('SIGTERM');
    });
}

async function assertRevisionHttpService(dbPath, identifier, expectedFingerprint) {
    const port = await freePort();
    const origin = 'http://127.0.0.1:' + port;
    let stdout = '';
    let stderr = '';
    const child = spawn(process.execPath, ['server/app.js'], {
        cwd: path.join(__dirname, '..'),
        env: Object.assign({}, process.env, {
            DB_PATH: dbPath,
            HOST: '127.0.0.1',
            PORT: String(port),
            NODE_ENV: 'test',
            PUBLIC_TRANSLATION_READ_SOURCE: 'revision'
        }),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', function (chunk) { stdout += chunk.toString(); });
    child.stderr.on('data', function (chunk) { stderr += chunk.toString(); });
    try {
        await waitForHealth(origin, child, function () { return stdout + stderr; });
        const legacyResponse = await fetch(origin + '/api/products');
        const legacyProducts = await legacyResponse.json();
        assert.strictEqual(legacyResponse.status, 200);
        assert(Array.isArray(legacyProducts));
        assert.strictEqual(legacyResponse.headers.get('cache-control'), 'no-store');

        const paths = { en: '', ar: '/ar', fr: '/fr', ru: '/ru' };
        for (const locale of ['en', 'ar', 'fr', 'ru']) {
            const localizedResponse = await fetch(origin + '/api/products?locale=' + locale, {
                headers: { Origin: 'https://www.lxenelectric.com' }
            });
            const localizedProducts = await localizedResponse.json();
            assert.strictEqual(localizedResponse.status, 200);
            assert(localizedProducts.ok && localizedProducts.data.length > 0);
            assertNormalizedShape(localizedProducts.data);
            const vary = String(localizedResponse.headers.get('vary') || '').toLowerCase();
            assert(vary.includes('origin') && vary.includes('accept-encoding'));
            const etag = localizedResponse.headers.get('etag');
            assert(etag);
            const notModified = await fetch(origin + '/api/products?locale=' + locale, {
                headers: { 'If-None-Match': etag, Origin: 'https://www.lxenelectric.com' }
            });
            assert.strictEqual(notModified.status, 304);

            for (const endpoint of ['/api/product-categories', '/api/certifications', '/api/content-blocks/about-us']) {
                const response = await fetch(origin + endpoint + '?locale=' + locale);
                const payload = await response.json();
                assert.strictEqual(response.status, 200, endpoint + '?locale=' + locale);
                assert(payload.ok && payload.data);
                assertNormalizedShape(payload.data);
            }

            const listResponse = await fetch(origin + paths[locale] + '/products.html');
            const listHtml = await listResponse.text();
            assert.strictEqual(listResponse.status, 200);
            assert(/<title>[^<]+<\/title>/i.test(listHtml));
            assert(/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(listHtml));
            assert(!listHtml.includes('undefined'));

            const detailResponse = await fetch(origin + paths[locale] + '/products/' + encodeURIComponent(identifier));
            const detailHtml = await detailResponse.text();
            assert.strictEqual(detailResponse.status, 200);
            assert(/<meta\b[^>]*name="description"/i.test(detailHtml));
            assert((detailHtml.match(/hreflang=/g) || []).length >= 5);
            assert(/data-schema-auto="product-page"/i.test(detailHtml));
            assert(!detailHtml.includes('undefined'));
        }

        const plannedResponse = await fetch(origin + '/api/products?locale=pt');
        const planned = await plannedResponse.json();
        assert.strictEqual(plannedResponse.status, 404);
        assert.strictEqual(planned.error.code, 'LOCALE_NOT_AVAILABLE');
    } finally {
        await stopChild(child);
    }
    const verificationDb = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
        verificationDb.pragma('query_only = ON');
        assert.deepStrictEqual(databaseFingerprint(verificationDb), expectedFingerprint,
            'revision HTTP service changed the controlled database copy');
    } finally {
        verificationDb.close();
    }
}

function assertPublicationMatrixAndQueryBudget(db, registry) {
    const row = db.prepare("SELECT id FROM products WHERE status = 'published' ORDER BY id LIMIT 1").get();
    assert(row);
    const policy = createRevisionLocalePublicationPolicy({ db, registry });
    const matrix = policy.publicationMatrix({ entityType: 'product', entityIds: [row.id] });
    assert.deepStrictEqual(matrix[row.id].sort(), ['en', 'ar', 'fr', 'ru', SYNTHETIC_LOCALE].sort());

    const counted = queryCounter(db);
    const adapter = createPublicTranslationReadAdapter({ db: counted.db, registry, source: 'revision' });
    counted.reset();
    const products = adapter.readLocalizedProducts(SYNTHETIC_LOCALE);
    assert(products.length > 0);
    assert(counted.count() <= 5, 'localized product list exceeded fixed query budget: ' + counted.count());
}

function assertMissingSyntheticRevisionFailsClosed(db, registry) {
    const row = db.prepare(`
        SELECT id FROM product_translations
        WHERE locale = ? AND revision_state = 'published'
        ORDER BY id LIMIT 1
    `).get(SYNTHETIC_LOCALE);
    assert(row);
    db.prepare("UPDATE product_translations SET revision_state = 'draft' WHERE id = ?").run(row.id);
    try {
        const report = revisionReadiness(db, registry);
        assert.strictEqual(report.ready, false);
        assert(report.blockers.some(function (blocker) {
            return blocker.code === 'PUBLISHED_REVISION_MISSING';
        }));
        const adapter = createPublicTranslationReadAdapter({ db, registry, source: 'revision' });
        assert.strictEqual(adapter.readiness.ready, false);
        assert.throws(function () {
            adapter.readLocalizedProducts(SYNTHETIC_LOCALE);
        }, function (error) {
            return error instanceof PublicTranslationReadError && error.code === 'REVISION_SOURCE_NOT_READY';
        });
    } finally {
        db.prepare("UPDATE product_translations SET revision_state = 'published' WHERE id = ?").run(row.id);
    }
}

async function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-stage-ac-registry-'));
    const dbPath = path.join(tempDir, 'registry.db');
    let db;
    try {
        await createVerifiedSqliteBackup({ sourcePath: SOURCE_DB, backupPath: dbPath });
        db = new Database(dbPath, { fileMustExist: true });
        db.pragma('foreign_keys = ON');
        const currentRegistry = loadLocaleRegistry();
        prepareRevisionData(db, currentRegistry);
        installSyntheticPublishedRevisions(db);
        const registry = syntheticRegistry();
        const readiness = revisionReadiness(db, registry);
        assert.strictEqual(readiness.ready, true, JSON.stringify(readiness.blockers, null, 2));
        assert.deepStrictEqual(readiness.locales, ['en', 'ar', 'fr', 'ru', SYNTHETIC_LOCALE]);
        assertSyntheticReads(db, registry);
        assertPublicationMatrixAndQueryBudget(db, registry);
        assertRevisionSitemap(db, currentRegistry);
        assertRevision503Contract();
        assertMissingSyntheticRevisionFailsClosed(db, registry);
        const sample = createPublicTranslationReadAdapter({ db, registry: currentRegistry, source: 'revision' })
            .readLocalizedProducts('en')[0];
        const httpFingerprint = databaseFingerprint(db);
        db.close();
        db = null;
        await assertRevisionHttpService(dbPath, sample.slug || sample.id, httpFingerprint);
        console.log('Stage A-C registry public read tests passed.');
    } finally {
        if (db) db.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
