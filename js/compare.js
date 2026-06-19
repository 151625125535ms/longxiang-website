(function () {
    'use strict';

    var container = document.getElementById('comparison-container');
    if (!container) return;

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';
    var contentPromise = window.longxiangContentPagePromise || Promise.resolve(null);
    var ARABIC_TEXT_FALLBACKS = {
        'Product Comparison': 'مقارنة المنتجات',
        'Compare selected products.': 'قارن بين المنتجات المحددة.',
        'Back': 'رجوع',
        'Print': 'طباعة',
        'No products selected': 'لم يتم تحديد منتجات',
        'Return to the product list and choose products to compare.': 'ارجع إلى قائمة المنتجات واختر المنتجات المراد مقارنتها.',
        'Product': 'المنتج',
        'Category': 'الفئة',
        'Image': 'الصورة',
        'Capacities': 'السعات',
        'Voltages': 'الجهود',
        'Description': 'الوصف',
        'Specification': 'المواصفة'
    };
    var ARABIC_SPEC_LABELS = {
        'Product Model': 'طراز المنتج',
        'Model': 'الطراز',
        'Core Type': 'نوع القلب',
        'Phase': 'الطور',
        'Frequency': 'التردد',
        'Cooling Method': 'طريقة التبريد',
        'Short-Circuit Withstand': 'تحمل القصر الكهربائي',
        'Insulation Level': 'مستوى العزل',
        'Standard': 'المعيار',
        'Rated Capacity': 'السعة المقننة',
        'Rated Voltage': 'الجهد المقنن',
        'Voltage': 'الجهد',
        'Capacity': 'السعة',
        'Impedance': 'المعاوقة',
        'Connection Group': 'مجموعة التوصيل',
        'No-load Loss': 'الفقد بدون حمل',
        'Load Loss': 'الفقد تحت الحمل',
        'No-load Current': 'تيار اللاحمل',
        'Temperature Rise': 'ارتفاع درجة الحرارة',
        'Protection Level': 'درجة الحماية',
        'Application': 'التطبيق',
        'Material': 'المادة',
        'Enclosure': 'الغلاف',
        'Installation': 'طريقة التركيب'
    };

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

    function normalizeImagePath(path) {
        path = String(path || '').trim().replace(/\\/g, '/');
        if (!path) return '';
        if (/^(https?:)?\/\//i.test(path) || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
        path = path.replace(/^\/+/, '');
        return assetPrefix + path;
    }

    function localized(item, key) {
        if (!item) return '';
        if (isArabic && item[key + 'Ar']) return item[key + 'Ar'];
        if (isArabic && typeof item[key] === 'string' && ARABIC_TEXT_FALLBACKS[item[key].trim()]) {
            return ARABIC_TEXT_FALLBACKS[item[key].trim()];
        }
        return item[key] || '';
    }

    function compareLabel(content, key, fallback) {
        return localized(content && content.table, key) || fallback;
    }

    function getCompareContent() {
        return contentPromise
            .then(function (block) {
                return block && block.body ? block.body : {};
            })
            .catch(function () {
                return {};
            });
    }

    function getIds() {
        var value = new URLSearchParams(window.location.search).get('ids') || '';
        return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean).slice(0, 3);
    }

    function fetchProducts() {
        return fetch('/api/products')
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            });
    }

    function valueList(values) {
        if (!values || !values.length) return '-';
        return values.map(escapeHtml).join('<br>');
    }

    function translatedSpecLabel(label) {
        if (!isArabic) return label || '';
        label = String(label || '').trim();
        return ARABIC_SPEC_LABELS[label] || label;
    }

    function headerCellAttrs() {
        return isArabic ? ' dir="rtl" lang="ar" class="rtl-product-text"' : '';
    }

    function textCellAttrs() {
        return isArabic ? ' dir="auto" lang="ar" class="bidi-product-text"' : '';
    }

    function specsByName(product) {
        var result = {};
        (product.specs || []).forEach(function (spec) {
            if (spec && spec[0]) result[spec[0]] = spec[1] || '-';
        });
        return result;
    }

    function render(products, content) {
        var ids = getIds();
        var selected = ids.map(function (id) {
            return products.find(function (product) { return product.id === id; });
        }).filter(Boolean);

        if (!selected.length) {
            var emptyText = localized(content && content.emptyState, 'text') || (isArabic ? 'اختر المنتجات من القائمة لمقارنة المواصفات.' : 'Select products from the catalog to compare their specifications.');
            container.innerHTML = '<div class="empty-state">' + escapeHtml(emptyText) + '</div>';
            return;
        }

        var specNames = [];
        selected.forEach(function (product) {
            (product.specs || []).forEach(function (spec) {
                if (spec && spec[0] && specNames.indexOf(spec[0]) === -1) specNames.push(spec[0]);
            });
        });

        var rows = [
            { label: compareLabel(content, 'imageLabel', isArabic ? 'الصورة' : 'Image'), html: function (p) { var imagePath = normalizeImagePath(p.image); return imagePath ? '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(localize(p, 'name')) + '" loading="lazy" decoding="async" width="120" height="86" style="width:120px;height:86px;object-fit:cover;border-radius:8px;">' : '-'; } },
            { label: compareLabel(content, 'categoryLabel', isArabic ? 'الفئة' : 'Category'), html: function (p) { return escapeHtml(isArabic ? (p.categoryLabelAr || p.categoryLabel) : (p.categoryLabel || p.category)); } },
            { label: compareLabel(content, 'capacitiesLabel', isArabic ? 'السعات' : 'Capacities'), html: function (p) { return valueList(p.capacities); } },
            { label: compareLabel(content, 'voltagesLabel', isArabic ? 'الجهود' : 'Voltages'), html: function (p) { return valueList(p.voltages); } },
            { label: compareLabel(content, 'descriptionLabel', isArabic ? 'الوصف' : 'Description'), html: function (p) { return escapeHtml(localize(p, 'shortDesc') || localize(p, 'description')); } }
        ];

        specNames.forEach(function (name) {
            rows.push({
                label: translatedSpecLabel(name),
                html: function (p) {
                    return escapeHtml(specsByName(p)[name] || '-');
                }
            });
        });

        container.innerHTML =
            '<div class="comparison-table-wrapper">' +
                '<table class="comparison-table">' +
                    '<thead><tr><th' + headerCellAttrs() + '>' + escapeHtml(compareLabel(content, 'specificationLabel', isArabic ? 'المواصفة' : 'Specification')) + '</th>' +
                        selected.map(function (p) { return '<th' + headerCellAttrs() + '>' + escapeHtml(localize(p, 'name')) + '</th>'; }).join('') +
                    '</tr></thead>' +
                    '<tbody>' +
                        rows.map(function (row) {
                            return '<tr><td' + headerCellAttrs() + '>' + escapeHtml(row.label) + '</td>' + selected.map(function (p) { return '<td' + textCellAttrs() + '>' + row.html(p) + '</td>'; }).join('') + '</tr>';
                        }).join('') +
                    '</tbody>' +
                '</table>' +
            '</div>';
    }

    var printBtn = document.getElementById('btn-print-comparison');
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            window.print();
        });
    }

    getCompareContent().then(function (content) {
        fetchProducts().then(function (products) {
            render(products, content);
        }).catch(function () {
            var errorText = localized(content && content.emptyState, 'errorText') || (isArabic ? 'تعذر تحميل بيانات المقارنة.' : 'Unable to load comparison data.');
            container.innerHTML = '<div class="empty-state">' + escapeHtml(errorText) + '</div>';
        });
    });
})();
