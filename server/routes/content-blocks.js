const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../lib/db');

const router = express.Router();

function parseJson(value) {
    try {
        return JSON.parse(value || '{}');
    } catch (err) {
        return {};
    }
}

function normalizeRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        slug: row.slug,
        title_en: row.title_en || '',
        title_ar: row.title_ar || '',
        body_json: parseJson(row.body_json),
        status: row.status || 'published',
        sort_order: row.sort_order || 0,
        version: row.version || 1,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function sendError(res, status, code, message) {
    res.status(status).json({ ok: false, error: { code, message } });
}

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getBlock(db, slug) {
    return normalizeRow(db.prepare(`
        SELECT id, slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at
        FROM content_blocks
        WHERE slug = ?
    `).get(slug));
}

function insertAuditLog(db, req, before, after) {
    try {
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, before_json, after_json, ip, user_agent, created_at)
            VALUES
                (@entity_type, @entity_id, @action, @performed_by, @before_json, @after_json, @ip, @user_agent, @created_at)
        `).run({
            entity_type: 'content_block',
            entity_id: String(before.id),
            action: 'update',
            performed_by: req.user && req.user.username ? req.user.username : 'admin',
            before_json: JSON.stringify(before),
            after_json: JSON.stringify(after),
            ip: req.ip || '',
            user_agent: req.get('user-agent') || '',
            created_at: Date.now()
        });
    } catch (err) {
        // Auditing should not block content publishing.
    }
}

router.use(authMiddleware);

router.get('/:slug', function (req, res) {
    try {
        const block = getBlock(getDb(), req.params.slug);
        if (!block) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');
        res.json({ ok: true, data: block });
    } catch (err) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Failed to read content block.');
    }
});

router.put('/:slug', function (req, res) {
    try {
        const body = req.body || {};
        if (body.version == null) return sendError(res, 422, 'VALIDATION_ERROR', 'version is required.');
        if (body.body_json !== undefined && !isPlainObject(body.body_json)) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'body_json must be an object.');
        }

        const db = getDb();
        const before = getBlock(db, req.params.slug);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');

        const requestVersion = parseInt(body.version, 10);
        if (!Number.isFinite(requestVersion) || requestVersion !== before.version) {
            return sendError(res, 409, 'VERSION_CONFLICT', 'Content block version conflict.');
        }

        const updateBlock = db.transaction(function () {
            db.prepare(`
                UPDATE content_blocks
                SET title_en = @title_en,
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

            const after = getBlock(db, before.slug);
            insertAuditLog(db, req, before, after);
            return after;
        });

        res.json({ ok: true, data: updateBlock() });
    } catch (err) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update content block.');
    }
});

module.exports = router;
