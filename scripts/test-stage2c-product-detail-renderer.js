'use strict';

const assert = require('assert');
const presentation = require('../js/product-page-presentation');
const { renderProductDetailBodyHtml } = require('../server/lib/productDetailHtmlRenderer');

const product = {
    id: 'p-1', slug: 'main-product', group: 'transformer', category: 'oil',
    name: 'Main <Product>', nameFr: 'Produit principal', description: 'Overview:\nSafe & useful.\n- First item', descriptionFr: 'Vue d’ensemble:\nSûr et utile.',
    image: 'full-quality.jpg', images: [
        { src: 'full-quality.jpg', isCover: true },
        { src: 'detail-view.jpg', isCover: false },
        { src: 'side-view.jpg', isCover: false }
    ], cardImage: 'thumbnail.webp', categoryLabel: 'Oil', categoryLabelFr: 'Huile', capacities: ['100 kVA'], voltages: ['10 kV'], specs: [['Capacity', '100 kVA'], ['Standard', 'IEC 60076']]
};
const related = { id: 'p-2', slug: 'related-product', group: 'transformer', category: 'oil', name: 'Related', nameFr: 'Associé', shortDesc: 'Other', shortDescFr: 'Autre', image: 'related-full.jpg' };
const block = { version: 26, body: {
    detailHero: { backgroundImage: 'assets/hero/product.webp' },
    detailLabels: { specsTitle: 'Product Parameter', specsTitleFr: 'Paramètres du produit', faqTitle: 'Product FAQ', faqTitleFr: 'FAQ produit', relatedTitleFr: 'Produits associés' },
    detailSupport: { title: 'Support', titleFr: 'Support', items: [{ title: 'Review', titleFr: 'Revue', text: 'Parameters', textFr: 'Paramètres' }] },
    detailFaq: [{ question: 'Question?', questionFr: 'Question ?', answer: 'Answer.', answerFr: 'Réponse.' }],
    inquiryForm: { title: 'Product Inquiry', titleFr: 'Demande produit', submitLabel: 'Submit', submitLabelFr: 'Envoyer', productMessageTemplate: 'I need {name} ({id})', productMessageTemplateFr: 'Je demande {name} ({id})', fields: [{ name: 'name', label: 'Name', labelFr: 'Nom', type: 'text', required: true }, { name: 'message', label: 'Message', labelFr: 'Message', type: 'textarea', productMessage: true }] }
} };
const view = presentation.presentDetail({ locale: 'fr', product, products: [product, related], contentBlock: block, contentVersion: 26 });
assert.strictEqual(view.kind, 'detail');
assert.strictEqual(view.image.src, '../full-quality.jpg');
assert.strictEqual(view.images.length, 3);
assert(view.fragments.gallery.includes('data-product-gallery-thumbnail'));
assert(view.fragments.gallery.indexOf('../detail-view.jpg') < view.fragments.gallery.indexOf('../side-view.jpg'));
assert(!view.image.src.includes('thumbnail'));
assert(view.fragments.title.includes('Produit principal'));
assert(view.fragments.specs.includes('Capacité'));
assert(view.fragments.related.includes('/fr/products/related-product'));
assert(view.fragments.inquiry.includes('Je demande Produit principal (p-1)'));
assert(!view.fragments.description.includes('<Product>'));
const changedProduct = Object.assign({}, product, { categoryLabelFr: 'Catégorie modifiée', voltages: ['35 kV'] });
assert.notStrictEqual(view.key, presentation.presentDetail({ locale: 'fr', product: changedProduct, products: [changedProduct, related], contentBlock: block, contentVersion: 26 }).key);
const changedRelated = Object.assign({}, related, { nameFr: 'Associé modifié', image: 'related-new.jpg' });
assert.notStrictEqual(view.key, presentation.presentDetail({ locale: 'fr', product, products: [product, changedRelated], contentBlock: block, contentVersion: 26 }).key);
assert.notStrictEqual(view.key, presentation.presentDetail({ locale: 'fr', product, products: [product, related], contentBlock: block, contentVersion: 27 }).key);
const changedMedia = Object.assign({}, product, { images: [product.images[0], product.images[2], product.images[1]] });
assert.notStrictEqual(view.key, presentation.presentDetail({ locale: 'fr', product: changedMedia, products: [changedMedia, related], contentBlock: block, contentVersion: 26 }).key);
const singleView = presentation.presentDetail({ locale: 'fr', product: Object.assign({}, product, { images: [product.images[0]] }), products: [product, related], contentBlock: block, contentVersion: 26 });
assert(!singleView.fragments.gallery.includes('data-product-gallery-thumbnail'));
assert(singleView.fragments.gallery.includes('data-gallery-state="single"'));

const shell = '<html><head></head><body><section class="page-hero"><div class="breadcrumb"><span class="current" id="breadcrumb-product">Product</span></div><p id="page-title">Product</p><p id="page-subtitle">Details</p></section><main data-content-page="product-pages" data-product-page-kind="detail"><div class="product-media-gallery" data-product-gallery><div class="product-detail-main-image"><img id="main-product-image" src="" alt="" width="960" height="720" decoding="async" fetchpriority="high"></div></div><h1 id="product-title">Product</h1><div id="product-desc"></div><div data-product-decision-summary></div><div data-product-applications></div><div data-product-selection></div><h2 data-product-specs-title></h2><tbody id="specs-body"></tbody><div data-product-detail-support></div><div data-product-detail-faq></div><div data-product-related></div><aside data-product-detail-inquiry></aside></main><script src="js/product-detail.js"></script></body></html>';
const rendered = renderProductDetailBodyHtml(shell, { locale: 'fr', product, products: [product, related], contentBlock: block });
assert(rendered.includes('data-product-ssr="detail"'));
assert(rendered.includes('data-product-view-key="' + view.key + '"'));
assert(rendered.includes('src="../full-quality.jpg"'));
assert(rendered.includes('loading="eager"'));
assert(rendered.includes('fetchpriority="high"'));
assert(rendered.includes('data-gallery-state="multiple"'));
assert(rendered.includes('data-product-gallery-thumbnail'));
assert(rendered.indexOf('../detail-view.jpg') < rendered.indexOf('../side-view.jpg'));
assert(rendered.includes('<h1 id="product-title">Produit principal</h1>'));
assert(!rendered.includes('Main <Product>'));
assert(!rendered.includes('<Product>'));
assert(rendered.includes('product-detail-bootstrap'));
assert(rendered.includes('content-presentation-i18n.js'));
assert(rendered.includes("background-image: url('../assets/hero/product.webp')"));
assert(!rendered.includes('thumbnail.webp'));
assert(!/price|availability|aggregateRating|offers/i.test(rendered));
console.log('Stage 2C product detail renderer tests passed.');
