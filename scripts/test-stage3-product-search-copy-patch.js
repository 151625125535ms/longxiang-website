const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const cliPath = path.join(root, 'scripts', 'apply-product-field-safe-patch.js');
const forwardPath = path.join(root, 'scripts', 'patches', 'stage3-product-search-copy-forward.json');
const rollbackPath = path.join(root, 'scripts', 'patches', 'stage3-product-search-copy-rollback.json');
const allowedFields = new Set(['seo_title', 'seo_description', 'name_en', 'name_ar', 'short_desc_ar']);

function readPatchArtifact(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runCli(args) {
    return childProcess.spawnSync(nodeBin, [cliPath].concat(args), {
        cwd: root,
        encoding: 'utf8'
    });
}

function fieldCount(patch) {
    return patch.products.reduce((sum, item) => sum + Object.keys(item.target).length, 0);
}

function createDatabaseFromExpected(forward) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-stage3-search-copy-'));
    const dbPath = path.join(dir, 'longxiang.db');
    const reportPath = path.join(dir, 'report.md');
    const backupPath = path.join(dir, 'backup.db');
    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            legacy_id TEXT,
            slug TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'published',
            version INTEGER DEFAULT 1,
            updated_at TEXT,
            seo_title TEXT,
            seo_description TEXT,
            name_en TEXT,
            name_ar TEXT,
            short_desc_ar TEXT,
            description_en TEXT
        );
    `);
    const insert = db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, status, version, updated_at,
            seo_title, seo_description, name_en, name_ar, short_desc_ar, description_en
        ) VALUES (
            @id, @legacy_id, @slug, 'published', 7, '2026-07-12T00:00:00.000Z',
            @seo_title, @seo_description, @name_en, @name_ar, @short_desc_ar, @description_en
        )
    `);
    forward.products.forEach((item) => insert.run({
        id: item.row_id,
        legacy_id: 'legacy-' + item.row_id,
        slug: item.slug,
        seo_title: item.expected.seo_title || 'Existing SEO title for ' + item.slug,
        seo_description: item.expected.seo_description || 'Review product information for ' + item.slug + ' from Longxiang Electric. Contact us to discuss project requirements or request a quotation.',
        name_en: item.expected.name_en || 'Existing English name ' + item.slug,
        name_ar: item.expected.name_ar || 'اسم عربي ' + item.row_id,
        short_desc_ar: item.expected.short_desc_ar || 'وصف عربي ' + item.row_id,
        description_en: 'Frozen description ' + item.row_id
    }));
    db.close();
    return { dir, dbPath, reportPath, backupPath };
}

function readRows(dbPath) {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
    db.close();
    return rows;
}

function validatePatchPair(forward, rollback) {
    assert.strictEqual(forward.meta.policy, 'search-copy-v1');
    assert.strictEqual(rollback.meta.policy, 'search-copy-v1');
    assert.strictEqual(forward.meta.operation, 'forward');
    assert.strictEqual(rollback.meta.operation, 'rollback');
    assert.strictEqual(forward.products.length, 35);
    assert.strictEqual(rollback.products.length, 35);
    assert.strictEqual(fieldCount(forward), 80);
    assert.strictEqual(fieldCount(rollback), 80);
    assert.deepStrictEqual(forward.meta.counts, {
        products: 35,
        fields: 80,
        seo_title: 13,
        seo_description: 35,
        short_desc_ar: 32,
        name_en: 0,
        name_ar: 0
    });
    const slugs = new Set();
    forward.products.forEach((item, index) => {
        assert.ok(Number.isInteger(item.row_id), 'row_id must be an integer');
        assert.ok(item.slug, 'slug is required');
        assert.ok(!slugs.has(item.slug), 'duplicate slug: ' + item.slug);
        slugs.add(item.slug);
        assert.deepStrictEqual(Object.keys(item.expected).sort(), Object.keys(item.target).sort());
        Object.keys(item.target).forEach((field) => {
            assert.ok(allowedFields.has(field), 'unsupported field in forward patch: ' + field);
            assert.strictEqual(typeof item.expected[field], 'string');
            assert.strictEqual(typeof item.target[field], 'string');
            assert.notStrictEqual(item.expected[field], item.target[field]);
        });
        const inverse = rollback.products[index];
        assert.strictEqual(inverse.row_id, item.row_id);
        assert.strictEqual(inverse.slug, item.slug);
        assert.deepStrictEqual(inverse.expected, item.target);
        assert.deepStrictEqual(inverse.target, item.expected);
    });
}

function main() {
    const forward = readPatchArtifact(forwardPath);
    const rollback = readPatchArtifact(rollbackPath);
    validatePatchPair(forward, rollback);
    const fixture = createDatabaseFromExpected(forward);
    const before = readRows(fixture.dbPath);

    const dryRun = runCli([
        '--policy', 'search-copy-v1', '--dry-run',
        '--input', forwardPath, '--db', fixture.dbPath, '--report', fixture.reportPath
    ]);
    assert.strictEqual(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    assert.deepStrictEqual(readRows(fixture.dbPath), before, 'dry-run must not change fixture database');
    assert.match(fs.readFileSync(fixture.reportPath, 'utf8'), /Field changes: 80/);

    const apply = runCli([
        '--policy', 'search-copy-v1', '--apply',
        '--input', forwardPath, '--db', fixture.dbPath, '--report', fixture.reportPath,
        '--backup', fixture.backupPath
    ]);
    assert.strictEqual(apply.status, 0, apply.stderr || apply.stdout);
    assert.ok(fs.existsSync(fixture.backupPath), 'apply must create a backup');
    const after = readRows(fixture.dbPath);
    const afterBySlug = new Map(after.map((row) => [row.slug, row]));
    forward.products.forEach((item) => {
        const row = afterBySlug.get(item.slug);
        Object.keys(item.target).forEach((field) => assert.strictEqual(row[field], item.target[field]));
        assert.strictEqual(row.description_en, 'Frozen description ' + item.row_id);
        assert.strictEqual(row.version, 8);
    });

    const rollbackDryRun = runCli([
        '--policy', 'search-copy-v1', '--dry-run',
        '--input', rollbackPath, '--db', fixture.dbPath, '--report', fixture.reportPath
    ]);
    assert.strictEqual(rollbackDryRun.status, 0, rollbackDryRun.stderr || rollbackDryRun.stdout);
    assert.match(fs.readFileSync(fixture.reportPath, 'utf8'), /Field changes: 80/);
    console.log('stage3 product search copy patch tests passed');
}

main();
