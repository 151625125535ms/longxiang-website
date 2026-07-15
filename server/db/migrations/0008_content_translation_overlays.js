'use strict';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS content_translation_schemas (
            id INTEGER PRIMARY KEY,
            content_block_id INTEGER NOT NULL,
            content_version INTEGER NOT NULL CHECK (content_version > 0),
            schema_version INTEGER NOT NULL CHECK (schema_version > 0),
            schema_json TEXT NOT NULL,
            structure_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE(content_block_id, content_version, schema_version),
            FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS content_overlay_migration_receipts (
            id INTEGER PRIMARY KEY,
            plan_hash TEXT NOT NULL UNIQUE,
            receipt_json TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'applied' CHECK (state IN ('applied', 'rolled_back')),
            created_at INTEGER NOT NULL,
            rolled_back_at INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_content_translation_schema_lookup
            ON content_translation_schemas(content_block_id, content_version, schema_version);
        CREATE INDEX IF NOT EXISTS idx_content_overlay_receipt_state
            ON content_overlay_migration_receipts(state, created_at);
    `);
}

module.exports = {
    version: 8,
    name: 'content_translation_overlays',
    up
};
