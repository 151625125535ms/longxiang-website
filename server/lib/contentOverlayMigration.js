'use strict';

const crypto = require('crypto');
const { stableJson } = require('./localeRegistry');
const {
    CONTENT_SCHEMA_VERSION,
    buildContentOverlaySnapshot,
    renderLocalizedContent,
    stripTranslationMetadata
} = require('./contentTranslationOverlay');

class ContentOverlayMigrationError extends Error {
    constructor(code, message, status) {
        super(message);
        this.name = 'ContentOverlayMigrationError';
        this.code = code;
        this.status = status || 409;
    }
}

function hash(value) {
    return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function parseObject(value, label) {
    try {
        const parsed = JSON.parse(value || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (error) {}
    throw new ContentOverlayMigrationError('INVALID_JSON', label + ' must contain a JSON object.', 422);
}

function revisionSnapshot(row) {
    return {
        id: Number(row.id),
        revisionNo: Number(row.revision_no),
        state: row.revision_state,
        baseRevisionId: row.base_revision_id == null ? null : Number(row.base_revision_id),
        title: row.title || '',
        schemaVersion: Number(row.schema_version),
        translationJson: row.translation_json || '{}',
        baseStructureHash: row.base_structure_hash || '',
        version: Number(row.version),
        createdBy: row.created_by || '',
        updatedBy: row.updated_by || '',
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        publishedAt: row.published_at == null ? null : Number(row.published_at)
    };
}

function revisionHash(row) {
    return hash(revisionSnapshot(row));
}

function readPublishedRevisions(db, contentBlockId, locales) {
    const rows = db.prepare(`
        SELECT * FROM content_block_translations
        WHERE content_block_id = ? AND revision_state = 'published'
        ORDER BY locale
    `).all(contentBlockId);
    const byLocale = new Map(rows.map(function (row) { return [String(row.locale).toLowerCase(), row]; }));
    return locales.reduce(function (result, locale) {
        if (byLocale.has(locale)) result[locale] = byLocale.get(locale);
        return result;
    }, {});
}

function readSchema(db, contentBlockId, contentVersion) {
    return db.prepare(`
        SELECT * FROM content_translation_schemas
        WHERE content_block_id = ? AND content_version = ? AND schema_version = ?
        LIMIT 1
    `).get(contentBlockId, contentVersion, CONTENT_SCHEMA_VERSION) || null;
}

function migratedStateMatches(db, row, snapshot, revisions, locales, titles) {
    const schemaRow = readSchema(db, row.id, row.version);
    if (!schemaRow) return false;
    if (schemaRow.structure_hash !== snapshot.schema.baseStructureHash) return false;
    if (stableJson(parseObject(schemaRow.schema_json, 'content translation schema')) !== stableJson(snapshot.schema)) return false;
    return locales.every(function (locale) {
        const revision = revisions[locale];
        if (!revision || Number(revision.schema_version) !== CONTENT_SCHEMA_VERSION) return false;
        if (String(revision.title || '') !== String(titles[locale] || '')) return false;
        if (revision.base_structure_hash !== snapshot.schema.baseStructureHash) return false;
        if (stableJson(parseObject(revision.translation_json, 'content overlay')) !== stableJson(snapshot.overlays[locale])) return false;
        try {
            return stableJson(renderLocalizedContent({
                neutralBody: snapshot.neutralBody,
                schema: snapshot.schema,
                overlays: { [locale]: parseObject(revision.translation_json, 'content overlay') }
            }, locale)) === stableJson(stripTranslationMetadata(snapshot.localizedTargets[locale]));
        } catch (error) {
            return false;
        }
    });
}

function migrationPlanHash(plan) {
    return hash({
        schemaVersion: plan.schemaVersion,
        contentSchemaVersion: plan.contentSchemaVersion,
        locales: plan.locales,
        blocks: plan.blocks,
        blockers: plan.blockers
    });
}

function analyzeContentOverlayMigration(options) {
    const db = options.db;
    const registry = options.registry;
    const required = [
        'content_blocks',
        'content_block_translations',
        'content_translation_schemas',
        'content_overlay_migration_receipts'
    ];
    const missing = required.filter(function (name) { return !tableExists(db, name); });
    if (missing.length) {
        throw new ContentOverlayMigrationError('SCHEMA_NOT_READY', 'Content overlay schema is missing: ' + missing.join(', '), 409);
    }

    const locales = registry.publicEntries.map(function (entry) { return entry.code; });
    const blocks = [];
    const blockers = [];
    const rows = db.prepare(`
        SELECT id, slug, title_en, title_ar, body_json, version, updated_at
        FROM content_blocks
        WHERE status = 'published'
        ORDER BY id
    `).all();

    rows.forEach(function (row) {
        let body;
        try {
            body = parseObject(row.body_json, 'content block body');
        } catch (error) {
            blockers.push({ code: error.code, contentBlockId: Number(row.id), slug: row.slug, message: error.message });
            return;
        }
        const existingSchema = readSchema(db, row.id, row.version);
        const contentVersion = existingSchema ? Number(row.version) : Number(row.version) + 1;
        const titles = locales.reduce(function (result, locale) {
            result[locale] = locale === 'ar' ? (row.title_ar || row.title_en || '') : (row.title_en || '');
            return result;
        }, {});
        const snapshot = buildContentOverlaySnapshot({
            slug: row.slug,
            contentVersion,
            body,
            locales
        });
        snapshot.blockers.forEach(function (blocker) {
            blockers.push({ ...blocker, contentBlockId: Number(row.id), slug: row.slug });
        });
        const revisions = readPublishedRevisions(db, row.id, locales);
        locales.forEach(function (locale) {
            if (!revisions[locale]) blockers.push({ code: 'PUBLISHED_REVISION_MISSING', contentBlockId: Number(row.id), slug: row.slug, locale });
        });
        const drafts = db.prepare(`
            SELECT locale, id FROM content_block_translations
            WHERE content_block_id = ? AND revision_state = 'draft'
            ORDER BY locale
        `).all(row.id);
        drafts.forEach(function (draft) {
            blockers.push({ code: 'DRAFT_CONFLICT', contentBlockId: Number(row.id), slug: row.slug, locale: draft.locale, revisionId: Number(draft.id) });
        });
        if (snapshot.blockers.length || locales.some(function (locale) { return !revisions[locale]; }) || drafts.length) return;
        if (existingSchema) {
            if (!migratedStateMatches(db, row, snapshot, revisions, locales, titles)) {
                blockers.push({ code: 'MIGRATED_STATE_DRIFT', contentBlockId: Number(row.id), slug: row.slug });
            }
            return;
        }
        blocks.push({
            contentBlockId: Number(row.id),
            slug: row.slug,
            source: {
                version: Number(row.version),
                updatedAt: row.updated_at == null ? null : row.updated_at,
                bodyJson: row.body_json,
                bodyHash: hash(body),
                revisions: locales.reduce(function (result, locale) {
                    result[locale] = { snapshot: revisionSnapshot(revisions[locale]), hash: revisionHash(revisions[locale]) };
                    return result;
                }, {})
            },
            target: {
                contentVersion,
                bodyJson: stableJson(snapshot.bodyWithStableIds),
                bodyHash: hash(snapshot.bodyWithStableIds),
                schema: snapshot.schema,
                overlays: snapshot.overlays,
                titles
            }
        });
    });

    const plan = {
        schemaVersion: 8,
        contentSchemaVersion: CONTENT_SCHEMA_VERSION,
        locales,
        blocks,
        blockers,
        summary: {
            contentBlocksChecked: rows.length,
            contentBlocksToMigrate: blocks.length,
            stableIdsToPersist: blocks.reduce(function (total, block) {
                const parsed = parseObject(block.target.bodyJson, 'target content body');
                let count = 0;
                (function visit(value) {
                    if (Array.isArray(value)) return value.forEach(visit);
                    if (!value || typeof value !== 'object') return;
                    if (value._translationId) count += 1;
                    Object.keys(value).forEach(function (key) { visit(value[key]); });
                })(parsed);
                return total + count;
            }, 0),
            revisionsToCreate: blocks.length * locales.length,
            blockers: blockers.length
        }
    };
    plan.planHash = migrationPlanHash(plan);
    return plan;
}

function insertPublishedRevision(db, block, locale, now, actor) {
    const source = block.source.revisions[locale].snapshot;
    const revisionNo = Number(db.prepare(`
        SELECT COALESCE(MAX(revision_no), 0) + 1 AS value
        FROM content_block_translations WHERE content_block_id = ? AND locale = ?
    `).get(block.contentBlockId, locale).value);
    const archived = db.prepare(`
        UPDATE content_block_translations
        SET revision_state = 'archived', version = version + 1, updated_by = ?, updated_at = ?
        WHERE id = ? AND content_block_id = ? AND locale = ?
            AND revision_state = 'published' AND version = ?
    `).run(actor, now, source.id, block.contentBlockId, locale, source.version);
    if (archived.changes !== 1) {
        throw new ContentOverlayMigrationError('PLAN_CHANGED', 'Published content translation changed during apply.');
    }
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
        content_block_id: block.contentBlockId,
        locale,
        revision_no: revisionNo,
        base_revision_id: source.id,
        title: block.target.titles[locale],
        schema_version: CONTENT_SCHEMA_VERSION,
        translation_json: stableJson(block.target.overlays[locale]),
        base_structure_hash: block.target.schema.baseStructureHash,
        actor,
        now
    });
    const revisionId = Number(result.lastInsertRowid);
    const archivedRevision = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(source.id);
    const publishedRevision = db.prepare('SELECT * FROM content_block_translations WHERE id = ?').get(revisionId);
    return {
        id: revisionId,
        hash: revisionHash(publishedRevision),
        archivedHash: revisionHash(archivedRevision)
    };
}

function applyContentOverlayMigration(options) {
    const db = options.db;
    const registry = options.registry;
    const expectedPlanHash = String(options.expectedPlanHash || '').trim();
    if (!expectedPlanHash) throw new ContentOverlayMigrationError('EXPECTED_PLAN_HASH_REQUIRED', 'expectedPlanHash is required.', 422);
    const actor = String(options.actor && options.actor.username || 'content-overlay-migration');

    const execute = function () {
        const plan = analyzeContentOverlayMigration({ db, registry });
        if (plan.planHash !== expectedPlanHash) throw new ContentOverlayMigrationError('PLAN_CHANGED', 'Content overlay migration plan changed after dry-run.');
        if (plan.blockers.length) throw new ContentOverlayMigrationError('MIGRATION_BLOCKED', 'Content overlay migration has blockers.');
        const now = Date.now();
        const receiptBlocks = [];
        plan.blocks.forEach(function (block) {
            const updated = db.prepare(`
                UPDATE content_blocks
                SET body_json = ?, version = ?, updated_at = ?
                WHERE id = ? AND version = ? AND body_json = ?
            `).run(block.target.bodyJson, block.target.contentVersion, now, block.contentBlockId, block.source.version, block.source.bodyJson);
            if (updated.changes !== 1) throw new ContentOverlayMigrationError('PLAN_CHANGED', 'Content block changed during apply.');
            const schemaResult = db.prepare(`
                INSERT INTO content_translation_schemas
                    (content_block_id, content_version, schema_version, schema_json, structure_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                block.contentBlockId,
                block.target.contentVersion,
                CONTENT_SCHEMA_VERSION,
                stableJson(block.target.schema),
                block.target.schema.baseStructureHash,
                now
            );
            const schemaId = Number(schemaResult.lastInsertRowid);
            const schemaRow = db.prepare('SELECT * FROM content_translation_schemas WHERE id = ?').get(schemaId);
            const revisions = {};
            plan.locales.forEach(function (locale) {
                revisions[locale] = insertPublishedRevision(db, block, locale, now, actor);
            });
            receiptBlocks.push({
                contentBlockId: block.contentBlockId,
                slug: block.slug,
                source: block.source,
                applied: {
                    contentVersion: block.target.contentVersion,
                    bodyJson: block.target.bodyJson,
                    updatedAt: now,
                    schema: { id: schemaId, hash: hash(schemaRow) },
                    revisions
                }
            });
        });
        const after = analyzeContentOverlayMigration({ db, registry });
        if (after.blockers.length || after.blocks.length) {
            throw new ContentOverlayMigrationError('MIGRATION_INCOMPLETE', 'Content overlay migration did not converge.', 500);
        }
        const receipt = {
            receiptVersion: 1,
            planHash: plan.planHash,
            createdAt: now,
            locales: plan.locales,
            blocks: receiptBlocks
        };
        const existing = db.prepare('SELECT state FROM content_overlay_migration_receipts WHERE plan_hash = ?').get(plan.planHash);
        if (existing && existing.state !== 'rolled_back') {
            throw new ContentOverlayMigrationError('RECEIPT_CONFLICT', 'This migration plan is already applied.');
        }
        if (existing) {
            db.prepare(`
                UPDATE content_overlay_migration_receipts
                SET receipt_json = ?, state = 'applied', created_at = ?, rolled_back_at = NULL
                WHERE plan_hash = ? AND state = 'rolled_back'
            `).run(stableJson(receipt), now, plan.planHash);
        } else {
            db.prepare(`
                INSERT INTO content_overlay_migration_receipts
                    (plan_hash, receipt_json, state, created_at)
                VALUES (?, ?, 'applied', ?)
            `).run(plan.planHash, stableJson(receipt), now);
        }
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, before_json, after_json, created_at)
            VALUES ('content_overlay_migration', 'stage-c1', 'apply', ?, ?, ?, ?)
        `).run(actor, stableJson({ planHash: plan.planHash, blocks: plan.blocks.length }), stableJson({ receiptBlocks: receipt.blocks.length }), now);
        return { applied: true, plan, receipt, after };
    };

    return db.inTransaction ? execute() : db.transaction(execute).immediate();
}

function rollbackContentOverlayMigration(options) {
    const db = options.db;
    const registry = options.registry;
    let receipt = options.receipt || null;
    const planHash = String(options.planHash || receipt && receipt.planHash || '').trim();
    if (!receipt && planHash) {
        const row = db.prepare(`
            SELECT receipt_json FROM content_overlay_migration_receipts
            WHERE plan_hash = ? AND state = 'applied'
        `).get(planHash);
        if (row) receipt = parseObject(row.receipt_json, 'content overlay migration receipt');
    }
    if (!receipt || receipt.receiptVersion !== 1 || !Array.isArray(receipt.blocks)) {
        throw new ContentOverlayMigrationError('INVALID_RECEIPT', 'A valid content overlay migration receipt is required.', 422);
    }
    const actor = String(options.actor && options.actor.username || 'content-overlay-rollback');

    const execute = function () {
        const stored = db.prepare(`
            SELECT state, receipt_json FROM content_overlay_migration_receipts WHERE plan_hash = ?
        `).get(receipt.planHash);
        if (!stored || stored.state !== 'applied' || stableJson(parseObject(stored.receipt_json, 'stored receipt')) !== stableJson(receipt)) {
            throw new ContentOverlayMigrationError('INVALID_RECEIPT', 'The database does not contain the matching applied receipt.');
        }
        receipt.blocks.slice().reverse().forEach(function (block) {
            const current = db.prepare('SELECT body_json, version, updated_at FROM content_blocks WHERE id = ?').get(block.contentBlockId);
            if (!current || current.body_json !== block.applied.bodyJson
                || Number(current.version) !== Number(block.applied.contentVersion)
                || Number(current.updated_at) !== Number(block.applied.updatedAt)) {
                throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Content block changed after migration.');
            }
            const draft = db.prepare(`
                SELECT 1 FROM content_block_translations
                WHERE content_block_id = ? AND revision_state = 'draft' LIMIT 1
            `).get(block.contentBlockId);
            if (draft) throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'A content translation draft exists after migration.');
            receipt.locales.forEach(function (locale) {
                const appliedRevision = block.applied.revisions[locale];
                const newId = Number(appliedRevision.id);
                const published = db.prepare(`
                    SELECT * FROM content_block_translations
                    WHERE id = ? AND content_block_id = ? AND locale = ? AND revision_state = 'published'
                `).get(newId, block.contentBlockId, locale);
                if (!published || revisionHash(published) !== appliedRevision.hash) {
                    throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Published overlay revision changed after migration.');
                }
                const source = block.source.revisions[locale].snapshot;
                const archived = db.prepare(`
                    SELECT * FROM content_block_translations
                    WHERE id = ? AND content_block_id = ? AND locale = ? AND revision_state = 'archived'
                `).get(source.id, block.contentBlockId, locale);
                if (!archived || revisionHash(archived) !== appliedRevision.archivedHash) {
                    throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Previous published revision changed after migration.');
                }
                const removed = db.prepare('DELETE FROM content_block_translations WHERE id = ? AND revision_state = \'published\'').run(newId);
                if (removed.changes !== 1) throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Overlay revision changed during rollback.');
                const restored = db.prepare(`
                    UPDATE content_block_translations
                    SET revision_state = 'published', version = ?, updated_by = ?, updated_at = ?, published_at = ?
                    WHERE id = ? AND content_block_id = ? AND locale = ? AND revision_state = 'archived'
                `).run(source.version, source.updatedBy, source.updatedAt, source.publishedAt, source.id, block.contentBlockId, locale);
                if (restored.changes !== 1) throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Previous published revision changed during rollback.');
            });
            const appliedSchema = block.applied.schema;
            const currentSchema = db.prepare(`
                SELECT * FROM content_translation_schemas
                WHERE id = ? AND content_block_id = ? AND content_version = ?
            `).get(appliedSchema.id, block.contentBlockId, block.applied.contentVersion);
            if (!currentSchema || hash(currentSchema) !== appliedSchema.hash) {
                throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Content translation schema changed after migration.');
            }
            const schemaRemoved = db.prepare(`
                DELETE FROM content_translation_schemas
                WHERE id = ? AND content_block_id = ? AND content_version = ?
            `).run(appliedSchema.id, block.contentBlockId, block.applied.contentVersion);
            if (schemaRemoved.changes !== 1) throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Content translation schema changed after migration.');
            const restoredBlock = db.prepare(`
                UPDATE content_blocks
                SET body_json = ?, version = ?, updated_at = ?
                WHERE id = ? AND version = ? AND body_json = ?
            `).run(
                block.source.bodyJson,
                block.source.version,
                block.source.updatedAt,
                block.contentBlockId,
                block.applied.contentVersion,
                block.applied.bodyJson
            );
            if (restoredBlock.changes !== 1) throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Content block changed during rollback.');
        });
        const rolledBackAt = Date.now();
        const updated = db.prepare(`
            UPDATE content_overlay_migration_receipts
            SET state = 'rolled_back', rolled_back_at = ?
            WHERE plan_hash = ? AND state = 'applied'
        `).run(rolledBackAt, receipt.planHash);
        if (updated.changes !== 1) throw new ContentOverlayMigrationError('ROLLBACK_STATE_CHANGED', 'Migration receipt changed during rollback.');
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, before_json, after_json, created_at)
            VALUES ('content_overlay_migration', 'stage-c1', 'rollback', ?, ?, ?, ?)
        `).run(actor, stableJson({ planHash: receipt.planHash }), stableJson({ blocks: receipt.blocks.length }), rolledBackAt);
        const after = analyzeContentOverlayMigration({ db, registry });
        if (after.blockers.length) throw new ContentOverlayMigrationError('ROLLBACK_INCOMPLETE', 'Rollback produced content overlay blockers.', 500);
        return { rolledBack: true, receipt, after };
    };

    return db.inTransaction ? execute() : db.transaction(execute).immediate();
}

module.exports = {
    ContentOverlayMigrationError,
    analyzeContentOverlayMigration,
    applyContentOverlayMigration,
    rollbackContentOverlayMigration,
    migrationPlanHash
};
