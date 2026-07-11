'use strict';

const fs = require('fs');
const path = require('path');
const { createSnapshotPublicSiteDataSource } = require('../server/lib/publicSiteDataSource');
const { staticSeoRouteDefinitions } = require('../server/lib/staticPageSeoRenderer');
const { renderContentPageHtml } = require('../server/lib/contentPageHtmlRenderer');

function option(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
}

const snapshotDirectory = option('--snapshot');
if (!snapshotDirectory) throw new Error('Usage: node scripts/test-stage2c-static-content-ssr.js --snapshot <directory>');
const dataSource = createSnapshotPublicSiteDataSource(snapshotDirectory);
const slugs = Object.freeze({ '/': 'home', '/about.html': 'about-us', '/solutions.html': 'solutions', '/contact.html': 'contact' });
const forbidden = ['17513354200', 'hnlxdq2003@163.com', '100 million RMB', '100 مليون يوان', 'WhatsApp'];
let checked = 0;

staticSeoRouteDefinitions().forEach(function (route) {
    const slug = slugs[route.basePath];
    if (!slug) return;
    const input = fs.readFileSync(path.resolve(route.filePath), 'utf8');
    const output = renderContentPageHtml(input, {
        slug,
        locale: route.locale,
        block: dataSource.readContentBlock(slug)
    });
    const headings = Array.from(output.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi));
    if (headings.length !== 1) throw new Error(route.path + ': expected one H1, found ' + headings.length);
    if (!output.includes('data-ssr-content="' + slug + '"')) throw new Error(route.path + ': missing SSR marker');
    if (!output.includes('data-content-locale="' + route.locale.code + '"')) throw new Error(route.path + ': wrong locale marker');
    if (/Loading (?:home content|company profile|solutions|contact information)/i.test(output)) throw new Error(route.path + ': loading copy remains');
    forbidden.forEach(function (value) {
        if (output.includes(value)) throw new Error(route.path + ': forbidden public value: ' + value);
    });
    if (slug === 'contact') {
        if ((output.match(/contact-address-row/g) || []).length !== 2) throw new Error(route.path + ': contact address rows changed');
        if (!output.includes('henanlxgj@163.com')) throw new Error(route.path + ': international email missing');
    }
    if (slug === 'home' && route.locale.code === 'ar') {
        if (output.includes('data-home-applications') || output.includes('data-home-news')) throw new Error(route.path + ': missing Arabic home slots were added');
    }
    const heroBefore = (input.match(/<div class="hero-bg"[^>]*>/i) || [''])[0];
    const heroAfter = (output.match(/<div class="hero-bg"[^>]*>/i) || [''])[0];
    if (heroBefore !== heroAfter) throw new Error(route.path + ': Hero background node changed');
    checked += 1;
});

if (checked !== 16) throw new Error('Expected 16 key content pages, checked ' + checked);
console.log('Stage 2C static content SSR snapshot tests passed: ' + checked + '/16.');
