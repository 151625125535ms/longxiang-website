'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { runProductFieldPatch } = require('./lib/product-field-safe-patch-engine');
const { getProductFieldPatchPolicy } = require('./lib/product-field-patch-policies');

const root = path.resolve(__dirname, '..');
const forwardPath = path.join(root, 'scripts', 'patches', 'product-arabic-seo-forward.json');
const rollbackPath = path.join(root, 'scripts', 'patches', 'product-arabic-seo-rollback.json');

function createFixture(dbPath, products) {
    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO schema_migrations (version, name) VALUES (6, 'product_arabic_seo_fields');
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            legacy_id TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0,
            model TEXT,
            name_ar TEXT,
            short_desc_ar TEXT,
            description_ar TEXT,
            seo_title_ar TEXT,
            seo_description_ar TEXT,
            seo_keywords_ar TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);
    const insert = db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, status, version, model,
            name_ar, short_desc_ar, description_ar,
            seo_title_ar, seo_description_ar, seo_keywords_ar
        ) VALUES (
            @row_id, @legacy_id, @slug, @status, @expectedVersion, @model,
            @name_ar, @short_desc_ar, @description_ar,
            NULL, NULL, NULL
        )
    `);
    db.transaction((items) => {
        items.forEach((item) => insert.run(Object.assign({}, item, item.sourceExpected)));
    })(products);
    db.close();
}

async function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-arabic-seo-content-'));
    const dbPath = path.join(tempDir, 'content.db');
    const forward = JSON.parse(fs.readFileSync(forwardPath, 'utf8'));
    const rollback = JSON.parse(fs.readFileSync(rollbackPath, 'utf8'));
    const policy = getProductFieldPatchPolicy('arabic-seo-v1');
    try {
        createFixture(dbPath, forward.products);
        const forwardDryRun = await runProductFieldPatch({
            mode: 'dry-run', inputPath: forwardPath, dbPath,
            reportPath: path.join(tempDir, 'forward-dry-run.md'), policy, policyExplicit: true
        });
        assert.deepStrictEqual(forwardDryRun.errors, []);
        assert.deepStrictEqual(forwardDryRun.blockers, []);
        assert.strictEqual(forwardDryRun.records.length, forward.products.length);

        const pendingApply = await runProductFieldPatch({
            mode: 'apply', inputPath: forwardPath, dbPath,
            reportPath: path.join(tempDir, 'forward-pending-apply.md'),
            backupPath: path.join(tempDir, 'forward-pending-backup.db'), policy, policyExplicit: true
        });
        assert.ok(pendingApply.errors.some((error) => /approval_status.*approved/i.test(error)));
        assert.strictEqual(pendingApply.databaseChanged, false);

        const approvedForward = JSON.parse(JSON.stringify(forward));
        approvedForward.meta.approval_status = 'approved';
        const approvedForwardPath = path.join(tempDir, 'approved-forward.json');
        fs.writeFileSync(approvedForwardPath, JSON.stringify(approvedForward, null, 2), 'utf8');

        const forwardApply = await runProductFieldPatch({
            mode: 'apply', inputPath: approvedForwardPath, dbPath,
            reportPath: path.join(tempDir, 'forward-apply.md'),
            backupPath: path.join(tempDir, 'forward-backup.db'), policy, policyExplicit: true
        });
        assert.deepStrictEqual(forwardApply.errors, []);
        assert.deepStrictEqual(forwardApply.blockers, []);
        assert.strictEqual(forwardApply.records.length, forward.products.length);
        assert.strictEqual(forwardApply.databaseChanged, true);

        let db = new Database(dbPath, { readonly: true });
        forward.products.forEach((product) => {
            const row = db.prepare('SELECT * FROM products WHERE id = ?').get(product.row_id);
            Object.entries(product.target).forEach(([field, value]) => assert.strictEqual(row[field], value));
        });
        db.close();

        const rollbackDryRun = await runProductFieldPatch({
            mode: 'dry-run', inputPath: rollbackPath, dbPath,
            reportPath: path.join(tempDir, 'rollback-dry-run.md'),
            pairedForwardPath: approvedForwardPath, policy, policyExplicit: true
        });
        assert.deepStrictEqual(rollbackDryRun.errors, []);
        assert.deepStrictEqual(rollbackDryRun.blockers, []);

        const rollbackApply = await runProductFieldPatch({
            mode: 'apply', inputPath: rollbackPath, dbPath,
            reportPath: path.join(tempDir, 'rollback-apply.md'),
            backupPath: path.join(tempDir, 'rollback-backup.db'),
            pairedForwardPath: approvedForwardPath, policy, policyExplicit: true
        });
        assert.deepStrictEqual(rollbackApply.errors, []);
        assert.deepStrictEqual(rollbackApply.blockers, []);
        assert.strictEqual(rollbackApply.records.length, rollback.products.length);
        assert.strictEqual(rollbackApply.databaseChanged, true);

        db = new Database(dbPath, { readonly: true });
        forward.products.forEach((product) => {
            const row = db.prepare('SELECT * FROM products WHERE id = ?').get(product.row_id);
            assert.strictEqual(row.seo_title_ar, '');
            assert.strictEqual(row.seo_description_ar, '');
            assert.strictEqual(row.seo_keywords_ar, '');
            assert.deepStrictEqual(
                [row.model || '', row.name_ar || '', row.short_desc_ar || '', row.description_ar || ''],
                [product.sourceExpected.model, product.sourceExpected.name_ar,
                    product.sourceExpected.short_desc_ar, product.sourceExpected.description_ar]
            );
        });
        db.close();
        console.log(`product Arabic SEO content patch tests passed (${forward.products.length} products)`);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
