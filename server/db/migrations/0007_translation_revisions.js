'use strict';

function hasTable(db, tableName) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function hasColumn(db, tableName, columnName) {
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().some(function (column) {
        return column.name === columnName;
    });
}

function addSpecCodeColumn(db) {
    if (!hasTable(db, 'product_specs') || hasColumn(db, 'product_specs', 'spec_code')) return;
    db.prepare('ALTER TABLE product_specs ADD COLUMN spec_code TEXT').run();
}

function createRevisionTables(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS product_translations (
            id INTEGER PRIMARY KEY,
            product_id INTEGER NOT NULL,
            locale TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(locale)) > 0),
            revision_no INTEGER NOT NULL CHECK (revision_no > 0),
            revision_state TEXT NOT NULL DEFAULT 'draft'
                CHECK (revision_state IN ('draft', 'published', 'archived')),
            base_revision_id INTEGER,
            name TEXT NOT NULL DEFAULT '',
            short_description TEXT,
            description TEXT,
            seo_title TEXT,
            seo_description TEXT,
            seo_keywords TEXT,
            version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
            created_by TEXT,
            updated_by TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            published_at INTEGER,
            UNIQUE(product_id, locale, revision_no),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS category_translations (
            id INTEGER PRIMARY KEY,
            category_id INTEGER NOT NULL,
            locale TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(locale)) > 0),
            revision_no INTEGER NOT NULL CHECK (revision_no > 0),
            revision_state TEXT NOT NULL DEFAULT 'draft'
                CHECK (revision_state IN ('draft', 'published', 'archived')),
            base_revision_id INTEGER,
            name TEXT NOT NULL DEFAULT '',
            version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
            created_by TEXT,
            updated_by TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            published_at INTEGER,
            UNIQUE(category_id, locale, revision_no),
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS certification_translations (
            id INTEGER PRIMARY KEY,
            certification_id INTEGER NOT NULL,
            locale TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(locale)) > 0),
            revision_no INTEGER NOT NULL CHECK (revision_no > 0),
            revision_state TEXT NOT NULL DEFAULT 'draft'
                CHECK (revision_state IN ('draft', 'published', 'archived')),
            base_revision_id INTEGER,
            name TEXT NOT NULL DEFAULT '',
            category_label TEXT,
            issuer TEXT,
            description TEXT,
            version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
            created_by TEXT,
            updated_by TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            published_at INTEGER,
            UNIQUE(certification_id, locale, revision_no),
            FOREIGN KEY (certification_id) REFERENCES certifications(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS content_block_translations (
            id INTEGER PRIMARY KEY,
            content_block_id INTEGER NOT NULL,
            locale TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(locale)) > 0),
            revision_no INTEGER NOT NULL CHECK (revision_no > 0),
            revision_state TEXT NOT NULL DEFAULT 'draft'
                CHECK (revision_state IN ('draft', 'published', 'archived')),
            base_revision_id INTEGER,
            title TEXT NOT NULL DEFAULT '',
            schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
            translation_json TEXT NOT NULL DEFAULT '{}',
            base_structure_hash TEXT NOT NULL DEFAULT '',
            version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
            created_by TEXT,
            updated_by TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            published_at INTEGER,
            UNIQUE(content_block_id, locale, revision_no),
            FOREIGN KEY (content_block_id) REFERENCES content_blocks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_spec_translation_values (
            id INTEGER PRIMARY KEY,
            product_translation_id INTEGER NOT NULL,
            product_spec_id INTEGER NOT NULL,
            label TEXT,
            value_text TEXT,
            UNIQUE(product_translation_id, product_spec_id),
            FOREIGN KEY (product_translation_id) REFERENCES product_translations(id) ON DELETE CASCADE,
            FOREIGN KEY (product_spec_id) REFERENCES product_specs(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS translation_backfill_receipts (
            id INTEGER PRIMARY KEY,
            plan_hash TEXT NOT NULL UNIQUE,
            receipt_json TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'applied' CHECK (state IN ('applied', 'rolled_back')),
            created_at INTEGER NOT NULL,
            rolled_back_at INTEGER
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translation_one_draft
            ON product_translations(product_id, locale) WHERE revision_state = 'draft';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translation_one_published
            ON product_translations(product_id, locale) WHERE revision_state = 'published';
        CREATE INDEX IF NOT EXISTS idx_product_translation_public_lookup
            ON product_translations(locale, revision_state, product_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_category_translation_one_draft
            ON category_translations(category_id, locale) WHERE revision_state = 'draft';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_category_translation_one_published
            ON category_translations(category_id, locale) WHERE revision_state = 'published';
        CREATE INDEX IF NOT EXISTS idx_category_translation_public_lookup
            ON category_translations(locale, revision_state, category_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_translation_one_draft
            ON certification_translations(certification_id, locale) WHERE revision_state = 'draft';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_translation_one_published
            ON certification_translations(certification_id, locale) WHERE revision_state = 'published';
        CREATE INDEX IF NOT EXISTS idx_certification_translation_public_lookup
            ON certification_translations(locale, revision_state, certification_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_content_translation_one_draft
            ON content_block_translations(content_block_id, locale) WHERE revision_state = 'draft';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_content_translation_one_published
            ON content_block_translations(content_block_id, locale) WHERE revision_state = 'published';
        CREATE INDEX IF NOT EXISTS idx_content_translation_public_lookup
            ON content_block_translations(locale, revision_state, content_block_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_product_specs_code
            ON product_specs(product_id, spec_code);
        CREATE INDEX IF NOT EXISTS idx_product_spec_translation_revision
            ON product_spec_translation_values(product_translation_id);
    `);
}

function createProtectionTriggers(db) {
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_product_specs_require_code_insert
        BEFORE INSERT ON product_specs
        WHEN NEW.spec_code IS NULL OR trim(NEW.spec_code) = ''
        BEGIN
            SELECT RAISE(ABORT, 'spec_code is required');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_product_specs_immutable_code
        BEFORE UPDATE OF spec_code ON product_specs
        WHEN OLD.spec_code IS NOT NULL
            AND trim(OLD.spec_code) != ''
            AND COALESCE(NEW.spec_code, '') != OLD.spec_code
        BEGIN
            SELECT RAISE(ABORT, 'spec_code is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_product_translation_immutable_snapshot
        BEFORE UPDATE OF name, short_description, description, seo_title, seo_description, seo_keywords
        ON product_translations
        WHEN OLD.revision_state != 'draft'
        BEGIN
            SELECT RAISE(ABORT, 'published translation content is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_category_translation_immutable_snapshot
        BEFORE UPDATE OF name ON category_translations
        WHEN OLD.revision_state != 'draft'
        BEGIN
            SELECT RAISE(ABORT, 'published translation content is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_certification_translation_immutable_snapshot
        BEFORE UPDATE OF name, category_label, issuer, description ON certification_translations
        WHEN OLD.revision_state != 'draft'
        BEGIN
            SELECT RAISE(ABORT, 'published translation content is immutable');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_content_translation_immutable_snapshot
        BEFORE UPDATE OF title, schema_version, translation_json, base_structure_hash
        ON content_block_translations
        WHEN OLD.revision_state != 'draft'
        BEGIN
            SELECT RAISE(ABORT, 'published translation content is immutable');
        END;
    `);
}

function up(db) {
    addSpecCodeColumn(db);
    createRevisionTables(db);
    createProtectionTriggers(db);
}

module.exports = {
    version: 7,
    name: 'translation_revisions',
    up
};
