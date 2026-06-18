(function () {
    'use strict';

    var container = document.getElementById('products-container');
    if (!container) return;

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';
    var selectedCompare = [];
    var productsCache = [];
    var pageSize = 9;

    var taxonomy = [];

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

    function rtlTextAttrs(className) {
        return isArabic ? ' dir="rtl" lang="ar" class="' + (className || 'rtl-product-text') + '"' : '';
    }

    function normalizeImagePath(path) {
        path = String(path || '').trim().replace(/\\/g, '/');
        if (!path) return '';
        if (/^(https?:)?\/\//i.test(path) || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
        path = path.replace(/^\/+/, '');
        return assetPrefix + path;
    }

    function normalizeProduct(product) {
        return Object.assign({}, product, {
            group: product.group || '',
            subCategory: product.subCategory || ''
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
        var imagePath = normalizeImagePath(product.image);

        card.innerHTML =
            '<a class="product-card-clickarea" href="' + href + '">' +
                '<div class="product-card-image">' +
                    (imagePath ? '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(name) + '" loading="lazy">' : '') +
                '</div>' +
                '<div class="product-card-body">' +
                    '<h4' + rtlTextAttrs('rtl-product-text') + '>' + escapeHtml(name) + '</h4>' +
                    '<p' + rtlTextAttrs('rtl-product-text') + '>' + escapeHtml(desc) + '</p>' +
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

    function findTaxonomyGroup(group) {
        return taxonomy.find(function (item) { return item.group === group; }) || null;
    }

    function filterExists(group, sub) {
        var parent = findTaxonomyGroup(group);
        if (!parent) return false;
        if (!sub) return true;
        return parent.children.some(function (child) { return child.sub === sub; });
    }

    function firstGroupWithProducts(products) {
        for (var i = 0; i < taxonomy.length; i += 1) {
            var group = taxonomy[i].group;
            if (products.some(function (product) { return product.group === group; })) return group;
        }
        return '';
    }

    function firstTaxonomyGroup() {
        return taxonomy.length ? taxonomy[0].group : '';
    }

    function resolveFilter(filter, products) {
        if (filterExists(filter.group, filter.sub)) return filter;
        var fallbackGroup = firstGroupWithProducts(products) || firstTaxonomyGroup();
        var next = Object.assign({}, filter, {
            group: fallbackGroup,
            sub: '',
            page: 1
        });
        setQueryParams({ group: next.group, sub: '', page: '' });
        return next;
    }

    function taxonomyLabel(group, sub) {
        var parent = findTaxonomyGroup(group) || taxonomy[0];
        if (!parent) return sub || group || '';
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
        var filter = resolveFilter(selectedFilter(), products);
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
        setQueryParams({ group: firstTaxonomyGroup(), sub: '', search: '', page: '' });
        renderProducts(productsCache);
    }

    function closeCategoryPanel(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        var tree = document.getElementById('product-category-tree');
        var toggle = document.querySelector('.product-category-toggle');
        var backdrop = document.querySelector('.product-category-backdrop');
        if (tree) tree.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        if (backdrop) backdrop.classList.remove('is-open');
        document.body.classList.remove('product-category-panel-open');
    }

    function renderProductTree() {
        var body = document.querySelector('.product-tree-body');
        if (!body) return;
        body.innerHTML = '';
        taxonomy.forEach(function (parent) {
            var groupEl = document.createElement('div');
            groupEl.className = 'product-tree-group';

            var parentButton = document.createElement('button');
            parentButton.type = 'button';
            parentButton.className = 'tree-parent';
            parentButton.setAttribute('data-product-filter', '');
            parentButton.setAttribute('data-group', parent.group);
            parentButton.textContent = taxonomyLabel(parent.group, '');
            groupEl.appendChild(parentButton);

            if (parent.children && parent.children.length) {
                var childrenEl = document.createElement('div');
                childrenEl.className = 'tree-children';
                parent.children.forEach(function (child) {
                    var childButton = document.createElement('button');
                    childButton.type = 'button';
                    childButton.className = 'tree-child';
                    childButton.setAttribute('data-product-filter', '');
                    childButton.setAttribute('data-group', parent.group);
                    childButton.setAttribute('data-sub', child.sub);
                    childButton.textContent = taxonomyLabel(parent.group, child.sub);
                    childrenEl.appendChild(childButton);
                });
                groupEl.appendChild(childrenEl);
            }

            body.appendChild(groupEl);
        });
    }

    function initProductTree() {
        renderProductTree();
        document.querySelectorAll('[data-product-filter]').forEach(function (button) {
            button.addEventListener('click', function () {
                updateFilter(button.getAttribute('data-group') || firstTaxonomyGroup(), button.getAttribute('data-sub') || '');
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
        var closeButton = document.querySelector('.product-category-close');
        if (toggle && tree) {
            tree.classList.remove('fade-in', 'visible');

            var backdrop = document.querySelector('.product-category-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.className = 'product-category-backdrop';
                backdrop.setAttribute('aria-hidden', 'true');
            }
            if (backdrop.parentElement !== document.body) {
                document.body.appendChild(backdrop);
            }

            function setCategoryPanel(open) {
                tree.classList.toggle('is-open', open);
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                backdrop.classList.toggle('is-open', open);
                document.body.classList.toggle('product-category-panel-open', open);
            }

            toggle.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                setCategoryPanel(!tree.classList.contains('is-open'));
            });
            if (closeButton) {
                closeButton.addEventListener('click', closeCategoryPanel);
                closeButton.addEventListener('pointerup', closeCategoryPanel);
                closeButton.addEventListener('touchstart', closeCategoryPanel, { passive: false });
            }
            backdrop.addEventListener('click', closeCategoryPanel);
            backdrop.addEventListener('pointerup', closeCategoryPanel);
            document.addEventListener('click', function (event) {
                if (!tree.classList.contains('is-open')) return;
                if (tree.contains(event.target) || toggle.contains(event.target)) return;
                closeCategoryPanel(event);
            }, true);
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') closeCategoryPanel(event);
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

    function normalizeTaxonomyResponse(payload) {
        var data = payload && payload.ok === true ? payload.data : payload;
        if (!Array.isArray(data) || !data.length) throw new Error('Invalid product categories response');
        return data.map(function (parent) {
            return {
                group: parent.group || '',
                label: parent.label || parent.group || '',
                labelAr: parent.labelAr || parent.label || parent.group || '',
                children: Array.isArray(parent.children) ? parent.children.map(function (child) {
                    return {
                        sub: child.sub || '',
                        label: child.label || child.sub || '',
                        labelAr: child.labelAr || child.label || child.sub || ''
                    };
                }).filter(function (child) { return child.sub; }) : []
            };
        }).filter(function (parent) { return parent.group; });
    }

    function loadCategories() {
        return fetch('/api/product-categories')
            .then(function (res) {
                if (!res.ok) throw new Error('Category API request failed');
                return res.json();
            })
            .then(normalizeTaxonomyResponse)
            .catch(function (err) {
                if (window.console && console.warn) {
                    console.warn('Product categories API unavailable; deriving categories from product data.', err);
                }
                return [];
            });
    }

    function deriveTaxonomyFromProducts(products) {
        var groups = {};
        products.forEach(function (product) {
            var group = product.group || '';
            if (!group) return;
            if (!groups[group]) {
                groups[group] = {
                    group: group,
                    label: product.groupLabel || group,
                    labelAr: product.groupLabelAr || product.groupLabel || group,
                    childrenMap: {}
                };
            }
            var sub = product.subCategory || product.category || '';
            if (sub && !groups[group].childrenMap[sub]) {
                groups[group].childrenMap[sub] = {
                    sub: sub,
                    label: product.subCategoryLabel || product.categoryLabel || sub,
                    labelAr: product.subCategoryLabelAr || product.categoryLabelAr || product.subCategoryLabel || product.categoryLabel || sub
                };
            }
        });
        return Object.keys(groups).map(function (group) {
            var item = groups[group];
            return {
                group: item.group,
                label: item.label,
                labelAr: item.labelAr,
                children: Object.keys(item.childrenMap).map(function (sub) { return item.childrenMap[sub]; })
            };
        });
    }

    function loadProducts() {
        return fetch('/api/products')
            .then(function (res) {
                if (!res.ok) throw new Error('Products API request failed');
                return res.json();
            })
            .then(function (products) {
                if (!Array.isArray(products)) throw new Error('Invalid products response');
                return products;
            });
    }

    function initCatalog() {
        Promise.all([loadCategories(), loadProducts()])
            .then(function (results) {
                productsCache = results[1].map(normalizeProduct);
                taxonomy = results[0].length ? results[0] : deriveTaxonomyFromProducts(productsCache);
                initProductTree();
                renderProducts(productsCache);
            })
            .catch(showError);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalog);
    } else {
        initCatalog();
    }
})();
