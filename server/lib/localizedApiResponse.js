'use strict';

const crypto = require('crypto');
const { loadLocaleRegistry, normalizeCode } = require('./localeRegistry');

function resolveRequestedLocale(req, registryValue) {
    if (!Object.prototype.hasOwnProperty.call(req.query || {}, 'locale')) return { mode: 'legacy' };
    const registry = registryValue || loadLocaleRegistry();
    const rawLocale = Array.isArray(req.query.locale) ? req.query.locale[0] : req.query.locale;
    const locale = normalizeCode(rawLocale);
    const entry = registry.get(locale);
    if (!locale || !entry) {
        return {
            error: {
                status: 400,
                body: { ok: false, error: { code: 'INVALID_LOCALE', message: 'Unsupported locale.' } }
            }
        };
    }
    if (!entry.isPublic) {
        return {
            error: {
                status: 404,
                body: { ok: false, error: { code: 'LOCALE_NOT_AVAILABLE', message: 'Locale is not publicly available.' } }
            }
        };
    }
    return { mode: 'localized', locale: entry.code, entry, registry };
}

function sendLocalizedJson(req, res, body) {
    const payload = JSON.stringify(body);
    const etag = '"' + crypto.createHash('sha256').update(payload).digest('base64url') + '"';
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('ETag', etag);
    res.vary('Accept-Encoding');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.type('application/json').send(payload);
}

function localizedEnvelope(data, locale, fallbackLocale) {
    const values = Array.isArray(data) ? data : [data];
    const fallbackCount = values.filter(function (item) {
        return item && item.localization && item.localization.fallbackApplied;
    }).length;
    return {
        ok: true,
        data,
        meta: {
            locale,
            fallbackLocale: fallbackLocale || null,
            fallbackCount,
            total: Array.isArray(data) ? data.length : (data ? 1 : 0)
        }
    };
}

function isRevisionSourceNotReady(error) {
    return Boolean(error && (error.code === 'REVISION_SOURCE_NOT_READY'
        || (error.name === 'RevisionContentError' && Number(error.status) === 503)));
}

function sendRevisionSourceNotReady(res, error, context) {
    if (!isRevisionSourceNotReady(error)) return false;
    console.error('Public revision source is not ready.', {
        context: context || null,
        cause: error.code || error.name || 'REVISION_READ_FAILED',
        details: error.details || null
    });
    res.status(503).json({
        ok: false,
        error: {
            code: 'REVISION_SOURCE_NOT_READY',
            message: 'Published revision content is not ready.'
        }
    });
    return true;
}

module.exports = {
    resolveRequestedLocale,
    sendLocalizedJson,
    localizedEnvelope,
    isRevisionSourceNotReady,
    sendRevisionSourceNotReady
};
