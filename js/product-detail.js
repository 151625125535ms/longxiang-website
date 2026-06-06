(function () {
    'use strict';

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';

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

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function setLoading() {
        setText('product-title', isArabic ? 'جار تحميل المنتج...' : 'Loading product...');
        setText('product-desc', isArabic ? 'يرجى الانتظار قليلاً.' : 'Please wait while we load the product details.');
    }

    function showNotFound() {
        document.title = isArabic ? 'المنتج غير موجود | Longxiang' : 'Product Not Found | Henan Longxiang Electrical Co., Ltd.';
        setText('breadcrumb-product', isArabic ? 'غير موجود' : 'Not Found');
        setText('page-title', isArabic ? 'المنتج غير موجود' : 'Product Not Found');
        setText('page-subtitle', isArabic ? 'يرجى العودة إلى قائمة المنتجات' : 'Please return to the product catalog');
        setText('product-title', isArabic ? 'لم يتم العثور على المنتج' : 'Product Not Found');

        var desc = document.getElementById('product-desc');
        if (desc) {
            desc.innerHTML = (isArabic ? 'تعذر العثور على المنتج المطلوب.' : 'The requested product could not be found.') +
                ' <a href="products.html">' + (isArabic ? 'العودة إلى قائمة المنتجات' : 'Back to product catalog') + '</a>';
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
            image: window.location.origin + '/' + product.image,
            brand: {
                '@type': 'Brand',
                name: 'Henan Longxiang Electrical Co., Ltd.'
            },
            category: product.categoryLabel || product.category
        };

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

        document.title = name + ' | Henan Longxiang Electrical Co., Ltd.';
        setText('breadcrumb-product', name);
        setText('page-title', name);
        setText('page-subtitle', categoryLabel || (isArabic ? 'تفاصيل المنتج' : 'Product Details'));

        var mainImage = document.getElementById('main-product-image');
        if (mainImage) {
            mainImage.src = assetPrefix + product.image;
            mainImage.alt = name;
            mainImage.style.display = '';
        }

        setText('product-title', name);
        setText('product-desc', desc);

        var specsBody = document.getElementById('specs-body');
        if (specsBody) {
            specsBody.innerHTML = '';
            (product.specs || []).forEach(function (spec) {
                var row = document.createElement('tr');
                row.innerHTML = '<td>' + escapeHtml(spec[0]) + '</td><td>' + escapeHtml(spec[1]) + '</td>';
                specsBody.appendChild(row);
            });
        }

        document.querySelectorAll('[data-product-context]').forEach(function (input) {
            input.value = product.id;
        });

        document.querySelectorAll('[data-product-message]').forEach(function (textarea) {
            if (!textarea.value) {
                textarea.value = isArabic
                    ? 'أرغب في طلب السعر والتفاصيل الفنية لهذا المنتج: ' + name + ' (' + product.id + ').'
                    : 'I would like to request pricing and technical details for: ' + name + ' (' + product.id + ').';
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
                fetch(assetPrefix + 'data/products.json')
                    .then(function (res) {
                        if (!res.ok) throw new Error('Fallback request failed');
                        return res.json();
                    })
                    .then(function (products) {
                        var product = products.find(function (item) { return item.id === productId; });
                        renderProduct(product);
                    })
                    .catch(function () { renderProduct(null); });
            });
    }

    function init() {
        var productId = getQueryParam('id');
        if (!productId) {
            window.location.replace('products.html');
            return;
        }
        loadProduct(productId);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
