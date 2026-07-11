'use strict';

const assert = require('assert');
const presentation = require('../js/product-page-presentation');
const { renderProductListHtml } = require('../server/lib/productListHtmlRenderer');

const products = [
    { id: 't-1', slug: 'transformer-one', group: 'transformer', subCategory: 'oil', name: 'Transformer <One>', nameFr: 'Transformateur Un', shortDesc: 'Primary', shortDescFr: 'Principal', image: 'full.jpg', cardImage: 'card.webp' },
    { id: 't-2', slug: 'transformer-two', group: 'transformer', subCategory: 'dry', name: 'Transformer Two', shortDesc: 'Secondary', image: 'full-2.jpg' },
    { id: 's-1', slug: 'switchgear-one', group: 'switchgear', subCategory: 'mv', name: 'Switchgear', shortDesc: 'MV', image: 'switch.jpg' }
];
const taxonomy = [
    { group: 'transformer', label: 'Transformer', labelFr: 'Transformateurs', children: [{ sub: 'oil', label: 'Oil', labelFr: 'Huile' }, { sub: 'dry', label: 'Dry', labelFr: 'Sec' }] },
    { group: 'switchgear', label: 'Switchgear', labelFr: 'Appareillage', children: [{ sub: 'mv', label: 'MV' }] }
];
const contentBlock = { version: 26, body: { productsHero: { backgroundImage: 'assets/hero/product.webp' }, listingSupport: { title: 'Support', items: [] }, listingCta: { title: 'Contact', text: 'Project', button: { label: 'Send', href: 'contact.html' } } } };
const view = presentation.presentCatalog({ locale: 'fr', products, taxonomy, query: { group: 'transformer', sub: 'oil' }, contentBlock, contentVersion: 26 });
assert.strictEqual(view.kind, 'catalog');
assert.strictEqual(view.state.group, 'transformer');
assert.strictEqual(view.state.sub, 'oil');
assert(view.fragments.cards.includes('card.webp'));
assert(!view.fragments.cards.includes('full.jpg'));
assert(view.fragments.cards.includes('/fr/products/transformer-one'));
assert(!view.fragments.cards.includes('<One>'));

const shell = '<html><head></head><body><section class="page-hero"></section><main data-content-page="product-pages" data-product-page-kind="listing"><div class="product-tree-body"></div><h2 id="catalog-title"></h2><p id="catalog-summary"></p><div class="catalog-filter-status" hidden><span id="catalog-current-filter"></span></div><div id="products-container"></div><nav class="catalog-pagination"></nav><section data-product-listing-support></section><section data-product-listing-cta></section></main><script src="js/products-list.js"></script></body></html>';
const rendered = renderProductListHtml(shell, { locale: 'fr', products, taxonomy, query: { group: 'transformer', sub: 'oil' }, contentBlock });
assert(rendered.includes('data-product-ssr="catalog"'));
assert(rendered.includes('data-product-view-key="' + view.key + '"'));
assert(rendered.includes('Transformateur Un'));
assert(rendered.includes('product-page-presentation.js'));
assert(rendered.includes('product-presentation-i18n.js'));
assert(rendered.includes('content-presentation-i18n.js'));
assert(rendered.includes("background-image: url('../assets/hero/product.webp')"));
assert(!rendered.includes('Product Schema'));
const unsafeCta = presentation.presentCatalog({ locale: 'en', products, taxonomy, query: {}, contentBlock: { body: { listingCta: { title: 'Safe', text: 'Safe', button: { label: 'Open', href: 'javascript:alert(1)' } } } } });
assert(unsafeCta.fragments.cta.includes('href="#"'));
assert(!unsafeCta.fragments.cta.includes('javascript:'));
const changedDescription = JSON.parse(JSON.stringify(products));
changedDescription[0].shortDescFr = 'Description changée';
assert.notStrictEqual(view.key, presentation.presentCatalog({ locale: 'fr', products: changedDescription, taxonomy, query: { group: 'transformer', sub: 'oil' }, contentBlock, contentVersion: 26 }).key);
const changedTaxonomy = JSON.parse(JSON.stringify(taxonomy));
changedTaxonomy[0].labelFr = 'Transformateurs modifiés';
assert.notStrictEqual(view.key, presentation.presentCatalog({ locale: 'fr', products, taxonomy: changedTaxonomy, query: { group: 'transformer', sub: 'oil' }, contentBlock, contentVersion: 26 }).key);
console.log('Stage 2C product catalog renderer tests passed.');
