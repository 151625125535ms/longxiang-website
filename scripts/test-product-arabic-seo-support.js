'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { runMigrations } = require('../server/db/migrations');
const { readPublicProduct } = require('../server/lib/publicProducts');
const {
    productSeoTitle,
    productSeoDescription,
    renderProductDetailSeoHtml
} = require('../server/lib/productDetailSeoRenderer');
const { createVerifiedSqliteBackup } = require('../server/lib/sqliteBackup');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_SQL = fs.readFileSync(path.join(ROOT, 'server', 'db', 'schema.sql'), 'utf8');
const AR_TITLE = 'محول توزيع كهربائي زيتي موديل A1 من لونغشيانغ';
const AR_DESCRIPTION = 'محول توزيع كهربائي زيتي موديل A1 مخصص لشبكات الجهد المتوسط، مع بيانات فنية واضحة لدعم اختيار المشروع وطلب عرض السعر.';

function productColumns(db) {
    return db.prepare('PRAGMA table_info(products)').all().map(function (column) { return column.name; });
}

function createV5Fixture(dbPath) {
    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL);
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            legacy_id TEXT,
            slug TEXT,
            status TEXT,
            model TEXT,
            name_en TEXT,
            name_ar TEXT,
            short_desc_ar TEXT,
            description_ar TEXT,
            seo_title TEXT,
            seo_title_fr TEXT,
            seo_title_ru TEXT,
            seo_description TEXT,
            seo_description_fr TEXT,
            seo_description_ru TEXT,
            seo_keywords TEXT,
            seo_keywords_fr TEXT,
            seo_keywords_ru TEXT,
            version INTEGER DEFAULT 1,
            created_at INTEGER,
            updated_at INTEGER
        );
    `);
    const insertMigration = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
    [2, 3, 4, 5].forEach(function (version) { insertMigration.run(version, 'fixture_' + version, version); });
    db.prepare(`
        INSERT INTO products (id, legacy_id, slug, status, model, name_en, name_ar, short_desc_ar, description_ar, version)
        VALUES (1, 'legacy-a1', 'product-a1', 'published', 'A1', 'Product A1', 'منتج A1', 'وصف قصير', 'تفاصيل عربية', 7)
    `).run();
    return db;
}

function testMigration() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-ar-seo-migration-'));
    const db = createV5Fixture(path.join(dir, 'v5.db'));
    const before = db.prepare('SELECT * FROM products WHERE id = 1').get();
    const first = runMigrations(db);
    assert.strictEqual(first.applied, 1);
    assert.strictEqual(first.latest, 6);
    ['seo_title_ar', 'seo_description_ar', 'seo_keywords_ar'].forEach(function (field) {
        assert.ok(productColumns(db).includes(field), field + ' should be added');
    });
    const after = db.prepare('SELECT * FROM products WHERE id = 1').get();
    Object.keys(before).forEach(function (field) { assert.strictEqual(after[field], before[field], field + ' changed during migration'); });
    assert.strictEqual(after.seo_title_ar, null);
    assert.strictEqual(after.seo_description_ar, null);
    assert.strictEqual(after.seo_keywords_ar, null);
    const second = runMigrations(db);
    assert.strictEqual(second.applied, 0, 'migration must be idempotent');
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS total FROM schema_migrations WHERE version = 6').get().total, 1);
    db.close();

    const schemaDb = new Database(path.join(dir, 'schema.db'));
    schemaDb.exec(SCHEMA_SQL);
    ['seo_title_ar', 'seo_description_ar', 'seo_keywords_ar'].forEach(function (field) {
        assert.ok(productColumns(schemaDb).includes(field), 'new schema is missing ' + field);
    });
    schemaDb.close();
}

function testPublicMappingAndSeoRendering() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-ar-seo-render-'));
    const db = new Database(path.join(dir, 'render.db'));
    db.exec(SCHEMA_SQL);
    db.prepare(`
        INSERT INTO categories (id, type, slug, name_en, name_ar, is_active)
        VALUES (1, 'product', 'oil-immersed', 'Oil-immersed transformers', 'المحولات الزيتية', 1)
    `).run();
    db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, category_id, status, name_en, name_ar,
            short_desc_en, short_desc_ar, description_en, description_ar,
            seo_title, seo_title_ar, seo_description, seo_description_ar, seo_keywords_ar
        ) VALUES (
            1, 'legacy-a1', 'product-a1', 1, 'published', 'Product A1', 'منتج A1',
            'English short description', 'وصف عربي قصير', 'English details', 'تفاصيل عربية',
            'English SEO title', ?, 'English SEO description', ?, 'محول توزيع، محول زيتي، موديل A1'
        )
    `).run(AR_TITLE, AR_DESCRIPTION);
    const product = readPublicProduct('product-a1', db);
    assert.strictEqual(product.seoTitleAr, AR_TITLE);
    assert.strictEqual(product.seoDescriptionAr, AR_DESCRIPTION);
    assert.ok(!Object.prototype.hasOwnProperty.call(product, 'seoKeywordsAr'), 'Arabic keywords must remain private');
    assert.strictEqual(productSeoTitle(product, 'ar'), AR_TITLE);
    assert.strictEqual(productSeoDescription(product, 'ar'), AR_DESCRIPTION);
    assert.strictEqual(productSeoTitle(product, 'en'), 'English SEO title');

    const fallback = Object.assign({}, product, { seoTitleAr: '', seoDescriptionAr: '' });
    assert.match(productSeoTitle(fallback, 'ar'), /^منتج A1 \| /);
    assert.strictEqual(productSeoDescription(fallback, 'ar'), 'وصف عربي قصير');

    const html = renderProductDetailSeoHtml('<html><head><title>Old</title></head><body></body></html>', product, { code: 'ar' }, 'https://www.lxenelectric.com');
    assert.ok(html.includes('<title>' + AR_TITLE + '</title>'));
    assert.ok(html.includes('name="description" content="' + AR_DESCRIPTION + '"'));
    assert.ok(html.includes('property="og:title" content="' + AR_TITLE + '"'));
    assert.ok(html.includes('name="twitter:description" content="' + AR_DESCRIPTION + '"'));
    assert.ok(!/<meta\b[^>]*name=["']keywords["']/i.test(html));
    db.close();
}

function testAdminAndCacheContracts() {
    const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
    const adminJs = fs.readFileSync(path.join(ROOT, 'admin', 'js', 'modules', 'admin-products.js'), 'utf8');
    ['en', 'ar', 'fr', 'ru'].forEach(function (locale) {
        assert.ok(adminHtml.includes('id="product-seo-tab-' + locale + '"'));
        assert.ok(adminHtml.includes('id="product-seo-panel-' + locale + '"'));
    });
    ['title', 'description', 'keywords'].forEach(function (field) {
        assert.ok(adminHtml.includes('id="field-seo-' + field + '-ar"'));
        assert.ok(adminJs.includes('seo_' + field + '_ar'));
    });
    assert.match(adminHtml, /id="field-seo-title-ar"[^>]*dir="rtl"[^>]*lang="ar"/);
    assert.match(adminJs, /function\s+activateProductLanguageTab\s*\(/);

    const expectedVersion = '20260714-arabic-seo';
    ['product-detail.html', 'ar/product-detail.html', 'fr/product-detail.html', 'ru/product-detail.html'].forEach(function (relativePath) {
        const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
        assert.ok(source.includes('product-detail.js?v=' + expectedVersion), relativePath + ' cache version mismatch');
    });
    const ptSource = fs.readFileSync(path.join(ROOT, 'pt', 'product-detail.html'), 'utf8');
    assert.ok(!ptSource.includes(expectedVersion), 'planned pt shell must remain unchanged');
}

async function testWalSafeBackup() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-ar-seo-backup-'));
    const sourcePath = path.join(dir, 'source.db');
    const backupPath = path.join(dir, 'backup.db');
    const db = new Database(sourcePath);
    db.exec(SCHEMA_SQL);
    db.pragma('journal_mode = WAL');
    db.prepare("INSERT INTO products (id, legacy_id, slug, status, name_en) VALUES (1, 'backup-a1', 'backup-a1', 'published', 'Backup A1')").run();
    const result = await createVerifiedSqliteBackup({ sourcePath, backupPath });
    assert.strictEqual(result.integrity, 'ok');
    assert.ok(result.sizeBytes > 0);
    assert.strictEqual(result.summary.products.total, 1);
    const backupDb = new Database(backupPath, { readonly: true });
    assert.strictEqual(backupDb.prepare('SELECT name_en FROM products WHERE id = 1').get().name_en, 'Backup A1');
    backupDb.close();
    db.close();
}

async function main() {
    testMigration();
    testPublicMappingAndSeoRendering();
    testAdminAndCacheContracts();
    await testWalSafeBackup();
    console.log('product Arabic SEO support tests passed');
}

main().catch(function (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
});
