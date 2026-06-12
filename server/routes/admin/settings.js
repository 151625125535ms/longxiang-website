const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const MODULE_KEYS = ['dashboard', 'website', 'products', 'content', 'certifications', 'inquiries', 'assets', 'settings'];

function defaultModules() {
    return MODULE_KEYS.reduce(function (result, key) {
        result[key] = true;
        return result;
    }, {});
}

function parseModules(value) {
    try {
        const parsed = JSON.parse(value || '{}');
        return { ...defaultModules(), ...parsed };
    } catch (err) {
        return defaultModules();
    }
}

function readModules(db) {
    const row = db.prepare("SELECT value_json FROM admin_settings WHERE key = 'modules'").get();
    return row ? parseModules(row.value_json) : defaultModules();
}

function normalizeBoolean(value) {
    if (value === true || value === 1 || value === '1' || value === 'true') return true;
    if (value === false || value === 0 || value === '0' || value === 'false') return false;
    return null;
}

router.get('/modules', function (req, res, next) {
    try {
        res.json({ ok: true, data: readModules(getDb()) });
    } catch (err) {
        next(err);
    }
});

router.put('/modules', function (req, res, next) {
    try {
        const body = req.body || {};
        const db = getDb();
        const before = readModules(db);
        const after = { ...before };

        for (const key of MODULE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(body, key)) {
                const normalized = normalizeBoolean(body[key]);
                if (normalized == null) {
                    return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid boolean value for ' + key + '.');
                }
                after[key] = normalized;
            }
        }

        const updateModules = db.transaction(function () {
            db.prepare(`
                INSERT OR REPLACE INTO admin_settings (key, value_json, updated_at)
                VALUES ('modules', @value_json, @updated_at)
            `).run({
                value_json: JSON.stringify(after),
                updated_at: Date.now()
            });

            insertAuditLog(db, req, 'settings', 'modules', 'update', before, after);
            return after;
        });

        res.json({ ok: true, data: updateModules() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
