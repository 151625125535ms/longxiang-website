const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const scriptPath = path.join(root, 'scripts', 'apply-content-block-safe-patch.js');
const localeConfigPath = path.join(root, 'config', 'locales.json');

function readLocaleMeta() {
    const config = JSON.parse(fs.readFileSync(localeConfigPath, 'utf8'));
    return {
        supportedLocales: Array.isArray(config.supportedLocales) ? config.supportedLocales : [],
        plannedOnlyLocales: config.plannedLocales && typeof config.plannedLocales === 'object'
            ? Object.keys(config.plannedLocales)
            : []
    };
}

function runNode(args, options) {
    return childProcess.spawnSync(nodeBin, args, Object.assign({
        cwd: root,
        encoding: 'utf8'
    }, options || {}));
}

function readBody(dbPath) {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT body_json, version FROM content_blocks WHERE slug = 'global-shell'").get();
    db.close();
    return {
        body: JSON.parse(row.body_json),
        version: row.version
    };
}

function createFixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-content-patch-'));
    const dbPath = path.join(dir, 'longxiang.db');
    const inputPath = path.join(dir, 'patch.json');
    const reportPath = path.join(dir, 'report.md');
    const backupPath = path.join(dir, 'backup.db');

    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE content_blocks (
            id INTEGER PRIMARY KEY,
            slug TEXT NOT NULL,
            title_en TEXT,
            body_json TEXT NOT NULL,
            status TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            version INTEGER DEFAULT 1,
            updated_at TEXT
        );
    `);
    db.prepare(`
        INSERT INTO content_blocks (id, slug, title_en, body_json, status, sort_order, version, updated_at)
        VALUES (1, 'global-shell', 'Global Shell', @body, 'published', 1, 3, '2026-01-01T00:00:00.000Z')
    `).run({
        body: JSON.stringify({
            navigation: {
                mainLinks: [
                    { label: 'Home', children: [{ label: 'Overview' }, { label: 'Factory' }] },
                    { label: 'Products' }
                ]
            }
        })
    });
    db.close();

    const localeMeta = readLocaleMeta();
    const input = {
        meta: {
            locale: 'ru',
            supportedLocales: localeMeta.supportedLocales,
            plannedOnlyLocales: localeMeta.plannedOnlyLocales,
            counts: { contentBlocks: 1 }
        },
        contentBlocks: [
            {
                id: 1,
                slug: 'global-shell',
                expected: {
                    body_json_current: {
                        navigation: {
                            mainLinks: [
                                { label: 'Home', children: [{ label: 'Overview' }, { label: 'Factory' }] },
                                { label: 'Products' }
                            ]
                        }
                    }
                },
                target: {
                    locale: 'ru',
                    body_json_patch: {
                        navigation: {
                            main_links_patch_ru: {
                                index_0: {
                                    labelRu: 'Главная',
                                    children: {
                                        index_1: { labelRu: 'Завод' }
                                    }
                                },
                                index_1: { labelRu: 'Продукция' }
                            }
                        }
                    }
                }
            }
        ]
    };
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2), 'utf8');

    return { dir, dbPath, inputPath, reportPath, backupPath };
}

function testDryRunDoesNotChangeDatabase() {
    const fixture = createFixture();
    const before = readBody(fixture.dbPath);
    const result = runNode([
        scriptPath,
        '--dry-run',
        '--locale', 'ru',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath,
        '--require-clean-boundary'
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const after = readBody(fixture.dbPath);
    assert.deepStrictEqual(after, before);
    assert.ok(fs.existsSync(fixture.reportPath), 'dry-run report should be written');
}

function testApplyMergesOnlyLocalePatchAndBacksUpDatabase() {
    const fixture = createFixture();
    const result = runNode([
        scriptPath,
        '--apply',
        '--locale', 'ru',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath,
        '--backup', fixture.backupPath,
        '--require-clean-boundary'
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(fixture.backupPath), 'backup should be created before apply');

    const after = readBody(fixture.dbPath);
    assert.strictEqual(after.version, 4);
    assert.strictEqual(after.body.navigation.mainLinks[0].label, 'Home');
    assert.strictEqual(after.body.navigation.main_links_patch_ru.index_0.labelRu, 'Главная');
    assert.strictEqual(after.body.navigation.main_links_patch_ru.index_0.children.index_1.labelRu, 'Завод');
}

function testCleanBoundaryRejectsNeutralPatchPath() {
    const fixture = createFixture();
    const input = JSON.parse(fs.readFileSync(fixture.inputPath, 'utf8'));
    input.contentBlocks[0].target.body_json_patch = { navigation: { mainLinks: [] } };
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');

    const result = runNode([
        scriptPath,
        '--dry-run',
        '--locale', 'ru',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath,
        '--require-clean-boundary'
    ]);

    assert.notStrictEqual(result.status, 0, 'neutral patch path should fail clean boundary validation');
    assert.match(result.stderr + result.stdout, /non-locale-scoped|Apply blockers/i);
}

function testCleanBoundaryRejectsNeutralAncestorOverwrite() {
    const fixture = createFixture();
    const input = JSON.parse(fs.readFileSync(fixture.inputPath, 'utf8'));
    input.contentBlocks[0].target.body_json_patch = {
        navigation: {
            mainLinks: {
                index_0: {
                    labelRu: 'Russian Home'
                }
            }
        }
    };
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');

    const result = runNode([
        scriptPath,
        '--dry-run',
        '--locale', 'ru',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath,
        '--require-clean-boundary'
    ]);

    assert.notStrictEqual(result.status, 0, 'neutral ancestor overwrite should fail clean boundary validation');
    assert.match(result.stderr + result.stdout, /non-locale-scoped|Apply blockers/i);
}

function testExpectedCurrentMismatchBlocksPatch() {
    const fixture = createFixture();
    const input = JSON.parse(fs.readFileSync(fixture.inputPath, 'utf8'));
    input.contentBlocks[0].expected.body_json_current.navigation.mainLinks[0].label = 'Changed Home';
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');

    const result = runNode([
        scriptPath,
        '--dry-run',
        '--locale', 'ru',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath,
        '--require-clean-boundary'
    ]);

    assert.notStrictEqual(result.status, 0, 'expected current mismatch should block patch');
    assert.match(result.stderr + result.stdout, /expected value mismatch|Apply blockers/i);
}

testDryRunDoesNotChangeDatabase();
testApplyMergesOnlyLocalePatchAndBacksUpDatabase();
testCleanBoundaryRejectsNeutralPatchPath();
testCleanBoundaryRejectsNeutralAncestorOverwrite();
testExpectedCurrentMismatchBlocksPatch();
console.log('content block safe patch tests passed');
