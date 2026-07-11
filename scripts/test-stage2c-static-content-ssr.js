'use strict';

const fs = require('fs');
const path = require('path');
const { createSnapshotPublicSiteDataSource } = require('../server/lib/publicSiteDataSource');
const { staticSeoRouteDefinitions } = require('../server/lib/staticPageSeoRenderer');
const { renderContentPageHtml } = require('../server/lib/contentPageHtmlRenderer');
const presentation = require('../js/content-page-presentation');

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
    const main = (output.match(new RegExp('<main\\b[^>]*data-content-page=["\']' + slug + '["\'][^>]*>[\\s\\S]*?<\\/main>', 'i')) || [''])[0];
    if (!/<h[23]\b/i.test(main) || !/<(?:a|button)\b/i.test(main)) throw new Error(route.path + ': SSR main content heading or action missing');
    if (slug === 'solutions') {
        const expectedActions = presentation.renderHeroFragments(slug, dataSource.readContentBlock(slug).body, { locale: route.locale.code }).actionsHtml;
        const actions = (output.match(/<div\b[^>]*class=["'][^"']*\bsolutions-hero-actions\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || '';
        if (!expectedActions || actions !== expectedActions) throw new Error(route.path + ': localized Solutions Hero actions missing or changed');
    }
    const block = dataSource.readContentBlock(slug);
    const backgroundImage = block && block.body && block.body.hero && block.body.hero.backgroundImage;
    const expectedHeroAsset = (route.locale.code === 'en' ? '' : '../') + String(backgroundImage || '').replace(/^\/+|^\.\.\//g, '');
    const heroClass = slug === 'home' ? 'hero-bg' : 'page-hero';
    const heroPattern = new RegExp('<[^>]+class=["\'][^"\']*\\b' + heroClass + '\\b[^"\']*["\'][^>]*>', 'i');
    const heroAfter = (output.match(heroPattern) || [''])[0];
    if (!expectedHeroAsset || !heroAfter.includes("background-image: url('" + expectedHeroAsset + "')")) {
        throw new Error(route.path + ': authoritative Hero background is missing or changed');
    }
    if (/thumbnail|cardImage|[?&](?:w|width|q|quality)=/i.test(heroAfter)) throw new Error(route.path + ': Hero image quality or source changed');
    checked += 1;
});

if (checked !== 16) throw new Error('Expected 16 key content pages, checked ' + checked);
console.log('Stage 2C static content SSR snapshot tests passed: ' + checked + '/16.');
