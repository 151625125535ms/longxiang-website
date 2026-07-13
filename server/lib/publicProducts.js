'use strict';

const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');
const { resolveUploadDir, resolveUploadPublicPath } = require('./fileStore');
const { productGalleryThumbnailUrl } = require('./productGalleryThumbnail');
const { VALID_GROUPS, getCategoryMapping } = require('./category-helper');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CARD_IMAGE_DIR = 'assets/optimized/product-cards';
const ONE_SECOND_MS = 1000;

function parseJsonArray(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function cardImageSlug(row) {
    const source = String(row.slug || row.legacy_id || '').trim().toLowerCase();
    return source
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function publicPathToFile(publicPath) {
    const normalized = String(publicPath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.indexOf('..') !== -1 || /^(?:https?:)?\/\//i.test(normalized)) return '';

    const uploadPublicPath = String(resolveUploadPublicPath() || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (uploadPublicPath && (normalized === uploadPublicPath || normalized.startsWith(uploadPublicPath + '/'))) {
        const relativeUploadPath = normalized === uploadPublicPath
            ? ''
            : normalized.slice(uploadPublicPath.length + 1);
        const uploadDir = path.resolve(resolveUploadDir());
        const resolvedUploadFile = path.resolve(uploadDir, ...relativeUploadPath.split('/').filter(Boolean));
        const uploadRootWithSep = uploadDir.endsWith(path.sep) ? uploadDir : uploadDir + path.sep;
        if (resolvedUploadFile !== uploadDir && !resolvedUploadFile.startsWith(uploadRootWithSep)) return '';
        return resolvedUploadFile;
    }

    return path.join(PROJECT_ROOT, ...normalized.split('/'));
}

function updatedAtMs(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
}

function resolveProductCardImage(row, coverPath) {
    const slug = cardImageSlug(row);
    if (!slug) return '';
    const publicPath = CARD_IMAGE_DIR + '/' + slug + '.webp';
    const cardFile = publicPathToFile(publicPath);
    if (!cardFile || !fs.existsSync(cardFile)) return '';

    const cardStat = fs.statSync(cardFile);
    const sourceFile = publicPathToFile(coverPath);
    if (sourceFile && fs.existsSync(sourceFile)) {
        const sourceStat = fs.statSync(sourceFile);
        if (cardStat.mtimeMs + ONE_SECOND_MS < sourceStat.mtimeMs) return '';
    } else {
        const rowUpdatedAt = updatedAtMs(row.updated_at);
        if (rowUpdatedAt && cardStat.mtimeMs + ONE_SECOND_MS < rowUpdatedAt) return '';
    }

    return publicPath + '?v=' + Math.round(cardStat.mtimeMs);
}

function normalizePublicMediaPath(value) {
    const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || /[\u0000-\u001f\u007f]/.test(normalized)) return '';
    if (normalized.indexOf('..') !== -1 || /^(?:https?:)?\/\//i.test(normalized)) return '';
    return normalized;
}

function detailProductImages(mediaRows, coverPath, identifier) {
    const cover = normalizePublicMediaPath(coverPath);
    if (!cover) return [];
    const seen = new Set([cover]);
    const coverMedia = (mediaRows || []).find(function (media) {
        return media && Number(media.is_cover) === 1 && normalizePublicMediaPath(media.path) === cover;
    });
    const images = [{
        src: cover,
        thumbnailSrc: productGalleryThumbnailUrl(identifier, 0, cover, coverMedia && coverMedia.id),
        isCover: true
    }];
    (mediaRows || []).forEach(function (media) {
        if (!media || Number(media.is_cover) === 1) return;
        if (media.media_type && media.media_type !== 'image') return;
        const src = normalizePublicMediaPath(media.path);
        if (!src || seen.has(src)) return;
        seen.add(src);
        images.push({
            src,
            thumbnailSrc: productGalleryThumbnailUrl(identifier, images.length, src, media.id),
            isCover: false
        });
    });
    return images;
}

function mapSqliteProduct(row, specsByProduct, coverByProduct, mediaByProduct, includeImages) {
    const specs = specsByProduct[row.id] || [];
    let group = row.product_group || '';
    let subCategory = row.sub_category || '';

    if (row.parent_slug) {
        group = row.parent_slug;
        subCategory = row.category_slug || subCategory;
    } else if (!group || !VALID_GROUPS.has(group)) {
        const mapping = getCategoryMapping(row.category_slug);
        if (!mapping) return null;
        group = mapping.group;
        subCategory = mapping.subCategory;
    }

    const product = {
        id: row.legacy_id,
        slug: row.slug || '',
        name: row.name_en,
        nameAr: row.name_ar || '',
        nameFr: row.name_fr || '',
        nameRu: row.name_ru || '',
        image: coverByProduct[row.id] || '',
        cardImage: resolveProductCardImage(row, coverByProduct[row.id] || ''),
        category: row.category_slug || '',
        categoryLabel: row.category_label || '',
        categoryLabelAr: row.category_label_ar || '',
        categoryLabelFr: row.category_label_fr || '',
        categoryLabelRu: row.category_label_ru || '',
        groupLabel: row.parent_label || '',
        groupLabelAr: row.parent_label_ar || '',
        groupLabelFr: row.parent_label_fr || '',
        groupLabelRu: row.parent_label_ru || '',
        subCategoryLabel: row.category_label || '',
        subCategoryLabelAr: row.category_label_ar || '',
        subCategoryLabelFr: row.category_label_fr || '',
        subCategoryLabelRu: row.category_label_ru || '',
        group,
        subCategory,
        shortDesc: row.short_desc_en || '',
        shortDescAr: row.short_desc_ar || '',
        shortDescFr: row.short_desc_fr || '',
        shortDescRu: row.short_desc_ru || '',
        description: row.description_en || '',
        descriptionAr: row.description_ar || '',
        descriptionFr: row.description_fr || '',
        descriptionRu: row.description_ru || '',
        capacities: specs.filter(item => item.spec_group === 'capacity').map(item => item.spec_value),
        voltages: specs.filter(item => item.spec_group === 'voltage').map(item => item.spec_value),
        specs: specs.filter(item => item.spec_group === 'technical').map(item => [item.spec_key, item.spec_value]),
        featured: row.featured === 1,
        aliases: parseJsonArray(row.aliases_json),
        seoTitle: row.seo_title || '',
        seoTitleFr: row.seo_title_fr || '',
        seoTitleRu: row.seo_title_ru || '',
        seoDescription: row.seo_description || '',
        seoDescriptionFr: row.seo_description_fr || '',
        seoDescriptionRu: row.seo_description_ru || '',
        seoKeywords: row.seo_keywords || '',
        seoKeywordsFr: row.seo_keywords_fr || '',
        seoKeywordsRu: row.seo_keywords_ru || ''
    };
    if (includeImages) {
        product.images = detailProductImages(
            mediaByProduct[row.id] || [],
            coverByProduct[row.id] || '',
            row.slug || row.legacy_id
        );
    }
    return product;
}

function findSqliteProductByAlias(db, id) {
    const rows = db.prepare(`
        SELECT id, aliases_json
        FROM products
        WHERE status = 'published' AND aliases_json IS NOT NULL AND aliases_json != ''
    `).all();
    for (const row of rows) {
        if (parseJsonArray(row.aliases_json).indexOf(id) !== -1) return row.id;
    }
    return null;
}

function readSqliteProducts(id, dbValue) {
    const db = dbValue || getDb();
    const includeImages = Boolean(id);
    let params = [];
    let idWhere = '';
    if (id) {
        const direct = db.prepare(`
            SELECT id
            FROM products
            WHERE status = 'published' AND (legacy_id = ? OR slug = ?)
            LIMIT 1
        `).get(id, id);
        const internalId = direct ? direct.id : findSqliteProductByAlias(db, id);
        if (!internalId) return [];
        params = [internalId];
        idWhere = 'AND p.id = ?';
    }

    const products = db.prepare(`
        SELECT
            p.*,
            c.slug AS category_slug,
            c.name_en AS category_label,
            c.name_ar AS category_label_ar,
            c.name_fr AS category_label_fr,
            c.name_ru AS category_label_ru,
            parent.slug AS parent_slug,
            parent.name_en AS parent_label,
            parent.name_ar AS parent_label_ar,
            parent.name_fr AS parent_label_fr,
            parent.name_ru AS parent_label_ru
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
            ${idWhere}
        ORDER BY p.sort_order, p.id
    `).all(params);

    if (!products.length) return [];

    const ids = products.map(product => product.id);
    const placeholders = ids.map(() => '?').join(',');
    const specRows = db.prepare(`
        SELECT * FROM product_specs
        WHERE product_id IN (${placeholders})
        ORDER BY spec_group, sort_order, id
    `).all(ids);
    const mediaRows = db.prepare(`
        SELECT * FROM product_media
        WHERE product_id IN (${placeholders}) ${includeImages ? '' : 'AND is_cover = 1'}
        ORDER BY product_id, is_cover DESC, sort_order, id
    `).all(ids);

    const specsByProduct = {};
    specRows.forEach(function (spec) {
        if (!specsByProduct[spec.product_id]) specsByProduct[spec.product_id] = [];
        specsByProduct[spec.product_id].push(spec);
    });

    const coverByProduct = {};
    const mediaByProduct = {};
    mediaRows.forEach(function (media) {
        if (!mediaByProduct[media.product_id]) mediaByProduct[media.product_id] = [];
        mediaByProduct[media.product_id].push(media);
        if (Number(media.is_cover) === 1 && !coverByProduct[media.product_id]) {
            coverByProduct[media.product_id] = normalizePublicMediaPath(media.path);
        }
    });

    return products
        .map(product => mapSqliteProduct(product, specsByProduct, coverByProduct, mediaByProduct, includeImages))
        .filter(Boolean);
}

function readPublicProducts(dbValue) {
    return readSqliteProducts(null, dbValue);
}

function readPublicProduct(identifier, dbValue) {
    if (identifier == null || identifier === '' || identifier === 0) return null;
    return readSqliteProducts(identifier, dbValue)[0] || null;
}

module.exports = {
    readPublicProducts,
    readPublicProduct,
    parseJsonArray
};
