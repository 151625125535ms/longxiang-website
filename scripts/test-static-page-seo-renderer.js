#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const {
    staticSeoRouteDefinitions,
    renderStaticPageSeoHtml
} = require('../server/lib/staticPageSeoRenderer');

const ORIGIN = 'https://www.lxenelectric.com';
const REQUIRED_HREFLANGS = ['en', 'ar', 'fr', 'ru', 'x-default'];
const DOMESTIC_CONTACT_PATTERN = /17513354200|hnlxdq2003@163\.com/i;

function parseAttributes(tag) {
    const attributes = {};
    String(tag || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g, function (_, name, __, value) {
        attributes[name.toLowerCase()] = value;
        return '';
    });
    return attributes;
}

function headHtml(html) {
    const match = String(html || '').match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    return match ? match[1] : '';
}

function bodyHtml(html) {
    const match = String(html || '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : '';
}

function headLinks(html, rel) {
    return Array.from(headHtml(html).matchAll(/<link\b[^>]*>/gi))
        .map(function (match) { return parseAttributes(match[0]); })
        .filter(function (attributes) {
            return String(attributes.rel || '').toLowerCase() === rel;
        });
}

function jsonLdEntries(html) {
    return Array.from(headHtml(html).matchAll(/<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi))
        .map(function (match) {
            const attributes = Object.assign({}, parseAttributes(match[1]), parseAttributes(match[2]));
            return {
                key: attributes['data-schema-auto'] || '',
                value: JSON.parse(match[3])
            };
        });
}

function topLevelType(entry) {
    return entry && entry.value ? entry.value['@type'] : '';
}

function schemaNodes(entries) {
    return entries.flatMap(function (entry) {
        const values = [];
        if (entry.value && entry.value['@type']) values.push(entry.value);
        if (entry.value && Array.isArray(entry.value['@graph'])) values.push(...entry.value['@graph']);
        return values.map(function (value) {
            return { key: entry.key, value };
        });
    });
}

function expectedAlternates(routes, basePath) {
    const group = routes.filter(function (route) {
        return route.basePath === basePath;
    });
    const output = {};
    group.forEach(function (route) {
        output[route.locale.hreflang] = ORIGIN + route.path;
    });
    const defaultRoute = group.find(function (route) {
        return !route.locale.pathPrefix;
    });
    output['x-default'] = ORIGIN + defaultRoute.path;
    return output;
}

function run() {
    const routes = staticSeoRouteDefinitions();
    assert.strictEqual(routes.length, 28, 'stage2A must expose exactly 28 static SEO routes');
    assert.strictEqual(new Set(routes.map(function (route) { return route.path; })).size, 28, 'static SEO route paths must be unique');

    routes.forEach(function (route) {
        assert(!/products\.html|\/products\//.test(route.path), 'stage2A must not include product or category routes: ' + route.path);
        assert(!/\/pt(?:\/|$)/.test(route.path), 'planned pt route must not be exposed: ' + route.path);

        const source = fs.readFileSync(route.filePath, 'utf8');
        const rendered = renderStaticPageSeoHtml(source, route, ORIGIN);
        const renderedHead = headHtml(rendered);
        const canonicals = headLinks(rendered, 'canonical');
        const alternates = headLinks(rendered, 'alternate');
        const schemas = jsonLdEntries(rendered);
        const flattenedSchemas = schemaNodes(schemas);
        const expected = expectedAlternates(routes, route.basePath);

        assert.strictEqual(bodyHtml(rendered), bodyHtml(source), 'renderer must not change body HTML: ' + route.path);
        assert.strictEqual(canonicals.length, 1, 'route must have exactly one canonical: ' + route.path);
        assert.strictEqual(canonicals[0].href, ORIGIN + route.path, 'canonical mismatch: ' + route.path);
        assert.strictEqual(alternates.length, 5, 'route must have five hreflang alternates: ' + route.path);

        const alternatesByLanguage = {};
        alternates.forEach(function (attributes) {
            alternatesByLanguage[String(attributes.hreflang || '').toLowerCase()] = attributes.href;
        });
        assert.deepStrictEqual(Object.keys(alternatesByLanguage).sort(), REQUIRED_HREFLANGS.slice().sort(),
            'hreflang key mismatch: ' + route.path);
        REQUIRED_HREFLANGS.forEach(function (language) {
            assert.strictEqual(alternatesByLanguage[language], expected[language],
                'hreflang URL mismatch for ' + language + ': ' + route.path);
        });

        const pageSchemas = flattenedSchemas.filter(function (entry) {
            return topLevelType(entry) === route.schemaType;
        });
        assert.strictEqual(pageSchemas.length, 1, 'route must have one ' + route.schemaType + ' schema: ' + route.path);
        const expectedSchemaKey = route.basePath === '/' && route.locale.code === 'en' ? 'site-graph' : route.schemaKey;
        assert.strictEqual(pageSchemas[0].key, expectedSchemaKey, 'page schema key mismatch: ' + route.path);
        assert.strictEqual(pageSchemas[0].value.url, ORIGIN + route.path, 'page schema URL mismatch: ' + route.path);
        assert.strictEqual(pageSchemas[0].value['@id'], ORIGIN + route.path + '#webpage', 'page schema ID mismatch: ' + route.path);
        assert.strictEqual(pageSchemas[0].value.inLanguage, route.locale.htmlLang,
            'page schema language mismatch: ' + route.path);
        assert.deepStrictEqual(pageSchemas[0].value.isPartOf,
            { '@id': ORIGIN + '/#website' }, 'WebSite reference mismatch: ' + route.path);

        const breadcrumbs = flattenedSchemas.filter(function (entry) {
            return topLevelType(entry) === 'BreadcrumbList';
        });
        assert.strictEqual(breadcrumbs.length, route.breadcrumbKey ? 1 : 0,
            'breadcrumb count mismatch: ' + route.path);
        if (route.breadcrumbKey) {
            assert.strictEqual(breadcrumbs[0].key, route.breadcrumbKey, 'breadcrumb key mismatch: ' + route.path);
            assert.strictEqual(breadcrumbs[0].value['@id'], ORIGIN + route.path + '#breadcrumb',
                'breadcrumb ID mismatch: ' + route.path);
            assert.strictEqual(breadcrumbs[0].value.itemListElement[1].item, ORIGIN + route.path,
                'breadcrumb current item mismatch: ' + route.path);
        }

        assert(!/hreflang=["']pt["']|\/pt\//i.test(renderedHead), 'planned pt exposure in head: ' + route.path);
        assert(!/lxelec\.cn/i.test(renderedHead), '.cn must not enter SEO head: ' + route.path);
        assert(!DOMESTIC_CONTACT_PATTERN.test(renderedHead), 'domestic contact leaked into SEO head: ' + route.path);
        assert(!/"(?:telephone|whatsapp)"\s*:/i.test(renderedHead), 'unavailable contact field leaked into schema: ' + route.path);
    });

    const sampleRoute = routes[0];
    const sampleSource = fs.readFileSync(sampleRoute.filePath, 'utf8').replace(
        /<\/head>/i,
        '<link rel="alternate" type="application/rss+xml" href="/feed.xml">\n</head>'
    );
    const sampleRendered = renderStaticPageSeoHtml(sampleSource, sampleRoute, ORIGIN);
    assert(
        headLinks(sampleRendered, 'alternate').some(function (attributes) {
            return attributes.type === 'application/rss+xml' && attributes.href === '/feed.xml';
        }),
        'renderer must preserve non-hreflang alternate links'
    );

    console.log('static page SEO renderer tests passed (28 routes)');
}

run();
