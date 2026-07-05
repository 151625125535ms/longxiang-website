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
    seo_title_fr TEXT,
    seo_title_ru TEXT,
    seo_description TEXT,
    seo_description_fr TEXT,
    seo_description_ru TEXT,
    seo_keywords TEXT,
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
