'use strict';

const express = require('express');
const { getDb } = require('../../lib/db');
const { loadLocaleRegistry } = require('../../lib/localeRegistry');
const { createTranslationWriter, TranslationError } = require('../../lib/translationWriter');
const { sendError } = require('./helpers');
const { requestActor } = require('./translation-compat');

const router = express.Router();
const ENTITY_TYPES = ['product', 'category', 'certification', 'content_block'];

function writer() {
    const registry = loadLocaleRegistry();
    return { registry, writer: createTranslationWriter({ db: getDb(), registry }) };
}

function routeError(res, next, error) {
    if (error instanceof TranslationError) {
        return sendError(res, error.status, error.code, error.message);
    }
    return next(error);
}

function validEntityType(value) {
    return ENTITY_TYPES.indexOf(String(value || '').trim()) !== -1;
}

router.get('/locales', function (req, res, next) {
    try {
        const registry = loadLocaleRegistry();
        res.json({
            ok: true,
            data: registry.entries.map(function (entry) {
                return {
                    code: entry.code,
                    label: entry.label,
                    nativeLabel: entry.nativeLabel,
                    dir: entry.dir,
                    state: entry.state,
                    isPublic: entry.isPublic,
                    canEdit: true
                };
            })
        });
    } catch (error) {
        next(error);
    }
});

router.get('/entities', function (req, res, next) {
    try {
        const entityType = String(req.query.type || '').trim();
        if (!validEntityType(entityType)) return sendError(res, 422, 'INVALID_ENTITY_TYPE', 'Unsupported translation entity type.');
        const q = String(req.query.q || '').trim().toLowerCase();
        const state = writer().writer;
        const items = state.listEntities({ entityType }).filter(function (item) {
            return !q || String(item.label || '').toLowerCase().indexOf(q) !== -1 || String(item.id).indexOf(q) !== -1;
        });
        res.json({ ok: true, data: { items, schema: state.getEntitySchema(entityType) } });
    } catch (error) {
        routeError(res, next, error);
    }
});

router.get('/:entityType/:entityId/:locale', function (req, res, next) {
    try {
        if (!validEntityType(req.params.entityType)) return sendError(res, 422, 'INVALID_ENTITY_TYPE', 'Unsupported translation entity type.');
        const data = writer().writer.getState({
            entityType: req.params.entityType,
            entityId: req.params.entityId,
            locale: req.params.locale
        });
        res.json({ ok: true, data });
    } catch (error) {
        routeError(res, next, error);
    }
});

router.put('/:entityType/:entityId/:locale', function (req, res, next) {
    try {
        if (!validEntityType(req.params.entityType)) return sendError(res, 422, 'INVALID_ENTITY_TYPE', 'Unsupported translation entity type.');
        const body = req.body || {};
        const data = writer().writer.saveDraft({
            entityType: req.params.entityType,
            entityId: req.params.entityId,
            locale: req.params.locale,
            expectedVersion: body.version,
            values: body.values || {},
            specValues: body.specValues,
            actor: requestActor(req)
        });
        res.json({ ok: true, data });
    } catch (error) {
        routeError(res, next, error);
    }
});

router.post('/:entityType/:entityId/:locale/publish', function (req, res, next) {
    try {
        if (!validEntityType(req.params.entityType)) return sendError(res, 422, 'INVALID_ENTITY_TYPE', 'Unsupported translation entity type.');
        const body = req.body || {};
        const data = writer().writer.publishDraft({
            entityType: req.params.entityType,
            entityId: req.params.entityId,
            locale: req.params.locale,
            expectedDraftVersion: body.draftVersion,
            expectedPublishedRevisionId: body.publishedRevisionId,
            actor: requestActor(req)
        });
        res.json({ ok: true, data });
    } catch (error) {
        routeError(res, next, error);
    }
});

router.post('/:entityType/:entityId/:locale/restore', function (req, res, next) {
    try {
        if (!validEntityType(req.params.entityType)) return sendError(res, 422, 'INVALID_ENTITY_TYPE', 'Unsupported translation entity type.');
        const body = req.body || {};
        const data = writer().writer.restoreRevision({
            entityType: req.params.entityType,
            entityId: req.params.entityId,
            locale: req.params.locale,
            revisionId: body.revisionId,
            expectedPublishedRevisionId: body.publishedRevisionId,
            actor: requestActor(req)
        });
        res.json({ ok: true, data });
    } catch (error) {
        routeError(res, next, error);
    }
});

router.post('/:entityType/:entityId/:locale/discard', function (req, res, next) {
    try {
        if (!validEntityType(req.params.entityType)) return sendError(res, 422, 'INVALID_ENTITY_TYPE', 'Unsupported translation entity type.');
        const body = req.body || {};
        const data = writer().writer.discardDraft({
            entityType: req.params.entityType,
            entityId: req.params.entityId,
            locale: req.params.locale,
            expectedDraftVersion: body.draftVersion,
            actor: requestActor(req)
        });
        res.json({ ok: true, data });
    } catch (error) {
        routeError(res, next, error);
    }
});

module.exports = router;
