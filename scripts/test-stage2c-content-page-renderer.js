'use strict';

const assert = require('assert');
const presentation = require('../js/content-page-presentation');
const { renderContentPageHtml } = require('../server/lib/contentPageHtmlRenderer');

const locale = 'fr';
const block = {
    version: 9,
    body: {
        hero: { title: 'About', titleFr: 'À propos' },
        snapshot: {
            kicker: 'Company', kickerFr: 'Entreprise',
            title: 'Company profile', titleFr: 'Profil de l’entreprise',
            body: [{ text: 'Published body', textFr: 'Corps publié' }],
            video: {},
            stats: [{ value: '20+', label: 'Years', labelFr: 'Années' }]
        },
        values: [],
        quality: null,
        milestones: [],
        capability: null,
        factory: null,
        markets: null,
        cta: { title: 'Discuss', titleFr: 'Discutons', text: 'Project', textFr: 'Projet', button: { label: 'Contact', labelFr: 'Contact', href: 'contact.html' } }
    }
};

const expectedBody = presentation.renderPageBody('about-us', block.body, { locale });
assert(expectedBody.includes('Profil de l’entreprise'));
assert(expectedBody.includes('Corps publié'));
assert(expectedBody.includes('href="contact.html"'));
const unsafeBody = presentation.renderPageBody('about-us', {
    snapshot: null,
    values: [],
    cta: { title: 'Unsafe', text: 'Blocked', backgroundImage: 'data:text/html,unsafe', button: { label: 'Open', href: 'javascript:alert(1)' } }
}, { locale: 'en' });
assert(unsafeBody.includes('href="#"'));
assert(!unsafeBody.includes('javascript:'));
assert(!unsafeBody.includes('data:text'));

const shell = '<!doctype html><html><head></head><body><main data-content-page="about-us"><p>loading</p></main><script src="js/content-pages.js?v=1"></script></body></html>';
const rendered = renderContentPageHtml(shell, { slug: 'about-us', locale, block });
assert(rendered.includes('data-ssr-content="about-us"'));
assert(rendered.includes('data-content-version="9"'));
assert(rendered.includes('Profil de l’entreprise'));
assert(rendered.includes('js/content-page-presentation.js'));
assert.strictEqual((rendered.match(/data-content-page="about-us"/g) || []).length, 1);
assert(!rendered.includes('loading'));
assert(!rendered.includes('17513354200'));
assert(!rendered.includes('hnlxdq2003@163.com'));

assert.throws(function () {
    renderContentPageHtml(shell, { slug: 'education', locale, block });
}, /Unsupported/);

console.log('Stage 2C content page renderer tests passed.');
