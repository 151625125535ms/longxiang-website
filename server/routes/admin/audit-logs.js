const express = require('express');
const { getDb } = require('../../lib/db');

const router = express.Router();

function parsePositiveInt(value, defaultValue, maxValue) {
    const parsed = parseInt(value, 10);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    return maxValue ? Math.min(normalized, maxValue) : normalized;
}

function buildQuery(query) {
    const where = [];
    const params = {};
    ['entity_type', 'entity_id', 'action', 'performed_by'].forEach(function (key) {
        const value = String(query[key] || '').trim();
        if (value) {
            where.push(key + ' = @' + key);
            params[key] = value;
        }
    });

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
        const db = getDb();

        const totalRow = db.prepare(`
            SELECT COUNT(*) AS total
            FROM audit_logs
            ${built.whereSql}
        `).get(built.params);

        const rows = db.prepare(`
            SELECT
                id, entity_type, entity_id, action, performed_by,
                request_id, before_json, after_json, ip, user_agent, created_at
            FROM audit_logs
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

module.exports = router;
