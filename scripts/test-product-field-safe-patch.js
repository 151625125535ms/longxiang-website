const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { forwardContentSha256 } = require('./lib/product-arabic-seo-patch-pair');

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
            short_desc_ar TEXT,
            short_desc_fr TEXT,
            short_desc_ru TEXT,
            description_en TEXT,
            description_ar TEXT,
            description_fr TEXT,
            description_ru TEXT,
            seo_title TEXT,
            seo_title_fr TEXT,
            seo_title_ru TEXT,
            seo_description TEXT,
            seo_description_fr TEXT,
            seo_description_ru TEXT,
            seo_keywords_fr TEXT,
            seo_keywords_ru TEXT
        );
    `);
    db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, status, version, updated_at, name_en, name_ar,
            short_desc_ar, description_en, description_ru, short_desc_ru,
            seo_title, seo_description
        )
        VALUES (
            1, 'legacy-product', 'sample-product', 'published', 3, '2026-01-01T00:00:00.000Z',
            'English name', 'Arabic name', 'وصف عربي 10kV ONAN', 'English description',
            'Текст 230Vac (single-phase), 25.', 'Project-specific value',
            'Sample Transformer | Longxiang',
            'Review product information for Sample Transformer from Longxiang Electric. Contact us to discuss project requirements or request a quotation.'
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

function createSearchCopyFixture() {
    const fixture = createFixture();
    const input = {
        meta: {
            policy: 'search-copy-v1',
            operation: 'forward',
            counts: { products: 1 }
        },
        products: [
            {
                slug: 'sample-product',
                expected: {
                    seo_title: 'Sample Transformer | Longxiang',
                    seo_description: 'Review product information for Sample Transformer from Longxiang Electric. Contact us to discuss project requirements or request a quotation.',
                    name_en: 'English name',
                    name_ar: 'Arabic name',
                    short_desc_ar: 'وصف عربي 10kV ONAN'
                },
                target: {
                    seo_title: 'Sample Distribution Transformer | Longxiang',
                    seo_description: 'Review product information for Sample Distribution Transformer from Longxiang Electric. Contact us to discuss project requirements or request a quotation.',
                    name_en: 'English product name',
                    name_ar: 'اسم المنتج بالعربية',
                    short_desc_ar: 'وصف عربي محدث 10kV ONAN'
                }
            }
        ]
    };
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');
    return fixture;
}

function createArabicModelCodeFixture() {
    const fixture = createFixture();
    const expected = {
        name_ar: 'محول توزيع S(S)H15-M',
        short_desc_ar: 'محول S(S)H15-M مع مرجع سلسلة S(S)H15-M.',
        description_ar: 'يعتمد S(S)H15-M على قلب غير متبلور، ومرجع النموذج S(S)H15-M.'
    };
    const db = new Database(fixture.dbPath);
    db.prepare(`
        UPDATE products
        SET name_ar = @name_ar,
            short_desc_ar = @short_desc_ar,
            description_ar = @description_ar
        WHERE id = 1
    `).run(expected);
    db.close();

    const target = Object.fromEntries(Object.entries(expected).map(([field, value]) => [
        field,
        value.split('S(S)H').join('S(B)H')
    ]));
    const input = {
        meta: {
            policy: 'arabic-model-code-correction-v1',
            operation: 'forward',
            approval_status: 'pending',
            model_code_from: 'S(S)H',
            model_code_to: 'S(B)H',
            counts: { products: 1, fields: 3 }
        },
        products: [{
            row_id: 1,
            slug: 'sample-product',
            legacy_id: 'legacy-product',
            status: 'published',
            expectedVersion: 3,
            expected,
            target
        }]
    };
    fs.writeFileSync(fixture.inputPath, JSON.stringify(input, null, 2), 'utf8');
    return fixture;
}

function readProduct(dbPath) {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT * FROM products WHERE slug = ?').get('sample-product');
    db.close();
    return row;
}

function readInput(inputPath) {
    return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
}

function writeInput(inputPath, input) {
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2), 'utf8');
}

function runSearchCopy(fixture, mode, extraArgs) {
    return runNode([
        scriptPath,
        '--policy', 'search-copy-v1',
        mode === 'apply' ? '--apply' : '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ].concat(extraArgs || []));
}

function runArabicModelCode(fixture, mode, extraArgs) {
    return runNode([
        scriptPath,
        '--policy', 'arabic-model-code-correction-v1',
        mode === 'apply' ? '--apply' : '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ].concat(extraArgs || []));
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

function testSearchCopyPolicyAcceptsExactFields() {
    const fixture = createSearchCopyFixture();
    const before = readProduct(fixture.dbPath);
    const result = runNode([
        scriptPath,
        '--policy', 'search-copy-v1',
        '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.deepStrictEqual(readProduct(fixture.dbPath), before);
    const report = fs.readFileSync(fixture.reportPath, 'utf8');
    assert.match(report, /Policy: search-copy-v1/);
    assert.match(report, /Field changes: 5/);
}

function testDefaultPolicyRejectsSearchCopyFields() {
    const fixture = createSearchCopyFixture();
    const input = readInput(fixture.inputPath);
    delete input.meta.policy;
    writeInput(fixture.inputPath, input);
    const result = runNode([
        scriptPath,
        '--dry-run',
        '--input', fixture.inputPath,
        '--db', fixture.dbPath,
        '--report', fixture.reportPath
    ]);

    assert.notStrictEqual(result.status, 0, 'default policy must reject search-copy fields');
    assert.match(result.stderr + result.stdout, /unsupported.*seo_title|fr-ru-localization-v1/i);
}

function testSearchCopyPolicyRejectsUnsupportedFields() {
    const fixture = createSearchCopyFixture();
    const input = readInput(fixture.inputPath);
    input.products[0].expected.description_en = 'English description';
    input.products[0].target.description_en = 'Changed English description';
    input.products[0].expected.seo_title_fr = '';
    input.products[0].target.seo_title_fr = 'Titre interdit';
    writeInput(fixture.inputPath, input);
    const result = runSearchCopy(fixture, 'dry-run');

    assert.notStrictEqual(result.status, 0, 'search-copy policy must reject frozen fields');
    assert.match(result.stderr + result.stdout, /unsupported.*description_en|unsupported.*seo_title_fr/i);
}

function testPolicyMetadataGuardrails() {
    const missing = createSearchCopyFixture();
    const missingInput = readInput(missing.inputPath);
    delete missingInput.meta.policy;
    writeInput(missing.inputPath, missingInput);
    const missingResult = runSearchCopy(missing, 'dry-run');
    assert.notStrictEqual(missingResult.status, 0, 'explicit policy must require input meta.policy');
    assert.match(missingResult.stderr + missingResult.stdout, /requires meta\.policy/i);

    const mismatch = createSearchCopyFixture();
    const mismatchInput = readInput(mismatch.inputPath);
    mismatchInput.meta.policy = 'fr-ru-localization-v1';
    writeInput(mismatch.inputPath, mismatchInput);
    const mismatchResult = runSearchCopy(mismatch, 'dry-run');
    assert.notStrictEqual(mismatchResult.status, 0, 'CLI/input policy mismatch must fail');
    assert.match(mismatchResult.stderr + mismatchResult.stdout, /does not match CLI policy/i);

    const unknown = createSearchCopyFixture();
    const unknownResult = runNode([
        scriptPath,
        '--policy', 'search-copy-v99',
        '--dry-run',
        '--input', unknown.inputPath,
        '--db', unknown.dbPath,
        '--report', unknown.reportPath
    ]);
    assert.notStrictEqual(unknownResult.status, 0, 'unknown policy must fail');
    assert.match(unknownResult.stderr + unknownResult.stdout, /Unknown product field patch policy/i);
}

function testSearchCopyApplyUpdatesOnlyApprovedFieldsAndBacksUp() {
    const fixture = createSearchCopyFixture();
    const before = readProduct(fixture.dbPath);
    const result = runSearchCopy(fixture, 'apply', ['--backup', fixture.backupPath]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.ok(fs.existsSync(fixture.backupPath), 'search-copy apply must create backup');
    const after = readProduct(fixture.dbPath);
    assert.strictEqual(after.seo_title, 'Sample Distribution Transformer | Longxiang');
    assert.strictEqual(after.seo_description, 'Review product information for Sample Distribution Transformer from Longxiang Electric. Contact us to discuss project requirements or request a quotation.');
    assert.strictEqual(after.name_en, 'English product name');
    assert.strictEqual(after.name_ar, 'اسم المنتج بالعربية');
    assert.strictEqual(after.short_desc_ar, 'وصف عربي محدث 10kV ONAN');
    assert.strictEqual(after.description_en, before.description_en);
    assert.strictEqual(after.description_ar, before.description_ar);
    assert.strictEqual(after.version, before.version + 1);
    const report = fs.readFileSync(fixture.reportPath, 'utf8');
    assert.match(report, /Policy: search-copy-v1/);
    assert.match(report, /Database changed: yes/);
    assert.match(report, /Field changes: 5/);
}

function testSearchCopyExpectedValueMismatchFails() {
    const fixture = createSearchCopyFixture();
    const input = readInput(fixture.inputPath);
    input.products[0].expected.seo_title = 'Not the database value';
    writeInput(fixture.inputPath, input);
    const result = runSearchCopy(fixture, 'dry-run');

    assert.notStrictEqual(result.status, 0, 'search-copy expected mismatch must fail');
    assert.match(result.stderr + result.stdout, /expected value mismatch/i);
}

function testSearchCopyEmptyChangeDoesNotWrite() {
    const fixture = createSearchCopyFixture();
    const input = readInput(fixture.inputPath);
    input.products[0].target = Object.assign({}, input.products[0].expected);
    writeInput(fixture.inputPath, input);
    const before = readProduct(fixture.dbPath);
    const result = runSearchCopy(fixture, 'apply', ['--backup', fixture.backupPath]);

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const after = readProduct(fixture.dbPath);
    assert.deepStrictEqual(after, before);
    assert.match(fs.readFileSync(fixture.reportPath, 'utf8'), /Database changed: no/);
}

function testSearchCopyRollbackPatchDryRunsAfterApply() {
    const fixture = createSearchCopyFixture();
    const forward = readInput(fixture.inputPath);
    const applyResult = runSearchCopy(fixture, 'apply', ['--backup', fixture.backupPath]);
    assert.strictEqual(applyResult.status, 0, applyResult.stderr || applyResult.stdout);

    const rollback = {
        meta: { policy: 'search-copy-v1', operation: 'rollback', counts: { products: 1 } },
        products: forward.products.map((item) => ({
            slug: item.slug,
            expected: item.target,
            target: item.expected
        }))
    };
    writeInput(fixture.inputPath, rollback);
    const rollbackResult = runSearchCopy(fixture, 'dry-run');
    assert.strictEqual(rollbackResult.status, 0, rollbackResult.stderr || rollbackResult.stdout);
    assert.match(fs.readFileSync(fixture.reportPath, 'utf8'), /Field changes: 5/);
}

function testSearchCopyFieldValidators() {
    const ellipsis = createSearchCopyFixture();
    const ellipsisInput = readInput(ellipsis.inputPath);
    ellipsisInput.products[0].target.seo_description = 'This deliberately invalid meta description ends with an artificial truncation marker and must be rejected before any database operation can start...';
    writeInput(ellipsis.inputPath, ellipsisInput);
    const ellipsisResult = runSearchCopy(ellipsis, 'dry-run');
    assert.notStrictEqual(ellipsisResult.status, 0, 'ellipsis description must fail');
    assert.match(ellipsisResult.stderr + ellipsisResult.stdout, /ellipsis|120-170/i);

    const tokenLoss = createSearchCopyFixture();
    const tokenInput = readInput(tokenLoss.inputPath);
    tokenInput.products[0].target.short_desc_ar = 'وصف عربي محدث';
    writeInput(tokenLoss.inputPath, tokenInput);
    const tokenResult = runSearchCopy(tokenLoss, 'dry-run');
    assert.notStrictEqual(tokenResult.status, 0, 'Arabic token loss must fail');
    assert.match(tokenResult.stderr + tokenResult.stdout, /numeric tokens|unit tokens|code tokens/i);
}

function testArabicModelCodeDryRunIsReadOnlyAndStrictlyScoped() {
    const fixture = createArabicModelCodeFixture();
    const before = readProduct(fixture.dbPath);
    const result = runArabicModelCode(fixture, 'dry-run');

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.deepStrictEqual(readProduct(fixture.dbPath), before);
    const report = fs.readFileSync(fixture.reportPath, 'utf8');
    assert.match(report, /Policy: arabic-model-code-correction-v1/);
    assert.match(report, /Database changed: no/);
    assert.match(report, /Field changes: 3/);
}

function testArabicModelCodeRejectsExtraEditsAndMissingFields() {
    const extraEdit = createArabicModelCodeFixture();
    const extraInput = readInput(extraEdit.inputPath);
    extraInput.products[0].target.description_ar += ' تعديل إضافي';
    writeInput(extraEdit.inputPath, extraInput);
    const extraResult = runArabicModelCode(extraEdit, 'dry-run');
    assert.notStrictEqual(extraResult.status, 0, 'extra Arabic copy edits must fail');
    assert.match(extraResult.stderr + extraResult.stdout, /must only replace every exact/i);

    const missing = createArabicModelCodeFixture();
    const missingInput = readInput(missing.inputPath);
    delete missingInput.products[0].expected.description_ar;
    delete missingInput.products[0].target.description_ar;
    writeInput(missing.inputPath, missingInput);
    const missingResult = runArabicModelCode(missing, 'dry-run');
    assert.notStrictEqual(missingResult.status, 0, 'all three Arabic source fields are required');
    assert.match(missingResult.stderr + missingResult.stdout, /missing target\.description_ar|missing expected\.description_ar/i);
}

function testArabicModelCodeApplyApprovalAndRollbackDryRun() {
    const pending = createArabicModelCodeFixture();
    const pendingResult = runArabicModelCode(pending, 'apply', ['--backup', pending.backupPath]);
    assert.notStrictEqual(pendingResult.status, 0, 'pending correction must not apply');
    assert.match(pendingResult.stderr + pendingResult.stdout, /approval_status.*approved/i);

    const fixture = createArabicModelCodeFixture();
    const forward = readInput(fixture.inputPath);
    const pairedForwardPath = path.join(fixture.dir, 'paired-forward.json');
    forward.meta.approval_status = 'approved';
    writeInput(fixture.inputPath, forward);
    writeInput(pairedForwardPath, forward);
    const before = readProduct(fixture.dbPath);
    const applyResult = runArabicModelCode(fixture, 'apply', ['--backup', fixture.backupPath]);
    assert.strictEqual(applyResult.status, 0, applyResult.stderr || applyResult.stdout);
    const after = readProduct(fixture.dbPath);
    assert.strictEqual(after.name_ar, forward.products[0].target.name_ar);
    assert.strictEqual(after.short_desc_ar, forward.products[0].target.short_desc_ar);
    assert.strictEqual(after.description_ar, forward.products[0].target.description_ar);
    assert.strictEqual(after.description_en, before.description_en);
    assert.strictEqual(after.version, before.version + 1);

    const rollback = {
        meta: {
            policy: 'arabic-model-code-correction-v1',
            operation: 'rollback',
            forward_content_sha256: forwardContentSha256(forward),
            model_code_from: 'S(B)H',
            model_code_to: 'S(S)H',
            counts: { products: 1, fields: 3 }
        },
        products: [{
            row_id: 1,
            slug: 'sample-product',
            legacy_id: 'legacy-product',
            status: 'published',
            expected: forward.products[0].target,
            target: forward.products[0].expected
        }]
    };
    writeInput(fixture.inputPath, rollback);
    const rollbackResult = runArabicModelCode(fixture, 'dry-run', ['--paired-forward', pairedForwardPath]);
    assert.strictEqual(rollbackResult.status, 0, rollbackResult.stderr || rollbackResult.stdout);
    assert.match(fs.readFileSync(fixture.reportPath, 'utf8'), /Field changes: 3/);
}

function testArabicModelCodeRejectsForwardDisguisedAsRollback() {
    const fixture = createArabicModelCodeFixture();
    const forward = readInput(fixture.inputPath);
    const pairedForwardPath = path.join(fixture.dir, 'paired-forward.json');
    writeInput(pairedForwardPath, forward);
    forward.meta.operation = 'rollback';
    forward.meta.forward_content_sha256 = forwardContentSha256(readInput(pairedForwardPath));
    writeInput(fixture.inputPath, forward);

    const result = runArabicModelCode(fixture, 'dry-run', ['--paired-forward', pairedForwardPath]);
    assert.notStrictEqual(result.status, 0, 'forward direction must not masquerade as rollback');
    assert.match(result.stderr + result.stdout, /rollback must use model-code direction|not the forward target/i);
}

testDryRunDoesNotChangeDatabase();
testApplyUpdatesOnlyAllowedFieldsAndBacksUpDatabase();
testRejectsUnsupportedNeutralField();
testRejectsExpectedValueMismatch();
testApplyRequiresBackup();
testSearchCopyPolicyAcceptsExactFields();
testDefaultPolicyRejectsSearchCopyFields();
testSearchCopyPolicyRejectsUnsupportedFields();
testPolicyMetadataGuardrails();
testSearchCopyApplyUpdatesOnlyApprovedFieldsAndBacksUp();
testSearchCopyExpectedValueMismatchFails();
testSearchCopyEmptyChangeDoesNotWrite();
testSearchCopyRollbackPatchDryRunsAfterApply();
testSearchCopyFieldValidators();
testArabicModelCodeDryRunIsReadOnlyAndStrictlyScoped();
testArabicModelCodeRejectsExtraEditsAndMissingFields();
testArabicModelCodeApplyApprovalAndRollbackDryRun();
testArabicModelCodeRejectsForwardDisguisedAsRollback();
console.log('product field safe patch tests passed');
