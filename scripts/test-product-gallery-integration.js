'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const Database = require('better-sqlite3');
const { runMigrations } = require('../server/db/migrations');
const { auditProductMediaAssetLinks } = require('../server/lib/assetReferences');

const ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(ROOT, '.tmp');
const TEST_ROOT = process.env.PRODUCT_GALLERY_TEST_ROOT
    ? path.resolve(process.env.PRODUCT_GALLERY_TEST_ROOT)
    : path.join(TEMP_ROOT, 'product-gallery-integration-' + process.pid + '-' + Date.now());
const DB_PATH = path.join(TEST_ROOT, 'gallery.db');
const UPLOAD_DIR = path.join(TEST_ROOT, 'uploads');
const KEEP_FIXTURE = process.env.KEEP_PRODUCT_GALLERY_FIXTURE === '1';
const ADMIN_USERNAME = 'gallery-test-admin';
const ADMIN_PASSWORD = 'GalleryTestPassword!2026';
const ASSET_PATHS = [
    'uploads/product-scbh17-dry-amorphous.png',
    'uploads/product-scbh19-dry-amorphous.png',
    'uploads/product-scbh15-dry-amorphous.png',
    'uploads/product-ggd-low-voltage-fixed-switchgear.png',
    'uploads/product-scb13-silicon-dry.png',
    'uploads/product-scb18-silicon-dry.png',
    'uploads/product-zgsbh15-pv-amorphous-combined.png',
    'uploads/product-zgs13-wind-combined.png',
    'uploads/product-kyn-12-dry-air-switchgear.png'
];
const GENERATED_CARD_PATHS = [
    'assets/optimized/product-cards/omitted-gallery.webp',
    'assets/optimized/product-cards/empty-gallery.webp',
    'assets/optimized/product-cards/gallery-integration-product.webp'
];
const generatedCardFilesPresentAtStart = new Set(GENERATED_CARD_PATHS.filter(function (publicPath) {
    return fs.existsSync(path.join(ROOT, ...publicPath.split('/')));
}));

let serverProcess = null;
let serverOutput = '';

function assertSafeTestRoot() {
    const resolvedTempRoot = path.resolve(TEMP_ROOT);
    const resolvedTestRoot = path.resolve(TEST_ROOT);
    const tempPrefix = resolvedTempRoot.endsWith(path.sep) ? resolvedTempRoot : resolvedTempRoot + path.sep;
    assert(resolvedTestRoot.startsWith(tempPrefix), 'Gallery fixture must stay inside the project .tmp directory.');
    assert(/^product-gallery-[A-Za-z0-9._-]+$/.test(path.basename(resolvedTestRoot)), 'Gallery fixture directory name is invalid.');
}

function cleanupGeneratedCardFiles() {
    GENERATED_CARD_PATHS.forEach(function (publicPath) {
        if (generatedCardFilesPresentAtStart.has(publicPath)) return;
        fs.rmSync(path.join(ROOT, ...publicPath.split('/')), { force: true });
    });
}

function createDatabase() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    db.exec(fs.readFileSync(path.join(ROOT, 'server', 'db', 'schema.sql'), 'utf8'));
    runMigrations(db);
    const now = Date.now();
    db.prepare(`
        INSERT INTO categories
            (id, type, parent_id, slug, name_en, name_ar, name_fr, name_ru, sort_order, is_active, created_at, updated_at)
        VALUES
            (1, 'product', NULL, 'transformer', 'Transformer', 'المحولات', 'Transformateur', 'Трансформаторы', 1, 1, ?, ?),
            (2, 'product', 1, 'gallery-test', 'Gallery Test', 'اختبار المعرض', 'Test de galerie', 'Тест галереи', 1, 1, ?, ?)
    `).run(now, now, now, now);
    const insertAsset = db.prepare(`
        INSERT INTO assets
            (path, filename, original_name, mime_type, file_size, checksum, module, entity_type, entity_id, is_active, created_at)
        VALUES
            (@path, @filename, @filename, @mime_type, @file_size, @checksum, 'products', 'product', NULL, 1, @created_at)
    `);
    ASSET_PATHS.forEach(function (assetPath, index) {
        const file = path.join(ROOT, ...assetPath.split('/'));
        assert(fs.existsSync(file), 'Missing gallery fixture asset: ' + assetPath);
        if (assetPath.startsWith('uploads/')) {
            const fixtureFile = path.join(UPLOAD_DIR, ...assetPath.slice('uploads/'.length).split('/'));
            fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
            fs.copyFileSync(file, fixtureFile);
        }
        const stat = fs.statSync(file);
        insertAsset.run({
            path: assetPath,
            filename: path.basename(assetPath),
            mime_type: path.extname(assetPath).toLowerCase() === '.png' ? 'image/png' : 'image/webp',
            file_size: stat.size,
            checksum: 'gallery-fixture-' + index,
            created_at: now + index
        });
    });
    db.close();
}

function findOpenPort() {
    return new Promise(function (resolve, reject) {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', function () {
            const port = server.address().port;
            server.close(function () { resolve(port); });
        });
    });
}

function request(port, method, requestPath, options) {
    options = options || {};
    const rawBody = options.body === undefined ? '' : JSON.stringify(options.body);
    const headers = Object.assign({}, options.headers || {});
    if (rawBody) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(rawBody);
    }
    return new Promise(function (resolve, reject) {
        const req = http.request({ hostname: '127.0.0.1', port, method, path: requestPath, headers, timeout: 5000 }, function (res) {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) { raw += chunk; });
            res.on('end', function () {
                let body = raw;
                try { body = raw ? JSON.parse(raw) : null; } catch (err) { body = raw; }
                resolve({ status: res.statusCode, body, raw, headers: res.headers });
            });
        });
        req.once('timeout', function () { req.destroy(new Error('request timeout')); });
        req.once('error', reject);
        if (rawBody) req.write(rawBody);
        req.end();
    });
}

async function waitForReady(port) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        try {
            const response = await request(port, 'GET', '/api/health');
            if (response.status === 200) return;
        } catch (err) {
            // Server startup is still in progress.
        }
        await new Promise(function (resolve) { setTimeout(resolve, 200); });
    }
    throw new Error('Gallery integration server did not become ready.\n' + serverOutput);
}

async function startServer(port) {
    const env = Object.assign({}, process.env, {
        PORT: String(port),
        HOST: '127.0.0.1',
        NODE_ENV: 'test',
        DB_PATH,
        UPLOAD_DIR,
        UPLOAD_PUBLIC_PATH: 'uploads',
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
        JWT_SECRET: 'gallery-test-jwt-secret'
    });
    serverProcess = spawn(process.execPath, ['server/app.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    serverProcess.stdout.on('data', function (chunk) { serverOutput += chunk.toString(); });
    serverProcess.stderr.on('data', function (chunk) { serverOutput += chunk.toString(); });
    await waitForReady(port);
}

function stopServer() {
    if (!serverProcess || serverProcess.killed) return Promise.resolve();
    return new Promise(function (resolve) {
        const processToStop = serverProcess;
        const timeout = setTimeout(function () {
            processToStop.kill('SIGKILL');
            resolve();
        }, 3000);
        processToStop.once('exit', function () {
            clearTimeout(timeout);
            resolve();
        });
        processToStop.kill();
        serverProcess = null;
    });
}

function authHeaders(token) {
    return { Authorization: 'Bearer ' + token };
}

function expectStatus(response, status) {
    assert.strictEqual(response.status, status, 'Expected HTTP ' + status + ', got ' + response.status + ': ' + response.raw);
}

function productData(response) {
    return response.body && response.body.ok ? response.body.data : response.body;
}

function mediaRows(productId) {
    const db = new Database(DB_PATH, { readonly: true });
    try {
        return db.prepare(`
            SELECT id, product_id, asset_id, media_type, path, is_cover, sort_order
            FROM product_media
            WHERE product_id = ?
            ORDER BY is_cover DESC, sort_order, id
        `).all(productId);
    } finally {
        db.close();
    }
}

function assertMedia(productId, cover, gallery) {
    const rows = mediaRows(productId);
    assert.deepStrictEqual(rows.map(function (row) { return row.path; }), [cover].concat(gallery));
    assert.deepStrictEqual(rows.map(function (row) { return row.sort_order; }), [1].concat(gallery.map(function (_, index) { return index + 2; })));
    assert.strictEqual(rows.filter(function (row) { return row.is_cover === 1; }).length, 1);
    assert(rows.every(function (row) { return row.asset_id != null; }), 'Every gallery media row must resolve an active asset');
    const db = new Database(DB_PATH, { readonly: true });
    try {
        const references = db.prepare(`
            SELECT asset_path, field_path
            FROM asset_references
            WHERE module = 'products' AND entity_type = 'product' AND entity_id = ?
            ORDER BY CASE WHEN field_path = 'cover_image' THEN 0 ELSE 1 END, field_path
        `).all(productId);
        assert.deepStrictEqual(references.map(function (row) { return row.asset_path; }), [cover].concat(gallery));
        assert.deepStrictEqual(references.map(function (row) { return row.field_path; }), ['cover_image'].concat(gallery.map(function (_, index) { return 'media[' + (index + 2) + ']'; })));
    } finally {
        db.close();
    }
}

async function main() {
    assertSafeTestRoot();
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT, { recursive: true });
    createDatabase();
    const port = await findOpenPort();
    try {
        await startServer(port);
        const login = await request(port, 'POST', '/api/auth/login', { body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
        expectStatus(login, 200);
        const headers = authHeaders(login.body.token);

        const omittedCreate = await request(port, 'POST', '/api/admin/products', { headers, body: { name_en: 'Omitted Gallery', category_id: 2, cover_image: ASSET_PATHS[0] } });
        expectStatus(omittedCreate, 201);
        assertMedia(productData(omittedCreate).id, ASSET_PATHS[0], []);

        const emptyCreate = await request(port, 'POST', '/api/admin/products', { headers, body: { name_en: 'Empty Gallery', category_id: 2, cover_image: ASSET_PATHS[0], gallery: [] } });
        expectStatus(emptyCreate, 201);
        assertMedia(productData(emptyCreate).id, ASSET_PATHS[0], []);

        const created = await request(port, 'POST', '/api/admin/products', {
            headers,
            body: {
                name_en: 'Gallery Integration Product',
                name_ar: 'منتج اختبار المعرض',
                name_fr: 'Produit de test de galerie',
                name_ru: 'Тестовый продукт галереи',
                slug: 'gallery-integration-product',
                category_id: 2,
                cover_image: ASSET_PATHS[0],
                gallery: [ASSET_PATHS[1], ASSET_PATHS[2], ASSET_PATHS[1], ASSET_PATHS[0], ASSET_PATHS[3]]
            }
        });
        expectStatus(created, 201);
        let product = productData(created);
        assertMedia(product.id, ASSET_PATHS[0], [ASSET_PATHS[1], ASSET_PATHS[2], ASSET_PATHS[3]]);

        const publicList = await request(port, 'GET', '/api/products');
        expectStatus(publicList, 200);
        const listProduct = publicList.body.find(function (item) { return item.slug === product.slug; });
        assert(listProduct);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(listProduct, 'images'), false);

        const publicDetail = await request(port, 'GET', '/api/products/' + encodeURIComponent(product.slug));
        expectStatus(publicDetail, 200);
        assert.deepStrictEqual(publicDetail.body.images.map(function (image) {
            return { src: image.src, isCover: image.isCover };
        }), [
            { src: ASSET_PATHS[0], isCover: true },
            { src: ASSET_PATHS[1], isCover: false },
            { src: ASSET_PATHS[2], isCover: false },
            { src: ASSET_PATHS[3], isCover: false }
        ]);
        publicDetail.body.images.forEach(function (image, index) {
            assert(new RegExp('^/media/product-gallery/gallery-integration-product/' + index + '\\.webp\\?v=').test(image.thumbnailSrc));
        });
        const thumbnailResponse = await fetch('http://127.0.0.1:' + port + publicDetail.body.images[1].thumbnailSrc);
        assert.strictEqual(thumbnailResponse.status, 200);
        assert.strictEqual(thumbnailResponse.headers.get('content-type'), 'image/webp');
        assert(/immutable/.test(thumbnailResponse.headers.get('cache-control') || ''));
        const thumbnailBytes = Buffer.from(await thumbnailResponse.arrayBuffer());
        assert.strictEqual(thumbnailBytes.subarray(0, 4).toString('ascii'), 'RIFF');
        assert(thumbnailBytes.length < fs.statSync(path.join(UPLOAD_DIR, ASSET_PATHS[1].slice('uploads/'.length))).size);
        expectStatus(await request(port, 'GET', '/media/product-gallery/not-a-public-product/0.webp'), 404);
        expectStatus(await request(port, 'GET', '/media/product-gallery/' + encodeURIComponent(product.slug) + '/7.webp'), 404);

        const reordered = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: { version: product.version, gallery: [ASSET_PATHS[3], ASSET_PATHS[1], ASSET_PATHS[2]] }
        });
        expectStatus(reordered, 200);
        product = productData(reordered);
        assertMedia(product.id, ASSET_PATHS[0], [ASSET_PATHS[3], ASSET_PATHS[1], ASSET_PATHS[2]]);

        const coverOnly = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: { version: product.version, cover_image: ASSET_PATHS[1] }
        });
        expectStatus(coverOnly, 200);
        product = productData(coverOnly);
        assertMedia(product.id, ASSET_PATHS[1], [ASSET_PATHS[3], ASSET_PATHS[2]]);

        const cleared = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: { version: product.version, gallery: [] }
        });
        expectStatus(cleared, 200);
        product = productData(cleared);
        assertMedia(product.id, ASSET_PATHS[1], []);

        const restored = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: { version: product.version, gallery: [ASSET_PATHS[2], ASSET_PATHS[3], ASSET_PATHS[4], ASSET_PATHS[5]] }
        });
        expectStatus(restored, 200);
        product = productData(restored);
        assertMedia(product.id, ASSET_PATHS[1], [ASSET_PATHS[2], ASSET_PATHS[3], ASSET_PATHS[4], ASSET_PATHS[5]]);

        for (const prefix of ['', '/ar', '/fr', '/ru']) {
            const detailPage = await request(port, 'GET', prefix + '/products/' + encodeURIComponent(product.slug));
            expectStatus(detailPage, 200);
            assert(detailPage.raw.includes('data-gallery-state="multiple"'));
            assert.strictEqual((detailPage.raw.match(/data-product-gallery-thumbnail/g) || []).length, 5);
            assert(detailPage.raw.includes('id="main-product-image"'));
            assert(detailPage.raw.includes('fetchpriority="high"'));
        }

        const tooMany = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: { version: product.version, gallery: [ASSET_PATHS[0], ASSET_PATHS[2], ASSET_PATHS[3], ASSET_PATHS[4], ASSET_PATHS[5], ASSET_PATHS[6], ASSET_PATHS[7]] }
        });
        expectStatus(tooMany, 422);
        assert(/gallery|图库/i.test(tooMany.raw));

        const invalid = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: { version: product.version, gallery: ['not-an-image.txt'] }
        });
        expectStatus(invalid, 422);
        assert(/gallery|图库/i.test(invalid.raw));

        const finalized = await request(port, 'PUT', '/api/admin/products/' + product.id, {
            headers,
            body: {
                version: product.version,
                cover_image: ASSET_PATHS[0],
                gallery: [ASSET_PATHS[1], ASSET_PATHS[2], ASSET_PATHS[3], ASSET_PATHS[4]]
            }
        });
        expectStatus(finalized, 200);
        product = productData(finalized);
        assertMedia(product.id, ASSET_PATHS[0], [ASSET_PATHS[1], ASSET_PATHS[2], ASSET_PATHS[3], ASSET_PATHS[4]]);

        const db = new Database(DB_PATH, { readonly: true });
        try {
            const audit = auditProductMediaAssetLinks(db);
            assert.deepStrictEqual(audit.product_media_invalid_paths, []);
            assert.deepStrictEqual(audit.missing_asset_paths, []);
            assert.deepStrictEqual(audit.product_media_asset_id_updates, []);
            assert.deepStrictEqual(audit.product_asset_reference_gaps, []);
            assert.deepStrictEqual(audit.stale_product_asset_references, []);
        } finally {
            db.close();
        }

        await stopServer();
        const verification = spawnSync(process.execPath, ['scripts/repair-product-media-asset-links.js', '--verify'], {
            cwd: ROOT,
            env: Object.assign({}, process.env, { DB_PATH, UPLOAD_DIR, UPLOAD_PUBLIC_PATH: 'uploads' }),
            encoding: 'utf8'
        });
        assert.strictEqual(verification.status, 0, verification.stderr || verification.stdout);
        assert(/"ok": true/.test(verification.stdout));

        const imageAudit = spawnSync(process.execPath, ['scripts/audit-image-sync.js', '--json'], {
            cwd: ROOT,
            env: Object.assign({}, process.env, { DB_PATH, UPLOAD_DIR, UPLOAD_PUBLIC_PATH: 'uploads', DOTENV_CONFIG_QUIET: 'true' }),
            encoding: 'utf8'
        });
        assert.strictEqual(imageAudit.status, 0, imageAudit.stderr || imageAudit.stdout);
        const imageAuditLines = imageAudit.stdout.split(/\r?\n/);
        const imageAuditJsonStart = imageAuditLines.findIndex(function (line) { return line.trim() === '{'; });
        assert(imageAuditJsonStart >= 0, imageAudit.stdout);
        const imageAuditResult = JSON.parse(imageAuditLines.slice(imageAuditJsonStart).join('\n'));
        assert(imageAuditResult.productGalleryThumbnailCacheFiles >= 1);
        assert.strictEqual(imageAuditResult.orphanUploadFiles.some(function (file) {
            return file.indexOf('uploads/.cache/product-gallery/') === 0;
        }), false);
        console.log('Product gallery integration tests passed.');
        if (KEEP_FIXTURE) console.log('Gallery browser fixture retained at: ' + TEST_ROOT);
    } finally {
        await stopServer();
        cleanupGeneratedCardFiles();
        if (!KEEP_FIXTURE) fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
}

main().catch(function (err) {
    console.error(err.stack || err.message);
    if (serverOutput) console.error(serverOutput);
    process.exit(1);
});
