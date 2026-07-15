'use strict';

const migrations = [
    require('./0002_runtime_schema_baseline'),
    require('./0003_i18n_fr_ru_fields'),
    require('./0004_products_name_cn_model'),
    require('./0005_company_identity'),
    require('./0006_product_arabic_seo_fields'),
    require('./0007_translation_revisions')
];

function ensureMigrationTable(db) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at INTEGER NOT NULL
        )
    `).run();
}

function appliedVersions(db) {
    ensureMigrationTable(db);
    return new Set(
        db.prepare('SELECT version FROM schema_migrations').all().map(function (row) {
            return row.version;
        })
    );
}

function runMigrations(db) {
    ensureMigrationTable(db);
    const applied = appliedVersions(db);
    const sorted = migrations
        .slice()
        .sort(function (a, b) { return a.version - b.version; });
    const pending = sorted.filter(function (migration) { return !applied.has(migration.version); });

    pending.forEach(function (migration) {
        db.transaction(function () {
            migration.up(db);
            db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
                .run(migration.version, migration.name, Date.now());
        })();
    });

    return {
        checked: migrations.length,
        applied: pending.length,
        latest: sorted.length ? sorted[sorted.length - 1].version : 1
    };
}

module.exports = {
    runMigrations,
    ensureMigrationTable
};
