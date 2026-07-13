'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const Database = require('better-sqlite3');
const {
    capturePublicSnapshot,
    SNAPSHOT_FILES
} = require('./capture-stage2c-public-snapshot');
const { verifyPublicSnapshot } = require('./verify-stage2c-public-snapshot');
const {
    createRuntimePublicSiteDataSource,
    createSnapshotPublicSiteDataSource
} = require('../server/lib/publicSiteDataSource');

const ROOT = path.join(__dirname, '..');
const TEST_PREFIX = 'stage2c-public-snapshot-test-' + process.pid + '-' + Date.now();
const TEST_ROOT = path.join(ROOT, '.tmp');
const IDENTITY = Object.freeze({
    legalName: 'Henan Longxiang Electric Co., Ltd.',
    brandName: 'Longxiang Electric',
    registeredCapital: 'RMB 69.552 million',
    headquarters: 'Xinzheng City, Zhengzhou City, Henan Province, P.R. China',
    productionBase: 'Huaiyang District, Zhoukou City, Henan Province, P.R. China',
    globalSalesEmail: 'henanlxgj@163.com',
    globalWebsite: 'https://www.lxenelectric.com/',
    chinaWebsite: 'https://www.lxelec.cn/'
});

function products() {
    return Array.from({ length: 38 }, function (_, index) {
        const number = index + 1;
        const slug = 'product-' + number;
        return {
            id: number === 38 ? slug : 'legacy-' + number,
            slug,
            aliases: number === 1 ? ['alias-one'] : [],
            name: 'Product ' + number,
            nameAr: 'منتج ' + number,
            nameFr: 'Produit ' + number,
            nameRu: 'Продукт ' + number,
            group: 'transformer',
            subCategory: 'oil-immersed',
            image: 'assets/product-' + number + '.png',
            shortDesc: 'Short description ' + number,
            shortDescAr: 'وصف قصير ' + number,
            shortDescFr: 'Description courte ' + number,
            shortDescRu: 'Краткое описание ' + number,
            description: 'Description ' + number,
            descriptionAr: 'الوصف ' + number,
            descriptionFr: 'Description ' + number,
            descriptionRu: 'Описание ' + number,
            specs: [['Model', 'M' + number]],
            capacities: [],
            voltages: []
        };
    });
}

function sitemapXml() {
    const staticPaths = [
        '/', '/about.html', '/products.html', '/solutions.html', '/education.html', '/certifications.html', '/compare.html', '/contact.html'
    ];
    const prefixes = ['', '/ar', '/fr', '/ru'];
    const urls = [];
    prefixes.forEach(function (prefix) {
        staticPaths.forEach(function (pathname) {
            urls.push('https://www.lxenelectric.com' + (pathname === '/' ? (prefix ? prefix + '/index.html' : '/') : prefix + pathname));
        });
        products().forEach(function (product) {
            urls.push('https://www.lxenelectric.com' + prefix + '/products/' + product.slug);
        });
    });
    assert.strictEqual(urls.length, 184);
    return '<?xml version="1.0" encoding="UTF-8"?><urlset>' + urls.map(function (url) {
        return '<url><loc>' + url + '</loc></url>';
    }).join('') + '</urlset>';
}

function block(slug, version) {
    const body = slug === 'global-shell'
        ? {
            navigation: {
                mainLinks: [{ label: 'Home', href: 'index.html' }],
                quickLinks: [{
                    label: 'China Website / 中国官网',
                    labelAr: 'الموقع الرسمي في الصين',
                    labelFr: 'Site officiel en Chine',
                    labelRu: 'Официальный сайт в Китае',
                    href: 'https://www.lxelec.cn/'
                }],
                productLinks: [{ label: 'Products', href: 'products.html' }]
            },
            footer: { text: 'Public footer', copyright: 'Copyright' },
            inquiry: { title: 'Request a Quote', modalFields: [{ name: 'phone', label: 'Phone' }] }
        }
        : { hero: { title: slug + ' title' }, seo: { title: slug + ' SEO' } };
    return { id: version, slug, title: slug, titleAr: '', body, version, updatedAt: 1700000000000 + version };
}

function validPayloads() {
    return {
        '/api/content-blocks/global-shell': block('global-shell', 21),
        '/api/content-blocks/home': block('home', 46),
        '/api/content-blocks/about-us': block('about-us', 23),
        '/api/content-blocks/solutions': block('solutions', 22),
        '/api/content-blocks/contact': block('contact', 27),
        '/api/content-blocks/product-pages': block('product-pages', 18),
        '/api/company': {
            identity: IDENTITY,
            name: IDENTITY.legalName,
            registeredCapital: IDENTITY.registeredCapital,
            email: IDENTITY.globalSalesEmail,
            address: IDENTITY.headquarters,
            headquarters: IDENTITY.headquarters,
            huaiyangBase: IDENTITY.productionBase,
            globalWebsite: IDENTITY.globalWebsite,
            chinaWebsite: IDENTITY.chinaWebsite,
            version: 1700000000000
        },
        '/api/products': products(),
        '/api/product-categories': {
            ok: true,
            data: [{
                group: 'transformer', label: 'Transformer', labelAr: 'المحولات', labelFr: 'Transformateur', labelRu: 'Трансформаторы',
                children: [{ sub: 'oil-immersed', label: 'Oil Immersed', labelAr: 'مغمورة بالزيت', labelFr: 'À huile', labelRu: 'Масляные' }]
            }]
        },
        '/sitemap.xml': sitemapXml()
    };
}

function startFixtureServer(mode) {
    const payloads = validPayloads();
    const hits = [];
    const server = http.createServer(function (req, res) {
        hits.push({ url: req.url, authorization: req.headers.authorization, cookie: req.headers.cookie });
        if (mode === 'status' && req.url === '/api/company') {
            res.writeHead(503, { 'content-type': 'application/json' });
            return res.end('{"error":"unavailable"}');
        }
        if (mode === 'invalid-json' && req.url === '/api/content-blocks/home') {
            res.writeHead(200, { 'content-type': 'application/json' });
            return res.end('{invalid');
        }
        if (mode === 'redirect' && req.url === '/api/company') {
            res.writeHead(302, { location: 'https://example.com/api/company' });
            return res.end();
        }
        if (mode === 'content-type' && req.url === '/api/company') {
            res.writeHead(200, { 'content-type': 'text/plain' });
            return res.end(JSON.stringify(payloads[req.url]));
        }
        if (mode === 'large' && req.url === '/api/company') {
            res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(20 * 1024 * 1024 + 1) });
            return res.end('{}');
        }
        if (mode === 'slow-body' && req.url === '/api/company') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.write('{');
            return setTimeout(function () { res.end('}'); }, 200);
        }
        if (mode === 'timeout' && req.url === '/api/company') return;
        const payload = payloads[req.url];
        if (payload == null) {
            res.writeHead(404, { 'content-type': 'application/json' });
            return res.end('{"error":"not found"}');
        }
        if (typeof payload === 'string') {
            res.writeHead(200, { 'content-type': 'application/xml' });
            return res.end(payload);
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
    });
    return new Promise(function (resolve) {
        server.listen(0, '127.0.0.1', function () {
            resolve({
                base: 'http://localhost:' + server.address().port,
                hits,
                close: function () { return new Promise(function (done) { server.close(done); }); }
            });
        });
    });
}

async function expectReject(fn, pattern) {
    let error = null;
    try { await fn(); } catch (err) { error = err; }
    assert(error, 'Expected operation to reject');
    if (pattern) assert(pattern.test(error.message), 'Unexpected error: ' + error.message);
}

function cloneDirectory(source, name) {
    const target = path.join(TEST_ROOT, TEST_PREFIX + '-' + name);
    fs.cpSync(source, target, { recursive: true });
    return target;
}

function writeHashedFile(directory, relativePath, value, isXml) {
    const file = path.join(directory, relativePath);
    const bytes = Buffer.from(isXml ? String(value) : JSON.stringify(value, null, 2) + '\n');
    fs.writeFileSync(file, bytes);
    const manifestPath = path.join(directory, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.files[relativePath].sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    manifest.files[relativePath].bytes = bytes.length;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function createRuntimeFixtureDb() {
    const dbPath = path.join(TEST_ROOT, TEST_PREFIX + '-runtime.db');
    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE content_blocks (
            id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title_en TEXT, title_ar TEXT, body_json TEXT,
            status TEXT, version INTEGER, updated_at INTEGER
        );
        CREATE TABLE admin_settings (key TEXT PRIMARY KEY, value_json TEXT);
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY, parent_id INTEGER, slug TEXT, name_en TEXT, name_ar TEXT, name_fr TEXT,
            name_ru TEXT, type TEXT, is_active INTEGER, sort_order INTEGER
        );
        CREATE TABLE products (
            id INTEGER PRIMARY KEY, legacy_id TEXT, slug TEXT, product_group TEXT, sub_category TEXT,
            status TEXT, category_id INTEGER, sort_order INTEGER, name_en TEXT, name_ar TEXT, name_fr TEXT,
            name_ru TEXT, short_desc_en TEXT, short_desc_ar TEXT, short_desc_fr TEXT, short_desc_ru TEXT,
            description_en TEXT, description_ar TEXT, description_fr TEXT, description_ru TEXT,
            featured INTEGER, aliases_json TEXT, updated_at INTEGER, seo_title TEXT, seo_title_fr TEXT,
            seo_title_ru TEXT, seo_description TEXT, seo_description_fr TEXT, seo_description_ru TEXT,
            seo_keywords TEXT, seo_keywords_fr TEXT, seo_keywords_ru TEXT
        );
        CREATE TABLE product_specs (
            id INTEGER PRIMARY KEY, product_id INTEGER, spec_group TEXT, spec_key TEXT, spec_value TEXT, sort_order INTEGER
        );
        CREATE TABLE product_media (
            id INTEGER PRIMARY KEY, product_id INTEGER, asset_id INTEGER, media_type TEXT,
            path TEXT, is_cover INTEGER, sort_order INTEGER
        );
    `);
    const payloads = validPayloads();
    const insertBlock = db.prepare('INSERT INTO content_blocks (id, slug, title_en, title_ar, body_json, status, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    let blockId = 1;
    Object.keys(payloads).filter(function (endpoint) { return endpoint.startsWith('/api/content-blocks/'); }).forEach(function (endpoint) {
        const value = payloads[endpoint];
        insertBlock.run(blockId++, value.slug, value.title, value.titleAr, JSON.stringify(value.body), 'published', value.version, value.updatedAt);
    });
    [
        ['company-identity', IDENTITY],
        ['company-overview', {}],
        ['page-blocks', { blocks: [{ key: 'footer', footerText: 'Footer', footerTextAr: 'تذييل' }] }]
    ].forEach(function (entry) {
        insertBlock.run(blockId++, entry[0], entry[0], '', JSON.stringify(entry[1]), 'published', 1, 1700000000000 + blockId);
    });
    db.prepare('INSERT INTO admin_settings (key, value_json) VALUES (?, ?)').run('ga4TrackingId', JSON.stringify(''));
    db.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(1, null, 'transformer', 'Transformer', 'المحولات', 'Transformateur', 'Трансформаторы', 'product', 1, 1);
    db.prepare('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(2, 1, 'oil-immersed', 'Oil Immersed', 'مغمورة بالزيت', 'À huile', 'Масляные', 'product', 1, 1);
    const insertProduct = db.prepare(`
        INSERT INTO products (
            id, legacy_id, slug, product_group, sub_category, status, category_id, sort_order,
            name_en, name_ar, name_fr, name_ru, short_desc_en, short_desc_ar, short_desc_fr, short_desc_ru,
            description_en, description_ar, description_fr, description_ru, featured, aliases_json, updated_at,
            seo_title, seo_title_fr, seo_title_ru, seo_description, seo_description_fr, seo_description_ru,
            seo_keywords, seo_keywords_fr, seo_keywords_ru
        ) VALUES (
            @internalId, @id, @slug, @group, @subCategory, 'published', 2, @internalId,
            @name, @nameAr, @nameFr, @nameRu, @shortDesc, @shortDescAr, @shortDescFr, @shortDescRu,
            @description, @descriptionAr, @descriptionFr, @descriptionRu, 0, @aliases, 1700000000000,
            '', '', '', '', '', '', '', '', ''
        )
    `);
    const insertSpec = db.prepare('INSERT INTO product_specs VALUES (?, ?, ?, ?, ?, ?)');
    const insertMedia = db.prepare('INSERT INTO product_media VALUES (?, ?, ?, ?, ?, ?, ?)');
    products().forEach(function (product, index) {
        insertProduct.run({ ...product, internalId: index + 1, aliases: JSON.stringify(product.aliases) });
        insertSpec.run(index + 1, index + 1, 'technical', 'Model', 'M' + (index + 1), 1);
        insertMedia.run(index + 1, index + 1, null, 'image', product.image, 1, 1);
    });
    insertMedia.run(1001, 1, null, 'image', products()[0].image, 0, 2);
    insertMedia.run(1002, 1, null, 'image', 'assets/product-1-detail.png', 0, 3);
    insertMedia.run(1003, 1, null, 'image', 'assets/product-1-side.png', 0, 4);
    insertMedia.run(1004, 1, null, 'document', 'assets/product-1-sheet.pdf', 0, 5);
    return db;
}

function assertDataSourceContract(source) {
    const methods = ['readContentBlock', 'readCompany', 'readProducts', 'readProduct', 'readProductCategories'];
    methods.forEach(function (method) { assert.strictEqual(typeof source[method], 'function'); });
    assert(source.readContentBlock('home').version > 0);
    assert.strictEqual(source.readContentBlock('missing'), null);
    assert.strictEqual(source.readCompany().identity.legalName, IDENTITY.legalName);
    assert.strictEqual(source.readProducts().length, 38);
    assert.strictEqual(source.readProduct('product-1').slug, 'product-1');
    assert.strictEqual(source.readProduct('legacy-1').slug, 'product-1');
    assert.strictEqual(source.readProduct('alias-one').slug, 'product-1');
    [null, undefined, '', 0].forEach(function (identifier) { assert.strictEqual(source.readProduct(identifier), null); });
    const categories = source.readProductCategories();
    assert(Array.isArray(categories) && categories.length > 0 && Array.isArray(categories[0].children));
    const mutated = source.readProducts();
    mutated[0].name = 'Mutated';
    assert.notStrictEqual(source.readProducts()[0].name, 'Mutated');
}

async function captureMode(mode, name, options) {
    const fixture = await startFixtureServer(mode);
    const out = path.join(TEST_ROOT, TEST_PREFIX + '-' + name);
    try {
        const result = await capturePublicSnapshot({
            base: fixture.base,
            out,
            allowLocalhost: true,
            timeoutMs: options && options.timeoutMs || 1000
        });
        return { result, fixture, out };
    } catch (err) {
        await fixture.close();
        throw err;
    }
}

async function main() {
    fs.mkdirSync(TEST_ROOT, { recursive: true });
    try {
        const captured = await captureMode('valid', 'valid');
        await captured.fixture.close();
        assert.deepStrictEqual(captured.fixture.hits.map(function (hit) { return hit.url; }).sort(), SNAPSHOT_FILES.map(function (item) { return item.endpoint; }).sort());
        captured.fixture.hits.forEach(function (hit) {
            assert.strictEqual(hit.authorization, undefined);
            assert.strictEqual(hit.cookie, undefined);
        });

        const report = verifyPublicSnapshot(captured.out);
        assert.strictEqual(report.sitemapUrlCount, 184);
        assert.strictEqual(report.productCount, 38);
        assert.strictEqual(report.sensitiveFindingCount, 0);
        assert.deepStrictEqual(report.supportedLocales, ['en', 'ar', 'fr', 'ru']);
        assert.strictEqual(report.plannedLocales.pt.includeInSitemap, false);

        const manifest = JSON.parse(fs.readFileSync(path.join(captured.out, 'manifest.json'), 'utf8'));
        assert.strictEqual(Object.keys(manifest.files).length, 10);
        Object.keys(manifest.files).forEach(function (file) {
            const bytes = fs.readFileSync(path.join(captured.out, file));
            assert.strictEqual(manifest.files[file].sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
        });

        await expectReject(function () {
            return capturePublicSnapshot({ base: 'https://example.com', out: path.join(TEST_ROOT, TEST_PREFIX + '-bad-host') });
        }, /host|origin/i);
        await expectReject(function () {
            return capturePublicSnapshot({ base: captured.fixture.base, out: path.join(ROOT, 'outside-snapshot'), allowLocalhost: true });
        }, /\.tmp|output/i);

        const forceFixture = await startFixtureServer('valid');
        try {
            await capturePublicSnapshot({ base: forceFixture.base, out: captured.out, allowLocalhost: true, force: true });
            assert.strictEqual(verifyPublicSnapshot(captured.out).productCount, 38);
        } finally {
            await forceFixture.close();
        }

        for (const item of [
            ['status', 'bad-status', /503|status/i, 1000],
            ['invalid-json', 'bad-json', /json/i, 1000],
            ['redirect', 'bad-redirect', /redirect/i, 1000],
            ['content-type', 'bad-content-type', /content-type/i, 1000],
            ['large', 'bad-large', /size limit/i, 1000],
            ['timeout', 'bad-timeout', /timeout|abort/i, 50],
            ['slow-body', 'bad-slow-body', /timeout|abort/i, 50]
        ]) {
            await expectReject(async function () {
                const fixture = await startFixtureServer(item[0]);
                try {
                await capturePublicSnapshot({ base: fixture.base, out: path.join(TEST_ROOT, TEST_PREFIX + '-' + item[1]), allowLocalhost: true, timeoutMs: item[3] });
                } finally {
                    await fixture.close();
                }
            }, item[2]);
        }

        await expectReject(function () {
            return capturePublicSnapshot({ base: 'http://localhost:1', out: captured.out, allowLocalhost: true });
        }, /exists|force/i);

        const tampered = cloneDirectory(captured.out, 'tampered');
        fs.appendFileSync(path.join(tampered, 'company.json'), ' ');
        assert.throws(function () { verifyPublicSnapshot(tampered); }, /hash/i);

        const missing = cloneDirectory(captured.out, 'missing');
        fs.unlinkSync(path.join(missing, 'products.json'));
        assert.throws(function () { verifyPublicSnapshot(missing); }, /missing/i);

        const sensitiveCases = [
            ['domestic-phone', '17513354200'],
            ['domestic-phone-spaced', '175 1335 4200'],
            ['domestic-phone-punctuated', '175-1335-4200'],
            ['domestic-email', 'hnlxdq2003@163.com'],
            ['domestic-email-spaced', 'hnlxdq2003 @ 163.com'],
            ['old-capital', '100 million RMB'],
            ['whatsapp', { whatsapp: 'https://wa.me/123456' }],
            ['telephone-uri', 'tel:+1-555-123-4567'],
            ['authorization', { authorization: 'Bearer secret' }],
            ['access-token', { accessToken: 'secret' }],
            ['password-hash', { passwordHash: '$2b$hash' }],
            ['session-cookie', { sessionCookie: 'secret' }],
            ['old-capital-ar', '100 مليون يوان صيني'],
            ['token', { token: 'secret' }],
            ['cookie', { cookie: 'sid=secret' }],
            ['password', { password: 'secret' }],
            ['admin', { admin: { username: 'root' } }],
            ['inquiries', { inquiries: [{ customerName: 'Example', customerEmail: 'example@example.com' }] }],
            ['inquiry-singular-record', { inquiry: { name: 'Buyer', email: 'buyer@example.com', message: 'Quote request' } }],
            ['international-phone', 'Call +1 212 555 1212'],
            ['china-url-wrong-path', 'https://www.lxelec.cn/'],
            ['credential-and-private-variants', {
                authToken: 'secret', cookieHeader: 'sid=secret', passwordDigest: 'hash', administratorEmail: 'admin@example.com',
                users: [{ email: 'user@example.com' }], auditLogs: [{ action: 'login' }], officePhone: '212-555-1212', contactPhone: '020 1234 5678'
            }]
        ];
        sensitiveCases.forEach(function (item) {
            const dir = cloneDirectory(captured.out, 'sensitive-' + item[0]);
            const data = JSON.parse(fs.readFileSync(path.join(dir, 'company.json'), 'utf8'));
            data.testLeak = item[1];
            writeHashedFile(dir, 'company.json', data, false);
            assert.throws(function () { verifyPublicSnapshot(dir); }, /sensitive|forbidden|whatsapp|capital|contact/i);
        });

        const wrongProducts = cloneDirectory(captured.out, 'wrong-products');
        const fewerProducts = products().slice(0, 37);
        writeHashedFile(wrongProducts, 'products.json', fewerProducts, false);
        assert.throws(function () { verifyPublicSnapshot(wrongProducts); }, /38|product/i);

        const wrongSitemap = cloneDirectory(captured.out, 'wrong-sitemap');
        const shortSitemap = fs.readFileSync(path.join(wrongSitemap, 'sitemap.xml'), 'utf8').replace(/<url><loc>[^<]+<\/loc><\/url>(?=<\/urlset>)/, '');
        writeHashedFile(wrongSitemap, 'sitemap.xml', shortSitemap, true);
        assert.throws(function () { verifyPublicSnapshot(wrongSitemap); }, /184|sitemap/i);

        const ptSitemap = cloneDirectory(captured.out, 'pt-sitemap');
        const ptXml = fs.readFileSync(path.join(ptSitemap, 'sitemap.xml'), 'utf8').replace('https://www.lxenelectric.com/', 'https://www.lxenelectric.com/pt/index.html');
        writeHashedFile(ptSitemap, 'sitemap.xml', ptXml, true);
        assert.throws(function () { verifyPublicSnapshot(ptSitemap); }, /pt locale|planned pt/i);

        const extraFile = cloneDirectory(captured.out, 'extra-file');
        fs.writeFileSync(path.join(extraFile, 'unexpected.json'), '{}');
        assert.throws(function () { verifyPublicSnapshot(extraFile); }, /extra files/i);

        const traversal = cloneDirectory(captured.out, 'manifest-traversal');
        const traversalManifestPath = path.join(traversal, 'manifest.json');
        const traversalManifest = JSON.parse(fs.readFileSync(traversalManifestPath, 'utf8'));
        traversalManifest.files['../company.json'] = traversalManifest.files['company.json'];
        delete traversalManifest.files['company.json'];
        fs.writeFileSync(traversalManifestPath, JSON.stringify(traversalManifest, null, 2) + '\n');
        assert.throws(function () { verifyPublicSnapshot(traversal); }, /allowlist|manifest/i);

        const badSource = cloneDirectory(captured.out, 'bad-source');
        const badSourceManifestPath = path.join(badSource, 'manifest.json');
        const badSourceManifest = JSON.parse(fs.readFileSync(badSourceManifestPath, 'utf8'));
        badSourceManifest.sourceBase = 'https://example.com';
        fs.writeFileSync(badSourceManifestPath, JSON.stringify(badSourceManifest, null, 2) + '\n');
        assert.throws(function () { verifyPublicSnapshot(badSource); }, /sourceBase|origin/i);

        const badTime = cloneDirectory(captured.out, 'bad-time');
        const badTimeManifestPath = path.join(badTime, 'manifest.json');
        const badTimeManifest = JSON.parse(fs.readFileSync(badTimeManifestPath, 'utf8'));
        badTimeManifest.capturedAt = 'not-a-date';
        fs.writeFileSync(badTimeManifestPath, JSON.stringify(badTimeManifest, null, 2) + '\n');
        assert.throws(function () { verifyPublicSnapshot(badTime); }, /capturedAt|timestamp/i);

        const symlinkSnapshot = cloneDirectory(captured.out, 'symlink');
        try {
            fs.symlinkSync(path.join(captured.out, 'content-blocks'), path.join(symlinkSnapshot, 'linked-content'), 'junction');
            assert.throws(function () { verifyPublicSnapshot(symlinkSnapshot); }, /symlink/i);
        } catch (err) {
            if (!['EPERM', 'EACCES'].includes(err.code)) throw err;
        }

        const snapshotSource = createSnapshotPublicSiteDataSource(captured.out);
        const runtimeDb = createRuntimeFixtureDb();
        const runtimeSource = createRuntimePublicSiteDataSource({ db: runtimeDb });
        try {
            assertDataSourceContract(snapshotSource);
            assertDataSourceContract(runtimeSource);
            assert.strictEqual(snapshotSource.readContentBlock('home').version, 46);
            assert.strictEqual(snapshotSource.readCompany().identity.legalName, IDENTITY.legalName);
            assert.strictEqual(snapshotSource.readProducts().length, 38);
            assert.strictEqual(snapshotSource.readProduct('product-1').id, 'legacy-1');
            assert.strictEqual(snapshotSource.readProduct('legacy-1').slug, 'product-1');
            assert.strictEqual(snapshotSource.readProduct('alias-one').slug, 'product-1');
            assert(Array.isArray(snapshotSource.readProductCategories()));

            const runtimeListProduct = runtimeSource.readProducts()[0];
            assert.strictEqual(Object.prototype.hasOwnProperty.call(runtimeListProduct, 'images'), false);
            const runtimeDetailProduct = runtimeSource.readProduct('product-1');
            assert.deepStrictEqual(runtimeDetailProduct.images.map(function (image) {
                return { src: image.src, isCover: image.isCover };
            }), [
                { src: 'assets/product-1.png', isCover: true },
                { src: 'assets/product-1-detail.png', isCover: false },
                { src: 'assets/product-1-side.png', isCover: false }
            ]);
            runtimeDetailProduct.images.forEach(function (image, index) {
                assert(new RegExp('^/media/product-gallery/product-1/' + index + '\\.webp\\?v=').test(image.thumbnailSrc));
            });

            const mutated = snapshotSource.readProducts();
            mutated[0].name = 'Mutated';
            assert.strictEqual(snapshotSource.readProducts()[0].name, 'Product 1');
        } finally {
            runtimeDb.close();
        }

        const isolationCode = [
            "const Module=require('module');",
            "const original=Module._load;",
            "Module._load=function(request,parent,isMain){if(request==='http'||request==='https'||/[\\\\/]db$/.test(request)){throw new Error('forbidden module '+request);}return original.apply(this,arguments);};",
            "global.fetch=function(){throw new Error('network forbidden');};",
            "const source=require('./server/lib/publicSiteDataSource').createSnapshotPublicSiteDataSource(process.argv[1]);",
            "if(source.readProducts().length!==38||!source.readContentBlock('home'))process.exit(2);"
        ].join('');
        const isolated = spawnSync(process.execPath, ['-e', isolationCode, captured.out], { cwd: ROOT, encoding: 'utf8' });
        assert.strictEqual(isolated.status, 0, isolated.stderr || isolated.stdout);

        console.log('Stage 2C public snapshot tests passed.');
    } finally {
        fs.readdirSync(TEST_ROOT, { withFileTypes: true }).forEach(function (entry) {
            if (!entry.name.startsWith(TEST_PREFIX)) return;
            const resolved = path.resolve(TEST_ROOT, entry.name);
            const allowedRoot = path.resolve(ROOT, '.tmp') + path.sep;
            if (resolved.startsWith(allowedRoot)) fs.rmSync(resolved, { recursive: true, force: true });
        });
    }
}

main().catch(function (err) {
    console.error(err.stack || err.message);
    process.exit(1);
});
