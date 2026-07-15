'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_SQL = fs.readFileSync(path.join(ROOT, 'server', 'db', 'schema.sql'), 'utf8');
const ADMIN_USERNAME = 'translation-stage-b-browser';
const ADMIN_PASSWORD = 'TranslationBrowserPassword-2026';

function availablePort() {
    return new Promise(function (resolve, reject) {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', function () {
            const port = server.address().port;
            server.close(function () { resolve(port); });
        });
    });
}

function health(port) {
    return new Promise(function (resolve, reject) {
        const request = http.get('http://127.0.0.1:' + port + '/api/health', function (response) {
            response.resume();
            resolve(response.statusCode);
        });
        request.on('error', reject);
    });
}

async function waitForServer(port, child, output) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (child.exitCode != null) throw new Error('test server exited early:\n' + output.value);
        try {
            if (await health(port) === 200) return;
        } catch (error) {}
        await new Promise(function (resolve) { setTimeout(resolve, 150); });
    }
    throw new Error('test server did not become ready:\n' + output.value);
}

function stopServer(child) {
    if (!child || child.exitCode != null) return Promise.resolve();
    return new Promise(function (resolve) {
        const timer = setTimeout(function () {
            if (child.exitCode == null) child.kill('SIGKILL');
            resolve();
        }, 3000);
        child.once('exit', function () {
            clearTimeout(timer);
            resolve();
        });
        child.kill();
    });
}

async function confirmDialog(page) {
    await page.locator('#confirm-overlay').waitFor({ state: 'visible' });
    await page.locator('#confirm-ok').click();
}

async function main() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-translation-browser-'));
    const dbPath = path.join(directory, 'test.db');
    const db = new Database(dbPath);
    db.exec(SCHEMA_SQL);
    db.prepare(`
        INSERT INTO categories (id, type, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order)
        VALUES (1, 'product', 'browser-parent', 'Browser parent', 'فئة رئيسية', 'Parent', 'Родитель', 1, 1)
    `).run();
    db.prepare(`
        INSERT INTO categories (id, type, parent_id, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order)
        VALUES (2, 'product', 1, 'browser-child', 'Browser child', 'فئة فرعية', 'Enfant', 'Дочерняя', 1, 1)
    `).run();
    db.prepare(`
        INSERT INTO products
            (id, legacy_id, slug, status, category_id, name_en, name_ar, name_fr, name_ru, version, created_at, updated_at)
        VALUES
            (1, 'browser-product', 'browser-product', 'published', 2, 'Browser product', 'منتج المتصفح', 'Produit navigateur', 'Продукт браузера', 1, 1, 1)
    `).run();
    db.close();

    const port = await availablePort();
    const output = { value: '' };
    const child = childProcess.spawn(process.execPath, ['server/app.js'], {
        cwd: ROOT,
        env: Object.assign({}, process.env, {
            PORT: String(port),
            DB_PATH: dbPath,
            ADMIN_USERNAME,
            ADMIN_PASSWORD,
            JWT_SECRET: 'translation-stage-b-browser-secret'
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', function (chunk) { output.value += chunk.toString(); });
    child.stderr.on('data', function (chunk) { output.value += chunk.toString(); });

    let browser;
    try {
        await waitForServer(port, child, output);
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on('pageerror', function (error) { errors.push(error.message); });
        page.on('console', function (message) {
            if (message.type() === 'error') errors.push(message.text());
        });

        await page.goto('http://127.0.0.1:' + port + '/admin/login.html');
        await page.locator('#login-username').fill(ADMIN_USERNAME);
        await page.locator('#login-password').fill(ADMIN_PASSWORD);
        await Promise.all([
            page.waitForURL(/\/admin\/index\.html/),
            page.locator('#btn-login').click()
        ]);

        await page.locator('.nav-group[data-group="products"] .nav-group-toggle').click();
        await page.locator('a[data-view="translations"]').click();
        await page.locator('#view-translations.active').waitFor();
        await page.locator('[data-translation-locale="ar"]').click();
        const nameField = page.locator('#translation-field-name');
        await page.waitForFunction(function () {
            var field = document.getElementById('translation-field-name');
            return field && field.getAttribute('dir') === 'rtl';
        });
        await nameField.fill('مسودة واجهة الترجمة');
        await page.locator('#translation-save-draft').click();
        await page.locator('#translation-version-status').getByText('有未发布草稿').waitFor();

        await page.reload();
        await page.locator('#view-translations.active').waitFor();
        await page.locator('[data-translation-locale="ar"]').click();
        await page.waitForFunction(function () {
            var field = document.getElementById('translation-field-name');
            return field && field.getAttribute('dir') === 'rtl';
        });
        assert.strictEqual(await nameField.inputValue(), 'مسودة واجهة الترجمة', 'draft must reload through the real admin page');

        await page.locator('#translation-publish-draft').click();
        await confirmDialog(page);
        await page.locator('#translation-version-status').getByText('已发布').waitFor();

        await nameField.fill('الإصدار الثاني من الواجهة');
        await page.locator('#translation-save-draft').click();
        await page.locator('#translation-publish-draft').click();
        await confirmDialog(page);
        const restoreButton = page.locator('[data-restore-revision]').first();
        await restoreButton.waitFor();
        await restoreButton.click();
        await confirmDialog(page);
        await page.waitForFunction(function () {
            var field = document.getElementById('translation-field-name');
            return field && field.value === 'مسودة واجهة الترجمة';
        });
        assert.strictEqual(await page.locator('#translation-field-name').inputValue(), 'مسودة واجهة الترجمة', 'restore must update the editor to the selected published revision');

        await nameField.fill('تعديل غير محفوظ');
        assert.strictEqual(await page.locator('#translation-publish-draft').isDisabled(), true, 'unsaved editor input must not publish the previous server draft');
        page.once('dialog', function (dialog) { dialog.dismiss(); });
        await page.locator('[data-translation-locale="pt"]').click();
        assert.strictEqual(await page.locator('[data-translation-locale="ar"]').getAttribute('class').then(function (value) {
            return value.indexOf('active') !== -1;
        }), true, 'cancelling the dirty-form prompt must keep the active locale');
        assert.strictEqual(await nameField.inputValue(), 'تعديل غير محفوظ');

        page.once('dialog', function (dialog) { dialog.accept(); });
        await page.locator('[data-translation-locale="pt"]').click();
        await page.locator('.translation-planned-notice').waitFor();
        assert.ok((await page.locator('.translation-planned-notice').textContent()).includes('不会进入前台'));
        assert.strictEqual(await page.locator('[data-translation-locale="pt"] .translation-locale-state').textContent(), '计划中');

        await page.locator('[data-translation-locale="ar"]').click();
        await page.locator('#translation-field-name').fill('مسودة سيتم حذفها');
        await page.locator('#translation-save-draft').click();
        await page.locator('#translation-discard-draft').waitFor({ state: 'visible' });
        await page.locator('#translation-discard-draft').click();
        await confirmDialog(page);
        await page.locator('#translation-version-status').getByText('已发布').waitFor();
        assert.strictEqual(await page.locator('#translation-field-name').inputValue(), 'مسودة واجهة الترجمة', 'discarding a draft must restore the published value');

        const overflow = await page.locator('#view-translations').evaluate(function (node) {
            return node.scrollWidth > node.clientWidth + 1;
        });
        assert.strictEqual(overflow, false, 'translation workspace must not overflow the desktop viewport');
        assert.deepStrictEqual(errors, [], 'browser console/page errors:\n' + errors.join('\n'));

        const verifyDb = new Database(dbPath, { readonly: true });
        const row = verifyDb.prepare('SELECT name_ar FROM products WHERE id = 1').get();
        verifyDb.close();
        assert.strictEqual(row.name_ar, 'مسودة واجهة الترجمة');
    } finally {
        if (browser) await browser.close();
        await stopServer(child);
    }

    console.log('Stage B admin translation browser test passed.');
}

main().catch(function (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
