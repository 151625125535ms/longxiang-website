(function () {
    'use strict';

    var container = document.getElementById('products-container');
    if (!container) return;

    var locale = window.LongxiangI18n && window.LongxiangI18n.currentLocale
        ? window.LongxiangI18n.currentLocale()
        : (/\/ar\//.test(window.location.pathname.replace(/\\/g, '/')) ? 'ar' : 'en');
    var isArabic = locale === 'ar';
    var assetPrefix = window.LongxiangI18n && window.LongxiangI18n.assetBasePrefix
        ? window.LongxiangI18n.assetBasePrefix(locale)
        : (isArabic ? '../' : '');
    var productsCache = [];
    var productContentBlock = null;
    var pageSize = 9;
    var UI_TEXT = {
        en: {
            viewDetails: 'View Details',
            priceInquiry: 'Price Inquiry',
            productsAvailable: 'products available',
            productsUpdatedSoon: 'Products to be updated.',
            pageOf: function (page, total) { return 'Page ' + page + ' of ' + total; },
            keyword: 'Keyword',
            unableToLoad: 'Unable to load products. Please try again later or contact us directly.',
            noResultsPrefix: 'No results for "',
            noResultsMiddle: '" in ',
            noResultsSuffix: '.',
            updatedSoonSuffix: ' products will be updated soon.',
            allCategories: 'All Categories',
            closeCategories: 'Close product categories',
            productCategories: 'Product Categories',
            loading: 'Loading...',
            searchPlaceholder: 'Search products by name or model',
            searchButton: 'Search',
            currentFilter: 'Current filter:',
            clearFilters: 'Clear filters',
            productPagination: 'Product pagination'
        },
        ar: {
            viewDetails: 'عرض التفاصيل',
            priceInquiry: 'استعلام السعر',
            productsAvailable: 'منتج متاح',
            productsUpdatedSoon: 'سيتم تحديث المنتجات قريباً.',
            pageOf: function (page, total) { return 'الصفحة ' + page + ' من ' + total; },
            keyword: 'كلمة البحث',
            unableToLoad: 'تعذر تحميل المنتجات. يرجى المحاولة لاحقاً.',
            noResultsPrefix: 'لا توجد نتائج لـ "',
            noResultsMiddle: '" ضمن ',
            noResultsSuffix: '.',
            updatedSoonSuffix: ' سيتم تحديث المنتجات قريباً.',
            allCategories: 'جميع الفئات',
            closeCategories: 'إغلاق فئات المنتجات',
            productCategories: 'فئات المنتجات',
            loading: 'جارٍ التحميل...',
            searchPlaceholder: 'ابحث باسم المنتج أو الطراز',
            searchButton: 'بحث',
            currentFilter: 'الفلتر الحالي:',
            clearFilters: 'مسح الفلاتر',
            productPagination: 'ترقيم صفحات المنتجات'
        },
        fr: {
            viewDetails: 'Voir les détails',
            priceInquiry: 'Demander un prix',
            productsAvailable: 'produits disponibles',
            productsUpdatedSoon: 'Les produits seront mis à jour prochainement.',
            pageOf: function (page, total) { return 'Page ' + page + ' sur ' + total; },
            keyword: 'Mot-clé',
            unableToLoad: 'Impossible de charger les produits. Veuillez réessayer plus tard ou nous contacter directement.',
            noResultsPrefix: 'Aucun résultat pour "',
            noResultsMiddle: '" dans ',
            noResultsSuffix: '.',
            updatedSoonSuffix: ' seront mis à jour prochainement.',
            allCategories: 'Toutes les catégories',
            closeCategories: 'Fermer les catégories de produits',
            productCategories: 'Catégories de produits',
            loading: 'Chargement...',
            searchPlaceholder: 'Rechercher par nom ou modèle',
            searchButton: 'Rechercher',
            currentFilter: 'Filtre actuel :',
            clearFilters: 'Effacer les filtres',
            productPagination: 'Pagination des produits'
        },
        ru: {
            viewDetails: 'Подробнее',
            priceInquiry: 'Запросить цену',
            productsAvailable: 'товаров доступно',
            productsUpdatedSoon: 'Продукция будет обновлена в ближайшее время.',
            pageOf: function (page, total) { return 'Страница ' + page + ' из ' + total; },
            keyword: 'Ключевое слово',
            unableToLoad: 'Не удалось загрузить продукцию. Повторите попытку позже или свяжитесь с нами напрямую.',
            noResultsPrefix: 'Нет результатов по запросу "',
            noResultsMiddle: '" в ',
            noResultsSuffix: '.',
            updatedSoonSuffix: ' будут обновлены в ближайшее время.',
            allCategories: 'Все категории',
            closeCategories: 'Закрыть категории продукции',
            productCategories: 'Категории продукции',
            loading: 'Загрузка...',
            searchPlaceholder: 'Поиск по названию или модели',
            searchButton: 'Поиск',
            currentFilter: 'Текущий фильтр:',
            clearFilters: 'Сбросить фильтры',
            productPagination: 'Пагинация продукции'
        }
    };
    var INLINE_TEXT_FALLBACKS = {
        fr: {
            'Bo{ic}tier': 'Bo\u00eetier'
        }
    };

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

    function applyInlineTextFallbacks(value) {
        if (typeof value !== 'string' || !value) return value || '';
        var replacements = INLINE_TEXT_FALLBACKS[locale] || {};
        return Object.keys(replacements)
            .sort(function (a, b) { return b.length - a.length; })
            .reduce(function (textValue, key) {
                return textValue.split(key).join(replacements[key]);
            }, value);
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
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(product, field, locale);
            if (value) return applyInlineTextFallbacks(value);
        }
        if (isArabic) {
            var arabicField = field + 'Ar';
            if (product[arabicField]) return product[arabicField];
        }
        return applyInlineTextFallbacks(product[field] || '');
    }

    function t(key) {
        var pack = UI_TEXT[locale] || UI_TEXT.en;
        return pack[key] || UI_TEXT.en[key] || '';
    }

    function setText(selector, value) {
        var el = document.querySelector(selector);
        if (el && value) el.textContent = value;
    }

    function setAttr(selector, name, value) {
        var el = document.querySelector(selector);
        if (el && value) el.setAttribute(name, value);
    }

    function localizeCatalogStaticUi() {
        setText('.product-category-toggle', t('allCategories'));
        setText('.product-category-close', '\u00d7');
        setAttr('.product-category-close', 'aria-label', t('closeCategories'));
        setText('.product-tree-title', t('productCategories'));
        setText('.product-tree-body .loading-placeholder', t('loading'));
        setAttr('.product-tree', 'aria-label', t('productCategories'));
        setAttr('#catalog-search', 'placeholder', t('searchPlaceholder'));
        setAttr('#catalog-search', 'aria-label', t('searchPlaceholder'));
        setText('.catalog-search-submit', t('searchButton'));
        setText('.catalog-filter-label', t('currentFilter'));
        setText('.catalog-clear-filters', t('clearFilters'));
        setAttr('.catalog-pagination', 'aria-label', t('productPagination'));
    }

    function rtlTextAttrs(className) {
        return isArabic ? ' dir="rtl" lang="ar" class="' + (className || 'rtl-product-text') + '"' : '';
    }

    function normalizeImagePath(path) {
        path = String(path || '').trim().replace(/\\/g, '/');
        if (!path) return '';
        if (window.LongxiangI18n && window.LongxiangI18n.localizedAssetPath) {
            return window.LongxiangI18n.localizedAssetPath(path, locale);
        }
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
        var id = product && (product.slug || product.id);
        if (window.LongxiangI18n && window.LongxiangI18n.localizedProductPath) {
            return window.LongxiangI18n.localizedProductPath(id, locale);
        }
        return (isArabic ? '/ar/products/' : '/products/') + encodeURIComponent(id || '');
    }

    function productSearchText(product) {
        var parts = [
            product.id,
            product.name,
            localize(product, 'name'),
            product.shortDesc,
            localize(product, 'shortDesc'),
            product.description,
            localize(product, 'description'),
            product.categoryLabel,
            localize(product, 'categoryLabel'),
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
        var imagePath = normalizeImagePath(product.cardImage || product.image);

        card.innerHTML =
            '<a class="product-card-clickarea" href="' + href + '">' +
                '<div class="product-card-image">' +
                    (imagePath ? '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(name) + '" loading="lazy" decoding="async" width="640" height="420">' : '') +
                '</div>' +
                '<div class="product-card-body">' +
                    '<h4' + rtlTextAttrs('rtl-product-text') + '>' + escapeHtml(name) + '</h4>' +
                    '<p' + rtlTextAttrs('rtl-product-text') + '>' + escapeHtml(desc) + '</p>' +
                '</div>' +
            '</a>' +
            '<div class="product-card-footer">' +
                '<a href="' + href + '" class="product-card-action details">' + escapeHtml(t('viewDetails')) + '</a>' +
                '<button type="button" class="product-card-action inquiry" data-inquiry-product data-product-id="' + escapeHtml(product.id) + '" data-product-name="' + escapeHtml(name) + '">' + escapeHtml(t('priceInquiry')) + '</button>' +
            '</div>';

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
        if (!sub) return localize(parent, 'label') || parent.label;
        var child = parent.children.find(function (item) { return item.sub === sub; });
        return child ? (localize(child, 'label') || child.label) : (localize(parent, 'label') || parent.label);
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
                escapeHtml(t('noResultsPrefix')) + escapeHtml(keyword) + escapeHtml(t('noResultsMiddle')) + escapeHtml(label) + escapeHtml(t('noResultsSuffix')) +
                '</div>';
            return;
        }
        container.innerHTML = '<div class="empty-state">' +
            escapeHtml(label) + escapeHtml(t('updatedSoonSuffix')) +
            '</div>';
    }

    function renderFilterStatus(filter, total) {
        var status = document.querySelector('.catalog-filter-status');
        var current = document.getElementById('catalog-current-filter');
        if (!status || !current) return;
        var parts = [taxonomyLabel(filter.group, filter.sub)];
        if (filter.search) parts.push(t('keyword') + ': "' + filter.search + '"');
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
        var presentation = window.LongxiangProductPagePresentation;
        if (!presentation) {
            showError();
            return;
        }
        var requested = selectedFilter();
        var pageRoot = document.querySelector('[data-product-page-kind="listing"]');
        var contentVersion = productContentBlock && productContentBlock.version != null
            ? productContentBlock.version
            : (pageRoot ? pageRoot.getAttribute('data-product-content-version') || '0' : '0');
        var view = presentation.presentCatalog({
            locale: locale,
            products: products,
            taxonomy: taxonomy,
            query: requested,
            contentBlock: productContentBlock || { body: {} },
            contentVersion: Number(contentVersion) || 0
        });
        var filter = view.state;
        var keywordEl = document.getElementById('catalog-search');
        if (keywordEl && keywordEl.value !== filter.search) keywordEl.value = filter.search;
        var title = document.getElementById('catalog-title');
        var summary = document.getElementById('catalog-summary');
        var current = document.getElementById('catalog-current-filter');
        var status = document.querySelector('.catalog-filter-status');
        var pagination = document.querySelector('.catalog-pagination');

        if (requested.group !== filter.group || requested.sub !== filter.sub || requested.page !== filter.page) {
            setQueryParams({ group: filter.group, sub: filter.sub, page: filter.page > 1 ? filter.page : '' });
        }
        if (title) title.innerHTML = view.fragments.title;
        if (summary) summary.innerHTML = view.fragments.summary;
        if (current) current.innerHTML = view.fragments.filterCurrent;
        if (status) status.hidden = false;

        document.querySelectorAll('[data-product-filter]').forEach(function (button) {
            var active = button.getAttribute('data-group') === filter.group &&
                (button.getAttribute('data-sub') || '') === filter.sub;
            button.classList.toggle('active', active);
        });

        container.innerHTML = view.fragments.cards;
        if (pagination) pagination.innerHTML = view.fragments.pagination;
        bindPagination();

        if (typeof window.initScrollAnimations === 'function') {
            window.initScrollAnimations();
        } else {
            container.querySelectorAll('.fade-in').forEach(function (el) { el.classList.add('visible'); });
        }

        if (pageRoot) {
            pageRoot.setAttribute('data-product-view-key', view.key);
            pageRoot.setAttribute('data-product-content-version', String(Number(contentVersion) || 0));
        }
    }

    function bindPagination() {
        document.querySelectorAll('.catalog-pagination [data-catalog-page]').forEach(function (button) {
            if (button.getAttribute('data-catalog-page-bound') === 'true') return;
            button.setAttribute('data-catalog-page-bound', 'true');
            button.addEventListener('click', function () {
                updatePage(parseInt(button.getAttribute('data-catalog-page'), 10));
            });
        });
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

    function initProductTree(preserveSsrTree) {
        if (!preserveSsrTree) renderProductTree();
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
        var pageRoot = document.querySelector('[data-product-ssr="catalog"]');
        if (pageRoot && container.children.length) {
            pageRoot.setAttribute('data-product-fallback', 'static');
            return;
        }
        container.innerHTML = '<div class="empty-state">' + escapeHtml(t('unableToLoad')) + '</div>';
    }

    function normalizeTaxonomyResponse(payload) {
        var data = payload && payload.ok === true ? payload.data : payload;
        if (!Array.isArray(data) || !data.length) throw new Error('Invalid product categories response');
        return data.map(function (parent) {
            return {
                group: parent.group || '',
                label: parent.label || parent.group || '',
                labelAr: parent.labelAr || parent.label || parent.group || '',
                labelFr: parent.labelFr || '',
                labelRu: parent.labelRu || '',
                children: Array.isArray(parent.children) ? parent.children.map(function (child) {
                    return {
                        sub: child.sub || '',
                        label: child.label || child.sub || '',
                        labelAr: child.labelAr || child.label || child.sub || '',
                        labelFr: child.labelFr || '',
                        labelRu: child.labelRu || ''
                    };
                }).filter(function (child) { return child.sub; }) : []
            };
        }).filter(function (parent) { return parent.group; });
    }

    function loadCategories() {
        return window.LongxiangI18n.fetchLocalizedJson('/api/product-categories', locale)
            .then(normalizeTaxonomyResponse)
            .catch(function (err) {
                if (window.console && console.warn) {
                    console.warn('Product categories API unavailable; deriving categories from product data.', err);
                }
                return null;
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
                    labelFr: product.groupLabelFr || '',
                    labelRu: product.groupLabelRu || '',
                    childrenMap: {}
                };
            }
            var sub = product.subCategory || product.category || '';
            if (sub && !groups[group].childrenMap[sub]) {
                groups[group].childrenMap[sub] = {
                    sub: sub,
                    label: product.subCategoryLabel || product.categoryLabel || sub,
                    labelAr: product.subCategoryLabelAr || product.categoryLabelAr || product.subCategoryLabel || product.categoryLabel || sub,
                    labelFr: product.subCategoryLabelFr || product.categoryLabelFr || '',
                    labelRu: product.subCategoryLabelRu || product.categoryLabelRu || ''
                };
            }
        });
        return Object.keys(groups).map(function (group) {
            var item = groups[group];
            return {
                group: item.group,
                label: item.label,
                labelAr: item.labelAr,
                labelFr: item.labelFr,
                labelRu: item.labelRu,
                children: Object.keys(item.childrenMap).map(function (sub) { return item.childrenMap[sub]; })
            };
        });
    }

    function loadProducts() {
        return window.LongxiangI18n.fetchLocalizedJson('/api/products', locale)
            .then(function (products) {
                if (!Array.isArray(products)) throw new Error('Invalid products response');
                return products;
            });
    }

    function initCatalog() {
        localizeCatalogStaticUi();
        Promise.all([loadCategories(), loadProducts(), window.longxiangContentPagePromise || Promise.resolve(null)])
            .then(function (results) {
                productsCache = results[1].map(normalizeProduct);
                productContentBlock = results[2] && results[2].body ? results[2] : null;
                var categoryFailed = results[0] === null;
                taxonomy = categoryFailed ? deriveTaxonomyFromProducts(productsCache) : results[0];
                var pageRoot = document.querySelector('[data-product-page-kind="listing"]');
                var presentation = window.LongxiangProductPagePresentation;
                var contentVersion = productContentBlock && productContentBlock.version != null
                    ? productContentBlock.version
                    : (pageRoot ? pageRoot.getAttribute('data-product-content-version') || '0' : '0');
                var view = presentation ? presentation.presentCatalog({ locale: locale, products: productsCache, taxonomy: taxonomy, query: selectedFilter(), contentBlock: productContentBlock || { body: {} }, contentVersion: Number(contentVersion) || 0 }) : null;
                var preserveSsr = Boolean(view && pageRoot && pageRoot.getAttribute('data-product-ssr') === 'catalog' && pageRoot.getAttribute('data-product-view-key') === view.key);
                if (!productContentBlock && pageRoot && pageRoot.getAttribute('data-product-ssr') === 'catalog' && container.children.length) {
                    initProductTree(true);
                    bindPagination();
                    pageRoot.setAttribute('data-product-fallback', 'content-block');
                    pageRoot.setAttribute('data-product-hydrated', 'true');
                    return;
                }
                if (categoryFailed && pageRoot && pageRoot.getAttribute('data-product-ssr') === 'catalog' && container.children.length) {
                    initProductTree(true);
                    bindPagination();
                    pageRoot.setAttribute('data-product-fallback', 'taxonomy');
                    pageRoot.setAttribute('data-product-hydrated', 'true');
                    return;
                }
                initProductTree(preserveSsr);
                if (preserveSsr) {
                    bindPagination();
                    pageRoot.setAttribute('data-product-hydrated', 'true');
                    pageRoot.setAttribute('data-product-content-version', String(Number(contentVersion) || 0));
                } else {
                    renderProducts(productsCache);
                }
            })
            .catch(showError);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalog);
    } else {
        initCatalog();
    }
})();
