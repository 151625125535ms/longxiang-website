const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { staticSeoRouteDefinitions } = require('../server/lib/staticPageSeoRenderer');
const { readPublicProducts } = require('../server/lib/publicProducts');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = 'http://127.0.0.1:' + PORT;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'LongxiangAdmin@2026';

let serverProcess = null;
let passCount = 0;
let failCount = 0;
const startTime = Date.now();

function request(method, urlPath, options) {
    options = options || {};
    const body = options.body == null ? null : JSON.stringify(options.body);
    const headers = options.headers || {};
    if (body) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(body);
    }

    return new Promise(function (resolve, reject) {
        const req = http.request({
            hostname: '127.0.0.1',
            port: PORT,
            method: method,
            path: urlPath,
            headers: headers,
            timeout: options.timeout || 5000
        }, function (res) {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) { raw += chunk; });
            res.on('end', function () {
                let parsed = null;
                try {
                    parsed = raw ? JSON.parse(raw) : null;
                } catch (err) {
                    parsed = raw;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: raw });
            });
        });
        req.on('timeout', function () {
            req.destroy(new Error('request timeout'));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function waitForReady() {
    const deadline = Date.now() + 15000;

    function check() {
        return request('GET', '/api/health', { timeout: 1000 }).then(function (res) {
            if (res.status === 200) return true;
            throw new Error('health status ' + res.status);
        }).catch(function (err) {
            if (Date.now() > deadline) throw err;
            return delay(300).then(check);
        });
    }

    return check();
}

function startServer(extraEnv) {
    const env = {};
    Object.keys(process.env).forEach(function (key) { env[key] = process.env[key]; });
    Object.keys(extraEnv || {}).forEach(function (key) { env[key] = extraEnv[key]; });
    env.PORT = String(PORT);

    serverProcess = spawn(process.execPath, ['server/app.js'], {
        cwd: ROOT,
        env: env,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', function (chunk) { serverOutput += chunk.toString(); });
    serverProcess.stderr.on('data', function (chunk) { serverOutput += chunk.toString(); });
    serverProcess.on('exit', function (code) {
        if (code && code !== 0) {
            serverOutput += '\nserver exited with code ' + code;
        }
    });

    return waitForReady().catch(function (err) {
        throw new Error('server did not become ready: ' + err.message + '\n' + serverOutput);
    });
}

function stopServer() {
    if (!serverProcess || serverProcess.killed) return Promise.resolve();

    return new Promise(function (resolve) {
        const proc = serverProcess;
        const timer = setTimeout(function () {
            if (!proc.killed) proc.kill('SIGKILL');
            resolve();
        }, 3000);

        proc.once('exit', function () {
            clearTimeout(timer);
            resolve();
        });
        proc.kill();
        serverProcess = null;
    });
}

function getPayload(body) {
    if (body && body.ok && body.data !== undefined) return body.data;
    return body;
}

function getList(body) {
    const payload = getPayload(body);
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return null;
}

function hasMetaTotal(body) {
    if (body && body.meta && typeof body.meta.total === 'number') return true;
    if (body && body.data && body.data.meta && typeof body.data.meta.total === 'number') return true;
    return false;
}

function runTest(id, label, fn) {
    return Promise.resolve().then(fn).then(function (detail) {
        passCount += 1;
        console.log('✓ ' + id + ' ' + label + ' — ' + detail);
    }).catch(function (err) {
        failCount += 1;
        console.log('✗ ' + id + ' ' + label + ' — ' + err.message);
    });
}

function expectStatus(res, expected) {
    if (Array.isArray(expected)) {
        if (expected.indexOf(res.status) === -1) throw new Error('expected ' + expected.join('/') + ', got ' + res.status);
        return;
    }
    if (res.status !== expected) throw new Error('expected ' + expected + ', got ' + res.status);
}

function expectArray(body, allowEmpty) {
    const list = getList(body);
    if (!Array.isArray(list)) throw new Error('response data is not an array');
    if (!allowEmpty && list.length <= 0) throw new Error('array is empty');
    return list;
}

async function login() {
    const res = await request('POST', '/api/auth/login', {
        body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }
    });
    expectStatus(res, 200);
    if (!res.body || !res.body.token) throw new Error('login did not return token');
    return res.body.token;
}

function authHeaders(token) {
    return { Authorization: 'Bearer ' + token };
}

async function main() {
    let token = '';

    try {
        await startServer({});

        await runTest('T01', 'GET /api/health', async function () {
            const res = await request('GET', '/api/health');
            expectStatus(res, 200);
            if (!res.body || !res.body.sqlite || res.body.sqlite.enabled !== true) throw new Error('sqlite.enabled is not true');
            return 'sqlite.enabled=true';
        });

        await runTest('T02', 'GET /api/products', async function () {
            const res = await request('GET', '/api/products');
            expectStatus(res, 200);
            const list = expectArray(res.body, false);
            return 'items=' + list.length;
        });

        await runTest('T02B', 'product list stays cover-only and detail exposes ordered images', async function () {
            const listResponse = await request('GET', '/api/products');
            expectStatus(listResponse, 200);
            const list = expectArray(listResponse.body, false);
            if (list.some(function (product) { return Object.prototype.hasOwnProperty.call(product, 'images'); })) {
                throw new Error('product list unexpectedly exposes gallery images');
            }
            const listed = list[0];
            const identifier = listed.slug || listed.id;
            const detailResponse = await request('GET', '/api/products/' + encodeURIComponent(identifier));
            expectStatus(detailResponse, 200);
            const detail = getPayload(detailResponse.body) || {};
            if (!Array.isArray(detail.images) || !detail.images.length) throw new Error('detail images are missing');
            if (!detail.images[0].isCover || detail.images[0].src !== detail.image) {
                throw new Error('detail cover is not first in images');
            }
            const paths = detail.images.map(function (image) { return image && image.src; });
            if (new Set(paths).size !== paths.length || detail.images.some(function (image) {
                return !image || !image.src || !image.thumbnailSrc ||
                    !/^\/media\/product-gallery\//.test(image.thumbnailSrc) ||
                    Object.prototype.hasOwnProperty.call(image, 'asset_id') || Object.prototype.hasOwnProperty.call(image, 'id');
            })) {
                throw new Error('detail images contain duplicates or internal fields');
            }
            return 'list cover-only; detail images=' + detail.images.length;
        });

        await runTest('T03', 'GET /api/certifications', async function () {
            const res = await request('GET', '/api/certifications');
            expectStatus(res, 200);
            const list = expectArray(res.body, false);
            return 'items=' + list.length;
        });

        await runTest('T04', 'GET /api/company', async function () {
            const res = await request('GET', '/api/company');
            expectStatus(res, 200);
            const data = getPayload(res.body) || {};
            if (!data.identity || data.identity.legalName !== 'Henan Longxiang Electric Co., Ltd.') {
                throw new Error('public legal identity is not canonical');
            }
            if (data.identity.registeredCapital !== 'RMB 69.552 million') {
                throw new Error('registered capital is not canonical');
            }
            if (data.email !== 'henanlxgj@163.com' || data.identity.globalSalesEmail !== 'henanlxgj@163.com') {
                throw new Error('public email is not the international sales email');
            }
            const serialized = JSON.stringify(data);
            const emails = serialized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
            if (Object.prototype.hasOwnProperty.call(data, 'phone') ||
                    emails.some(function (email) { return email.toLowerCase() !== 'henanlxgj@163.com'; })) {
                throw new Error('domestic contact details leaked from public company API');
            }
            return 'canonical identity and international-only contact';
        });

        await runTest('T04B', 'GET /api/content-blocks/contact hides domestic contacts', async function () {
            const res = await request('GET', '/api/content-blocks/contact');
            expectStatus(res, 200);
            const body = res.body && res.body.body || {};
            if (body.email !== 'henanlxgj@163.com') {
                throw new Error('contact block does not expose the international sales email');
            }
            if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
                throw new Error('contact block exposes a phone field');
            }
            if (!body.contactPage || body.contactPage.factoryAddressLabel !== 'Factory Address') {
                throw new Error('contact address label changed unexpectedly');
            }
            const serialized = JSON.stringify(body);
            const emails = serialized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
            if (emails.some(function (email) { return email.toLowerCase() !== 'henanlxgj@163.com'; })) {
                throw new Error('domestic contact details leaked from public contact block');
            }
            return 'international email only; address label preserved';
        });

        await runTest('T04C', 'global shell exposes localized China website footer link', async function () {
            const res = await request('GET', '/api/content-blocks/global-shell');
            expectStatus(res, 200);
            const body = res.body && res.body.body || {};
            const links = body.navigation && body.navigation.quickLinks || [];
            const chinaSite = links.find(function (item) {
                return item && item.href === 'https://www.lxelec.cn/';
            });
            if (!chinaSite) throw new Error('China website link missing from footer quick links');
            ['label', 'labelAr', 'labelFr', 'labelRu'].forEach(function (key) {
                if (!String(chinaSite[key] || '').trim()) throw new Error('China website link missing ' + key);
            });
            return 'localized crawlable link present';
        });

        await runTest('T04D', 'filtered product URLs are noindex with clean canonical', async function () {
            const filtered = await request('GET', '/products.html?group=transformer&sub=dry-type');
            expectStatus(filtered, 200);
            if (!/<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i.test(filtered.raw)) {
                throw new Error('filtered product page is missing noindex,follow');
            }
            if (!/<link\s+rel=["']canonical["']\s+href=["']https:\/\/www\.lxenelectric\.com\/products\.html["']/i.test(filtered.raw)) {
                throw new Error('filtered product page canonical is not clean');
            }

            const localized = await request('GET', '/fr/products.html?group=transformer');
            expectStatus(localized, 200);
            if (!/<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i.test(localized.raw) ||
                    !/<link\s+rel=["']canonical["']\s+href=["']https:\/\/www\.lxenelectric\.com\/fr\/products\.html["']/i.test(localized.raw)) {
                throw new Error('localized filtered product page SEO directives are incorrect');
            }

            const clean = await request('GET', '/products.html');
            expectStatus(clean, 200);
            if (/<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i.test(clean.raw)) {
                throw new Error('clean product listing was marked noindex');
            }
            return 'parameter variants noindex; clean listing remains indexable';
        });

        await runTest('T04E', 'static sitemap pages expose canonical hreflang and schema in raw HTML', async function () {
            const routes = staticSeoRouteDefinitions();
            if (routes.length !== 28) throw new Error('expected 28 static SEO routes, got ' + routes.length);

            for (const route of routes) {
                const res = await request('GET', route.path);
                expectStatus(res, 200);
                const headMatch = String(res.raw || '').match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
                const head = headMatch ? headMatch[1] : '';
                const canonicalTags = head.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || [];
                const alternateTags = head.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi) || [];
                const expectedCanonical = 'http://127.0.0.1:' + PORT + route.path;

                if (canonicalTags.length !== 1 || canonicalTags[0].indexOf('href="' + expectedCanonical + '"') === -1) {
                    throw new Error('raw canonical mismatch for ' + route.path);
                }
                if (alternateTags.length !== 5) {
                    throw new Error('raw hreflang count mismatch for ' + route.path + ': ' + alternateTags.length);
                }
                ['en', 'ar', 'fr', 'ru', 'x-default'].forEach(function (language) {
                    if (!alternateTags.some(function (tag) {
                        return tag.indexOf('hreflang="' + language + '"') !== -1;
                    })) {
                        throw new Error('raw hreflang missing ' + language + ' for ' + route.path);
                    }
                });
                const expectedSchemaKey = route.basePath === '/' && route.locale.code === 'en'
                    ? 'site-graph'
                    : route.schemaKey;
                if (head.indexOf('"@type":"' + route.schemaType + '"') === -1 ||
                        head.indexOf('data-schema-auto="' + expectedSchemaKey + '"') === -1) {
                    throw new Error('raw page schema mismatch for ' + route.path);
                }
                if (route.breadcrumbKey &&
                        (head.indexOf('"@type":"BreadcrumbList"') === -1 ||
                         head.indexOf('data-schema-auto="' + route.breadcrumbKey + '"') === -1)) {
                    throw new Error('raw breadcrumb schema missing for ' + route.path);
                }
                if (/hreflang=["']pt["']|\/pt\/|lxelec\.cn|17513354200|hnlxdq2003@163\.com/i.test(head)) {
                    throw new Error('forbidden locale, domain, or domestic contact in SEO head for ' + route.path);
                }
            }
            return '28 routes expose raw canonical, hreflang, and basic schema';
        });

        await runTest('T04E2', 'legacy homepage aliases redirect once to canonical locale roots', async function () {
            const redirects = [
                { from: '/index.html', to: '/' },
                { from: '/ar', to: '/ar/' },
                { from: '/ar/index.html', to: '/ar/' },
                { from: '/fr', to: '/fr/' },
                { from: '/fr/index.html', to: '/fr/' },
                { from: '/ru', to: '/ru/' },
                { from: '/ru/index.html', to: '/ru/' }
            ];
            for (const redirect of redirects) {
                const response = await request('GET', redirect.from + '?utm_source=homepage-test');
                expectStatus(response, 301);
                const expectedLocation = redirect.to + '?utm_source=homepage-test';
                if (response.headers.location !== expectedLocation) {
                    throw new Error('homepage redirect mismatch for ' + redirect.from + ': ' + response.headers.location);
                }
            }

            for (const pathname of ['/', '/ar/', '/fr/', '/ru/']) {
                const response = await request('GET', pathname);
                expectStatus(response, 200);
                const expectedCanonical = 'http://127.0.0.1:' + PORT + pathname;
                if (!response.raw.includes('<link rel="canonical" href="' + expectedCanonical + '">')) {
                    throw new Error('canonical homepage mismatch for ' + pathname);
                }
                if ((response.raw.match(/hreflang=/g) || []).length !== 5) {
                    throw new Error('homepage hreflang count mismatch for ' + pathname);
                }
            }
            return '7 aliases 301 once; 4 canonical homes return 200 with five hreflang links';
        });

        await runTest('T04F', 'legacy query product URLs redirect once to clean localized products', async function () {
            const products = readPublicProducts();
            const product = products[0];
            const identifier = product.id;
            const cleanIdentifier = product.slug || product.id;
            const directPath = '/product-detail.html?id=' + encodeURIComponent(identifier) + '&utm_source=legacy';
            const direct = await request('GET', directPath);
            expectStatus(direct, 301);
            if (direct.headers.location !== '/products/' + encodeURIComponent(cleanIdentifier)) {
                throw new Error('direct legacy redirect location mismatch: ' + direct.headers.location);
            }
            if (/[?#]/.test(direct.headers.location)) {
                throw new Error('direct legacy redirect retained query or fragment');
            }

            const directHead = await request('HEAD', directPath);
            expectStatus(directHead, 301);
            if (directHead.headers.location !== direct.headers.location) {
                throw new Error('GET and HEAD redirect locations differ');
            }

            const localizedAlias = await request('GET', '/fr/product-detail.html?id=SCBH15&msclkid=test');
            expectStatus(localizedAlias, 301);
            if (localizedAlias.headers.location !== '/fr/products/amorphous-scbh-dry') {
                throw new Error('localized alias redirect location mismatch: ' + localizedAlias.headers.location);
            }

            for (const conflict of ['3phase-3limb', '3phase-5limb']) {
                const conflictResponse = await request('GET', '/ru/product-detail.html?id=' + conflict);
                expectStatus(conflictResponse, 301);
                if (conflictResponse.headers.location !== '/ru/products/' + conflict) {
                    throw new Error('conflicting alias did not preserve formal product: ' + conflict);
                }
            }

            const invalidPaths = [
                '/product-detail.html',
                '/ar/product-detail.html?id=',
                '/fr/product-detail.html?id=s13&id=SCBH15',
                '/ru/product-detail.html?id%5B%5D=s13',
                '/product-detail.html?id=unknown-product',
                '/product-detail.html?id=%20s13',
                '/product-detail.html?id=%E0%A4%A'
            ];
            for (const invalidPath of invalidPaths) {
                const invalid = await request('GET', invalidPath);
                expectStatus(invalid, 404);
                if (!/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']/i.test(invalid.raw)) {
                    throw new Error('invalid legacy URL is missing noindex 404 shell: ' + invalidPath);
                }
            }

            return 'GET/HEAD 301, clean Location, direct-before-alias conflicts, invalid IDs 404';
        });

        await runTest('T05', 'GET /api/education', async function () {
            const res = await request('GET', '/api/education');
            expectStatus(res, 200);
            const data = getPayload(res.body) || {};
            if (!Array.isArray(data.sections)) throw new Error('sections is not an array');
            return 'sections=' + data.sections.length;
        });

        await runTest('T06', 'POST /api/auth/login (wrong pwd)', async function () {
            const res = await request('POST', '/api/auth/login', {
                body: { username: ADMIN_USERNAME, password: 'wrong-password' }
            });
            expectStatus(res, [400, 401]);
            return 'status=' + res.status;
        });

        await runTest('T07', 'POST /api/auth/login (correct pwd)', async function () {
            token = await login();
            return 'token returned';
        });

        await runTest('T08', 'GET /api/admin/dashboard (no token)', async function () {
            const res = await request('GET', '/api/admin/dashboard');
            expectStatus(res, 401);
            return 'status=401';
        });

        await runTest('T09', 'GET /api/admin/dashboard (with token)', async function () {
            const res = await request('GET', '/api/admin/dashboard', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const data = getPayload(res.body) || {};
            if (!data.products) throw new Error('data.products missing');
            return 'data.products exists';
        });

        await runTest('T10', 'GET /api/admin/products', async function () {
            const res = await request('GET', '/api/admin/products', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, false);
            return 'items=' + list.length;
        });

        await runTest('T11', 'GET /api/admin/products?status=deleted', async function () {
            const res = await request('GET', '/api/admin/products?status=deleted', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, true);
            return 'items=' + list.length;
        });

        await runTest('T12', 'POST /api/admin/products (missing fields)', async function () {
            const res = await request('POST', '/api/admin/products', { headers: authHeaders(token), body: {} });
            expectStatus(res, 422);
            return 'status=422';
        });

        await runTest('T13', 'GET /api/admin/products/1', async function () {
            const res = await request('GET', '/api/admin/products/1', { headers: authHeaders(token) });
            expectStatus(res, [200, 404]);
            return 'status=' + res.status;
        });

        await runTest('T14', 'GET /api/admin/certifications', async function () {
            const res = await request('GET', '/api/admin/certifications', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, true);
            return 'items=' + list.length;
        });

        await runTest('T15', 'GET /api/admin/categories?type=product', async function () {
            const res = await request('GET', '/api/admin/categories?type=product', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, true);
            return 'items=' + list.length;
        });

        await runTest('T16', 'GET /api/admin/content-blocks/company-overview', async function () {
            const res = await request('GET', '/api/admin/content-blocks/company-overview', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const data = getPayload(res.body) || {};
            if (!data.body_json || typeof data.body_json !== 'object' || Array.isArray(data.body_json)) throw new Error('data.body_json is not an object');
            return 'body_json object';
        });

        await runTest('T16B', 'GET /api/admin/content-blocks/company-identity', async function () {
            const res = await request('GET', '/api/admin/content-blocks/company-identity', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const data = getPayload(res.body) || {};
            if (!data.body_json || data.body_json.legalName !== 'Henan Longxiang Electric Co., Ltd.') {
                throw new Error('canonical company identity block missing');
            }
            if (data.body_json.registeredCapital !== 'RMB 69.552 million') {
                throw new Error('company identity capital is not canonical');
            }
            return 'canonical identity block';
        });

        await runTest('T17', 'GET /api/admin/inquiries', async function () {
            const res = await request('GET', '/api/admin/inquiries', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, true);
            return 'items=' + list.length;
        });

        await runTest('T18', 'GET /api/admin/system/status', async function () {
            const res = await request('GET', '/api/admin/system/status', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const data = getPayload(res.body) || {};
            if (!data.sqlite || data.sqlite.enabled !== true) throw new Error('data.sqlite.enabled is not true');
            if (data.publicApiSource !== 'sqlite') throw new Error('publicApiSource is not sqlite');
            if (Number(data.sqlite.schemaVersion || 0) < 6) throw new Error('schemaVersion is below Arabic SEO migration');
            return 'sqlite.enabled=true, publicApiSource=sqlite, schemaVersion>=6';
        });

        await runTest('T19', 'GET /api/admin/settings/modules', async function () {
            const res = await request('GET', '/api/admin/settings/modules', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const data = getPayload(res.body);
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('data is not an object');
            return 'settings object';
        });

        await runTest('T20', 'GET /api/admin/audit-logs', async function () {
            const res = await request('GET', '/api/admin/audit-logs', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, true);
            if (!hasMetaTotal(res.body)) throw new Error('meta.total missing');
            return 'items=' + list.length + ', meta.total present';
        });

        await runTest('T21', 'GET /api/admin/assets', async function () {
            const res = await request('GET', '/api/admin/assets', { headers: authHeaders(token) });
            expectStatus(res, 200);
            const list = expectArray(res.body, true);
            return 'items=' + list.length;
        });

        await runTest('T22', 'legacy product write is gone', async function () {
            const res = await request('POST', '/api/products', { body: { id: 'legacy-test', name: 'Legacy Test' } });
            expectStatus(res, 410);
            return 'status=410';
        });

        await runTest('T23', 'legacy certification write is gone', async function () {
            const res = await request('POST', '/api/certifications', { body: { name: 'Legacy Test' } });
            expectStatus(res, 410);
            return 'status=410';
        });

        await runTest('T24', 'legacy education write is gone', async function () {
            const res = await request('PATCH', '/api/education', { body: { updatedAt: new Date().toISOString() } });
            expectStatus(res, 410);
            return 'status=410';
        });

        await runTest('T25', 'legacy inquiry management is gone', async function () {
            const res = await request('GET', '/api/inquiries');
            expectStatus(res, 410);
            return 'status=410';
        });

        await runTest('T26', 'runtime has no JSON data source references', async function () {
            const files = [];
            function walk(dir) {
                fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) return walk(fullPath);
                    if (path.relative(ROOT, fullPath) === path.join('scripts', 'test-acceptance.js')) return;
                    if (entry.isFile() && /\.(js|json|example)$/.test(entry.name)) files.push(fullPath);
                });
            }
            [path.join(ROOT, 'server'), path.join(ROOT, 'scripts')].forEach(walk);
            files.push(path.join(ROOT, 'package.json'), path.join(ROOT, '.env.example'));
            const forbidden = [
                'PRODUCTS_DATA_FILE',
                'CERTIFICATIONS_DATA_FILE',
                'COMPANY_DATA_FILE',
                'INQUIRIES_DATA_FILE',
                'EDUCATION_DATA_FILE',
                'USE_SQLITE',
                'readJson(',
                'updateJson(',
                'writeJsonAtomic(',
                'data/products.json',
                'data/company.json',
                'data/certifications.json',
                'data/education.json',
                'data/inquiries.json'
            ];
            const hits = [];
            files.forEach(function (file) {
                const text = fs.readFileSync(file, 'utf8');
                forbidden.forEach(function (needle) {
                    if (text.indexOf(needle) !== -1) hits.push(path.relative(ROOT, file) + ': ' + needle);
                });
            });
            if (hits.length) throw new Error(hits.join('; '));
            return 'no runtime JSON source references';
        });
    } finally {
        await stopServer();
        const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('结果：' + passCount + ' 通过 / ' + failCount + ' 失败');
        console.log('耗时：' + seconds + 's');
        if (failCount > 0) process.exitCode = 1;
    }
}

main().catch(async function (err) {
    await stopServer();
    console.error('验收脚本执行失败：' + err.message);
    process.exit(1);
});
