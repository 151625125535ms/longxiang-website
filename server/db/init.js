const fs = require('fs');
const path = require('path');
const { getDb } = require('../lib/db');

const SCHEMA_VERSION = 1;
const SCHEMA_NAME = 'initial_schema';
const schemaPath = path.join(__dirname, 'schema.sql');

function init() {
    const db = getDb();
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    db.exec(schemaSql);

    const existing = db
        .prepare('SELECT version FROM schema_migrations WHERE version = ?')
        .get(SCHEMA_VERSION);

    if (!existing) {
        db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
            .run(SCHEMA_VERSION, SCHEMA_NAME, Date.now());
    }

    console.log('SQLite initialized, schema version: ' + SCHEMA_VERSION);
}

if (require.main === module) {
    init();
}

module.exports = { init };
