(function () {
    'use strict';

    var container = document.getElementById('products-container');
    if (!container) return;

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';
    var selectedCompare = [];
    var productsCache = [];

    var taxonomy = [
        {
            group: 'transformer',
            label: 'Transformer',
            labelAr: 'المحولات',
            children: [
                { sub: 'oil-immersed', label: 'Oil Immersed Transformer', labelAr: 'محول مغمور بالزيت' },
                { sub: 'dry-type', label: 'Dry Type Transformer', labelAr: 'محول جاف' }
            ]
        },
        {
            group: 'ev-charger',
            label: 'EV charger',
            labelAr: 'شواحن المركبات الكهربائية',
            children: [
                { sub: 'ac', label: 'AC EV Charging Station', labelAr: 'محطة شحن تيار متردد' },
                { sub: 'dc', label: 'DC EV Charging Station', labelAr: 'محطة شحن تيار مستمر' }
            ]
        },
        {
            group: 'switchgear',
            label: 'Switchgear',
            labelAr: 'معدات المفاتيح',
            children: [
                { sub: 'high-voltage', label: 'High-Voltage Switchgear', labelAr: 'معدات مفاتيح الجهد العالي' },
                { sub: 'medium-low-voltage', label: 'Medium&Low Voltage Switchgear', labelAr: 'معدات مفاتيح الجهد المتوسط والمنخفض' }
            ]
        }
    ];

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function localize(product, field) {
        if (isArabic) {
            var arabicField = field + 'Ar';
            if (product[arabicField]) return product[arabicField];
        }
        return product[field] || '';
    }

    function normalizeProduct(product) {
        var category = product.category || '';
        var group = product.group || (category === 'switchgear' ? 'switchgear' : 'transformer');
        var sub = product.subCategory || category;
        if (group === 'switchgear' && !product.subCategory) sub = 'medium-low-voltage';
        return Object.assign({}, product, {
            group: group,
            subCategory: sub
        });
    }

    function detailHref(product) {
        return 'product-detail.html?id=' + encodeURIComponent(product.id);
    }

    function createProductCard(product) {
        var card = document.createElement('article');
        card.className = 'product-card product-card-v2 fade-in show';
        card.setAttribute('data-group', product.group);
        card.setAttribute('data-sub-category', product.subCategory || '');

        var name = localize(product, 'name');
        var desc = localize(product, 'shortDesc');
        var href = detailHref(product);

        card.innerHTML =
            '<a class="product-card-clickarea" href="' + href + '">' +
                '<div class="product-card-image">' +
                    '<img src="' + assetPrefix + escapeHtml(product.image) + '" alt="' + escapeHtml(name) + '" loading="lazy">' +
                '</div>' +
                '<div class="product-card-body">' +
                    '<h4>' + escapeHtml(name) + '</h4>' +
                    '<p>' + escapeHtml(desc) + '</p>' +
                '</div>' +
            '</a>' +
            '<div class="product-card-footer">' +
                '<a href="' + href + '" class="product-card-action details">' + (isArabic ? 'عرض التفاصيل' : 'View Details') + '</a>' +
                '<button type="button" class="product-card-action inquiry" data-inquiry-product data-product-id="' + escapeHtml(product.id) + '" data-product-name="' + escapeHtml(name) + '">' + (isArabic ? 'استعلام السعر' : 'Price Inquiry') + '</button>' +
            '</div>' +
            '<label class="product-compare-control">' +
                '<input type="checkbox" data-compare-product="' + escapeHtml(product.id) + '">' +
                '<span>' + (isArabic ? 'إضافة للمقارنة' : 'Compare') + '</span>' +
            '</label>';

        return card;
    }

    function selectedFilter() {
        return {
            group: getQueryParam('group') || 'transformer',
            sub: getQueryParam('sub') || ''
        };
    }

    function taxonomyLabel(group, sub) {
        var parent = taxonomy.find(function (item) { return item.group === group; }) || taxonomy[0];
        if (!sub) return isArabic ? (parent.labelAr || parent.label) : parent.label;
        var child = parent.children.find(function (item) { return item.sub === sub; });
        return child ? (isArabic ? (child.labelAr || child.label) : child.label) : (isArabic ? (parent.labelAr || parent.label) : parent.label);
    }

    function filterProducts(products, group, sub, keyword) {
        keyword = (keyword || '').trim().toLowerCase();
        return products.filter(function (product) {
            if (product.group !== group) return false;
            if (sub && product.subCategory !== sub) return false;
            if (!keyword) return true;
            return [product.name, product.shortDesc, product.description, product.categoryLabel].join(' ').toLowerCase().indexOf(keyword) !== -1;
        });
    }

    function renderEmpty(group, sub) {
        var label = taxonomyLabel(group, sub);
        container.innerHTML = '<div class="empty-state">' +
            escapeHtml(label) + (isArabic ? ' سيتم تحديث المنتجات قريباً.' : ' products will be updated soon.') +
            '</div>';
    }

    function renderProducts(products) {
        var filter = selectedFilter();
        var keywordEl = document.getElementById('catalog-search');
        var keyword = keywordEl ? keywordEl.value : '';
        var list = filterProducts(products, filter.group, filter.sub, keyword);
        var title = document.getElementById('catalog-title');
        var summary = document.getElementById('catalog-summary');

        if (title) title.textContent = taxonomyLabel(filter.group, filter.sub);
        if (summary) {
            summary.textContent = list.length
                ? list.length + (isArabic ? ' منتج متاح' : ' products available')
                : (isArabic ? 'سيتم تحديث المنتجات قريباً.' : 'Products to be updated.');
        }

        document.querySelectorAll('[data-product-filter]').forEach(function (button) {
            var active = button.getAttribute('data-group') === filter.group &&
                (button.getAttribute('data-sub') || '') === filter.sub;
            button.classList.toggle('active', active);
        });

        container.innerHTML = '';
        if (!list.length) {
            renderEmpty(filter.group, filter.sub);
            return;
        }

        list.forEach(function (product) {
            container.appendChild(createProductCard(product));
        });

        if (typeof window.initScrollAnimations === 'function') {
            window.initScrollAnimations();
        } else {
            container.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('visible'); });
        }

        initProductCompareControls();
    }

    function updateFilter(group, sub) {
        var url = new URL(window.location.href);
        url.searchParams.set('group', group);
        if (sub) url.searchParams.set('sub', sub);
        else url.searchParams.delete('sub');
        window.history.replaceState(null, '', url.toString());
        renderProducts(productsCache);
    }

    function initProductTree() {
        document.querySelectorAll('[data-product-filter]').forEach(function (button) {
            button.textContent = taxonomyLabel(button.getAttribute('data-group') || 'transformer', button.getAttribute('data-sub') || '');
            button.addEventListener('click', function () {
                updateFilter(button.getAttribute('data-group') || 'transformer', button.getAttribute('data-sub') || '');
            });
        });

        var search = document.getElementById('catalog-search');
        if (search) {
            search.addEventListener('input', function () { renderProducts(productsCache); });
        }
    }

    function showError() {
        container.innerHTML = '<div class="empty-state">' + (isArabic ? 'تعذر تحميل المنتجات. يرجى المحاولة لاحقاً.' : 'Unable to load products. Please try again later or contact us directly.') + '</div>';
    }

    function comparePageHref() {
        return 'compare.html?ids=' + encodeURIComponent(selectedCompare.join(','));
    }

    function renderCompareBar() {
        var bar = document.getElementById('compare-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'compare-bar';
            bar.className = 'compare-bar';
            document.body.appendChild(bar);
        }

        if (!selectedCompare.length) {
            bar.classList.remove('show');
            bar.innerHTML = '';
            return;
        }

        bar.innerHTML =
            '<div><strong>' + selectedCompare.length + '/3</strong> ' + (isArabic ? 'منتجات محددة للمقارنة' : 'products selected for comparison') + '</div>' +
            '<div class="compare-bar-actions">' +
                '<button type="button" class="btn btn-secondary btn-sm" id="compare-clear">' + (isArabic ? 'مسح' : 'Clear') + '</button>' +
                '<a class="btn btn-primary btn-sm" href="' + comparePageHref() + '">' + (isArabic ? 'قارن الآن' : 'Compare Now') + '</a>' +
            '</div>';
        bar.classList.add('show');

        document.getElementById('compare-clear').addEventListener('click', function () {
            selectedCompare = [];
            container.querySelectorAll('[data-compare-product]').forEach(function (input) { input.checked = false; });
            renderCompareBar();
        });
    }

    function initProductCompareControls() {
        container.querySelectorAll('[data-compare-product]').forEach(function (input) {
            input.addEventListener('change', function () {
                var id = input.getAttribute('data-compare-product');
                if (input.checked) {
                    if (selectedCompare.indexOf(id) === -1) selectedCompare.push(id);
                    if (selectedCompare.length > 3) {
                        selectedCompare = selectedCompare.filter(function (item) { return item !== id; });
                        input.checked = false;
                        alert(isArabic ? 'يمكن مقارنة ثلاثة منتجات كحد أقصى.' : 'You can compare up to 3 products.');
                    }
                } else {
                    selectedCompare = selectedCompare.filter(function (item) { return item !== id; });
                }
                renderCompareBar();
            });
        });
    }

    function loadProducts() {
        fetch('/api/products')
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .then(function (products) {
                productsCache = products.map(normalizeProduct);
                initProductTree();
                renderProducts(productsCache);
            })
            .catch(function () {
                fetch(assetPrefix + 'data/products.json')
                    .then(function (res) {
                        if (!res.ok) throw new Error('Fallback request failed');
                        return res.json();
                    })
                    .then(function (products) {
                        productsCache = products.map(normalizeProduct);
                        initProductTree();
                        renderProducts(productsCache);
                    })
                    .catch(showError);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadProducts);
    } else {
        loadProducts();
    }
})();
