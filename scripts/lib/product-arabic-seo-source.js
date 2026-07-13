'use strict';

const crypto = require('crypto');

const ARABIC_SEO_SOURCE_FIELDS = Object.freeze([
    'model',
    'name_ar',
    'short_desc_ar',
    'description_ar'
]);

function asSourceText(value) {
    return value == null ? '' : String(value);
}

function normalizeSourceExpected(value) {
    const source = value || {};
    return ARABIC_SEO_SOURCE_FIELDS.reduce(function (result, field) {
        result[field] = asSourceText(source[field]);
        return result;
    }, {});
}

function canonicalSourceSnapshot(value) {
    const source = value || {};
    return {
        row_id: Number(source.row_id == null ? source.id : source.row_id),
        slug: asSourceText(source.slug),
        legacy_id: asSourceText(source.legacy_id),
        status: asSourceText(source.status),
        version: Number(source.expectedVersion == null ? source.version : source.expectedVersion),
        sourceExpected: normalizeSourceExpected(source.sourceExpected || source)
    };
}

function sourceSnapshotHash(value) {
    return crypto.createHash('sha256')
        .update(JSON.stringify(canonicalSourceSnapshot(value)), 'utf8')
        .digest('hex');
}

module.exports = {
    ARABIC_SEO_SOURCE_FIELDS,
    asSourceText,
    normalizeSourceExpected,
    canonicalSourceSnapshot,
    sourceSnapshotHash
};
