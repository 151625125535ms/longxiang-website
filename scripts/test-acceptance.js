const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
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
                resolve({ status: res.statusCode, body: parsed, raw: raw });
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
        await startServer({ USE_SQLITE: 'true' });

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
            if (!Object.prototype.hasOwnProperty.call(data, 'address') &&
                    !Object.prototype.hasOwnProperty.call(data, 'name') &&
                    !Object.prototype.hasOwnProperty.call(data, 'phone')) {
                throw new Error('missing top-level address/name/phone field');
            }
            return 'top-level company field present';
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
            return 'sqlite.enabled=true';
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

        await stopServer();

        await runTest('T22', 'USE_SQLITE=false GET /api/products fallback', async function () {
            await startServer({ USE_SQLITE: 'false' });
            const res = await request('GET', '/api/products');
            expectStatus(res, 200);
            const list = expectArray(res.body, false);
            await stopServer();
            return 'items=' + list.length;
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
