'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const {
    analyzeTranslationBackfill,
    applyTranslationBackfill,
    rollbackTranslationBackfill
} = require('../server/lib/translationBackfill');

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
    const explicit = argument('db');
    const configured = explicit || process.env.DB_PATH || 'data/longxiang.db';
    return path.isAbsolute(configured) ? configured : path.join(__dirname, '..', configured);
}

function main() {
    const apply = hasFlag('apply');
    const rollback = hasFlag('rollback');
    if (apply && rollback) throw new Error('Choose either --apply or --rollback.');
    const dbPath = resolveDbPath();
    const writes = apply || rollback;
    if (writes && !argument('db')) throw new Error('Write mode requires an explicit --db path.');
    if (apply && argument('confirm') !== 'STAGE_B_BACKFILL') {
        throw new Error('--apply requires --confirm=STAGE_B_BACKFILL.');
    }
    if (rollback && argument('confirm') !== 'STAGE_B_BACKFILL_ROLLBACK') {
        throw new Error('--rollback requires --confirm=STAGE_B_BACKFILL_ROLLBACK.');
    }
    const receiptPath = argument('receipt');
    if (apply && !receiptPath) throw new Error('--apply requires --receipt=<new receipt path>.');
    if (rollback && !receiptPath && !argument('plan-hash')) {
        throw new Error('--rollback requires --receipt=<receipt path> or --plan-hash=<applied plan hash>.');
    }
    const resolvedReceiptPath = receiptPath ? path.resolve(receiptPath) : '';
    let receiptHandle = null;
    let receiptCompleted = false;
    if (apply) {
        if (!fs.existsSync(path.dirname(resolvedReceiptPath))) throw new Error('Receipt directory does not exist.');
        receiptHandle = fs.openSync(resolvedReceiptPath, 'wx', 0o600);
    }
    let db = null;
    try {
        db = new Database(dbPath, writes ? { fileMustExist: true } : { readonly: true, fileMustExist: true });
        db.pragma('foreign_keys = ON');
        const registry = loadLocaleRegistry();
        let result;
        let mode = 'dry-run';
        if (apply) {
            mode = 'apply';
            result = applyTranslationBackfill({
                db,
                registry,
                expectedPlanHash: argument('expected-plan-hash'),
                actor: { username: 'translation-backfill-cli' }
            });
            try {
                fs.writeFileSync(receiptHandle, JSON.stringify(result.receipt, null, 2) + '\n', { encoding: 'utf8' });
                fs.fsyncSync(receiptHandle);
                receiptCompleted = true;
            } catch (error) {
                throw new Error('Backfill applied but receipt export failed. Recover with --rollback --plan-hash=' + result.receipt.planHash + '. ' + error.message);
            }
        } else if (rollback) {
            mode = 'rollback';
            result = rollbackTranslationBackfill({
                db,
                registry,
                receipt: receiptPath ? JSON.parse(fs.readFileSync(resolvedReceiptPath, 'utf8')) : null,
                planHash: argument('plan-hash'),
                actor: { username: 'translation-backfill-rollback-cli' }
            });
        } else {
            result = analyzeTranslationBackfill({ db, registry });
        }
        console.log(JSON.stringify({ mode, dbPath, receiptPath: resolvedReceiptPath || null, result }, null, 2));
    } finally {
        if (db) db.close();
        if (receiptHandle != null) fs.closeSync(receiptHandle);
        if (apply && !receiptCompleted && fs.existsSync(resolvedReceiptPath)) {
            fs.unlinkSync(resolvedReceiptPath);
        }
    }
}

try {
    main();
} catch (error) {
    console.error(error.code ? error.code + ': ' + error.message : error.message);
    process.exitCode = 1;
}
