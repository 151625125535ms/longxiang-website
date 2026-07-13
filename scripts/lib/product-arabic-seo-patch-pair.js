'use strict';

const crypto = require('crypto');

const ARABIC_SEO_FIELDS = Object.freeze([
    'seo_title_ar',
    'seo_description_ar',
    'seo_keywords_ar'
]);

function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!isPlainObject(value)) return value;
    return Object.keys(value).sort().reduce(function (result, key) {
        result[key] = canonicalize(value[key]);
        return result;
    }, {});
}

function forwardContentSha256(forward) {
    const payload = {
        policy: forward && forward.meta ? forward.meta.policy : '',
        operation: forward && forward.meta ? forward.meta.operation : '',
        products: Array.isArray(forward && forward.products) ? forward.products : []
    };
    return crypto.createHash('sha256').update(JSON.stringify(canonicalize(payload)), 'utf8').digest('hex');
}

function sameFieldSet(value) {
    if (!isPlainObject(value)) return false;
    const keys = Object.keys(value).sort();
    return keys.length === ARABIC_SEO_FIELDS.length && keys.every(function (key, index) {
        return key === ARABIC_SEO_FIELDS.slice().sort()[index] && typeof value[key] === 'string';
    });
}

function validateArabicSeoPatchPair(forward, rollback) {
    const errors = [];
    if (!forward || !forward.meta || forward.meta.policy !== 'arabic-seo-v1' || forward.meta.operation !== 'forward') {
        errors.push('Paired forward patch must use arabic-seo-v1 / forward metadata.');
    }
    if (!rollback || !rollback.meta || rollback.meta.policy !== 'arabic-seo-v1' || rollback.meta.operation !== 'rollback') {
        errors.push('Rollback patch must use arabic-seo-v1 / rollback metadata.');
    }

    const digest = forwardContentSha256(forward || {});
    if (!rollback || !rollback.meta || rollback.meta.forward_content_sha256 !== digest) {
        errors.push('Rollback forward_content_sha256 does not match the paired forward patch content.');
    }

    const forwardProducts = Array.isArray(forward && forward.products) ? forward.products : [];
    const rollbackProducts = Array.isArray(rollback && rollback.products) ? rollback.products : [];
    if (forwardProducts.length !== rollbackProducts.length) {
        errors.push('Forward and rollback product counts differ.');
    }

    const forwardByRow = new Map();
    forwardProducts.forEach(function (item) {
        const rowId = Number(item && item.row_id);
        if (!Number.isInteger(rowId) || rowId <= 0 || forwardByRow.has(rowId)) {
            errors.push('Paired forward patch has an invalid or duplicate row_id: ' + rowId + '.');
            return;
        }
        forwardByRow.set(rowId, item);
    });

    const rollbackRows = new Set();
    rollbackProducts.forEach(function (item) {
        const rowId = Number(item && item.row_id);
        if (!Number.isInteger(rowId) || rowId <= 0 || rollbackRows.has(rowId)) {
            errors.push('Rollback patch has an invalid or duplicate row_id: ' + rowId + '.');
            return;
        }
        rollbackRows.add(rowId);
        const paired = forwardByRow.get(rowId);
        if (!paired) {
            errors.push('Rollback product ' + rowId + ' is missing from the paired forward patch.');
            return;
        }
        ['slug', 'legacy_id', 'status'].forEach(function (field) {
            if (String(item[field] == null ? '' : item[field]) !== String(paired[field] == null ? '' : paired[field])) {
                errors.push('Rollback product ' + rowId + ' has a mismatched ' + field + '.');
            }
        });
        if (!sameFieldSet(paired.expected) || !sameFieldSet(paired.target)
            || !sameFieldSet(item.expected) || !sameFieldSet(item.target)) {
            errors.push('Forward and rollback product ' + rowId + ' must contain exactly the three Arabic SEO fields.');
            return;
        }
        ARABIC_SEO_FIELDS.forEach(function (field) {
            if (item.expected[field] !== paired.target[field]) {
                errors.push('Rollback product ' + rowId + ' expected.' + field + ' is not the forward target.');
            }
            if (item.target[field] !== paired.expected[field]) {
                errors.push('Rollback product ' + rowId + ' target.' + field + ' is not the forward expected value.');
            }
        });
    });

    forwardByRow.forEach(function (_item, rowId) {
        if (!rollbackRows.has(rowId)) errors.push('Paired forward product ' + rowId + ' is missing from rollback.');
    });
    return { digest, errors };
}

module.exports = {
    ARABIC_SEO_FIELDS,
    forwardContentSha256,
    validateArabicSeoPatchPair
};
