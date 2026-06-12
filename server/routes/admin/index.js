const express = require('express');
const { authMiddleware } = require('../../middleware/auth');
const { getDb } = require('../../lib/db');
const { sendError } = require('./helpers');

const dashboardRoutes = require('./dashboard');
const systemRoutes = require('./system');
const categoriesRoutes = require('./categories');
const productsRoutes = require('./products');
const certificationsRoutes = require('./certifications');
const contentBlocksRoutes = require('./content-blocks');
const inquiriesAdminRoutes = require('./inquiries');
const settingsRoutes = require('./settings');
const auditLogsRoutes = require('./audit-logs');
const assetsRoutes = require('./assets');

const router = express.Router();

router.use(authMiddleware);

router.use(function requireSqlite(req, res, next) {
    try {
        getDb().prepare('SELECT 1').get();
        next();
    } catch (err) {
        sendError(res, 503, 'DATABASE_UNAVAILABLE', 'SQLite database is unavailable.');
    }
});

router.use('/dashboard', dashboardRoutes);
router.use('/products', productsRoutes);
router.use('/certifications', certificationsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/content-blocks', contentBlocksRoutes);
router.use('/inquiries', inquiriesAdminRoutes);
router.use('/assets', assetsRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/system', systemRoutes);

router.use(function (req, res) {
    sendError(res, 404, 'NOT_FOUND', 'Admin API endpoint not found.');
});

router.use(function (err, req, res, next) {
    if (res.headersSent) return next(err);

    if (err && (err.code === 'SQLITE_CANTOPEN' || err.code === 'SQLITE_NOTADB' || err.code === 'SQLITE_ERROR')) {
        return sendError(res, 503, 'DATABASE_UNAVAILABLE', 'SQLite database is unavailable.');
    }

    return sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error.');
});

module.exports = router;
