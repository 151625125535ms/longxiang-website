'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const { createVerifiedSqliteBackup } = require('../server/lib/sqliteBackup');
const { runMigrations } = require('../server/db/migrations');
const stageBMigration = require('../server/db/migrations/0007_translation_revisions');
const { loadLocaleRegistry, stableJson } = require('../server/lib/localeRegistry');
const {
    analyzeTranslationBackfill,
    applyTranslationBackfill
} = require('../server/lib/translationBackfill');
const {
    ContentOverlayMigrationError,
    analyzeContentOverlayMigration,
    applyContentOverlayMigration,
    rollbackContentOverlayMigration
} = require('../server/lib/contentOverlayMigration');
const {
    buildContentOverlaySnapshot,
    applyOverlay,
    structureHash
} = require('../server/lib/contentTranslationOverlay');
const {
    readLocalizedProducts,
    readLocalizedProduct,
    readLocalizedProductCategories,
    readLocalizedCertifications,
    readRevisionLocalizedProducts,
    readRevisionLocalizedProduct,
    readRevisionLocalizedProductCategories,
    readRevisionLocalizedCertifications
} = require('../server/lib/localizedPublicCatalog');
const {
    PUBLIC_SLUGS,
    readPublicContentBlock,
    compactLocalizedContentBlock
} = require('../server/lib/publicContentBlocks');
const { readRevisionLocalizedContentBlock, RevisionContentError } = require('../server/lib/revisionPublicContent');
const {
    createPublicTranslationReadAdapter,
    readRevisionCompatibleProduct
} = require('../server/lib/publicTranslationReadAdapter');
const { createRevisionLocalePublicationPolicy } = require('../server/lib/localePublicationPolicy');
const { renderProductDetailSeoHtml } = require('../server/lib/productDetailSeoRenderer');

const PROJECT_ROOT = path.join(__dirname, '..');
const SOURCE_DB = path.join(PROJECT_ROOT, 'data', 'longxiang.db');

function queryCounter(db) {
    let count = 0;
    const proxy = new Proxy(db, {
        get: function (target, property) {
            if (property === 'prepare') {
                return function (sql) {
                    count += 1;
                    return target.prepare(sql);
                };
            }
            const value = target[property];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
    return { db: proxy, count: function () { return count; } };
}

function legacyContentSnapshot(db, registry) {
    const locales = registry.publicEntries.map(function (entry) { return entry.code; });
    return Array.from(PUBLIC_SLUGS).sort().reduce(function (result, slug) {
        const block = readPublicContentBlock(slug, db);
        result[slug] = {
            raw: block,
            localized: locales.reduce(function (byLocale, locale) {
                byLocale[locale] = compactLocalizedContentBlock(block, locale, registry.entries.map(function (entry) { return entry.code; }));
                return byLocale;
            }, {})
        };
        return result;
    }, {});
}

function localizedCatalogSnapshot(db, registry) {
    return registry.publicEntries.reduce(function (result, entry) {
        const products = readLocalizedProducts(entry.code, db);
        const detailId = products[0] && (products[0].slug || products[0].id);
        result[entry.code] = {
            products,
            product: detailId ? readLocalizedProduct(detailId, entry.code, db) : null,
            categories: readLocalizedProductCategories(entry.code, db),
            certifications: readLocalizedCertifications(entry.code, db)
        };
        return result;
    }, {});
}

function revisionCatalogSnapshot(db, registry, baseline) {
    return registry.publicEntries.reduce(function (result, entry) {
        const detailId = baseline[entry.code].products[0]
            && (baseline[entry.code].products[0].slug || baseline[entry.code].products[0].id);
        result[entry.code] = {
            products: readRevisionLocalizedProducts(entry.code, db),
            product: detailId ? readRevisionLocalizedProduct(detailId, entry.code, db) : null,
            categories: readRevisionLocalizedProductCategories(entry.code, db),
            certifications: readRevisionLocalizedCertifications(entry.code, db)
        };
        return result;
    }, {});
}

function assertArrayIdentitySafety(db) {
    const row = db.prepare("SELECT slug, version, body_json FROM content_blocks WHERE slug = 'about-us'").get();
    const snapshot = buildContentOverlaySnapshot({
        slug: row.slug,
        contentVersion: row.version,
        body: JSON.parse(row.body_json),
        locales: ['en', 'ar', 'fr', 'ru']
    });
    const reordered = JSON.parse(JSON.stringify(snapshot.neutralBody));
    reordered.capability.cards.reverse();
    const localized = applyOverlay(reordered, snapshot.overlays.ar, snapshot.schema);
    const expectedById = new Map(snapshot.localizedTargets.ar.capability.cards.map(function (card) {
        return [card._translationId, card.title];
    }));
    localized.capability.cards.forEach(function (card) {
        assert.strictEqual(card.title, expectedById.get(card._translationId), 'reordered cards must retain translations by stable ID');
    });
    assert.notStrictEqual(
        structureHash(row.slug, reordered),
        snapshot.schema.baseStructureHash,
        'reordering must invalidate the published structure hash instead of silently reusing it'
    );
    const inserted = JSON.parse(JSON.stringify(snapshot.neutralBody));
    inserted.capability.cards.push({ _translationId: 'test-new-card', title: 'New card', text: 'New text' });
    assert.notStrictEqual(structureHash(row.slug, inserted), snapshot.schema.baseStructureHash);
    const removed = JSON.parse(JSON.stringify(snapshot.neutralBody));
    removed.capability.cards.pop();
    assert.notStrictEqual(structureHash(row.slug, removed), snapshot.schema.baseStructureHash);
}

function assertLegacyArrayMetadataInheritance() {
    const body = {
        sections: [{
            id: 'industry-college',
            title: 'Industry college',
            cards: [{
                id: 'training-base',
                title: 'Training base',
                text: 'English text',
                image: 'assets/images/education/training-base.webp',
                sort_order: 0,
                featured: true
            }]
        }],
        sectionsFr: [{
            id: 'industry-college',
            title: 'Collège industriel',
            cards: [{
                id: 'training-base',
                title: 'Base de formation',
                text: 'Texte français',
                image: 'assets/images/education/training-base.webp'
            }]
        }]
    };
    const snapshot = buildContentOverlaySnapshot({
        slug: 'education',
        contentVersion: 26,
        body,
        locales: ['en', 'ar', 'fr', 'ru']
    });
    assert.deepStrictEqual(snapshot.blockers, [], 'missing neutral numeric/boolean array metadata must inherit safely');
    assert.strictEqual(snapshot.localizedTargets.fr.sections[0].cards[0].sort_order, 0);
    assert.strictEqual(snapshot.localizedTargets.fr.sections[0].cards[0].featured, true);
    assert.strictEqual(Object.keys(snapshot.overlays.fr.values).some(function (item) { return /\/sort_order$/.test(item); }), false);
    assert.strictEqual(Object.keys(snapshot.overlays.fr.values).some(function (item) { return /\/image$/.test(item); }), false);
    assert.strictEqual(snapshot.schema.allowedPaths.some(function (item) { return /\/(?:sort_order|featured|image)$/.test(item); }), false);

    const resourceChange = JSON.parse(JSON.stringify(body));
    resourceChange.sectionsFr[0].cards[0].image = 'assets/images/education/unapproved.webp';
    const resourceSnapshot = buildContentOverlaySnapshot({
        slug: 'education',
        contentVersion: 26,
        body: resourceChange,
        locales: ['en', 'ar', 'fr', 'ru']
    });
    assert(resourceSnapshot.blockers.some(function (blocker) {
        return blocker.code === 'NON_TRANSLATABLE_DIFFERENCE' && blocker.locale === 'fr' && blocker.field === 'image';
    }), 'localized resource changes must remain blocked');

    const objectArrayExpansion = JSON.parse(JSON.stringify(body));
    objectArrayExpansion.sectionsFr[0].cards.push({ id: 'extra', title: 'Extra', text: 'Extra' });
    const expansionSnapshot = buildContentOverlaySnapshot({
        slug: 'education',
        contentVersion: 26,
        body: objectArrayExpansion,
        locales: ['en', 'ar', 'fr', 'ru']
    });
    assert(expansionSnapshot.blockers.some(function (blocker) {
        return blocker.code === 'UNSAFE_ARRAY_REPLACEMENT' && blocker.locale === 'fr';
    }), 'arbitrary object-array replacement must remain blocked');
}

function assertQueryBudgets(db, registry, sampleSlug) {
    let counter = queryCounter(db);
    const products = readRevisionLocalizedProducts('en', counter.db);
    assert(products.length > 0);
    assert(counter.count() <= 3, 'revision product list exceeded query budget: ' + counter.count());

    counter = queryCounter(db);
    const detail = readRevisionLocalizedProduct(sampleSlug, 'ar', counter.db);
    assert(detail);
    assert(counter.count() <= 4, 'revision product detail exceeded query budget: ' + counter.count());

    counter = queryCounter(db);
    const content = readRevisionLocalizedContentBlock('about-us', 'fr', counter.db, registry);
    assert(content);
    assert.strictEqual(counter.count(), 1, 'ordinary revision content reads should use one query');

    counter = queryCounter(db);
    const policy = createRevisionLocalePublicationPolicy({ db: counter.db, registry });
    const matrix = policy.publicationMatrix({ entityType: 'product' });
    assert(Object.keys(matrix).length > 0);
    assert.strictEqual(counter.count(), 1, 'batch publication matrix must use one query');
}

function assertSeoParity(db, registry) {
    const legacy = createPublicTranslationReadAdapter({ db, registry, source: 'legacy' }).readProducts()[0];
    const revision = readRevisionCompatibleProduct(legacy.slug || legacy.id, db);
    const template = '<!doctype html><html><head><title>placeholder</title></head><body></body></html>';
    registry.publicEntries.forEach(function (entry) {
        assert.strictEqual(
            renderProductDetailSeoHtml(template, revision, entry, 'https://www.lxenelectric.com'),
            renderProductDetailSeoHtml(template, legacy, entry, 'https://www.lxenelectric.com'),
            'SSR SEO output changed for ' + entry.code
        );
    });
}

async function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-stage-c1-'));
    const dbPath = path.join(tempDir, 'stage-c1.db');
    let db;
    try {
        assertLegacyArrayMetadataInheritance();
        await createVerifiedSqliteBackup({ sourcePath: SOURCE_DB, backupPath: dbPath });
        db = new Database(dbPath, { fileMustExist: true });
        db.pragma('foreign_keys = ON');
        stageBMigration.up(db);
        const migrationResult = runMigrations(db);
        assert.strictEqual(migrationResult.latest, 8);
        assert.strictEqual(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version, 8);
        runMigrations(db);

        const registry = loadLocaleRegistry();
        const expectedContentBlocks = Number(db.prepare("SELECT COUNT(*) AS count FROM content_blocks WHERE status = 'published'").get().count);
        const expectedLocales = registry.publicEntries.length;
        const stageB = analyzeTranslationBackfill({ db, registry });
        if (stageB.specCodes.length || stageB.revisions.length) {
            assert.strictEqual(stageB.blockers.length, 0, 'Stage B fixture preparation must not have blockers');
            applyTranslationBackfill({ db, registry, expectedPlanHash: stageB.planHash, actor: { username: 'stage-c1-test' } });
        }

        const baselineCatalog = localizedCatalogSnapshot(db, registry);
        const baselineContent = legacyContentSnapshot(db, registry);
        const baselineLegacyProducts = createPublicTranslationReadAdapter({ db, registry, source: 'legacy' }).readProducts();
        const beforeRows = db.prepare(`
            SELECT id, body_json, version, updated_at FROM content_blocks ORDER BY id
        `).all();

        const dryRun = analyzeContentOverlayMigration({ db, registry });
        assert.strictEqual(dryRun.blockers.length, 0, JSON.stringify(dryRun.blockers, null, 2));
        assert.strictEqual(dryRun.summary.contentBlocksChecked, expectedContentBlocks);
        assert.strictEqual(dryRun.summary.contentBlocksToMigrate, expectedContentBlocks);
        assert.strictEqual(dryRun.summary.revisionsToCreate, expectedContentBlocks * expectedLocales);
        assert(dryRun.summary.stableIdsToPersist > 0);
        assert.strictEqual(analyzeContentOverlayMigration({ db, registry }).planHash, dryRun.planHash, 'unchanged dry-runs must keep a stable plan hash');
        assert.strictEqual(stableJson(db.prepare('SELECT id, body_json, version, updated_at FROM content_blocks ORDER BY id').all()), stableJson(beforeRows), 'dry-run must not write content blocks');
        assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM content_overlay_migration_receipts').get().count, 0, 'dry-run must not create receipts');

        const driftRow = db.prepare("SELECT id, body_json FROM content_blocks WHERE slug = 'about-us'").get();
        const driftBody = JSON.parse(driftRow.body_json);
        driftBody._stageC1Probe = true;
        db.prepare('UPDATE content_blocks SET body_json = ? WHERE id = ?').run(JSON.stringify(driftBody), driftRow.id);
        assert.throws(function () {
            applyContentOverlayMigration({ db, registry, expectedPlanHash: dryRun.planHash });
        }, function (error) {
            return error instanceof ContentOverlayMigrationError && error.code === 'PLAN_CHANGED';
        });
        db.prepare('UPDATE content_blocks SET body_json = ? WHERE id = ?').run(driftRow.body_json, driftRow.id);
        assert.strictEqual(analyzeContentOverlayMigration({ db, registry }).planHash, dryRun.planHash, 'restoring the source must restore the approved plan hash');

        const applied = applyContentOverlayMigration({
            db,
            registry,
            expectedPlanHash: dryRun.planHash,
            actor: { username: 'stage-c1-test' }
        });
        assert.strictEqual(applied.after.blockers.length, 0);
        assert.strictEqual(applied.after.blocks.length, 0);
        assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM content_translation_schemas').get().count, 15);
        assert.strictEqual(db.prepare("SELECT state FROM content_overlay_migration_receipts WHERE plan_hash = ?").get(applied.receipt.planHash).state, 'applied');

        const revisionCatalog = revisionCatalogSnapshot(db, registry, baselineCatalog);
        assert.deepStrictEqual(revisionCatalog, baselineCatalog, 'localized API output must remain unchanged after switching the test reader to revisions');
        Object.keys(baselineContent).forEach(function (slug) {
            const legacyAfter = readPublicContentBlock(slug, db);
            assert.strictEqual(legacyAfter.id, baselineContent[slug].raw.id);
            assert.strictEqual(legacyAfter.slug, baselineContent[slug].raw.slug);
            assert.strictEqual(legacyAfter.title, baselineContent[slug].raw.title);
            assert.strictEqual(legacyAfter.titleAr, baselineContent[slug].raw.titleAr);
            assert.deepStrictEqual(legacyAfter.body, baselineContent[slug].raw.body, 'legacy content body changed for ' + slug);
            registry.publicEntries.forEach(function (entry) {
                const revisionContent = readRevisionLocalizedContentBlock(slug, entry.code, db, registry);
                const baseline = baselineContent[slug].localized[entry.code];
                assert.strictEqual(revisionContent.id, baseline.id);
                assert.strictEqual(revisionContent.slug, baseline.slug);
                assert.strictEqual(revisionContent.title, baseline.title);
                assert.deepStrictEqual(revisionContent.body, baseline.body, 'revision content body changed for ' + slug + '/' + entry.code);
                assert.strictEqual(revisionContent.localization.requestedLocale, entry.code);
                assert.strictEqual(revisionContent.localization.fallbackApplied, false);
            });
        });

        const revisionAdapter = createPublicTranslationReadAdapter({ db, registry, source: 'revision' });
        assert.deepStrictEqual(revisionAdapter.readProducts(), baselineLegacyProducts, 'legacy-compatible product shape changed');
        const compatibleDetailId = baselineLegacyProducts[0].slug || baselineLegacyProducts[0].id;
        assert.deepStrictEqual(
            revisionAdapter.readProduct(compatibleDetailId),
            createPublicTranslationReadAdapter({ db, registry, source: 'legacy' }).readProduct(compatibleDetailId),
            'legacy-compatible product detail including gallery changed'
        );
        assert.strictEqual(createPublicTranslationReadAdapter({ db, registry }).source, 'legacy', 'read switch must default to legacy');
        assertArrayIdentitySafety(db);
        const sampleSlug = baselineCatalog.en.products[0].slug || baselineCatalog.en.products[0].id;
        assertQueryBudgets(db, registry, sampleSlug);
        assertSeoParity(db, registry);

        const structureRow = db.prepare("SELECT body_json FROM content_blocks WHERE slug = 'about-us'").get();
        const changedBody = JSON.parse(structureRow.body_json);
        changedBody.capability.cards.push({ _translationId: 'post-publish-change', title: 'Changed', text: 'Changed' });
        db.prepare("UPDATE content_blocks SET body_json = ? WHERE slug = 'about-us'").run(JSON.stringify(changedBody));
        assert.throws(function () {
            readRevisionLocalizedContentBlock('about-us', 'en', db, registry);
        }, function (error) {
            return error instanceof RevisionContentError && error.code === 'STRUCTURE_HASH_MISMATCH';
        }, 'structure drift must fail closed');
        db.prepare("UPDATE content_blocks SET body_json = ? WHERE slug = 'about-us'").run(structureRow.body_json);

        const receiptBlock = applied.receipt.blocks[0];
        const receiptLocale = applied.receipt.locales[0];
        const protectedRevision = receiptBlock.applied.revisions[receiptLocale];
        const protectedRow = db.prepare('SELECT updated_by FROM content_block_translations WHERE id = ?').get(protectedRevision.id);
        db.prepare("UPDATE content_block_translations SET updated_by = 'rollback-drift-probe' WHERE id = ?").run(protectedRevision.id);
        assert.throws(function () {
            rollbackContentOverlayMigration({ db, registry, planHash: applied.receipt.planHash });
        }, function (error) {
            return error instanceof ContentOverlayMigrationError && error.code === 'ROLLBACK_STATE_CHANGED';
        }, 'rollback must reject revision metadata drift');
        db.prepare('UPDATE content_block_translations SET updated_by = ? WHERE id = ?').run(protectedRow.updated_by, protectedRevision.id);

        const protectedSchema = receiptBlock.applied.schema;
        const schemaRowBeforeProbe = db.prepare('SELECT structure_hash FROM content_translation_schemas WHERE id = ?').get(protectedSchema.id);
        db.prepare("UPDATE content_translation_schemas SET structure_hash = 'rollback-drift-probe' WHERE id = ?").run(protectedSchema.id);
        assert.throws(function () {
            rollbackContentOverlayMigration({ db, registry, planHash: applied.receipt.planHash });
        }, function (error) {
            return error instanceof ContentOverlayMigrationError && error.code === 'ROLLBACK_STATE_CHANGED';
        }, 'rollback must reject schema drift');
        db.prepare('UPDATE content_translation_schemas SET structure_hash = ? WHERE id = ?').run(schemaRowBeforeProbe.structure_hash, protectedSchema.id);

        const rolledBack = rollbackContentOverlayMigration({
            db,
            registry,
            planHash: applied.receipt.planHash,
            actor: { username: 'stage-c1-test' }
        });
        assert.strictEqual(rolledBack.after.blockers.length, 0);
        assert.strictEqual(rolledBack.after.blocks.length, expectedContentBlocks);
        assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM content_translation_schemas').get().count, 0);
        const rolledBackRows = db.prepare('SELECT id, body_json, version, updated_at FROM content_blocks ORDER BY id').all();
        if (stableJson(rolledBackRows) !== stableJson(beforeRows)) {
            const differences = beforeRows.map(function (before, index) {
                const after = rolledBackRows[index];
                return {
                    id: before.id,
                    bodyMatches: Boolean(after && after.body_json === before.body_json),
                    beforeVersion: before.version,
                    afterVersion: after && after.version,
                    beforeUpdatedAt: before.updated_at,
                    afterUpdatedAt: after && after.updated_at
                };
            }).filter(function (item) {
                return !item.bodyMatches || item.beforeVersion !== item.afterVersion || item.beforeUpdatedAt !== item.afterUpdatedAt;
            });
            assert.fail('rollback must restore content block rows: ' + JSON.stringify(differences));
        }

        const reapplied = applyContentOverlayMigration({
            db,
            registry,
            expectedPlanHash: rolledBack.after.planHash,
            actor: { username: 'stage-c1-test' }
        });
        assert.strictEqual(reapplied.after.blocks.length, 0);
        assert.strictEqual(reapplied.after.blockers.length, 0);
        console.log(JSON.stringify({
            ok: true,
            schemaVersion: 8,
            contentBlocks: dryRun.summary.contentBlocksChecked,
            revisionsCreated: dryRun.summary.revisionsToCreate,
            stableIds: dryRun.summary.stableIdsToPersist,
            planHash: dryRun.planHash
        }, null, 2));
    } finally {
        if (db) db.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch(function (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
