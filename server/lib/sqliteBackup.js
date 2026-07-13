'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function tableExists(db, tableName) {
    return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
}

function schemaVersion(db) {
    if (!tableExists(db, 'schema_migrations')) return 0;
    const row = db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get();
    return Number(row && row.version || 0);
}

function productSummary(db) {
    if (!tableExists(db, 'products')) return null;
    const total = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;
    const nonDeleted = db.prepare("SELECT COUNT(*) AS total FROM products WHERE status != 'deleted'").get().total;
    const statuses = {};
    db.prepare('SELECT COALESCE(status, \'\') AS status, COUNT(*) AS total FROM products GROUP BY status ORDER BY status')
        .all()
        .forEach(function (row) {
            statuses[row.status] = row.total;
        });
    return { total, nonDeleted, statuses };
}

function databaseSummary(db) {
    return {
        schemaVersion: schemaVersion(db),
        products: productSummary(db)
    };
}

function validateIntegrity(db) {
    const rows = db.pragma('integrity_check');
    if (!rows.length || rows.some(function (row) {
        return String(row.integrity_check || '').toLowerCase() !== 'ok';
    })) {
        throw new Error('SQLite backup integrity_check did not return only ok rows.');
    }
}

function assertBackupTarget(sourcePath, backupPath) {
    const source = path.resolve(sourcePath);
    const target = path.resolve(backupPath);
    if (source.toLowerCase() === target.toLowerCase()) {
        throw new Error('SQLite backup target must not be the active database file.');
    }
    if (fs.existsSync(target)) {
        throw new Error('SQLite backup target must be a new file: ' + target);
    }
    return target;
}

async function createVerifiedSqliteBackupFromConnection(db, options) {
    options = options || {};
    const sourcePath = path.resolve(options.sourcePath || db.name || '');
    const backupPath = assertBackupTarget(sourcePath, options.backupPath || '');
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });

    await db.backup(backupPath);
    const stat = fs.statSync(backupPath);
    if (!stat.isFile() || stat.size <= 0) throw new Error('SQLite backup file is empty: ' + backupPath);

    const sourceSummary = databaseSummary(db);
    const backupDb = new Database(backupPath, { readonly: true, fileMustExist: true });
    let backupSummary;
    try {
        validateIntegrity(backupDb);
        backupSummary = databaseSummary(backupDb);
    } finally {
        backupDb.close();
    }

    if (JSON.stringify(backupSummary) !== JSON.stringify(sourceSummary)) {
        throw new Error('SQLite backup summary does not match the source database.');
    }

    return {
        sourcePath,
        backupPath,
        sizeBytes: stat.size,
        integrity: 'ok',
        summary: backupSummary
    };
}

async function createVerifiedSqliteBackup(options) {
    options = options || {};
    const sourcePath = path.resolve(options.sourcePath || '');
    if (!fs.existsSync(sourcePath)) throw new Error('SQLite database not found: ' + sourcePath);
    const db = new Database(sourcePath, { readonly: true, fileMustExist: true });
    try {
        return await createVerifiedSqliteBackupFromConnection(db, {
            sourcePath,
            backupPath: options.backupPath
        });
    } finally {
        db.close();
    }
}

module.exports = {
    createVerifiedSqliteBackup,
    createVerifiedSqliteBackupFromConnection,
    databaseSummary,
    validateIntegrity
};
