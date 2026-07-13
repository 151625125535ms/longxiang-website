'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { getProductFieldPatchPolicy } = require('./lib/product-field-patch-policies');
const { runProductFieldPatch } = require('./lib/product-field-safe-patch-engine');
const {
    normalizeSourceExpected,
    sourceSnapshotHash
} = require('./lib/product-arabic-seo-source');
const { forwardContentSha256 } = require('./lib/product-arabic-seo-patch-pair');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'apply-product-field-safe-patch.js');
const SCHEMA_SQL = fs.readFileSync(path.join(ROOT, 'server', 'db', 'schema.sql'), 'utf8');
const TARGETS = [
    {
        seo_title_ar: 'محول توزيع كهربائي زيتي موديل A1 من لونغشيانغ',
        seo_description_ar: 'محول توزيع كهربائي زيتي موديل A1 مخصص لشبكات الجهد المتوسط، مع بيانات فنية واضحة لدعم اختيار المشروع وطلب عرض السعر.',
        seo_keywords_ar: 'محول توزيع، محول زيتي، موديل A1'
    },
    {
        seo_title_ar: 'محول توزيع كهربائي جاف موديل B2 من لونغشيانغ',
        seo_description_ar: 'محول توزيع كهربائي جاف موديل B2 مناسب لمشروعات التوزيع الداخلية، مع معلومات موثوقة تساعد على مراجعة المتطلبات وطلب عرض السعر.',
        seo_keywords_ar: 'محول توزيع، محول جاف، موديل B2'
    }
];

function createFixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-ar-seo-patch-'));
    const fixture = {
        dir,
        dbPath: path.join(dir, 'source.db'),
        inputPath: path.join(dir, 'patch.json'),
        reportPath: path.join(dir, 'report.md'),
        backupPath: path.join(dir, 'backup.db')
    };
    const db = new Database(fixture.dbPath);
    db.exec(SCHEMA_SQL);
    db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, status, model, name_en, name_ar, short_desc_ar, description_ar,
            seo_title_ar, seo_description_ar, seo_keywords_ar, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
    `).run(1, 'legacy-a1', 'product-a1', 'published', 'A1', 'Product A1', 'منتج A1', 'وصف عربي قصير A1', 'تفاصيل عربية موثوقة للمنتج A1', 4);
    db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, status, model, name_en, name_ar, short_desc_ar, description_ar,
            seo_title_ar, seo_description_ar, seo_keywords_ar, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
    `).run(2, 'legacy-b2', 'product-b2', 'draft', 'B2', 'Product B2', 'منتج B2', 'وصف عربي قصير B2', 'تفاصيل عربية موثوقة للمنتج B2', 8);
    db.prepare(`
        INSERT INTO products (id, legacy_id, slug, status, model, name_en, version)
        VALUES (3, 'legacy-deleted', 'product-deleted', 'deleted', 'D3', 'Deleted product', 1)
    `).run();
    const activeRows = db.prepare("SELECT * FROM products WHERE status != 'deleted' ORDER BY id").all();
    db.close();

    const input = {
        meta: { policy: 'arabic-seo-v1', operation: 'forward', approval_status: 'pending' },
        products: activeRows.map(function (row, index) {
            return {
                row_id: row.id,
                slug: row.slug,
                legacy_id: row.legacy_id,
                status: row.status,
                expectedVersion: row.version,
                sourceExpected: normalizeSourceExpected(row),
                sourceSnapshotHash: sourceSnapshotHash(row),
                expected: {
                    seo_title_ar: '',
                    seo_description_ar: '',
                    seo_keywords_ar: ''
                },
                target: TARGETS[index]
            };
        })
    };
    writeInput(fixture.inputPath, input);
    return fixture;
}

function readInput(inputPath) {
    return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
}

function writeInput(inputPath, input) {
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2), 'utf8');
}

function approveForward(inputPath) {
    const input = readInput(inputPath);
    input.meta.approval_status = 'approved';
    writeInput(inputPath, input);
    return input;
}

function runCli(fixture, mode, backupPath, pairedForwardPath) {
    const args = [
        SCRIPT,
        '--policy', 'arabic-seo-v1',
        mode === 'apply' ? '--apply' : '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ];
    if (backupPath) args.push('--backup', backupPath);
    if (pairedForwardPath) args.push('--paired-forward', pairedForwardPath);
    return childProcess.spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
}

function readProducts(dbPath) {
    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
    db.close();
    return rows;
}

function rollbackInput(forward) {
    return {
        meta: {
            policy: 'arabic-seo-v1',
            operation: 'rollback',
            forward_content_sha256: forwardContentSha256(forward)
        },
        products: forward.products.map(function (item) {
            return {
                row_id: item.row_id,
                slug: item.slug,
                legacy_id: item.legacy_id,
                status: item.status,
                expected: item.target,
                target: item.expected
            };
        })
    };
}

function testForwardDryRunAndNullSafeApply() {
    const fixture = createFixture();
    const dryRun = runCli(fixture, 'dry-run');
    assert.strictEqual(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    assert.strictEqual(readProducts(fixture.dbPath)[0].seo_title_ar, null, 'dry-run must not normalize NULL');

    const pendingApply = runCli(fixture, 'apply', fixture.backupPath);
    assert.notStrictEqual(pendingApply.status, 0);
    assert.match(pendingApply.stderr + pendingApply.stdout, /approval_status.*approved/i);
    assert.strictEqual(readProducts(fixture.dbPath)[0].seo_title_ar, null);
    assert.ok(!fs.existsSync(fixture.backupPath), 'pending approval must block before backup and write');

    approveForward(fixture.inputPath);
    const apply = runCli(fixture, 'apply', fixture.backupPath);
    assert.strictEqual(apply.status, 0, apply.stderr || apply.stdout);
    const rows = readProducts(fixture.dbPath);
    assert.strictEqual(rows[0].seo_title_ar, TARGETS[0].seo_title_ar);
    assert.strictEqual(rows[1].seo_description_ar, TARGETS[1].seo_description_ar);
    assert.strictEqual(rows[0].version, 5);
    assert.strictEqual(rows[1].version, 9);
    const report = fs.readFileSync(fixture.reportPath, 'utf8');
    assert.match(report, /Backup verified: yes/);
    assert.ok(fs.existsSync(fixture.backupPath));
}

function testForwardIdentitySetVersionAndSourceGuards() {
    const identity = createFixture();
    const identityInput = readInput(identity.inputPath);
    identityInput.products[0].slug = 'product-b2';
    writeInput(identity.inputPath, identityInput);
    const identityResult = runCli(identity, 'dry-run');
    assert.notStrictEqual(identityResult.status, 0);
    assert.match(identityResult.stderr + identityResult.stdout, /different rows|identity/i);

    const missing = createFixture();
    const missingInput = readInput(missing.inputPath);
    missingInput.products.pop();
    writeInput(missing.inputPath, missingInput);
    const missingResult = runCli(missing, 'dry-run');
    assert.notStrictEqual(missingResult.status, 0);
    assert.match(missingResult.stderr + missingResult.stdout, /product set|missing=/i);

    const wrongSet = createFixture();
    const wrongSetInput = readInput(wrongSet.inputPath);
    const wrongSetDb = new Database(wrongSet.dbPath, { readonly: true });
    const deletedRow = wrongSetDb.prepare('SELECT * FROM products WHERE id = 3').get();
    wrongSetDb.close();
    wrongSetInput.products[1] = Object.assign({}, wrongSetInput.products[1], {
        row_id: deletedRow.id,
        slug: deletedRow.slug,
        legacy_id: deletedRow.legacy_id,
        status: deletedRow.status,
        expectedVersion: deletedRow.version,
        sourceExpected: normalizeSourceExpected(deletedRow),
        sourceSnapshotHash: sourceSnapshotHash(deletedRow)
    });
    writeInput(wrongSet.inputPath, wrongSetInput);
    const wrongSetResult = runCli(wrongSet, 'dry-run');
    assert.notStrictEqual(wrongSetResult.status, 0);
    assert.match(wrongSetResult.stderr + wrongSetResult.stdout, /deleted|product set|missing=.*2|extra=.*3/i);

    const duplicate = createFixture();
    const duplicateInput = readInput(duplicate.inputPath);
    duplicateInput.products[1] = JSON.parse(JSON.stringify(duplicateInput.products[0]));
    duplicateInput.products[1].target = TARGETS[1];
    writeInput(duplicate.inputPath, duplicateInput);
    const duplicateResult = runCli(duplicate, 'dry-run');
    assert.notStrictEqual(duplicateResult.status, 0);
    assert.match(duplicateResult.stderr + duplicateResult.stdout, /duplicated|product set/i);

    const source = createFixture();
    const sourceDb = new Database(source.dbPath);
    sourceDb.prepare("UPDATE products SET name_ar = 'اسم معدل' WHERE id = 1").run();
    sourceDb.close();
    const sourceResult = runCli(source, 'dry-run');
    assert.notStrictEqual(sourceResult.status, 0);
    assert.match(sourceResult.stderr + sourceResult.stdout, /sourceExpected|sourceSnapshotHash/i);

    const version = createFixture();
    const versionDb = new Database(version.dbPath);
    versionDb.prepare('UPDATE products SET version = version + 1 WHERE id = 1').run();
    versionDb.close();
    const versionResult = runCli(version, 'dry-run');
    assert.notStrictEqual(versionResult.status, 0);
    assert.match(versionResult.stderr + versionResult.stdout, /expectedVersion|sourceSnapshotHash/i);
}

function testRollbackUsesDirectionSpecificRules() {
    const fixture = createFixture();
    const forward = approveForward(fixture.inputPath);
    const pairedForwardPath = path.join(fixture.dir, 'approved-forward.json');
    writeInput(pairedForwardPath, forward);
    const applied = runCli(fixture, 'apply', fixture.backupPath);
    assert.strictEqual(applied.status, 0, applied.stderr || applied.stdout);

    const db = new Database(fixture.dbPath);
    db.prepare(`
        INSERT INTO products (id, legacy_id, slug, status, model, name_en, version)
        VALUES (4, 'legacy-new', 'product-new', 'published', 'N4', 'New product', 1)
    `).run();
    db.prepare("UPDATE products SET name_ar = 'اسم مصدر معدل', version = version + 1 WHERE id = 1").run();
    db.close();

    writeInput(fixture.inputPath, rollbackInput(forward));
    const dryRun = runCli(fixture, 'dry-run', '', pairedForwardPath);
    assert.strictEqual(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    const rollbackBackup = path.join(fixture.dir, 'rollback.db');
    const apply = runCli(fixture, 'apply', rollbackBackup, pairedForwardPath);
    assert.strictEqual(apply.status, 0, apply.stderr || apply.stdout);
    const rows = readProducts(fixture.dbPath);
    assert.strictEqual(rows[0].seo_title_ar, '');
    assert.strictEqual(rows[1].seo_description_ar, '');
    assert.strictEqual(rows[3].slug, 'product-new');
}

function testRollbackBlocksManualSeoChange() {
    const fixture = createFixture();
    const forward = approveForward(fixture.inputPath);
    const pairedForwardPath = path.join(fixture.dir, 'approved-forward.json');
    writeInput(pairedForwardPath, forward);
    const applied = runCli(fixture, 'apply', fixture.backupPath);
    assert.strictEqual(applied.status, 0, applied.stderr || applied.stdout);
    const db = new Database(fixture.dbPath);
    db.prepare("UPDATE products SET seo_title_ar = 'عنوان عربي عدله المستخدم يدويا بعد التنفيذ' WHERE id = 1").run();
    db.close();
    writeInput(fixture.inputPath, rollbackInput(forward));
    const result = runCli(fixture, 'dry-run', '', pairedForwardPath);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /expected value mismatch/i);
}

function testRollbackRequiresStrictApprovedPairAndOriginalRows() {
    const tampered = createFixture();
    const tamperedForward = approveForward(tampered.inputPath);
    const tamperedForwardPath = path.join(tampered.dir, 'approved-forward.json');
    writeInput(tamperedForwardPath, tamperedForward);
    assert.strictEqual(runCli(tampered, 'apply', tampered.backupPath).status, 0);
    const badRollback = rollbackInput(tamperedForward);
    badRollback.products[0].target.seo_title_ar = 'قيمة ليست العكس الدقيق للمحتوى المعتمد';
    writeInput(tampered.inputPath, badRollback);
    const badPair = runCli(tampered, 'dry-run', '', tamperedForwardPath);
    assert.notStrictEqual(badPair.status, 0);
    assert.match(badPair.stderr + badPair.stdout, /not the forward expected|paired forward/i);

    const missing = createFixture();
    const missingForward = approveForward(missing.inputPath);
    const missingForwardPath = path.join(missing.dir, 'approved-forward.json');
    writeInput(missingForwardPath, missingForward);
    assert.strictEqual(runCli(missing, 'apply', missing.backupPath).status, 0);
    writeInput(missing.inputPath, rollbackInput(missingForward));
    const missingDb = new Database(missing.dbPath);
    missingDb.prepare('DELETE FROM products WHERE id = 1').run();
    missingDb.close();
    const missingResult = runCli(missing, 'dry-run', '', missingForwardPath);
    assert.notStrictEqual(missingResult.status, 0);
    assert.match(missingResult.stderr + missingResult.stdout, /did not match a row/i);

    const status = createFixture();
    const statusForward = approveForward(status.inputPath);
    const statusForwardPath = path.join(status.dir, 'approved-forward.json');
    writeInput(statusForwardPath, statusForward);
    assert.strictEqual(runCli(status, 'apply', status.backupPath).status, 0);
    writeInput(status.inputPath, rollbackInput(statusForward));
    const statusDb = new Database(status.dbPath);
    statusDb.prepare("UPDATE products SET status = 'deleted' WHERE id = 1").run();
    statusDb.close();
    const statusResult = runCli(status, 'dry-run', '', statusForwardPath);
    assert.notStrictEqual(statusResult.status, 0);
    assert.match(statusResult.stderr + statusResult.stdout, /deleted|status mismatch/i);
}

async function testTransactionRevalidationBlocksConcurrentChange() {
    const fixture = createFixture();
    approveForward(fixture.inputPath);
    const report = await runProductFieldPatch({
        mode: 'apply',
        inputPath: fixture.inputPath,
        dbPath: fixture.dbPath,
        reportPath: fixture.reportPath,
        backupPath: fixture.backupPath,
        policy: getProductFieldPatchPolicy('arabic-seo-v1'),
        policyExplicit: true,
        beforeApplyTransaction: function () {
            const concurrent = new Database(fixture.dbPath);
            concurrent.prepare("UPDATE products SET short_desc_ar = 'مصدر عدله مستخدم آخر', version = version + 1 WHERE id = 1").run();
            concurrent.close();
        }
    });
    assert.strictEqual(report.databaseChanged, false);
    assert.ok(report.blockers.some(function (blocker) { return /expectedVersion|sourceExpected|sourceSnapshotHash/.test(blocker); }));
    const rows = readProducts(fixture.dbPath);
    assert.strictEqual(rows[0].seo_title_ar, null);
    assert.strictEqual(rows[1].seo_title_ar, null);
}

async function main() {
    testForwardDryRunAndNullSafeApply();
    testForwardIdentitySetVersionAndSourceGuards();
    testRollbackUsesDirectionSpecificRules();
    testRollbackBlocksManualSeoChange();
    testRollbackRequiresStrictApprovedPairAndOriginalRows();
    await testTransactionRevalidationBlocksConcurrentChange();
    console.log('product Arabic SEO patch tests passed');
}

main().catch(function (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
});
