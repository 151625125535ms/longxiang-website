const CATEGORY_MAP = Object.freeze({
    'oil-immersed': { group: 'transformer', subCategory: 'oil-immersed' },
    'dry-type': { group: 'transformer', subCategory: 'dry-type' },
    combined: { group: 'transformer', subCategory: 'combined' },
    special: { group: 'transformer', subCategory: 'special' },
    ac: { group: 'new-energy-equipment', subCategory: 'ac' },
    dc: { group: 'new-energy-equipment', subCategory: 'dc' },
    'energy-storage': { group: 'new-energy-equipment', subCategory: 'energy-storage' },
    'high-voltage': { group: 'switchgear', subCategory: 'high-voltage' },
    'medium-low-voltage': { group: 'switchgear', subCategory: 'medium-low-voltage' },
    switchgear: { group: 'switchgear', subCategory: 'medium-low-voltage' }
});

const VALID_GROUPS = new Set(['transformer', 'new-energy-equipment', 'switchgear']);
const GROUP_ORDER = Object.freeze(['transformer', 'new-energy-equipment', 'switchgear']);

function getCategoryMapping(slug) {
    const key = typeof slug === 'string' ? slug.trim() : '';
    const mapping = CATEGORY_MAP[key];

    if (!mapping) {
        console.warn('[category-helper] Unmapped product category slug:', slug);
        return null;
    }

    return {
        group: mapping.group,
        subCategory: mapping.subCategory
    };
}

module.exports = {
    CATEGORY_MAP,
    VALID_GROUPS,
    GROUP_ORDER,
    getCategoryMapping
};
