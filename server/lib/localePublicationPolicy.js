'use strict';

const { loadLocaleRegistry } = require('./localeRegistry');

function isBaseEntityPublic(row) {
    if (!row) return false;
    if (Object.prototype.hasOwnProperty.call(row, 'status') && row.status !== 'published') return false;
    if (Object.prototype.hasOwnProperty.call(row, 'is_active') && Number(row.is_active) !== 1) return false;
    return true;
}

function createLocalePublicationPolicy(registryValue) {
    const registry = registryValue || loadLocaleRegistry();
    const publicLocales = registry.publicEntries.map(function (entry) { return entry.code; });

    function isPublished(row, locale) {
        const entry = registry.get(locale);
        return Boolean(entry && entry.isPublic && isBaseEntityPublic(row));
    }

    function publicationMatrix(rows, identifier) {
        const idFor = typeof identifier === 'function' ? identifier : function (row) { return row && row.id; };
        return (rows || []).reduce(function (matrix, row) {
            const id = idFor(row);
            if (id == null) return matrix;
            matrix[id] = isBaseEntityPublic(row) ? publicLocales.slice() : [];
            return matrix;
        }, {});
    }

    function listPublishedEntities(rows, locale) {
        return (rows || []).filter(function (row) { return isPublished(row, locale); });
    }

    return Object.freeze({ isPublished, publicationMatrix, listPublishedEntities });
}

const REVISION_ENTITY_CONFIG = Object.freeze({
    product: {
        baseTable: 'products',
        translationTable: 'product_translations',
        foreignKey: 'product_id',
        publicWhere: "base.status = 'published'"
    },
    category: {
        baseTable: 'categories',
        translationTable: 'category_translations',
        foreignKey: 'category_id',
        publicWhere: 'base.is_active = 1'
    },
    certification: {
        baseTable: 'certifications',
        translationTable: 'certification_translations',
        foreignKey: 'certification_id',
        publicWhere: "base.status = 'published'"
    },
    content_block: {
        baseTable: 'content_blocks',
        translationTable: 'content_block_translations',
        foreignKey: 'content_block_id',
        publicWhere: "base.status = 'published' AND translation.schema_version >= 2"
    }
});

function createRevisionLocalePublicationPolicy(options) {
    options = options || {};
    const db = options.db;
    if (!db) throw new Error('createRevisionLocalePublicationPolicy requires db');
    const registry = options.registry || loadLocaleRegistry();
    const publicLocales = registry.publicEntries.map(function (entry) { return entry.code; });

    function publicationMatrix(input) {
        input = input || {};
        const config = REVISION_ENTITY_CONFIG[input.entityType];
        if (!config) throw new Error('Unsupported publication entity type: ' + input.entityType);
        const entityIds = Array.isArray(input.entityIds)
            ? Array.from(new Set(input.entityIds.map(Number).filter(Number.isInteger)))
            : [];
        const localePlaceholders = publicLocales.map(function () { return '?'; }).join(',');
        const idClause = entityIds.length
            ? 'AND base.id IN (' + entityIds.map(function () { return '?'; }).join(',') + ')'
            : '';
        const rows = db.prepare(`
            SELECT base.id, translation.locale
            FROM ${config.baseTable} base
            JOIN ${config.translationTable} translation
                ON translation.${config.foreignKey} = base.id
                AND translation.revision_state = 'published'
                AND translation.locale IN (${localePlaceholders})
            WHERE ${config.publicWhere} ${idClause}
            ORDER BY base.id, translation.locale
        `).all(publicLocales.concat(entityIds));
        const matrix = {};
        entityIds.forEach(function (id) { matrix[id] = []; });
        rows.forEach(function (row) {
            if (!matrix[row.id]) matrix[row.id] = [];
            matrix[row.id].push(row.locale);
        });
        return matrix;
    }

    function listPublishedEntityIds(input) {
        const matrix = publicationMatrix(input);
        const locale = String(input && input.locale || '').toLowerCase();
        return Object.keys(matrix).filter(function (id) {
            return matrix[id].indexOf(locale) !== -1;
        }).map(Number);
    }

    function listPublishedEntities(rows, locale, input, identifier) {
        const idFor = typeof identifier === 'function' ? identifier : function (row) { return row && row.id; };
        const ids = (rows || []).map(idFor).filter(function (id) { return id != null; });
        const published = new Set(listPublishedEntityIds({ ...input, entityIds: ids, locale }));
        return (rows || []).filter(function (row) { return published.has(Number(idFor(row))); });
    }

    return Object.freeze({ publicationMatrix, listPublishedEntityIds, listPublishedEntities });
}

module.exports = {
    createLocalePublicationPolicy,
    createRevisionLocalePublicationPolicy,
    isBaseEntityPublic
};
