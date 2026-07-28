'use strict';

const { getDb } = require('./db');
const { getCategoryMapping, VALID_GROUPS } = require('./category-helper');
const { loadLocaleRegistry, normalizeCode } = require('./localeRegistry');
const {
    parseJsonArray,
    detailProductImages,
    normalizePublicMediaPath,
    resolveProductCardImage
} = require('./publicProducts');

const PRODUCT_COLUMNS = Object.freeze({
    en: { name: 'name_en', short: 'short_desc_en', description: 'description_en', seoTitle: 'seo_title', seoDescription: 'seo_description' },
    ar: { name: 'name_ar', short: 'short_desc_ar', description: 'description_ar', seoTitle: 'seo_title_ar', seoDescription: 'seo_description_ar' },
    fr: { name: 'name_fr', short: 'short_desc_fr', description: 'description_fr', seoTitle: 'seo_title_fr', seoDescription: 'seo_description_fr' },
    ru: { name: 'name_ru', short: 'short_desc_ru', description: 'description_ru', seoTitle: 'seo_title_ru', seoDescription: 'seo_description_ru' }
});

const ENTITY_SUFFIX = Object.freeze({ en: 'en', ar: 'ar', fr: 'fr', ru: 'ru' });

function assertLegacyLocale(locale) {
    if (!PRODUCT_COLUMNS[locale]) throw new Error('Unsupported localized catalog locale: ' + locale);
}

function revisionLocaleContext(localeValue, registryValue) {
    const registry = registryValue || loadLocaleRegistry();
    const locale = normalizeCode(localeValue);
    const entry = registry.get(locale);
    if (!entry || !entry.isPublic) throw new Error('Revision catalog locale is not public: ' + locale);
    return {
        registry,
        locale: entry.code,
        fallbackLocale: entry.fallbackLocale || registry.defaultLocale || entry.code
    };
}

function revisionNotReady(entityType, locale, missing) {
    const error = new Error('Published revision data is incomplete for ' + entityType + '.');
    error.name = 'PublicTranslationReadError';
    error.code = 'REVISION_SOURCE_NOT_READY';
    error.status = 503;
    error.details = { entityType, locale, missing: (missing || []).slice(0, 50) };
    throw error;
}

function text(value) {
    return String(value == null ? '' : value).trim();
}

function localizedText(localized, fallback, locale, fallbackLocale) {
    const target = text(localized);
    if (target) return { value: target, sourceLocale: locale, fallbackApplied: false };
    const sourceLocale = fallbackLocale || 'en';
    return { value: text(fallback), sourceLocale, fallbackApplied: locale !== sourceLocale };
}

function localizationMeta(values, locale, fields) {
    const fallbackApplied = values.some(function (value) { return value && value.fallbackApplied; });
    const sources = Array.from(new Set(values.map(function (value) {
        return value && value.sourceLocale;
    }).filter(Boolean)));
    const metadata = {
        requestedLocale: locale,
        sourceLocale: sources.length === 1 ? sources[0] : (sources.length ? 'mixed' : locale),
        fallbackApplied
    };
    if (fields) {
        metadata.fields = Object.keys(fields).reduce(function (out, key) {
            const value = fields[key];
            out[key] = {
                sourceLocale: value && value.sourceLocale || locale,
                fallbackApplied: Boolean(value && value.fallbackApplied)
            };
            return out;
        }, {});
    }
    return metadata;
}

function findProductId(db, identifier) {
    const direct = db.prepare(`
        SELECT id FROM products
        WHERE status = 'published' AND (legacy_id = ? OR slug = ?)
        LIMIT 1
    `).get(identifier, identifier);
    if (direct) return direct.id;
    const aliases = db.prepare(`
        SELECT id, aliases_json FROM products
        WHERE status = 'published' AND aliases_json IS NOT NULL AND aliases_json != ''
    `).all();
    const matched = aliases.find(function (row) { return parseJsonArray(row.aliases_json).indexOf(identifier) !== -1; });
    return matched ? matched.id : null;
}

function productQuery(locale, includeDescription, idFilter) {
    const columns = PRODUCT_COLUMNS[locale];
    const categoryColumn = 'name_' + ENTITY_SUFFIX[locale];
    const localizedDescription = includeDescription
        ? `p.${columns.description} AS localized_description,
            p.description_en AS fallback_description,
            p.${columns.seoTitle} AS localized_seo_title,
            p.seo_title AS fallback_seo_title,
            p.${columns.seoDescription} AS localized_seo_description,
            p.seo_description AS fallback_seo_description,`
        : '';
    return `
        SELECT
            p.id, p.legacy_id, p.slug, p.model, p.product_group, p.sub_category,
            p.aliases_json, p.featured, p.updated_at,
            p.${columns.name} AS localized_name,
            p.name_en AS fallback_name,
            p.${columns.short} AS localized_short,
            p.short_desc_en AS fallback_short,
            ${localizedDescription}
            c.slug AS category_slug,
            c.${categoryColumn} AS localized_category_label,
            c.name_en AS fallback_category_label,
            parent.slug AS parent_slug,
            parent.${categoryColumn} AS localized_parent_label,
            parent.name_en AS fallback_parent_label
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
            ${idFilter ? 'AND p.id = ?' : ''}
        ORDER BY p.sort_order, p.id
    `;
}

function revisionProductQuery(includeDescription, idFilter) {
    const localizedDescription = includeDescription
        ? `translation.description AS localized_description,
            fallback.description AS fallback_description,
            translation.seo_title AS localized_seo_title,
            fallback.seo_title AS fallback_seo_title,
            translation.seo_description AS localized_seo_description,
            fallback.seo_description AS fallback_seo_description,`
        : '';
    return `
        SELECT
            p.id, p.legacy_id, p.slug, p.model, p.product_group, p.sub_category,
            p.aliases_json, p.featured, p.updated_at,
            translation.id AS translation_id,
            translation.name AS localized_name,
            fallback.name AS fallback_name,
            translation.short_description AS localized_short,
            fallback.short_description AS fallback_short,
            ${localizedDescription}
            c.slug AS category_slug,
            category_translation.id AS category_translation_id,
            category_translation.name AS localized_category_label,
            category_fallback.name AS fallback_category_label,
            parent.slug AS parent_slug,
            parent_translation.id AS parent_translation_id,
            parent_translation.name AS localized_parent_label,
            parent_fallback.name AS fallback_parent_label
        FROM products p
        LEFT JOIN product_translations translation
            ON translation.product_id = p.id
            AND translation.locale = @locale
            AND translation.revision_state = 'published'
        LEFT JOIN product_translations fallback
            ON fallback.product_id = p.id
            AND fallback.locale = @fallback_locale
            AND fallback.revision_state = 'published'
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN category_translations category_translation
            ON category_translation.category_id = c.id
            AND category_translation.locale = @locale
            AND category_translation.revision_state = 'published'
        LEFT JOIN category_translations category_fallback
            ON category_fallback.category_id = c.id
            AND category_fallback.locale = @fallback_locale
            AND category_fallback.revision_state = 'published'
        LEFT JOIN categories parent ON parent.id = c.parent_id
        LEFT JOIN category_translations parent_translation
            ON parent_translation.category_id = parent.id
            AND parent_translation.locale = @locale
            AND parent_translation.revision_state = 'published'
        LEFT JOIN category_translations parent_fallback
            ON parent_fallback.category_id = parent.id
            AND parent_fallback.locale = @fallback_locale
            AND parent_fallback.revision_state = 'published'
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
            ${idFilter ? 'AND p.id = @product_id' : ''}
        ORDER BY p.sort_order, p.id
    `;
}

function resolveGroup(row) {
    if (row.parent_slug) return { group: row.parent_slug, subCategory: row.category_slug || row.sub_category || '' };
    if (row.product_group && VALID_GROUPS.has(row.product_group)) {
        return { group: row.product_group, subCategory: row.sub_category || '' };
    }
    return getCategoryMapping(row.category_slug);
}

function mediaMaps(db, productIds, includeGallery) {
    if (!productIds.length) return { covers: {}, media: {} };
    const placeholders = productIds.map(function () { return '?'; }).join(',');
    const rows = db.prepare(`
        SELECT id, product_id, media_type, path, is_cover, sort_order
        FROM product_media
        WHERE product_id IN (${placeholders}) ${includeGallery ? '' : 'AND is_cover = 1'}
        ORDER BY product_id, is_cover DESC, sort_order, id
    `).all(productIds);
    return rows.reduce(function (maps, row) {
        if (!maps.media[row.product_id]) maps.media[row.product_id] = [];
        maps.media[row.product_id].push(row);
        if (Number(row.is_cover) === 1 && !maps.covers[row.product_id]) {
            maps.covers[row.product_id] = normalizePublicMediaPath(row.path);
        }
        return maps;
    }, { covers: {}, media: {} });
}

function mapProduct(row, locale, fallbackLocale, mediaState, details, specs) {
    const group = resolveGroup(row);
    if (!group) return null;
    const name = localizedText(row.localized_name, row.fallback_name, locale, fallbackLocale);
    const shortDescription = localizedText(row.localized_short, row.fallback_short, locale, fallbackLocale);
    const categoryName = localizedText(row.localized_category_label, row.fallback_category_label, locale, fallbackLocale);
    const groupName = row.parent_slug
        ? localizedText(row.localized_parent_label, row.fallback_parent_label, locale, fallbackLocale)
        : categoryName;
    const cover = mediaState.covers[row.id] || '';
    const localizationValues = [name, shortDescription, categoryName, groupName];
    const localizationFields = {
        name,
        shortDesc: shortDescription,
        categoryLabel: categoryName,
        groupLabel: groupName,
        subCategoryLabel: categoryName
    };
    const product = {
        id: row.legacy_id,
        slug: row.slug || '',
        model: row.model || '',
        name: name.value,
        shortDesc: shortDescription.value,
        image: cover,
        cardImage: resolveProductCardImage(row, cover),
        category: row.category_slug || '',
        categoryLabel: categoryName.value,
        group: group.group,
        groupLabel: groupName.value,
        subCategory: group.subCategory || '',
        subCategoryLabel: categoryName.value,
        capacities: (specs || []).filter(function (item) { return item.spec_group === 'capacity'; }).map(function (item) { return item.spec_value; }),
        voltages: (specs || []).filter(function (item) { return item.spec_group === 'voltage'; }).map(function (item) { return item.spec_value; }),
        featured: Number(row.featured) === 1,
        localization: null
    };
    if (details) {
        const description = localizedText(row.localized_description, row.fallback_description, locale, fallbackLocale);
        const seoTitle = localizedText(row.localized_seo_title, row.fallback_seo_title, locale, fallbackLocale);
        const seoDescription = localizedText(row.localized_seo_description, row.fallback_seo_description, locale, fallbackLocale);
        localizationValues.push(description, seoTitle, seoDescription);
        localizationFields.description = description;
        localizationFields.seoTitle = seoTitle;
        localizationFields.seoDescription = seoDescription;
        product.description = description.value;
        product.aliases = parseJsonArray(row.aliases_json);
        product.specs = (specs || []).filter(function (item) { return item.spec_group === 'technical'; }).map(function (item) {
            return [item.spec_key, item.spec_value];
        });
        product.images = detailProductImages(mediaState.media[row.id] || [], cover, row.slug || row.legacy_id);
        product.seoTitle = seoTitle.value;
        product.seoDescription = seoDescription.value;
    }
    product.localization = localizationMeta(localizationValues, locale, localizationFields);
    return product;
}

function readLocalizedProducts(locale, dbValue, options) {
    const db = dbValue || getDb();
    const revisionSource = options && options.source === 'revision';
    const context = revisionSource
        ? revisionLocaleContext(locale, options && options.registry)
        : { locale: normalizeCode(locale), fallbackLocale: 'en' };
    locale = context.locale;
    if (!revisionSource) assertLegacyLocale(locale);
    const rows = revisionSource
        ? db.prepare(revisionProductQuery(false, false)).all({ locale, fallback_locale: context.fallbackLocale })
        : db.prepare(productQuery(locale, false, false)).all();
    if (revisionSource) {
        const missing = rows.filter(function (row) {
            return row.translation_id == null
                || row.category_translation_id == null
                || (row.parent_slug && row.parent_translation_id == null);
        }).map(function (row) {
            return { productId: Number(row.id), category: row.category_slug || null };
        });
        if (missing.length) revisionNotReady('product', locale, missing);
    }
    const productIds = rows.map(function (row) { return row.id; });
    const specsByProduct = {};
    if (productIds.length) {
        const placeholders = productIds.map(function () { return '?'; }).join(',');
        const specs = revisionSource
            ? db.prepare(`
                SELECT translation.product_id, spec.spec_group,
                    value.id AS value_id, value.value_text AS spec_value, value.label AS spec_key
                FROM product_translations translation
                JOIN product_specs spec ON spec.product_id = translation.product_id
                LEFT JOIN product_spec_translation_values value
                    ON value.product_translation_id = translation.id
                    AND value.product_spec_id = spec.id
                WHERE translation.id IN (${rows.map(function () { return '?'; }).join(',')})
                    AND spec.spec_group IN ('capacity', 'voltage')
                ORDER BY translation.product_id, spec.spec_group, spec.sort_order, spec.id
            `).all(rows.map(function (row) { return row.translation_id; }))
            : db.prepare(`
                SELECT product_id, spec_group, spec_value
                FROM product_specs
                WHERE product_id IN (${placeholders}) AND spec_group IN ('capacity', 'voltage')
                ORDER BY product_id, spec_group, sort_order, id
            `).all(productIds);
        if (revisionSource) {
            const missingSpecs = specs.filter(function (spec) { return spec.value_id == null; }).map(function (spec) {
                return { productId: Number(spec.product_id), group: spec.spec_group };
            });
            if (missingSpecs.length) revisionNotReady('product_spec', locale, missingSpecs);
        }
        specs.forEach(function (spec) {
            if (!specsByProduct[spec.product_id]) specsByProduct[spec.product_id] = [];
            specsByProduct[spec.product_id].push(spec);
        });
    }
    const mediaState = mediaMaps(db, productIds, false);
    return rows.map(function (row) {
        return mapProduct(row, locale, context.fallbackLocale, mediaState, false, specsByProduct[row.id] || []);
    }).filter(Boolean);
}

function readLocalizedProduct(identifier, locale, dbValue, options) {
    if (identifier == null || identifier === '') return null;
    const db = dbValue || getDb();
    const productId = findProductId(db, String(identifier));
    if (!productId) return null;
    const revisionSource = options && options.source === 'revision';
    const context = revisionSource
        ? revisionLocaleContext(locale, options && options.registry)
        : { locale: normalizeCode(locale), fallbackLocale: 'en' };
    locale = context.locale;
    if (!revisionSource) assertLegacyLocale(locale);
    const row = revisionSource
        ? db.prepare(revisionProductQuery(true, true)).get({
            locale,
            fallback_locale: context.fallbackLocale,
            product_id: productId
        })
        : db.prepare(productQuery(locale, true, true)).get(productId);
    if (!row) return null;
    if (revisionSource && (row.translation_id == null
        || row.category_translation_id == null
        || (row.parent_slug && row.parent_translation_id == null))) {
        revisionNotReady('product', locale, [{ productId: Number(productId), category: row.category_slug || null }]);
    }
    const specs = revisionSource
        ? db.prepare(`
            SELECT spec.spec_group, value.id AS value_id, value.label AS spec_key,
                value.value_text AS spec_value, spec.unit
            FROM product_specs spec
            LEFT JOIN product_spec_translation_values value
                ON value.product_spec_id = spec.id
                AND value.product_translation_id = ?
            WHERE spec.product_id = ?
                AND spec.spec_group != 'archived'
            ORDER BY spec.spec_group, spec.sort_order, spec.id
        `).all(row.translation_id, productId)
        : db.prepare(`
            SELECT spec_group, spec_key, spec_value, unit
            FROM product_specs
            WHERE product_id = ? AND spec_group != 'archived'
            ORDER BY spec_group, sort_order, id
        `).all(productId);
    if (revisionSource) {
        const missingSpecs = specs.filter(function (spec) { return spec.value_id == null; }).map(function (spec) {
            return { productId: Number(productId), group: spec.spec_group };
        });
        if (missingSpecs.length) revisionNotReady('product_spec', locale, missingSpecs);
    }
    const mediaState = mediaMaps(db, [productId], true);
    return mapProduct(row, locale, context.fallbackLocale, mediaState, true, specs);
}

function readLocalizedProductCategories(locale, dbValue, options) {
    const db = dbValue || getDb();
    const revisionSource = options && options.source === 'revision';
    const context = revisionSource
        ? revisionLocaleContext(locale, options && options.registry)
        : { locale: normalizeCode(locale), fallbackLocale: 'en' };
    locale = context.locale;
    if (!revisionSource) assertLegacyLocale(locale);
    const column = revisionSource ? '' : 'name_' + ENTITY_SUFFIX[locale];
    const rows = revisionSource
        ? db.prepare(`
            SELECT c.id, c.parent_id, c.slug,
                translation.id AS translation_id,
                translation.name AS localized_name,
                fallback.name AS fallback_name
            FROM categories c
            LEFT JOIN category_translations translation
                ON translation.category_id = c.id
                AND translation.locale = @locale
                AND translation.revision_state = 'published'
            LEFT JOIN category_translations fallback
                ON fallback.category_id = c.id
                AND fallback.locale = @fallback_locale
                AND fallback.revision_state = 'published'
            LEFT JOIN categories parent ON parent.id = c.parent_id
            WHERE c.type = 'product' AND c.is_active = 1
                AND (c.parent_id IS NULL OR parent.is_active = 1)
            ORDER BY COALESCE(parent.sort_order, c.sort_order),
                CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END, c.sort_order, c.id
        `).all({ locale, fallback_locale: context.fallbackLocale })
        : db.prepare(`
            SELECT c.id, c.parent_id, c.slug, c.${column} AS localized_name, c.name_en AS fallback_name
            FROM categories c
            LEFT JOIN categories parent ON parent.id = c.parent_id
            WHERE c.type = 'product' AND c.is_active = 1
                AND (c.parent_id IS NULL OR parent.is_active = 1)
            ORDER BY COALESCE(parent.sort_order, c.sort_order),
                CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END, c.sort_order, c.id
        `).all();
    if (revisionSource) {
        const missing = rows.filter(function (row) { return row.translation_id == null; }).map(function (row) {
            return { categoryId: Number(row.id), slug: row.slug || null };
        });
        if (missing.length) revisionNotReady('category', locale, missing);
    }
    const byParent = rows.reduce(function (groups, row) {
        if (row.parent_id == null) return groups;
        if (!groups[row.parent_id]) groups[row.parent_id] = [];
        groups[row.parent_id].push(row);
        return groups;
    }, {});
    return rows.filter(function (row) { return row.parent_id == null; }).map(function (parent) {
        const parentName = localizedText(parent.localized_name, parent.fallback_name, locale, context.fallbackLocale);
        const children = (byParent[parent.id] || []).map(function (child) {
            const childName = localizedText(child.localized_name, child.fallback_name, locale, context.fallbackLocale);
            return { sub: child.slug, label: childName.value, localization: localizationMeta([childName], locale) };
        });
        return {
            group: parent.slug,
            label: parentName.value,
            children,
            localization: localizationMeta([parentName].concat(children.map(function (child) { return child.localization; })), locale)
        };
    }).filter(function (group) { return group.children.length; });
}

function readLocalizedCertifications(locale, dbValue, options) {
    const db = dbValue || getDb();
    const revisionSource = options && options.source === 'revision';
    const context = revisionSource
        ? revisionLocaleContext(locale, options && options.registry)
        : { locale: normalizeCode(locale), fallbackLocale: 'en' };
    locale = context.locale;
    if (!revisionSource) assertLegacyLocale(locale);
    const suffix = revisionSource ? '' : ENTITY_SUFFIX[locale];
    const rows = revisionSource
        ? db.prepare(`
            SELECT certification.legacy_id, certification.legacy_category,
                certification.image_path, certification.source_type,
                certification.pages, certification.width, certification.height,
                translation.id AS translation_id,
                translation.name AS localized_name, fallback.name AS fallback_name,
                translation.category_label AS localized_category, fallback.category_label AS fallback_category,
                translation.issuer AS localized_issuer, fallback.issuer AS fallback_issuer,
                translation.description AS localized_description, fallback.description AS fallback_description
            FROM certifications certification
            LEFT JOIN certification_translations translation
                ON translation.certification_id = certification.id
                AND translation.locale = @locale
                AND translation.revision_state = 'published'
            LEFT JOIN certification_translations fallback
                ON fallback.certification_id = certification.id
                AND fallback.locale = @fallback_locale
                AND fallback.revision_state = 'published'
            WHERE certification.status = 'published'
            ORDER BY certification.sort_order, certification.id
        `).all({ locale, fallback_locale: context.fallbackLocale })
        : db.prepare(`
            SELECT legacy_id, legacy_category, image_path, source_type, pages, width, height,
                name_${suffix} AS localized_name, name_en AS fallback_name,
                category_label_${suffix} AS localized_category, category_label_en AS fallback_category,
                issuer_${suffix} AS localized_issuer, issuer_en AS fallback_issuer,
                description_${suffix} AS localized_description, description_en AS fallback_description
            FROM certifications WHERE status = 'published'
            ORDER BY sort_order, id
        `).all();
    if (revisionSource) {
        const missing = rows.filter(function (row) { return row.translation_id == null; }).map(function (row) {
            return { certificationId: row.legacy_id };
        });
        if (missing.length) revisionNotReady('certification', locale, missing);
    }
    return rows.map(function (row) {
        const name = localizedText(row.localized_name, row.fallback_name, locale, context.fallbackLocale);
        const category = localizedText(row.localized_category, row.fallback_category, locale, context.fallbackLocale);
        const issuer = localizedText(row.localized_issuer, row.fallback_issuer, locale, context.fallbackLocale);
        const description = localizedText(row.localized_description, row.fallback_description, locale, context.fallbackLocale);
        return {
            id: row.legacy_id,
            name: name.value,
            category: row.legacy_category || '',
            categoryLabel: category.value,
            image: row.image_path || '',
            type: row.source_type || '',
            issuer: issuer.value,
            description: description.value,
            pages: row.pages || 1,
            width: row.width,
            height: row.height,
            localization: localizationMeta([name, category, issuer, description], locale)
        };
    });
}

function readRevisionLocalizedProducts(locale, dbValue, registryValue) {
    return readLocalizedProducts(locale, dbValue, { source: 'revision', registry: registryValue });
}

function readRevisionLocalizedProduct(identifier, locale, dbValue, registryValue) {
    return readLocalizedProduct(identifier, locale, dbValue, { source: 'revision', registry: registryValue });
}

function readRevisionLocalizedProductCategories(locale, dbValue, registryValue) {
    return readLocalizedProductCategories(locale, dbValue, { source: 'revision', registry: registryValue });
}

function readRevisionLocalizedCertifications(locale, dbValue, registryValue) {
    return readLocalizedCertifications(locale, dbValue, { source: 'revision', registry: registryValue });
}

module.exports = {
    readLocalizedProducts,
    readLocalizedProduct,
    readLocalizedProductCategories,
    readLocalizedCertifications,
    readRevisionLocalizedProducts,
    readRevisionLocalizedProduct,
    readRevisionLocalizedProductCategories,
    readRevisionLocalizedCertifications
};
