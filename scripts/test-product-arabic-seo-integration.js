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
const ADMIN_USERNAME = 'arabic-seo-test-admin';
const ADMIN_PASSWORD = 'ArabicSeoTestPassword-2026';

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
                try { parsed = raw ? JSON.parse(raw) : null; } catch (err) { /* keep raw */ }
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
        } catch (err) {
            // The process may still be starting.
        }
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

function unwrap(body) {
    return body && body.ok ? body.data : body;
}

async function main() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-ar-seo-api-'));
    const dbPath = path.join(dir, 'test.db');
    const db = new Database(dbPath);
    db.exec(SCHEMA_SQL);
    db.prepare(`
        INSERT INTO categories (id, type, parent_id, slug, name_en, name_ar, is_active, sort_order)
        VALUES (1, 'product', NULL, 'transformer', 'Transformers', 'المحولات', 1, 1)
    `).run();
    db.prepare(`
        INSERT INTO categories (id, type, parent_id, slug, name_en, name_ar, is_active, sort_order)
        VALUES (2, 'product', 1, 'oil-immersed', 'Oil-immersed transformers', 'المحولات الزيتية', 1, 1)
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
            JWT_SECRET: 'arabic-seo-test-jwt-secret'
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

        const initial = {
            name_en: 'Arabic SEO integration product',
            name_ar: 'منتج اختبار تحسين البحث بالعربية',
            short_desc_ar: 'وصف عربي قصير لمنتج الاختبار',
            description_ar: 'تفاصيل عربية موثوقة لاختبار حفظ حقول تحسين محركات البحث.',
            category_id: 2,
            status: 'published',
            seo_title: 'English integration SEO title',
            seo_description: 'English integration SEO description that must remain unchanged.',
            seo_keywords: 'integration, transformer',
            seo_title_ar: 'عنوان عربي مستقل لاختبار منتج محول التوزيع',
            seo_description_ar: 'وصف عربي مستقل لاختبار حفظ بيانات تحسين محركات البحث لمنتج محول التوزيع، مع التحقق من بقاء اللغات والحقول الأخرى دون تغيير.',
            seo_keywords_ar: 'محول توزيع، اختبار المحتوى، تحسين البحث'
        };
        const createdResponse = await request(port, 'POST', '/api/admin/products', initial, token);
        assert.strictEqual(createdResponse.status, 201, createdResponse.raw);
        let product = unwrap(createdResponse.body);
        assert.strictEqual(product.seo_title_ar, initial.seo_title_ar);
        assert.strictEqual(product.seo_description_ar, initial.seo_description_ar);
        assert.strictEqual(product.seo_keywords_ar, initial.seo_keywords_ar);

        const titleOnly = 'عنوان عربي معدل فقط لاختبار التحديث الجزئي الآمن';
        const titleUpdate = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            version: product.version,
            seo_title_ar: titleOnly
        }, token);
        assert.strictEqual(titleUpdate.status, 200, titleUpdate.raw);
        product = unwrap(titleUpdate.body);
        assert.strictEqual(product.seo_title_ar, titleOnly);
        assert.strictEqual(product.seo_description_ar, initial.seo_description_ar);
        assert.strictEqual(product.seo_keywords_ar, initial.seo_keywords_ar);
        assert.strictEqual(product.seo_title, initial.seo_title);

        const unrelatedUpdate = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            version: product.version,
            featured: true
        }, token);
        assert.strictEqual(unrelatedUpdate.status, 200, unrelatedUpdate.raw);
        product = unwrap(unrelatedUpdate.body);
        assert.strictEqual(product.seo_title_ar, titleOnly);
        assert.strictEqual(product.seo_description_ar, initial.seo_description_ar);
        assert.strictEqual(product.seo_keywords_ar, initial.seo_keywords_ar);

        const reloaded = await request(port, 'GET', '/api/admin/products/' + product.id, null, token);
        assert.strictEqual(reloaded.status, 200, reloaded.raw);
        const reloadedProduct = unwrap(reloaded.body);
        assert.strictEqual(reloadedProduct.seo_title_ar, titleOnly);
        assert.strictEqual(reloadedProduct.seo_description_ar, initial.seo_description_ar);

        const publicResponse = await request(port, 'GET', '/api/products/' + encodeURIComponent(product.slug));
        assert.strictEqual(publicResponse.status, 200, publicResponse.raw);
        assert.strictEqual(publicResponse.body.seoTitleAr, titleOnly);
        assert.strictEqual(publicResponse.body.seoDescriptionAr, initial.seo_description_ar);
        assert.ok(!Object.prototype.hasOwnProperty.call(publicResponse.body, 'seoKeywordsAr'));

        const deleted = await request(port, 'POST', '/api/admin/products/batch', {
            action: 'hard_delete',
            ids: [product.id],
            versionMap: { [String(product.id)]: product.version },
            payload: { confirm: true }
        }, token);
        assert.strictEqual(deleted.status, 200, deleted.raw);
    } finally {
        await stopServer(child);
    }
    console.log('product Arabic SEO integration tests passed');
}

main().catch(function (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
});
