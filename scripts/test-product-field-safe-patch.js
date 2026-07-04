const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const scriptPath = path.join(root, 'scripts', 'apply-product-field-safe-patch.js');

function runNode(args, options) {
    return childProcess.spawnSync(nodeBin, args, Object.assign({
        cwd: root,
        encoding: 'utf8'
    }, options || {}));
}

function createFixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-product-field-patch-'));
    const dbPath = path.join(dir, 'longxiang.db');
    const inputPath = path.join(dir, 'patch.json');
    const reportPath = path.join(dir, 'report.md');
    const backupPath = path.join(dir, 'backup.db');

    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            legacy_id TEXT,
            slug TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'published',
            version INTEGER DEFAULT 1,
            updated_at TEXT,
            name_en TEXT,
            name_ar TEXT,
            name_fr TEXT,
            name_ru TEXT,
            short_desc_fr TEXT,
            short_desc_ru TEXT,
            description_en TEXT,
            description_ar TEXT,
            description_fr TEXT,
            description_ru TEXT,
            seo_title_fr TEXT,
            seo_title_ru TEXT,
            seo_description_fr TEXT,
            seo_description_ru TEXT,
            seo_keywords_fr TEXT,
            seo_keywords_ru TEXT
        );
    `);
    db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, status, version, updated_at, name_en, name_ar,
            description_en, description_ru, short_desc_ru
        )
        VALUES (
            1, 'legacy-product', 'sample-product', 'published', 3, '2026-01-01T00:00:00.000Z',
            'English name', 'Arabic name', 'English description',
            'Текст 230Vac (single-phase), 25.', 'Project-specific value'
        )
    `).run();
    db.close();

    const input = {
        meta: {
            counts: { products: 1 }
        },
        products: [
            {
                slug: 'sample-product',
                expected: {
                    description_ru: 'Текст 230Vac (single-phase), 25.',
                    short_desc_ru: 'Project-specific value'
                },
                target: {
                    description_ru: 'Текст 230Vac (однофазное).',
                    short_desc_ru: 'по требованиям проекта value'
                }
            }
        ]
    };
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2), 'utf8');

    return { dir, dbPath, inputPath, reportPath, backupPath };
}

function readProduct(dbPath) {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT * FROM products WHERE slug = ?').get('sample-product');
    db.close();
    return row;
}

function testDryRunDoesNotChangeDatabase() {
    const fixture = createFixture();
    const before = readProduct(fixture.dbPath);
    const result = runNode([
        scriptPath,
        '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const after = readProduct(fixture.dbPath);
    assert.deepStrictEqual(after, before);
    assert.ok(fs.existsSync(fixture.reportPath), 'dry-run report should be written');
    assert.match(fs.readFileSync(fixture.reportPath, 'utf8'), /Database changed: no/);
}

function testApplyUpdatesOnlyAllowedFieldsAndBacksUpDatabase() {
    const fixture = createFixture();
    const result = runNode([
        scriptPath,
        '--apply',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath,
        '--backup', fixture.backupPath
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(fixture.backupPath), 'backup should be created before apply');

    const after = readProduct(fixture.dbPath);
    assert.strictEqual(after.description_ru, 'Текст 230Vac (однофазное).');
    assert.strictEqual(after.short_desc_ru, 'по требованиям проекта value');
    assert.strictEqual(after.description_en, 'English description');
    assert.strictEqual(after.name_ar, 'Arabic name');
    assert.strictEqual(after.version, 4);
}

function testRejectsUnsupportedNeutralField() {
    const fixture = createFixture();
    const input = JSON.parse(fs.readFileSync(fixture.inputPath, 'utf8'));
    input.products[0].expected.description_en = 'English description';
    input.products[0].target.description_en = 'Changed English description';
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');

    const result = runNode([
        scriptPath,
        '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ]);

    assert.notStrictEqual(result.status, 0, 'neutral/en field should be rejected');
    assert.match(result.stderr + result.stdout, /unsupported|en\/ar|Apply blockers/i);
}

function testRejectsExpectedValueMismatch() {
    const fixture = createFixture();
    const input = JSON.parse(fs.readFileSync(fixture.inputPath, 'utf8'));
    input.products[0].expected.description_ru = 'old value that is not in the database';
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');

    const result = runNode([
        scriptPath,
        '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ]);

    assert.notStrictEqual(result.status, 0, 'expected value mismatch should fail dry-run');
    assert.match(result.stderr + result.stdout, /expected value mismatch|Apply blockers/i);
}

function testApplyRequiresBackup() {
    const fixture = createFixture();
    const result = runNode([
        scriptPath,
        '--apply',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ]);

    assert.notStrictEqual(result.status, 0, 'apply should require a backup path');
    assert.match(result.stderr + result.stdout, /backup/i);
}

testDryRunDoesNotChangeDatabase();
testApplyUpdatesOnlyAllowedFieldsAndBacksUpDatabase();
testRejectsUnsupportedNeutralField();
testRejectsExpectedValueMismatch();
testApplyRequiresBackup();
console.log('product field safe patch tests passed');
