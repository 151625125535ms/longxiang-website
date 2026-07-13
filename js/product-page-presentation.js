(function (root, factory) {
    'use strict';
    var content = root && root.LongxiangContentPagePresentation;
    var i18n = root && root.LongxiangProductPresentationI18n;
    if (typeof module === 'object' && module.exports) {
        content = require('./content-page-presentation');
        i18n = require('./product-presentation-i18n');
        module.exports = factory(content, i18n);
    } else if (root) {
        root.LongxiangProductPagePresentation = factory(content, i18n);
    }
}(typeof window !== 'undefined' ? window : null, function (content, i18n) {
    'use strict';

    if (!content || !i18n) throw new Error('Product presentation dependencies are missing');
    var PAGE_SIZE = 9;
    var UI = {
        en: { viewDetails: 'View Details', priceInquiry: 'Price Inquiry', productsAvailable: 'products available', productsUpdatedSoon: 'Products to be updated.', pageOf: function (p, n) { return 'Page ' + p + ' of ' + n; }, keyword: 'Keyword', noResultsPrefix: 'No results for "', noResultsMiddle: '" in ', noResultsSuffix: '.', updatedSoonSuffix: ' products will be updated soon.', allCategories: 'All Categories', closeCategories: 'Close product categories', productCategories: 'Product Categories', searchPlaceholder: 'Search products by name or model', searchButton: 'Search', currentFilter: 'Current filter:', clearFilters: 'Clear filters', productPagination: 'Product pagination' },
        ar: { viewDetails: 'عرض التفاصيل', priceInquiry: 'استعلام السعر', productsAvailable: 'منتج متاح', productsUpdatedSoon: 'سيتم تحديث المنتجات قريباً.', pageOf: function (p, n) { return 'الصفحة ' + p + ' من ' + n; }, keyword: 'كلمة البحث', noResultsPrefix: 'لا توجد نتائج لـ "', noResultsMiddle: '" ضمن ', noResultsSuffix: '.', updatedSoonSuffix: ' سيتم تحديث المنتجات قريباً.', allCategories: 'جميع الفئات', closeCategories: 'إغلاق فئات المنتجات', productCategories: 'فئات المنتجات', searchPlaceholder: 'ابحث باسم المنتج أو الطراز', searchButton: 'بحث', currentFilter: 'الفلتر الحالي:', clearFilters: 'مسح الفلاتر', productPagination: 'ترقيم صفحات المنتجات' },
        fr: { viewDetails: 'Voir les détails', priceInquiry: 'Demander un prix', productsAvailable: 'produits disponibles', productsUpdatedSoon: 'Les produits seront mis à jour prochainement.', pageOf: function (p, n) { return 'Page ' + p + ' sur ' + n; }, keyword: 'Mot-clé', noResultsPrefix: 'Aucun résultat pour "', noResultsMiddle: '" dans ', noResultsSuffix: '.', updatedSoonSuffix: ' seront mis à jour prochainement.', allCategories: 'Toutes les catégories', closeCategories: 'Fermer les catégories de produits', productCategories: 'Catégories de produits', searchPlaceholder: 'Rechercher par nom ou modèle', searchButton: 'Rechercher', currentFilter: 'Filtre actuel :', clearFilters: 'Effacer les filtres', productPagination: 'Pagination des produits' },
        ru: { viewDetails: 'Подробнее', priceInquiry: 'Запросить цену', productsAvailable: 'товаров доступно', productsUpdatedSoon: 'Продукция будет обновлена в ближайшее время.', pageOf: function (p, n) { return 'Страница ' + p + ' из ' + n; }, keyword: 'Ключевое слово', noResultsPrefix: 'Нет результатов по запросу "', noResultsMiddle: '" в ', noResultsSuffix: '.', updatedSoonSuffix: ' будут обновлены в ближайшее время.', allCategories: 'Все категории', closeCategories: 'Закрыть категории продукции', productCategories: 'Категории продукции', searchPlaceholder: 'Поиск по названию или модели', searchButton: 'Поиск', currentFilter: 'Текущий фильтр:', clearFilters: 'Сбросить фильтры', productPagination: 'Пагинация продукции' }
    };
    var GALLERY_UI = {
        en: { images: 'Product images', image: 'Image', view: 'View product image', previous: 'Previous image', next: 'Next image' },
        ar: { images: 'صور المنتج', image: 'الصورة', view: 'عرض صورة المنتج', previous: 'الصورة السابقة', next: 'الصورة التالية' },
        fr: { images: 'Images du produit', image: 'Image', view: 'Voir l’image du produit', previous: 'Image précédente', next: 'Image suivante' },
        ru: { images: 'Изображения продукта', image: 'Изображение', view: 'Показать изображение продукта', previous: 'Предыдущее изображение', next: 'Следующее изображение' }
    };

    function esc(value) { return content.escapeHtml(value); }
    function localizeTree(value, locale) { return content.localizeTree(value || {}, locale); }
    function localized(item, field, locale) {
        var value = content.localized(item, field, locale);
        var replacements = i18n.INLINE_TEXT_FALLBACKS[locale] || {};
        return Object.keys(replacements).sort(function (a, b) { return b.length - a.length; }).reduce(function (out, key) { return String(out || '').split(key).join(replacements[key]); }, value || '');
    }
    function text(value, locale, arabic) {
        if (locale === 'ar') return arabic || i18n.ARABIC_TEXT_FALLBACKS[value] || value;
        return (i18n.TEXT_FALLBACKS[locale] || {})[value] || value;
    }
    function safeAsset(value, locale) {
        value = String(value || '').trim().replace(/\\/g, '/');
        if (!value || /[\u0000-\u001f\u007f]/.test(value) || /^\/\//.test(value)) return '';
        if (/^https:\/\//i.test(value) || (value.charAt(0) === '/' && value.charAt(1) !== '/')) return value;
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
        return (locale === 'en' ? '' : '../') + value.replace(/^\/+|^\.\.\//g, '');
    }
    function safeHref(value) {
        value = String(value || '#').trim();
        if (/[\u0000-\u001f\u007f]/.test(value) || /^\/\//.test(value)) return '#';
        if (/^https:\/\//i.test(value) || value.charAt(0) === '#') return value;
        if (value.charAt(0) === '/' && value.charAt(1) !== '/') return value;
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '#';
        return value.replace(/^\/+/, '') || '#';
    }
    function productPath(product, locale) {
        var slug = String(product && (product.slug || product.id) || '');
        return '/' + (locale === 'en' ? '' : locale + '/') + 'products/' + encodeURIComponent(slug);
    }
    function rtl(locale, kind) {
        if (locale !== 'ar') return '';
        return kind === 'value' ? ' dir="auto" lang="ar" class="bidi-product-text"' : ' dir="rtl" lang="ar" class="rtl-product-text"';
    }
    function hash(value) {
        var source = JSON.stringify(value);
        var result = 2166136261;
        for (var i = 0; i < source.length; i += 1) { result ^= source.charCodeAt(i); result = Math.imul(result, 16777619); }
        return (result >>> 0).toString(36);
    }

    function normalizeTaxonomy(payload) {
        var data = payload && payload.ok === true ? payload.data : payload;
        if (!Array.isArray(data)) return [];
        return data.map(function (parent) {
            return {
                group: String(parent.group || ''), label: parent.label || parent.group || '', labelAr: parent.labelAr || parent.label || '', labelFr: parent.labelFr || '', labelRu: parent.labelRu || '',
                children: (Array.isArray(parent.children) ? parent.children : []).map(function (child) { return { sub: String(child.sub || ''), label: child.label || child.sub || '', labelAr: child.labelAr || child.label || '', labelFr: child.labelFr || '', labelRu: child.labelRu || '' }; }).filter(function (child) { return child.sub; })
            };
        }).filter(function (parent) { return parent.group; });
    }
    function deriveTaxonomy(products) {
        var groups = {};
        (products || []).forEach(function (product) {
            var group = product.group || '';
            if (!group) return;
            if (!groups[group]) groups[group] = { group: group, label: product.groupLabel || group, labelAr: product.groupLabelAr || product.groupLabel || group, labelFr: product.groupLabelFr || '', labelRu: product.groupLabelRu || '', children: {} };
            var sub = product.subCategory || product.category || '';
            if (sub && !groups[group].children[sub]) groups[group].children[sub] = { sub: sub, label: product.subCategoryLabel || product.categoryLabel || sub, labelAr: product.subCategoryLabelAr || product.categoryLabelAr || sub, labelFr: product.subCategoryLabelFr || product.categoryLabelFr || '', labelRu: product.subCategoryLabelRu || product.categoryLabelRu || '' };
        });
        return Object.keys(groups).map(function (key) { var group = groups[key]; group.children = Object.keys(group.children).map(function (sub) { return group.children[sub]; }); return group; });
    }
    function queryState(query) {
        query = query || {};
        var page = parseInt(query.page || '1', 10);
        return { group: String(query.group || 'transformer'), sub: String(query.sub || ''), search: String(query.search || ''), page: Number.isFinite(page) && page > 0 ? page : 1 };
    }
    function taxonomyGroup(taxonomy, group) { return taxonomy.find(function (item) { return item.group === group; }) || null; }
    function resolveFilter(filter, products, taxonomy) {
        var parent = taxonomyGroup(taxonomy, filter.group);
        var valid = parent && (!filter.sub || parent.children.some(function (child) { return child.sub === filter.sub; }));
        if (valid) return filter;
        var fallback = taxonomy.find(function (item) { return products.some(function (product) { return product.group === item.group; }); }) || taxonomy[0];
        return { group: fallback ? fallback.group : '', sub: '', search: filter.search, page: 1 };
    }
    function taxonomyLabel(taxonomy, group, sub, locale) {
        var parent = taxonomyGroup(taxonomy, group) || taxonomy[0];
        if (!parent) return sub || group || '';
        if (!sub) return localized(parent, 'label', locale) || parent.label;
        var child = parent.children.find(function (item) { return item.sub === sub; });
        return child ? localized(child, 'label', locale) : localized(parent, 'label', locale);
    }
    function searchText(product, locale) {
        var parts = [product.id, product.name, localized(product, 'name', locale), product.shortDesc, localized(product, 'shortDesc', locale), product.description, localized(product, 'description', locale), product.categoryLabel, localized(product, 'categoryLabel', locale), product.group, product.subCategory];
        if (Array.isArray(product.capacities)) parts = parts.concat(product.capacities);
        if (Array.isArray(product.voltages)) parts = parts.concat(product.voltages);
        (product.specs || []).forEach(function (row) { parts = parts.concat(Array.isArray(row) ? row : [row]); });
        return parts.join(' ').toLowerCase();
    }
    function catalogCard(product, locale) {
        var ui = UI[locale] || UI.en;
        var name = localized(product, 'name', locale);
        var desc = localized(product, 'shortDesc', locale);
        var href = productPath(product, locale);
        var image = safeAsset(product.cardImage || product.image, locale);
        return '<article class="product-card product-card-v2 fade-in visible show" data-group="' + esc(product.group || '') + '" data-sub-category="' + esc(product.subCategory || '') + '"><a class="product-card-clickarea" href="' + esc(href) + '"><div class="product-card-image">' + (image ? '<img src="' + esc(image) + '" alt="' + esc(name) + '" loading="lazy" decoding="async" width="640" height="420">' : '') + '</div><div class="product-card-body"><h4' + rtl(locale) + '>' + esc(name) + '</h4><p' + rtl(locale) + '>' + esc(desc) + '</p></div></a><div class="product-card-footer"><a href="' + esc(href) + '" class="product-card-action details">' + esc(ui.viewDetails) + '</a><button type="button" class="product-card-action inquiry" data-inquiry-product data-product-id="' + esc(product.id || '') + '" data-product-name="' + esc(name) + '">' + esc(ui.priceInquiry) + '</button></div></article>';
    }
    function catalogTree(taxonomy, filter, locale) {
        return taxonomy.map(function (parent) {
            return '<div class="product-tree-group"><button type="button" class="tree-parent' + (parent.group === filter.group && !filter.sub ? ' active' : '') + '" data-product-filter data-group="' + esc(parent.group) + '">' + esc(localized(parent, 'label', locale)) + '</button>' + (parent.children.length ? '<div class="tree-children">' + parent.children.map(function (child) { return '<button type="button" class="tree-child' + (parent.group === filter.group && child.sub === filter.sub ? ' active' : '') + '" data-product-filter data-group="' + esc(parent.group) + '" data-sub="' + esc(child.sub) + '">' + esc(localized(child, 'label', locale)) + '</button>'; }).join('') + '</div>' : '') + '</div>';
        }).join('');
    }
    function pagination(total, page) {
        var count = Math.ceil(total / PAGE_SIZE);
        if (count <= 1) return '';
        var output = [];
        function button(label, target, disabled, active) { output.push('<button type="button" class="catalog-page-button' + (active ? ' active' : '') + '"' + (disabled ? ' disabled' : '') + ' data-catalog-page="' + target + '">' + esc(label) + '</button>'); }
        button('<', Math.max(1, page - 1), page === 1, false);
        for (var i = 1; i <= count; i += 1) {
            if (i === 1 || i === count || Math.abs(i - page) <= 1) button(String(i), i, false, i === page);
            else if (i === 2 || i === count - 1) output.push('<span class="catalog-page-ellipsis">...</span>');
        }
        button('>', Math.min(count, page + 1), page === count, false);
        return output.join('');
    }
    function supportHtml(section, locale) {
        if (!section) return '';
        return '<div class="container"><div class="section-header"><h2>' + esc(localized(section, 'title', locale)) + '</h2><p>' + esc(localized(section, 'text', locale)) + '</p></div><div class="export-support-grid">' + (section.items || []).map(function (item) { return '<div><strong>' + esc(localized(item, 'title', locale)) + '</strong><span>' + esc(localized(item, 'text', locale)) + '</span></div>'; }).join('') + '</div></div>';
    }
    function ctaHtml(section, locale) {
        if (!section) return '';
        var button = section.button || {};
        return '<div class="container"><h2 class="fade-in">' + esc(localized(section, 'title', locale)) + '</h2><p class="fade-in">' + esc(localized(section, 'text', locale)) + '</p><div class="cta-buttons fade-in"><a href="' + esc(safeHref(button.href || 'contact.html')) + '" class="' + esc(button.className || 'btn btn-gold btn-lg') + '">' + esc(localized(button, 'label', locale)) + '</a></div></div>';
    }

    function presentCatalog(options) {
        options = options || {};
        var locale = options.locale || 'en';
        var products = Array.isArray(options.products) ? options.products : [];
        var taxonomy = normalizeTaxonomy(options.taxonomy);
        if (!taxonomy.length) taxonomy = deriveTaxonomy(products);
        var filter = resolveFilter(queryState(options.query), products, taxonomy);
        var keyword = filter.search.trim().toLowerCase();
        var list = products.filter(function (product) { return product.group === filter.group && (!filter.sub || product.subCategory === filter.sub) && (!keyword || searchText(product, locale).indexOf(keyword) !== -1); });
        var pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        filter.page = Math.min(filter.page, pageCount);
        var items = list.slice((filter.page - 1) * PAGE_SIZE, filter.page * PAGE_SIZE);
        var label = taxonomyLabel(taxonomy, filter.group, filter.sub, locale);
        var ui = UI[locale] || UI.en;
        var block = localizeTree(options.contentBlock && options.contentBlock.body || options.contentBlock || {}, locale);
        var empty = keyword ? ui.noResultsPrefix + filter.search.trim() + ui.noResultsMiddle + label + ui.noResultsSuffix : label + ui.updatedSoonSuffix;
        var summary = list.length ? list.length + ' ' + ui.productsAvailable + (pageCount > 1 ? ' / ' + ui.pageOf(filter.page, pageCount) : '') : ui.productsUpdatedSoon;
        var current = label + (filter.search ? ' / ' + ui.keyword + ': "' + filter.search + '"' : '') + ' (' + list.length + ')';
        var result = {
            contractVersion: 1, kind: 'catalog', key: '', state: filter,
            ui: ui,
            fragments: { tree: catalogTree(taxonomy, filter, locale), title: esc(label), summary: esc(summary), filterCurrent: esc(current), cards: list.length ? items.map(function (product) { return catalogCard(product, locale); }).join('') : '<div class="empty-state">' + esc(empty) + '</div>', pagination: pagination(list.length, filter.page), support: supportHtml(block.listingSupport, locale), cta: ctaHtml(block.listingCta, locale) },
            bootstrap: { v: 1, kind: 'catalog', locale: locale, key: '', state: filter, contentVersion: options.contentVersion || 0 }
        };
        result.key = 'catalog-' + hash({ v: 1, locale: locale, state: result.state, fragments: result.fragments, contentVersion: options.contentVersion || 0 });
        result.bootstrap.key = result.key;
        return result;
    }

    function displaySpecRows(product) {
        var capacities = Array.isArray(product.capacities) ? product.capacities.slice() : [];
        var rows = [];
        (product.specs || []).forEach(function (row) {
            if (!Array.isArray(row)) return;
            if (/^capacity$/i.test(String(row[0] || '').trim())) capacities.push(row[1]);
            else rows.push([row[0], row[1]]);
        });
        var seen = {};
        capacities = capacities.filter(function (value) { var key = String(value || '').trim().toLowerCase(); if (!key || seen[key]) return false; seen[key] = true; return true; });
        if (capacities.length) rows.unshift(['Capacity', capacities.join('/')]);
        return rows;
    }
    function specLabel(value, locale) {
        value = String(value || '').trim();
        if (locale === 'ar') return i18n.ARABIC_SPEC_LABELS[value] || value;
        return (i18n.SPEC_LABELS[locale] || {})[value.toUpperCase().replace(/\s+/g, ' ')] || value;
    }
    function specValue(value, locale) {
        value = String(value || '').trim();
        return (i18n.SPEC_VALUE_TEXT[locale] || {})[value] || text(value, locale) || value;
    }
    function descriptionHtml(value) {
        var output = [], list = [];
        function flush() { if (!list.length) return; output.push('<ul class="product-desc-list">' + list.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>'); list = []; }
        String(value || '').split(/\r?\n/).forEach(function (line) {
            line = line.trim();
            if (!line) { flush(); return; }
            if (/^[-*]\s+/.test(line)) { list.push(line.replace(/^[-*]\s+/, '')); return; }
            flush();
            if (/^[^:：]{2,80}[:：]$/.test(line)) output.push('<strong class="product-desc-heading">' + esc(line.replace(/[:：]$/, '')) + '</strong>');
            else output.push('<p>' + esc(line) + '</p>');
        });
        flush();
        return output.join('');
    }
    function firstValue(values) { return Array.isArray(values) ? values.filter(Boolean).slice(0, 3).join(' / ') : ''; }
    function findSpec(product, pattern) { var row = (product.specs || []).find(function (item) { return Array.isArray(item) && pattern.test(String(item[0] || '')); }); return row ? row[1] || '' : ''; }
    function categoryLabel(product, locale) { return localized(product, 'subCategoryLabel', locale) || localized(product, 'categoryLabel', locale) || localized(product, 'groupLabel', locale); }
    function applicationItems(product, locale) {
        var group = String(product.group || product.category || '').toLowerCase();
        var key = /transformer/.test(group) ? 'transformer' : (/switchgear/.test(group) ? 'switchgear' : (/energy|charging|pv|new/.test(group) ? 'energy' : 'other'));
        return (i18n.APPLICATION_ITEMS[key] || []).map(function (item) { return { title: text(item.title.en, locale, item.title.ar), text: text(item.text.en, locale, item.text.ar) }; });
    }
    function relatedProducts(current, products) {
        var id = String(current.id || ''), category = current.category || '', group = current.group || '';
        return (products || []).filter(function (product) { return product && String(product.id || '') !== id && (product.category === category || product.group === group); }).sort(function (a, b) { return (a.category === category ? 0 : 1) - (b.category === category ? 0 : 1); }).slice(0, 3);
    }
    function inquiryField(field, locale) {
        var id = 'detail-' + String(field.name || '').replace(/([A-Z])/g, '-$1').toLowerCase();
        var label = localized(field, 'label', locale) + (field.required ? ' *' : '');
        var attrs = ' id="' + esc(id) + '" name="' + esc(field.name || '') + '"' + (field.required ? ' required' : '') + (field.readonly ? ' readonly' : '') + (field.productContextDisplay ? ' data-product-context-display' : '');
        if (field.type === 'textarea') return '<div class="form-group"><label for="' + esc(id) + '">' + esc(label) + '</label><textarea' + attrs + ' rows="' + esc(field.rows || 5) + '"' + (field.productMessage ? ' data-product-message' : '') + '></textarea></div>';
        if (field.type === 'select') return '<div class="form-group"><label for="' + esc(id) + '">' + esc(label) + '</label><select' + attrs + '>' + (field.options || []).map(function (option) { return '<option value="' + esc(option.value || '') + '">' + esc(localized(option, 'label', locale)) + '</option>'; }).join('') + '</select></div>';
        return '<div class="form-group"><label for="' + esc(id) + '">' + esc(label) + '</label><input type="' + esc(/^(?:text|email|tel|number)$/.test(field.type) ? field.type : 'text') + '"' + attrs + (localized(field, 'placeholder', locale) ? ' placeholder="' + esc(localized(field, 'placeholder', locale)) + '"' : '') + '></div>';
    }
    function productSupport(section, locale) { return section ? '<h2>' + esc(localized(section, 'title', locale)) + '</h2><div class="export-support-grid">' + (section.items || []).map(function (item) { return '<div><strong>' + esc(localized(item, 'title', locale)) + '</strong><span>' + esc(localized(item, 'text', locale)) + '</span></div>'; }).join('') + '</div>' : ''; }
    function productFaq(items, labels, locale) { return '<h2>' + esc(localized(labels, 'faqTitle', locale) || 'Product FAQ') + '</h2>' + (items || []).map(function (item) { return '<details><summary>' + esc(localized(item, 'question', locale)) + '</summary><p>' + esc(localized(item, 'answer', locale)) + '</p></details>'; }).join(''); }
    function productInquiry(form, product, name, locale) {
        if (!form) return '';
        var fields = (form.fields || []).filter(function (field) { return field && field.name !== 'subject'; });
        var contextValue = name + (product.id ? ' (' + product.id + ')' : '');
        var template = localized(form, 'productMessageTemplate', locale);
        var message = template.replace(/\{name\}/g, name).replace(/\{id\}/g, product.id || '');
        return '<h3>' + esc(localized(form, 'title', locale) || 'Product Inquiry') + '</h3>' + (localized(form, 'note', locale) ? '<p class="product-inquiry-note">' + esc(localized(form, 'note', locale)) + '</p>' : '') + '<form class="inquiry-form" data-inquiry-form><input type="hidden" name="subject" value="quote"><input type="hidden" name="productContext" data-product-context value="' + esc(contextValue) + '">' + fields.map(function (field) { var html = inquiryField(field, locale); if (field.productContextDisplay) html = html.replace(/(<input\b[^>]*)(>)/, '$1 value="' + esc(contextValue) + '"$2'); if (field.productMessage) html = html.replace(/(<textarea\b[^>]*>)(<\/textarea>)/, '$1' + esc(message) + '$2'); return html; }).join('') + '<button type="submit" class="btn btn-primary">' + esc(localized(form, 'submitLabel', locale) || 'Submit Inquiry') + '</button></form>';
    }

    function productImages(product, name, locale) {
        var items = Array.isArray(product.images) ? product.images : [];
        var cover = safeAsset(product.image, locale);
        if (!cover) {
            var markedCover = items.find(function (item) { return item && typeof item === 'object' && item.isCover; });
            cover = safeAsset(markedCover && markedCover.src, locale);
        }
        if (!cover) return [];
        var seen = {};
        var normalizedItems = [{ src: cover, thumbnailSrc: cover }];
        seen[cover] = true;
        items.forEach(function (item) {
            var src = safeAsset(item && typeof item === 'object' ? item.src : item, locale);
            if (!src || seen[src]) return;
            seen[src] = true;
            normalizedItems.push({
                src: src,
                thumbnailSrc: safeAsset(item && typeof item === 'object' ? (item.thumbnailSrc || item.thumbnail_src) : '', locale) || src
            });
        });
        if (items.length && items[0] && typeof items[0] === 'object' && safeAsset(items[0].src, locale) === cover) {
            normalizedItems[0].thumbnailSrc = safeAsset(items[0].thumbnailSrc || items[0].thumbnail_src, locale) || cover;
        }
        var ui = GALLERY_UI[locale] || GALLERY_UI.en;
        return normalizedItems.map(function (item, index) {
            return {
                src: item.src,
                thumbnailSrc: item.thumbnailSrc,
                isCover: index === 0,
                alt: index === 0 ? name : name + ' - ' + ui.image + ' ' + (index + 1)
            };
        });
    }

    function productGalleryHtml(images, locale) {
        var ui = GALLERY_UI[locale] || GALLERY_UI.en;
        var multiple = images.length > 1;
        var main = images[0] || { src: '', alt: '' };
        var imageAttrs = main.src ? ' src="' + esc(main.src) + '"' : '';
        var html = '<div class="product-gallery-layout" data-gallery-state="' + (multiple ? 'multiple' : 'single') + '" aria-label="' + esc(ui.images) + '">' +
            '<div class="product-detail-main-image product-gallery-main-stage"><img id="main-product-image"' + imageAttrs + ' alt="' + esc(main.alt) + '" width="960" height="720" loading="eager" decoding="async" fetchpriority="high"></div>';
        if (multiple) {
            html += '<div class="product-gallery-rail"><div class="product-gallery-toolbar">' +
                '<span class="product-gallery-count" aria-live="polite"><span data-product-gallery-current>1</span> / ' + images.length + '</span>' +
                '<div class="product-gallery-actions"><button type="button" class="product-gallery-step" data-product-gallery-step="previous" aria-label="' + esc(ui.previous) + '" title="' + esc(ui.previous) + '" disabled>\u2191</button>' +
                '<button type="button" class="product-gallery-step" data-product-gallery-step="next" aria-label="' + esc(ui.next) + '" title="' + esc(ui.next) + '">\u2193</button></div></div>' +
                '<div class="product-gallery-thumbnails" role="list" aria-label="' + esc(ui.images) + '">' + images.map(function (image, index) {
                    return '<button type="button" class="product-gallery-thumbnail" role="listitem" data-product-gallery-thumbnail data-gallery-index="' + index + '" data-gallery-src="' + esc(image.src) + '" data-gallery-alt="' + esc(image.alt) + '" aria-label="' + esc(ui.view + ' ' + (index + 1)) + '" aria-current="' + (index === 0 ? 'true' : 'false') + '"><img src="' + esc(image.thumbnailSrc || image.src) + '" alt="" aria-hidden="true" loading="lazy" decoding="async" width="160" height="120"></button>';
                }).join('') + '</div></div>';
        }
        return html + '</div>';
    }

    function presentDetail(options) {
        options = options || {};
        var locale = options.locale || 'en', product = options.product || {}, products = options.products || [];
        var block = localizeTree(options.contentBlock && options.contentBlock.body || options.contentBlock || {}, locale);
        var labels = block.detailLabels || {}, name = localized(product, 'name', locale), desc = localized(product, 'description', locale) || localized(product, 'shortDesc', locale), category = categoryLabel(product, locale);
        var voltage = firstValue(product.voltages) || findSpec(product, /voltage|kv|v/i);
        var capacity = firstValue(product.capacities) || findSpec(product, /capacity|power|rated/i);
        var standard = findSpec(product, /standard|iec|gb/i);
        var decision = [
            { label: text('Category', locale, 'الفئة'), value: category || text('Power Equipment', locale, 'معدات الطاقة') },
            { label: text('Voltage', locale, 'الجهد'), value: voltage || text('Project-specific', locale, 'حسب المشروع') },
            { label: text('Capacity', locale, 'السعة'), value: capacity || text('Confirm by requirement', locale, 'تحدد حسب الطلب') }
        ];
        var applications = applicationItems(product, locale);
        var selection = [
            text('Confirm the required voltage level, rated capacity, frequency, and installation environment.', locale, 'تأكيد مستوى الجهد والسعة المقننة والتردد وبيئة التركيب.'),
            text('Share the destination country, quantity, project schedule, and whether drawings or technical documents are required.', locale, 'تزويد بلد المشروع والكمية والجدول الزمني وما إذا كانت الرسومات أو المستندات الفنية مطلوبة.'),
            text('Use the inquiry form on this page so the sales and engineering team can reply with a matched configuration.', locale, 'استخدم نموذج الاستفسار في هذه الصفحة ليرد فريق المبيعات والهندسة بتكوين مناسب.')
        ];
        if (voltage || capacity || standard) selection.unshift([voltage ? text('Voltage: ', locale, 'الجهد: ') + voltage : '', capacity ? text('Capacity: ', locale, 'السعة: ') + capacity : '', standard ? text('Standard: ', locale, 'المعيار: ') + standard : ''].filter(Boolean).join(' | '));
        var related = relatedProducts(product, products);
        var specs = displaySpecRows(product);
        var images = productImages(product, name, locale);
        var mainImage = images[0] || { src: safeAsset(product.image, locale), alt: name };
        var result = {
            contractVersion: 1, kind: 'detail', key: '',
            state: { productId: product.id || '', slug: product.slug || product.id || '' },
            image: { src: mainImage.src, alt: mainImage.alt, width: 960, height: 720 },
            images: images,
            hero: { title: name, subtitle: category || localized(labels, 'defaultSubtitle', locale), breadcrumb: name },
            fragments: {
                gallery: productGalleryHtml(images, locale), title: esc(name), description: descriptionHtml(desc),
                decision: '<div class="product-decision-grid">' + decision.map(function (item) { return '<div><span>' + esc(item.label) + '</span><strong' + rtl(locale) + '>' + esc(item.value) + '</strong></div>'; }).join('') + '</div><button type="button" class="btn btn-primary btn-sm" data-open-inquiry data-product-id="' + esc(product.id || '') + '" data-product-name="' + esc(name) + '">' + esc(text('Request Configuration Quote', locale, 'طلب عرض تكوين')) + '</button>',
                applications: '<h2>' + esc(text('Application Scenarios', locale, 'سيناريوهات الاستخدام')) + '</h2><div class="product-applications-grid">' + applications.map(function (item) { return '<div><strong>' + esc(item.title) + '</strong><span>' + esc(item.text) + '</span></div>'; }).join('') + '</div>',
                selection: '<h2>' + esc(text('Selection & Delivery Notes', locale, 'ملاحظات الاختيار والتسليم')) + '</h2><ul class="product-selection-list">' + selection.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>',
                specsTitle: esc(localized(labels, 'specsTitle', locale) || 'Product Parameter'),
                specs: specs.map(function (row) { return '<tr><td' + rtl(locale) + '>' + esc(specLabel(row[0], locale)) + '</td><td' + rtl(locale, 'value') + '>' + esc(specValue(row[1], locale)) + '</td></tr>'; }).join(''),
                support: productSupport(block.detailSupport, locale), faq: productFaq(block.detailFaq, labels, locale), inquiry: productInquiry(block.inquiryForm, product, name, locale),
                related: related.length ? '<h2>' + esc(localized(labels, 'relatedTitle', locale) || localized(labels, 'relatedProducts', locale) || 'Related Products') + '</h2><div class="product-related-grid">' + related.map(function (item) { var relatedName = localized(item, 'name', locale), relatedDesc = localized(item, 'shortDesc', locale) || localized(item, 'description', locale), image = safeAsset(item.image, locale); return '<article class="product-related-card"><a href="' + esc(productPath(item, locale)) + '"><div class="product-related-image">' + (image ? '<img src="' + esc(image) + '" alt="' + esc(relatedName) + '" loading="lazy" decoding="async" width="320" height="220">' : '') + '</div><div class="product-related-body"><h3' + rtl(locale) + '>' + esc(relatedName) + '</h3><p' + rtl(locale) + '>' + esc(relatedDesc) + '</p></div></a></article>'; }).join('') + '</div>' : ''
            },
            bootstrap: { v: 1, kind: 'detail', locale: locale, key: '', productId: product.id || '', contentVersion: options.contentVersion || 0 }
        };
        result.key = 'detail-' + hash({ v: 1, locale: locale, state: result.state, image: result.image, hero: result.hero, fragments: result.fragments, contentVersion: options.contentVersion || 0 });
        result.bootstrap.key = result.key;
        return result;
    }

    function serializeBootstrap(value) { return JSON.stringify(value).replace(/&/g, '\\u0026').replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
    return { PAGE_SIZE: PAGE_SIZE, normalizeTaxonomy: normalizeTaxonomy, deriveTaxonomy: deriveTaxonomy, presentCatalog: presentCatalog, presentDetail: presentDetail, serializeBootstrap: serializeBootstrap, displaySpecRows: displaySpecRows, relatedProducts: relatedProducts };
}));
