'use strict';

const { getDb } = require('./db');
const { getCategoryMapping, VALID_GROUPS } = require('./category-helper');
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

function assertLocale(locale) {
    if (!PRODUCT_COLUMNS[locale]) throw new Error('Unsupported localized catalog locale: ' + locale);
}

function text(value) {
    return String(value == null ? '' : value).trim();
}

function localizedText(localized, fallback, locale) {
    const target = text(localized);
    if (target) return { value: target, sourceLocale: locale, fallbackApplied: false };
    return { value: text(fallback), sourceLocale: 'en', fallbackApplied: locale !== 'en' };
}

function localizationMeta(values, locale) {
    const fallbackApplied = values.some(function (value) { return value && value.fallbackApplied; });
    return {
        requestedLocale: locale,
        sourceLocale: fallbackApplied ? 'mixed' : locale,
        fallbackApplied
    };
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

function mapProduct(row, locale, mediaState, details, specs) {
    const group = resolveGroup(row);
    if (!group) return null;
    const name = localizedText(row.localized_name, row.fallback_name, locale);
    const shortDescription = localizedText(row.localized_short, row.fallback_short, locale);
    const categoryName = localizedText(row.localized_category_label, row.fallback_category_label, locale);
    const groupName = row.parent_slug
        ? localizedText(row.localized_parent_label, row.fallback_parent_label, locale)
        : categoryName;
    const cover = mediaState.covers[row.id] || '';
    const localizationValues = [name, shortDescription, categoryName, groupName];
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
        const description = localizedText(row.localized_description, row.fallback_description, locale);
        const seoTitle = localizedText(row.localized_seo_title, row.fallback_seo_title, locale);
        const seoDescription = localizedText(row.localized_seo_description, row.fallback_seo_description, locale);
        localizationValues.push(description, seoTitle, seoDescription);
        product.description = description.value;
        product.aliases = parseJsonArray(row.aliases_json);
        product.specs = (specs || []).filter(function (item) { return item.spec_group === 'technical'; }).map(function (item) {
            return [item.spec_key, item.spec_value];
        });
        product.images = detailProductImages(mediaState.media[row.id] || [], cover, row.slug || row.legacy_id);
        product.seoTitle = seoTitle.value;
        product.seoDescription = seoDescription.value;
    }
    product.localization = localizationMeta(localizationValues, locale);
    return product;
}

function readLocalizedProducts(locale, dbValue) {
    assertLocale(locale);
    const db = dbValue || getDb();
    const rows = db.prepare(productQuery(locale, false, false)).all();
    const productIds = rows.map(function (row) { return row.id; });
    const specsByProduct = {};
    if (productIds.length) {
        const placeholders = productIds.map(function () { return '?'; }).join(',');
        db.prepare(`
            SELECT product_id, spec_group, spec_value
            FROM product_specs
            WHERE product_id IN (${placeholders}) AND spec_group IN ('capacity', 'voltage')
            ORDER BY product_id, spec_group, sort_order, id
        `).all(productIds).forEach(function (spec) {
            if (!specsByProduct[spec.product_id]) specsByProduct[spec.product_id] = [];
            specsByProduct[spec.product_id].push(spec);
        });
    }
    const mediaState = mediaMaps(db, productIds, false);
    return rows.map(function (row) { return mapProduct(row, locale, mediaState, false, specsByProduct[row.id] || []); }).filter(Boolean);
}

function readLocalizedProduct(identifier, locale, dbValue) {
    assertLocale(locale);
    if (identifier == null || identifier === '') return null;
    const db = dbValue || getDb();
    const productId = findProductId(db, String(identifier));
    if (!productId) return null;
    const row = db.prepare(productQuery(locale, true, true)).get(productId);
    if (!row) return null;
    const specs = db.prepare(`
        SELECT spec_group, spec_key, spec_value, unit
        FROM product_specs WHERE product_id = ?
        ORDER BY spec_group, sort_order, id
    `).all(productId);
    const mediaState = mediaMaps(db, [productId], true);
    return mapProduct(row, locale, mediaState, true, specs);
}

function readLocalizedProductCategories(locale, dbValue) {
    assertLocale(locale);
    const db = dbValue || getDb();
    const column = 'name_' + ENTITY_SUFFIX[locale];
    const rows = db.prepare(`
        SELECT c.id, c.parent_id, c.slug, c.${column} AS localized_name, c.name_en AS fallback_name
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE c.type = 'product' AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
        ORDER BY COALESCE(parent.sort_order, c.sort_order),
            CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END, c.sort_order, c.id
    `).all();
    const byParent = rows.reduce(function (groups, row) {
        if (row.parent_id == null) return groups;
        if (!groups[row.parent_id]) groups[row.parent_id] = [];
        groups[row.parent_id].push(row);
        return groups;
    }, {});
    return rows.filter(function (row) { return row.parent_id == null; }).map(function (parent) {
        const parentName = localizedText(parent.localized_name, parent.fallback_name, locale);
        const children = (byParent[parent.id] || []).map(function (child) {
            const childName = localizedText(child.localized_name, child.fallback_name, locale);
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

function readLocalizedCertifications(locale, dbValue) {
    assertLocale(locale);
    const db = dbValue || getDb();
    const suffix = ENTITY_SUFFIX[locale];
    return db.prepare(`
        SELECT legacy_id, legacy_category, image_path, source_type, pages, width, height,
            name_${suffix} AS localized_name, name_en AS fallback_name,
            category_label_${suffix} AS localized_category, category_label_en AS fallback_category,
            issuer_${suffix} AS localized_issuer, issuer_en AS fallback_issuer,
            description_${suffix} AS localized_description, description_en AS fallback_description
        FROM certifications WHERE status = 'published'
        ORDER BY sort_order, id
    `).all().map(function (row) {
        const name = localizedText(row.localized_name, row.fallback_name, locale);
        const category = localizedText(row.localized_category, row.fallback_category, locale);
        const issuer = localizedText(row.localized_issuer, row.fallback_issuer, locale);
        const description = localizedText(row.localized_description, row.fallback_description, locale);
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

module.exports = {
    readLocalizedProducts,
    readLocalizedProduct,
    readLocalizedProductCategories,
    readLocalizedCertifications
};
