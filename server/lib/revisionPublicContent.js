'use strict';

const { getDb } = require('./db');
const { readCompanyIdentity, sanitizePublicContact, ensureChinaWebsiteLink } = require('./companyIdentity');
const { loadLocaleRegistry } = require('./localeRegistry');
const { PUBLIC_SLUGS, compactLocalizedTree, stripPrivateContentMetadata } = require('./publicContentBlocks');
const { OVERLAY_VERSION, CONTENT_SCHEMA_VERSION, applyOverlay, structureHash } = require('./contentTranslationOverlay');

class RevisionContentError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'RevisionContentError';
        this.code = code;
    }
}

function parseObject(value, label) {
    try {
        const parsed = JSON.parse(value || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (error) {}
    throw new RevisionContentError('INVALID_REVISION_CONTENT', label + ' is not a JSON object.');
}

function sanitizeBody(slug, body, db) {
    if (slug === 'contact') return sanitizePublicContact(body, readCompanyIdentity(db));
    if (slug === 'global-shell') return ensureChinaWebsiteLink(body, readCompanyIdentity(db));
    return body;
}

function readRevisionLocalizedContentBlock(slugValue, localeValue, dbValue, registryValue) {
    const slug = String(slugValue || '').trim();
    const locale = String(localeValue || '').trim().toLowerCase();
    if (!PUBLIC_SLUGS.has(slug)) return null;
    const registry = registryValue || loadLocaleRegistry();
    const entry = registry.get(locale);
    if (!entry || !entry.isPublic) throw new RevisionContentError('LOCALE_NOT_PUBLIC', 'Revision content requires a supported locale.');
    const db = dbValue || getDb();
    const row = db.prepare(`
        SELECT
            block.id, block.slug, block.body_json, block.version, block.updated_at,
            revision.id AS revision_id, revision.title, revision.translation_json,
            revision.schema_version, revision.base_structure_hash,
            schema.schema_json, schema.structure_hash
        FROM content_blocks block
        JOIN content_block_translations revision
            ON revision.content_block_id = block.id
            AND revision.locale = ?
            AND revision.revision_state = 'published'
        JOIN content_translation_schemas schema
            ON schema.content_block_id = block.id
            AND schema.content_version = block.version
            AND schema.schema_version = revision.schema_version
        WHERE block.slug = ? AND block.status = 'published'
        LIMIT 1
    `).get(locale, slug);
    if (!row) return null;
    if (Number(row.schema_version) !== CONTENT_SCHEMA_VERSION) {
        throw new RevisionContentError('SCHEMA_VERSION_MISMATCH', 'Published content revision does not use the active overlay schema.');
    }
    const baseBody = parseObject(row.body_json, 'content body');
    const neutralBody = compactLocalizedTree(baseBody, 'en', registry.entries.map(function (item) { return item.code; }));
    const schema = parseObject(row.schema_json, 'content schema');
    if (schema.slug !== slug
        || Number(schema.contentVersion) !== Number(row.version)
        || Number(schema.overlayVersion) !== OVERLAY_VERSION
        || !Array.isArray(schema.allowedPaths)
        || !Array.isArray(schema.replacementPaths)) {
        throw new RevisionContentError('SCHEMA_METADATA_MISMATCH', 'Content schema metadata does not match the requested block.');
    }
    const currentHash = structureHash(slug, neutralBody);
    if (currentHash !== row.structure_hash
        || currentHash !== row.base_structure_hash
        || currentHash !== schema.baseStructureHash) {
        throw new RevisionContentError('STRUCTURE_HASH_MISMATCH', 'Content structure changed after the published overlay was created.');
    }
    const overlay = parseObject(row.translation_json, 'content overlay');
    let body = stripPrivateContentMetadata(applyOverlay(neutralBody, overlay, schema));
    body = sanitizeBody(slug, body, db);
    body = compactLocalizedTree(body, locale, registry.entries.map(function (item) { return item.code; }));
    return {
        id: row.id,
        slug: row.slug,
        title: row.title || '',
        body,
        version: row.version,
        updatedAt: row.updated_at || null,
        localization: {
            requestedLocale: locale,
            sourceLocale: locale,
            fallbackApplied: false,
            revisionId: Number(row.revision_id),
            structureHash: currentHash
        }
    };
}

module.exports = {
    RevisionContentError,
    readRevisionLocalizedContentBlock
};
