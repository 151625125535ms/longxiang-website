PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    parent_id INTEGER,
    slug TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    name_fr TEXT,
    name_ru TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER,
    UNIQUE(type, slug),
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    legacy_id TEXT UNIQUE,
    slug TEXT UNIQUE,
    category_id INTEGER,
    product_group TEXT,
    sub_category TEXT,
    aliases_json TEXT,
    status TEXT DEFAULT 'published',
    sort_order INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    name_cn TEXT,
    model TEXT,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    name_fr TEXT,
    name_ru TEXT,
    short_desc_en TEXT,
    short_desc_ar TEXT,
    short_desc_fr TEXT,
    short_desc_ru TEXT,
    description_en TEXT,
    description_ar TEXT,
    description_fr TEXT,
    description_ru TEXT,
    seo_title TEXT,
    seo_title_ar TEXT,
    seo_title_fr TEXT,
    seo_title_ru TEXT,
    seo_description TEXT,
    seo_description_ar TEXT,
    seo_description_fr TEXT,
    seo_description_ru TEXT,
    seo_keywords TEXT,
    seo_keywords_ar TEXT,
    seo_keywords_fr TEXT,
    seo_keywords_ru TEXT,
    version INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS product_media (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    asset_id INTEGER,
    media_type TEXT DEFAULT 'image',
    path TEXT NOT NULL,
    is_cover INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS product_specs (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    spec_code TEXT,
    spec_group TEXT NOT NULL DEFAULT 'technical',
    spec_key TEXT NOT NULL,
    spec_value TEXT NOT NULL,
    unit TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS certifications (
    id INTEGER PRIMARY KEY,
    legacy_id TEXT UNIQUE,
    category_id INTEGER,
    legacy_category TEXT,
    status TEXT DEFAULT 'published',
    sort_order INTEGER DEFAULT 0,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    name_fr TEXT,
    name_ru TEXT,
    category_label_en TEXT,
    category_label_ar TEXT,
    category_label_fr TEXT,
    category_label_ru TEXT,
    image_path TEXT,
    asset_id INTEGER,
    source_type TEXT,
    pages INTEGER DEFAULT 1,
    width INTEGER,
    height INTEGER,
    issuer_en TEXT,
    issuer_ar TEXT,
    issuer_fr TEXT,
    issuer_ru TEXT,
    expiry_date TEXT,
    description_en TEXT,
    description_ar TEXT,
    description_fr TEXT,
    description_ru TEXT,
    version INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS content_blocks (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title_en TEXT,
    title_ar TEXT,
    body_json TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    sort_order INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS product_translations (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    locale TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(locale)) > 0),
    revision_no INTEGER NOT NULL CHECK (revision_no > 0),
    revision_state TEXT NOT NULL DEFAULT 'draft' CHECK (revision_state IN ('draft', 'published', 'archived')),
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
    revision_state TEXT NOT NULL DEFAULT 'draft' CHECK (revision_state IN ('draft', 'published', 'archived')),
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
    revision_state TEXT NOT NULL DEFAULT 'draft' CHECK (revision_state IN ('draft', 'published', 'archived')),
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
    revision_state TEXT NOT NULL DEFAULT 'draft' CHECK (revision_state IN ('draft', 'published', 'archived')),
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

CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY,
    legacy_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    country TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    product_context TEXT,
    status TEXT DEFAULT 'new',
    is_read INTEGER DEFAULT 0,
    notes TEXT,
    ip TEXT,
    user_agent TEXT,
    replied_at INTEGER,
    deleted_at INTEGER,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    filename TEXT,
    original_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    checksum TEXT,
    module TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER
);


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
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    performed_by TEXT DEFAULT 'admin',
    request_id TEXT,
    before_json TEXT,
    after_json TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_product ON product_specs(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_specs_code ON product_specs(product_id, spec_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translation_one_draft ON product_translations(product_id, locale) WHERE revision_state = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translation_one_published ON product_translations(product_id, locale) WHERE revision_state = 'published';
CREATE INDEX IF NOT EXISTS idx_product_translation_public_lookup ON product_translations(locale, revision_state, product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_translation_one_draft ON category_translations(category_id, locale) WHERE revision_state = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_translation_one_published ON category_translations(category_id, locale) WHERE revision_state = 'published';
CREATE INDEX IF NOT EXISTS idx_category_translation_public_lookup ON category_translations(locale, revision_state, category_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_translation_one_draft ON certification_translations(certification_id, locale) WHERE revision_state = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_translation_one_published ON certification_translations(certification_id, locale) WHERE revision_state = 'published';
CREATE INDEX IF NOT EXISTS idx_certification_translation_public_lookup ON certification_translations(locale, revision_state, certification_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_translation_one_draft ON content_block_translations(content_block_id, locale) WHERE revision_state = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_translation_one_published ON content_block_translations(content_block_id, locale) WHERE revision_state = 'published';
CREATE INDEX IF NOT EXISTS idx_content_translation_public_lookup ON content_block_translations(locale, revision_state, content_block_id);
CREATE INDEX IF NOT EXISTS idx_product_spec_translation_revision ON product_spec_translation_values(product_translation_id);
CREATE INDEX IF NOT EXISTS idx_certifications_category ON certifications(category_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_asset ON certifications(asset_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_slug ON content_blocks(slug);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_entity ON assets(module, entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_references_unique ON asset_references(module, entity_type, entity_id, field_path, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_references_asset ON asset_references(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_references_owner ON asset_references(module, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
