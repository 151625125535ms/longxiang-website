const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { getDb } = require('../../lib/db');
const { ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('../../lib/fileStore');
const { normalizeUploadedFilename } = require('../../lib/filenameEncoding');
const { sendError } = require('./helpers');
const assetReferences = require('../../lib/assetReferences');

const router = express.Router();
const uploadDir = resolveUploadDir();
const uploadPublicPath = resolveUploadPublicPath();

const UPLOAD_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf'
};

ensureDirectory(uploadDir);

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            ensureDirectory(uploadDir);
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const ext = UPLOAD_EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase();
            cb(null, 'asset-' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (UPLOAD_EXTENSIONS[file.mimetype]) return cb(null, true);
        cb(new Error('Only jpeg, png, webp, gif images or PDF files are allowed.'));
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

function normalizeBoolean(value, defaultValue) {
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false') return 0;
    return defaultValue;
}

function normalizeAssetPath(value) {
    return String(value || '').trim().replace(/\\/g, '/').replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
}

function normalizeAssetMeta(value, fallback) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return fallback || '';
    return text.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64) || (fallback || '');
}

function fileChecksum(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

    const q = String(query.q || '').trim();
    if (q) {
        where.push('(filename LIKE @q OR original_name LIKE @q OR path LIKE @q)');
        params.q = '%' + q + '%';
    }

    const type = String(query.type || '').trim();
    if (type) {
        if (type !== 'image' && type !== 'file') return { error: 'Invalid type value.' };
        if (type === 'image') {
            where.push("mime_type LIKE 'image/%'");
        } else {
            where.push("(mime_type NOT LIKE 'image/%' OR mime_type IS NULL OR mime_type = '')");
        }
    }

    const usageStatus = String(query.usage_status || '').trim();
    if (usageStatus && usageStatus !== 'used' && usageStatus !== 'unused') {
        return { error: 'Invalid usage_status value.' };
    }

    return {
        whereSql: where.length ? 'WHERE ' + where.join(' AND ') : '',
        params,
        usageStatus
    };
}

function collectJsonPathMatches(value, targetPath, currentPath, matches) {
    if (typeof value === 'string') {
        if (normalizeAssetPath(value) === targetPath) matches.push(currentPath || 'body_json');
        return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            collectJsonPathMatches(item, targetPath, currentPath + '[' + index + ']', matches);
        });
        return;
    }
    Object.keys(value).forEach(function (key) {
        collectJsonPathMatches(value[key], targetPath, currentPath ? currentPath + '.' + key : key, matches);
    });
}

function findAssetUsage(db, assetOrPath) {
    return assetReferences.findAssetUsage(db, assetOrPath);
}

function attachUsage(db, rows) {
    return rows.map(function (row) {
        const usage = findAssetUsage(db, row);
        return {
            ...row,
            usage_count: usage.length,
            usage_status: usage.length ? 'used' : 'unused',
            usage: usage.slice(0, 8)
        };
    });
}

function createUploadAsset(db, file, context) {
    const publicPath = uploadPublicPath + '/' + file.filename;
    const checksum = fileChecksum(file.path);
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
    `).get({ checksum, file_size: file.size || 0, mime_type: file.mimetype || '' }) : null;

    if (duplicate) {
        try { fs.unlinkSync(file.path); } catch (err) {}
        return { ...duplicate, reused: true };
    }

    const originalName = normalizeUploadedFilename(file.originalname);
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
        path: publicPath,
        filename: file.filename,
        original_name: originalName,
        mime_type: file.mimetype || '',
        file_size: file.size || 0,
        checksum,
        module: normalizeAssetMeta(context.module, 'assets'),
        entity_type: normalizeAssetMeta(context.entity_type, ''),
        entity_id: context.entity_id == null || context.entity_id === '' ? null : parseInteger(context.entity_id, null),
        created_at: Date.now()
    });

    return getAsset(db, result.lastInsertRowid);
}

router.get('/', function (req, res, next) {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const pageSize = parsePositiveInt(req.query.pageSize, 20, 100);
        const offset = (page - 1) * pageSize;
        const built = buildQuery(req.query);
        if (built.error) return sendError(res, 422, 'VALIDATION_ERROR', built.error);

        const db = getDb();
        const includeUsage = normalizeBoolean(req.query.include_usage, 0) === 1 || !!built.usageStatus;
        let total = 0;
        let rows = [];

        if (built.usageStatus) {
            const allRows = db.prepare(`
                SELECT
                    id, path, filename, original_name, mime_type, file_size,
                    checksum, module, entity_type, entity_id, is_active, created_at
                FROM assets
                ${built.whereSql}
                ORDER BY created_at DESC, id DESC
            `).all(built.params);
            const rowsWithUsage = attachUsage(db, allRows).filter(function (row) {
                return row.usage_status === built.usageStatus;
            });
            total = rowsWithUsage.length;
            rows = rowsWithUsage.slice(offset, offset + pageSize);
        } else {
            const totalRow = db.prepare(`
                SELECT COUNT(*) AS total
                FROM assets
                ${built.whereSql}
            `).get(built.params);
            total = totalRow ? totalRow.total : 0;
            rows = db.prepare(`
                SELECT
                    id, path, filename, original_name, mime_type, file_size,
                    checksum, module, entity_type, entity_id, is_active, created_at
                FROM assets
                ${built.whereSql}
                ORDER BY created_at DESC, id DESC
                LIMIT @limit OFFSET @offset
            `).all({ ...built.params, limit: pageSize, offset });
            if (includeUsage) rows = attachUsage(db, rows);
        }

        res.json({
            ok: true,
            data: rows,
            meta: { page, pageSize, total }
        });
    } catch (err) {
        next(err);
    }
});

router.post('/upload', function (req, res, next) {
    upload.any()(req, res, function (err) {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'File must be 10MB or smaller.'
                : err.message;
            return sendError(res, 422, 'VALIDATION_ERROR', message);
        }

        const file = req.files && req.files[0];
        if (!file) return sendError(res, 400, 'VALIDATION_ERROR', 'No file uploaded.');

        try {
            const db = getDb();
            const asset = createUploadAsset(db, file, req.body || {});
            res.status(asset.reused ? 200 : 201).json({ ok: true, data: asset, path: asset.path });
        } catch (uploadErr) {
            try { fs.unlinkSync(file.path); } catch (unlinkErr) {}
            next(uploadErr);
        }
    });
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
                original_name: body.original_name ? normalizeUploadedFilename(body.original_name) : '',
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

router.get('/:id/usage', function (req, res, next) {
    try {
        const db = getDb();
        const asset = getAsset(db, req.params.id);
        if (!asset || asset.is_active === 0) return sendError(res, 404, 'NOT_FOUND', 'Asset not found.');
        const usage = findAssetUsage(db, asset);
        res.json({
            ok: true,
            data: {
                asset_id: asset.id,
                path: asset.path,
                usage_count: usage.length,
                usage_status: usage.length ? 'used' : 'unused',
                items: usage
            }
        });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const asset = getAsset(db, req.params.id);
        if (!asset || asset.is_active === 0) return sendError(res, 404, 'NOT_FOUND', 'Asset not found.');
        const usage = findAssetUsage(db, asset);
        const force = normalizeBoolean(req.query.force, 0) === 1;
        if (usage.length && !force) {
            return res.status(409).json({
                ok: false,
                error: {
                    code: 'RESOURCE_IN_USE',
                    message: '该资源正在被 ' + usage.length + ' 个位置使用，请先替换引用后再移出资源库。'
                },
                data: {
                    usage_count: usage.length,
                    usage
                }
            });
        }

        db.prepare('UPDATE assets SET is_active = 0 WHERE id = ?').run(asset.id);
        res.json({ ok: true, data: { id: asset.id, deactivated: true, usage_count: usage.length } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
