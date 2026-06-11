const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError } = require('./helpers');

const router = express.Router();

function parsePositiveInt(value, defaultValue, maxValue) {
    const parsed = parseInt(value, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    return maxValue ? Math.min(normalized, maxValue) : normalized;
}

function parseInteger(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeBoolean(value, defaultValue) {
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false') return 0;
    return defaultValue;
}

function getAsset(db, id) {
    return db.prepare(`
        SELECT
            id, path, filename, original_name, mime_type, file_size,
            checksum, module, entity_type, entity_id, is_active, created_at
        FROM assets
        WHERE id = ?
    `).get(id);
}

function buildQuery(query) {
    const where = [];
    const params = {};

    const moduleName = String(query.module || '').trim();
    if (moduleName) {
        where.push('module = @module');
        params.module = moduleName;
    }

    const entityType = String(query.entity_type || '').trim();
    if (entityType) {
        where.push('entity_type = @entity_type');
        params.entity_type = entityType;
    }

    if (query.is_active == null || String(query.is_active).trim() === '') {
        where.push('is_active = 1');
    } else {
        const active = normalizeBoolean(query.is_active, null);
        if (active == null) return { error: 'Invalid is_active value.' };
        where.push('is_active = @is_active');
        params.is_active = active;
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
        const built = buildQuery(req.query);
        if (built.error) return sendError(res, 422, 'VALIDATION_ERROR', built.error);

        const db = getDb();
        const totalRow = db.prepare(`
            SELECT COUNT(*) AS total
            FROM assets
            ${built.whereSql}
        `).get(built.params);

        const rows = db.prepare(`
            SELECT
                id, path, filename, original_name, mime_type, file_size,
                checksum, module, entity_type, entity_id, is_active, created_at
            FROM assets
            ${built.whereSql}
            ORDER BY created_at DESC, id DESC
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

router.post('/', function (req, res, next) {
    try {
        const body = req.body || {};
        const assetPath = String(body.path || '').trim();
        const filename = String(body.filename || '').trim();
        if (!assetPath) return sendError(res, 422, 'VALIDATION_ERROR', 'path is required.');
        if (!filename) return sendError(res, 422, 'VALIDATION_ERROR', 'filename is required.');

        const db = getDb();
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
                        @checksum, @module, @entity_type, @entity_id, 1, @created_at
                    )
            `).run({
                path: assetPath,
                filename,
                original_name: body.original_name ? String(body.original_name).trim() : '',
                mime_type: body.mime_type ? String(body.mime_type).trim() : '',
                file_size: body.file_size == null || body.file_size === '' ? null : parseInteger(body.file_size, null),
                checksum: body.checksum ? String(body.checksum).trim() : '',
                module: body.module ? String(body.module).trim() : '',
                entity_type: body.entity_type ? String(body.entity_type).trim() : '',
                entity_id: body.entity_id == null || body.entity_id === '' ? null : parseInteger(body.entity_id, null),
                created_at: Date.now()
            });

            return getAsset(db, result.lastInsertRowid);
        });

        res.status(201).json({ ok: true, data: createAsset() });
    } catch (err) {
        if (err && err.code && String(err.code).indexOf('SQLITE_CONSTRAINT') === 0) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'path already exists.');
        }
        next(err);
    }
});

router.delete('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const asset = getAsset(db, req.params.id);
        if (!asset || asset.is_active === 0) return sendError(res, 404, 'NOT_FOUND', 'Asset not found.');

        db.prepare('UPDATE assets SET is_active = 0 WHERE id = ?').run(asset.id);
        res.json({ ok: true, data: { id: asset.id, deactivated: true } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
