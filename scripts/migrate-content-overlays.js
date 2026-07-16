'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const {
    analyzeContentOverlayMigration,
    applyContentOverlayMigration,
    rollbackContentOverlayMigration
} = require('../server/lib/contentOverlayMigration');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

function argument(name) {
    const prefix = '--' + name + '=';
    const match = process.argv.slice(2).find(function (value) { return value.indexOf(prefix) === 0; });
    return match ? match.slice(prefix.length) : '';
}

function hasFlag(name) {
    return process.argv.slice(2).indexOf('--' + name) !== -1;
}

function resolveDbPath() {
    const configured = argument('db') || process.env.DB_PATH || 'data/longxiang.db';
    return path.isAbsolute(configured) ? configured : path.join(__dirname, '..', configured);
}

function main() {
    const apply = hasFlag('apply');
    const rollback = hasFlag('rollback');
    if (apply && rollback) throw new Error('Choose either --apply or --rollback.');
    if ((apply || rollback) && !argument('db')) throw new Error('Write mode requires an explicit --db path.');
    if (apply && argument('confirm') !== 'STAGE_C1_CONTENT_OVERLAYS') {
        throw new Error('--apply requires --confirm=STAGE_C1_CONTENT_OVERLAYS.');
    }
    if (rollback && argument('confirm') !== 'STAGE_C1_CONTENT_OVERLAYS_ROLLBACK') {
        throw new Error('--rollback requires --confirm=STAGE_C1_CONTENT_OVERLAYS_ROLLBACK.');
    }
    const receiptPath = argument('receipt');
    if (apply && !receiptPath) throw new Error('--apply requires --receipt=<new receipt path>.');
    if (rollback && !receiptPath && !argument('plan-hash')) {
        throw new Error('--rollback requires --receipt=<receipt path> or --plan-hash=<applied plan hash>.');
    }
    const resolvedReceipt = receiptPath ? path.resolve(receiptPath) : '';
    let receiptHandle = null;
    let receiptWritten = false;
    if (apply) {
        if (!fs.existsSync(path.dirname(resolvedReceipt))) throw new Error('Receipt directory does not exist.');
        receiptHandle = fs.openSync(resolvedReceipt, 'wx', 0o600);
    }
    let db;
    try {
        const dbPath = resolveDbPath();
        db = new Database(dbPath, apply || rollback ? { fileMustExist: true } : { readonly: true, fileMustExist: true });
        db.pragma('foreign_keys = ON');
        const registry = loadLocaleRegistry();
        let mode = 'dry-run';
        let result;
        if (apply) {
            mode = 'apply';
            result = applyContentOverlayMigration({
                db,
                registry,
                expectedPlanHash: argument('expected-plan-hash'),
                actor: { username: 'content-overlay-cli' }
            });
            fs.writeFileSync(receiptHandle, JSON.stringify(result.receipt, null, 2) + '\n', { encoding: 'utf8' });
            fs.fsyncSync(receiptHandle);
            receiptWritten = true;
        } else if (rollback) {
            mode = 'rollback';
            result = rollbackContentOverlayMigration({
                db,
                registry,
                receipt: resolvedReceipt ? JSON.parse(fs.readFileSync(resolvedReceipt, 'utf8')) : null,
                planHash: argument('plan-hash'),
                actor: { username: 'content-overlay-rollback-cli' }
            });
        } else {
            result = analyzeContentOverlayMigration({ db, registry });
        }
        console.log(JSON.stringify({ mode, dbPath, receiptPath: resolvedReceipt || null, result }, null, 2));
    } finally {
        if (db) db.close();
        if (receiptHandle != null) fs.closeSync(receiptHandle);
        if (apply && !receiptWritten && resolvedReceipt && fs.existsSync(resolvedReceipt)) fs.unlinkSync(resolvedReceipt);
    }
}

try {
    main();
} catch (error) {
    console.error((error.code ? error.code + ': ' : '') + error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
}
