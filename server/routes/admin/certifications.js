const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const STATUSES = ['published', 'draft', 'deleted'];
const BATCH_ACTIONS = ['soft_delete', 'publish', 'hard_delete'];

function parsePositiveInt(value, defaultValue, maxValue) {
    const parsed = parseInt(value, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    return maxValue ? Math.min(normalized, maxValue) : normalized;
}

function parseInteger(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeStatus(value, defaultValue) {
    const status = String(value || '').trim();
    if (!status) return defaultValue;
    return STATUSES.indexOf(status) !== -1 ? status : null;
}

function getCertification(db, id) {
    return db.prepare(`
        SELECT
            cert.id, cert.legacy_id, cert.category_id, c.name_en AS category_name_en,
            cert.legacy_category, cert.status, cert.sort_order,
            cert.name_en, cert.name_ar, cert.category_label_en, cert.category_label_ar,
            cert.image_path, cert.source_type, cert.pages, cert.width, cert.height,
            cert.issuer_en, cert.issuer_ar, cert.expiry_date,
            cert.description_en, cert.description_ar,
            cert.version, cert.created_at, cert.updated_at
        FROM certifications cert
        LEFT JOIN categories c ON c.id = cert.category_id
        WHERE cert.id = ?
    `).get(id);
}

function buildListQuery(query) {
    const where = [];
    const params = {};

    const status = String(query.status || '').trim();
    if (status) {
        if (STATUSES.indexOf(status) === -1) return { error: 'Invalid status.' };
        where.push('cert.status = @status');
        params.status = status;
    }

    if (query.category != null && String(query.category).trim() !== '') {
        const categoryId = parseInt(query.category, 10);
        if (!Number.isFinite(categoryId)) return { error: 'Invalid category.' };
        where.push('cert.category_id = @category_id');
        params.category_id = categoryId;
    }

    const q = String(query.q || '').trim();
    if (q) {
        where.push('(cert.name_en LIKE @q OR cert.name_ar LIKE @q)');
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
            FROM certifications cert
            ${built.whereSql}
        `).get(built.params);

        const rows = db.prepare(`
            SELECT
                cert.id, cert.legacy_id, cert.category_id, c.name_en AS category_name_en,
                cert.legacy_category, cert.status, cert.sort_order,
                cert.name_en, cert.name_ar, cert.image_path, cert.source_type,
                cert.pages, cert.version, cert.created_at, cert.updated_at
            FROM certifications cert
            LEFT JOIN categories c ON c.id = cert.category_id
            ${built.whereSql}
            ORDER BY cert.sort_order, cert.id
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
        const certification = getCertification(getDb(), req.params.id);
        if (!certification) return sendError(res, 404, 'NOT_FOUND', 'Certification not found.');
        res.json({ ok: true, data: certification });
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

        const db = getDb();
        const now = Date.now();
        const createCertification = db.transaction(function () {
            const result = db.prepare(`
                INSERT INTO certifications
                    (
                        legacy_id, category_id, legacy_category, status,
                        sort_order, name_en, name_ar, image_path, source_type,
                        pages, width, height, issuer_en, issuer_ar, expiry_date,
                        description_en, description_ar, version, created_at, updated_at
                    )
                VALUES
                    (
                        @legacy_id, @category_id, @legacy_category, @status,
                        @sort_order, @name_en, @name_ar, @image_path, @source_type,
                        @pages, @width, @height, @issuer_en, @issuer_ar, @expiry_date,
                        @description_en, @description_ar, 1, @created_at, @updated_at
                    )
            `).run({
                legacy_id: body.legacy_id ? String(body.legacy_id).trim() : null,
                category_id: body.category_id == null || body.category_id === '' ? null : parseInteger(body.category_id, null),
                legacy_category: body.legacy_category ? String(body.legacy_category).trim() : '',
                status,
                sort_order: parseInteger(body.sort_order, 0),
                name_en: nameEn,
                name_ar: body.name_ar ? String(body.name_ar).trim() : '',
                image_path: body.image_path ? String(body.image_path).trim() : '',
                source_type: body.source_type ? String(body.source_type).trim() : '',
                pages: parseInteger(body.pages, 1),
                width: body.width == null || body.width === '' ? null : parseInteger(body.width, null),
                height: body.height == null || body.height === '' ? null : parseInteger(body.height, null),
                issuer_en: body.issuer_en ? String(body.issuer_en).trim() : '',
                issuer_ar: body.issuer_ar ? String(body.issuer_ar).trim() : '',
                expiry_date: body.expiry_date ? String(body.expiry_date).trim() : '',
                description_en: body.description_en ? String(body.description_en).trim() : '',
                description_ar: body.description_ar ? String(body.description_ar).trim() : '',
                created_at: now,
                updated_at: now
            });

            const certification = getCertification(db, result.lastInsertRowid);
            insertAuditLog(db, req, 'certification', certification.id, 'create', null, certification);
            return certification;
        });

        res.status(201).json({ ok: true, data: createCertification() });
    } catch (err) {
        if (err && err.code && String(err.code).indexOf('SQLITE_CONSTRAINT') === 0) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'legacy_id already exists.');
        }
        next(err);
    }
});

router.put('/:id', function (req, res, next) {
    try {
        const body = req.body || {};
        if (body.version == null) return sendError(res, 422, 'VALIDATION_ERROR', 'version is required.');

        const db = getDb();
        const before = getCertification(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Certification not found.');

        const requestVersion = parseInt(body.version, 10);
        if (!Number.isFinite(requestVersion) || requestVersion !== before.version) {
            return sendError(res, 409, 'VERSION_CONFLICT', 'Certification version conflict.');
        }

        const status = body.status == null ? before.status : normalizeStatus(body.status, before.status);
        if (!status) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');

        const updateCertification = db.transaction(function () {
            db.prepare(`
                UPDATE certifications
                SET
                    category_id = @category_id,
                    legacy_category = @legacy_category,
                    status = @status,
                    sort_order = @sort_order,
                    name_en = @name_en,
                    name_ar = @name_ar,
                    image_path = @image_path,
                    source_type = @source_type,
                    pages = @pages,
                    width = @width,
                    height = @height,
                    issuer_en = @issuer_en,
                    issuer_ar = @issuer_ar,
                    expiry_date = @expiry_date,
                    description_en = @description_en,
                    description_ar = @description_ar,
                    version = version + 1,
                    updated_at = @updated_at
                WHERE id = @id
            `).run({
                id: before.id,
                category_id: body.category_id === undefined ? before.category_id : (body.category_id == null || body.category_id === '' ? null : parseInteger(body.category_id, null)),
                legacy_category: body.legacy_category == null ? before.legacy_category : String(body.legacy_category).trim(),
                status,
                sort_order: body.sort_order == null ? before.sort_order : parseInteger(body.sort_order, before.sort_order),
                name_en: body.name_en == null ? before.name_en : String(body.name_en).trim(),
                name_ar: body.name_ar == null ? before.name_ar : String(body.name_ar).trim(),
                image_path: body.image_path == null ? before.image_path : String(body.image_path).trim(),
                source_type: body.source_type == null ? before.source_type : String(body.source_type).trim(),
                pages: body.pages == null ? before.pages : parseInteger(body.pages, before.pages),
                width: body.width === undefined ? before.width : (body.width == null || body.width === '' ? null : parseInteger(body.width, null)),
                height: body.height === undefined ? before.height : (body.height == null || body.height === '' ? null : parseInteger(body.height, null)),
                issuer_en: body.issuer_en == null ? before.issuer_en : String(body.issuer_en).trim(),
                issuer_ar: body.issuer_ar == null ? before.issuer_ar : String(body.issuer_ar).trim(),
                expiry_date: body.expiry_date == null ? before.expiry_date : String(body.expiry_date).trim(),
                description_en: body.description_en == null ? before.description_en : String(body.description_en).trim(),
                description_ar: body.description_ar == null ? before.description_ar : String(body.description_ar).trim(),
                updated_at: Date.now()
            });

            const after = getCertification(db, before.id);
            insertAuditLog(db, req, 'certification', before.id, 'update', before, after);
            return after;
        });

        res.json({ ok: true, data: updateCertification() });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const before = getCertification(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Certification not found.');

        const softDelete = db.transaction(function () {
            db.prepare(`
                UPDATE certifications
                SET status = 'deleted', version = version + 1, updated_at = @updated_at
                WHERE id = @id
            `).run({ id: before.id, updated_at: Date.now() });

            const after = getCertification(db, before.id);
            insertAuditLog(db, req, 'certification', before.id, 'soft_delete', before, after);
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
            FROM certifications
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
            const beforeRows = uniqueIds.map(id => getCertification(db, id));
            const now = Date.now();

            if (action === 'hard_delete') {
                db.prepare(`DELETE FROM certifications WHERE id IN (${placeholders})`).run(...uniqueIds);
                beforeRows.forEach(function (before) {
                    insertAuditLog(db, req, 'certification', before.id, 'hard_delete', before, null);
                });
                return;
            }

            const nextStatus = action === 'publish' ? 'published' : 'deleted';
            db.prepare(`
                UPDATE certifications
                SET status = ?, version = version + 1, updated_at = ?
                WHERE id IN (${placeholders})
            `).run(nextStatus, now, ...uniqueIds);

            beforeRows.forEach(function (before) {
                const after = getCertification(db, before.id);
                insertAuditLog(db, req, 'certification', before.id, action, before, after);
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
