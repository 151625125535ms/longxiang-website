#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEPRECATED_LEGACY_IDS = [
  'sbh15',
  's13',
  's20',
  'high-overload',
  'wound-core-oil',
  'anti-short-3d',
  'scb14',
  'dgh',
  'SCBH15',
  'SBH21-M-RL',
  'SCB13'
];

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    dryRun: argv.includes('--dry-run') || !argv.includes('--apply')
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function now() {
  return Date.now();
}

function jsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function scalar(db, sql, params) {
  const row = db.prepare(sql).get(params || {});
  return row ? row.value : null;
}

function ensureCategory(db, product, timestamp) {
  const slug = product.category || product.subCategory || 'transformer';
  let id = scalar(db, 'SELECT id AS value FROM categories WHERE type = @type AND slug = @slug', {
    type: 'product',
    slug
  });
  if (id) return id;

  const result = db.prepare(`
    INSERT INTO categories
      (type, parent_id, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at)
    VALUES
      (@type, NULL, @slug, @name_en, @name_ar, @sort_order, 1, @created_at, @updated_at)
  `).run({
    type: 'product',
    slug,
    name_en: product.categoryLabel || slug,
    name_ar: product.categoryLabelAr || '',
    sort_order: 0,
    created_at: timestamp,
    updated_at: timestamp
  });
  return result.lastInsertRowid;
}

function normalizeProduct(product, index, db, timestamp) {
  return {
    legacy_id: product.id,
    slug: String(product.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category_id: ensureCategory(db, product, timestamp),
    product_group: product.group || '',
    sub_category: product.subCategory || product.category || '',
    aliases_json: jsonArray(product.aliases),
    status: 'published',
    sort_order: index + 1,
    featured: product.featured ? 1 : 0,
    name_en: product.name || '',
    name_ar: product.nameAr || '',
    short_desc_en: product.shortDesc || '',
    short_desc_ar: product.shortDescAr || '',
    description_en: product.description || '',
    description_ar: product.descriptionAr || '',
    seo_title: product.seoTitle || '',
    seo_description: product.seoDescription || '',
    seo_keywords: product.seoKeywords || '',
    updated_at: timestamp
  };
}

function upsertProduct(db, product, index, timestamp, summary) {
  const row = db.prepare('SELECT id FROM products WHERE legacy_id = ?').get(product.id);
  const data = normalizeProduct(product, index, db, timestamp);
  let productId;

  if (row) {
    productId = row.id;
    db.prepare(`
      UPDATE products
      SET
        slug = @slug,
        category_id = @category_id,
        product_group = @product_group,
        sub_category = @sub_category,
        aliases_json = @aliases_json,
        status = @status,
        sort_order = @sort_order,
        featured = @featured,
        name_en = @name_en,
        name_ar = @name_ar,
        short_desc_en = @short_desc_en,
        short_desc_ar = @short_desc_ar,
        description_en = @description_en,
        description_ar = @description_ar,
        seo_title = @seo_title,
        seo_description = @seo_description,
        seo_keywords = @seo_keywords,
        version = version + 1,
        updated_at = @updated_at
      WHERE legacy_id = @legacy_id
    `).run(data);
    summary.updated.push(product.id);
  } else {
    const result = db.prepare(`
      INSERT INTO products
        (
          legacy_id, slug, category_id, product_group, sub_category, aliases_json,
          status, sort_order, featured, views,
          name_en, name_ar, short_desc_en, short_desc_ar,
          description_en, description_ar, seo_title, seo_description, seo_keywords,
          version, created_at, updated_at
        )
      VALUES
        (
          @legacy_id, @slug, @category_id, @product_group, @sub_category, @aliases_json,
          @status, @sort_order, @featured, 0,
          @name_en, @name_ar, @short_desc_en, @short_desc_ar,
          @description_en, @description_ar, @seo_title, @seo_description, @seo_keywords,
          1, @updated_at, @updated_at
        )
    `).run(data);
    productId = result.lastInsertRowid;
    summary.inserted.push(product.id);
  }

  db.prepare('DELETE FROM product_specs WHERE product_id = ?').run(productId);
  const insertSpec = db.prepare(`
    INSERT INTO product_specs
      (product_id, spec_group, spec_key, spec_value, unit, sort_order, created_at, updated_at)
    VALUES
      (@product_id, @spec_group, @spec_key, @spec_value, '', @sort_order, @created_at, @updated_at)
  `);

  (product.capacities || []).forEach((value, specIndex) => {
    insertSpec.run({
      product_id: productId,
      spec_group: 'capacity',
      spec_key: 'Capacity',
      spec_value: String(value),
      sort_order: specIndex + 1,
      created_at: timestamp,
      updated_at: timestamp
    });
  });
  (product.voltages || []).forEach((value, specIndex) => {
    insertSpec.run({
      product_id: productId,
      spec_group: 'voltage',
      spec_key: 'Voltage',
      spec_value: String(value),
      sort_order: specIndex + 1,
      created_at: timestamp,
      updated_at: timestamp
    });
  });
  (product.specs || []).forEach((spec, specIndex) => {
    insertSpec.run({
      product_id: productId,
      spec_group: 'technical',
      spec_key: String(spec[0] || ''),
      spec_value: String(spec[1] || ''),
      sort_order: specIndex + 1,
      created_at: timestamp,
      updated_at: timestamp
    });
  });

  if (product.image) {
    db.prepare('DELETE FROM product_media WHERE product_id = ?').run(productId);
    db.prepare(`
      INSERT INTO product_media
        (product_id, asset_id, media_type, path, is_cover, sort_order, created_at)
      VALUES
        (?, NULL, 'image', ?, 1, 1, ?)
    `).run(productId, product.image, timestamp);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(__dirname, '..');
  const products = readJson(path.join(rootDir, 'data', 'products.json'));
  const dbPath = path.join(rootDir, 'data', 'longxiang.db');
  const db = new Database(dbPath);
  const timestamp = now();
  const summary = { inserted: [], updated: [], deprecated: [] };

  const run = db.transaction(() => {
    const existing = new Set(products.map(product => product.id));
    DEPRECATED_LEGACY_IDS.forEach((legacyId) => {
      if (existing.has(legacyId)) return;
      const row = db.prepare("SELECT id, status FROM products WHERE legacy_id = ?").get(legacyId);
      if (!row || row.status === 'deleted') return;
      db.prepare("UPDATE products SET status = 'deleted', version = version + 1, updated_at = ? WHERE id = ?").run(timestamp, row.id);
      summary.deprecated.push(legacyId);
    });

    products.forEach((product, index) => upsertProduct(db, product, index, timestamp, summary));
  });

  if (args.apply) run();

  console.log('Mode: ' + (args.apply ? 'apply' : 'dry-run'));
  console.log('Products in data/products.json: ' + products.length);
  console.log('Would upsert all products and mark missing deprecated IDs as deleted.');
  if (args.apply) {
    console.log('Inserted: ' + summary.inserted.join(', '));
    console.log('Updated: ' + summary.updated.join(', '));
    console.log('Deprecated: ' + summary.deprecated.join(', '));
  }

  db.close();
}

main();
