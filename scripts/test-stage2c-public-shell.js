'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { readPublicContentBlock, localizePublicContentBlock } = require('../server/lib/publicContentBlocks');
const { readPublicCompanyView } = require('../server/lib/publicCompanyView');
const { renderGlobalShellHtml } = require('../server/lib/globalShellHtmlRenderer');

const root = path.join(__dirname, '..');
const forbidden = ['17513354200', 'hnlxdq2003@163.com', '100 million RMB', '100 مليون يوان صيني', 'whatsapp'];
const locales = [
    ['en', 'index.html', '/'],
    ['ar', 'ar/index.html', '/ar/index.html'],
    ['fr', 'fr/index.html', '/fr/index.html'],
    ['ru', 'ru/index.html', '/ru/index.html']
];

const company = readPublicCompanyView();
assert.strictEqual(company.email, 'henanlxgj@163.com');
assert.strictEqual(company.address, 'Xinzheng City, Zhengzhou City, Henan Province, P.R. China');
assert.strictEqual(company.phone, undefined);
assert.strictEqual(company.whatsapp, undefined);

const block = readPublicContentBlock('global-shell');
assert(block && block.version > 0);

locales.forEach(function ([locale, file, pathname]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const localized = localizePublicContentBlock(block, locale);
    const rendered = renderGlobalShellHtml(html, {
        locale,
        pathname,
        shell: localized,
        company
    });
    assert(rendered.includes('data-ssr-shell="true"'));
    assert(rendered.includes('data-shell-version="' + block.version + '"'));
    assert((rendered.match(/class="nav-item/g) || []).length >= 6);
    assert(rendered.includes('class="footer-grid"'));
    assert(rendered.includes('henanlxgj@163.com'));
    assert(rendered.includes('https://www.lxelec.cn/'));
    forbidden.forEach(function (value) {
        assert(!rendered.toLowerCase().includes(value.toLowerCase()), locale + ' exposed ' + value);
    });
});

console.log('Stage 2C public shell tests passed.');
