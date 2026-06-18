(function () {
    'use strict';

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';
    var productPageContent = {};

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function localize(product, field) {
        if (isArabic) {
            var arField = field + 'Ar';
            if (product[arField]) return product[arField];
        }
        return product[field] || '';
    }

    function localizedContent(item, field) {
        if (!item) return '';
        if (isArabic && item[field + 'Ar']) return item[field + 'Ar'];
        return item[field] || '';
    }

    function detailLabel(field, fallback) {
        return localizedContent(productPageContent.detailLabels, field) || fallback || '';
    }

    function notFoundLabel(field, fallback) {
        return localizedContent(productPageContent.notFound, field) || fallback || '';
    }

    function normalizeImagePath(path) {
        path = String(path || '').trim().replace(/\\/g, '/');
        if (!path) return '';
        if (/^(https?:)?\/\//i.test(path) || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
        path = path.replace(/^\/+/, '');
        return assetPrefix + path;
    }

    function absoluteImageUrl(path) {
        path = String(path || '').trim().replace(/\\/g, '/');
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (/^\/\//.test(path)) return window.location.protocol + path;
        if (/^data:/i.test(path) || /^blob:/i.test(path)) return path;
        return window.location.origin + '/' + path.replace(/^\/+/, '');
    }

    function productMessage(product, name) {
        var form = productPageContent.inquiryForm || {};
        var template = localizedContent(form, 'productMessageTemplate');
        if (!template) return '';
        return template
            .replace(/\{name\}/g, name || '')
            .replace(/\{id\}/g, product.id || '');
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (!el && id === 'breadcrumb-product') {
            el = document.querySelector('.page-hero .breadcrumb .current');
        }
        if (el) {
            el.textContent = value;
            applyArabicTextDirection(el, 'rtl');
        }
    }

    function applyArabicTextDirection(el, direction) {
        if (!el || !isArabic) return;
        el.setAttribute('dir', direction || 'rtl');
        el.setAttribute('lang', 'ar');
        el.classList.add(direction === 'auto' ? 'bidi-product-text' : 'rtl-product-text');
    }

    function setLoading() {
        setText('product-title', detailLabel('loadingTitle'));
        setText('product-desc', detailLabel('loadingText'));
    }

    function showNotFound() {
        document.title = notFoundLabel('seoTitle') || document.title;
        setText('breadcrumb-product', notFoundLabel('breadcrumbLabel'));
        setText('page-title', notFoundLabel('title'));
        setText('page-subtitle', notFoundLabel('subtitle'));
        setText('product-title', notFoundLabel('heading'));

        var desc = document.getElementById('product-desc');
        if (desc) {
            desc.innerHTML = escapeHtml(notFoundLabel('text')) +
                ' <a href="' + escapeHtml(productPageContent.notFound && productPageContent.notFound.backHref || 'products.html') + '">' +
                escapeHtml(notFoundLabel('backLabel')) + '</a>';
            applyArabicTextDirection(desc, 'rtl');
        }

        var specs = document.querySelector('.product-detail-specs');
        if (specs) specs.style.display = 'none';
        var image = document.getElementById('main-product-image');
        if (image) image.style.display = 'none';
        var sidebar = document.querySelector('.product-detail-sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    function injectProductSchema(product, name, desc) {
        var old = document.querySelector('script[data-schema-auto="product"]');
        if (old) old.remove();

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: name,
            description: desc,
            image: absoluteImageUrl(product.image),
            category: product.categoryLabel || product.category
        };
        var brandName = detailLabel('schemaBrand');
        if (brandName) {
            schema.brand = {
                '@type': 'Brand',
                name: brandName
            };
        }

        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-schema-auto', 'product');
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    function renderProduct(product) {
        if (!product) {
            showNotFound();
            return;
        }

        var name = localize(product, 'name');
        var desc = localize(product, 'description') || localize(product, 'shortDesc');
        var categoryLabel = isArabic ? (product.categoryLabelAr || product.categoryLabel) : product.categoryLabel;

        var titleSuffix = detailLabel('titleSuffix');
        document.title = titleSuffix ? name + ' | ' + titleSuffix : name;
        setText('breadcrumb-product', name);
        setText('page-title', name);
        setText('page-subtitle', categoryLabel || detailLabel('defaultSubtitle'));

        var mainImage = document.getElementById('main-product-image');
        if (mainImage) {
            var imagePath = normalizeImagePath(product.image);
            mainImage.alt = name;
            if (imagePath) {
                mainImage.src = imagePath;
                mainImage.style.display = '';
            } else {
                mainImage.removeAttribute('src');
                mainImage.style.display = 'none';
            }
        }

        setText('product-title', name);
        setText('product-desc', desc);

        var specsBody = document.getElementById('specs-body');
        if (specsBody) {
            specsBody.innerHTML = '';
            (product.specs || []).forEach(function (spec) {
                var row = document.createElement('tr');
                var cellAttrs = isArabic ? ' dir="auto" lang="ar" class="bidi-product-text"' : '';
                row.innerHTML = '<td' + cellAttrs + '>' + escapeHtml(spec[0]) + '</td><td' + cellAttrs + '>' + escapeHtml(spec[1]) + '</td>';
                specsBody.appendChild(row);
            });
        }

        document.querySelectorAll('[data-product-context]').forEach(function (input) {
            input.value = product.id;
        });

        document.querySelectorAll('[data-product-message]').forEach(function (textarea) {
            if (!textarea.value) {
                textarea.value = productMessage(product, name);
            }
        });

        document.querySelectorAll('[data-open-inquiry]').forEach(function (button) {
            button.setAttribute('data-product-id', product.id);
            button.setAttribute('data-product-name', name);
        });

        injectProductSchema(product, name, desc);
    }

    function loadProduct(productId) {
        setLoading();
        fetch('/api/products/' + encodeURIComponent(productId))
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .then(renderProduct)
            .catch(function () {
                renderProduct(null);
            });
    }

    function init() {
        var productId = getQueryParam('id');
        if (!productId) {
            window.location.replace('products.html');
            return;
        }
        (window.longxiangContentPagePromise || Promise.resolve(null)).then(function (block) {
            productPageContent = block && block.body ? block.body : {};
            loadProduct(productId);
        }).catch(function () {
            loadProduct(productId);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
