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
const ADMIN_USERNAME = 'product-order-test-admin';
const ADMIN_PASSWORD = 'ProductOrderTestPassword-2026';
const SCREENSHOT_DIR = process.env.PRODUCT_ORDERING_SCREENSHOT_DIR
    ? path.resolve(process.env.PRODUCT_ORDERING_SCREENSHOT_DIR)
    : '';

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

function request(port, method, urlPath, body, token) {
    const rawBody = body == null ? '' : JSON.stringify(body);
    const headers = {};
    if (rawBody) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(rawBody);
    }
    if (token) headers.Authorization = 'Bearer ' + token;
    return new Promise(function (resolve, reject) {
        const req = http.request({ hostname: '127.0.0.1', port, method, path: urlPath, headers, timeout: 5000 }, function (res) {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) { raw += chunk; });
            res.on('end', function () {
                let parsed = raw;
                try { parsed = raw ? JSON.parse(raw) : null; } catch (error) {}
                resolve({ status: res.statusCode, body: parsed, raw });
            });
        });
        req.once('timeout', function () { req.destroy(new Error('request timeout')); });
        req.once('error', reject);
        if (rawBody) req.write(rawBody);
        req.end();
    });
}

async function waitForServer(port, child, output) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (child.exitCode != null) throw new Error('test server exited early:\n' + output.value);
        try {
            const response = await request(port, 'GET', '/api/health');
            if (response.status === 200) return;
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

function responseData(response) {
    assert.ok(response.body && response.body.ok, response.raw);
    return response.body.data;
}

function seedDatabase(dbPath) {
    const db = new Database(dbPath);
    db.exec(SCHEMA_SQL);
    const insertParent = db.prepare(`
        INSERT INTO categories (id, type, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order)
        VALUES (@id, 'product', @slug, @name_en, '', '', '', 1, @sort_order)
    `);
    insertParent.run({ id: 1, slug: 'ordering-parent', name_en: 'Ordering parent', sort_order: 1 });
    insertParent.run({ id: 4, slug: 'energy-parent', name_en: 'Energy parent', sort_order: 2 });
    const insertCategory = db.prepare(`
        INSERT INTO categories (id, type, parent_id, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order)
        VALUES (@id, 'product', @parent_id, @slug, @name_en, '', '', '', 1, @sort_order)
    `);
    insertCategory.run({ id: 2, parent_id: 1, slug: 'ordering-child-a', name_en: 'Ordering child A', sort_order: 1 });
    insertCategory.run({ id: 3, parent_id: 1, slug: 'ordering-child-b', name_en: 'Ordering child B', sort_order: 2 });
    insertCategory.run({ id: 5, parent_id: 4, slug: 'energy-child', name_en: 'Energy child', sort_order: 1 });
    const insert = db.prepare(`
        INSERT INTO products
            (id, legacy_id, slug, category_id, status, sort_order, name_en, name_ar, name_fr, name_ru, version, created_at, updated_at)
        VALUES
            (@id, @legacy_id, @slug, @category_id, @status, @sort_order, @name_en, @name_ar, @name_fr, @name_ru, @version, 1, 1)
    `);
    [
        { id: 1, category_id: 2, legacy_id: 'order-one', slug: 'order-one', status: 'published', sort_order: 10, name_en: 'Order one', name_ar: 'المنتج الأول', name_fr: 'Produit un', name_ru: 'Продукт один', version: 4 },
        { id: 2, category_id: 3, legacy_id: 'order-two', slug: 'order-two', status: 'draft', sort_order: 20, name_en: 'Order two', name_ar: 'المنتج الثاني', name_fr: 'Produit deux', name_ru: 'Продукт два', version: 5 },
        { id: 3, category_id: 2, legacy_id: 'order-three', slug: 'order-three', status: 'published', sort_order: 30, name_en: 'Order three', name_ar: 'المنتج الثالث', name_fr: 'Produit trois', name_ru: 'Продукт три', version: 6 },
        { id: 5, category_id: 3, legacy_id: 'order-five', slug: 'order-five', status: 'published', sort_order: 40, name_en: 'Order five', name_ar: 'المنتج الخامس', name_fr: 'Produit cinq', name_ru: 'Продукт пять', version: 8 },
        { id: 6, category_id: 2, legacy_id: 'order-six', slug: 'order-six', status: 'draft', sort_order: 50, name_en: 'Order six', name_ar: 'المنتج السادس', name_fr: 'Produit six', name_ru: 'Продукт шесть', version: 9 },
        { id: 7, category_id: 5, legacy_id: 'order-seven', slug: 'order-seven', status: 'published', sort_order: 60, name_en: 'Order seven', name_ar: 'المنتج السابع', name_fr: 'Produit sept', name_ru: 'Продукт семь', version: 10 },
        { id: 8, category_id: 2, legacy_id: 'order-deleted', slug: 'order-deleted', status: 'deleted', sort_order: 70, name_en: 'Deleted product', name_ar: '', name_fr: '', name_ru: '', version: 11 }
    ].forEach(function (row) { insert.run(row); });
    db.close();
}

function productSnapshot(dbPath) {
    const db = new Database(dbPath, { readonly: true });
    try {
        return db.prepare(`
            SELECT id, category_id, status, sort_order, version, name_en, name_ar, name_fr, name_ru, updated_at
            FROM products
            ORDER BY id
        `).all();
    } finally {
        db.close();
    }
}

function nonOrderSnapshot(rows) {
    return rows.map(function (row) {
        const copy = Object.assign({}, row);
        delete copy.sort_order;
        return copy;
    });
}

async function runApiChecks(port, dbPath, token) {
    const unauthorized = await request(port, 'GET', '/api/admin/products/order');
    assert.strictEqual(unauthorized.status, 401, unauthorized.raw);

    const beforeRows = productSnapshot(dbPath);
    const initialResponse = await request(port, 'GET', '/api/admin/products/order', null, token);
    assert.strictEqual(initialResponse.status, 200, initialResponse.raw);
    const initial = responseData(initialResponse);
    assert.deepStrictEqual(initial.items.map(function (item) { return item.id; }), [1, 2, 3, 5, 6, 7]);
    assert.ok(/^[a-f0-9]{64}$/.test(initial.order_token));
    assert.strictEqual(initial.items[0].category_id, 2);
    assert.strictEqual(initial.items[0].category_name_en, 'Ordering child A');
    assert.strictEqual(initial.items[0].parent_category_name_en, 'Ordering parent');
    assert.strictEqual(initial.items[5].parent_category_name_en, 'Energy parent');

    const reorderedResponse = await request(port, 'PUT', '/api/admin/products/order', {
        ordered_ids: [3, 2, 1, 5, 6, 7],
        expected_order_token: initial.order_token
    }, token);
    assert.strictEqual(reorderedResponse.status, 200, reorderedResponse.raw);
    const reordered = responseData(reorderedResponse);
    assert.strictEqual(reordered.changed, 6);
    assert.deepStrictEqual(reordered.items.map(function (item) { return item.id; }), [3, 2, 1, 5, 6, 7]);
    assert.deepStrictEqual(reordered.items.map(function (item) { return item.sort_order; }), [1, 2, 3, 4, 5, 6]);

    const legacyPublic = await request(port, 'GET', '/api/products');
    assert.strictEqual(legacyPublic.status, 200, legacyPublic.raw);
    assert.deepStrictEqual(legacyPublic.body.map(function (item) { return item.id; }), ['order-three', 'order-one', 'order-five', 'order-seven']);

    for (const locale of ['en', 'ar', 'fr', 'ru']) {
        const localizedPublic = await request(port, 'GET', '/api/products?locale=' + locale);
        assert.strictEqual(localizedPublic.status, 200, localizedPublic.raw);
        assert.deepStrictEqual(
            responseData(localizedPublic).map(function (item) { return item.id; }),
            ['order-three', 'order-one', 'order-five', 'order-seven'],
            locale + ' public product order must follow the admin order'
        );
    }

    const invalidRequests = [
        { body: { ordered_ids: [3, 3, 1, 5, 6, 7], expected_order_token: reordered.order_token }, status: 422 },
        { body: { ordered_ids: [3, 2, 1, 5, 6], expected_order_token: reordered.order_token }, status: 422 },
        { body: { ordered_ids: [3, 2, 1, 5, 6, 7, 8], expected_order_token: reordered.order_token }, status: 422 },
        { body: { ordered_ids: [1, 2, 3, 5, 6, 7], expected_order_token: initial.order_token }, status: 409 }
    ];
    for (const invalid of invalidRequests) {
        const response = await request(port, 'PUT', '/api/admin/products/order', invalid.body, token);
        assert.strictEqual(response.status, invalid.status, response.raw);
        assert.deepStrictEqual(productSnapshot(dbPath).map(function (row) { return row.sort_order; }), [3, 2, 1, 4, 5, 6, 70]);
    }

    const staleCategoryState = responseData(await request(port, 'GET', '/api/admin/products/order', null, token));
    const categoryDb = new Database(dbPath);
    categoryDb.prepare('UPDATE products SET category_id = 3 WHERE id = 1').run();
    categoryDb.close();
    const staleCategorySave = await request(port, 'PUT', '/api/admin/products/order', {
        ordered_ids: staleCategoryState.items.map(function (item) { return item.id; }),
        expected_order_token: staleCategoryState.order_token
    }, token);
    assert.strictEqual(staleCategorySave.status, 409, staleCategorySave.raw);
    const restoreCategoryDb = new Database(dbPath);
    restoreCategoryDb.prepare('UPDATE products SET category_id = 2 WHERE id = 1').run();
    restoreCategoryDb.close();

    const afterRows = productSnapshot(dbPath);
    assert.deepStrictEqual(nonOrderSnapshot(afterRows), nonOrderSnapshot(beforeRows), 'reordering must not mutate product content or versions');
    const auditDb = new Database(dbPath, { readonly: true });
    const audit = auditDb.prepare("SELECT action, before_json, after_json FROM audit_logs WHERE entity_type = 'product_order'").all();
    auditDb.close();
    assert.strictEqual(audit.length, 1);
    assert.strictEqual(audit[0].action, 'reorder');
    assert.deepStrictEqual(JSON.parse(audit[0].before_json), [1, 2, 3, 5, 6, 7]);
    assert.deepStrictEqual(JSON.parse(audit[0].after_json), [3, 2, 1, 5, 6, 7]);

    const createdResponse = await request(port, 'POST', '/api/admin/products', {
        name_en: 'Appended draft product',
        name_ar: 'منتج مسودة مضاف',
        name_fr: 'Produit brouillon ajoute',
        name_ru: 'Добавленный черновик',
        category_id: 2,
        status: 'draft'
    }, token);
    assert.strictEqual(createdResponse.status, 201, createdResponse.raw);
    const created = responseData(createdResponse);
    assert.strictEqual(created.sort_order, 7, 'a product without an explicit order must append to the active list');
    const latestOrder = responseData(await request(port, 'GET', '/api/admin/products/order', null, token));
    assert.deepStrictEqual(latestOrder.items.map(function (item) { return item.id; }), [3, 2, 1, 5, 6, 7, created.id]);
}

async function runBrowserChecks(port) {
    const browser = await chromium.launch({ headless: true });
    try {
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
        await page.locator('a[data-view="products"]').click();
        await page.locator('#view-products.active').waitFor();
        await page.locator('#btn-sort-products').click();
        await page.locator('#product-sort-modal.show').waitFor();
        const rows = page.locator('#product-sort-list [data-order-id]');
        await rows.first().waitFor();
        const beforeItems = await rows.evaluateAll(function (nodes) {
            return nodes.map(function (node) {
                return { id: Number(node.dataset.orderId), categoryId: Number(node.dataset.categoryId) };
            });
        });
        const beforeIds = beforeItems.map(function (item) { return item.id; });
        assert.strictEqual(beforeIds.length, 7);
        if (SCREENSHOT_DIR) {
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'product-ordering-desktop.png'), fullPage: true });
        }
        assert.strictEqual(await page.locator('#product-sort-list [data-order-move]').count(), 0, 'slow up/down controls must be removed');
        assert.ok(await page.locator('#product-sort-list .product-sort-handle').first().isVisible(), 'drag handle must remain for nearby moves');
        await rows.first().locator('.product-sort-position-input').fill('0');
        await rows.first().locator('.product-sort-position-input').press('Enter');
        assert.strictEqual(await rows.first().locator('.product-sort-position-input').getAttribute('aria-invalid'), 'true');
        assert.deepStrictEqual(await rows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), beforeIds);

        await rows.first().locator('.product-sort-position-input').fill(String(beforeIds.length));
        await rows.first().locator('.product-sort-position-input').press('Enter');
        const expectedGlobalIds = beforeIds.slice(1).concat(beforeIds[0]);
        assert.deepStrictEqual(await rows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), expectedGlobalIds);
        await rows.nth(1).locator('.product-sort-position-input').fill('99');
        await rows.nth(1).locator('.product-sort-position-input').press('Enter');
        assert.strictEqual(await page.locator('#product-sort-save').isDisabled(), true, 'an invalid position must block saving prior valid moves');
        await rows.nth(1).locator('.product-sort-position-input').fill('2');
        await rows.nth(1).locator('.product-sort-position-input').press('Enter');
        assert.strictEqual(await page.locator('#product-sort-save').isEnabled(), true);

        await page.locator('[data-order-scope="category"]').click();
        await page.locator('#product-sort-category').selectOption('2');
        assert.strictEqual(await page.locator('#product-sort-category optgroup[label="Ordering parent"]').count(), 1);
        if (SCREENSHOT_DIR) {
            await page.locator('#product-sort-modal .modal').screenshot({ path: path.join(SCREENSHOT_DIR, 'product-ordering-category-desktop.png') });
        }
        const categoryRows = page.locator('#product-sort-list [data-order-id]');
        const categoryBeforeIds = expectedGlobalIds.filter(function (id) {
            return beforeItems.find(function (item) { return item.id === id; }).categoryId === 2;
        });
        assert.deepStrictEqual(await categoryRows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), categoryBeforeIds);
        await categoryRows.first().locator('.product-sort-position-input').fill(String(categoryBeforeIds.length));
        await categoryRows.first().locator('.product-sort-position-input').press('Enter');
        const expectedCategoryIds = categoryBeforeIds.slice(1).concat(categoryBeforeIds[0]);
        assert.deepStrictEqual(await categoryRows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), expectedCategoryIds);

        await page.locator('[data-order-scope="all"]').click();
        const categorySlots = [];
        expectedGlobalIds.forEach(function (id, index) {
            if (beforeItems.find(function (item) { return item.id === id; }).categoryId === 2) categorySlots.push(index);
        });
        const expectedIds = expectedGlobalIds.slice();
        categorySlots.forEach(function (slot, index) { expectedIds[slot] = expectedCategoryIds[index]; });
        assert.deepStrictEqual(await rows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), expectedIds);
        const untouchedSlots = expectedGlobalIds.map(function (id, index) { return { id, index }; }).filter(function (entry) {
            return beforeItems.find(function (item) { return item.id === entry.id; }).categoryId !== 2;
        });
        untouchedSlots.forEach(function (entry) {
            assert.strictEqual(expectedIds[entry.index], entry.id, 'category move must preserve every other category slot');
        });
        page.once('dialog', function (dialog) { dialog.dismiss(); });
        await page.keyboard.press('Escape');
        assert.strictEqual(await page.locator('#product-sort-modal').getAttribute('class').then(function (value) {
            return value.indexOf('show') !== -1;
        }), true, 'dismissing the dirty-order warning must keep the modal open');
        await page.locator('#product-sort-save').click();
        await page.locator('#product-sort-modal').waitFor({ state: 'hidden' });

        const legacyCategoryResponse = await page.request.get('http://127.0.0.1:' + port + '/api/products?category=ordering-child-a');
        assert.strictEqual(legacyCategoryResponse.status(), 200);
        assert.deepStrictEqual((await legacyCategoryResponse.json()).map(function (item) { return item.id; }), ['order-three', 'order-one']);
        for (const locale of ['en', 'ar', 'fr', 'ru']) {
            const categoryResponse = await page.request.get(
                'http://127.0.0.1:' + port + '/api/products?locale=' + locale + '&category=ordering-child-a'
            );
            assert.strictEqual(categoryResponse.status(), 200);
            const categoryPayload = await categoryResponse.json();
            assert.deepStrictEqual(
                categoryPayload.data.map(function (item) { return item.id; }),
                ['order-three', 'order-one'],
                locale + ' category page order must follow the saved category-relative order'
            );
        }

        await page.locator('#btn-sort-products').click();
        await page.locator('#product-sort-modal.show').waitFor();
        await rows.first().waitFor();
        assert.deepStrictEqual(await rows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), expectedIds, 'saved order must survive a modal reload');

        await page.locator('[data-order-scope="category"]').click();
        await page.locator('#product-sort-category').selectOption('2');
        assert.deepStrictEqual(await categoryRows.evaluateAll(function (nodes) { return nodes.map(function (node) { return Number(node.dataset.orderId); }); }), expectedCategoryIds, 'saved category order must survive a modal reload');

        await page.setViewportSize({ width: 390, height: 844 });
        const overflow = await page.locator('#product-sort-modal .modal').evaluate(function (node) {
            return node.scrollWidth > node.clientWidth + 1;
        });
        assert.strictEqual(overflow, false, 'product ordering modal must not overflow the mobile viewport');
        assert.strictEqual(await page.locator('#product-sort-list .product-sort-position-input').first().isVisible(), true);
        if (SCREENSHOT_DIR) {
            await page.waitForTimeout(350);
            await page.locator('#product-sort-modal .modal').screenshot({ path: path.join(SCREENSHOT_DIR, 'product-ordering-mobile.png') });
        }
        assert.deepStrictEqual(errors, [], 'browser console/page errors:\n' + errors.join('\n'));
    } finally {
        await browser.close();
    }
}

async function main() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-product-ordering-'));
    const dbPath = path.join(directory, 'test.db');
    seedDatabase(dbPath);
    const port = await availablePort();
    const output = { value: '' };
    const child = childProcess.spawn(process.execPath, ['server/app.js'], {
        cwd: ROOT,
        env: Object.assign({}, process.env, {
            PORT: String(port),
            HOST: '127.0.0.1',
            NODE_ENV: 'test',
            DB_PATH: dbPath,
            ADMIN_USERNAME,
            ADMIN_PASSWORD,
            JWT_SECRET: 'product-order-test-secret',
            PUBLIC_TRANSLATION_READ_SOURCE: 'legacy'
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', function (chunk) { output.value += chunk.toString(); });
    child.stderr.on('data', function (chunk) { output.value += chunk.toString(); });

    try {
        await waitForServer(port, child, output);
        const login = await request(port, 'POST', '/api/auth/login', { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
        assert.strictEqual(login.status, 200, login.raw);
        await runApiChecks(port, dbPath, login.body.token);
        await runBrowserChecks(port);
        console.log('Product ordering API, public linkage, and browser tests passed.');
    } finally {
        await stopServer(child);
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

main().catch(function (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
