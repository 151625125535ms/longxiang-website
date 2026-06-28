const fs = require('fs');
const path = require('path');
const { runMigrations } = require('../db/migrations');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const PROJECT_ROOT = path.join(__dirname, '..', '..');
let dbInstance = null;
let dbMigrationsChecked = false;

function resolveDbPath() {
    const configured = process.env.DB_PATH || 'data/longxiang.db';
    return path.isAbsolute(configured) ? configured : path.join(PROJECT_ROOT, configured);
}

function getDb(options = {}) {
    const skipMigrations = options.skipMigrations === true;

    if (!dbInstance) {
        const Database = require('better-sqlite3');
        const dbPath = resolveDbPath();
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });

        dbInstance = new Database(dbPath);
        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('foreign_keys = ON');
    }

    if (!skipMigrations && !dbMigrationsChecked) {
        runMigrations(dbInstance);
        dbMigrationsChecked = true;
    }

    return dbInstance;
}

module.exports = {
    getDb,
    resolveDbPath
};
