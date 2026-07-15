'use strict';

const crypto = require('crypto');
const { stableJson } = require('./localeRegistry');
const { ENTITY_CONFIG, createTranslationWriter, TranslationError } = require('./translationWriter');

const ENTITY_ORDER = ['product', 'category', 'certification', 'content_block'];

function tableExists(db, tableName) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function entityIds(db, entityType) {
    const config = ENTITY_CONFIG[entityType];
    const where = entityType === 'product' || entityType === 'certification'
        ? " WHERE status != 'deleted'"
        : '';
    return db.prepare('SELECT id FROM ' + config.baseTable + where + ' ORDER BY id').all().map(function (row) {
        return Number(row.id);
    });
}

function revisionDraftExists(db, config, entityId, locale) {
    return Boolean(db.prepare(`
        SELECT 1 FROM ${config.translationTable}
        WHERE ${config.foreignKey} = ? AND locale = ? AND revision_state = 'draft'
        LIMIT 1
    `).get(entityId, locale));
}

function planHash(plan) {
    return crypto.createHash('sha256').update(stableJson({
        specCodes: plan.specCodes,
        revisions: plan.revisions,
        blockers: plan.blockers
    })).digest('hex');
}

function revisionContentHash(revision) {
    return crypto.createHash('sha256').update(stableJson({
        values: revision && revision.values ? revision.values : {},
        specValues: revision && revision.specValues ? revision.specValues : []
    })).digest('hex');
}

function sourceContentHash(db, entityType, entityId, locale, inspection) {
    const snapshot = {
        entityType,
        entityId,
        locale,
        legacyValues: inspection.legacyValues
    };
    if (entityType === 'product') {
        snapshot.specs = db.prepare(`
            SELECT id, spec_code, spec_group, spec_key, spec_value, unit, sort_order
            FROM product_specs
            WHERE product_id = ? AND spec_group != 'archived'
            ORDER BY sort_order, id
        `).all(entityId);
    }
    return crypto.createHash('sha256').update(stableJson(snapshot)).digest('hex');
}

function analyzeTranslationBackfill(options) {
    const db = options.db;
    const registry = options.registry;
    const requiredTables = ENTITY_ORDER.map(function (entityType) {
        return ENTITY_CONFIG[entityType].translationTable;
    }).concat(['product_spec_translation_values', 'translation_backfill_receipts']);
    const missingTables = requiredTables.filter(function (table) { return !tableExists(db, table); });
    if (missingTables.length) {
        throw new TranslationError('SCHEMA_NOT_READY', 'Translation revision schema is missing: ' + missingTables.join(', '), 409);
    }
    const writer = createTranslationWriter({ db, registry });
    const specCodes = [];
    const revisions = [];
    const blockers = [];

    db.prepare(`
        SELECT id, product_id, spec_code
        FROM product_specs
        WHERE spec_code IS NULL OR trim(spec_code) = ''
        ORDER BY product_id, id
    `).all().forEach(function (row) {
        const target = 'legacy-spec-' + row.id;
        const conflict = db.prepare(`
            SELECT id FROM product_specs
            WHERE product_id = ? AND spec_code = ? AND id != ?
            LIMIT 1
        `).get(row.product_id, target, row.id);
        if (conflict) {
            blockers.push({
                code: 'SPEC_CODE_CONFLICT',
                productId: Number(row.product_id),
                specId: Number(row.id),
                conflictSpecId: Number(conflict.id),
                target
            });
            return;
        }
        specCodes.push({ productId: Number(row.product_id), specId: Number(row.id), target });
    });

    const locales = registry.publicEntries.map(function (entry) { return entry.code; });
    ENTITY_ORDER.forEach(function (entityType) {
        const config = ENTITY_CONFIG[entityType];
        entityIds(db, entityType).forEach(function (entityId) {
            locales.forEach(function (locale) {
                const inspection = writer.inspectLegacy({ entityType, entityId, locale });
                if (!inspection.hasPublished) {
                    if (revisionDraftExists(db, config, entityId, locale)) {
                        blockers.push({ code: 'DRAFT_WITHOUT_PUBLISHED', entityType, entityId, locale });
                        return;
                    }
                    revisions.push({
                        entityType,
                        entityId,
                        locale,
                        action: 'create_published_from_legacy',
                        sourceHash: sourceContentHash(db, entityType, entityId, locale, inspection)
                    });
                    return;
                }
                if (!inspection.matches) {
                    blockers.push({
                        code: 'PUBLISHED_LEGACY_MISMATCH',
                        entityType,
                        entityId,
                        locale,
                        publishedRevisionId: inspection.publishedRevisionId
                    });
                }
            });
        });
    });

    const plan = {
        schemaVersion: 7,
        locales,
        specCodes,
        revisions,
        blockers,
        summary: {
            specCodesToAssign: specCodes.length,
            revisionsToCreate: revisions.length,
            blockers: blockers.length
        }
    };
    plan.planHash = planHash(plan);
    return plan;
}

function applyTranslationBackfill(options) {
    const db = options.db;
    const registry = options.registry;
    const expectedPlanHash = String(options.expectedPlanHash || '').trim();
    if (!expectedPlanHash) throw new TranslationError('EXPECTED_PLAN_HASH_REQUIRED', 'expectedPlanHash is required.', 422);

    const execute = function () {
        const plan = analyzeTranslationBackfill({ db, registry });
        if (plan.planHash !== expectedPlanHash) {
            throw new TranslationError('PLAN_CHANGED', 'Translation backfill plan changed after dry-run.', 409);
        }
        if (plan.blockers.length) {
            throw new TranslationError('BACKFILL_BLOCKED', 'Translation backfill has blockers.', 409);
        }
        const now = Date.now();
        const assign = db.prepare(`
            UPDATE product_specs
            SET spec_code = @target, updated_at = @updated_at
            WHERE id = @spec_id AND product_id = @product_id
                AND (spec_code IS NULL OR trim(spec_code) = '')
        `);
        plan.specCodes.forEach(function (item) {
            const result = assign.run({
                target: item.target,
                updated_at: now,
                spec_id: item.specId,
                product_id: item.productId
            });
            if (result.changes !== 1) {
                throw new TranslationError('PLAN_CHANGED', 'Specification changed during translation backfill.', 409);
            }
        });

        const writer = createTranslationWriter({ db, registry });
        const actor = options.actor || { username: 'translation-backfill' };
        const createdRevisions = [];
        plan.revisions.forEach(function (item) {
            const result = writer.syncLegacyPublished({
                entityType: item.entityType,
                entityId: item.entityId,
                locales: [item.locale],
                actor
            });
            if (result.changed !== 1) {
                throw new TranslationError('PLAN_CHANGED', 'Translation changed during backfill.', 409);
            }
            const state = writer.getState({
                entityType: item.entityType,
                entityId: item.entityId,
                locale: item.locale
            });
            createdRevisions.push({
                entityType: item.entityType,
                entityId: item.entityId,
                locale: item.locale,
                revisionId: state.published.id,
                revisionNo: state.published.revisionNo,
                version: state.published.version,
                contentHash: revisionContentHash(state.published)
            });
        });
        const after = analyzeTranslationBackfill({ db, registry });
        if (after.blockers.length || after.specCodes.length || after.revisions.length) {
            throw new TranslationError('BACKFILL_INCOMPLETE', 'Translation backfill did not converge.', 500);
        }
        const receipt = {
            receiptVersion: 1,
            planHash: plan.planHash,
            createdAt: Date.now(),
            createdRevisions,
            retainedSpecCodesOnLogicalRollback: plan.specCodes.map(function (item) { return { ...item }; })
        };
        db.prepare(`
            INSERT INTO translation_backfill_receipts
                (plan_hash, receipt_json, state, created_at)
            VALUES (?, ?, 'applied', ?)
        `).run(receipt.planHash, JSON.stringify(receipt), receipt.createdAt);
        return {
            plan,
            receipt,
            after
        };
    };

    const applied = db.inTransaction ? execute() : db.transaction(execute).immediate();
    return { applied: true, plan: applied.plan, receipt: applied.receipt, after: applied.after };
}

function rollbackTranslationBackfill(options) {
    const db = options.db;
    const registry = options.registry;
    let receipt = options.receipt;
    if (!receipt && options.planHash) {
        const stored = db.prepare(`
            SELECT receipt_json FROM translation_backfill_receipts
            WHERE plan_hash = ? AND state = 'applied'
        `).get(String(options.planHash));
        if (stored) receipt = JSON.parse(stored.receipt_json);
    }
    if (!receipt || receipt.receiptVersion !== 1 || !Array.isArray(receipt.createdRevisions)) {
        throw new TranslationError('INVALID_RECEIPT', 'A valid Stage B backfill receipt is required.', 422);
    }

    const execute = function () {
        const storedReceipt = db.prepare(`
            SELECT state, receipt_json FROM translation_backfill_receipts WHERE plan_hash = ?
        `).get(receipt.planHash);
        if (!storedReceipt || storedReceipt.state !== 'applied'
            || stableJson(JSON.parse(storedReceipt.receipt_json)) !== stableJson(receipt)) {
            throw new TranslationError('INVALID_RECEIPT', 'The database does not contain a matching applied backfill receipt.', 409);
        }
        const writer = createTranslationWriter({ db, registry });
        receipt.createdRevisions.forEach(function (item) {
            const config = ENTITY_CONFIG[item.entityType];
            if (!config) throw new TranslationError('INVALID_RECEIPT', 'Receipt contains an unknown entity type.', 422);
            const state = writer.getState({
                entityType: item.entityType,
                entityId: item.entityId,
                locale: item.locale
            });
            if (!state.published || Number(state.published.id) !== Number(item.revisionId)) {
                throw new TranslationError('ROLLBACK_STATE_CHANGED', 'Published translation changed after backfill.', 409);
            }
            if (state.draft || state.history.length) {
                throw new TranslationError('ROLLBACK_STATE_CHANGED', 'Translation history changed after backfill.', 409);
            }
            if (Number(state.published.revisionNo) !== Number(item.revisionNo)
                || Number(state.published.version) !== Number(item.version)
                || revisionContentHash(state.published) !== item.contentHash) {
                throw new TranslationError('ROLLBACK_STATE_CHANGED', 'Translation content changed after backfill.', 409);
            }
            const deleted = db.prepare(`
                DELETE FROM ${config.translationTable}
                WHERE id = ? AND ${config.foreignKey} = ? AND locale = ? AND revision_state = 'published'
            `).run(item.revisionId, item.entityId, item.locale);
            if (deleted.changes !== 1) {
                throw new TranslationError('ROLLBACK_STATE_CHANGED', 'Translation changed during rollback.', 409);
            }
        });
        db.prepare(`
            INSERT INTO audit_logs
                (entity_type, entity_id, action, performed_by, before_json, after_json, created_at)
            VALUES ('translation_backfill', 'stage-b', 'logical_rollback', @performed_by, @before_json, @after_json, @created_at)
        `).run({
            performed_by: options.actor && options.actor.username ? options.actor.username : 'translation-backfill-rollback',
            before_json: JSON.stringify({ planHash: receipt.planHash, revisionCount: receipt.createdRevisions.length }),
            after_json: JSON.stringify({ retainedSpecCodes: receipt.retainedSpecCodesOnLogicalRollback || [] }),
            created_at: Date.now()
        });
        const after = analyzeTranslationBackfill({ db, registry });
        if (after.blockers.length) {
            throw new TranslationError('ROLLBACK_INCOMPLETE', 'Translation backfill rollback produced blockers.', 500);
        }
        const updated = db.prepare(`
            UPDATE translation_backfill_receipts
            SET state = 'rolled_back', rolled_back_at = ?
            WHERE plan_hash = ? AND state = 'applied'
        `).run(Date.now(), receipt.planHash);
        if (updated.changes !== 1) {
            throw new TranslationError('ROLLBACK_STATE_CHANGED', 'Backfill receipt state changed during rollback.', 409);
        }
        return after;
    };

    const after = db.inTransaction ? execute() : db.transaction(execute).immediate();
    return {
        rolledBack: true,
        removedRevisions: receipt.createdRevisions.length,
        retainedSpecCodes: receipt.retainedSpecCodesOnLogicalRollback || [],
        after
    };
}

module.exports = {
    analyzeTranslationBackfill,
    applyTranslationBackfill,
    rollbackTranslationBackfill,
    planHash
};
