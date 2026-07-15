'use strict';

const { loadLocaleRegistry } = require('../../lib/localeRegistry');
const { createTranslationWriter } = require('../../lib/translationWriter');
const { getClientIp } = require('./helpers');

function requestActor(req) {
    return {
        username: req.user && req.user.username ? req.user.username : 'admin',
        requestId: req.headers['x-request-id'] ? String(req.headers['x-request-id']) : '',
        ip: getClientIp(req),
        userAgent: String(req.headers['user-agent'] || '')
    };
}

function syncLegacyTranslations(db, req, entityType, entityId) {
    return createTranslationWriter({ db, registry: loadLocaleRegistry() }).publishLegacyWrite({
        entityType,
        entityId,
        actor: requestActor(req)
    });
}

module.exports = { requestActor, syncLegacyTranslations };
