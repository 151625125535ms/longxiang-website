const express = require('express');
const { getDb, isUseSqlite } = require('../../lib/db');

const router = express.Router();

function countTable(db, tableName) {
    const row = db.prepare('SELECT COUNT(*) AS total FROM ' + tableName).get();
    return row ? row.total : 0;
}

router.get('/status', function (req, res, next) {
    try {
        const db = getDb();
        const schemaRow = db
            .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
            .get();

        res.json({
            ok: true,
            data: {
                sqlite: {
                    enabled: isUseSqlite(),
                    available: true,
                    schemaVersion: schemaRow ? schemaRow.version : null
                },
                publicApiSource: isUseSqlite() ? 'sqlite' : 'json',
                counts: {
                    products: countTable(db, 'products'),
                    certifications: countTable(db, 'certifications'),
                    inquiries: countTable(db, 'inquiries'),
                    contentBlocks: countTable(db, 'content_blocks'),
                    assets: countTable(db, 'assets')
                },
                env: {
                    nodeEnv: process.env.NODE_ENV || 'development',
                    port: process.env.PORT || 3000
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
