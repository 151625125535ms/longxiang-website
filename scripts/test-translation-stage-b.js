'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const migration = require('../server/db/migrations/0007_translation_revisions');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { createTranslationWriter, TranslationError } = require('../server/lib/translationWriter');

function expectTranslationError(fn, code) {
    assert.throws(fn, function (error) {
        return error instanceof TranslationError && error.code === code;
    });
}

function seedLegacyRows(db) {
    const now = Date.now();
    db.prepare(`
        INSERT INTO categories
            (id, type, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order, created_at, updated_at)
        VALUES
            (1, 'product', 'transformer', 'Transformer', 'محول', 'Transformateur', 'Трансформатор', 1, 0, ?, ?)
    `).run(now, now);
    db.prepare(`
        INSERT INTO products
            (
                id, legacy_id, slug, category_id, status, name_en, name_ar, name_fr, name_ru,
                short_desc_en, short_desc_ar, description_en, description_ar,
                seo_title, seo_title_ar, seo_description, seo_description_ar,
                seo_keywords, seo_keywords_ar, version, created_at, updated_at
            )
        VALUES
            (
                10, 'legacy-10', 'stage-b-product', 1, 'published', 'Stage B Product', 'منتج المرحلة ب',
                'Produit phase B', 'Продукт этапа B', 'English summary', 'ملخص عربي',
                'English description', 'وصف عربي', 'English SEO', 'تحسين عربي', NULL, NULL,
                'transformer', NULL, 1, ?, ?
            )
    `).run(now, now);
    db.prepare(`
        INSERT INTO product_specs
            (id, product_id, spec_group, spec_key, spec_value, unit, sort_order, created_at, updated_at)
        VALUES
            (100, 10, 'technical', 'Rated capacity', '1600', 'kVA', 0, ?, ?)
    `).run(now, now);
    db.prepare(`
        INSERT INTO certifications
            (
                id, legacy_id, category_id, status, name_en, name_ar, name_fr, name_ru,
                category_label_en, category_label_ar, issuer_en, issuer_ar,
                description_en, description_ar, version, created_at, updated_at
            )
        VALUES
            (
                20, 'cert-20', 1, 'published', 'Test Certificate', 'شهادة اختبار',
                'Certificat test', 'Тестовый сертификат', 'Qualification', 'مؤهل',
                'Issuer', 'جهة الإصدار', 'Description', 'الوصف', 1, ?, ?
            )
    `).run(now, now);
    db.prepare(`
        INSERT INTO content_blocks
            (id, slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            (30, 'about-us', 'About us', 'من نحن', '{}', 'published', 0, 1, ?, ?)
    `).run(now, now);
}

function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function verifyOldSchemaMigration(tempDir) {
    const db = new Database(path.join(tempDir, 'old-schema.db'));
    try {
        db.pragma('foreign_keys = ON');
        db.exec(`
            CREATE TABLE products (id INTEGER PRIMARY KEY);
            CREATE TABLE categories (id INTEGER PRIMARY KEY);
            CREATE TABLE certifications (id INTEGER PRIMARY KEY);
            CREATE TABLE content_blocks (id INTEGER PRIMARY KEY);
            CREATE TABLE product_specs (
                id INTEGER PRIMARY KEY,
                product_id INTEGER NOT NULL,
                spec_group TEXT NOT NULL DEFAULT 'technical',
                spec_key TEXT NOT NULL,
                spec_value TEXT NOT NULL,
                unit TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
        `);
        db.prepare('INSERT INTO products (id) VALUES (1)').run();
        db.prepare("INSERT INTO product_specs (id, product_id, spec_key, spec_value) VALUES (1, 1, 'Voltage', '10 kV')").run();
        migration.up(db);
        migration.up(db);
        assert(db.prepare('PRAGMA table_info(product_specs)').all().some(function (column) {
            return column.name === 'spec_code';
        }), 'migration must add spec_code to the old product_specs table');
        assert.strictEqual(db.prepare('SELECT spec_code FROM product_specs WHERE id = 1').get().spec_code, null);
        assert.strictEqual(tableExists(db, 'product_translations'), true);
    } finally {
        db.close();
    }
}

function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-stage-b-'));
    const dbPath = path.join(tempDir, 'stage-b.db');
    const db = new Database(dbPath);
    try {
        verifyOldSchemaMigration(tempDir);
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'schema.sql'), 'utf8'));
        seedLegacyRows(db);

        migration.up(db);
        migration.up(db);

        [
            'product_translations',
            'category_translations',
            'certification_translations',
            'content_block_translations',
            'product_spec_translation_values',
            'translation_backfill_receipts'
        ].forEach(function (table) {
            assert.strictEqual(tableExists(db, table), true, table + ' must exist');
        });
        assert(db.prepare('PRAGMA table_info(product_specs)').all().some(function (column) {
            return column.name === 'spec_code';
        }));
        assert.strictEqual(db.prepare('SELECT spec_code FROM product_specs WHERE id = 100').get().spec_code, null);
        assert.throws(function () {
            db.prepare(`
                INSERT INTO product_specs
                    (product_id, spec_group, spec_key, spec_value, sort_order)
                VALUES (10, 'technical', 'Voltage', '10 kV', 1)
            `).run();
        }, /spec_code is required/i);

        db.prepare("UPDATE product_specs SET spec_code = 'legacy-spec-100' WHERE id = 100").run();
        assert.throws(function () {
            db.prepare("UPDATE product_specs SET spec_code = 'renamed-code' WHERE id = 100").run();
        }, /spec_code is immutable/i);

        const registry = loadLocaleRegistry();
        const writer = createTranslationWriter({ db, registry });
        const actor = { username: 'stage-b-test', requestId: 'test-request' };

        ['product', 'category', 'certification', 'content_block'].forEach(function (entityType) {
            const entityId = { product: 10, category: 1, certification: 20, content_block: 30 }[entityType];
            const first = writer.syncLegacyPublished({ entityType, entityId, actor });
            const second = writer.syncLegacyPublished({ entityType, entityId, actor });
            assert(first.changed > 0, entityType + ' first sync must create revisions');
            assert.strictEqual(second.changed, 0, entityType + ' sync must be idempotent');
        });

        const initial = writer.getState({ entityType: 'product', entityId: 10, locale: 'ar' });
        assert.strictEqual(initial.published.values.name, 'منتج المرحلة ب');
        assert.strictEqual(initial.draft, null);
        const oldLegacy = db.prepare('SELECT name_ar, short_desc_ar, seo_description_ar FROM products WHERE id = 10').get();

        const saved = writer.saveDraft({
            entityType: 'product',
            entityId: 10,
            locale: 'ar',
            expectedVersion: 0,
            values: {
                name: 'منتج المرحلة ب - مسودة',
                short_description: 'ملخص مسودة',
                seo_description: ''
            },
            specValues: [{ productSpecId: 100, label: 'القدرة المقننة', valueText: '1600' }],
            actor
        });
        assert.strictEqual(saved.draft.values.name, 'منتج المرحلة ب - مسودة');
        assert.deepStrictEqual(
            db.prepare('SELECT name_ar, short_desc_ar, seo_description_ar FROM products WHERE id = 10').get(),
            oldLegacy,
            'saveDraft must not modify legacy public columns'
        );
        expectTranslationError(function () {
            writer.publishDraft({
                entityType: 'product',
                entityId: 10,
                locale: 'ar',
                expectedDraftVersion: saved.draft.version + 1,
                expectedPublishedRevisionId: initial.published.id,
                actor
            });
        }, 'VERSION_CONFLICT');
        assert.strictEqual(writer.getState({ entityType: 'product', entityId: 10, locale: 'ar' }).draft.id, saved.draft.id);

        const published = writer.publishDraft({
            entityType: 'product',
            entityId: 10,
            locale: 'ar',
            expectedDraftVersion: saved.draft.version,
            expectedPublishedRevisionId: initial.published.id,
            actor
        });
        assert.strictEqual(published.draft, null);
        assert.strictEqual(published.published.values.name, 'منتج المرحلة ب - مسودة');
        assert.deepStrictEqual(
            db.prepare('SELECT name_ar, short_desc_ar, seo_description_ar FROM products WHERE id = 10').get(),
            { name_ar: 'منتج المرحلة ب - مسودة', short_desc_ar: 'ملخص مسودة', seo_description_ar: '' }
        );
        assert.deepStrictEqual(published.published.specValues, [{
            productSpecId: 100,
            specCode: 'legacy-spec-100',
            label: 'القدرة المقننة',
            valueText: '1600'
        }]);

        const staleDraft = writer.saveDraft({
            entityType: 'product',
            entityId: 10,
            locale: 'ar',
            expectedVersion: 0,
            values: { short_description: 'مسودة ستصبح قديمة' },
            actor
        });
        expectTranslationError(function () {
            db.transaction(function () {
                db.prepare("UPDATE products SET name_ar = 'تعديل من النموذج القديم', version = version + 1 WHERE id = 10").run();
                writer.publishLegacyWrite({ entityType: 'product', entityId: 10, locales: ['ar'], actor });
            }).immediate();
        }, 'DRAFT_CONFLICT');
        assert.strictEqual(db.prepare('SELECT name_ar FROM products WHERE id = 10').get().name_ar, 'منتج المرحلة ب - مسودة');
        const afterDiscard = writer.discardDraft({
            entityType: 'product', entityId: 10, locale: 'ar',
            expectedDraftVersion: staleDraft.draft.version, actor
        });
        assert.strictEqual(afterDiscard.draft, null);
        db.transaction(function () {
            db.prepare("UPDATE products SET name_ar = 'تعديل من النموذج القديم', version = version + 1 WHERE id = 10").run();
            writer.publishLegacyWrite({ entityType: 'product', entityId: 10, locales: ['ar'], actor });
        }).immediate();
        const afterLegacySync = writer.getState({ entityType: 'product', entityId: 10, locale: 'ar' });
        assert.strictEqual(afterLegacySync.published.values.name, 'تعديل من النموذج القديم');

        const archivedOriginal = afterLegacySync.history.find(function (revision) {
            return revision.values.name === 'منتج المرحلة ب - مسودة';
        });
        assert(archivedOriginal, 'published revision must remain restorable');
        const restored = writer.restoreRevision({
            entityType: 'product',
            entityId: 10,
            locale: 'ar',
            revisionId: archivedOriginal.id,
            expectedPublishedRevisionId: afterLegacySync.published.id,
            actor
        });
        assert.strictEqual(restored.published.id, archivedOriginal.id);
        assert.strictEqual(db.prepare('SELECT name_ar FROM products WHERE id = 10').get().name_ar, 'منتج المرحلة ب - مسودة');

        const english = writer.getState({ entityType: 'product', entityId: 10, locale: 'en' });
        const invalidDraft = writer.saveDraft({
            entityType: 'product', entityId: 10, locale: 'en', expectedVersion: 0,
            values: { name: '' }, actor
        });
        expectTranslationError(function () {
            writer.publishDraft({
                entityType: 'product', entityId: 10, locale: 'en',
                expectedDraftVersion: invalidDraft.draft.version,
                expectedPublishedRevisionId: english.published.id,
                actor
            });
        }, 'VALIDATION_ERROR');
        const afterInvalid = writer.getState({ entityType: 'product', entityId: 10, locale: 'en' });
        assert.strictEqual(afterInvalid.published.id, english.published.id);
        assert.strictEqual(afterInvalid.draft.id, invalidDraft.draft.id);
        expectTranslationError(function () {
            writer.saveDraft({
                entityType: 'product', entityId: 10, locale: 'en', expectedVersion: 0,
                values: { name: 'Stale concurrent draft' }, actor
            });
        }, 'VERSION_CONFLICT');

        const productBeforePt = db.prepare('SELECT name_en, name_ar, name_fr, name_ru FROM products WHERE id = 10').get();
        const ptDraft = writer.saveDraft({
            entityType: 'product', entityId: 10, locale: 'pt', expectedVersion: 0,
            values: { name: 'Produto planeado', short_description: 'Conteúdo não público' }, actor
        });
        expectTranslationError(function () {
            writer.publishDraft({
                entityType: 'product', entityId: 10, locale: 'pt',
                expectedDraftVersion: ptDraft.draft.version,
                expectedPublishedRevisionId: null,
                actor
            });
        }, 'SPEC_TRANSLATION_INCOMPLETE');
        const completedPtDraft = writer.saveDraft({
            entityType: 'product', entityId: 10, locale: 'pt', expectedVersion: ptDraft.draft.version,
            values: {},
            specValues: [{ productSpecId: 100, label: 'Capacidade nominal', valueText: '1600' }],
            actor
        });
        const ptPublished = writer.publishDraft({
            entityType: 'product', entityId: 10, locale: 'pt',
            expectedDraftVersion: completedPtDraft.draft.version,
            expectedPublishedRevisionId: null,
            actor
        });
        assert.strictEqual(ptPublished.published.values.name, 'Produto planeado');
        assert.deepStrictEqual(db.prepare('SELECT name_en, name_ar, name_fr, name_ru FROM products WHERE id = 10').get(), productBeforePt);

        db.transaction(function () {
            db.prepare(`
                INSERT INTO product_specs
                    (id, product_id, spec_code, spec_group, spec_key, spec_value, unit, sort_order, created_at, updated_at)
                VALUES (101, 10, 'input-current', 'technical', 'Input current', '20', 'A', 1, ?, ?)
            `).run(Date.now(), Date.now());
            writer.publishLegacyWrite({ entityType: 'product', entityId: 10, locales: ['ar'], actor });
        }).immediate();
        const afterAddedSpec = writer.getState({ entityType: 'product', entityId: 10, locale: 'ar' });
        assert.strictEqual(afterAddedSpec.published.specValues.length, 2, 'legacy form save must include every active spec');
        assert.strictEqual(afterAddedSpec.published.specValues.find(function (item) {
            return item.productSpecId === 100;
        }).label, 'القدرة المقننة', 'existing translated specs must be preserved');
        assert.strictEqual(afterAddedSpec.published.specValues.find(function (item) {
            return item.productSpecId === 101;
        }).label, 'Input current', 'new specs use an explicit source fallback until translated');

        const categoryState = writer.getState({ entityType: 'category', entityId: 1, locale: 'fr' });
        assert.strictEqual(categoryState.published.values.name, 'Transformateur');
        const categoryDraft = writer.saveDraft({
            entityType: 'category', entityId: 1, locale: 'fr', expectedVersion: 0,
            values: { name: 'Transformateurs de distribution' }, actor
        });
        const categoryPublished = writer.publishDraft({
            entityType: 'category', entityId: 1, locale: 'fr',
            expectedDraftVersion: categoryDraft.draft.version,
            expectedPublishedRevisionId: categoryState.published.id,
            actor
        });
        assert.strictEqual(db.prepare('SELECT name_fr FROM categories WHERE id = 1').get().name_fr, 'Transformateurs de distribution');
        const restoredCategory = writer.restoreRevision({
            entityType: 'category', entityId: 1, locale: 'fr',
            revisionId: categoryPublished.history[0].id,
            expectedPublishedRevisionId: categoryPublished.published.id,
            actor
        });
        assert.strictEqual(restoredCategory.published.values.name, 'Transformateur');
        const certificationState = writer.getState({ entityType: 'certification', entityId: 20, locale: 'ar' });
        assert.strictEqual(certificationState.published.values.issuer, 'جهة الإصدار');
        const contentState = writer.getState({ entityType: 'content_block', entityId: 30, locale: 'en' });
        assert.strictEqual(contentState.published.values.title, 'About us');

        const auditActions = db.prepare(`
            SELECT action FROM audit_logs
            WHERE entity_type LIKE 'translation_%'
            ORDER BY id
        `).all().map(function (row) { return row.action; });
        assert(auditActions.includes('save_draft'));
        assert(auditActions.includes('publish'));
        assert(auditActions.includes('restore'));

        console.log('Stage B translation revision tests passed.');
    } finally {
        db.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run();
