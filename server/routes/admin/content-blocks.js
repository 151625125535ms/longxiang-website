const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');
const { syncContentBlockAssetReferences } = require('../../lib/assetReferences');
const { updateContentBlock, ContentBlockLifecycleError } = require('../../lib/contentBlockLifecycle');
const { requestActor } = require('./translation-compat');

const router = express.Router();
const BATCH_ACTIONS = ['publish', 'unpublish'];
const STATUSES = ['published', 'draft'];
const CONTENT_BLOCK_SLUGS = [
    'home',
    'solutions',
    'company-identity',
    'company-overview',
    'about-us',
    'contact',
    'product-pages',
    'global-shell',
    'certifications',
    'compare',
    'not-found',
    'applications',
    'innovation',
    'education',
    'page-blocks'
];
const SCHEMAS = {
    home: { hero: 'object', proof: 'array', products: 'object', applications: 'object', news: 'object', trust: 'object', features: 'array', stats: 'array', cta: 'object', seo: 'object' },
    solutions: { hero: 'object', anchors: 'array', overview: 'object', marketFit: 'object', sections: 'array', scenarios: 'object', credentials: 'object', cta: 'object', seo: 'object' },
    'company-identity': {},
    'company-overview': { stats: 'array', seo: 'object' },
    'contact': { hero: 'object', contactPage: 'object', mapLocations: 'object', seo: 'object' },
    'about-us': { hero: 'object', snapshot: 'object', values: 'array', quality: 'object', history: 'object', sections: 'array', milestones: 'array', capability: 'object', factory: 'object', markets: 'object', cta: 'object', seo: 'object' },
    'product-pages': { productsHero: 'object', detailHero: 'object', detailLabels: 'object', notFound: 'object', listingSupport: 'object', listingCta: 'object', detailSupport: 'object', detailFaq: 'array', inquiryForm: 'object', seo: 'object', detailSeo: 'object' },
    'global-shell': { navigation: 'object', footer: 'object', inquiry: 'object', cookieConsent: 'object', embedConsent: 'object', seoDefaults: 'object' },
    'certifications': { hero: 'object', intro: 'object', stats: 'array', toolbar: 'object', seo: 'object' },
    'compare': { hero: 'object', toolbar: 'object', emptyState: 'object', table: 'object', seo: 'object' },
    'not-found': { panel: 'object', seo: 'object' },
    'applications': { hero: 'object', industries: 'array', seo: 'object' },
    'innovation': { hero: 'object', sections: 'array', highlights: 'array', related_certification_ids: 'array', seo: 'object' },
    education: { hero: 'object', stats: 'array', intro: 'object', sections: 'array', cta: 'object', seo: 'object' },
    'page-blocks': { blocks: 'array' }
};

function parsePositiveInt(value, defaultValue, maxValue) {
    const parsed = parseInt(value, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    return maxValue ? Math.min(normalized, maxValue) : normalized;
}

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

function isValidSlug(slug) {
    return CONTENT_BLOCK_SLUGS.indexOf(String(slug || '').trim()) !== -1;
}

function normalizeStatus(value, defaultValue) {
    const status = String(value || '').trim();
    if (!status) return defaultValue;
    return STATUSES.indexOf(status) !== -1 ? status : null;
}

function validateBodyJson(slug, bodyJson) {
    const schema = SCHEMAS[slug];
    const errors = [];
    if (!schema) return ['Unknown content block slug.'];
    if (!isPlainObject(bodyJson)) return ['body_json must be an object.'];

    Object.keys(schema).forEach(function (key) {
        const expected = schema[key];
        const value = bodyJson[key];
        if (value == null) return;
        if (expected === 'array' && !Array.isArray(value)) {
            errors.push(key + ' must be an array.');
        }
        if (expected === 'object' && !isPlainObject(value)) {
            errors.push(key + ' must be an object.');
        }
    });

    if (slug === 'education' && bodyJson.hero) {
        ['title_en', 'title_ar', 'subtitle_en', 'subtitle_ar'].forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(bodyJson.hero, key)) {
                errors.push('education must keep legacy hero fields.');
            }
        });
    }

    return errors;
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
        const page = parsePositiveInt(req.query.page, 1);
        const pageSize = parsePositiveInt(req.query.pageSize, 20, 100);
        const offset = (page - 1) * pageSize;
        const where = [];
        const params = {};

        const status = String(req.query.status || '').trim();
        if (status) {
            if (STATUSES.indexOf(status) === -1) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');
            where.push('status = @status');
            params.status = status;
        }

        const slug = String(req.query.slug || '').trim();
        if (slug) {
            if (!isValidSlug(slug)) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid content block slug.');
            where.push('slug = @slug');
            params.slug = slug;
        }

        const q = String(req.query.q || '').trim();
        if (q) {
            where.push('(slug LIKE @q OR title_en LIKE @q OR title_ar LIKE @q)');
            params.q = '%' + q + '%';
        }

        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const db = getDb();
        const totalRow = db.prepare(`
            SELECT COUNT(*) AS total
            FROM content_blocks
            ${whereSql}
        `).get(params);

        const rows = db.prepare(`
            SELECT id, slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at
            FROM content_blocks
            ${whereSql}
            ORDER BY sort_order, id
            LIMIT @limit OFFSET @offset
        `).all({ ...params, limit: pageSize, offset }).map(normalizeRow);

        res.json({
            ok: true,
            data: rows,
            meta: { page, pageSize, total: totalRow ? totalRow.total : 0 }
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:slug', function (req, res, next) {
    try {
        if (!isValidSlug(req.params.slug)) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');
        const block = getContentBlockBySlug(getDb(), req.params.slug);
        if (!block) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');
        res.json({ ok: true, data: block });
    } catch (err) {
        next(err);
    }
});

router.put('/:slug', function (req, res, next) {
    try {
        if (!isValidSlug(req.params.slug)) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');
        const body = req.body || {};
        if (body.version == null) return sendError(res, 422, 'VALIDATION_ERROR', 'version is required.');
        if (body.body_json !== undefined && !isPlainObject(body.body_json)) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'body_json must be an object.');
        }
        const status = normalizeStatus(body.status, null);
        if (body.status != null && !status) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');

        const db = getDb();
        const before = getContentBlockBySlug(db, req.params.slug);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Content block not found.');

        const requestVersion = parseInt(body.version, 10);
        if (!Number.isFinite(requestVersion) || requestVersion !== before.version) {
            return sendError(res, 409, 'VERSION_CONFLICT', 'Content block version conflict.');
        }

        const nextBodyJson = body.body_json === undefined ? before.body_json : body.body_json;
        let incomingBodyJson = nextBodyJson;
        if (before.body_json.extra !== undefined && incomingBodyJson.extra === undefined) {
            incomingBodyJson = { ...incomingBodyJson, extra: before.body_json.extra };
        }

        const schemaErrors = validateBodyJson(before.slug, incomingBodyJson);
        if (schemaErrors.length) return sendError(res, 422, 'VALIDATION_ERROR', schemaErrors.join(' '));

        if (before.slug === 'page-blocks' && body.body_json !== undefined) {
            const blocks = incomingBodyJson.blocks;
            if (Array.isArray(blocks)) {
                const reservedKeys = ['footer', 'home-cta'];
                const missingKey = reservedKeys.find(function (key) {
                    return !blocks.some(function (block) {
                        return block && block.key === key;
                    });
                });
                if (missingKey) {
                    return sendError(res, 422, 'VALIDATION_ERROR', 'Block key "' + missingKey + '" is required and cannot be removed.');
                }
            }
        }

        const result = updateContentBlock({
            db,
            contentBlockId: before.id,
            expectedVersion: before.version,
            actor: requestActor(req),
            next: {
                title_en: body.title_en == null ? before.title_en : String(body.title_en).trim(),
                title_ar: body.title_ar == null ? before.title_ar : String(body.title_ar).trim(),
                body_json: incomingBodyJson,
                status: status || before.status
            },
            afterWrite: function (change) {
                const after = getContentBlockById(db, change.after.id);
                syncContentBlockAssetReferences(db, after.id);
                insertAuditLog(db, req, 'content_block', before.id, 'update', before, after);
            }
        });
        res.json({ ok: true, data: normalizeRow(result.after) });
    } catch (err) {
        if (err instanceof ContentBlockLifecycleError) {
            return sendError(res, err.status, err.code, err.message);
        }
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
            beforeRows.forEach(function (before) {
                updateContentBlock({
                    db,
                    contentBlockId: before.id,
                    expectedVersion: before.version,
                    actor: requestActor(req),
                    next: { status: nextStatus },
                    afterWrite: function (change) {
                        const after = getContentBlockById(db, change.after.id);
                        syncContentBlockAssetReferences(db, after.id);
                        insertAuditLog(db, req, 'content_block', before.id, action, before, after);
                    }
                });
            });
        });

        try {
            runBatch.immediate();
        } catch (err) {
            if (err instanceof ContentBlockLifecycleError) {
                return sendError(res, err.status, err.code, err.message);
            }
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
