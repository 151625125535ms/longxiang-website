'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const {
    analyzeContentTranslationParityRepair,
    applyContentTranslationParityRepair,
    rollbackContentTranslationParityRepair
} = require('../server/lib/contentTranslationParityRepair');

function option(name) {
    const prefix = '--' + name + '=';
    const value = process.argv.slice(2).find(function (arg) { return arg.indexOf(prefix) === 0; });
    return value ? value.slice(prefix.length) : '';
}

function hasFlag(name) {
    return process.argv.slice(2).indexOf('--' + name) !== -1;
}

function run() {
    const apply = hasFlag('apply');
    const rollback = hasFlag('rollback');
    if (apply && rollback) throw new Error('Choose either --apply or --rollback.');
    const dbArgument = option('db');
    if (!dbArgument) throw new Error('Use --db=<path> with an explicit SQLite database path.');
    const dbPath = path.resolve(dbArgument);
    if (!fs.existsSync(dbPath)) throw new Error('Database does not exist: ' + dbPath);
    if (apply && option('confirm') !== 'ABOUT_SSR_PARITY') {
        throw new Error('--apply requires --confirm=ABOUT_SSR_PARITY.');
    }
    const receiptArgument = option('receipt');
    if ((apply || rollback) && !receiptArgument) throw new Error('Write mode requires --receipt=<path>.');
    const receiptPath = receiptArgument ? path.resolve(receiptArgument) : '';
    let rollbackReceipt = null;
    if (rollback) {
        if (!fs.existsSync(receiptPath)) throw new Error('Rollback receipt does not exist.');
        rollbackReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
        const confirmation = option('confirm');
        const legacyConfirmation = confirmation === 'AR_ABOUT_SSR_PARITY_ROLLBACK'
            && rollbackReceipt.receiptVersion === 1;
        if (confirmation !== 'ABOUT_SSR_PARITY_ROLLBACK' && !legacyConfirmation) {
            throw new Error('--rollback requires --confirm=ABOUT_SSR_PARITY_ROLLBACK.');
        }
    }
    let receiptHandle = null;
    let receiptWritten = false;
    if (apply) {
        if (!option('expected-plan-hash')) throw new Error('--apply requires --expected-plan-hash=<hash>.');
        if (!fs.existsSync(path.dirname(receiptPath))) throw new Error('Receipt directory does not exist.');
        receiptHandle = fs.openSync(receiptPath, 'wx', 0o600);
    }

    let db;
    try {
        db = new Database(dbPath, apply || rollback ? { fileMustExist: true } : { readonly: true, fileMustExist: true });
        db.pragma('foreign_keys = ON');
        if (!apply && !rollback) db.pragma('query_only = ON');
        const registry = loadLocaleRegistry();
        let mode = 'dry-run';
        let result;
        if (apply) {
            mode = 'apply';
            result = db.transaction(function () {
                const applied = applyContentTranslationParityRepair({
                    db,
                    registry,
                    expectedPlanHash: option('expected-plan-hash'),
                    actor: { username: 'content-parity-repair-cli' }
                });
                fs.writeFileSync(receiptHandle, JSON.stringify(applied.receipt, null, 2) + '\n', { encoding: 'utf8' });
                fs.fsyncSync(receiptHandle);
                return applied;
            }).immediate();
            receiptWritten = true;
        } else if (rollback) {
            mode = 'rollback';
            result = rollbackContentTranslationParityRepair({
                db,
                receipt: rollbackReceipt,
                actor: { username: 'content-parity-repair-rollback-cli' }
            });
        } else {
            result = analyzeContentTranslationParityRepair({ db, registry });
        }
        process.stdout.write(JSON.stringify({ mode, dbPath, receiptPath: receiptPath || null, result }, null, 2) + '\n');
        if (mode === 'dry-run' && result.blockers.length) process.exitCode = 1;
    } finally {
        if (db) db.close();
        if (receiptHandle != null) fs.closeSync(receiptHandle);
        if (apply && !receiptWritten && receiptPath && fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath);
    }
}

try {
    run();
} catch (error) {
    console.error((error.code ? error.code + ': ' : '') + error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
}
