const express = require('express');
const { getDb } = require('../../lib/db');
const { sendError, insertAuditLog } = require('./helpers');

const router = express.Router();
const MENU_VISIBILITY_KEYS = ['dashboard', 'products', 'visual', 'certifications', 'inquiries', 'assets', 'settings'];
const LEGACY_MODULE_KEYS = ['website', 'content'];
const MODULE_KEYS = MENU_VISIBILITY_KEYS.concat(LEGACY_MODULE_KEYS);
const PROTECTED_MENU_KEYS = new Set(['dashboard', 'settings']);

function defaultModules() {
    return MENU_VISIBILITY_KEYS.reduce(function (result, key) {
        result[key] = true;
        return result;
    }, {});
}

function parseModules(value) {
    try {
        const parsed = JSON.parse(value || '{}');
        const merged = { ...defaultModules(), ...parsed };
        if (
            !Object.prototype.hasOwnProperty.call(parsed, 'visual') &&
            Object.prototype.hasOwnProperty.call(parsed, 'content')
        ) {
            merged.visual = parsed.content !== false;
        }
        for (const key of PROTECTED_MENU_KEYS) {
            merged[key] = true;
        }
        return merged;
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
                if (normalized === null) {
                    return sendError(res, 422, 'VALIDATION_ERROR', 'Invalid boolean value for ' + key + '.');
                }
                after[key] = normalized;
            }
        }
        if (!Object.prototype.hasOwnProperty.call(body, 'visual') && Object.prototype.hasOwnProperty.call(body, 'content')) {
            after.visual = after.content !== false;
        }
        for (const key of PROTECTED_MENU_KEYS) {
            after[key] = true;
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
