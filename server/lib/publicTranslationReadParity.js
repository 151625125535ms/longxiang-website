'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { stableJson } = require('./localeRegistry');
const { createPublicTranslationReadAdapter } = require('./publicTranslationReadAdapter');
const { PUBLIC_SLUGS, localizePublicContentBlock } = require('./publicContentBlocks');
const { readPublicCompanyView } = require('./publicCompanyView');
const { renderGlobalShellHtml } = require('./globalShellHtmlRenderer');
const { renderContentPageHtml } = require('./contentPageHtmlRenderer');
const { renderProductListHtml } = require('./productListHtmlRenderer');
const { renderProductDetailBodyHtml } = require('./productDetailHtmlRenderer');
const { renderProductDetailSeoHtml } = require('./productDetailSeoRenderer');
const { staticSeoRouteDefinitions, renderStaticPageSeoHtml } = require('./staticPageSeoRenderer');
const { localizedHtmlShellPath, baseHrefForLocale } = require('./i18nRoutes');

const ORIGIN = 'https://www.lxenelectric.com';
const CONTENT_PAGE_SLUGS = Object.freeze({
    '/': 'home',
    '/about.html': 'about-us',
    '/solutions.html': 'solutions',
    '/contact.html': 'contact'
});
const SEO_CONTENT_PAGE_SLUGS = Object.freeze({
    '/': 'home',
    '/about.html': 'about-us',
    '/solutions.html': 'solutions',
    '/education.html': 'education',
    '/certifications.html': 'certifications',
    '/compare.html': 'compare',
    '/contact.html': 'contact'
});

function hash(value) {
    return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function safeMetadataView(value) {
    if (Array.isArray(value)) return value.map(safeMetadataView);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce(function (out, key) {
        if (key === 'localization' || key === 'revisionId' || key === 'structureHash') return out;
        out[key] = safeMetadataView(value[key]);
        return out;
    }, {});
}

function compactPreview(value) {
    const serialized = stableJson(value);
    const text = serialized === undefined ? String(value) : serialized;
    return text.length > 240 ? text.slice(0, 237) + '...' : text;
}

function firstDifference(left, right, pathValue) {
    const currentPath = pathValue || '$';
    if (Object.is(left, right)) return null;
    if (typeof left === 'string' && typeof right === 'string') {
        let index = 0;
        while (index < left.length && index < right.length && left[index] === right[index]) index += 1;
        const start = Math.max(0, index - 80);
        const end = index + 160;
        return {
            path: currentPath + '[char:' + index + ']',
            legacy: left.slice(start, end),
            revision: right.slice(start, end)
        };
    }
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right)) return { path: currentPath, legacy: left, revision: right };
        if (left.length !== right.length) return { path: currentPath + '.length', legacy: left.length, revision: right.length };
        for (let index = 0; index < left.length; index += 1) {
            const difference = firstDifference(left[index], right[index], currentPath + '[' + index + ']');
            if (difference) return difference;
        }
        return null;
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
        const keys = Array.from(new Set(Object.keys(left).concat(Object.keys(right)))).sort();
        for (const key of keys) {
            if (!Object.prototype.hasOwnProperty.call(left, key) || !Object.prototype.hasOwnProperty.call(right, key)) {
                return { path: currentPath + '.' + key, legacy: left[key], revision: right[key] };
            }
            const difference = firstDifference(left[key], right[key], currentPath + '.' + key);
            if (difference) return difference;
        }
        return null;
    }
    return { path: currentPath, legacy: left, revision: right };
}

function createCollector() {
    const report = { exact: [], safeDifferences: [], blockers: [] };
    function compare(name, legacyValue, revisionValue, options) {
        const legacyHash = hash(legacyValue);
        const revisionHash = hash(revisionValue);
        if (legacyHash === revisionHash) {
            report.exact.push({ name, hash: legacyHash });
            return;
        }
        const safeLegacy = safeMetadataView(legacyValue);
        const safeRevision = safeMetadataView(revisionValue);
        if (options && options.allowRevisionMetadata && hash(safeLegacy) === hash(safeRevision)) {
            report.safeDifferences.push({
                name,
                reason: 'localization or revision metadata only',
                legacyHash,
                revisionHash
            });
            return;
        }
        const approvedReason = options && typeof options.approvedDifference === 'function'
            ? options.approvedDifference(safeLegacy, safeRevision)
            : '';
        if (approvedReason) {
            report.safeDifferences.push({
                name,
                reason: approvedReason,
                legacyHash,
                revisionHash
            });
            return;
        }
        const difference = firstDifference(safeLegacy, safeRevision);
        report.blockers.push({
            name,
            path: difference && difference.path || '$',
            legacy: compactPreview(difference && difference.legacy),
            revision: compactPreview(difference && difference.revision),
            legacyHash,
            revisionHash
        });
    }
    return { report, compare };
}

function approvedAboutSsrBaselineConvergence(legacyValue, revisionValue) {
    const legacy = safeMetadataView(legacyValue);
    const revision = safeMetadataView(revisionValue);
    const rows = revision && revision.body && revision.body.snapshot && revision.body.snapshot.body;
    if (!Array.isArray(rows) || rows.length !== 3
        || rows.some(function (row) { return !row || typeof row !== 'object' || typeof row.text !== 'string'; })) return '';
    const companyFieldsMatch = rows[0].companyField === 'aboutIntro'
        && rows[1].companyField === 'aboutDetail'
        && !rows[2].companyField;
    const companyFieldsAbsent = rows.every(function (row) { return !row.companyField; });
    if (!companyFieldsMatch && !companyFieldsAbsent) return '';
    if (!legacy || !legacy.body || !legacy.body.snapshot
        || !Array.isArray(legacy.body.snapshot.body)) return '';
    legacy.body.snapshot.body = rows;
    return hash(legacy) === hash(revision)
        ? 'user-approved About API convergence to the current production SSR baseline'
        : '';
}

function normalizeApprovedEducationSortOrder(legacyValue, revisionValue, pathValue, removedPaths) {
    const currentPath = pathValue || '$';
    if (Array.isArray(revisionValue)) {
        if (!Array.isArray(legacyValue) || legacyValue.length !== revisionValue.length) return revisionValue;
        return revisionValue.map(function (item, index) {
            return normalizeApprovedEducationSortOrder(legacyValue[index], item, currentPath + '[' + index + ']', removedPaths);
        });
    }
    if (revisionValue && typeof revisionValue === 'object') {
        if (!legacyValue || typeof legacyValue !== 'object' || Array.isArray(legacyValue)) return revisionValue;
        return Object.keys(revisionValue).reduce(function (out, key) {
            const childPath = currentPath + '.' + key;
            const missingFromLegacy = !Object.prototype.hasOwnProperty.call(legacyValue, key);
            if (missingFromLegacy && key === 'sort_order'
                && /^\$\.body\.sections\[\d+\]\.cards\[\d+\]\.sort_order$/.test(childPath)
                && Number.isInteger(revisionValue[key]) && revisionValue[key] >= 0) {
                removedPaths.push(childPath);
                return out;
            }
            out[key] = normalizeApprovedEducationSortOrder(legacyValue[key], revisionValue[key], childPath, removedPaths);
            return out;
        }, {});
    }
    return revisionValue;
}

function approvedEducationSortOrderMetadata(legacyValue, revisionValue) {
    const removedPaths = [];
    const normalizedRevision = normalizeApprovedEducationSortOrder(
        legacyValue,
        revisionValue,
        '$',
        removedPaths
    );
    if (!removedPaths.length || hash(legacyValue) !== hash(normalizedRevision)) return '';
    return 'revision adds ' + removedPaths.length + ' validated Education card sort_order field(s) only';
}

function approvedAboutSsrCompanyFieldMetadata(legacyValue, revisionValue) {
    if (typeof legacyValue !== 'string' || typeof revisionValue !== 'string') return '';
    const matches = revisionValue.match(/ data-company-field="(?:aboutIntro|aboutDetail)"/g) || [];
    if (matches.length !== 2
        || matches.indexOf(' data-company-field="aboutIntro"') === -1
        || matches.indexOf(' data-company-field="aboutDetail"') === -1) return '';
    const normalizedRevision = revisionValue.replace(/ data-company-field="(?:aboutIntro|aboutDetail)"/g, '');
    return normalizedRevision === legacyValue
        ? 'revision adds the two inert About company-field markers only'
        : '';
}

function renderShell(html, adapter, locale, pathname, company) {
    const shell = localizePublicContentBlock(adapter.readPresentationContentBlock('global-shell', locale.code), locale.code);
    return renderGlobalShellHtml(html, {
        locale: locale.code,
        pathname,
        shell,
        company
    });
}

function renderStaticRoute(route, adapter, company) {
    const html = fs.readFileSync(route.filePath, 'utf8');
    const contentSlug = CONTENT_PAGE_SLUGS[route.basePath];
    const seoSlug = SEO_CONTENT_PAGE_SLUGS[route.basePath];
    const block = seoSlug ? adapter.readPresentationContentBlock(seoSlug, route.locale.code) : null;
    const body = contentSlug
        ? renderContentPageHtml(html, { slug: contentSlug, locale: route.locale, block })
        : html;
    const withShell = renderShell(body, adapter, route.locale, route.path, company);
    return renderStaticPageSeoHtml(withShell, Object.assign({}, route, {
        schemaVersion: block && block.version || 0,
        schemaContentBlock: block
    }), ORIGIN);
}

function renderProductList(locale, adapter, company) {
    const html = fs.readFileSync(localizedHtmlShellPath('products.html', locale), 'utf8');
    const withBase = html.replace(/<head>/i, '<head>\n    <base href="' + baseHrefForLocale(locale) + '">');
    const rendered = renderProductListHtml(withBase, {
        locale,
        products: adapter.readPresentationProducts(locale.code),
        taxonomy: adapter.readPresentationProductCategories(locale.code),
        query: {},
        contentBlock: adapter.readPresentationContentBlock('product-pages', locale.code),
        requireSeoSchema: true
    });
    return renderShell(rendered, adapter, locale, locale.pathPrefix + '/products.html', company);
}

function renderProductDetail(identifier, locale, adapter, company) {
    const html = fs.readFileSync(localizedHtmlShellPath('product-detail.html', locale), 'utf8');
    const withBase = html.replace(/<head>/i, '<head>\n    <base href="' + baseHrefForLocale(locale) + '">');
    const product = adapter.readPresentationProduct(identifier, locale.code);
    const block = adapter.readPresentationContentBlock('product-pages', locale.code);
    const withSeo = renderProductDetailSeoHtml(withBase, product, locale, ORIGIN);
    const withBody = renderProductDetailBodyHtml(withSeo, {
        locale,
        product,
        products: adapter.readPresentationProducts(locale.code),
        contentBlock: block
    });
    return renderShell(withBody, adapter, locale, locale.pathPrefix + '/products/' + encodeURIComponent(identifier), company);
}

function databaseFingerprint(db) {
    const tables = [
        'products', 'product_media', 'product_specs', 'product_translations', 'product_spec_translation_values',
        'categories', 'category_translations', 'certifications', 'certification_translations',
        'content_blocks', 'content_block_translations', 'content_translation_schemas'
    ];
    const state = {
        schemaVersion: Number(db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get().version),
        tables: {}
    };
    tables.forEach(function (table) {
        const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
        state.tables[table] = exists
            ? db.prepare('SELECT COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id FROM ' + table).get()
            : { missing: true };
    });
    return { hash: hash(state), state };
}

function comparePublicTranslationSources(options) {
    options = options || {};
    const db = options.db;
    const registry = options.registry;
    if (!db || !registry) throw new Error('comparePublicTranslationSources requires db and registry.');
    const legacy = createPublicTranslationReadAdapter({ db, registry, source: 'legacy' });
    const revision = createPublicTranslationReadAdapter({ db, registry, source: 'revision' });
    const collector = createCollector();
    const company = readPublicCompanyView(db);
    const locales = registry.publicEntries;
    const productIdentifiers = legacy.readProducts().map(function (product) { return product.slug || product.id; });

    collector.compare('api/legacy/products', legacy.readProducts(), revision.readProducts());
    collector.compare('api/legacy/categories', legacy.readProductCategories(), revision.readProductCategories());
    collector.compare('api/legacy/certifications', legacy.readCertifications(), revision.readCertifications());
    Array.from(PUBLIC_SLUGS).sort().forEach(function (slug) {
        collector.compare('api/legacy/content/' + slug, legacy.readContentBlock(slug), revision.readContentBlock(slug));
    });

    locales.forEach(function (locale) {
        const code = locale.code;
        collector.compare('api/locale/' + code + '/products', legacy.readLocalizedProducts(code), revision.readLocalizedProducts(code));
        collector.compare('api/locale/' + code + '/categories', legacy.readLocalizedProductCategories(code), revision.readLocalizedProductCategories(code));
        collector.compare('api/locale/' + code + '/certifications', legacy.readLocalizedCertifications(code), revision.readLocalizedCertifications(code));
        Array.from(PUBLIC_SLUGS).sort().forEach(function (slug) {
            collector.compare(
                'api/locale/' + code + '/content/' + slug,
                legacy.readLocalizedContentBlock(slug, code),
                revision.readLocalizedContentBlock(slug, code),
                {
                    allowRevisionMetadata: true,
                    approvedDifference: slug === 'about-us' && ['ar', 'fr', 'ru'].indexOf(code) !== -1
                        ? approvedAboutSsrBaselineConvergence
                        : code === 'fr' && slug === 'education'
                            ? approvedEducationSortOrderMetadata
                            : null
                }
            );
        });
        productIdentifiers.forEach(function (identifier) {
            collector.compare(
                'api/locale/' + code + '/product/' + identifier,
                legacy.readLocalizedProduct(identifier, code),
                revision.readLocalizedProduct(identifier, code)
            );
        });
        collector.compare('ssr/product-list/' + code, renderProductList(locale, legacy, company), renderProductList(locale, revision, company));
        productIdentifiers.forEach(function (identifier) {
            collector.compare(
                'ssr/product-detail/' + code + '/' + identifier,
                renderProductDetail(identifier, locale, legacy, company),
                renderProductDetail(identifier, locale, revision, company)
            );
        });
    });

    staticSeoRouteDefinitions().forEach(function (route) {
        collector.compare(
            'ssr/static' + route.path,
            renderStaticRoute(route, legacy, company),
            renderStaticRoute(route, revision, company),
            {
                approvedDifference: route.basePath === '/about.html' && ['fr', 'ru'].indexOf(route.locale.code) !== -1
                    ? approvedAboutSsrCompanyFieldMetadata
                    : null
            }
        );
    });

    const report = collector.report;
    report.summary = {
        checks: report.exact.length + report.safeDifferences.length + report.blockers.length,
        exact: report.exact.length,
        safeDifferences: report.safeDifferences.length,
        blockers: report.blockers.length,
        locales: locales.map(function (entry) { return entry.code; }),
        products: productIdentifiers.length
    };
    return report;
}

module.exports = {
    comparePublicTranslationSources,
    databaseFingerprint,
    safeMetadataView,
    firstDifference,
    compactPreview,
    approvedEducationSortOrderMetadata,
    approvedAboutSsrCompanyFieldMetadata
};
