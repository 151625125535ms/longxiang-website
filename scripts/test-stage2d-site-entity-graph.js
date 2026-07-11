#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const {
    staticSeoRouteDefinitions,
    renderStaticPageSeoHtml
} = require('../server/lib/staticPageSeoRenderer');
const {
    productPageJsonLd,
    productBreadcrumbJsonLd
} = require('../server/lib/productDetailSeoRenderer');
const {
    renderProductListHtml,
    renderProductListSchemaHtml
} = require('../server/lib/productListHtmlRenderer');
const {
    analyzeHtml,
    structuralSignature
} = require('./audit-site-entity-graph');

const ORIGIN = 'https://www.lxenelectric.com';
const ORGANIZATION_ID = ORIGIN + '/#organization';
const WEBSITE_ID = ORIGIN + '/#website';

function parseAttributes(tag) {
    const attributes = {};
    String(tag || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g, function (_, name, __, value) {
        attributes[name.toLowerCase()] = value;
        return '';
    });
    return attributes;
}

function jsonLdEntries(html) {
    return Array.from(String(html || '').matchAll(
        /<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi
    )).map(function (match) {
        return {
            attributes: Object.assign({}, parseAttributes(match[1]), parseAttributes(match[2])),
            value: JSON.parse(match[3])
        };
    });
}

function nodes(value) {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    const output = value['@type'] ? [value] : [];
    if (Array.isArray(value['@graph'])) output.push(...value['@graph'].flatMap(nodes));
    return output;
}

function firstByType(list, type) {
    return list.find(function (node) {
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        return types.includes(type);
    });
}

function runHomeGraphContract() {
    const route = staticSeoRouteDefinitions().find(function (candidate) {
        return candidate.basePath === '/' && candidate.locale.code === 'en';
    });
    assert(route, 'English home SEO route must exist');

    const source = fs.readFileSync(route.filePath, 'utf8');
    const rendered = renderStaticPageSeoHtml(source, route, ORIGIN);
    const entries = jsonLdEntries(rendered);
    const siteGraph = entries.find(function (entry) {
        return entry.attributes['data-schema-auto'] === 'site-graph';
    });

    assert(siteGraph, 'domain home must expose the managed site entity graph');
    assert.strictEqual(siteGraph.value['@context'], 'https://schema.org');
    assert(Array.isArray(siteGraph.value['@graph']), 'site entity graph must contain @graph nodes');

    const graphNodes = nodes(siteGraph.value);
    const organization = firstByType(graphNodes, 'Organization');
    const website = firstByType(graphNodes, 'WebSite');
    const page = firstByType(graphNodes, 'WebPage');

    assert(organization, 'site graph must define Organization');
    assert(website, 'site graph must define WebSite');
    assert(page, 'site graph must define the home WebPage');
    assert.strictEqual(organization['@id'], ORGANIZATION_ID);
    assert.strictEqual(organization.name, 'Longxiang Electric');
    assert.strictEqual(organization.legalName, 'Henan Longxiang Electric Co., Ltd.');
    assert.strictEqual(organization.address, 'Xinzheng City, Zhengzhou City, Henan Province, P.R. China');
    assert.strictEqual(website['@id'], WEBSITE_ID);
    assert.deepStrictEqual(website.publisher, { '@id': ORGANIZATION_ID });
    assert.strictEqual(page['@id'], ORIGIN + '/#webpage');
    assert.deepStrictEqual(page.isPartOf, { '@id': WEBSITE_ID });
    assert.deepStrictEqual(page.about, { '@id': ORGANIZATION_ID });
}

function runProductDetailReferenceContract() {
    const canonicalUrl = ORIGIN + '/products/anti-short-amorphous';
    const product = {
        slug: 'anti-short-amorphous',
        name: 'Anti-short-circuit Amorphous Alloy Transformer',
        shortDesc: 'Stable transformer for demanding distribution projects.',
        image: 'assets/products/anti-short-amorphous.webp'
    };
    const page = productPageJsonLd(product, 'en', canonicalUrl, ORIGIN);
    const breadcrumb = productBreadcrumbJsonLd(product, 'en', canonicalUrl, ORIGIN);

    assert.strictEqual(page['@id'], canonicalUrl + '#webpage');
    assert.deepStrictEqual(page.isPartOf, { '@id': WEBSITE_ID });
    assert.strictEqual(page['@type'], 'WebPage');
    assert.strictEqual(breadcrumb['@id'], canonicalUrl + '#breadcrumb');
    assert.strictEqual(breadcrumb['@type'], 'BreadcrumbList');
}

function runProductListReferenceContract() {
    const source = fs.readFileSync('products.html', 'utf8');
    const rendered = renderProductListHtml(source, {
        locale: 'en',
        products: [],
        taxonomy: [],
        query: {},
        contentBlock: {
            version: 26,
            body: {
                productsHero: {},
                listingSupport: { title: 'Support', items: [] },
                listingCta: { title: 'Contact', text: 'Project support', button: { label: 'Contact', href: 'contact.html' } }
            }
        }
    });
    const entries = jsonLdEntries(rendered);
    const collection = entries.map(function (entry) { return entry.value; }).find(function (value) {
        return value && value['@type'] === 'CollectionPage';
    });
    assert(collection, 'product catalog must retain CollectionPage schema');
    assert.strictEqual(collection['@id'], ORIGIN + '/products.html#webpage');
    assert.deepStrictEqual(collection.isPartOf, { '@id': WEBSITE_ID });
}

function runAllStaticPageReferenceContracts() {
    const routes = staticSeoRouteDefinitions();
    assert.strictEqual(routes.length, 28);
    routes.forEach(function (route) {
        const source = fs.readFileSync(route.filePath, 'utf8');
        const rendered = renderStaticPageSeoHtml(source, route, ORIGIN);
        const allNodes = jsonLdEntries(rendered).flatMap(function (entry) { return nodes(entry.value); });
        const definitions = function (type) {
            return allNodes.filter(function (node) {
                const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
                return types.includes(type);
            });
        };
        const page = firstByType(allNodes, route.schemaType);
        assert(page, 'missing page entity: ' + route.path);
        assert.strictEqual(page['@id'], ORIGIN + route.path + '#webpage', 'page ID mismatch: ' + route.path);
        assert.deepStrictEqual(page.isPartOf, { '@id': WEBSITE_ID }, 'site reference mismatch: ' + route.path);
        if (route.basePath === '/' && route.locale.code === 'en') {
            assert.strictEqual(definitions('Organization').length, 1, 'English domain home Organization count');
            assert.strictEqual(definitions('WebSite').length, 1, 'English domain home WebSite count');
        } else {
            assert.strictEqual(definitions('Organization').length, 0, 'Organization must not be redefined: ' + route.path);
            assert.strictEqual(definitions('WebSite').length, 0, 'WebSite must not be redefined: ' + route.path);
        }
        assert.strictEqual(definitions('LocalBusiness').length, 0, 'LocalBusiness must not be defined: ' + route.path);
    });
}

function runAllProductListReferenceContracts() {
    [
        { locale: 'en', file: 'products.html', canonical: ORIGIN + '/products.html' },
        { locale: 'ar', file: 'ar/products.html', canonical: ORIGIN + '/ar/products.html' },
        { locale: 'fr', file: 'fr/products.html', canonical: ORIGIN + '/fr/products.html' },
        { locale: 'ru', file: 'ru/products.html', canonical: ORIGIN + '/ru/products.html' }
    ].forEach(function (sample) {
        const rendered = renderProductListSchemaHtml(fs.readFileSync(sample.file, 'utf8'), true);
        const allNodes = jsonLdEntries(rendered).flatMap(function (entry) { return nodes(entry.value); });
        const page = firstByType(allNodes, 'CollectionPage');
        assert(page, 'missing product CollectionPage: ' + sample.file);
        assert.strictEqual(page['@id'], sample.canonical + '#webpage');
        assert.deepStrictEqual(page.isPartOf, { '@id': WEBSITE_ID });
        assert.strictEqual(firstByType(allNodes, 'WebSite'), undefined, 'catalog must not define WebSite: ' + sample.file);
    });
}

function runJsonLdScriptSafetyContract() {
    const route = staticSeoRouteDefinitions().find(function (candidate) {
        return candidate.basePath === '/' && candidate.locale.code === 'en';
    });
    const source = fs.readFileSync(route.filePath, 'utf8').replace(
        /(<meta\b[^>]*name=["']description["'][^>]*content=["'])(.*?)(["'][^>]*>)/i,
        '$1&lt;/script&gt;&lt;script&gt;unsafe()&lt;/script&gt;$3'
    );
    const rendered = renderStaticPageSeoHtml(source, route, ORIGIN);
    const siteGraphScript = String(rendered).match(
        /<script\b[^>]*data-schema-auto=["']site-graph["'][^>]*>([\s\S]*?)<\/script>/i
    );
    assert(siteGraphScript, 'safe site graph script must exist');
    assert(!siteGraphScript[1].includes('</script>'), 'JSON-LD data must not contain a literal closing script tag');
    assert(siteGraphScript[1].includes('\\u003c'), 'JSON-LD data must escape less-than characters');
}

function runAuditRegressionContracts() {
    const canonical = ORIGIN + '/about.html';
    const nestedWebsite = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        '@id': canonical + '#webpage',
        url: canonical,
        inLanguage: 'en',
        isPartOf: {
            '@type': 'WebSite',
            '@id': WEBSITE_ID,
            name: 'Duplicate nested website'
        },
        about: { '@id': ORGANIZATION_ID }
    };
    const nestedFailures = [];
    analyzeHtml('TEST', canonical,
        '<link rel="canonical" href="' + canonical + '"><script type="application/ld+json">'
            + JSON.stringify(nestedWebsite) + '</script>', nestedFailures);
    assert(nestedFailures.some(function (failure) { return /redefines WebSite/.test(failure); }),
        'audit must reject a complete WebSite nested inside isPartOf');

    const phoneSchema = Object.assign({}, nestedWebsite, {
        isPartOf: { '@id': WEBSITE_ID },
        name: 'Original page name',
        telephone: '+1 555 010 1000'
    });
    const phoneFailures = [];
    analyzeHtml('TEST', canonical,
        '<link rel="canonical" href="' + canonical + '"><script type="application/ld+json">'
            + JSON.stringify(phoneSchema) + '</script>', phoneFailures);
    assert(phoneFailures.some(function (failure) { return /phone/i.test(failure); }),
        'audit must reject any Schema telephone field because no international phone exists');

    const cleanFailures = [];
    const cleanHtml = '<link rel="canonical" href="' + canonical + '"><script type="application/ld+json">'
        + JSON.stringify(Object.assign({}, phoneSchema, { telephone: undefined })) + '</script>';
    const clean = analyzeHtml('TEST', canonical, cleanHtml, cleanFailures);
    const changed = analyzeHtml('TEST', canonical, cleanHtml.replace('Original page name', 'Changed page name'), []);
    assert.notDeepStrictEqual(structuralSignature(clean), structuralSignature(changed),
        'raw/rendered signature must cover all managed Schema fields');
}

function runSchemaVersionContract() {
    const route = staticSeoRouteDefinitions().find(function (candidate) {
        return candidate.basePath === '/education.html' && candidate.locale.code === 'fr';
    });
    const rendered = renderStaticPageSeoHtml(fs.readFileSync(route.filePath, 'utf8'), Object.assign({}, route, {
        schemaVersion: 44,
        schemaContentBlock: {
            body: {
                hero: { title: 'Education', titleFr: 'Formation version 44' },
                seo: { description: 'English description', descriptionFr: 'Description francaise version 44.' }
            }
        }
    }), ORIGIN);
    const pageEntry = jsonLdEntries(rendered).find(function (entry) {
        return entry.attributes['data-schema-auto'] === 'education-page';
    });
    assert(pageEntry, 'versioned education page Schema must exist');
    assert.strictEqual(pageEntry.attributes['data-schema-version'], '44');
    assert.strictEqual(pageEntry.value.name, 'Formation version 44');
    assert.strictEqual(pageEntry.value.description, 'Description francaise version 44.');
}

runHomeGraphContract();
runProductDetailReferenceContract();
runProductListReferenceContract();
runAllStaticPageReferenceContracts();
runAllProductListReferenceContracts();
runJsonLdScriptSafetyContract();
runAuditRegressionContracts();
runSchemaVersionContract();
console.log('stage2D site entity graph tests passed');
