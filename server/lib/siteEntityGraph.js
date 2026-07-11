'use strict';

const { PUBLIC_COMPANY_IDENTITY } = require('./companyIdentity');

const SITE_ORIGIN = String(PUBLIC_COMPANY_IDENTITY.globalWebsite || 'https://www.lxenelectric.com/')
    .replace(/\/+$/, '');
const SITE_ENTITY_IDS = Object.freeze({
    organization: SITE_ORIGIN + '/#organization',
    website: SITE_ORIGIN + '/#website',
    logo: SITE_ORIGIN + '/#logo'
});

function entityReference(id) {
    return { '@id': id };
}

function pageEntityId(canonicalUrl) {
    return String(canonicalUrl || '').replace(/#.*$/, '') + '#webpage';
}

function breadcrumbEntityId(canonicalUrl) {
    return String(canonicalUrl || '').replace(/#.*$/, '') + '#breadcrumb';
}

function buildOrganizationEntity(description) {
    const entity = {
        '@type': 'Organization',
        '@id': SITE_ENTITY_IDS.organization,
        name: PUBLIC_COMPANY_IDENTITY.brandName,
        legalName: PUBLIC_COMPANY_IDENTITY.legalName,
        url: PUBLIC_COMPANY_IDENTITY.globalWebsite,
        logo: SITE_ORIGIN + '/assets/optimized/longxiang-logo-symbol-320.webp',
        email: PUBLIC_COMPANY_IDENTITY.globalSalesEmail,
        address: PUBLIC_COMPANY_IDENTITY.headquarters
    };
    if (description) entity.description = description;
    return entity;
}

function buildWebsiteEntity() {
    return {
        '@type': 'WebSite',
        '@id': SITE_ENTITY_IDS.website,
        url: PUBLIC_COMPANY_IDENTITY.globalWebsite,
        name: PUBLIC_COMPANY_IDENTITY.brandName,
        publisher: entityReference(SITE_ENTITY_IDS.organization)
    };
}

function buildPageEntity(options) {
    options = options || {};
    const entity = {
        '@type': options.type || 'WebPage',
        '@id': pageEntityId(options.canonicalUrl),
        name: options.name || PUBLIC_COMPANY_IDENTITY.brandName,
        description: options.description || options.name || PUBLIC_COMPANY_IDENTITY.brandName,
        url: options.canonicalUrl,
        inLanguage: options.language || 'en',
        isPartOf: entityReference(SITE_ENTITY_IDS.website)
    };
    if (options.aboutOrganization) {
        entity.about = entityReference(SITE_ENTITY_IDS.organization);
    }
    if (options.primaryImageOfPage) {
        entity.primaryImageOfPage = options.primaryImageOfPage;
    }
    return entity;
}

function buildHomeSiteGraph(options) {
    const page = buildPageEntity({
        type: 'WebPage',
        canonicalUrl: options.canonicalUrl,
        name: options.name,
        description: options.description,
        language: options.language,
        aboutOrganization: true
    });
    return {
        '@context': 'https://schema.org',
        '@graph': [
            buildOrganizationEntity(options.description),
            buildWebsiteEntity(),
            page
        ]
    };
}

function standaloneSchema(entity) {
    return Object.assign({ '@context': 'https://schema.org' }, entity);
}

function buildBreadcrumbEntity(options) {
    return {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbEntityId(options.canonicalUrl),
        itemListElement: options.items
    };
}

module.exports = {
    SITE_ORIGIN,
    SITE_ENTITY_IDS,
    entityReference,
    pageEntityId,
    breadcrumbEntityId,
    buildOrganizationEntity,
    buildWebsiteEntity,
    buildPageEntity,
    buildHomeSiteGraph,
    buildBreadcrumbEntity,
    standaloneSchema
};
