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
const TARGET_LOCALES = Object.freeze(['ar', 'fr', 'ru']);

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

function localizedAboutSnapshotRows(body, locale, locales) {
    if (TARGET_LOCALES.indexOf(locale) === -1) {
        throw new ContentTranslationParityRepairError('LOCALE_NOT_ALLOWED', 'About parity repair locale is not allowed: ' + locale);
    }
    const localizedBody = presentation.localizeTree(body || {}, locale);
    const baseRows = body && body.snapshot && body.snapshot.body;
    const localizedRows = localizedBody && localizedBody.snapshot && localizedBody.snapshot.body;
    if (!Array.isArray(baseRows) || baseRows.length !== 3
        || baseRows.some(function (item) { return !item || typeof item !== 'object' || Array.isArray(item); })
        || !Array.isArray(localizedRows) || localizedRows.length !== 3) {
        throw new ContentTranslationParityRepairError(
            'ABOUT_SSR_SOURCE_SHAPE_CHANGED',
            'The current About snapshot no longer has the expected three SSR source rows.'
        );
    }
    return localizedRows.map(function (item, index) {
        const neutral = compactLocalizedTree(baseRows[index], 'en', locales);
        const sourceIsString = typeof item === 'string';
        const text = sourceIsString
            ? item
            : item && typeof item === 'object'
                ? presentation.localized(item, 'text', locale, TARGET_SLUG)
                : '';
        if (!text) {
            throw new ContentTranslationParityRepairError(
                'ABOUT_SSR_SOURCE_SHAPE_CHANGED',
                'The current About SSR source row is empty: ' + locale + '[' + index + ']'
            );
        }
        neutral.text = text;
        return neutral;
    });
}

function buildRepairTarget(row, schemaRow, revision, locale, locales) {
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
    targetBody.snapshot.body = localizedAboutSnapshotRows(body, locale, locales);
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
    const changes = [];
    const row = db.prepare(`
        SELECT id, slug, body_json, version, updated_at
        FROM content_blocks
        WHERE slug = ? AND status = 'published'
        LIMIT 1
    `).get(TARGET_SLUG);
    if (!row) blockers.push({ code: 'CONTENT_BLOCK_NOT_FOUND', slug: TARGET_SLUG });
    if (row) {
        const schemaRow = db.prepare(`
            SELECT * FROM content_translation_schemas
            WHERE content_block_id = ? AND content_version = ? AND schema_version = ?
            LIMIT 1
        `).get(row.id, row.version, CONTENT_SCHEMA_VERSION);
        if (!schemaRow) blockers.push({ code: 'SCHEMA_NOT_FOUND', contentBlockId: Number(row.id) });
        TARGET_LOCALES.forEach(function (locale) {
            const drafts = db.prepare(`
                SELECT id, locale FROM content_block_translations
                WHERE content_block_id = ? AND locale = ? AND revision_state = 'draft'
                ORDER BY locale
            `).all(row.id, locale);
            if (drafts.length) {
                blockers.push({ code: 'DRAFT_CONFLICT', locale, drafts });
                return;
            }
            const revision = db.prepare(`
                SELECT * FROM content_block_translations
                WHERE content_block_id = ? AND locale = ? AND revision_state = 'published'
                LIMIT 1
            `).get(row.id, locale);
            if (!revision) {
                blockers.push({ code: 'PUBLISHED_REVISION_NOT_FOUND', contentBlockId: Number(row.id), locale });
                return;
            }
            if (!schemaRow) return;
            try {
                const target = buildRepairTarget(row, schemaRow, revision, locale, locales);
                if (stableJson(target.currentOverlay) !== stableJson(target.targetOverlay)) {
                    changes.push({
                        contentBlockId: Number(row.id),
                        slug: row.slug,
                        locale,
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
                    });
                }
            } catch (error) {
                blockers.push({
                    code: error.code || 'REPAIR_ANALYSIS_FAILED',
                    locale,
                    message: error.message,
                    details: error.details || null
                });
            }
        });
    }
    const plan = {
        repairVersion: 2,
        schemaVersion: CONTENT_SCHEMA_VERSION,
        locales,
        targetLocales: TARGET_LOCALES.slice(),
        changes,
        blockers
    };
    plan.summary = { changes: plan.changes.length, blockers: blockers.length };
    plan.planHash = hash({
        repairVersion: plan.repairVersion,
        schemaVersion: plan.schemaVersion,
        locales: plan.locales,
        targetLocales: plan.targetLocales,
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
        if (!plan.changes.length || plan.changes.length > TARGET_LOCALES.length) {
            throw new ContentTranslationParityRepairError('REPAIR_SCOPE_CHANGED', 'Parity repair must contain one or more approved About locale changes.');
        }
        const seenLocales = new Set();
        const sources = plan.changes.map(function (change) {
            if (change.slug !== TARGET_SLUG || TARGET_LOCALES.indexOf(change.locale) === -1 || seenLocales.has(change.locale)) {
                throw new ContentTranslationParityRepairError('REPAIR_SCOPE_CHANGED', 'Parity repair contains an unexpected or duplicate target.');
            }
            seenLocales.add(change.locale);
            const source = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(change.source.revision.id);
            if (!source || hash(revisionSnapshot(source)) !== change.source.revisionHash
                || source.revision_state !== 'published') {
                throw new ContentTranslationParityRepairError('PLAN_CHANGED', 'Published About revision changed before apply: ' + change.locale);
            }
            return source;
        });
        const now = Date.now();
        const repairs = plan.changes.map(function (change, index) {
            const source = sources[index];
            const archived = db.prepare(`
                UPDATE content_block_translations
                SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
                WHERE id = ? AND content_block_id = ? AND locale = ?
                    AND revision_state = 'published' AND version = ?
            `).run(actor, now, source.id, change.contentBlockId, change.locale, source.version);
            if (archived.changes !== 1) {
                throw new ContentTranslationParityRepairError('PLAN_CHANGED', 'Published About revision changed during apply: ' + change.locale);
            }
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
            const repair = {
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
                stableJson({ planHash: plan.planHash, revision: repair.source.snapshot }),
                stableJson({ planHash: plan.planHash, revision: repair.applied.snapshot }),
                now
            );
            return repair;
        });
        const receipt = {
            receiptVersion: 2,
            planHash: plan.planHash,
            repairs
        };
        const after = analyzeContentTranslationParityRepair({ db, registry });
        if (after.blockers.length || after.changes.length) {
            throw new ContentTranslationParityRepairError('REPAIR_DID_NOT_CONVERGE', 'Parity repair did not converge.', after);
        }
        return { applied: true, plan, receipt, after };
    };
    return db.inTransaction ? execute() : db.transaction(execute).immediate();
}

function receiptRepairs(receipt) {
    if (receipt && receipt.receiptVersion === 1) return [receipt];
    if (receipt && receipt.receiptVersion === 2 && Array.isArray(receipt.repairs) && receipt.repairs.length) {
        return receipt.repairs;
    }
    throw new ContentTranslationParityRepairError('INVALID_RECEIPT', 'A valid parity repair receipt is required.');
}

function rollbackContentTranslationParityRepair(options) {
    const db = options.db;
    const receipt = options.receipt;
    const actor = String(options.actor && options.actor.username || 'content-parity-repair-rollback');
    const execute = function () {
        const repairs = receiptRepairs(receipt);
        const states = repairs.map(function (repair) {
            const current = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(repair.applied.snapshot.id);
            const archived = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(repair.source.snapshot.id);
            if (!current || current.revision_state !== 'published' || hash(revisionSnapshot(current)) !== repair.applied.hash) {
                throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Applied parity revision changed after repair: ' + repair.locale);
            }
            if (!archived || archived.revision_state !== 'archived' || hash(revisionSnapshot(archived)) !== repair.source.archivedHash) {
                throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Previous parity revision changed after repair: ' + repair.locale);
            }
            const draft = db.prepare(`
                SELECT 1 FROM content_block_translations
                WHERE content_block_id = ? AND locale = ? AND revision_state = 'draft'
            `).get(repair.contentBlockId, repair.locale);
            if (draft) {
                throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'A conflicting About translation draft exists: ' + repair.locale);
            }
            return { repair, current, archived };
        });
        const now = Date.now();
        states.slice().reverse().forEach(function (state) {
            const repair = state.repair;
            const removed = db.prepare("DELETE FROM content_block_translations WHERE id = ? AND revision_state = 'published'").run(state.current.id);
            if (removed.changes !== 1) {
                throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Applied revision changed during rollback: ' + repair.locale);
            }
            const restored = db.prepare(`
                UPDATE content_block_translations
                SET revision_state = 'published', version = ?, updated_by = ?, updated_at = ?, published_at = ?
                WHERE id = ? AND revision_state = 'archived'
            `).run(
                repair.source.snapshot.version,
                repair.source.snapshot.updatedBy,
                repair.source.snapshot.updatedAt,
                repair.source.snapshot.publishedAt,
                state.archived.id
            );
            if (restored.changes !== 1) {
                throw new ContentTranslationParityRepairError('ROLLBACK_STATE_CHANGED', 'Previous revision changed during rollback: ' + repair.locale);
            }
            db.prepare(`
                INSERT INTO audit_logs
                    (entity_type, entity_id, action, performed_by, before_json, after_json, created_at)
                VALUES ('content_translation_parity_repair', ?, 'rollback', ?, ?, ?, ?)
            `).run(
                String(repair.contentBlockId) + ':' + repair.locale,
                actor,
                stableJson({ planHash: receipt.planHash, revision: repair.applied.snapshot }),
                stableJson({ planHash: receipt.planHash, revision: repair.source.snapshot }),
                now
            );
        });
        return { rolledBack: true, count: states.length, receipt };
    };
    return db.inTransaction ? execute() : db.transaction(execute).immediate();
}

module.exports = {
    ContentTranslationParityRepairError,
    analyzeContentTranslationParityRepair,
    applyContentTranslationParityRepair,
    rollbackContentTranslationParityRepair,
    localizedAboutSnapshotRows,
    TARGET_LOCALES
};
