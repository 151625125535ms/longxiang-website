const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const PROJECT_ROOT = path.join(__dirname, '..', '..');
let dbInstance = null;

function resolveDbPath() {
    const configured = process.env.DB_PATH || 'data/longxiang.db';
    return path.isAbsolute(configured) ? configured : path.join(PROJECT_ROOT, configured);
}

function getDb() {
    if (dbInstance) return dbInstance;

    const Database = require('better-sqlite3');
    const dbPath = resolveDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    ensureRuntimeSchema(dbInstance);
    return dbInstance;
}

function ensureRuntimeSchema(db) {
    const hasInquiriesTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'inquiries'").get();
    if (!hasInquiriesTable) return;

    const inquiryColumns = db.prepare('PRAGMA table_info(inquiries)').all();
    const hasCountry = inquiryColumns.some(function (column) {
        return column.name === 'country';
    });
    if (!hasCountry) {
        db.prepare('ALTER TABLE inquiries ADD COLUMN country TEXT').run();
    }
}

module.exports = {
    getDb,
    resolveDbPath
};
