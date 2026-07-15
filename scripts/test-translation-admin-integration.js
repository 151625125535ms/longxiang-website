'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_SQL = fs.readFileSync(path.join(ROOT, 'server', 'db', 'schema.sql'), 'utf8');
const ADMIN_USERNAME = 'translation-stage-b-admin';
const ADMIN_PASSWORD = 'TranslationStageBPassword-2026';

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
        req.on('timeout', function () { req.destroy(new Error('request timeout')); });
        req.on('error', reject);
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

function data(response) {
    assert.ok(response.body && response.body.ok, response.raw);
    return response.body.data;
}

async function main() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-translation-admin-'));
    const dbPath = path.join(directory, 'test.db');
    const db = new Database(dbPath);
    db.exec(SCHEMA_SQL);
    db.prepare(`
        INSERT INTO categories (id, type, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order)
        VALUES (1, 'product', 'stage-b-category', 'Stage B category', 'فئة المرحلة ب', 'Categorie B', 'Категория B', 1, 1)
    `).run();
    db.prepare(`
        INSERT INTO categories (id, type, parent_id, slug, name_en, name_ar, name_fr, name_ru, is_active, sort_order)
        VALUES (2, 'product', 1, 'stage-b-subcategory', 'Stage B subcategory', 'فئة فرعية ب', 'Sous-categorie B', 'Подкатегория B', 1, 1)
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
            JWT_SECRET: 'translation-stage-b-test-secret'
        }),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', function (chunk) { output.value += chunk.toString(); });
    child.stderr.on('data', function (chunk) { output.value += chunk.toString(); });

    try {
        await waitForServer(port, child, output);
        const login = await request(port, 'POST', '/api/auth/login', { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
        assert.strictEqual(login.status, 200, login.raw);
        const token = login.body.token;

        const localesResponse = await request(port, 'GET', '/api/admin/translations/locales', null, token);
        assert.strictEqual(localesResponse.status, 200, localesResponse.raw);
        const locales = data(localesResponse);
        assert.deepStrictEqual(locales.map(function (locale) { return locale.code; }), ['en', 'ar', 'fr', 'ru', 'pt']);
        assert.strictEqual(locales.find(function (locale) { return locale.code === 'pt'; }).isPublic, false);

        const createdResponse = await request(port, 'POST', '/api/admin/products', {
            name_en: 'Stage B translation product',
            name_ar: 'منتج ترجمة المرحلة ب',
            name_fr: 'Produit de traduction B',
            name_ru: 'Продукт перевода B',
            category_id: 2,
            status: 'published',
            specs: [{ group: 'technical', key: 'Voltage', value: '10', unit: 'kV', sort_order: 0 }]
        }, token);
        assert.strictEqual(createdResponse.status, 201, createdResponse.raw);
        let product = data(createdResponse);
        const originalArabic = product.name_ar;
        assert.ok(product.specs[0].spec_code, 'new product spec must receive stable spec_code');

        const statePath = '/api/admin/translations/product/' + product.id + '/ar';
        const initialStateResponse = await request(port, 'GET', statePath, null, token);
        assert.strictEqual(initialStateResponse.status, 200, initialStateResponse.raw);
        let state = data(initialStateResponse);
        assert.strictEqual(state.published.values.name, originalArabic);
        assert.strictEqual(state.draft, null);

        const firstArabic = 'منتج منشور من مساحة الترجمة';
        const savedResponse = await request(port, 'PUT', statePath, {
            version: 0,
            values: { name: firstArabic, short_description: 'مسودة لا تظهر قبل النشر' },
            specValues: [{ productSpecId: state.specs[0].id, label: 'الجهد', valueText: '10 كيلوفولت' }]
        }, token);
        assert.strictEqual(savedResponse.status, 200, savedResponse.raw);
        state = data(savedResponse);
        assert.strictEqual(state.draft.values.name, firstArabic);

        const beforePublish = await request(port, 'GET', '/api/admin/products/' + product.id, null, token);
        assert.strictEqual(data(beforePublish).name_ar, originalArabic, 'saving a draft must not mutate legacy public fields');

        const reloadedDraft = data(await request(port, 'GET', statePath, null, token));
        assert.strictEqual(reloadedDraft.draft.values.name, firstArabic, 'draft must survive a full API reload');
        const staleSave = await request(port, 'PUT', statePath, { version: 0, values: { name: 'نسخة قديمة' } }, token);
        assert.strictEqual(staleSave.status, 409, staleSave.raw);

        const firstPublish = await request(port, 'POST', statePath + '/publish', {
            draftVersion: reloadedDraft.draft.version,
            publishedRevisionId: reloadedDraft.published.id
        }, token);
        assert.strictEqual(firstPublish.status, 200, firstPublish.raw);
        state = data(firstPublish);
        assert.strictEqual(state.published.values.name, firstArabic);
        assert.strictEqual(state.published.specValues[0].label, 'الجهد');
        product = data(await request(port, 'GET', '/api/admin/products/' + product.id, null, token));
        assert.strictEqual(product.name_ar, firstArabic, 'publishing must mirror the active locale to legacy fields');

        const secondArabic = 'منتج منشور بإصدار ثان';
        const secondDraft = data(await request(port, 'PUT', statePath, {
            version: 0,
            values: { name: secondArabic }
        }, token));
        const secondPublish = data(await request(port, 'POST', statePath + '/publish', {
            draftVersion: secondDraft.draft.version,
            publishedRevisionId: secondDraft.published.id
        }, token));
        assert.strictEqual(secondPublish.published.values.name, secondArabic);
        assert.ok(secondPublish.history.some(function (revision) { return revision.values.name === firstArabic; }));

        const firstRevision = secondPublish.history.find(function (revision) { return revision.values.name === firstArabic; });
        const restored = data(await request(port, 'POST', statePath + '/restore', {
            revisionId: firstRevision.id,
            publishedRevisionId: secondPublish.published.id
        }, token));
        assert.strictEqual(restored.published.values.name, firstArabic);
        product = data(await request(port, 'GET', '/api/admin/products/' + product.id, null, token));
        assert.strictEqual(product.name_ar, firstArabic, 'restoring must mirror the selected historical revision');

        const conflictingDraft = data(await request(port, 'PUT', statePath, {
            version: 0,
            values: { name: 'مسودة تمنع النموذج القديم' }
        }, token));
        const legacyConflict = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            version: product.version,
            name_ar: 'قيمة من النموذج القديم'
        }, token);
        assert.strictEqual(legacyConflict.status, 409, legacyConflict.raw);
        assert.strictEqual(legacyConflict.body.error.code, 'DRAFT_CONFLICT');
        product = data(await request(port, 'GET', '/api/admin/products/' + product.id, null, token));
        assert.strictEqual(product.name_ar, firstArabic, 'draft conflict must roll back the legacy product update');
        const discarded = data(await request(port, 'POST', statePath + '/discard', {
            draftVersion: conflictingDraft.draft.version
        }, token));
        assert.strictEqual(discarded.draft, null);

        const ptPath = '/api/admin/translations/product/' + product.id + '/pt';
        const ptDraft = data(await request(port, 'PUT', ptPath, {
            version: 0,
            values: { name: 'Produto interno planeado' },
            specValues: [{ productSpecId: state.specs[0].id, label: 'Tensao', valueText: '10 kV' }]
        }, token));
        assert.strictEqual(ptDraft.locale.isPublic, false);
        const ptPublished = data(await request(port, 'POST', ptPath + '/publish', {
            draftVersion: ptDraft.draft.version,
            publishedRevisionId: null
        }, token));
        assert.strictEqual(ptPublished.published.values.name, 'Produto interno planeado');
        const publicPt = await request(port, 'GET', '/api/products?locale=pt');
        assert.strictEqual(publicPt.status, 404, publicPt.raw);
        assert.strictEqual(publicPt.body.error.code, 'LOCALE_NOT_AVAILABLE');

        const auditDb = new Database(dbPath, { readonly: true });
        const actions = auditDb.prepare(`
            SELECT action FROM audit_logs
            WHERE entity_type = 'translation_product' AND entity_id IN (?, ?)
            ORDER BY id
        `).all(product.id + ':ar', product.id + ':pt').map(function (row) { return row.action; });
        auditDb.close();
        ['save_draft', 'publish', 'restore'].forEach(function (action) {
            assert.ok(actions.includes(action), 'missing translation audit action: ' + action);
        });
    } finally {
        await stopServer(child);
    }

    console.log('Stage B admin translation integration tests passed.');
}

main().catch(function (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
