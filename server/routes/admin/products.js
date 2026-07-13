const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getDb } = require('../../lib/db');
const { ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('../../lib/fileStore');
const { normalizeUploadedFilename } = require('../../lib/filenameEncoding');
const { sendError, insertAuditLog } = require('./helpers');
const { syncProductAssetReferences, deleteAssetReferences } = require('../../lib/assetReferences');
const { deleteProductCardThumbnail, queueProductCardThumbnail } = require('../../lib/productCardThumbnail');

const router = express.Router();
const STATUSES = ['published', 'draft', 'deleted'];
const BATCH_ACTIONS = ['soft_delete', 'publish', 'draft', 'hard_delete'];
const MAX_PRODUCT_GALLERY_IMAGES = 6;
const PRODUCT_ISSUE_FILTERS = new Set(['missing_seo', 'missing_arabic', 'missing_cover', 'missing_specs', 'missing_public_url']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const IMAGE_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};
const COVER_IMAGE_PATH_EXTENSIONS = /\.(?:jpe?g|png|gif|webp|svg)$/i;
const uploadDir = resolveUploadDir();
ensureDirectory(uploadDir);

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const ext = IMAGE_EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase();
            cb(null, 'product-' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
        }
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            return cb(new Error('Only jpeg, png, webp, or gif images are allowed.'));
        }
        cb(null, true);
    }
});

function parsePositiveInt(value, defaultValue, maxValue) {
    const parsed = parseInt(value, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    return maxValue ? Math.min(normalized, maxValue) : normalized;
}

function parseInteger(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function fileChecksum(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeBool(value, defaultValue) {
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false') return 0;
    return defaultValue;
}

function makeSlug(name) {
    const slug = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return slug || 'product-' + Date.now();
}

function firstText() {
    for (let i = 0; i < arguments.length; i += 1) {
        const value = arguments[i];
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return '';
}

function makeUniqueProductIdentifier(db, column, preferred, fallbackPrefix) {
    const safeColumns = { legacy_id: true, slug: true };
    if (!safeColumns[column]) throw new Error('Invalid product identifier column.');

    const base = makeSlug(preferred || fallbackPrefix || 'product');
    let candidate = base;
    let suffix = 2;
    while (db.prepare(`SELECT 1 FROM products WHERE ${column} = ? LIMIT 1`).get(candidate)) {
        candidate = base + '-' + suffix;
        suffix += 1;
    }
    return candidate;
}

function normalizeStatus(value, defaultValue) {
    const status = String(value || '').trim();
    if (!status) return defaultValue;
    return STATUSES.indexOf(status) !== -1 ? status : null;
}

function emptyTextExpression(column) {
    return "COALESCE(NULLIF(TRIM(" + column + "), ''), '') = ''";
}

function productIssueCondition(issue) {
    if (issue === 'missing_seo') {
        return "(p.status = 'published' AND (" + emptyTextExpression('p.seo_title') + ' OR ' + emptyTextExpression('p.seo_description') + '))';
    }
    if (issue === 'missing_arabic') {
        return "(p.status = 'published' AND (" + emptyTextExpression('p.name_ar') + ' OR ' + emptyTextExpression('p.short_desc_ar') + ' OR ' + emptyTextExpression('p.description_ar') + '))';
    }
    if (issue === 'missing_cover') {
        return `(p.status = 'published' AND NOT EXISTS (
            SELECT 1
            FROM product_media issue_cover
            WHERE issue_cover.product_id = p.id
                AND issue_cover.is_cover = 1
                AND COALESCE(NULLIF(TRIM(issue_cover.path), ''), '') != ''
        ))`;
    }
    if (issue === 'missing_specs') {
        return `(p.status = 'published' AND NOT EXISTS (
            SELECT 1
            FROM product_specs issue_specs
            WHERE issue_specs.product_id = p.id
                AND issue_specs.spec_group = 'technical'
                AND COALESCE(NULLIF(TRIM(issue_specs.spec_key), ''), NULLIF(TRIM(issue_specs.spec_value), ''), '') != ''
        ))`;
    }
    if (issue === 'missing_public_url') {
        return `(p.status = 'published' AND (
            p.category_id IS NULL
            OR c.id IS NULL
            OR COALESCE(c.type, '') != 'product'
            OR c.is_active != 1
            OR (c.parent_id IS NOT NULL AND COALESCE(parent.is_active, 0) != 1)
            OR COALESCE(NULLIF(TRIM(p.slug), ''), NULLIF(TRIM(p.legacy_id), ''), '') = ''
        ))`;
    }
    return '';
}

function normalizeProductSpecs(value) {
    if (value == null || value === '') return [];

    let source = value;
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source);
        } catch (err) {
            return [];
        }
    }
    if (!Array.isArray(source)) return [];

    return source.map(function (item, index) {
        let specGroup = 'technical';
        let specKey = '';
        let specValue = '';
        let unit = '';
        let sortOrder = index;

        if (Array.isArray(item)) {
            specKey = item[0] == null ? '' : String(item[0]).trim();
            specValue = item[1] == null ? '' : String(item[1]).trim();
            unit = item[2] == null ? '' : String(item[2]).trim();
        } else if (item && typeof item === 'object') {
            specGroup = firstText(item.spec_group, item.group, item.group_name, 'technical');
            specKey = firstText(item.spec_key, item.key, item.name, item.label);
            specValue = firstText(item.spec_value, item.value, item.text);
            unit = item.unit == null ? '' : String(item.unit).trim();
            sortOrder = parseInteger(item.sort_order, index);
        }

        return {
            spec_group: specGroup || 'technical',
            spec_key: specKey,
            spec_value: specValue,
            unit,
            sort_order: sortOrder
        };
    }).filter(function (spec) {
        return spec.spec_key || spec.spec_value;
    });
}

function replaceProductSpecs(db, productId, specs, timestamp) {
    db.prepare('DELETE FROM product_specs WHERE product_id = ?').run(productId);
    if (!specs || !specs.length) return;

    const insertSpec = db.prepare(`
        INSERT INTO product_specs
            (product_id, spec_group, spec_key, spec_value, unit, sort_order, created_at, updated_at)
        VALUES
            (@product_id, @spec_group, @spec_key, @spec_value, @unit, @sort_order, @created_at, @updated_at)
    `);

    specs.forEach(function (spec, index) {
        insertSpec.run({
            product_id: productId,
            spec_group: spec.spec_group || 'technical',
            spec_key: spec.spec_key || '',
            spec_value: spec.spec_value || '',
            unit: spec.unit || '',
            sort_order: parseInteger(spec.sort_order, index),
            created_at: timestamp,
            updated_at: timestamp
        });
    });
}

function resolveProductCategoryMapping(db, categoryIdValue) {
    const categoryId = parseInteger(categoryIdValue, null);
    if (!categoryId) {
        return { error: '请选择一个有效的产品分类。' };
    }

    const category = db.prepare(`
        SELECT
            c.id,
            c.slug,
            c.parent_id,
            parent.slug AS parent_slug
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE c.id = ? AND c.type = 'product' AND c.is_active = 1
    `).get(categoryId);

    if (!category) {
        return { error: '所选分类不存在或已停用，请重新选择。' };
    }
    if (!category.parent_id || !category.parent_slug) {
        return { error: '请选择父类下的子类，父类仅用于分组。' };
    }

    return {
        categoryId: category.id,
        productGroup: category.parent_slug,
        subCategory: category.slug
    };
}

function normalizeJsonString(value, defaultValue) {
    const fallback = defaultValue == null ? '[]' : defaultValue;
    if (value == null || value === '') return fallback;
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        return JSON.stringify(value);
    }
    if (typeof value !== 'string') return fallback;
    try {
        JSON.parse(value);
        return value;
    } catch (err) {
        return fallback;
    }
}

function getProductBase(db, id) {
    return db.prepare(`
        SELECT
            p.*,
            c.name_en AS category_name_en,
            COALESCE(cover.path, '') AS cover_image
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_media cover ON cover.product_id = p.id AND cover.is_cover = 1
        WHERE p.id = ?
        ORDER BY cover.sort_order, cover.id
        LIMIT 1
    `).get(id);
}

function getFullProduct(db, id) {
    const product = getProductBase(db, id);
    if (!product) return null;

    product.media = db.prepare(`
        SELECT id, product_id, asset_id, media_type, path, is_cover, sort_order, created_at
        FROM product_media
        WHERE product_id = ?
        ORDER BY sort_order, id
    `).all(id);

    product.specs = db.prepare(`
        SELECT id, product_id, spec_group, spec_key, spec_value, unit, sort_order, created_at, updated_at
        FROM product_specs
        WHERE product_id = ?
        ORDER BY spec_group, sort_order, id
    `).all(id);

    return product;
}

function getAuditProduct(db, id) {
    const product = getProductBase(db, id);
    if (!product) return null;
    return product;
}

function productCardThumbnailPayload(product) {
    if (!product) return null;
    return {
        id: product.id,
        slug: product.slug,
        legacy_id: product.legacy_id,
        name_en: product.name_en,
        cover_image: product.cover_image,
        updated_at: product.updated_at
    };
}

function normalizeCoverPath(value) {
    if (value == null) return null;
    const coverPath = String(value).trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!coverPath) return '';
    if (/^(?:https?:)?\/\//i.test(coverPath)) return null;
    if (coverPath.indexOf('..') !== -1) return null;
    if (!COVER_IMAGE_PATH_EXTENSIONS.test(coverPath)) return null;
    return coverPath;
}

function replaceCoverImage(db, productId, coverPath, timestamp) {
    if (coverPath == null) return;
    db.prepare('DELETE FROM product_media WHERE product_id = ? AND is_cover = 1').run(productId);
    if (!coverPath) return;
    const asset = db.prepare('SELECT id FROM assets WHERE path = ? AND is_active = 1').get(coverPath);
    db.prepare(`
        INSERT INTO product_media
            (product_id, asset_id, media_type, path, is_cover, sort_order, created_at)
        VALUES
            (?, ?, 'image', ?, 1, 1, ?)
    `).run(productId, asset ? asset.id : null, coverPath, timestamp);
}

function normalizeGalleryPaths(value) {
    if (value == null) return [];
    const items = Array.isArray(value)
        ? value
        : String(value).split(/[\r\n,]+/);
    const paths = [];
    for (const item of items) {
        const normalized = normalizeCoverPath(item);
        if (normalized == null) return null;
        if (normalized && paths.indexOf(normalized) === -1) paths.push(normalized);
    }
    return paths;
}

function finalGalleryPaths(paths, coverPath) {
    const cover = String(coverPath || '');
    const seen = new Set();
    return (paths || []).filter(function (galleryPath) {
        if (!galleryPath || galleryPath === cover || seen.has(galleryPath)) return false;
        seen.add(galleryPath);
        return true;
    });
}

function existingGalleryPaths(db, productId) {
    return db.prepare(`
        SELECT path
        FROM product_media
        WHERE product_id = ? AND is_cover = 0
        ORDER BY sort_order, id
    `).all(productId).map(function (row) { return row.path || ''; }).filter(Boolean);
}

function replaceGalleryImages(db, productId, paths, coverPath, timestamp) {
    if (paths == null) return;
    db.prepare('DELETE FROM product_media WHERE product_id = ? AND is_cover = 0').run(productId);
    paths
        .filter(function (galleryPath) { return galleryPath && galleryPath !== coverPath; })
        .forEach(function (galleryPath, index) {
            const asset = db.prepare('SELECT id FROM assets WHERE path = ? AND is_active = 1').get(galleryPath);
            db.prepare(`
                INSERT INTO product_media
                    (product_id, asset_id, media_type, path, is_cover, sort_order, created_at)
                VALUES
                    (?, ?, 'image', ?, 0, ?, ?)
            `).run(productId, asset ? asset.id : null, galleryPath, index + 2, timestamp);
        });
}

function buildListQuery(query) {
    const where = [];
    const params = {};

    const status = String(query.status || '').trim();
    if (status) {
        if (STATUSES.indexOf(status) === -1) return { error: 'Invalid status.' };
        where.push('p.status = @status');
        params.status = status;
    } else {
        where.push('p.status != @default_exclude');
        params.default_exclude = 'deleted';
    }

    if (query.category != null && String(query.category).trim() !== '') {
        const categoryId = parseInt(query.category, 10);
        if (!Number.isFinite(categoryId)) return { error: 'Invalid category.' };
        where.push('p.category_id = @category_id');
        params.category_id = categoryId;
    }

    if (query.featured != null && String(query.featured).trim() !== '') {
        const featured = normalizeBool(query.featured, null);
        if (featured == null) return { error: 'Invalid featured value.' };
        where.push('p.featured = @featured');
        params.featured = featured;
    }

    const issue = String(query.issue || '').trim();
    if (issue) {
        if (!PRODUCT_ISSUE_FILTERS.has(issue)) return { error: 'Invalid issue filter.' };
        where.push(productIssueCondition(issue));
    }

    const q = String(query.q || '').trim();
    if (q) {
        where.push('(p.name_en LIKE @q OR p.name_ar LIKE @q OR p.name_fr LIKE @q OR p.name_ru LIKE @q OR p.name_cn LIKE @q OR p.model LIKE @q OR p.legacy_id LIKE @q OR p.slug LIKE @q)');
        params.q = '%' + q + '%';
    }

    return {
        whereSql: where.length ? 'WHERE ' + where.join(' AND ') : '',
        params
    };
}

router.get('/', function (req, res, next) {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const pageSize = parsePositiveInt(req.query.pageSize, 20, 100);
        const offset = (page - 1) * pageSize;
        const built = buildListQuery(req.query);
        if (built.error) return sendError(res, 422, 'VALIDATION_ERROR', built.error);

        const db = getDb();
        const totalRow = db.prepare(`
            SELECT COUNT(DISTINCT p.id) AS total
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories parent ON parent.id = c.parent_id
            ${built.whereSql}
        `).get(built.params);

        const rows = db.prepare(`
            SELECT
                p.id, p.legacy_id, p.slug, p.name_cn, p.model, p.category_id, c.name_en AS category_name_en,
                p.product_group, p.sub_category, p.status, p.sort_order, p.featured,
                p.name_en, p.name_ar, p.name_fr, p.name_ru,
                p.short_desc_en, p.short_desc_ar, p.short_desc_fr, p.short_desc_ru,
                p.description_fr, p.description_ru,
                p.seo_title, p.seo_title_fr, p.seo_title_ru,
                p.seo_description, p.seo_description_fr, p.seo_description_ru,
                p.seo_keywords, p.seo_keywords_fr, p.seo_keywords_ru,
                COALESCE(cover.path, '') AS cover_image,
                CASE WHEN p.status = 'published' AND (${emptyTextExpression('p.seo_title')} OR ${emptyTextExpression('p.seo_description')}) THEN 1 ELSE 0 END AS missing_seo,
                CASE WHEN p.status = 'published' AND (${emptyTextExpression('p.name_ar')} OR ${emptyTextExpression('p.short_desc_ar')} OR ${emptyTextExpression('p.description_ar')}) THEN 1 ELSE 0 END AS missing_arabic,
                CASE WHEN p.status = 'published' AND NOT EXISTS (
                    SELECT 1
                    FROM product_media cover_check
                    WHERE cover_check.product_id = p.id
                        AND cover_check.is_cover = 1
                        AND COALESCE(NULLIF(TRIM(cover_check.path), ''), '') != ''
                ) THEN 1 ELSE 0 END AS missing_cover,
                CASE WHEN p.status = 'published' AND NOT EXISTS (
                    SELECT 1
                    FROM product_specs ps
                    WHERE ps.product_id = p.id
                        AND ps.spec_group = 'technical'
                        AND COALESCE(NULLIF(TRIM(ps.spec_key), ''), NULLIF(TRIM(ps.spec_value), ''), '') != ''
                ) THEN 1 ELSE 0 END AS missing_specs,
                CASE WHEN p.status = 'published' AND (
                    p.category_id IS NULL
                    OR c.id IS NULL
                    OR COALESCE(c.type, '') != 'product'
                    OR c.is_active != 1
                    OR (c.parent_id IS NOT NULL AND COALESCE(parent.is_active, 0) != 1)
                    OR COALESCE(NULLIF(TRIM(p.slug), ''), NULLIF(TRIM(p.legacy_id), ''), '') = ''
                ) THEN 1 ELSE 0 END AS missing_public_url,
                p.version, p.created_at, p.updated_at
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN categories parent ON parent.id = c.parent_id
            LEFT JOIN product_media cover ON cover.product_id = p.id AND cover.is_cover = 1
            ${built.whereSql}
            GROUP BY p.id
            ORDER BY p.sort_order, p.id
            LIMIT @limit OFFSET @offset
        `).all({ ...built.params, limit: pageSize, offset });

        res.json({
            ok: true,
            data: rows,
            meta: { page, pageSize, total: totalRow ? totalRow.total : 0 }
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', function (req, res, next) {
    try {
        const product = getFullProduct(getDb(), req.params.id);
        if (!product) return sendError(res, 404, 'NOT_FOUND', 'Product not found.');
        res.json({ ok: true, data: product });
    } catch (err) {
        next(err);
    }
});

router.post('/upload', function (req, res, next) {
    upload.single('image')(req, res, function (err) {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'Image must be 8MB or smaller.'
                : err.message;
            return sendError(res, 422, 'VALIDATION_ERROR', message);
        }

        try {
            if (!req.file) return sendError(res, 422, 'VALIDATION_ERROR', 'No file uploaded.');

            const publicPath = resolveUploadPublicPath() + '/' + req.file.filename;
            const originalName = normalizeUploadedFilename(req.file.originalname);
            const db = getDb();
            const createdAt = Date.now();
            const checksum = fileChecksum(req.file.path);
            const duplicate = checksum ? db.prepare(`
                SELECT
                    id, path, filename, original_name, mime_type, file_size,
                    checksum, module, entity_type, entity_id, is_active, created_at
                FROM assets
                WHERE checksum = @checksum
                    AND file_size = @file_size
                    AND mime_type = @mime_type
                    AND is_active = 1
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            `).get({
                checksum,
                file_size: req.file.size || 0,
                mime_type: req.file.mimetype || ''
            }) : null;

            if (duplicate) {
                try { fs.unlinkSync(req.file.path); } catch (unlinkErr) {}
                return res.status(200).json({ ok: true, data: { ...duplicate, reused: true }, path: duplicate.path });
            }

            const createAsset = db.transaction(function () {
                const result = db.prepare(`
                    INSERT INTO assets
                        (
                            path, filename, original_name, mime_type, file_size,
                            checksum, module, entity_type, entity_id, is_active, created_at
                        )
                    VALUES
                        (
                            @path, @filename, @original_name, @mime_type, @file_size,
                            @checksum, 'products', 'product', NULL, 1, @created_at
                        )
                `).run({
                    path: publicPath,
                    filename: req.file.filename,
                    original_name: originalName,
                    mime_type: req.file.mimetype || '',
                    file_size: req.file.size || 0,
                    checksum,
                    created_at: createdAt
                });

                return {
                    id: result.lastInsertRowid,
                    path: publicPath,
                    filename: req.file.filename,
                    original_name: originalName,
                    mime_type: req.file.mimetype || '',
                    file_size: req.file.size || 0,
                    checksum
                };
            });

            const asset = createAsset();
            res.status(201).json({ ok: true, data: asset, path: asset.path });
        } catch (uploadErr) {
            next(uploadErr);
        }
    });
});

router.post('/', function (req, res, next) {
    try {
        const body = req.body || {};
        const nameEn = firstText(body.name_en, body.name_ar, body.legacy_id, body.slug);
        if (!nameEn) return sendError(res, 422, 'VALIDATION_ERROR', '请至少填写产品名称。');

        const status = normalizeStatus(body.status, 'published');
        if (!status) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');

        const aliasesJson = normalizeJsonString(body.aliases_json, '[]');
        const coverPath = normalizeCoverPath(body.cover_image);
        if (coverPath == null && body.cover_image != null) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid cover_image path.');
        }
        const normalizedGalleryPaths = body.gallery === undefined ? [] : normalizeGalleryPaths(body.gallery);
        if (normalizedGalleryPaths == null) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid gallery image path.');
        }
        const galleryPaths = finalGalleryPaths(normalizedGalleryPaths, coverPath);
        if (galleryPaths.length > MAX_PRODUCT_GALLERY_IMAGES) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Gallery supports up to 6 images.');
        }

        const db = getDb();
        const categoryMapping = resolveProductCategoryMapping(db, body.category_id);
        if (categoryMapping.error) {
            return sendError(res, 422, 'VALIDATION_ERROR', categoryMapping.error);
        }

        const now = Date.now();
        const createProduct = db.transaction(function () {
            const legacyId = makeUniqueProductIdentifier(db, 'legacy_id', firstText(body.legacy_id, body.slug, nameEn), 'product');
            const slug = makeUniqueProductIdentifier(db, 'slug', firstText(body.slug, legacyId, nameEn), 'product');
            const result = db.prepare(`
                INSERT INTO products
                    (
                        legacy_id, slug, name_cn, model, category_id, product_group, sub_category, aliases_json,
                        status, sort_order, featured, views,
                        name_en, name_ar, name_fr, name_ru,
                        short_desc_en, short_desc_ar, short_desc_fr, short_desc_ru,
                        description_en, description_ar, description_fr, description_ru,
                        seo_title, seo_title_fr, seo_title_ru,
                        seo_description, seo_description_fr, seo_description_ru,
                        seo_keywords, seo_keywords_fr, seo_keywords_ru,
                        version, created_at, updated_at
                    )
                VALUES
                    (
                        @legacy_id, @slug, @name_cn, @model, @category_id, @product_group, @sub_category, @aliases_json,
                        @status, @sort_order, @featured, 0,
                        @name_en, @name_ar, @name_fr, @name_ru,
                        @short_desc_en, @short_desc_ar, @short_desc_fr, @short_desc_ru,
                        @description_en, @description_ar, @description_fr, @description_ru,
                        @seo_title, @seo_title_fr, @seo_title_ru,
                        @seo_description, @seo_description_fr, @seo_description_ru,
                        @seo_keywords, @seo_keywords_fr, @seo_keywords_ru,
                        1, @created_at, @updated_at
                    )
            `).run({
                legacy_id: legacyId,
                slug,
                name_cn: body.name_cn ? String(body.name_cn).trim() : '',
                model: body.model ? String(body.model).trim() : '',
                category_id: categoryMapping.categoryId,
                product_group: categoryMapping.productGroup,
                sub_category: categoryMapping.subCategory,
                aliases_json: aliasesJson,
                status,
                sort_order: parseInteger(body.sort_order, 0),
                featured: normalizeBool(body.featured, 0),
                name_en: nameEn,
                name_ar: body.name_ar ? String(body.name_ar).trim() : '',
                name_fr: body.name_fr ? String(body.name_fr).trim() : '',
                name_ru: body.name_ru ? String(body.name_ru).trim() : '',
                short_desc_en: body.short_desc_en ? String(body.short_desc_en).trim() : '',
                short_desc_ar: body.short_desc_ar ? String(body.short_desc_ar).trim() : '',
                short_desc_fr: body.short_desc_fr ? String(body.short_desc_fr).trim() : '',
                short_desc_ru: body.short_desc_ru ? String(body.short_desc_ru).trim() : '',
                description_en: body.description_en ? String(body.description_en).trim() : '',
                description_ar: body.description_ar ? String(body.description_ar).trim() : '',
                description_fr: body.description_fr ? String(body.description_fr).trim() : '',
                description_ru: body.description_ru ? String(body.description_ru).trim() : '',
                seo_title: body.seo_title ? String(body.seo_title).trim() : '',
                seo_title_fr: body.seo_title_fr ? String(body.seo_title_fr).trim() : '',
                seo_title_ru: body.seo_title_ru ? String(body.seo_title_ru).trim() : '',
                seo_description: body.seo_description ? String(body.seo_description).trim() : '',
                seo_description_fr: body.seo_description_fr ? String(body.seo_description_fr).trim() : '',
                seo_description_ru: body.seo_description_ru ? String(body.seo_description_ru).trim() : '',
                seo_keywords: body.seo_keywords ? String(body.seo_keywords).trim() : '',
                seo_keywords_fr: body.seo_keywords_fr ? String(body.seo_keywords_fr).trim() : '',
                seo_keywords_ru: body.seo_keywords_ru ? String(body.seo_keywords_ru).trim() : '',
                created_at: now,
                updated_at: now
            });

            const productId = result.lastInsertRowid;
            replaceProductSpecs(db, productId, normalizeProductSpecs(body.specs), now);
            replaceCoverImage(db, productId, coverPath, now);
            replaceGalleryImages(db, productId, galleryPaths, coverPath, now);
            syncProductAssetReferences(db, productId);
            const product = getFullProduct(db, productId);
            insertAuditLog(db, req, 'product', product.id, 'create', null, product);
            return product;
        });

        const product = createProduct();
        queueProductCardThumbnail(productCardThumbnailPayload(product));
        res.status(201).json({ ok: true, data: product });
    } catch (err) {
        if (err && err.code && String(err.code).indexOf('SQLITE_CONSTRAINT') === 0) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'legacy_id or slug already exists.');
        }
        next(err);
    }
});

router.put('/:id', function (req, res, next) {
    try {
        const body = req.body || {};
        if (body.version == null) return sendError(res, 422, 'VALIDATION_ERROR', 'version is required.');

        const db = getDb();
        const before = getAuditProduct(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Product not found.');

        const requestVersion = parseInt(body.version, 10);
        if (!Number.isFinite(requestVersion) || requestVersion !== before.version) {
            return sendError(res, 409, 'VERSION_CONFLICT', 'Product version conflict.');
        }

        const status = body.status == null ? before.status : normalizeStatus(body.status, before.status);
        if (!status) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');

        const aliasesJson = body.aliases_json == null ? before.aliases_json : normalizeJsonString(body.aliases_json, before.aliases_json || '[]');
        const coverPath = body.cover_image === undefined ? undefined : normalizeCoverPath(body.cover_image);
        if (coverPath == null && body.cover_image !== undefined) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid cover_image path.');
        }
        const requestedGalleryPaths = body.gallery === undefined ? undefined : normalizeGalleryPaths(body.gallery);
        if (requestedGalleryPaths == null && body.gallery !== undefined) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid gallery image path.');
        }
        const finalCoverPath = coverPath === undefined ? before.cover_image : coverPath;
        const galleryPaths = finalGalleryPaths(
            requestedGalleryPaths === undefined ? existingGalleryPaths(db, before.id) : requestedGalleryPaths,
            finalCoverPath
        );
        if (galleryPaths.length > MAX_PRODUCT_GALLERY_IMAGES) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Gallery supports up to 6 images.');
        }
        const mediaTouched = body.cover_image !== undefined || body.gallery !== undefined;

        let categoryMapping = null;
        if (body.category_id !== undefined) {
            categoryMapping = resolveProductCategoryMapping(db, body.category_id);
            if (categoryMapping.error) {
                return sendError(res, 422, 'VALIDATION_ERROR', categoryMapping.error);
            }
        }

        const updateProduct = db.transaction(function () {
            const timestamp = Date.now();
            db.prepare(`
                UPDATE products
                SET
                    category_id = @category_id,
                    product_group = @product_group,
                    sub_category = @sub_category,
                    aliases_json = @aliases_json,
                    status = @status,
                    sort_order = @sort_order,
                    featured = @featured,
                    name_cn = @name_cn,
                    model = @model,
                    name_en = @name_en,
                    name_ar = @name_ar,
                    name_fr = @name_fr,
                    name_ru = @name_ru,
                    short_desc_en = @short_desc_en,
                    short_desc_ar = @short_desc_ar,
                    short_desc_fr = @short_desc_fr,
                    short_desc_ru = @short_desc_ru,
                    description_en = @description_en,
                    description_ar = @description_ar,
                    description_fr = @description_fr,
                    description_ru = @description_ru,
                    seo_title = @seo_title,
                    seo_title_fr = @seo_title_fr,
                    seo_title_ru = @seo_title_ru,
                    seo_description = @seo_description,
                    seo_description_fr = @seo_description_fr,
                    seo_description_ru = @seo_description_ru,
                    seo_keywords = @seo_keywords,
                    seo_keywords_fr = @seo_keywords_fr,
                    seo_keywords_ru = @seo_keywords_ru,
                    version = version + 1,
                    updated_at = @updated_at
                WHERE id = @id
            `).run({
                id: before.id,
                category_id: categoryMapping ? categoryMapping.categoryId : before.category_id,
                product_group: categoryMapping ? categoryMapping.productGroup : before.product_group,
                sub_category: categoryMapping ? categoryMapping.subCategory : before.sub_category,
                aliases_json: aliasesJson,
                status,
                sort_order: body.sort_order == null ? before.sort_order : parseInteger(body.sort_order, before.sort_order),
                featured: body.featured == null ? before.featured : normalizeBool(body.featured, before.featured),
                name_cn: body.name_cn == null ? before.name_cn : String(body.name_cn).trim(),
                model: body.model == null ? before.model : String(body.model).trim(),
                name_en: body.name_en == null ? before.name_en : firstText(body.name_en, body.name_ar, before.name_en, before.legacy_id),
                name_ar: body.name_ar == null ? before.name_ar : String(body.name_ar).trim(),
                name_fr: body.name_fr == null ? before.name_fr : String(body.name_fr).trim(),
                name_ru: body.name_ru == null ? before.name_ru : String(body.name_ru).trim(),
                short_desc_en: body.short_desc_en == null ? before.short_desc_en : String(body.short_desc_en).trim(),
                short_desc_ar: body.short_desc_ar == null ? before.short_desc_ar : String(body.short_desc_ar).trim(),
                short_desc_fr: body.short_desc_fr == null ? before.short_desc_fr : String(body.short_desc_fr).trim(),
                short_desc_ru: body.short_desc_ru == null ? before.short_desc_ru : String(body.short_desc_ru).trim(),
                description_en: body.description_en == null ? before.description_en : String(body.description_en).trim(),
                description_ar: body.description_ar == null ? before.description_ar : String(body.description_ar).trim(),
                description_fr: body.description_fr == null ? before.description_fr : String(body.description_fr).trim(),
                description_ru: body.description_ru == null ? before.description_ru : String(body.description_ru).trim(),
                seo_title: body.seo_title == null ? before.seo_title : String(body.seo_title).trim(),
                seo_title_fr: body.seo_title_fr == null ? before.seo_title_fr : String(body.seo_title_fr).trim(),
                seo_title_ru: body.seo_title_ru == null ? before.seo_title_ru : String(body.seo_title_ru).trim(),
                seo_description: body.seo_description == null ? before.seo_description : String(body.seo_description).trim(),
                seo_description_fr: body.seo_description_fr == null ? before.seo_description_fr : String(body.seo_description_fr).trim(),
                seo_description_ru: body.seo_description_ru == null ? before.seo_description_ru : String(body.seo_description_ru).trim(),
                seo_keywords: body.seo_keywords == null ? before.seo_keywords : String(body.seo_keywords).trim(),
                seo_keywords_fr: body.seo_keywords_fr == null ? before.seo_keywords_fr : String(body.seo_keywords_fr).trim(),
                seo_keywords_ru: body.seo_keywords_ru == null ? before.seo_keywords_ru : String(body.seo_keywords_ru).trim(),
                updated_at: timestamp
            });

            if (body.specs !== undefined) {
                replaceProductSpecs(db, before.id, normalizeProductSpecs(body.specs), timestamp);
            }
            replaceCoverImage(db, before.id, coverPath, timestamp);
            if (mediaTouched) {
                replaceGalleryImages(db, before.id, galleryPaths, finalCoverPath, timestamp);
            }
            syncProductAssetReferences(db, before.id);
            const afterAudit = getAuditProduct(db, before.id);
            insertAuditLog(db, req, 'product', before.id, 'update', before, afterAudit);
            return getFullProduct(db, before.id);
        });

        const product = updateProduct();
        if (body.cover_image !== undefined && String(before.cover_image || '') !== String(product.cover_image || '')) {
            queueProductCardThumbnail(productCardThumbnailPayload(product));
        }
        res.json({ ok: true, data: product });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const before = getAuditProduct(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Product not found.');

        const softDelete = db.transaction(function () {
            db.prepare(`
                UPDATE products
                SET status = 'deleted', version = version + 1, updated_at = @updated_at
                WHERE id = @id
            `).run({ id: before.id, updated_at: Date.now() });

            deleteAssetReferences(db, { module: 'products', entity_type: 'product', entity_id: before.id });
            const after = getAuditProduct(db, before.id);
            insertAuditLog(db, req, 'product', before.id, 'soft_delete', before, after);
        });

        softDelete();
        res.json({ ok: true, data: { id: before.id, deleted: true } });
    } catch (err) {
        next(err);
    }
});

router.post('/batch', function (req, res, next) {
    try {
        const body = req.body || {};
        const action = String(body.action || '').trim();
        const ids = Array.isArray(body.ids) ? body.ids.map(id => parseInt(id, 10)) : [];
        const payload = body.payload || {};
        const versionMap = body.versionMap || {};

        if (BATCH_ACTIONS.indexOf(action) === -1) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid batch action.');
        }
        if (!ids.length || ids.some(id => !Number.isFinite(id))) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'ids must be a non-empty array.');
        }
        const uniqueIds = Array.from(new Set(ids));
        const missingVersion = uniqueIds.find(id => versionMap[String(id)] == null);
        if (missingVersion != null) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'versionMap is missing id ' + missingVersion + '.');
        }
        if (action === 'hard_delete' && payload.confirm !== true) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'hard_delete requires payload.confirm === true.');
        }

        const db = getDb();
        const placeholders = uniqueIds.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT id, version
            FROM products
            WHERE id IN (${placeholders})
        `).all(...uniqueIds);
        const currentVersionById = {};
        rows.forEach(function (row) {
            currentVersionById[row.id] = row.version;
        });

        const conflicts = uniqueIds.filter(function (id) {
            const expected = parseInt(versionMap[String(id)], 10);
            return currentVersionById[id] == null || !Number.isFinite(expected) || expected !== currentVersionById[id];
        }).map(function (id) {
            return { id, code: 'VERSION_CONFLICT' };
        });

        if (conflicts.length) {
            return res.status(409).json({
                ok: false,
                error: { code: 'BATCH_FAILED', message: '版本冲突' },
                items: conflicts
            });
        }

        const beforeRows = uniqueIds.map(id => getAuditProduct(db, id)).filter(Boolean);
        const runBatch = db.transaction(function () {
            const now = Date.now();

            if (action === 'hard_delete') {
                uniqueIds.forEach(function (id) {
                    deleteAssetReferences(db, { module: 'products', entity_type: 'product', entity_id: id });
                });
                db.prepare(`DELETE FROM product_specs WHERE product_id IN (${placeholders})`).run(...uniqueIds);
                db.prepare(`DELETE FROM product_media WHERE product_id IN (${placeholders})`).run(...uniqueIds);
                db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...uniqueIds);
                beforeRows.forEach(function (before) {
                    insertAuditLog(db, req, 'product', before.id, 'hard_delete', before, null);
                });
                return;
            }

            const nextStatus = action === 'publish' ? 'published' : (action === 'draft' ? 'draft' : 'deleted');
            db.prepare(`
                UPDATE products
                SET status = ?, version = version + 1, updated_at = ?
                WHERE id IN (${placeholders})
            `).run(nextStatus, now, ...uniqueIds);

            beforeRows.forEach(function (before) {
                if (nextStatus === 'deleted') {
                    deleteAssetReferences(db, { module: 'products', entity_type: 'product', entity_id: before.id });
                } else {
                    syncProductAssetReferences(db, before.id);
                }
                const after = getAuditProduct(db, before.id);
                insertAuditLog(db, req, 'product', before.id, action, before, after);
            });
        });

        try {
            runBatch();
        } catch (err) {
            return res.status(409).json({
                ok: false,
                error: { code: 'BATCH_FAILED', message: 'Batch operation failed.' }
            });
        }

        if (action === 'hard_delete') {
            beforeRows.forEach(function (before) {
                const result = deleteProductCardThumbnail(productCardThumbnailPayload(before));
                if (result.reason === 'delete_failed') {
                    console.warn('[product-card-thumbnail] delete failed', result);
                }
            });
        }

        res.json({ ok: true, data: { action, affected: uniqueIds.length } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
