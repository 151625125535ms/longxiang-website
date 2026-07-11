'use strict';

const { readPublicProducts } = require('./publicProducts');

const APPROVED_LEGACY_ALIAS_REDIRECTS = Object.freeze({
    'active-arc-quenching-surge-arrester': 'segmented-arc-quenching-surge-arrester',
    'anti-short-3d': 'silicon-smrl-anti-short',
    dgh: 'amorphous-dgh-furnace',
    DGH: 'amorphous-dgh-furnace',
    'gdmh-arc-quenching-surge-arrester': 'segmented-arc-quenching-surge-arrester',
    'high-overload': 'silicon-s13-vegetable-oil-high-overload',
    'S(B)H15-M': 'amorphous-sbh15-m',
    'S(B)H21-M.RL': 'amorphous-sbh-mrl-wound-core',
    s13: 'silicon-smrl-wound-core',
    'S13-M-RL': 'silicon-smrl-wound-core',
    'S13-M-RL-anti-short': 'silicon-smrl-anti-short',
    'S13-M-vegetable-oil': 'silicon-s13-vegetable-oil-high-overload',
    'S20-M-RL': 'silicon-smrl-wound-core',
    'S20-M-RL-anti-short': 'silicon-smrl-anti-short',
    'S22-M-RL': 'silicon-smrl-wound-core',
    'S22-M-RL-anti-short': 'silicon-smrl-anti-short',
    sbh15: 'amorphous-sbh15-m',
    'SBH21-M-RL': 'amorphous-sbh-mrl-wound-core',
    SCB13: 'silicon-scb-dry',
    scb14: 'silicon-scb-dry',
    SCB14: 'silicon-scb-dry',
    SCB18: 'silicon-scb-dry',
    SCBH15: 'amorphous-scbh-dry',
    SCBH17: 'amorphous-scbh-dry',
    SCBH19: 'amorphous-scbh-dry',
    'segmented-multi-chamber-arc-quenching-surge-arrester': 'segmented-arc-quenching-surge-arrester',
    'single-phase-dry': 'amorphous-scbh-dry',
    'wound-core-oil': 'silicon-smrl-wound-core'
});

function validIdentifier(value) {
    return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function targetIdentifier(product) {
    return String(product && (product.slug || product.id) || '').trim();
}

function uniqueMatch(products, predicate) {
    const matches = products.filter(predicate);
    return matches.length === 1 ? matches[0] : null;
}

function directMatch(products, field, identifier) {
    const matches = products.filter(function (product) {
        return String(product && product[field] || '') === identifier;
    });
    if (matches.length > 1) return { ambiguous: true, product: null };
    return { ambiguous: false, product: matches[0] || null };
}

function result(matchedBy, sourceIdentifier, product) {
    const target = targetIdentifier(product);
    if (!target) return null;
    return {
        matchedBy,
        sourceIdentifier,
        targetIdentifier: target
    };
}

function resolveLegacyProductRedirect(identifier, productsValue) {
    if (!validIdentifier(identifier)) return null;
    const products = Array.isArray(productsValue) ? productsValue : readPublicProducts();

    const legacyIdMatch = directMatch(products, 'id', identifier);
    if (legacyIdMatch.ambiguous) return null;
    if (legacyIdMatch.product) return result('legacy_id', identifier, legacyIdMatch.product);

    const slugMatch = directMatch(products, 'slug', identifier);
    if (slugMatch.ambiguous) return null;
    if (slugMatch.product) return result('slug', identifier, slugMatch.product);

    if (!Object.prototype.hasOwnProperty.call(APPROVED_LEGACY_ALIAS_REDIRECTS, identifier)) return null;
    const approvedTarget = APPROVED_LEGACY_ALIAS_REDIRECTS[identifier];
    const product = uniqueMatch(products, function (item) {
        return targetIdentifier(item) === approvedTarget;
    });
    if (!product) return null;

    return result('approved_alias', identifier, product);
}

function localizedLegacyProductPath(identifier, locale) {
    const prefix = String(locale && locale.pathPrefix || '');
    return prefix + '/products/' + encodeURIComponent(String(identifier || ''));
}

module.exports = {
    APPROVED_LEGACY_ALIAS_REDIRECTS,
    resolveLegacyProductRedirect,
    localizedLegacyProductPath
};
