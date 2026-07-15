'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { resolveDbPath } = require('../server/lib/db');
const { createVerifiedSqliteBackup } = require('../server/lib/sqliteBackup');

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

function run(command, args, options) {
    return new Promise(function (resolve, reject) {
        const child = childProcess.spawn(command, args, options);
        child.once('error', reject);
        child.once('exit', function (code, signal) {
            if (code === 0) return resolve();
            reject(new Error('Acceptance process failed with ' + (signal ? 'signal ' + signal : 'exit code ' + code) + '.'));
        });
    });
}

async function main() {
    const tempRoot = path.resolve(os.tmpdir());
    const tempDir = fs.mkdtempSync(path.join(tempRoot, 'longxiang-acceptance-copy-'));
    const resolvedTempDir = path.resolve(tempDir);
    if (path.dirname(resolvedTempDir) !== tempRoot || path.basename(resolvedTempDir).indexOf('longxiang-acceptance-copy-') !== 0) {
        throw new Error('Refusing to use an unexpected temporary directory: ' + resolvedTempDir);
    }
    const dbPath = path.join(resolvedTempDir, 'acceptance.db');
    try {
        const backup = await createVerifiedSqliteBackup({
            sourcePath: resolveDbPath(),
            backupPath: dbPath
        });
        console.log('Acceptance database copy verified: schema=' + backup.summary.schemaVersion + ', bytes=' + backup.sizeBytes);
        const port = await availablePort();
        await run(process.execPath, ['scripts/test-acceptance.js'], {
            cwd: path.resolve(__dirname, '..'),
            env: Object.assign({}, process.env, { DB_PATH: dbPath, PORT: String(port) }),
            stdio: 'inherit'
        });
    } finally {
        fs.rmSync(resolvedTempDir, { recursive: true, force: true });
    }
}

main().catch(function (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
