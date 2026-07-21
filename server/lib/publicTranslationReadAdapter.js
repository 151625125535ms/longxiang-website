'use strict';

const { getDb } = require('./db');
const { loadLocaleRegistry } = require('./localeRegistry');
const { readPublicProducts, readPublicProduct } = require('./publicProducts');
const { readPublicProductCategories } = require('./publicProductTaxonomy');
const { readPublicCertifications } = require('./publicCertifications');
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
    compactLocalizedContentBlock,
    compactLocalizedTree
} = require('./publicContentBlocks');
const { readRevisionLocalizedContentBlock, validateRevisionContentRow } = require('./revisionPublicContent');
const { createRevisionLocalePublicationPolicy } = require('./localePublicationPolicy');
const contentPresentationI18n = require('../../js/content-presentation-i18n');

const SOURCE_ENV = 'PUBLIC_TRANSLATION_READ_SOURCE';
const LOCALE_SUFFIX = Object.freeze({ en: '', ar: 'Ar', fr: 'Fr', ru: 'Ru' });

class PublicTranslationReadError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'PublicTranslationReadError';
        this.code = code;
        this.details = details || null;
    }
}

function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce(function (result, key) {
        result[key] = clone(value[key]);
        return result;
    }, {});
}

function resolvePublicTranslationReadSource(value) {
    const normalized = String(value == null ? '' : value).trim().toLowerCase();
    if (!normalized) return 'legacy';
    if (normalized === 'legacy' || normalized === 'revision') return normalized;
    throw new PublicTranslationReadError(
        'INVALID_PUBLIC_TRANSLATION_READ_SOURCE',
        SOURCE_ENV + ' must be either legacy or revision.'
    );
}

function revisionRows(db, table, foreignKey, entityTable, identityColumns) {
    return db.prepare(`
        SELECT translation.*, ${identityColumns}
        FROM ${table} translation
        JOIN ${entityTable} entity
            ON entity.id = translation.${foreignKey}
        WHERE translation.revision_state = 'published'
        ORDER BY translation.${foreignKey}, translation.locale
    `).all();
}

function productRevisionRows(db) {
    return revisionRows(db, 'product_translations', 'product_id', 'products', 'entity.legacy_id, entity.slug');
}

function categoryRevisionRows(db) {
    return revisionRows(db, 'category_translations', 'category_id', 'categories', 'NULL AS legacy_id, entity.slug');
}

function certificationRevisionRows(db) {
    return revisionRows(db, 'certification_translations', 'certification_id', 'certifications', 'entity.legacy_id, NULL AS slug');
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

function applyProductCategoryRevisions(products, categories) {
    const groups = new Map(categories.map(function (group) { return [String(group.group), group]; }));
    products.forEach(function (product) {
        const group = groups.get(String(product.group));
        if (!group) return;
        Object.keys(LOCALE_SUFFIX).forEach(function (locale) {
            const suffix = LOCALE_SUFFIX[locale];
            const groupKey = 'label' + suffix;
            const child = (group.children || []).find(function (item) {
                return String(item.sub) === String(product.subCategory || product.category);
            });
            if (Object.prototype.hasOwnProperty.call(group, groupKey)) product['groupLabel' + suffix] = group[groupKey] || '';
            if (child && Object.prototype.hasOwnProperty.call(child, groupKey)) {
                product['categoryLabel' + suffix] = child[groupKey] || '';
                product['subCategoryLabel' + suffix] = child[groupKey] || '';
            }
        });
    });
    return products;
}

function applyCertificationRevisions(certifications, rows) {
    const byIdentifier = new Map(certifications.map(function (certification) {
        return [String(certification.id), certification];
    }));
    rows.forEach(function (row) {
        const certification = byIdentifier.get(String(row.legacy_id));
        const suffix = LOCALE_SUFFIX[String(row.locale).toLowerCase()];
        if (!certification || suffix === undefined) return;
        certification['name' + suffix] = row.name || '';
        certification['categoryLabel' + suffix] = row.category_label || '';
        certification['issuer' + suffix] = row.issuer || '';
        certification['description' + suffix] = row.description || '';
    });
    return certifications;
}

function readRevisionCompatibleProductCategories(dbValue) {
    const db = dbValue || getDb();
    const groups = readPublicProductCategories(db).map(clone);
    const rows = categoryRevisionRows(db);
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

function readRevisionCompatibleProducts(dbValue) {
    const db = dbValue || getDb();
    return applyProductRevisions(readPublicProducts(db).map(clone), productRevisionRows(db));
}

function readRevisionCompatibleProduct(identifier, dbValue) {
    const value = String(identifier || '');
    if (!value) return null;
    const db = dbValue || getDb();
    const direct = readPublicProduct(value, db);
    if (!direct) return null;
    return applyProductRevisions([clone(direct)], productRevisionRows(db).filter(function (row) {
        return String(row.legacy_id) === String(direct.id);
    }))[0] || null;
}

function readRevisionCompatibleCertifications(dbValue) {
    const db = dbValue || getDb();
    return applyCertificationRevisions(readPublicCertifications(db).map(clone), certificationRevisionRows(db));
}

function readRevisionPresentationProducts(locale, dbValue, registryValue) {
    return readRevisionLocalizedProducts(locale, dbValue, registryValue);
}

function readRevisionPresentationProduct(identifier, locale, dbValue, registryValue) {
    return readRevisionLocalizedProduct(identifier, locale, dbValue, registryValue);
}

function applyContentPresentationCompatibility(slug, neutralValue, localizedValue, locale) {
    if (Array.isArray(localizedValue)) {
        return localizedValue.map(function (item, index) {
            const neutral = Array.isArray(neutralValue) ? neutralValue[index] : undefined;
            return applyContentPresentationCompatibility(slug, neutral, item, locale);
        });
    }
    if (!localizedValue || typeof localizedValue !== 'object') return clone(localizedValue);
    const neutral = neutralValue && typeof neutralValue === 'object' && !Array.isArray(neutralValue)
        ? neutralValue
        : {};
    const result = Object.keys(localizedValue).reduce(function (out, key) {
        out[key] = applyContentPresentationCompatibility(slug, neutral[key], localizedValue[key], locale);
        return out;
    }, {});
    if (slug !== 'contact' || !result.name) return result;
    const pack = contentPresentationI18n.CONTACT_FIELD_TEXT_FALLBACKS[locale] || {};
    ['label', 'placeholder'].forEach(function (key) {
        const fallback = pack[key] && pack[key][result.name];
        if (fallback && localizedValue[key] === neutral[key]) result[key] = fallback;
    });
    return result;
}

function readRevisionPresentationContentBlock(slug, locale, dbValue, registryValue) {
    const db = dbValue || getDb();
    const registry = registryValue || loadLocaleRegistry();
    const localized = readRevisionLocalizedContentBlock(slug, locale, db, registry);
    if (!localized) return null;
    const legacy = readPublicContentBlock(slug, db);
    if (!legacy) return null;
    const localeCodes = registry.entries.map(function (entry) { return entry.code; });
    const neutralBody = compactLocalizedTree(legacy.body, 'en', localeCodes);
    return {
        ...localized,
        body: applyContentPresentationCompatibility(slug, neutralBody, localized.body, locale)
    };
}

function requiredPairs(db, options) {
    const locales = options.locales;
    const localeSelect = locales.map(function () { return 'SELECT ? AS locale'; }).join(' UNION ALL ');
    const rows = db.prepare(`
        WITH required_locales AS (${localeSelect})
        SELECT entity.id AS entity_id, required_locales.locale
        FROM ${options.entityTable} entity
        CROSS JOIN required_locales
        LEFT JOIN ${options.translationTable} translation
            ON translation.${options.foreignKey} = entity.id
            AND translation.locale = required_locales.locale
            AND translation.revision_state = 'published'
        WHERE ${options.whereSql} AND translation.id IS NULL
        ORDER BY entity.id, required_locales.locale
        LIMIT 50
    `).all(locales);
    return rows.map(function (row) { return { entityId: Number(row.entity_id), locale: row.locale }; });
}

function revisionReadiness(dbValue, registryValue) {
    const db = dbValue || getDb();
    const registry = registryValue || loadLocaleRegistry();
    const locales = registry.publicEntries.map(function (entry) { return entry.code; });
    const blockers = [];
    if (!locales.length) {
        blockers.push({ code: 'EMPTY_PUBLIC_LOCALE_SET', locales });
        return { ready: false, locales, blockers };
    }
    [
        { entityType: 'product', entityTable: 'products', translationTable: 'product_translations', foreignKey: 'product_id', whereSql: "entity.status = 'published'" },
        { entityType: 'category', entityTable: 'categories', translationTable: 'category_translations', foreignKey: 'category_id', whereSql: "entity.type = 'product' AND entity.is_active = 1" },
        { entityType: 'certification', entityTable: 'certifications', translationTable: 'certification_translations', foreignKey: 'certification_id', whereSql: "entity.status = 'published'" }
    ].forEach(function (definition) {
        const missing = requiredPairs(db, { ...definition, locales });
        if (missing.length) blockers.push({ code: 'PUBLISHED_REVISION_MISSING', entityType: definition.entityType, missing });
    });

    const localeSelect = locales.map(function () { return 'SELECT ? AS locale'; }).join(' UNION ALL ');
    const contentRows = db.prepare(`
        WITH required_locales AS (${localeSelect})
        SELECT
            block.id AS entity_id, block.slug, block.body_json, block.version,
            required_locales.locale,
            translation.id AS revision_id, translation.translation_json,
            translation.schema_version, translation.base_structure_hash,
            schema.id AS schema_id, schema.schema_json, schema.structure_hash
        FROM content_blocks block
        CROSS JOIN required_locales
        LEFT JOIN content_block_translations translation
            ON translation.content_block_id = block.id
            AND translation.locale = required_locales.locale
            AND translation.revision_state = 'published'
        LEFT JOIN content_translation_schemas schema
            ON schema.content_block_id = block.id
            AND schema.content_version = block.version
            AND schema.schema_version = translation.schema_version
        WHERE block.status = 'published'
        ORDER BY block.id, required_locales.locale
    `).all(locales);
    const missingContent = [];
    const invalidContent = [];
    contentRows.forEach(function (row) {
        const identity = { entityId: Number(row.entity_id), slug: row.slug, locale: row.locale };
        if (row.revision_id == null || row.schema_id == null) {
            if (missingContent.length < 50) missingContent.push(identity);
            return;
        }
        try {
            validateRevisionContentRow(row, { slug: row.slug, locale: row.locale, registry });
        } catch (error) {
            if (invalidContent.length < 50) {
                invalidContent.push({
                    ...identity,
                    cause: error && error.details && error.details.cause
                        ? error.details.cause
                        : (error.code || 'CONTENT_OVERLAY_VALIDATION_FAILED')
                });
            }
        }
    });
    if (missingContent.length) blockers.push({ code: 'CONTENT_OVERLAY_REVISION_MISSING', entityType: 'content_block', missing: missingContent });
    if (invalidContent.length) blockers.push({ code: 'CONTENT_OVERLAY_REVISION_INVALID', entityType: 'content_block', invalid: invalidContent });

    const missingSpecs = db.prepare(`
        SELECT product.id AS product_id, translation.locale, spec.id AS spec_id
        FROM products product
        JOIN product_translations translation
            ON translation.product_id = product.id
            AND translation.revision_state = 'published'
        JOIN product_specs spec
            ON spec.product_id = product.id
            AND spec.spec_group != 'archived'
        LEFT JOIN product_spec_translation_values value
            ON value.product_translation_id = translation.id
            AND value.product_spec_id = spec.id
        WHERE product.status = 'published'
            AND translation.locale IN (${locales.map(function () { return '?'; }).join(',')})
            AND value.id IS NULL
        ORDER BY product.id, translation.locale, spec.id
        LIMIT 50
    `).all(locales).map(function (row) {
        return { productId: Number(row.product_id), locale: row.locale, specId: Number(row.spec_id) };
    });
    if (missingSpecs.length) blockers.push({ code: 'PRODUCT_SPEC_TRANSLATION_MISSING', missing: missingSpecs });
    return { ready: blockers.length === 0, locales, blockers };
}

function findPublishedProductEntityId(db, identifierValue) {
    const identifier = String(identifierValue || '').trim();
    if (!identifier) return null;
    const direct = db.prepare(`
        SELECT id FROM products
        WHERE status = 'published' AND (legacy_id = ? OR slug = ?)
        LIMIT 1
    `).get(identifier, identifier);
    if (direct) return Number(direct.id);
    const aliases = db.prepare(`
        SELECT id, aliases_json FROM products
        WHERE status = 'published' AND aliases_json IS NOT NULL AND aliases_json != ''
    `).all();
    const matched = aliases.find(function (row) {
        try { return JSON.parse(row.aliases_json || '[]').map(String).indexOf(identifier) !== -1; }
        catch (error) { return false; }
    });
    return matched ? Number(matched.id) : null;
}

function createPublicTranslationReadAdapter(options) {
    options = options || {};
    const db = options.db || getDb();
    const registry = options.registry || loadLocaleRegistry();
    const source = resolvePublicTranslationReadSource(options.source);
    const readiness = source === 'revision' ? revisionReadiness(db, registry) : null;
    const publicationPolicy = source === 'revision'
        ? createRevisionLocalePublicationPolicy({ db, registry })
        : null;
    const localeCodes = registry.entries.map(function (entry) { return entry.code; });
    function publicLocale(localeValue) {
        const entry = registry.get(localeValue);
        if (!entry || !entry.isPublic) {
            throw new PublicTranslationReadError(
                'LOCALE_NOT_PUBLIC',
                'Public translation reads require a supported locale.',
                { locale: String(localeValue || '').trim().toLowerCase() }
            );
        }
        return entry.code;
    }
    function assertSourceReady() {
        if (source === 'revision' && !readiness.ready) {
            throw new PublicTranslationReadError(
                'REVISION_SOURCE_NOT_READY',
                'Published revision data is incomplete.',
                readiness
            );
        }
    }
    return Object.freeze({
        source,
        readiness,
        readProducts: function () {
            return readPublicProducts(db);
        },
        readProduct: function (identifier) {
            return readPublicProduct(identifier, db);
        },
        readProductCategories: function () {
            return readPublicProductCategories(db);
        },
        readCertifications: function () {
            return readPublicCertifications(db);
        },
        readPresentationProducts: function (locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            return source === 'revision'
                ? readRevisionPresentationProducts(code, db, registry)
                : readPublicProducts(db);
        },
        readPresentationProduct: function (identifier, locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            if (source !== 'revision') return readPublicProduct(identifier, db);
            const product = readRevisionPresentationProduct(identifier, code, db, registry);
            if (!product) return null;
            const entityId = findPublishedProductEntityId(db, identifier);
            const matrix = entityId == null ? {} : publicationPolicy.publicationMatrix({
                entityType: 'product',
                entityIds: [entityId]
            });
            return {
                ...product,
                publication: { locales: entityId == null ? [] : (matrix[entityId] || []) }
            };
        },
        readPresentationProductCategories: function (locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            return source === 'revision'
                ? readRevisionLocalizedProductCategories(code, db, registry)
                : readPublicProductCategories(db);
        },
        readLocalizedProducts: function (locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            return source === 'revision'
                ? readRevisionLocalizedProducts(code, db, registry)
                : readLocalizedProducts(code, db);
        },
        readLocalizedProduct: function (identifier, locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            return source === 'revision'
                ? readRevisionLocalizedProduct(identifier, code, db, registry)
                : readLocalizedProduct(identifier, code, db);
        },
        readLocalizedProductCategories: function (locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            return source === 'revision'
                ? readRevisionLocalizedProductCategories(code, db, registry)
                : readLocalizedProductCategories(code, db);
        },
        readLocalizedCertifications: function (locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            return source === 'revision'
                ? readRevisionLocalizedCertifications(code, db, registry)
                : readLocalizedCertifications(code, db);
        },
        readContentBlock: function (slug) {
            return readPublicContentBlock(slug, db);
        },
        readPresentationContentBlock: function (slug, locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            if (source === 'revision') return readRevisionPresentationContentBlock(slug, code, db, registry);
            return readPublicContentBlock(slug, db);
        },
        readLocalizedContentBlock: function (slug, locale) {
            const code = publicLocale(locale);
            assertSourceReady();
            if (source === 'revision') return readRevisionLocalizedContentBlock(slug, code, db, registry);
            return compactLocalizedContentBlock(readPublicContentBlock(slug, db), code, localeCodes);
        }
    });
}

function createRuntimePublicTranslationReadAdapter(options) {
    options = options || {};
    const env = options.env || process.env;
    return createPublicTranslationReadAdapter({
        db: options.db,
        registry: options.registry,
        source: resolvePublicTranslationReadSource(env[SOURCE_ENV])
    });
}

let runtimeAdapter = null;
function getRuntimePublicTranslationReadAdapter() {
    if (!runtimeAdapter) runtimeAdapter = createRuntimePublicTranslationReadAdapter();
    return runtimeAdapter;
}

module.exports = {
    SOURCE_ENV,
    PublicTranslationReadError,
    resolvePublicTranslationReadSource,
    revisionReadiness,
    createPublicTranslationReadAdapter,
    createRuntimePublicTranslationReadAdapter,
    getRuntimePublicTranslationReadAdapter,
    readRevisionCompatibleProducts,
    readRevisionCompatibleProduct,
    readRevisionCompatibleProductCategories,
    readRevisionCompatibleCertifications,
    readRevisionPresentationProducts,
    readRevisionPresentationProduct,
    readRevisionPresentationContentBlock
};
