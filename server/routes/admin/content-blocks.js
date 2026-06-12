const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const BATCH_ACTIONS = ['publish', 'unpublish'];

function parseBodyJson(value) {
    try {
        return JSON.parse(value || '{}');
    } catch (err) {
        return {};
    }
}

function normalizeRow(row) {
    if (!row) return null;
    return {
        ...row,
        body_json: parseBodyJson(row.body_json)
    };
}

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getContentBlockBySlug(db, slug) {
    const row = db.prepare(`
        SELECT id, slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at
        FROM content_blocks
        WHERE slug = ?
    `).get(slug);
    return normalizeRow(row);
}

function getContentBlockById(db, id) {
    const row = db.prepare(`
        SELECT id, slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at
        FROM content_blocks
        WHERE id = ?
    `).get(id);
    return normalizeRow(row);
}

router.get('/', function (req, res, next) {
    try {
        const rows = getDb().prepare(`
            SELECT id, slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at
            FROM content_blocks
            ORDER BY sort_order, id
        `).all().map(normalizeRow);

        res.json({ ok: true, data: rows });
    } catch (err) {
        next(err);
    }
});

router.get('/:slug', function (req, res, next) {
    try {
        const block = getContentBlockBySlug(getDb(), req.params.slug);
        if (!block) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');
        res.json({ ok: true, data: block });
    } catch (err) {
        next(err);
    }
});

router.put('/:slug', function (req, res, next) {
    try {
        const body = req.body || {};
        if (body.version == null) return sendError(res, 422, 'VALIDATION_ERROR', 'version is required.');
        if (body.body_json !== undefined && !isPlainObject(body.body_json)) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'body_json must be an object.');
        }

        const db = getDb();
        const before = getContentBlockBySlug(db, req.params.slug);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');

        const requestVersion = parseInt(body.version, 10);
        if (!Number.isFinite(requestVersion) || requestVersion !== before.version) {
            return sendError(res, 409, 'VERSION_CONFLICT', 'Content block version conflict.');
        }

        const updateBlock = db.transaction(function () {
            db.prepare(`
                UPDATE content_blocks
                SET
                    title_en = @title_en,
                    title_ar = @title_ar,
                    body_json = @body_json,
                    status = @status,
                    version = version + 1,
                    updated_at = @updated_at
                WHERE slug = @slug
            `).run({
                slug: before.slug,
                title_en: body.title_en == null ? before.title_en : String(body.title_en).trim(),
                title_ar: body.title_ar == null ? before.title_ar : String(body.title_ar).trim(),
                body_json: JSON.stringify(body.body_json === undefined ? before.body_json : body.body_json),
                status: body.status == null ? before.status : String(body.status).trim(),
                updated_at: Date.now()
            });

            const after = getContentBlockBySlug(db, before.slug);
            insertAuditLog(db, req, 'content_block', before.id, 'update', before, after);
            return after;
        });

        res.json({ ok: true, data: updateBlock() });
    } catch (err) {
        next(err);
    }
});

router.post('/batch', function (req, res, next) {
    try {
        const body = req.body || {};
        const action = String(body.action || '').trim();
        const ids = Array.isArray(body.ids) ? body.ids.map(id => parseInt(id, 10)) : [];
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

        const db = getDb();
        const placeholders = uniqueIds.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT id, version
            FROM content_blocks
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
            const beforeRows = uniqueIds.map(id => getContentBlockById(db, id));
            const nextStatus = action === 'publish' ? 'published' : 'draft';
            const now = Date.now();

            db.prepare(`
                UPDATE content_blocks
                SET status = ?, version = version + 1, updated_at = ?
                WHERE id IN (${placeholders})
            `).run(nextStatus, now, ...uniqueIds);

            beforeRows.forEach(function (before) {
                const after = getContentBlockById(db, before.id);
                insertAuditLog(db, req, 'content_block', before.id, action, before, after);
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
