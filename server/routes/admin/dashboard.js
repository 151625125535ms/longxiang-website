const express = require('express');
const { getDb } = require('../../lib/db');

const router = express.Router();

function getCount(db, sql, params) {
    const row = db.prepare(sql).get(params || {});
    return row ? row.total : 0;
}

router.get('/', function (req, res, next) {
    try {
        const db = getDb();

        const recentInquiries = db.prepare(`
            SELECT id, name, email, subject, status, created_at
            FROM inquiries
            WHERE status != 'deleted'
            ORDER BY created_at DESC, id DESC
            LIMIT 5
        `).all();

        res.json({
            ok: true,
            data: {
                products: {
                    total: getCount(db, 'SELECT COUNT(*) AS total FROM products'),
                    published: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'published'"),
                    draft: getCount(db, "SELECT COUNT(*) AS total FROM products WHERE status = 'draft'")
                },
                certifications: {
                    total: getCount(db, 'SELECT COUNT(*) AS total FROM certifications')
                },
                inquiries: {
                    total: getCount(db, "SELECT COUNT(*) AS total FROM inquiries WHERE status != 'deleted'"),
                    new: getCount(db, "SELECT COUNT(*) AS total FROM inquiries WHERE status = 'new'"),
                    unread: getCount(db, "SELECT COUNT(*) AS total FROM inquiries WHERE is_read = 0 AND status != 'deleted'")
                },
                contentBlocks: {
                    total: getCount(db, 'SELECT COUNT(*) AS total FROM content_blocks')
                },
                recentInquiries
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
