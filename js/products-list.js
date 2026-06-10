(function () {
    'use strict';

    var container = document.getElementById('products-container');
    if (!container) return;

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';
    var selectedCompare = [];
    var productsCache = [];
    var pageSize = 9;

    var taxonomy = [
        {
            group: 'transformer',
            label: 'Transformer',
            labelAr: 'المحولات',
            children: [
                { sub: 'oil-immersed', label: 'Oil Immersed Transformer', labelAr: 'محول مغمور بالزيت' },
                { sub: 'dry-type', label: 'Dry Type Transformer', labelAr: 'محول جاف' },
                { sub: 'combined', label: 'Combined Transformer', labelAr: 'محول مدمج' },
                { sub: 'special', label: 'Special Transformer', labelAr: 'محول خاص' }
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
        },
        {
            group: 'energy-storage',
            label: 'Energy Storage',
            labelAr: 'أنظمة تخزين الطاقة',
            children: [
                { sub: 'energy-storage', label: 'Energy Storage System', labelAr: 'نظام تخزين الطاقة' }
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

    function setQueryParams(params) {
        var url = new URL(window.location.href);
        Object.keys(params).forEach(function (key) {
            var value = params[key];
            if (value === '' || value == null || value === false) url.searchParams.delete(key);
            else url.searchParams.set(key, value);
        });
        window.history.replaceState(null, '', url.toString());
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

    function productSearchText(product) {
        var parts = [
            product.id,
            product.name,
            product.shortDesc,
            product.description,
            product.categoryLabel,
            product.group,
            product.subCategory
        ];
        if (Array.isArray(product.capacities)) parts = parts.concat(product.capacities);
        if (Array.isArray(product.voltages)) parts = parts.concat(product.voltages);
        if (Array.isArray(product.specs)) {
            product.specs.forEach(function (row) {
                if (Array.isArray(row)) parts = parts.concat(row);
                else parts.push(row);
            });
        }
        return parts.join(' ').toLowerCase();
    }

    function createProductCard(product) {
        var card = document.createElement('article');
        card.className = 'product-card product-card-v2 fade-in visible show';
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
                '<input type="checkbox" data-compare-product="' + escapeHtml(product.id) + '"' + (selectedCompare.indexOf(product.id) !== -1 ? ' checked' : '') + '>' +
                '<span>' + (isArabic ? 'إضافة للمقارنة' : 'Compare') + '</span>' +
            '</label>';

        return card;
    }

    function selectedFilter() {
        var page = parseInt(getQueryParam('page') || '1', 10);
        return {
            group: getQueryParam('group') || 'transformer',
            sub: getQueryParam('sub') || '',
            search: getQueryParam('search') || '',
            page: Number.isFinite(page) && page > 0 ? page : 1
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
            return productSearchText(product).indexOf(keyword) !== -1;
        });
    }

    function renderEmpty(group, sub, search) {
        var label = taxonomyLabel(group, sub);
        var keyword = (search || '').trim();
        if (keyword) {
            container.innerHTML = '<div class="empty-state">' +
                (isArabic
                    ? 'لا توجد نتائج لـ "' + escapeHtml(keyword) + '" ضمن ' + escapeHtml(label) + '.'
                    : 'No results for "' + escapeHtml(keyword) + '" in ' + escapeHtml(label) + '.') +
                '</div>';
            return;
        }
        container.innerHTML = '<div class="empty-state">' +
            escapeHtml(label) + (isArabic ? ' سيتم تحديث المنتجات قريباً.' : ' products will be updated soon.') +
            '</div>';
    }

    function renderFilterStatus(filter, total) {
        var status = document.querySelector('.catalog-filter-status');
        var current = document.getElementById('catalog-current-filter');
        if (!status || !current) return;
        var parts = [taxonomyLabel(filter.group, filter.sub)];
        if (filter.search) parts.push((isArabic ? 'كلمة البحث: "' : 'Keyword: "') + filter.search + '"');
        current.textContent = parts.join(' / ') + ' (' + total + ')';
        status.hidden = false;
    }

    function renderPagination(total, page) {
        var pagination = document.querySelector('.catalog-pagination');
        if (!pagination) return;
        var pageCount = Math.ceil(total / pageSize);
        pagination.innerHTML = '';
        if (pageCount <= 1) return;

        function addButton(label, targetPage, disabled, active) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'catalog-page-button' + (active ? ' active' : '');
            button.textContent = label;
            button.disabled = !!disabled;
            button.setAttribute('data-catalog-page', targetPage);
            pagination.appendChild(button);
        }

        addButton('<', Math.max(1, page - 1), page === 1, false);
        for (var i = 1; i <= pageCount; i += 1) {
            if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) {
                addButton(String(i), i, false, i === page);
            } else if (i === 2 || i === pageCount - 1) {
                var ellipsis = document.createElement('span');
                ellipsis.className = 'catalog-page-ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            }
        }
        addButton('>', Math.min(pageCount, page + 1), page === pageCount, false);

        pagination.querySelectorAll('[data-catalog-page]').forEach(function (button) {
            button.addEventListener('click', function () {
                updatePage(parseInt(button.getAttribute('data-catalog-page'), 10));
            });
        });
    }

    function renderProducts(products) {
        var filter = selectedFilter();
        var keywordEl = document.getElementById('catalog-search');
        if (keywordEl && keywordEl.value !== filter.search) keywordEl.value = filter.search;
        var list = filterProducts(products, filter.group, filter.sub, filter.search);
        var pageCount = Math.max(1, Math.ceil(list.length / pageSize));
        var currentPage = Math.min(filter.page, pageCount);
        var pageItems = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        var title = document.getElementById('catalog-title');
        var summary = document.getElementById('catalog-summary');

        if (filter.page !== currentPage) {
            setQueryParams({ page: currentPage > 1 ? currentPage : '' });
        }

        if (title) title.textContent = taxonomyLabel(filter.group, filter.sub);
        if (summary) {
            summary.textContent = list.length
                ? list.length + (isArabic ? ' منتج متاح' : ' products available')
                : (isArabic ? 'سيتم تحديث المنتجات قريباً.' : 'Products to be updated.');
        }

        renderFilterStatus(filter, list.length);
        if (summary && list.length && pageCount > 1) {
            summary.textContent += isArabic
                ? ' / الصفحة ' + currentPage + ' من ' + pageCount
                : ' / Page ' + currentPage + ' of ' + pageCount;
        }

        document.querySelectorAll('[data-product-filter]').forEach(function (button) {
            var active = button.getAttribute('data-group') === filter.group &&
                (button.getAttribute('data-sub') || '') === filter.sub;
            button.classList.toggle('active', active);
        });

        container.innerHTML = '';
        if (!list.length) {
            renderEmpty(filter.group, filter.sub, filter.search);
            renderPagination(0, 1);
            renderCompareBar();
            return;
        }

        pageItems.forEach(function (product) {
            container.appendChild(createProductCard(product));
        });

        if (typeof window.initScrollAnimations === 'function') {
            window.initScrollAnimations();
        } else {
            container.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('visible'); });
        }

        initProductCompareControls();
        renderPagination(list.length, currentPage);
        renderCompareBar();
    }

    function updateFilter(group, sub) {
        setQueryParams({ group: group, sub: sub || '', page: '' });
        closeCategoryPanel();
        renderProducts(productsCache);
    }

    function updateSearch(keyword) {
        setQueryParams({ search: (keyword || '').trim(), page: '' });
        renderProducts(productsCache);
    }

    function updatePage(page) {
        setQueryParams({ page: page > 1 ? page : '' });
        renderProducts(productsCache);
    }

    function clearFilters() {
        setQueryParams({ group: 'transformer', sub: '', search: '', page: '' });
        renderProducts(productsCache);
    }

    function closeCategoryPanel() {
        var tree = document.getElementById('product-category-tree');
        var toggle = document.querySelector('.product-category-toggle');
        if (tree) tree.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
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
            search.value = selectedFilter().search;
            search.addEventListener('input', function () { updateSearch(search.value); });
        }

        var searchButton = document.querySelector('.catalog-search-submit');
        if (searchButton && search) {
            searchButton.addEventListener('click', function () { updateSearch(search.value); });
        }

        var clearButton = document.querySelector('.catalog-clear-filters');
        if (clearButton) clearButton.addEventListener('click', clearFilters);

        var toggle = document.querySelector('.product-category-toggle');
        var tree = document.getElementById('product-category-tree');
        if (toggle && tree) {
            toggle.addEventListener('click', function () {
                var open = !tree.classList.contains('is-open');
                tree.classList.toggle('is-open', open);
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') closeCategoryPanel();
            });
        }

        window.addEventListener('popstate', function () { renderProducts(productsCache); });
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
            bar.hidden = true;
            bar.style.display = 'none';
            bar.setAttribute('aria-hidden', 'true');
            return;
        }

        bar.hidden = false;
        bar.style.display = '';
        bar.setAttribute('aria-hidden', 'false');
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
