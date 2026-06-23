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

function hasTable(db, tableName) {
    return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
}

function hasColumn(db, tableName, columnName) {
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().some(function (column) {
        return column.name === columnName;
    });
}

function ensureRuntimeSchema(db) {
    const hasInquiriesTable = hasTable(db, 'inquiries');
    if (hasInquiriesTable && !hasColumn(db, 'inquiries', 'country')) {
        db.prepare('ALTER TABLE inquiries ADD COLUMN country TEXT').run();
    }

    if (hasTable(db, 'certifications') && !hasColumn(db, 'certifications', 'asset_id')) {
        db.prepare('ALTER TABLE certifications ADD COLUMN asset_id INTEGER').run();
    }

    if (hasTable(db, 'assets')) {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS asset_references (
                id INTEGER PRIMARY KEY,
                asset_id INTEGER NOT NULL,
                asset_path TEXT NOT NULL,
                module TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                field_path TEXT NOT NULL,
                title TEXT,
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY (asset_id) REFERENCES assets(id)
            )
        `).run();
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_references_unique ON asset_references(module, entity_type, entity_id, field_path, asset_id)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_asset_references_asset ON asset_references(asset_id)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_asset_references_owner ON asset_references(module, entity_type, entity_id)').run();
    }
}

module.exports = {
    getDb,
    resolveDbPath
};
