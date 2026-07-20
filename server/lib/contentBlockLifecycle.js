'use strict';

const crypto = require('crypto');
const { loadLocaleRegistry, stableJson } = require('./localeRegistry');
const {
    CONTENT_SCHEMA_VERSION,
    buildContentOverlaySnapshot,
    ensureStableArrayIds,
    structureHash,
    validateOverlay
} = require('./contentTranslationOverlay');
const { compactLocalizedTree } = require('./publicContentBlocks');

class ContentBlockLifecycleError extends Error {
    constructor(code, message, status, details) {
        super(message);
        this.name = 'ContentBlockLifecycleError';
        this.code = code;
        this.status = status || 409;
        this.details = details || null;
    }
}

function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function overlayLifecycleAvailable(db) {
    return tableExists(db, 'content_block_translations') && tableExists(db, 'content_translation_schemas');
}

function overlayLifecycleInitialized(db) {
    if (!overlayLifecycleAvailable(db)) return false;
    return Number(db.prepare('SELECT COUNT(*) AS count FROM content_translation_schemas').get().count) > 0;
}

function immediate(db, callback) {
    if (db.inTransaction) return callback();
    return db.transaction(callback).immediate();
}

function parseObject(value, label) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (error) {}
    throw new ContentBlockLifecycleError('CONTENT_OVERLAY_REBASE_REQUIRED', label + ' must be a JSON object.', 409);
}

function actorName(actor) {
    return String(actor && actor.username || 'admin').trim() || 'admin';
}

function readBlock(db, contentBlockId) {
    const row = db.prepare('SELECT * FROM content_blocks WHERE id = ?').get(Number(contentBlockId));
    if (!row || row.status === 'deleted') {
        throw new ContentBlockLifecycleError('NOT_FOUND', 'Content block not found.', 404);
    }
    return row;
}

function readSchema(db, contentBlockId, contentVersion) {
    return db.prepare(`
        SELECT * FROM content_translation_schemas
        WHERE content_block_id = ? AND content_version = ? AND schema_version = ?
        LIMIT 1
    `).get(contentBlockId, contentVersion, CONTENT_SCHEMA_VERSION) || null;
}

function readPublished(db, contentBlockId) {
    return db.prepare(`
        SELECT * FROM content_block_translations
        WHERE content_block_id = ? AND revision_state = 'published'
        ORDER BY locale
    `).all(contentBlockId);
}

function readDrafts(db, contentBlockId) {
    return db.prepare(`
        SELECT * FROM content_block_translations
        WHERE content_block_id = ? AND revision_state = 'draft'
        ORDER BY locale
    `).all(contentBlockId);
}

function parseSchema(row) {
    if (!row) return null;
    const schema = parseObject(row.schema_json, 'Content translation schema');
    if (Number(row.schema_version) !== CONTENT_SCHEMA_VERSION
        || Number(schema.overlayVersion) < 1
        || !Array.isArray(schema.allowedPaths)
        || !Array.isArray(schema.replacementPaths)) {
        throw new ContentBlockLifecycleError(
            'CONTENT_OVERLAY_REBASE_REQUIRED',
            'The active content translation schema is invalid.',
            409,
            { contentBlockId: Number(row.content_block_id), contentVersion: Number(row.content_version) }
        );
    }
    return schema;
}

function normalizedSchema(snapshot, currentSchema, structureChanged) {
    const schema = { ...snapshot.schema };
    if (!structureChanged && currentSchema) {
        schema.allowedPaths = Array.from(new Set(
            currentSchema.allowedPaths.concat(snapshot.schema.allowedPaths)
        )).sort();
        schema.replacementPaths = Array.from(new Set(
            currentSchema.replacementPaths.concat(snapshot.schema.replacementPaths)
        )).sort();
    }
    return schema;
}

function revisionOverlay(row) {
    return parseObject(row && row.translation_json, 'Content translation overlay');
}

function rebaseOverlay(row, schema) {
    const previous = revisionOverlay(row);
    const allowedPaths = new Set(schema.allowedPaths || []);
    const replacementPaths = new Set(schema.replacementPaths || []);
    const rebased = {
        overlayVersion: previous.overlayVersion,
        values: {},
        replacements: {}
    };
    Object.keys(previous.values || {}).forEach(function (path) {
        if (allowedPaths.has(path)) rebased.values[path] = previous.values[path];
    });
    Object.keys(previous.replacements || {}).forEach(function (path) {
        if (replacementPaths.has(path)) rebased.replacements[path] = previous.replacements[path];
    });
    return validateOverlay(rebased, schema);
}

function mergeLegacyOverlayChanges(currentOverlay, beforeOverlay, nextOverlay, schema) {
    const merged = {
        overlayVersion: currentOverlay.overlayVersion,
        values: { ...(currentOverlay.values || {}) },
        replacements: { ...(currentOverlay.replacements || {}) }
    };
    ['values', 'replacements'].forEach(function (group) {
        const beforeValues = beforeOverlay[group] || {};
        const nextValues = nextOverlay[group] || {};
        const paths = new Set(Object.keys(beforeValues).concat(Object.keys(nextValues)));
        paths.forEach(function (path) {
            if (stableJson(beforeValues[path]) === stableJson(nextValues[path])) return;
            if (Object.prototype.hasOwnProperty.call(nextValues, path)) {
                merged[group][path] = nextValues[path];
            } else {
                delete merged[group][path];
            }
        });
    });
    return validateOverlay(merged, schema);
}

function localizedKeyInfo(keyValue, localeCodes) {
    const key = String(keyValue || '');
    for (let index = 0; index < localeCodes.length; index += 1) {
        const code = localeCodes[index];
        const suffix = code.charAt(0).toUpperCase() + code.slice(1);
        if (key.endsWith('Patch' + suffix)) {
            return { code, base: key.slice(0, -('Patch' + suffix).length), patch: true };
        }
        if (key.endsWith('_patch_' + code)) {
            return { code, base: key.slice(0, -('_patch_' + code).length), patch: true };
        }
        if (key.endsWith('_' + code)) return { code, base: key.slice(0, -(code.length + 1)), patch: false };
        if (key.endsWith(suffix) && key.length > suffix.length) {
            return { code, base: key.slice(0, -suffix.length), patch: false };
        }
    }
    return null;
}

function assignMissingLifecycleArrayIds(bodyValue, slug, localeCodes) {
    const body = JSON.parse(JSON.stringify(bodyValue));

    function visit(value, location, languageBranch) {
        if (Array.isArray(value)) {
            if (!languageBranch) {
                const occupied = new Set(value.map(function (item) {
                    return item && typeof item === 'object' && !Array.isArray(item)
                        ? String(item._translationId || '').trim()
                        : '';
                }).filter(Boolean));
                value.forEach(function (item, index) {
                    if (!item || typeof item !== 'object' || Array.isArray(item) || item._translationId) return;
                    let attempt = 0;
                    let candidate = '';
                    do {
                        candidate = 'item-' + crypto.createHash('sha256').update(stableJson({
                            slug,
                            location,
                            index,
                            attempt,
                            item
                        })).digest('hex').slice(0, 16);
                        attempt += 1;
                    } while (occupied.has(candidate));
                    item._translationId = candidate;
                    occupied.add(candidate);
                });
            }
            value.forEach(function (item, index) {
                visit(item, location + '/' + index, languageBranch);
            });
            return;
        }
        if (!value || typeof value !== 'object') return;
        Object.keys(value).forEach(function (key) {
            visit(value[key], location + '/' + key, languageBranch || Boolean(localizedKeyInfo(key, localeCodes)));
        });
    }

    visit(body, '', false);
    return body;
}

function remapLegacyIndexPatches(beforeBody, requestedBody, localeCodes) {
    const nextBody = JSON.parse(JSON.stringify(requestedBody));

    function stableObjectArray(value) {
        return Array.isArray(value) && value.every(function (item) {
            return item && typeof item === 'object' && !Array.isArray(item) && String(item._translationId || '').trim();
        });
    }

    function remapPatch(patch, beforeItems, nextItems, location) {
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
        const nextIndexById = new Map(nextItems.map(function (item, index) {
            return [String(item._translationId), index];
        }));
        const output = {};
        Object.keys(patch).forEach(function (key) {
            const match = /^index_(\d+)$/i.exec(key);
            if (!match) {
                output[key] = patch[key];
                return;
            }
            const beforeIndex = Number(match[1]);
            const beforeItem = beforeItems[beforeIndex];
            const stableId = beforeItem && String(beforeItem._translationId || '').trim();
            if (!stableId) {
                throw new ContentBlockLifecycleError(
                    'CONTENT_OVERLAY_REBASE_REQUIRED',
                    'A locale index patch cannot be mapped to a stable content item.',
                    409,
                    { path: location, key }
                );
            }
            const nextIndex = nextIndexById.get(stableId);
            if (nextIndex === undefined) return;
            const nextKey = 'index_' + nextIndex;
            if (Object.prototype.hasOwnProperty.call(output, nextKey)) {
                throw new ContentBlockLifecycleError(
                    'CONTENT_OVERLAY_REBASE_REQUIRED',
                    'Locale patch remapping produced a duplicate content target.',
                    409,
                    { path: location, key: nextKey }
                );
            }
            output[nextKey] = patch[key];
        });
        return output;
    }

    function visit(beforeValue, nextValue, location) {
        if (Array.isArray(nextValue)) {
            if (stableObjectArray(beforeValue) && stableObjectArray(nextValue)) {
                const beforeById = new Map(beforeValue.map(function (item) {
                    return [String(item._translationId), item];
                }));
                nextValue.forEach(function (item) {
                    visit(beforeById.get(String(item._translationId)) || {}, item, location + '/@' + item._translationId);
                });
            } else {
                nextValue.forEach(function (item, index) {
                    visit(Array.isArray(beforeValue) ? beforeValue[index] : undefined, item, location + '/' + index);
                });
            }
            return;
        }
        if (!nextValue || typeof nextValue !== 'object') return;
        const beforeObject = beforeValue && typeof beforeValue === 'object' && !Array.isArray(beforeValue) ? beforeValue : {};
        Object.keys(nextValue).forEach(function (key) {
            const info = localizedKeyInfo(key, localeCodes);
            if (!info || !info.patch) return;
            const beforeItems = beforeObject[info.base];
            const nextItems = nextValue[info.base];
            if (stableObjectArray(beforeItems) && stableObjectArray(nextItems)) {
                nextValue[key] = remapPatch(nextValue[key], beforeItems, nextItems, location + '/' + key);
            }
        });
        Object.keys(nextValue).forEach(function (key) {
            const info = localizedKeyInfo(key, localeCodes);
            if (info && info.patch) return;
            visit(beforeObject[key], nextValue[key], location + '/' + key);
        });
    }

    visit(beforeBody, nextBody, '');
    return nextBody;
}

function projectLocalizedSource(value, locale, localeCodes, patchesOnly) {
    if (Array.isArray(value)) {
        const stableItems = value.length && value.every(function (item) {
            return item && typeof item === 'object' && !Array.isArray(item) && String(item._translationId || '').trim();
        });
        if (stableItems) {
            const byId = {};
            value.forEach(function (item) {
                const projected = projectLocalizedSource(item, locale, localeCodes, patchesOnly);
                if (projected !== undefined) byId[String(item._translationId)] = projected;
            });
            return Object.keys(byId).length ? { stableItems: byId } : undefined;
        }
        const items = value.map(function (item) {
            const projected = projectLocalizedSource(item, locale, localeCodes, patchesOnly);
            return projected === undefined ? null : projected;
        });
        return items.some(function (item) { return item !== null; }) ? items : undefined;
    }
    if (!value || typeof value !== 'object') return undefined;
    const output = {};
    Object.keys(value).forEach(function (key) {
        const info = localizedKeyInfo(key, localeCodes);
        if (info) {
            if (info.code === locale && (!patchesOnly || info.patch)) output[key] = value[key];
            return;
        }
        const projected = projectLocalizedSource(value[key], locale, localeCodes, patchesOnly);
        if (projected !== undefined) output[key] = projected;
    });
    return Object.keys(output).length ? output : undefined;
}

function localizedSourceFingerprint(body, locale, localeCodes, patchesOnly) {
    return stableJson(projectLocalizedSource(body, locale, localeCodes, patchesOnly) || null);
}

function assertRevisionMatchesSchema(row, schema) {
    if (!row
        || Number(row.schema_version) !== CONTENT_SCHEMA_VERSION
        || String(row.base_structure_hash || '') !== String(schema.baseStructureHash || '')) {
        throw new ContentBlockLifecycleError(
            'CONTENT_OVERLAY_REBASE_REQUIRED',
            'A content translation revision does not match the active structure.',
            409,
            { revisionId: row ? Number(row.id) : null, locale: row ? row.locale : null }
        );
    }
    try {
        validateOverlay(revisionOverlay(row), schema);
    } catch (error) {
        throw new ContentBlockLifecycleError(
            'CONTENT_OVERLAY_REBASE_REQUIRED',
            'A content translation revision contains paths that are invalid for the active structure.',
            409,
            { revisionId: Number(row.id), locale: row.locale, cause: error.code || 'OVERLAY_VALIDATION_FAILED' }
        );
    }
}

function nextRevisionNo(db, contentBlockId, locale) {
    return Number(db.prepare(`
        SELECT COALESCE(MAX(revision_no), 0) + 1 AS value
        FROM content_block_translations
        WHERE content_block_id = ? AND locale = ?
    `).get(contentBlockId, locale).value);
}

function revisionSnapshot(row) {
    if (!row) return null;
    return {
        id: Number(row.id),
        locale: row.locale,
        revisionNo: Number(row.revision_no),
        state: row.revision_state,
        baseRevisionId: row.base_revision_id == null ? null : Number(row.base_revision_id),
        title: row.title || '',
        schemaVersion: Number(row.schema_version),
        translationJson: parseObject(row.translation_json, 'Content translation overlay'),
        baseStructureHash: row.base_structure_hash || '',
        version: Number(row.version)
    };
}

function insertLifecycleAudit(db, actor, contentBlockId, locale, action, before, after) {
    const actorValue = actor || {};
    db.prepare(`
        INSERT INTO audit_logs
            (entity_type, entity_id, action, performed_by, request_id, before_json, after_json, ip, user_agent, created_at)
        VALUES
            ('translation_content_block', @entity_id, @action, @performed_by, @request_id,
             @before_json, @after_json, @ip, @user_agent, @created_at)
    `).run({
        entity_id: String(contentBlockId) + ':' + locale,
        action,
        performed_by: actorName(actorValue),
        request_id: actorValue.requestId ? String(actorValue.requestId) : null,
        before_json: before ? JSON.stringify(before) : null,
        after_json: after ? JSON.stringify(after) : null,
        ip: String(actorValue.ip || ''),
        user_agent: String(actorValue.userAgent || ''),
        created_at: Date.now()
    });
}

function insertSchema(db, contentBlockId, contentVersion, schema, now) {
    db.prepare(`
        INSERT INTO content_translation_schemas
            (content_block_id, content_version, schema_version, schema_json, structure_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        contentBlockId,
        contentVersion,
        CONTENT_SCHEMA_VERSION,
        stableJson(schema),
        schema.baseStructureHash,
        now
    );
}

function insertPublishedRevision(db, options) {
    const result = db.prepare(`
        INSERT INTO content_block_translations
            (content_block_id, locale, revision_no, revision_state, base_revision_id,
             title, schema_version, translation_json, base_structure_hash, version,
             created_by, updated_by, created_at, updated_at, published_at)
        VALUES
            (@content_block_id, @locale, @revision_no, 'published', @base_revision_id,
             @title, @schema_version, @translation_json, @base_structure_hash, 1,
             @actor, @actor, @now, @now, @now)
    `).run({
        content_block_id: options.contentBlockId,
        locale: options.locale,
        revision_no: nextRevisionNo(db, options.contentBlockId, options.locale),
        base_revision_id: options.baseRevisionId || null,
        title: options.title || '',
        schema_version: CONTENT_SCHEMA_VERSION,
        translation_json: stableJson(options.overlay),
        base_structure_hash: options.structureHash,
        actor: actorName(options.actor),
        now: options.now
    });
    return db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(Number(result.lastInsertRowid));
}

function archiveRevision(db, row, actor, now) {
    if (!row) return;
    const result = db.prepare(`
        UPDATE content_block_translations
        SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
        WHERE id = ? AND revision_state = 'published' AND version = ?
    `).run(actorName(actor), now, row.id, row.version);
    if (result.changes !== 1) {
        throw new ContentBlockLifecycleError('VERSION_CONFLICT', 'Published content translation changed during the write.', 409);
    }
}

function desiredTitle(locale, next, current) {
    if (locale === 'en') return String(next.title_en || '').trim();
    if (locale === 'ar') return String(next.title_ar || '').trim();
    return current ? String(current.title || '') : String(next.title_en || '').trim();
}

function assertSnapshot(snapshot) {
    if (!snapshot.blockers.length) return;
    throw new ContentBlockLifecycleError(
        'CONTENT_OVERLAY_REBASE_REQUIRED',
        'The content structure cannot be mapped to safe translation overlays.',
        409,
        { blockers: snapshot.blockers.slice(0, 50) }
    );
}

function assertPublishedSetReady(db, contentBlockId, schema, locales) {
    const published = new Map(readPublished(db, contentBlockId).map(function (row) {
        return [String(row.locale).toLowerCase(), row];
    }));
    locales.forEach(function (locale) {
        const row = published.get(locale);
        if (!row) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'A published content translation is missing after the write.',
                409,
                { contentBlockId, locale }
            );
        }
        assertRevisionMatchesSchema(row, schema);
    });
}

function updateContentBlock(options) {
    const db = options && options.db;
    if (!db) throw new Error('updateContentBlock requires db');
    const registry = options.registry || loadLocaleRegistry();
    if (!overlayLifecycleAvailable(db)) {
        throw new ContentBlockLifecycleError('CONTENT_OVERLAY_SCHEMA_NOT_READY', 'Content overlay tables are unavailable.', 409);
    }
    return immediate(db, function () {
        const before = readBlock(db, options.contentBlockId);
        if (Number(options.expectedVersion) !== Number(before.version)) {
            throw new ContentBlockLifecycleError('VERSION_CONFLICT', 'Content block version conflict.', 409);
        }
        const requestedBody = options.next && options.next.body_json !== undefined
            ? parseObject(options.next.body_json, 'Content block body')
            : parseObject(before.body_json, 'Content block body');
        const next = {
            title_en: options.next && options.next.title_en !== undefined ? String(options.next.title_en || '').trim() : before.title_en,
            title_ar: options.next && options.next.title_ar !== undefined ? String(options.next.title_ar || '').trim() : before.title_ar,
            body_json: requestedBody,
            status: options.next && options.next.status !== undefined ? options.next.status : before.status
        };
        const nextVersion = Number(before.version) + 1;
        const locales = registry.publicEntries.map(function (entry) { return entry.code; });
        const localeCodes = Array.from(new Set(['en'].concat(
            registry.entries.map(function (entry) { return entry.code; }),
            ['cn']
        )));
        const beforeBody = parseObject(before.body_json, 'Content block body');
        const requestedWithRuntimeIds = assignMissingLifecycleArrayIds(requestedBody, before.slug, localeCodes);
        const preparedRequested = ensureStableArrayIds(requestedWithRuntimeIds, before.slug);
        if (preparedRequested.blockers.length) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'The requested content contains invalid or duplicate stable array IDs.',
                409,
                { blockers: preparedRequested.blockers.slice(0, 50) }
            );
        }
        next.body_json = remapLegacyIndexPatches(beforeBody, preparedRequested.body, localeCodes);
        const beforeSnapshot = buildContentOverlaySnapshot({
            slug: before.slug,
            contentVersion: before.version,
            body: beforeBody,
            locales
        });
        assertSnapshot(beforeSnapshot);
        const snapshot = buildContentOverlaySnapshot({
            slug: before.slug,
            contentVersion: nextVersion,
            body: next.body_json,
            locales
        });
        assertSnapshot(snapshot);

        const currentSchemaRow = readSchema(db, before.id, before.version);
        const currentSchema = parseSchema(currentSchemaRow);
        const publishedRows = readPublished(db, before.id);
        const published = new Map(publishedRows.map(function (row) {
            return [String(row.locale).toLowerCase(), row];
        }));
        const drafts = readDrafts(db, before.id);
        if (!currentSchema) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'The current content version has no active translation schema.',
                409,
                { contentBlockId: Number(before.id), contentVersion: Number(before.version) }
            );
        }
        if (String(beforeSnapshot.schema.baseStructureHash) !== String(currentSchema.baseStructureHash)
            || String(beforeSnapshot.schema.baseStructureHash) !== String(currentSchemaRow.structure_hash)) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'The current content structure does not match its active translation schema.',
                409,
                { contentBlockId: Number(before.id), contentVersion: Number(before.version) }
            );
        }

        const publicSet = new Set(locales);
        locales.forEach(function (locale) {
            const current = published.get(locale);
            if (!current) {
                throw new ContentBlockLifecycleError(
                    'CONTENT_OVERLAY_REBASE_REQUIRED',
                    'A published content translation is missing before the write.',
                    409,
                    { contentBlockId: Number(before.id), locale }
                );
            }
            assertRevisionMatchesSchema(current, currentSchema);
        });
        const nonPublicPublished = publishedRows.filter(function (row) {
            return !publicSet.has(String(row.locale).toLowerCase());
        });
        nonPublicPublished.forEach(function (row) {
            assertRevisionMatchesSchema(row, currentSchema);
        });

        const structureChanged = Boolean(currentSchemaRow)
            && String(currentSchemaRow.structure_hash) !== String(snapshot.schema.baseStructureHash);
        if (structureChanged && drafts.length) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'Discard or publish content translation drafts before changing the content structure.',
                409,
                { drafts: drafts.map(function (row) { return { id: Number(row.id), locale: row.locale }; }) }
            );
        }
        if (structureChanged && nonPublicPublished.length) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'Non-public published translations must be resolved before changing the content structure.',
                409,
                { revisions: nonPublicPublished.map(function (row) { return { id: Number(row.id), locale: row.locale }; }) }
            );
        }

        const schema = normalizedSchema(snapshot, currentSchema, structureChanged);
        const replacements = [];
        locales.forEach(function (locale) {
            const current = published.get(locale);
            const currentOverlay = structureChanged
                ? rebaseOverlay(current, schema)
                : revisionOverlay(current);
            const localizedSourceChanged = localizedSourceFingerprint(beforeBody, locale, localeCodes, false)
                !== localizedSourceFingerprint(preparedRequested.body, locale, localeCodes, false);
            const legacyPatchChanged = localizedSourceFingerprint(beforeBody, locale, localeCodes, true)
                !== localizedSourceFingerprint(preparedRequested.body, locale, localeCodes, true);
            if (structureChanged && legacyPatchChanged) {
                throw new ContentBlockLifecycleError(
                    'CONTENT_OVERLAY_REBASE_REQUIRED',
                    'Locale index patches cannot change in the same write as the base content structure.',
                    409,
                    { contentBlockId: Number(before.id), locale }
                );
            }
            const overlay = localizedSourceChanged
                ? mergeLegacyOverlayChanges(
                    currentOverlay,
                    beforeSnapshot.overlays[locale],
                    snapshot.overlays[locale],
                    schema
                )
                : currentOverlay;
            const title = desiredTitle(locale, next, current);
            const matches = !structureChanged
                && String(current.title || '') === title
                && stableJson(revisionOverlay(current)) === stableJson(overlay);
            if (matches) return;
            const draft = drafts.find(function (row) { return String(row.locale).toLowerCase() === locale; });
            if (draft) {
                throw new ContentBlockLifecycleError(
                    'CONTENT_OVERLAY_REBASE_REQUIRED',
                    'A content translation draft conflicts with the requested base update.',
                    409,
                    { draftId: Number(draft.id), locale }
                );
            }
            replacements.push({ locale, current, title, overlay });
        });
        if (!structureChanged) publishedRows.forEach(function (row) { assertRevisionMatchesSchema(row, schema); });

        const now = Date.now();
        const updated = db.prepare(`
            UPDATE content_blocks
            SET title_en = @title_en, title_ar = @title_ar, body_json = @body_json,
                status = @status, version = @next_version, updated_at = @updated_at
            WHERE id = @id AND version = @expected_version
        `).run({
            id: before.id,
            expected_version: before.version,
            next_version: nextVersion,
            title_en: next.title_en,
            title_ar: next.title_ar,
            body_json: JSON.stringify(snapshot.bodyWithStableIds),
            status: next.status,
            updated_at: now
        });
        if (updated.changes !== 1) {
            throw new ContentBlockLifecycleError('VERSION_CONFLICT', 'Content block changed during the write.', 409);
        }
        insertSchema(db, before.id, nextVersion, schema, now);

        replacements.forEach(function (replacement) {
            const beforeRevision = revisionSnapshot(replacement.current);
            archiveRevision(db, replacement.current, options.actor, now);
            const afterRevision = insertPublishedRevision(db, {
                contentBlockId: before.id,
                locale: replacement.locale,
                baseRevisionId: replacement.current && replacement.current.id,
                title: replacement.title,
                overlay: replacement.overlay,
                structureHash: schema.baseStructureHash,
                actor: options.actor,
                now
            });
            insertLifecycleAudit(
                db,
                options.actor,
                before.id,
                replacement.locale,
                structureChanged ? 'lifecycle_rebase' : 'lifecycle_publish',
                beforeRevision,
                revisionSnapshot(afterRevision)
            );
        });

        assertPublishedSetReady(db, before.id, schema, locales);
        const after = readBlock(db, before.id);
        if (typeof options.afterWrite === 'function') {
            options.afterWrite({ before, after, schema, structureChanged, replacements });
        }
        return { before, after, schema, structureChanged, replacements };
    });
}

function createContentBlock(options) {
    const db = options && options.db;
    if (!db) throw new Error('createContentBlock requires db');
    const registry = options.registry || loadLocaleRegistry();
    if (!overlayLifecycleAvailable(db)) {
        throw new ContentBlockLifecycleError('CONTENT_OVERLAY_SCHEMA_NOT_READY', 'Content overlay tables are unavailable.', 409);
    }
    return immediate(db, function () {
        const seed = options.seed || {};
        const locales = registry.publicEntries.map(function (entry) { return entry.code; });
        const snapshot = buildContentOverlaySnapshot({
            slug: seed.slug,
            contentVersion: 1,
            body: parseObject(seed.body_json || {}, 'Content block body'),
            locales
        });
        assertSnapshot(snapshot);
        const now = Date.now();
        const inserted = db.prepare(`
            INSERT INTO content_blocks
                (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
            VALUES
                (@slug, @title_en, @title_ar, @body_json, @status, @sort_order, 1, @created_at, @updated_at)
        `).run({
            slug: String(seed.slug || '').trim(),
            title_en: String(seed.title_en || '').trim(),
            title_ar: String(seed.title_ar || '').trim(),
            body_json: JSON.stringify(snapshot.bodyWithStableIds),
            status: seed.status || 'published',
            sort_order: Number(seed.sort_order || 0),
            created_at: now,
            updated_at: now
        });
        const contentBlockId = Number(inserted.lastInsertRowid);
        insertSchema(db, contentBlockId, 1, snapshot.schema, now);
        locales.forEach(function (locale) {
            const revision = insertPublishedRevision(db, {
                contentBlockId,
                locale,
                baseRevisionId: null,
                title: locale === 'ar' ? String(seed.title_ar || seed.title_en || '') : String(seed.title_en || ''),
                overlay: snapshot.overlays[locale],
                structureHash: snapshot.schema.baseStructureHash,
                actor: options.actor,
                now
            });
            insertLifecycleAudit(db, options.actor, contentBlockId, locale, 'lifecycle_seed', null, revisionSnapshot(revision));
        });
        assertPublishedSetReady(db, contentBlockId, snapshot.schema, locales);
        const after = readBlock(db, contentBlockId);
        if (typeof options.afterWrite === 'function') options.afterWrite({ before: null, after, schema: snapshot.schema });
        return { before: null, after, schema: snapshot.schema, replacements: locales };
    });
}

function validateContentBlockRevision(options) {
    const db = options && options.db;
    if (!db) throw new Error('validateContentBlockRevision requires db');
    if (!overlayLifecycleAvailable(db)) return null;
    const block = readBlock(db, options.contentBlockId);
    const schemaRow = readSchema(db, block.id, block.version);
    const schema = parseSchema(schemaRow);
    if (!schema) {
        throw new ContentBlockLifecycleError(
            'CONTENT_OVERLAY_REBASE_REQUIRED',
            'The active content version has no translation schema.',
            409
        );
    }
    const body = parseObject(block.body_json, 'Content block body');
    const registry = options.registry || loadLocaleRegistry();
    const neutralBody = compactLocalizedTree(body, 'en', registry.entries.map(function (entry) { return entry.code; }));
    const currentHash = structureHash(block.slug, neutralBody);
    if (currentHash !== schema.baseStructureHash || currentHash !== schemaRow.structure_hash) {
        throw new ContentBlockLifecycleError(
            'CONTENT_OVERLAY_REBASE_REQUIRED',
            'The active content structure does not match its translation schema.',
            409
        );
    }
    assertRevisionMatchesSchema(options.revision, schema);
    return { block, schema, structureHash: currentHash };
}

function advanceContentBlockLegacyTitle(options) {
    const db = options && options.db;
    if (!db) throw new Error('advanceContentBlockLegacyTitle requires db');
    if (!overlayLifecycleAvailable(db)) return false;
    const locale = String(options.locale || '').toLowerCase();
    const column = locale === 'en' ? 'title_en' : locale === 'ar' ? 'title_ar' : null;
    if (!column) return false;
    return immediate(db, function () {
        const before = readBlock(db, options.contentBlockId);
        const title = String(options.title || '').trim();
        if (String(before[column] || '') === title) return false;
        const schemaRow = readSchema(db, before.id, before.version);
        const schema = parseSchema(schemaRow);
        if (!schema) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'The active content version has no translation schema.',
                409
            );
        }
        const locales = (options.registry || loadLocaleRegistry()).publicEntries.map(function (entry) { return entry.code; });
        const snapshot = buildContentOverlaySnapshot({
            slug: before.slug,
            contentVersion: before.version,
            body: parseObject(before.body_json, 'Content block body'),
            locales
        });
        assertSnapshot(snapshot);
        if (String(snapshot.schema.baseStructureHash) !== String(schema.baseStructureHash)
            || String(snapshot.schema.baseStructureHash) !== String(schemaRow.structure_hash)) {
            throw new ContentBlockLifecycleError(
                'CONTENT_OVERLAY_REBASE_REQUIRED',
                'The current content structure does not match its active translation schema.',
                409
            );
        }
        const nextVersion = Number(before.version) + 1;
        const nextSchema = { ...schema, contentVersion: nextVersion };
        const now = Date.now();
        const updated = db.prepare(`
            UPDATE content_blocks
            SET ${column} = ?, version = ?, updated_at = ?
            WHERE id = ? AND version = ?
        `).run(title, nextVersion, now, before.id, before.version);
        if (updated.changes !== 1) {
            throw new ContentBlockLifecycleError('VERSION_CONFLICT', 'Content block changed during the title update.', 409);
        }
        insertSchema(db, before.id, nextVersion, nextSchema, now);
        assertPublishedSetReady(db, before.id, nextSchema, locales);
        if (typeof options.afterWrite === 'function') {
            options.afterWrite({ before, after: readBlock(db, before.id), schema: nextSchema });
        }
        return true;
    });
}

module.exports = {
    ContentBlockLifecycleError,
    overlayLifecycleAvailable,
    overlayLifecycleInitialized,
    createContentBlock,
    updateContentBlock,
    validateContentBlockRevision,
    advanceContentBlockLegacyTitle
};
