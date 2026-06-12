const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const STATUSES = ['published', 'draft', 'deleted'];
const BATCH_ACTIONS = ['soft_delete', 'publish', 'draft', 'hard_delete'];

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

function normalizeStatus(value, defaultValue) {
    const status = String(value || '').trim();
    if (!status) return defaultValue;
    return STATUSES.indexOf(status) !== -1 ? status : null;
}

function validateJsonString(value) {
    if (value == null || value === '') return '[]';
    if (typeof value !== 'string') return null;
    try {
        JSON.parse(value);
        return value;
    } catch (err) {
        return null;
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

function buildListQuery(query) {
    const where = [];
    const params = {};

    const status = String(query.status || '').trim();
    if (status) {
        if (STATUSES.indexOf(status) === -1) return { error: 'Invalid status.' };
        where.push('p.status = @status');
        params.status = status;
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
                COALESCE(cover.path, '') AS cover_image,
                p.version, p.created_at, p.updated_at
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN product_media cover ON cover.product_id = p.id AND cover.is_cover = 1
            ${built.whereSql}
            GROUP BY p.id
            ORDER BY p.featured DESC, p.sort_order, p.id
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

router.post('/', function (req, res, next) {
    try {
        const body = req.body || {};
        const nameEn = String(body.name_en || '').trim();
        if (!nameEn) return sendError(res, 422, 'VALIDATION_ERROR', 'name_en is required.');

        const status = normalizeStatus(body.status, 'published');
        if (!status) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');

        const aliasesJson = validateJsonString(body.aliases_json);
        if (aliasesJson == null) return sendError(res, 422, 'VALIDATION_ERROR', 'aliases_json must be a JSON string.');

        const db = getDb();
        const now = Date.now();
        const createProduct = db.transaction(function () {
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
                legacy_id: body.legacy_id ? String(body.legacy_id).trim() : null,
                slug: body.slug ? String(body.slug).trim() : makeSlug(nameEn),
                category_id: body.category_id == null || body.category_id === '' ? null : parseInteger(body.category_id, null),
                product_group: body.product_group ? String(body.product_group).trim() : '',
                sub_category: body.sub_category ? String(body.sub_category).trim() : '',
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

            const product = getFullProduct(db, result.lastInsertRowid);
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

        const aliasesJson = body.aliases_json == null ? before.aliases_json : validateJsonString(body.aliases_json);
        if (aliasesJson == null) return sendError(res, 422, 'VALIDATION_ERROR', 'aliases_json must be a JSON string.');

        const updateProduct = db.transaction(function () {
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
                category_id: body.category_id === undefined ? before.category_id : (body.category_id == null || body.category_id === '' ? null : parseInteger(body.category_id, null)),
                product_group: body.product_group == null ? before.product_group : String(body.product_group).trim(),
                sub_category: body.sub_category == null ? before.sub_category : String(body.sub_category).trim(),
                aliases_json: aliasesJson,
                status,
                sort_order: body.sort_order == null ? before.sort_order : parseInteger(body.sort_order, before.sort_order),
                featured: body.featured == null ? before.featured : normalizeBool(body.featured, before.featured),
                name_en: body.name_en == null ? before.name_en : String(body.name_en).trim(),
                name_ar: body.name_ar == null ? before.name_ar : String(body.name_ar).trim(),
                short_desc_en: body.short_desc_en == null ? before.short_desc_en : String(body.short_desc_en).trim(),
                short_desc_ar: body.short_desc_ar == null ? before.short_desc_ar : String(body.short_desc_ar).trim(),
                description_en: body.description_en == null ? before.description_en : String(body.description_en).trim(),
                description_ar: body.description_ar == null ? before.description_ar : String(body.description_ar).trim(),
                seo_title: body.seo_title == null ? before.seo_title : String(body.seo_title).trim(),
                seo_description: body.seo_description == null ? before.seo_description : String(body.seo_description).trim(),
                seo_keywords: body.seo_keywords == null ? before.seo_keywords : String(body.seo_keywords).trim(),
                updated_at: Date.now()
            });

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
