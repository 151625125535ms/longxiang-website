const Database = require('better-sqlite3');
const { resolveDbPath } = require('../server/lib/db');
const {
    loadLocaleConfig,
    sitemapLocaleEntries,
    staticPagesForSitemap
} = require('./i18n-page-model');

function openReadonlyDb(dbPath) {
    const db = new Database(dbPath || resolveDbPath(), { readonly: true, fileMustExist: true });
    db.pragma('query_only = ON');
    return db;
}

function countEligibleProducts(db) {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.type = 'product'
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
    `).get().count;
}

function expectedSitemapUrlCount(options) {
    const opts = options || {};
    const localeConfig = opts.localeConfig || loadLocaleConfig(opts.localeConfigPath);
    const sitemapLocales = sitemapLocaleEntries(localeConfig);
    const staticUrlCount = staticPagesForSitemap(localeConfig).length;
    const closeDb = !opts.db;
    const db = opts.db || openReadonlyDb(opts.dbPath);

    try {
        const eligibleProductCount = countEligibleProducts(db);
        const sitemapLocaleCount = sitemapLocales.length;
        const productUrlCount = eligibleProductCount * sitemapLocaleCount;

        return {
            staticUrlCount,
            eligibleProductCount,
            sitemapLocaleCount,
            productUrlCount,
            expectedUrlCount: staticUrlCount + productUrlCount
        };
    } finally {
        if (closeDb) db.close();
    }
}

module.exports = {
    countEligibleProducts,
    expectedSitemapUrlCount,
    openReadonlyDb
};
