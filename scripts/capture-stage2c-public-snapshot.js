'use strict';

const fs = require('fs');
const path = require('path');
const {
    FORMAT_VERSION,
    SNAPSHOT_ROOT,
    SNAPSHOT_DEFINITIONS,
    CONTENT_BLOCK_SLUGS,
    SUPPORTED_LOCALES,
    sha256,
    assertSnapshotDirectory,
    sitemapLocations,
    sensitiveFindings
} = require('../server/lib/stage2cPublicSnapshot');
const { verifyPublicSnapshot } = require('./verify-stage2c-public-snapshot');

const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;

function optionValue(argv, name) {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : '';
}

function normalizeBase(value, allowLocalhost) {
    let url;
    try { url = new URL(value); } catch (err) { throw new Error('Invalid snapshot base URL.'); }
    const production = url.protocol === 'https:' && ['www.lxenelectric.com', 'lxenelectric.com'].includes(url.hostname) && !url.port;
    const local = allowLocalhost === true && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (!production && !local) throw new Error('Snapshot base origin or host is not allowed.');
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Snapshot base must be an origin without credentials, path, query, or hash.');
    return url.origin;
}

function outputPaths(output, force) {
    fs.mkdirSync(SNAPSHOT_ROOT, { recursive: true });
    const target = assertSnapshotDirectory(output, { allowMissing: true });
    if (fs.existsSync(target)) {
        if (!force) throw new Error('Snapshot output already exists; pass --force to replace a verified snapshot.');
        verifyPublicSnapshot(target);
    }
    const token = process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    const staging = path.join(SNAPSHOT_ROOT, 'stage2c-public-snapshot-staging-' + token);
    const backup = path.join(SNAPSHOT_ROOT, 'stage2c-public-snapshot-backup-' + token);
    assertSnapshotDirectory(staging, { allowMissing: true });
    assertSnapshotDirectory(backup, { allowMissing: true });
    return { target, staging, backup };
}

async function readLimitedBody(response, signal) {
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error('Snapshot response body exceeds size limit.');
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
        if (signal.aborted) throw new Error('Snapshot request timeout.');
        const bytes = Buffer.from(chunk);
        total += bytes.length;
        if (total > MAX_RESPONSE_BYTES) throw new Error('Snapshot response body exceeds size limit.');
        chunks.push(bytes);
    }
    return Buffer.concat(chunks);
}

async function fetchDefinition(base, definition, options) {
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, options.timeoutMs);
    try {
        const response = await (options.fetchImpl || fetch)(base + definition.endpoint, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { accept: definition.type === 'json' ? 'application/json' : 'application/xml,text/xml' }
        });
        if (response.status >= 300 && response.status < 400) throw new Error('Redirect rejected for ' + definition.endpoint + '.');
        if (response.status < 200 || response.status >= 300) throw new Error('Unexpected HTTP status ' + response.status + ' for ' + definition.endpoint + '.');
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        if (definition.type === 'json' && !contentType.includes('application/json')) throw new Error('Invalid JSON content-type for ' + definition.endpoint + '.');
        if (definition.type === 'xml' && !/(?:application|text)\/xml/.test(contentType)) throw new Error('Invalid XML content-type for ' + definition.endpoint + '.');
        const bytes = await readLimitedBody(response, controller.signal);
        if (definition.type === 'xml') return { bytes, value: bytes.toString('utf8'), contentType };
        let value;
        try { value = JSON.parse(bytes.toString('utf8')); } catch (err) { throw new Error('Invalid JSON response for ' + definition.endpoint + ': ' + err.message); }
        const formatted = Buffer.from(JSON.stringify(value, null, 2) + '\n');
        return { bytes: formatted, value, contentType };
    } catch (err) {
        if (controller.signal.aborted) throw new Error('Snapshot request timeout for ' + definition.endpoint + '.');
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

function writeStagingFile(staging, relativePath, bytes) {
    const resolved = path.resolve(staging, relativePath);
    if (!resolved.startsWith(staging + path.sep)) throw new Error('Snapshot file path escaped staging directory.');
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, bytes, { flag: 'wx' });
}

function finalizeSnapshot(paths, force) {
    let movedExisting = false;
    try {
        if (force && fs.existsSync(paths.target)) {
            fs.renameSync(paths.target, paths.backup);
            movedExisting = true;
        }
        fs.renameSync(paths.staging, paths.target);
        if (movedExisting) fs.rmSync(paths.backup, { recursive: true, force: true });
    } catch (err) {
        if (!fs.existsSync(paths.target) && movedExisting && fs.existsSync(paths.backup)) fs.renameSync(paths.backup, paths.target);
        throw err;
    }
}

async function capturePublicSnapshot(options) {
    options = options || {};
    const paths = outputPaths(path.resolve(options.out || ''), options.force === true);
    const base = normalizeBase(options.base, options.allowLocalhost === true);
    const timeoutMs = Number(options.timeoutMs || 15000);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 25 || timeoutMs > 120000) throw new Error('Invalid snapshot request timeout.');
    fs.mkdirSync(paths.staging, { recursive: false });
    const dataByFile = {};
    const fileMetadata = {};
    try {
        for (const definition of SNAPSHOT_DEFINITIONS) {
            const result = await fetchDefinition(base, definition, { timeoutMs, fetchImpl: options.fetchImpl });
            writeStagingFile(paths.staging, definition.file, result.bytes);
            dataByFile[definition.file] = result.value;
            fileMetadata[definition.file] = {
                endpoint: definition.endpoint,
                type: definition.type,
                contentType: result.contentType,
                bytes: result.bytes.length,
                sha256: sha256(result.bytes)
            };
        }
        const findings = sensitiveFindings(dataByFile);
        if (findings.length) throw new Error('Sensitive or forbidden production data detected: ' + findings.join('; '));
        const products = dataByFile['products.json'];
        const sitemapCount = sitemapLocations(dataByFile['sitemap.xml']).length;
        const contentVersions = {};
        CONTENT_BLOCK_SLUGS.forEach(function (slug) {
            contentVersions[slug] = Number(dataByFile['content-blocks/' + slug + '.json'].version || 0);
        });
        const locales = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'locales.json'), 'utf8'));
        const manifest = {
            formatVersion: FORMAT_VERSION,
            snapshotType: 'stage2c-public',
            sourceBase: base,
            capturedAt: new Date().toISOString(),
            endpoints: SNAPSHOT_DEFINITIONS.map(function (item) { return item.endpoint; }),
            files: fileMetadata,
            contentVersions,
            productCount: Array.isArray(products) ? products.length : 0,
            sitemapUrlCount: sitemapCount,
            supportedLocales: SUPPORTED_LOCALES.slice(),
            plannedLocales: locales.plannedLocales || {},
            sensitiveScan: { passed: true, findingCount: 0 }
        };
        writeStagingFile(paths.staging, 'manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
        verifyPublicSnapshot(paths.staging);
        finalizeSnapshot(paths, options.force === true);
        return { directory: paths.target, manifest, report: verifyPublicSnapshot(paths.target) };
    } catch (err) {
        if (fs.existsSync(paths.staging)) fs.rmSync(paths.staging, { recursive: true, force: true });
        throw err;
    }
}

async function main() {
    const argv = process.argv.slice(2);
    const base = optionValue(argv, '--base');
    const out = optionValue(argv, '--out');
    const force = argv.includes('--force');
    if (!base || !out) throw new Error('Usage: node scripts/capture-stage2c-public-snapshot.js --base https://www.lxenelectric.com --out .tmp/stage2c-public-snapshot-* [--force]');
    const result = await capturePublicSnapshot({ base, out, force });
    console.log(JSON.stringify({ ok: true, directory: result.directory, ...result.report }, null, 2));
}

if (require.main === module) {
    main().catch(function (err) { console.error(err.message); process.exit(1); });
}

module.exports = {
    SNAPSHOT_FILES: SNAPSHOT_DEFINITIONS,
    normalizeBase,
    capturePublicSnapshot
};
