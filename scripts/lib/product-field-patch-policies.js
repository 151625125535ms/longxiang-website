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

function createPolicy(id, allowedFields, validateChange, validateMetadata) {
    return Object.freeze({
        id,
        allowedFields,
        validateChange: validateChange || (() => []),
        validateMetadata: validateMetadata || (() => [])
    });
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
