#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { readPublicProducts } = require('../server/lib/publicProducts');
const { localeEntries } = require('../server/lib/i18nRoutes');
const {
    APPROVED_LEGACY_ALIAS_REDIRECTS,
    resolveLegacyProductRedirect,
    localizedLegacyProductPath
} = require('../server/lib/legacyProductRedirect');

const EXPECTED_ALIAS_REDIRECTS = Object.freeze({
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

function expectedResult(matchedBy, sourceIdentifier, targetIdentifier) {
    return { matchedBy, sourceIdentifier, targetIdentifier };
}

function run() {
    const products = readPublicProducts();
    assert.strictEqual(products.length, 38, 'expected 38 current published products');
    assert(Object.isFrozen(APPROVED_LEGACY_ALIAS_REDIRECTS), 'approved alias map must be frozen');
    assert.deepStrictEqual(APPROVED_LEGACY_ALIAS_REDIRECTS, EXPECTED_ALIAS_REDIRECTS,
        'approved alias map must match the reviewed 28-entry whitelist');
    assert.strictEqual(Object.keys(APPROVED_LEGACY_ALIAS_REDIRECTS).length, 28,
        'approved alias map must contain exactly 28 entries');

    products.forEach(function (product) {
        const targetIdentifier = product.slug || product.id;
        assert.deepStrictEqual(
            resolveLegacyProductRedirect(product.id, products),
            expectedResult('legacy_id', product.id, targetIdentifier),
            'legacy_id must resolve directly: ' + product.id
        );

        const expectedMatch = product.slug === product.id ? 'legacy_id' : 'slug';
        assert.deepStrictEqual(
            resolveLegacyProductRedirect(product.slug, products),
            expectedResult(expectedMatch, product.slug, targetIdentifier),
            'slug must resolve directly: ' + product.slug
        );
    });

    Object.entries(EXPECTED_ALIAS_REDIRECTS).forEach(function ([alias, targetIdentifier]) {
        assert.deepStrictEqual(
            resolveLegacyProductRedirect(alias, products),
            expectedResult('approved_alias', alias, targetIdentifier),
            'approved alias must resolve exactly: ' + alias
        );
    });

    ['3phase-3limb', '3phase-5limb'].forEach(function (identifier) {
        assert.deepStrictEqual(
            resolveLegacyProductRedirect(identifier, products),
            expectedResult('legacy_id', identifier, identifier),
            'formal identifier must win over conflicting alias: ' + identifier
        );
    });

    [undefined, null, '', ' ', ' s13', 's13 ', ['s13'], { id: 's13' }, 'unknown-product'].forEach(function (value) {
        assert.strictEqual(resolveLegacyProductRedirect(value, products), null,
            'invalid identifier must not resolve: ' + JSON.stringify(value));
    });

    const ambiguousLegacy = [
        { id: 'duplicate', slug: 'first' },
        { id: 'duplicate', slug: 'second' }
    ];
    assert.strictEqual(resolveLegacyProductRedirect('duplicate', ambiguousLegacy), null,
        'ambiguous legacy_id must not resolve');

    const ambiguousSlug = [
        { id: 'first-id', slug: 'duplicate-slug' },
        { id: 'second-id', slug: 'duplicate-slug' }
    ];
    assert.strictEqual(resolveLegacyProductRedirect('duplicate-slug', ambiguousSlug), null,
        'ambiguous slug must not resolve');

    assert.strictEqual(resolveLegacyProductRedirect('SCBH15', [{ id: 'other', slug: 'other' }]), null,
        'approved alias with a missing target must not resolve');

    const fixtureProducts = [{ id: 'legacy-value', slug: 'clean-value' }];
    assert.deepStrictEqual(
        resolveLegacyProductRedirect('clean-value', fixtureProducts),
        expectedResult('slug', 'clean-value', 'clean-value'),
        'slug lookup must follow legacy_id lookup when values differ'
    );

    localeEntries().filter(function (locale) {
        return locale.includeInSitemap;
    }).forEach(function (locale) {
        assert.strictEqual(
            localizedLegacyProductPath('S(B)H15-M', locale),
            locale.pathPrefix + '/products/S(B)H15-M',
            'localized path mismatch: ' + locale.code
        );
    });

    console.log('legacy product redirect resolver tests passed (38 products, 28 aliases, 2 conflicts)');
}

run();
