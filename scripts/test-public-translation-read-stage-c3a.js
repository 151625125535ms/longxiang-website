'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const presentation = require('../js/content-page-presentation');
const { createVerifiedSqliteBackup } = require('../server/lib/sqliteBackup');
const { runMigrations } = require('../server/db/migrations');
const stageBMigration = require('../server/db/migrations/0007_translation_revisions');
const { loadLocaleRegistry } = require('../server/lib/localeRegistry');
const { analyzeTranslationBackfill, applyTranslationBackfill } = require('../server/lib/translationBackfill');
const { analyzeContentOverlayMigration, applyContentOverlayMigration } = require('../server/lib/contentOverlayMigration');
const {
    PublicTranslationReadError,
    resolvePublicTranslationReadSource,
    createPublicTranslationReadAdapter,
    createRuntimePublicTranslationReadAdapter
} = require('../server/lib/publicTranslationReadAdapter');
const {
    comparePublicTranslationSources,
    databaseFingerprint,
    compactPreview,
    approvedEducationSortOrderMetadata,
    approvedAboutSsrCompanyFieldMetadata
} = require('../server/lib/publicTranslationReadParity');
const {
    analyzeContentTranslationParityRepair,
    applyContentTranslationParityRepair,
    rollbackContentTranslationParityRepair,
    localizedAboutSnapshotRows
} = require('../server/lib/contentTranslationParityRepair');

const SOURCE_DB = path.join(__dirname, '..', 'data', 'longxiang.db');

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
    return {
        db: proxy,
        count: function () { return count; },
        reset: function () { count = 0; }
    };
}

function prepareRevisionData(db, registry) {
    stageBMigration.up(db);
    runMigrations(db);
    const backfill = analyzeTranslationBackfill({ db, registry });
    assert.strictEqual(backfill.blockers.length, 0, JSON.stringify(backfill.blockers, null, 2));
    if (backfill.specCodes.length || backfill.revisions.length) {
        applyTranslationBackfill({
            db,
            registry,
            expectedPlanHash: backfill.planHash,
            actor: { username: 'stage-c3a-test' }
        });
    }
    const overlays = analyzeContentOverlayMigration({ db, registry });
    assert.strictEqual(overlays.blockers.length, 0, JSON.stringify(overlays.blockers, null, 2));
    if (overlays.blocks.length) {
        applyContentOverlayMigration({
            db,
            registry,
            expectedPlanHash: overlays.planHash,
            actor: { username: 'stage-c3a-test' }
        });
    }
}

function assertSourceSwitch(db, registry) {
    assert.strictEqual(resolvePublicTranslationReadSource(), 'legacy');
    assert.strictEqual(resolvePublicTranslationReadSource(''), 'legacy');
    assert.strictEqual(resolvePublicTranslationReadSource('legacy'), 'legacy');
    assert.strictEqual(resolvePublicTranslationReadSource('revision'), 'revision');
    assert.throws(function () {
        resolvePublicTranslationReadSource('unexpected');
    }, function (error) {
        return error instanceof PublicTranslationReadError
            && error.code === 'INVALID_PUBLIC_TRANSLATION_READ_SOURCE';
    });
    assert.strictEqual(createRuntimePublicTranslationReadAdapter({ db, registry, env: {} }).source, 'legacy');
    assert.strictEqual(createRuntimePublicTranslationReadAdapter({
        db,
        registry,
        env: { PUBLIC_TRANSLATION_READ_SOURCE: 'revision' }
    }).source, 'revision');
}

function assertMissingRevisionFailsClosed(db, registry) {
    const row = db.prepare(`
        SELECT id FROM product_translations
        WHERE revision_state = 'published' AND locale = 'ar'
        ORDER BY id LIMIT 1
    `).get();
    assert(row, 'missing published Arabic product revision fixture');
    db.prepare("UPDATE product_translations SET revision_state = 'draft' WHERE id = ?").run(row.id);
    try {
        assert.throws(function () {
            createPublicTranslationReadAdapter({ db, registry, source: 'revision' });
        }, function (error) {
            return error instanceof PublicTranslationReadError
                && error.code === 'REVISION_SOURCE_NOT_READY';
        });
    } finally {
        db.prepare("UPDATE product_translations SET revision_state = 'published' WHERE id = ?").run(row.id);
    }
}

function assertQueryBudgets(db, registry) {
    const counted = queryCounter(db);
    const reader = createPublicTranslationReadAdapter({ db: counted.db, registry, source: 'revision' });
    const sample = reader.readProducts()[0];
    const identifier = sample.slug || sample.id;

    counted.reset();
    const products = reader.readPresentationProducts('en');
    assert(products.length > 0);
    assert(counted.count() <= 9, 'revision presentation list exceeded query budget: ' + counted.count());

    counted.reset();
    assert(reader.readPresentationProduct(identifier, 'ar'));
    assert(counted.count() <= 11, 'revision presentation detail exceeded query budget: ' + counted.count());

    counted.reset();
    assert(reader.readLocalizedContentBlock('about-us', 'fr'));
    assert.strictEqual(counted.count(), 1, 'revision content read must use one query');
}

function assertParityDifferenceClassifiers() {
    assert.strictEqual(compactPreview(undefined), 'undefined');
    const legacy = { body: { sections: [{ cards: [{ title: 'same' }] }] } };
    const revision = { body: { sections: [{ cards: [{ title: 'same', sort_order: 0 }] }] } };
    assert(approvedEducationSortOrderMetadata(legacy, revision));
    assert.strictEqual(approvedEducationSortOrderMetadata(legacy, {
        body: { sections: [{ cards: [{ title: 'changed', sort_order: 0 }] }] }
    }), '');
    assert.strictEqual(approvedEducationSortOrderMetadata({ sort_order: undefined }, { sort_order: 0 }), '');
    const legacyAboutHtml = '<p>intro</p><p>detail</p>';
    const revisionAboutHtml = '<p data-company-field="aboutIntro">intro</p>'
        + '<p data-company-field="aboutDetail">detail</p>';
    assert(approvedAboutSsrCompanyFieldMetadata(legacyAboutHtml, revisionAboutHtml));
    assert.strictEqual(approvedAboutSsrCompanyFieldMetadata(
        legacyAboutHtml,
        revisionAboutHtml.replace('detail</p>', 'changed</p>')
    ), '');
}

function assertStringAboutSsrBaseline(db, registry) {
    const row = db.prepare("SELECT body_json FROM content_blocks WHERE slug = 'about-us'").get();
    const body = JSON.parse(row.body_json);
    const localized = presentation.localizeTree(body, 'fr').snapshot.body;
    body.snapshot.bodyPatchFr = localized.reduce(function (out, item, index) {
        out['index_' + index] = typeof item === 'string' ? item : item.text;
        return out;
    }, {});
    const rows = localizedAboutSnapshotRows(
        body,
        'fr',
        registry.publicEntries.map(function (entry) { return entry.code; })
    );
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(rows[0].companyField, 'aboutIntro');
    assert.strictEqual(rows[1].companyField, 'aboutDetail');
    assert(rows.every(function (item) { return typeof item.text === 'string'; }));
}

function restoreLegacyAboutArrayShape(db) {
    const block = db.prepare("SELECT id, body_json FROM content_blocks WHERE slug = 'about-us'").get();
    const body = JSON.parse(block.body_json);
    ['fr', 'ru'].forEach(function (locale) {
        const localized = presentation.localizeTree(body, locale);
        const rows = localized.snapshot.body.map(function (item) {
            return typeof item === 'string' ? item : item.text;
        });
        assert(rows.every(function (value) { return typeof value === 'string' && value.length > 0; }));
        const revision = db.prepare(`
            SELECT * FROM content_block_translations
            WHERE content_block_id = ? AND locale = ? AND revision_state = 'published'
        `).get(block.id, locale);
        const overlay = JSON.parse(revision.translation_json);
        overlay.replacements = Object.assign({}, overlay.replacements, { '/snapshot/body': rows });
        Object.keys(overlay.values || {}).forEach(function (overlayPath) {
            if (overlayPath.indexOf('/snapshot/body/') === 0) delete overlay.values[overlayPath];
        });
        db.transaction(function () {
            const now = Date.now();
            db.prepare(`
                UPDATE content_block_translations
                SET revision_state = 'archived', version = version + 1, updated_at = ?
                WHERE id = ? AND revision_state = 'published'
            `).run(now, revision.id);
            db.prepare(`
                INSERT INTO content_block_translations
                    (content_block_id, locale, revision_no, revision_state, base_revision_id,
                     title, schema_version, translation_json, base_structure_hash, version,
                     created_by, updated_by, created_at, updated_at, published_at)
                VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
            `).run(
                revision.content_block_id,
                locale,
                revision.revision_no + 1,
                revision.id,
                revision.title,
                revision.schema_version,
                JSON.stringify(overlay),
                revision.base_structure_hash,
                'stage-c3a-production-shape',
                'stage-c3a-production-shape',
                now,
                now,
                now
            );
        }).immediate();
    });
}

async function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'longxiang-stage-c3a-'));
    const dbPath = path.join(tempDir, 'stage-c3a.db');
    let db;
    try {
        await createVerifiedSqliteBackup({ sourcePath: SOURCE_DB, backupPath: dbPath });
        db = new Database(dbPath, { fileMustExist: true });
        db.pragma('foreign_keys = ON');
        const registry = loadLocaleRegistry();
        prepareRevisionData(db, registry);
        assertParityDifferenceClassifiers();
        assertStringAboutSsrBaseline(db, registry);
        assertSourceSwitch(db, registry);
        assertMissingRevisionFailsClosed(db, registry);
        assertQueryBudgets(db, registry);

        const beforeRepair = comparePublicTranslationSources({ db, registry });
        assert(beforeRepair.blockers.some(function (blocker) {
            return blocker.name === 'ssr/static/ar/about.html';
        }), 'the local fixture must reproduce the Arabic About data parity blocker');
        [
            'ssr/static/fr/contact.html',
            'ssr/static/ru/contact.html'
        ].forEach(function (name) {
            assert(!beforeRepair.blockers.some(function (blocker) {
                return blocker.name === name;
            }), 'the presentation adapter must resolve the Contact parity blocker before data repair: ' + name);
        });
        const unrelatedDraft = db.prepare(`
            INSERT INTO content_block_translations
                (content_block_id, locale, revision_no, revision_state, base_revision_id,
                 title, schema_version, translation_json, base_structure_hash, version,
                 created_by, updated_by, created_at, updated_at, published_at)
            SELECT
                published.content_block_id, published.locale,
                (SELECT COALESCE(MAX(existing.revision_no), 0) + 1
                 FROM content_block_translations existing
                 WHERE existing.content_block_id = published.content_block_id AND existing.locale = published.locale),
                'draft', published.id, published.title, published.schema_version,
                published.translation_json, published.base_structure_hash, 1,
                'stage-c3a-test', 'stage-c3a-test', ?, ?, NULL
            FROM content_block_translations published
            JOIN content_blocks block ON block.id = published.content_block_id
            WHERE block.slug = 'about-us' AND published.locale = 'en'
                AND published.revision_state = 'published'
            LIMIT 1
        `).run(Date.now(), Date.now());
        assert.strictEqual(unrelatedDraft.changes, 1, 'failed to create unrelated English draft fixture');
        const planWithUnrelatedDraft = analyzeContentTranslationParityRepair({ db, registry });
        assert(!planWithUnrelatedDraft.blockers.some(function (blocker) {
            return blocker.code === 'DRAFT_CONFLICT';
        }), 'an unrelated locale draft must not block the approved About repair locales');
        db.prepare('DELETE FROM content_block_translations WHERE id = ?').run(Number(unrelatedDraft.lastInsertRowid));
        const targetDraft = db.prepare(`
            INSERT INTO content_block_translations
                (content_block_id, locale, revision_no, revision_state, base_revision_id,
                 title, schema_version, translation_json, base_structure_hash, version,
                 created_by, updated_by, created_at, updated_at, published_at)
            SELECT
                published.content_block_id, published.locale,
                (SELECT COALESCE(MAX(existing.revision_no), 0) + 1
                 FROM content_block_translations existing
                 WHERE existing.content_block_id = published.content_block_id AND existing.locale = published.locale),
                'draft', published.id, published.title, published.schema_version,
                published.translation_json, published.base_structure_hash, 1,
                'stage-c3a-test', 'stage-c3a-test', ?, ?, NULL
            FROM content_block_translations published
            JOIN content_blocks block ON block.id = published.content_block_id
            WHERE block.slug = 'about-us' AND published.locale = 'fr'
                AND published.revision_state = 'published'
            LIMIT 1
        `).run(Date.now(), Date.now());
        assert.strictEqual(targetDraft.changes, 1, 'failed to create target French draft fixture');
        const blockedByTargetDraft = analyzeContentTranslationParityRepair({ db, registry });
        assert(blockedByTargetDraft.blockers.some(function (blocker) {
            return blocker.code === 'DRAFT_CONFLICT' && blocker.locale === 'fr';
        }), 'a target locale draft must block the multi-locale About repair');
        db.prepare('DELETE FROM content_block_translations WHERE id = ?').run(Number(targetDraft.lastInsertRowid));
        const repairPlan = analyzeContentTranslationParityRepair({ db, registry });
        assert.strictEqual(repairPlan.blockers.length, 0, JSON.stringify(repairPlan.blockers, null, 2));
        assert.strictEqual(repairPlan.changes.length, 1);
        assert.strictEqual(analyzeContentTranslationParityRepair({ db, registry }).planHash, repairPlan.planHash);
        const repaired = applyContentTranslationParityRepair({
            db,
            registry,
            expectedPlanHash: repairPlan.planHash,
            actor: { username: 'stage-c3a-test' }
        });
        assert.strictEqual(repaired.after.changes.length, 0);
        rollbackContentTranslationParityRepair({
            db,
            receipt: repaired.receipt,
            actor: { username: 'stage-c3a-test' }
        });
        const restoredPlan = analyzeContentTranslationParityRepair({ db, registry });
        assert.strictEqual(restoredPlan.planHash, repairPlan.planHash, 'rollback must restore the same approved repair plan');
        applyContentTranslationParityRepair({
            db,
            registry,
            expectedPlanHash: restoredPlan.planHash,
            actor: { username: 'stage-c3a-test' }
        });

        restoreLegacyAboutArrayShape(db);
        const productionShapeParity = comparePublicTranslationSources({ db, registry });
        ['ssr/static/fr/about.html', 'ssr/static/ru/about.html'].forEach(function (name) {
            assert(productionShapeParity.blockers.some(function (blocker) { return blocker.name === name; }),
                'production-shaped fixture must reproduce About SSR blocker: ' + name);
        });
        const multiLocalePlan = analyzeContentTranslationParityRepair({ db, registry });
        assert.strictEqual(multiLocalePlan.blockers.length, 0, JSON.stringify(multiLocalePlan.blockers, null, 2));
        assert.deepStrictEqual(multiLocalePlan.changes.map(function (change) { return change.locale; }), ['fr', 'ru']);
        const multiLocaleRepair = applyContentTranslationParityRepair({
            db,
            registry,
            expectedPlanHash: multiLocalePlan.planHash,
            actor: { username: 'stage-c3a-test' }
        });
        assert.strictEqual(multiLocaleRepair.receipt.receiptVersion, 2);
        assert.strictEqual(multiLocaleRepair.receipt.repairs.length, 2);
        assert.strictEqual(multiLocaleRepair.after.changes.length, 0);
        rollbackContentTranslationParityRepair({
            db,
            receipt: multiLocaleRepair.receipt,
            actor: { username: 'stage-c3a-test' }
        });
        const restoredMultiLocalePlan = analyzeContentTranslationParityRepair({ db, registry });
        assert.strictEqual(restoredMultiLocalePlan.planHash, multiLocalePlan.planHash,
            'multi-locale rollback must restore the same approved repair plan');
        applyContentTranslationParityRepair({
            db,
            registry,
            expectedPlanHash: restoredMultiLocalePlan.planHash,
            actor: { username: 'stage-c3a-test' }
        });

        const before = databaseFingerprint(db);
        db.pragma('query_only = ON');
        const parity = comparePublicTranslationSources({ db, registry });
        const after = databaseFingerprint(db);
        assert.strictEqual(after.hash, before.hash, 'read parity audit changed database state');
        assert.strictEqual(parity.summary.blockers, 0, JSON.stringify(parity.blockers.slice(0, 10), null, 2));
        process.stdout.write(JSON.stringify({
            ok: true,
            sourceDefault: 'legacy',
            schemaVersion: before.state.schemaVersion,
            parity: parity.summary,
            databaseUnchanged: before.hash === after.hash
        }, null, 2) + '\n');
    } finally {
        if (db) db.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
