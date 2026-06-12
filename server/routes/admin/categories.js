const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const CATEGORY_TYPES = ['product', 'certification', 'content'];

function findCategory(db, id) {
    return db.prepare(`
        SELECT id, type, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at
        FROM categories
        WHERE id = ?
    `).get(id);
}

function validateCreate(body) {
    const type = String(body.type || '').trim();
    const slug = String(body.slug || '').trim();
    const nameEn = String(body.name_en || '').trim();

    if (!type || CATEGORY_TYPES.indexOf(type) === -1) {
        return 'type must be one of product, certification, content.';
    }
    if (!slug) return 'slug is required.';
    if (!nameEn) return 'name_en is required.';
    return null;
}

function normalizeSortOrder(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeActive(value) {
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false') return 0;
    return 1;
}

router.get('/', function (req, res, next) {
    try {
        const db = getDb();
        const type = String(req.query.type || '').trim();

        if (type && CATEGORY_TYPES.indexOf(type) === -1) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid category type.');
        }

        const rows = type
            ? db.prepare(`
                SELECT id, type, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at
                FROM categories
                WHERE type = ?
                ORDER BY sort_order, id
            `).all(type)
            : db.prepare(`
                SELECT id, type, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at
                FROM categories
                ORDER BY type, sort_order, id
            `).all();

        res.json({ ok: true, data: rows });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', function (req, res, next) {
    try {
        const category = findCategory(getDb(), req.params.id);
        if (!category) return sendError(res, 404, 'NOT_FOUND', 'Category not found.');
        res.json({ ok: true, data: category });
    } catch (err) {
        next(err);
    }
});

router.post('/', function (req, res, next) {
    try {
        const body = req.body || {};
        const validationError = validateCreate(body);
        if (validationError) {
            return sendError(res, 422, 'VALIDATION_ERROR', validationError);
        }

        const db = getDb();
        const now = Date.now();
        const createCategory = db.transaction(function () {
            const result = db.prepare(`
                INSERT INTO categories
                    (type, parent_id, slug, name_en, name_ar, sort_order, is_active, created_at, updated_at)
                VALUES
                    (@type, NULL, @slug, @name_en, @name_ar, @sort_order, 1, @created_at, @updated_at)
            `).run({
                type: String(body.type).trim(),
                slug: String(body.slug).trim(),
                name_en: String(body.name_en).trim(),
                name_ar: body.name_ar == null ? '' : String(body.name_ar).trim(),
                sort_order: normalizeSortOrder(body.sort_order),
                created_at: now,
                updated_at: now
            });

            const category = findCategory(db, result.lastInsertRowid);
            insertAuditLog(db, req, 'category', category.id, 'create', null, category);
            return category;
        });

        const category = createCategory();
        res.status(201).json({ ok: true, data: category });
    } catch (err) {
        if (err && err.code && String(err.code).indexOf('SQLITE_CONSTRAINT') === 0) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Category slug must be unique within the same type.');
        }
        next(err);
    }
});

router.put('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const before = findCategory(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Category not found.');

        const body = req.body || {};
        const updateCategory = db.transaction(function () {
            db.prepare(`
                UPDATE categories
                SET
                    name_en = @name_en,
                    name_ar = @name_ar,
                    sort_order = @sort_order,
                    is_active = @is_active,
                    updated_at = @updated_at
                WHERE id = @id
            `).run({
                id: before.id,
                name_en: body.name_en == null ? before.name_en : String(body.name_en).trim(),
                name_ar: body.name_ar == null ? before.name_ar : String(body.name_ar).trim(),
                sort_order: body.sort_order == null ? before.sort_order : normalizeSortOrder(body.sort_order),
                is_active: body.is_active == null ? before.is_active : normalizeActive(body.is_active),
                updated_at: Date.now()
            });

            const after = findCategory(db, before.id);
            insertAuditLog(db, req, 'category', before.id, 'update', before, after);
            return after;
        });

        res.json({ ok: true, data: updateCategory() });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const before = findCategory(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Category not found.');

        const productRefs = db
            .prepare('SELECT COUNT(*) AS total FROM products WHERE category_id = ?')
            .get(before.id).total;
        const certificationRefs = db
            .prepare('SELECT COUNT(*) AS total FROM certifications WHERE category_id = ?')
            .get(before.id).total;
        const totalRefs = productRefs + certificationRefs;

        if (totalRefs > 0) {
            return sendError(
                res,
                409,
                'BATCH_FAILED',
                'Category is referenced by ' + totalRefs + ' item(s).'
            );
        }

        const deleteCategory = db.transaction(function () {
            db.prepare('DELETE FROM categories WHERE id = ?').run(before.id);
            insertAuditLog(db, req, 'category', before.id, 'delete', before, null);
        });

        deleteCategory();
        res.json({ ok: true, data: { id: before.id, deleted: true } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
