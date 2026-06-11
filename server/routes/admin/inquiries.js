const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const STATUSES = ['new', 'read', 'replied', 'closed', 'deleted'];
const STATUS_PRIORITY = { new: 0, read: 1, replied: 2, closed: 3, deleted: 4 };
const BATCH_ACTIONS = ['mark_read', 'close', 'soft_delete'];

function parsePositiveInt(value, defaultValue, maxValue) {
    const parsed = parseInt(value, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    return maxValue ? Math.min(normalized, maxValue) : normalized;
}

function normalizeBool(value, defaultValue) {
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false') return 0;
    return defaultValue;
}

function getInquiry(db, id) {
    return db.prepare(`
        SELECT
            id, legacy_id, name, email, company, phone, subject, message,
            product_context, status, is_read, notes, ip, user_agent,
            replied_at, deleted_at, created_at, updated_at
        FROM inquiries
        WHERE id = ?
    `).get(id);
}

function buildListQuery(query) {
    const where = [];
    const params = {};
    const status = String(query.status || '').trim();

    if (status) {
        if (STATUSES.indexOf(status) === -1) return { error: 'Invalid status.' };
        where.push('status = @status');
        params.status = status;
    } else {
        where.push("status != 'deleted'");
    }

    const unread = String(query.unread || '').trim();
    if (unread === 'true') {
        where.push('is_read = 0');
        where.push("status != 'deleted'");
    }

    const q = String(query.q || '').trim();
    if (q) {
        where.push('(name LIKE @q OR email LIKE @q OR subject LIKE @q)');
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
            FROM inquiries
            ${built.whereSql}
        `).get(built.params);

        const rows = db.prepare(`
            SELECT
                id, legacy_id, name, email, company, phone, subject,
                product_context, status, is_read, notes, ip, created_at, updated_at
            FROM inquiries
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

router.get('/:id', function (req, res, next) {
    try {
        const inquiry = getInquiry(getDb(), req.params.id);
        if (!inquiry) return sendError(res, 404, 'NOT_FOUND', 'Inquiry not found.');
        res.json({ ok: true, data: inquiry });
    } catch (err) {
        next(err);
    }
});

router.put('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const before = getInquiry(db, req.params.id);
        if (!before) return sendError(res, 404, 'NOT_FOUND', 'Inquiry not found.');
        if (before.status === 'deleted') return sendError(res, 422, 'VALIDATION_ERROR', 'Deleted inquiry cannot be modified.');

        const body = req.body || {};
        const nextStatus = body.status == null ? before.status : String(body.status).trim();
        if (STATUSES.indexOf(nextStatus) === -1) return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid status.');
        if (STATUS_PRIORITY[nextStatus] < STATUS_PRIORITY[before.status]) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Inquiry status cannot be downgraded.');
        }

        const updateInquiry = db.transaction(function () {
            const now = Date.now();
            const repliedAt = nextStatus === 'replied' && !before.replied_at ? now : before.replied_at;

            db.prepare(`
                UPDATE inquiries
                SET
                    status = @status,
                    is_read = @is_read,
                    notes = @notes,
                    replied_at = @replied_at,
                    updated_at = @updated_at
                WHERE id = @id
            `).run({
                id: before.id,
                status: nextStatus,
                is_read: body.is_read == null ? before.is_read : normalizeBool(body.is_read, before.is_read),
                notes: body.notes == null ? before.notes : String(body.notes),
                replied_at: repliedAt,
                updated_at: now
            });

            const after = getInquiry(db, before.id);
            insertAuditLog(db, req, 'inquiry', before.id, 'update', before, after);
            return after;
        });

        res.json({ ok: true, data: updateInquiry() });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', function (req, res, next) {
    try {
        const db = getDb();
        const before = getInquiry(db, req.params.id);
        if (!before || before.status === 'deleted') return sendError(res, 404, 'NOT_FOUND', 'Inquiry not found.');

        const softDelete = db.transaction(function () {
            const now = Date.now();
            db.prepare(`
                UPDATE inquiries
                SET status = 'deleted', deleted_at = @deleted_at, updated_at = @updated_at
                WHERE id = @id
            `).run({ id: before.id, deleted_at: now, updated_at: now });

            const after = getInquiry(db, before.id);
            insertAuditLog(db, req, 'inquiry', before.id, 'soft_delete', before, after);
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

        if (BATCH_ACTIONS.indexOf(action) === -1) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid batch action.');
        }
        if (!ids.length || ids.some(id => !Number.isFinite(id))) {
            return sendError(res, 422, 'VALIDATION_ERROR', 'ids must be a non-empty array.');
        }

        const uniqueIds = Array.from(new Set(ids));
        const db = getDb();
        const runBatch = db.transaction(function () {
            let affected = 0;
            const now = Date.now();

            uniqueIds.forEach(function (id) {
                const before = getInquiry(db, id);
                if (!before) return;
                if (action !== 'soft_delete' && before.status === 'deleted') return;

                if (action === 'mark_read') {
                    db.prepare(`
                        UPDATE inquiries
                        SET is_read = 1, updated_at = ?
                        WHERE id = ? AND status != 'deleted'
                    `).run(now, id);
                } else if (action === 'close') {
                    db.prepare(`
                        UPDATE inquiries
                        SET status = 'closed', updated_at = ?
                        WHERE id = ? AND status != 'deleted'
                    `).run(now, id);
                } else {
                    db.prepare(`
                        UPDATE inquiries
                        SET status = 'deleted', deleted_at = ?, updated_at = ?
                        WHERE id = ?
                    `).run(now, now, id);
                }

                const after = getInquiry(db, id);
                insertAuditLog(db, req, 'inquiry', id, action, before, after);
                affected += 1;
            });

            return affected;
        });

        let affected = 0;
        try {
            affected = runBatch();
        } catch (err) {
            return res.status(409).json({
                ok: false,
                error: { code: 'BATCH_FAILED', message: 'Batch operation failed.' }
            });
        }

        res.json({ ok: true, data: { action, affected } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
