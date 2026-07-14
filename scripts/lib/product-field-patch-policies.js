const { ARABIC_SEO_SOURCE_FIELDS } = require('./product-arabic-seo-source');
const { forwardContentSha256 } = require('./product-arabic-seo-patch-pair');

const DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID = 'fr-ru-localization-v1';

const FR_RU_LOCALIZATION_FIELDS = Object.freeze([
    'name_fr',
    'name_ru',
    'short_desc_fr',
    'short_desc_ru',
    'description_fr',
    'description_ru',
    'seo_title_fr',
    'seo_title_ru',
    'seo_description_fr',
    'seo_description_ru',
    'seo_keywords_fr',
    'seo_keywords_ru'
]);

const SEARCH_COPY_FIELDS = Object.freeze([
    'seo_title',
    'seo_description',
    'name_en',
    'name_ar',
    'short_desc_ar'
]);

const ARABIC_SEO_FIELDS = Object.freeze([
    'seo_title_ar',
    'seo_description_ar',
    'seo_keywords_ar'
]);

const ARABIC_MODEL_CODE_FIELDS = Object.freeze([
    'name_ar',
    'short_desc_ar',
    'description_ar'
]);

function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

const ARABIC_NATURAL_ENGLISH_PATTERN = /\b(and|with|for|series|class|optional|power|generation|distribution|control|cooling|alloy|steel|core|transformer|switchgear|device|substation|project|specific|customized|single|phase|three|five|wire|built|fan|lithium|phosphate|integrated|charging|stack|air|liquid|indoor|outdoor|enclosure|compartment|circuit|breaker|door|open|below|residential|commercial|industrial|high|voltage|oil|immersed|free|fire|explosion|hazard|pollution|chemical|corrosion|vibration|efficient|efficiency|compact|box|type)\b/i;

function sortedMatches(value, regex) {
    return Array.from(String(value || '').matchAll(regex), (match) => String(match[1] || match[0]).toLowerCase()).sort();
}

function sameValues(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validatePreservedArabicTokens(expected, target) {
    const errors = [];
    const beforeNumbers = sortedMatches(expected, /(\d+(?:\.\d+)?)/g);
    const afterNumbers = sortedMatches(target, /(\d+(?:\.\d+)?)/g);
    if (!sameValues(beforeNumbers, afterNumbers)) errors.push('must preserve all numeric tokens.');

    const unitPattern = /\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(kVA|kWh|MWh|kW|MW|kV|Vac|VAC|Hz|Ah|V|A)\b/gi;
    const beforeUnits = sortedMatches(expected, unitPattern);
    const afterUnits = sortedMatches(target, unitPattern);
    if (!sameValues(beforeUnits, afterUnits)) errors.push('must preserve all unit tokens.');

    const codePattern = /\b(ONAN|AN|AF|IEC|GB|IP\d+[A-Z]?|AC|DC|PV|EV|GCS|LXDC|LXWZ|S-M)\b/g;
    const beforeCodes = sortedMatches(expected, codePattern);
    const afterCodes = sortedMatches(target, codePattern);
    if (!sameValues(beforeCodes, afterCodes)) errors.push('must preserve all allowed model, brand, and international code tokens.');
    return errors;
}

function validateSearchCopyChange(change) {
    const field = change.field;
    const target = change.target;
    const rollback = change.operation === 'rollback';
    if ((field === 'name_en' || field === 'name_ar' || field === 'short_desc_ar') && !target.trim()) {
        return ['must not be empty.'];
    }
    if (field === 'seo_title') {
        const errors = [];
        if (!target.trim()) errors.push('must not be empty.');
        if (target.length > 90) errors.push('must not exceed 90 characters.');
        if (/(\.\.\.|…)$/.test(target)) errors.push('must not end with an ellipsis.');
        return errors;
    }
    if (field === 'seo_description') {
        const errors = [];
        if (!target.trim()) errors.push('must not be empty.');
        if (!rollback && (target.length < 120 || target.length > 170)) errors.push('must contain 120-170 characters.');
        if (!rollback && /(\.\.\.|…)$/.test(target)) errors.push('must not end with an ellipsis.');
        return errors;
    }
    if (field === 'short_desc_ar') {
        const errors = validatePreservedArabicTokens(change.expected, target);
        if (!rollback && ARABIC_NATURAL_ENGLISH_PATTERN.test(target)) errors.push('must not contain unclassified English natural-language prose.');
        return errors;
    }
    return [];
}

function validateSearchCopyMetadata(meta) {
    return meta && (meta.operation === 'forward' || meta.operation === 'rollback')
        ? []
        : ['meta.operation must be forward or rollback.'];
}

function validateArabicSeoChange(change) {
    if (change.operation === 'rollback') return [];
    const target = change.target.trim();
    const errors = [];
    if (!target) errors.push('must not be empty.');
    if (/[`<>\r\n]/.test(target)) errors.push('must not contain HTML, Markdown backticks, or line breaks.');
    if (!/[\u0600-\u06ff]/.test(target)) errors.push('must contain Arabic text.');
    if (ARABIC_NATURAL_ENGLISH_PATTERN.test(target)) errors.push('must not contain unclassified English natural-language prose.');
    if (change.field === 'seo_title_ar') {
        if (Array.from(target).length < 20 || Array.from(target).length > 70) errors.push('must contain 20-70 characters.');
        if (/(\.\.\.|…)$/.test(target)) errors.push('must not end with an ellipsis.');
    } else if (change.field === 'seo_description_ar') {
        if (Array.from(target).length < 90 || Array.from(target).length > 160) errors.push('must contain 90-160 characters.');
        if (/(\.\.\.|…)$/.test(target)) errors.push('must not end with an ellipsis.');
    } else if (change.field === 'seo_keywords_ar') {
        const keywords = target.split(/[,،]/).map((value) => value.trim()).filter(Boolean);
        const unique = new Set(keywords.map((value) => value.toLowerCase()));
        if (keywords.length < 3 || keywords.length > 6) errors.push('must contain 3-6 comma-separated keywords.');
        if (unique.size !== keywords.length) errors.push('must not contain duplicate keywords.');
    }
    return errors;
}

function validateArabicSeoMetadata(meta, context) {
    const errors = [];
    if (!meta || (meta.operation !== 'forward' && meta.operation !== 'rollback')) {
        errors.push('meta.operation must be forward or rollback.');
        return errors;
    }
    if (context && context.mode === 'apply' && meta.operation === 'forward' && meta.approval_status !== 'approved') {
        errors.push('forward apply requires meta.approval_status to be approved.');
    }
    if (meta.operation === 'rollback'
        && (typeof meta.forward_content_sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(meta.forward_content_sha256))) {
        errors.push('rollback requires meta.forward_content_sha256.');
    }
    return errors;
}

function validateArabicModelCodeChange(change) {
    const meta = change.meta || {};
    const from = String(meta.model_code_from || '');
    const to = String(meta.model_code_to || '');
    if (!from || !to || from === to) return ['requires distinct meta.model_code_from and meta.model_code_to values.'];
    if (!change.expected.includes(from)) return ['expected value must contain meta.model_code_from.'];
    const strictTarget = change.expected.split(from).join(to);
    if (change.target !== strictTarget) {
        return ['must only replace every exact meta.model_code_from occurrence with meta.model_code_to.'];
    }
    return [];
}

function validateArabicModelCodeMetadata(meta, context) {
    const errors = [];
    if (!meta || (meta.operation !== 'forward' && meta.operation !== 'rollback')) {
        errors.push('meta.operation must be forward or rollback.');
        return errors;
    }
    const expectedDirection = meta.operation === 'forward'
        ? { from: 'S(S)H', to: 'S(B)H' }
        : { from: 'S(B)H', to: 'S(S)H' };
    if (meta.model_code_from !== expectedDirection.from || meta.model_code_to !== expectedDirection.to) {
        errors.push(meta.operation + ' must use model-code direction '
            + expectedDirection.from + ' -> ' + expectedDirection.to + '.');
    }
    if (context && context.mode === 'apply' && meta.operation === 'forward' && meta.approval_status !== 'approved') {
        errors.push('forward apply requires meta.approval_status to be approved.');
    }
    if (meta.operation === 'rollback'
        && (typeof meta.forward_content_sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(meta.forward_content_sha256))) {
        errors.push('rollback requires meta.forward_content_sha256.');
    }
    return errors;
}

function validateArabicModelCodePatchPair(forward, rollback) {
    const errors = [];
    if (!forward || !forward.meta || forward.meta.policy !== 'arabic-model-code-correction-v1'
        || forward.meta.operation !== 'forward') {
        errors.push('Paired forward patch must use arabic-model-code-correction-v1 / forward metadata.');
    }
    if (!rollback || !rollback.meta || rollback.meta.policy !== 'arabic-model-code-correction-v1'
        || rollback.meta.operation !== 'rollback') {
        errors.push('Rollback patch must use arabic-model-code-correction-v1 / rollback metadata.');
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
        if (!item || !Number.isInteger(item.row_id) || forwardByRow.has(item.row_id)) {
            errors.push('Paired forward patch has an invalid or duplicate row_id.');
            return;
        }
        forwardByRow.set(item.row_id, item);
    });
    const rollbackRows = new Set();
    rollbackProducts.forEach(function (item) {
        if (!item || !Number.isInteger(item.row_id) || rollbackRows.has(item.row_id)) {
            errors.push('Rollback patch has an invalid or duplicate row_id.');
            return;
        }
        rollbackRows.add(item.row_id);
        const paired = forwardByRow.get(item.row_id);
        if (!paired) {
            errors.push('Rollback product ' + item.row_id + ' is missing from the paired forward patch.');
            return;
        }
        ['slug', 'legacy_id', 'status'].forEach(function (field) {
            if (String(item[field] || '') !== String(paired[field] || '')) {
                errors.push('Rollback product ' + item.row_id + ' has a mismatched ' + field + '.');
            }
        });
        if (!isPlainObject(paired.expected) || !isPlainObject(paired.target)
            || !isPlainObject(item.expected) || !isPlainObject(item.target)) {
            errors.push('Forward and rollback product ' + item.row_id + ' require expected and target objects.');
            return;
        }
        ARABIC_MODEL_CODE_FIELDS.forEach(function (field) {
            if (item.expected[field] !== paired.target[field]) {
                errors.push('Rollback product ' + item.row_id + ' expected.' + field + ' is not the forward target.');
            }
            if (item.target[field] !== paired.expected[field]) {
                errors.push('Rollback product ' + item.row_id + ' target.' + field + ' is not the forward expected value.');
            }
        });
    });
    forwardByRow.forEach(function (_item, rowId) {
        if (!rollbackRows.has(rowId)) errors.push('Paired forward product ' + rowId + ' is missing from rollback.');
    });
    return { digest, errors };
}

function createPolicy(id, allowedFields, validateChange, validateMetadata, options) {
    return Object.freeze(Object.assign({
        id,
        allowedFields,
        validateChange: validateChange || (() => []),
        validateMetadata: validateMetadata || (() => [])
    }, options || {}));
}

const PRODUCT_FIELD_PATCH_POLICIES = Object.freeze({
    [DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID]: createPolicy(
        DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID,
        FR_RU_LOCALIZATION_FIELDS
    ),
    'search-copy-v1': createPolicy(
        'search-copy-v1',
        SEARCH_COPY_FIELDS,
        validateSearchCopyChange,
        validateSearchCopyMetadata
    ),
    'arabic-seo-v1': createPolicy(
        'arabic-seo-v1',
        ARABIC_SEO_FIELDS,
        validateArabicSeoChange,
        validateArabicSeoMetadata,
        {
            requiredFields: ARABIC_SEO_FIELDS,
            requiredIdentityFields: ['row_id', 'slug', 'legacy_id'],
            requiredStatus: true,
            atomicRevalidation: true,
            forwardGuard: {
                exactActiveSet: true,
                expectedVersion: true,
                sourceFields: ARABIC_SEO_SOURCE_FIELDS,
                sourceSnapshotHash: true
            },
            rollbackGuard: {
                pairedForward: true,
                approvedForwardForApply: true
            }
        }
    ),
    'arabic-model-code-correction-v1': createPolicy(
        'arabic-model-code-correction-v1',
        ARABIC_MODEL_CODE_FIELDS,
        validateArabicModelCodeChange,
        validateArabicModelCodeMetadata,
        {
            requiredFields: ARABIC_MODEL_CODE_FIELDS,
            requiredIdentityFields: ['row_id', 'slug', 'legacy_id'],
            requiredStatus: true,
            atomicRevalidation: true,
            forwardGuard: {
                expectedVersion: true
            },
            rollbackGuard: {
                pairedForward: true,
                approvedForwardForApply: true
            },
            validatePatchPair: validateArabicModelCodePatchPair
        }
    )
});

function getProductFieldPatchPolicy(policyId) {
    const id = String(policyId || DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID);
    const policy = PRODUCT_FIELD_PATCH_POLICIES[id];
    if (!policy) throw new Error('Unknown product field patch policy: ' + id);
    return policy;
}

module.exports = {
    DEFAULT_PRODUCT_FIELD_PATCH_POLICY_ID,
    getProductFieldPatchPolicy
};
