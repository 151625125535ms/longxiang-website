'use strict';

const { getDb } = require('./db');
const { loadLocaleRegistry } = require('./localeRegistry');
const { readPublicProducts, readPublicProduct } = require('./publicProducts');
const { readPublicProductCategories } = require('./publicProductTaxonomy');
const {
    readLocalizedProducts,
    readLocalizedProduct,
    readLocalizedProductCategories,
    readLocalizedCertifications,
    readRevisionLocalizedProducts,
    readRevisionLocalizedProduct,
    readRevisionLocalizedProductCategories,
    readRevisionLocalizedCertifications
} = require('./localizedPublicCatalog');
const {
    readPublicContentBlock,
    compactLocalizedContentBlock
} = require('./publicContentBlocks');
const { readRevisionLocalizedContentBlock } = require('./revisionPublicContent');

const LOCALE_SUFFIX = Object.freeze({ en: '', ar: 'Ar', fr: 'Fr', ru: 'Ru' });

function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce(function (result, key) {
        result[key] = clone(value[key]);
        return result;
    }, {});
}

function revisionRows(db, table, foreignKey) {
    const entityTable = table === 'product_translations' ? 'products' : 'categories';
    const identityColumns = entityTable === 'products'
        ? 'entity.legacy_id, entity.slug'
        : 'NULL AS legacy_id, entity.slug';
    return db.prepare(`
        SELECT translation.*, ${identityColumns}
        FROM ${table} translation
        JOIN ${entityTable} entity
            ON entity.id = translation.${foreignKey}
        WHERE translation.revision_state = 'published'
        ORDER BY translation.${foreignKey}, translation.locale
    `).all();
}

function applyProductRevisions(products, rows) {
    const byIdentifier = new Map(products.map(function (product) {
        return [String(product.id), product];
    }));
    rows.forEach(function (row) {
        const product = byIdentifier.get(String(row.legacy_id));
        const suffix = LOCALE_SUFFIX[String(row.locale).toLowerCase()];
        if (!product || suffix === undefined) return;
        product['name' + suffix] = row.name || '';
        product['shortDesc' + suffix] = row.short_description || '';
        product['description' + suffix] = row.description || '';
        product['seoTitle' + suffix] = row.seo_title || '';
        product['seoDescription' + suffix] = row.seo_description || '';
        const keywordsKey = 'seoKeywords' + suffix;
        if (Object.prototype.hasOwnProperty.call(product, keywordsKey)) product[keywordsKey] = row.seo_keywords || '';
    });
    return products;
}

function readRevisionCompatibleProducts(dbValue) {
    const db = dbValue || getDb();
    return applyProductRevisions(
        readPublicProducts(db).map(clone),
        revisionRows(db, 'product_translations', 'product_id')
    );
}

function readRevisionCompatibleProduct(identifier, dbValue) {
    const value = String(identifier || '');
    if (!value) return null;
    const db = dbValue || getDb();
    const direct = readPublicProduct(value, db);
    if (!direct) return null;
    return applyProductRevisions(
        [clone(direct)],
        revisionRows(db, 'product_translations', 'product_id').filter(function (row) {
            return String(row.legacy_id) === String(direct.id);
        })
    )[0] || null;
}

function readRevisionCompatibleProductCategories(dbValue) {
    const db = dbValue || getDb();
    const groups = readPublicProductCategories(db).map(clone);
    const rows = revisionRows(db, 'category_translations', 'category_id');
    const bySlug = rows.reduce(function (result, row) {
        if (!result[row.slug]) result[row.slug] = {};
        result[row.slug][String(row.locale).toLowerCase()] = row.name || '';
        return result;
    }, {});
    groups.forEach(function (group) {
        const groupNames = bySlug[group.group] || {};
        Object.keys(LOCALE_SUFFIX).forEach(function (locale) {
            const suffix = LOCALE_SUFFIX[locale];
            if (groupNames[locale]) group['label' + suffix] = groupNames[locale];
        });
        group.children.forEach(function (child) {
            const names = bySlug[child.sub] || {};
            Object.keys(LOCALE_SUFFIX).forEach(function (locale) {
                const suffix = LOCALE_SUFFIX[locale];
                if (names[locale]) child['label' + suffix] = names[locale];
            });
        });
    });
    return groups;
}

function createPublicTranslationReadAdapter(options) {
    options = options || {};
    const db = options.db || getDb();
    const registry = options.registry || loadLocaleRegistry();
    const source = options.source === 'revision' ? 'revision' : 'legacy';
    return Object.freeze({
        source,
        readProducts: function () {
            return source === 'revision' ? readRevisionCompatibleProducts(db) : readPublicProducts(db);
        },
        readProduct: function (identifier) {
            return source === 'revision' ? readRevisionCompatibleProduct(identifier, db) : readPublicProduct(identifier, db);
        },
        readProductCategories: function () {
            return source === 'revision' ? readRevisionCompatibleProductCategories(db) : readPublicProductCategories(db);
        },
        readLocalizedProducts: function (locale) {
            return source === 'revision' ? readRevisionLocalizedProducts(locale, db) : readLocalizedProducts(locale, db);
        },
        readLocalizedProduct: function (identifier, locale) {
            return source === 'revision' ? readRevisionLocalizedProduct(identifier, locale, db) : readLocalizedProduct(identifier, locale, db);
        },
        readLocalizedProductCategories: function (locale) {
            return source === 'revision' ? readRevisionLocalizedProductCategories(locale, db) : readLocalizedProductCategories(locale, db);
        },
        readLocalizedCertifications: function (locale) {
            return source === 'revision' ? readRevisionLocalizedCertifications(locale, db) : readLocalizedCertifications(locale, db);
        },
        readContentBlock: function (slug, locale) {
            if (source === 'revision') return readRevisionLocalizedContentBlock(slug, locale, db, registry);
            const block = readPublicContentBlock(slug, db);
            return locale ? compactLocalizedContentBlock(block, locale, registry.entries.map(function (entry) { return entry.code; })) : block;
        }
    });
}

module.exports = {
    createPublicTranslationReadAdapter,
    readRevisionCompatibleProducts,
    readRevisionCompatibleProduct,
    readRevisionCompatibleProductCategories
};
