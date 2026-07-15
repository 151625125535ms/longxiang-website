const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');
const { syncLegacyTranslations } = require('./translation-compat');

const router = express.Router();
const CATEGORY_TYPES = ['product', 'certification', 'content'];
const CATEGORY_FIELDS = `
    c.id,
    c.type,
    c.parent_id,
    c.slug,
    c.name_en,
    c.name_ar,
    c.name_fr,
    c.name_ru,
    c.sort_order,
    c.is_active,
    c.created_at,
    c.updated_at,
    parent.slug AS parent_slug,
    parent.name_en AS parent_name_en,
    parent.name_ar AS parent_name_ar,
    parent.name_fr AS parent_name_fr,
    parent.name_ru AS parent_name_ru,
    parent.sort_order AS parent_sort_order,
    (
        SELECT COUNT(*)
        FROM categories child
        WHERE child.parent_id = c.id
    ) AS child_count,
    (
        SELECT COUNT(*)
        FROM products p
        WHERE p.category_id = c.id
    ) AS product_count,
    (
        SELECT COUNT(*)
        FROM certifications cert
        WHERE cert.category_id = c.id
    ) AS certification_count
`;

function makeSlug(name) {
    const slug = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return slug || 'category-' + Date.now();
}

function makeUniqueCategorySlug(db, type, preferred) {
    const base = makeSlug(preferred || type || 'category');
    let candidate = base;
    let suffix = 2;
    while (db.prepare('SELECT 1 FROM categories WHERE type = ? AND slug = ? LIMIT 1').get(type, candidate)) {
        candidate = base + '-' + suffix;
        suffix += 1;
    }
    return candidate;
}

function findCategory(db, id) {
    return db.prepare(`
        SELECT ${CATEGORY_FIELDS}
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE c.id = ?
    `).get(id);
}

function validateCreate(body) {
    const type = String(body.type || 'product').trim();
    const nameEn = String(body.name_en || body.name_ar || '').trim();

    if (!type || CATEGORY_TYPES.indexOf(type) === -1) {
        return 'type must be one of product, certification, content.';
    }
    if (!nameEn) return '请填写分类名称。';
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

function normalizeParentId(value) {
    if (value == null || value === '' || value === 'null' || value === 'none') return null;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function resolveParentId(db, type, value, currentId) {
    const parentId = normalizeParentId(value);
    if (parentId == null) return { parentId: null };
    if (!Number.isFinite(parentId)) {
        return { error: 'Invalid parent category.' };
    }
    if (currentId != null && String(parentId) === String(currentId)) {
        return { error: 'Category cannot be its own parent.' };
    }

    const parent = db.prepare(`
        SELECT id, type, parent_id
        FROM categories
        WHERE id = ?
    `).get(parentId);

    if (!parent || parent.type !== type) {
        return { error: 'Parent category not found.' };
    }
    if (parent.parent_id != null) {
        return { error: 'Only top-level categories can be selected as parent.' };
    }

    return { parentId };
}

function countChildCategories(db, id) {
    return db.prepare('SELECT COUNT(*) AS total FROM categories WHERE parent_id = ?')
        .get(id).total;
}

function categoryItemCount(category) {
    if (!category) return 0;
    if (category.type === 'product') return category.product_count || 0;
    if (category.type === 'certification') return category.certification_count || 0;
    return 0;
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
                SELECT ${CATEGORY_FIELDS}
                FROM categories c
                LEFT JOIN categories parent ON parent.id = c.parent_id
                WHERE c.type = ?
                ORDER BY
                    COALESCE(parent.sort_order, c.sort_order),
                    CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
                    c.sort_order,
                    c.id
            `).all(type)
            : db.prepare(`
                SELECT ${CATEGORY_FIELDS}
                FROM categories c
                LEFT JOIN categories parent ON parent.id = c.parent_id
                ORDER BY
                    c.type,
                    COALESCE(parent.sort_order, c.sort_order),
                    CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
                    c.sort_order,
                    c.id
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
        const type = String(body.type || 'product').trim();
        const parentResult = resolveParentId(db, type, body.parent_id, null);
        if (parentResult.error) {
            return sendError(res, 422, 'VALIDATION_ERROR', parentResult.error);
        }
        const now = Date.now();
        const createCategory = db.transaction(function () {
            const result = db.prepare(`
                INSERT INTO categories
                    (type, parent_id, slug, name_en, name_ar, name_fr, name_ru, sort_order, is_active, created_at, updated_at)
                VALUES
                    (@type, @parent_id, @slug, @name_en, @name_ar, @name_fr, @name_ru, @sort_order, 1, @created_at, @updated_at)
            `).run({
                type,
                parent_id: parentResult.parentId,
                slug: makeUniqueCategorySlug(db, type, body.slug || body.name_en || body.name_ar),
                name_en: String(body.name_en || body.name_ar).trim(),
                name_ar: body.name_ar == null ? '' : String(body.name_ar).trim(),
                name_fr: body.name_fr == null ? '' : String(body.name_fr).trim(),
                name_ru: body.name_ru == null ? '' : String(body.name_ru).trim(),
                sort_order: normalizeSortOrder(body.sort_order),
                created_at: now,
                updated_at: now
            });

            syncLegacyTranslations(db, req, 'category', result.lastInsertRowid);
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
        let nextParentId = before.parent_id;
        if (Object.prototype.hasOwnProperty.call(body, 'parent_id')) {
            const parentResult = resolveParentId(db, before.type, body.parent_id, before.id);
            if (parentResult.error) {
                return sendError(res, 422, 'VALIDATION_ERROR', parentResult.error);
            }
            nextParentId = parentResult.parentId;
        }

        if (nextParentId != null && countChildCategories(db, before.id) > 0) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Category with children cannot be moved under another parent.');
        }

        const updateCategory = db.transaction(function () {
            db.prepare(`
                UPDATE categories
                SET
                    parent_id = @parent_id,
                    name_en = @name_en,
                    name_ar = @name_ar,
                    name_fr = @name_fr,
                    name_ru = @name_ru,
                    sort_order = @sort_order,
                    is_active = @is_active,
                    updated_at = @updated_at
                WHERE id = @id
            `).run({
                id: before.id,
                parent_id: nextParentId,
                name_en: body.name_en == null ? before.name_en : String(body.name_en).trim(),
                name_ar: body.name_ar == null ? before.name_ar : String(body.name_ar).trim(),
                name_fr: body.name_fr == null ? before.name_fr : String(body.name_fr).trim(),
                name_ru: body.name_ru == null ? before.name_ru : String(body.name_ru).trim(),
                sort_order: body.sort_order == null ? before.sort_order : normalizeSortOrder(body.sort_order),
                is_active: body.is_active == null ? before.is_active : normalizeActive(body.is_active),
                updated_at: Date.now()
            });

            syncLegacyTranslations(db, req, 'category', before.id);
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
        const childRefs = countChildCategories(db, before.id);

        if (childRefs > 0) {
            return sendError(
                res,
                409,
                'BATCH_FAILED',
                'Category has ' + childRefs + ' child category item(s).'
            );
        }

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
