'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const migration = require('../server/db/migrations/0007_translation_revisions');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { TranslationError } = require('../server/lib/translationWriter');
const {
    analyzeTranslationBackfill,
    applyTranslationBackfill,
    rollbackTranslationBackfill
} = require('../server/lib/translationBackfill');

function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-stage-b-backfill-'));
    const db = new Database(path.join(tempDir, 'backfill.db'));
    try {
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'schema.sql'), 'utf8'));
        db.prepare("INSERT INTO categories (id, type, slug, name_en, name_ar, is_active) VALUES (1, 'product', 'root', 'Root', 'جذر', 1)").run();
        db.prepare("INSERT INTO products (id, legacy_id, slug, category_id, status, name_en, name_ar) VALUES (10, 'p10', 'p10', 1, 'published', 'Product', 'منتج')").run();
        db.prepare("INSERT INTO product_specs (id, product_id, spec_code, spec_group, spec_key, spec_value) VALUES (100, 10, NULL, 'technical', 'Voltage', '10 kV')").run();
        db.prepare("INSERT INTO certifications (id, legacy_id, status, name_en, name_ar) VALUES (20, 'c20', 'published', 'Certificate', 'شهادة')").run();
        db.prepare("INSERT INTO content_blocks (id, slug, title_en, title_ar, body_json, status) VALUES (30, 'about-us', 'About', 'حول', '{}', 'published')").run();
        migration.up(db);

        const registry = loadLocaleRegistry();
        const dryRun = analyzeTranslationBackfill({ db, registry });
        assert.strictEqual(dryRun.blockers.length, 0);
        assert.strictEqual(dryRun.specCodes.length, 1);
        assert.strictEqual(dryRun.revisions.length, 16);
        assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM product_translations').get().count, 0, 'dry-run must not write');

        assert.throws(function () {
            applyTranslationBackfill({ db, registry, expectedPlanHash: 'wrong' });
        }, function (error) {
            return error instanceof TranslationError && error.code === 'PLAN_CHANGED';
        });
        assert.strictEqual(db.prepare('SELECT spec_code FROM product_specs WHERE id = 100').get().spec_code, null);

        db.prepare("UPDATE products SET name_ar = 'تغير بعد الفحص' WHERE id = 10").run();
        assert.throws(function () {
            applyTranslationBackfill({ db, registry, expectedPlanHash: dryRun.planHash });
        }, function (error) {
            return error instanceof TranslationError && error.code === 'PLAN_CHANGED';
        }, 'source content drift must invalidate the dry-run plan hash');
        db.prepare("UPDATE products SET name_ar = 'منتج' WHERE id = 10").run();

        const applied = applyTranslationBackfill({ db, registry, expectedPlanHash: dryRun.planHash });
        assert.strictEqual(applied.after.summary.blockers, 0);
        assert.strictEqual(applied.after.summary.specCodesToAssign, 0);
        assert.strictEqual(applied.after.summary.revisionsToCreate, 0);
        assert.strictEqual(db.prepare('SELECT spec_code FROM product_specs WHERE id = 100').get().spec_code, 'legacy-spec-100');
        assert.strictEqual(db.prepare('SELECT state FROM translation_backfill_receipts WHERE plan_hash = ?').get(applied.receipt.planHash).state, 'applied');

        const second = analyzeTranslationBackfill({ db, registry });
        assert.strictEqual(second.planHash, applied.after.planHash);
        assert.strictEqual(second.revisions.length, 0);

        const rolledBack = rollbackTranslationBackfill({ db, registry, planHash: applied.receipt.planHash });
        assert.strictEqual(rolledBack.removedRevisions, 16);
        assert.strictEqual(rolledBack.retainedSpecCodes.length, 1);
        assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM product_translations').get().count, 0);
        assert.strictEqual(db.prepare('SELECT spec_code FROM product_specs WHERE id = 100').get().spec_code, 'legacy-spec-100');
        assert.strictEqual(rolledBack.after.revisions.length, 16);
        assert.strictEqual(db.prepare('SELECT state FROM translation_backfill_receipts WHERE plan_hash = ?').get(applied.receipt.planHash).state, 'rolled_back');

        const reapplied = applyTranslationBackfill({
            db,
            registry,
            expectedPlanHash: rolledBack.after.planHash
        });
        assert.strictEqual(reapplied.after.revisions.length, 0);

        db.prepare("UPDATE products SET name_ar = 'اسم مختلف' WHERE id = 10").run();
        const drift = analyzeTranslationBackfill({ db, registry });
        assert(drift.blockers.some(function (blocker) {
            return blocker.code === 'PUBLISHED_LEGACY_MISMATCH' && blocker.entityType === 'product' && blocker.locale === 'ar';
        }));

        console.log('Stage B translation backfill tests passed.');
    } finally {
        db.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run();
