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
    return dbInstance;
}

module.exports = {
    getDb,
    resolveDbPath
};
