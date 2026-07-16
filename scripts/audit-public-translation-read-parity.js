'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const {
    comparePublicTranslationSources,
    databaseFingerprint
} = require('../server/lib/publicTranslationReadParity');

function option(name) {
    const prefix = '--' + name + '=';
    const value = process.argv.slice(2).find(function (arg) { return arg.indexOf(prefix) === 0; });
    return value ? value.slice(prefix.length) : '';
}

function run() {
    const dbArgument = option('db');
    if (!dbArgument) throw new Error('Use --db=<path> with an explicit SQLite database path.');
    const dbPath = path.resolve(dbArgument);
    if (!fs.existsSync(dbPath)) throw new Error('Database does not exist: ' + dbPath);
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
        db.pragma('query_only = ON');
        const before = databaseFingerprint(db);
        const parity = comparePublicTranslationSources({ db, registry: loadLocaleRegistry() });
        const after = databaseFingerprint(db);
        const result = {
            ok: parity.summary.blockers === 0 && before.hash === after.hash,
            readonly: true,
            database: dbPath,
            databaseFingerprintBefore: before.hash,
            databaseFingerprintAfter: after.hash,
            databaseUnchanged: before.hash === after.hash,
            parity
        };
        const outputPath = option('output');
        if (outputPath) fs.writeFileSync(path.resolve(outputPath), JSON.stringify(result, null, 2) + '\n', 'utf8');
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        if (!result.ok) process.exitCode = 1;
    } finally {
        db.close();
    }
}

try {
    run();
} catch (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
}
