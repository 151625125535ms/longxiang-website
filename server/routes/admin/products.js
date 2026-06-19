const express = require('express');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { getDb } = require('../../lib/db');
const { ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('../../lib/fileStore');
const { normalizeUploadedFilename } = require('../../lib/filenameEncoding');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const STATUSES = ['published', 'draft', 'deleted'];
const BATCH_ACTIONS = ['soft_delete', 'publish', 'draft', 'hard_delete'];
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

    const q = String(query.q || '').trim();
    if (q) {
        where.push('(p.name_en LIKE @q OR p.name_ar LIKE @q)');
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
            SELECT COUNT(*) AS total
            FROM products p
            ${built.whereSql}
        `).get(built.params);

        const rows = db.prepare(`
            SELECT
                p.id, p.legacy_id, p.slug, p.category_id, c.name_en AS category_name_en,
                p.product_group, p.sub_category, p.status, p.sort_order, p.featured,
                p.name_en, p.name_ar, p.short_desc_en, p.short_desc_ar,
                p.seo_title, p.seo_description, p.seo_keywords,
                COALESCE(cover.path, '') AS cover_image,
                p.version, p.created_at, p.updated_at
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
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
                    checksum: '',
                    created_at: createdAt
                });

                return {
                    id: result.lastInsertRowid,
                    path: publicPath,
                    filename: req.file.filename,
                    original_name: originalName,
                    mime_type: req.file.mimetype || '',
                    file_size: req.file.size || 0
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
        const galleryPaths = body.gallery === undefined ? [] : normalizeGalleryPaths(body.gallery);
        if (galleryPaths == null) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid cover_image path.');
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
                        1, @created_at, @updated_at
                    )
            `).run({
                legacy_id: legacyId,
                slug,
                category_id: categoryMapping.categoryId,
                product_group: categoryMapping.productGroup,
                sub_category: categoryMapping.subCategory,
                aliases_json: aliasesJson,
                status,
                sort_order: parseInteger(body.sort_order, 0),
                featured: normalizeBool(body.featured, 0),
                name_en: nameEn,
                name_ar: body.name_ar ? String(body.name_ar).trim() : '',
                short_desc_en: body.short_desc_en ? String(body.short_desc_en).trim() : '',
                short_desc_ar: body.short_desc_ar ? String(body.short_desc_ar).trim() : '',
                description_en: body.description_en ? String(body.description_en).trim() : '',
                description_ar: body.description_ar ? String(body.description_ar).trim() : '',
                seo_title: body.seo_title ? String(body.seo_title).trim() : '',
                seo_description: body.seo_description ? String(body.seo_description).trim() : '',
                seo_keywords: body.seo_keywords ? String(body.seo_keywords).trim() : '',
                created_at: now,
                updated_at: now
            });

            const productId = result.lastInsertRowid;
            replaceProductSpecs(db, productId, normalizeProductSpecs(body.specs), now);
            replaceCoverImage(db, productId, coverPath, now);
            replaceGalleryImages(db, productId, galleryPaths, coverPath, now);
            const product = getFullProduct(db, productId);
            insertAuditLog(db, req, 'product', product.id, 'create', null, product);
            return product;
        });

        const product = createProduct();
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
        const galleryPaths = body.gallery === undefined ? undefined : normalizeGalleryPaths(body.gallery);
        if (galleryPaths == null && body.gallery !== undefined) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid cover_image path.');
        }

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
                name_en: body.name_en == null ? before.name_en : firstText(body.name_en, body.name_ar, before.name_en, before.legacy_id),
                name_ar: body.name_ar == null ? before.name_ar : String(body.name_ar).trim(),
                short_desc_en: body.short_desc_en == null ? before.short_desc_en : String(body.short_desc_en).trim(),
                short_desc_ar: body.short_desc_ar == null ? before.short_desc_ar : String(body.short_desc_ar).trim(),
                description_en: body.description_en == null ? before.description_en : String(body.description_en).trim(),
                description_ar: body.description_ar == null ? before.description_ar : String(body.description_ar).trim(),
                seo_title: body.seo_title == null ? before.seo_title : String(body.seo_title).trim(),
                seo_description: body.seo_description == null ? before.seo_description : String(body.seo_description).trim(),
                seo_keywords: body.seo_keywords == null ? before.seo_keywords : String(body.seo_keywords).trim(),
                updated_at: timestamp
            });

            if (body.specs !== undefined) {
                replaceProductSpecs(db, before.id, normalizeProductSpecs(body.specs), timestamp);
            }
            replaceCoverImage(db, before.id, coverPath, timestamp);
            if (galleryPaths !== undefined) {
                replaceGalleryImages(db, before.id, galleryPaths, coverPath === undefined ? before.cover_image : coverPath, timestamp);
            }
            const afterAudit = getAuditProduct(db, before.id);
            insertAuditLog(db, req, 'product', before.id, 'update', before, afterAudit);
            return getFullProduct(db, before.id);
        });

        res.json({ ok: true, data: updateProduct() });
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

        const runBatch = db.transaction(function () {
            const beforeRows = uniqueIds.map(id => getAuditProduct(db, id));
            const now = Date.now();

            if (action === 'hard_delete') {
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

        res.json({ ok: true, data: { action, affected: uniqueIds.length } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
