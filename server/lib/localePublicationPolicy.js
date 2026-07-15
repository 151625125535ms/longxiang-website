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

module.exports = { createLocalePublicationPolicy, isBaseEntityPublic };
