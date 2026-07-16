'use strict';

const crypto = require('crypto');
const presentation = require('../../js/content-page-presentation');
const { stableJson } = require('./localeRegistry');
const { compactLocalizedTree } = require('./publicContentBlocks');
const {
    CONTENT_SCHEMA_VERSION,
    extractOverlay,
    validateOverlay,
    applyOverlay,
    structureHash
} = require('./contentTranslationOverlay');

const TARGET_SLUG = 'about-us';
const TARGET_LOCALE = 'ar';

class ContentTranslationParityRepairError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'ContentTranslationParityRepairError';
        this.code = code;
        this.details = details || null;
    }
}

function hash(value) {
    return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function parseObject(value, label) {
    try {
        const parsed = JSON.parse(value || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (error) {}
    throw new ContentTranslationParityRepairError('INVALID_JSON', label + ' must be a JSON object.');
}

function revisionSnapshot(row) {
    return {
        id: Number(row.id),
        revisionNo: Number(row.revision_no),
        state: row.revision_state,
        version: Number(row.version),
        title: row.title || '',
        schemaVersion: Number(row.schema_version),
        translationJson: row.translation_json || '{}',
        baseStructureHash: row.base_structure_hash || '',
        updatedBy: row.updated_by || '',
        updatedAt: Number(row.updated_at),
        publishedAt: row.published_at == null ? null : Number(row.published_at)
    };
}

function localizedAboutSnapshotRows(body, locales) {
    const localizedBody = presentation.localizeTree(body || {}, TARGET_LOCALE);
    const rows = localizedBody && localizedBody.snapshot && localizedBody.snapshot.body;
    if (!Array.isArray(rows) || rows.length !== 3 || rows.some(function (item) { return !item || typeof item !== 'object' || Array.isArray(item); })) {
        throw new ContentTranslationParityRepairError(
            'ABOUT_SSR_SOURCE_SHAPE_CHANGED',
            'The current About snapshot no longer has the expected three SSR source rows.'
        );
    }
    return rows.map(function (item) {
        const neutral = compactLocalizedTree(item, 'en', locales);
        neutral.text = presentation.localized(item, 'text', TARGET_LOCALE, TARGET_SLUG);
        return neutral;
    });
}

function buildRepairTarget(row, schemaRow, revision, locales) {
    const body = parseObject(row.body_json, 'content body');
    const neutralBody = compactLocalizedTree(body, 'en', locales);
    const schema = parseObject(schemaRow.schema_json, 'content schema');
    const currentOverlay = parseObject(revision.translation_json, 'published content overlay');
    const currentHash = structureHash(row.slug, neutralBody);
    if (currentHash !== schemaRow.structure_hash
        || currentHash !== schema.baseStructureHash
        || currentHash !== revision.base_structure_hash) {
        throw new ContentTranslationParityRepairError('STRUCTURE_HASH_MISMATCH', 'About content structure changed after C2 migration.');
    }
    const targetBody = applyOverlay(neutralBody, currentOverlay, schema);
    if (!targetBody.snapshot || typeof targetBody.snapshot !== 'object') {
        throw new ContentTranslationParityRepairError('ABOUT_SNAPSHOT_MISSING', 'About snapshot is missing from the published overlay.');
    }
    targetBody.snapshot.body = localizedAboutSnapshotRows(body, locales);
    const extracted = extractOverlay(neutralBody, targetBody);
    if (extracted.blockers.length) {
        throw new ContentTranslationParityRepairError('REPAIR_OVERLAY_BLOCKED', 'The SSR-baseline overlay cannot be represented safely.', extracted.blockers);
    }
    const targetOverlay = validateOverlay(extracted.overlay, schema);
    const rendered = applyOverlay(neutralBody, targetOverlay, schema);
    if (stableJson(rendered) !== stableJson(targetBody)) {
        throw new ContentTranslationParityRepairError('REPAIR_OVERLAY_PARITY_FAILED', 'The repaired overlay does not reproduce the SSR baseline target.');
    }
    return { schema, neutralBody, currentOverlay, targetOverlay, targetBody };
}

function analyzeContentTranslationParityRepair(options) {
    const db = options.db;
    const registry = options.registry;
    const locales = registry.publicEntries.map(function (entry) { return entry.code; });
    const blockers = [];
    let change = null;
    const row = db.prepare(`
        SELECT id, slug, body_json, version, updated_at
        FROM content_blocks
        WHERE slug = ? AND status = 'published'
        LIMIT 1
    `).get(TARGET_SLUG);
    if (!row) blockers.push({ code: 'CONTENT_BLOCK_NOT_FOUND', slug: TARGET_SLUG });
    if (row) {
        const drafts = db.prepare(`
            SELECT id, locale FROM content_block_translations
            WHERE content_block_id = ? AND locale = ? AND revision_state = 'draft'
            ORDER BY locale
        `).all(row.id, TARGET_LOCALE);
        if (drafts.length) blockers.push({ code: 'DRAFT_CONFLICT', drafts });
        const schemaRow = db.prepare(`
            SELECT * FROM content_translation_schemas
            WHERE content_block_id = ? AND content_version = ? AND schema_version = ?
            LIMIT 1
        `).get(row.id, row.version, CONTENT_SCHEMA_VERSION);
        if (!schemaRow) blockers.push({ code: 'SCHEMA_NOT_FOUND', contentBlockId: Number(row.id) });
        const revision = db.prepare(`
            SELECT * FROM content_block_translations
            WHERE content_block_id = ? AND locale = ? AND revision_state = 'published'
            LIMIT 1
        `).get(row.id, TARGET_LOCALE);
        if (!revision) blockers.push({ code: 'PUBLISHED_REVISION_NOT_FOUND', contentBlockId: Number(row.id), locale: TARGET_LOCALE });
        if (schemaRow && revision && !drafts.length) {
            try {
                const target = buildRepairTarget(row, schemaRow, revision, locales);
                if (stableJson(target.currentOverlay) !== stableJson(target.targetOverlay)) {
                    change = {
                        contentBlockId: Number(row.id),
                        slug: row.slug,
                        locale: TARGET_LOCALE,
                        source: {
                            contentVersion: Number(row.version),
                            contentUpdatedAt: row.updated_at == null ? null : Number(row.updated_at),
                            schemaId: Number(schemaRow.id),
                            schemaHash: hash(schemaRow),
                            revision: revisionSnapshot(revision),
                            revisionHash: hash(revisionSnapshot(revision))
                        },
                        target: {
                            overlay: target.targetOverlay,
                            overlayHash: hash(target.targetOverlay),
                            snapshotRows: target.targetBody.snapshot.body.length
                        }
                    };
                }
            } catch (error) {
                blockers.push({
                    code: error.code || 'REPAIR_ANALYSIS_FAILED',
                    message: error.message,
                    details: error.details || null
                });
            }
        }
    }
    const plan = {
        repairVersion: 1,
        schemaVersion: CONTENT_SCHEMA_VERSION,
        locales,
        changes: change ? [change] : [],
        blockers
    };
    plan.summary = { changes: plan.changes.length, blockers: blockers.length };
    plan.planHash = hash({
        repairVersion: plan.repairVersion,
        schemaVersion: plan.schemaVersion,
        locales: plan.locales,
        changes: plan.changes,
        blockers: plan.blockers
    });
    return plan;
}

function applyContentTranslationParityRepair(options) {
    const db = options.db;
    const registry = options.registry;
    const expectedPlanHash = String(options.expectedPlanHash || '').trim();
    if (!expectedPlanHash) throw new ContentTranslationParityRepairError('EXPECTED_PLAN_HASH_REQUIRED', 'expectedPlanHash is required.');
    const actor = String(options.actor && options.actor.username || 'content-parity-repair');
    const execute = function () {
        const plan = analyzeContentTranslationParityRepair({ db, registry });
        if (plan.planHash !== expectedPlanHash) throw new ContentTranslationParityRepairError('PLAN_CHANGED', 'Parity repair plan changed after dry-run.');
        if (plan.blockers.length) throw new ContentTranslationParityRepairError('REPAIR_BLOCKED', 'Parity repair has blockers.', plan.blockers);
        if (plan.changes.length !== 1) throw new ContentTranslationParityRepairError('REPAIR_SCOPE_CHANGED', 'Parity repair must contain exactly one change.');
        const change = plan.changes[0];
        const now = Date.now();
        const source = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(change.source.revision.id);
        if (!source || hash(revisionSnapshot(source)) !== change.source.revisionHash
            || source.revision_state !== 'published') {
            throw new ContentTranslationParityRepairError('PLAN_CHANGED', 'Published About revision changed before apply.');
        }
        const archived = db.prepare(`
            UPDATE content_block_translations
            SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
            WHERE id = ? AND content_block_id = ? AND locale = ?
                AND revision_state = 'published' AND version = ?
        `).run(actor, now, source.id, change.contentBlockId, change.locale, source.version);
        if (archived.changes !== 1) throw new ContentTranslationParityRepairError('PLAN_CHANGED', 'Published About revision changed during apply.');
        const revisionNo = Number(db.prepare(`
            SELECT COALESCE(MAX(revision_no), 0) + 1 AS value
            FROM content_block_translations WHERE content_block_id = ? AND locale = ?
        `).get(change.contentBlockId, change.locale).value);
        const inserted = db.prepare(`
            INSERT INTO content_block_translations
                (content_block_id, locale, revision_no, revision_state, base_revision_id,
                 title, schema_version, translation_json, base_structure_hash, version,
                 created_by, updated_by, created_at, updated_at, published_at)
            VALUES
                (?, ?, ?, 'published', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
        `).run(
            change.contentBlockId,
            change.locale,
            revisionNo,
            source.id,
            source.title || '',
            source.schema_version,
            stableJson(change.target.overlay),
            source.base_structure_hash,
            actor,
            actor,
            now,
            now,
            now
        );
        const newId = Number(inserted.lastInsertRowid);
        const newRevision = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(newId);
        const archivedRevision = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(source.id);
        const receipt = {
            receiptVersion: 1,
            planHash: plan.planHash,
            contentBlockId: change.contentBlockId,
            slug: change.slug,
            locale: change.locale,
            source: { snapshot: revisionSnapshot(source), archivedHash: hash(revisionSnapshot(archivedRevision)) },
            applied: { snapshot: revisionSnapshot(newRevision), hash: hash(revisionSnapshot(newRevision)) }
        };
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, before_json, after_json, created_at)
            VALUES ('content_translation_parity_repair', ?, 'apply', ?, ?, ?, ?)
        `).run(
            String(change.contentBlockId) + ':' + change.locale,
            actor,
            stableJson({ planHash: plan.planHash, revision: receipt.source.snapshot }),
            stableJson({ planHash: plan.planHash, revision: receipt.applied.snapshot }),
            now
        );
        const after = analyzeContentTranslationParityRepair({ db, registry });
        if (after.blockers.length || after.changes.length) {
            throw new ContentTranslationParityRepairError('REPAIR_DID_NOT_CONVERGE', 'Parity repair did not converge.', after);
        }
        return { applied: true, plan, receipt, after };
    };
    return db.inTransaction ? execute() : db.transaction(execute).immediate();
}

function rollbackContentTranslationParityRepair(options) {
    const db = options.db;
    const receipt = options.receipt;
    const actor = String(options.actor && options.actor.username || 'content-parity-repair-rollback');
    if (!receipt || receipt.receiptVersion !== 1) throw new ContentTranslationParityRepairError('INVALID_RECEIPT', 'A valid parity repair receipt is required.');
    const execute = function () {
        const current = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(receipt.applied.snapshot.id);
        const archived = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(receipt.source.snapshot.id);
        if (!current || current.revision_state !== 'published' || hash(revisionSnapshot(current)) !== receipt.applied.hash) {
            throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Applied parity revision changed after repair.');
        }
        if (!archived || archived.revision_state !== 'archived' || hash(revisionSnapshot(archived)) !== receipt.source.archivedHash) {
            throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Previous parity revision changed after repair.');
        }
        const draft = db.prepare(`
            SELECT 1 FROM content_block_translations
            WHERE content_block_id = ? AND locale = ? AND revision_state = 'draft'
        `).get(receipt.contentBlockId, receipt.locale);
        if (draft) throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'A conflicting About translation draft exists.');
        const removed = db.prepare("DELETE FROM content_block_translations WHERE id = ? AND revision_state = 'published'").run(current.id);
        if (removed.changes !== 1) throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Applied revision changed during rollback.');
        const restored = db.prepare(`
            UPDATE content_block_translations
            SET revision_state = 'published', version = ?, updated_by = ?, updated_at = ?, published_at = ?
            WHERE id = ? AND revision_state = 'archived'
        `).run(
            receipt.source.snapshot.version,
            receipt.source.snapshot.updatedBy,
            receipt.source.snapshot.updatedAt,
            receipt.source.snapshot.publishedAt,
            archived.id
        );
        if (restored.changes !== 1) throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Previous revision changed during rollback.');
        const now = Date.now();
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, before_json, after_json, created_at)
            VALUES ('content_translation_parity_repair', ?, 'rollback', ?, ?, ?, ?)
        `).run(
            String(receipt.contentBlockId) + ':' + receipt.locale,
            actor,
            stableJson({ planHash: receipt.planHash, revision: receipt.applied.snapshot }),
            stableJson({ planHash: receipt.planHash, revision: receipt.source.snapshot }),
            now
        );
        return { rolledBack: true, receipt };
    };
    return db.inTransaction ? execute() : db.transaction(execute).immediate();
}

module.exports = {
    ContentTranslationParityRepairError,
    analyzeContentTranslationParityRepair,
    applyContentTranslationParityRepair,
    rollbackContentTranslationParityRepair,
    localizedAboutSnapshotRows
};
