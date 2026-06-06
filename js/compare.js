(function () {
    'use strict';

    var container = document.getElementById('comparison-container');
    if (!container) return;

    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';

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

    function getIds() {
        var value = new URLSearchParams(window.location.search).get('ids') || '';
        return value.split(',').map(function (item) { return item.trim(); }).filter(Boolean).slice(0, 3);
    }

    function fetchProducts() {
        return fetch('/api/products')
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .catch(function () {
                return fetch(assetPrefix + 'data/products.json').then(function (res) {
                    if (!res.ok) throw new Error('Fallback request failed');
                    return res.json();
                });
            });
    }

    function valueList(values) {
        if (!values || !values.length) return '-';
        return values.map(escapeHtml).join('<br>');
    }

    function specsByName(product) {
        var result = {};
        (product.specs || []).forEach(function (spec) {
            if (spec && spec[0]) result[spec[0]] = spec[1] || '-';
        });
        return result;
    }

    function render(products) {
        var ids = getIds();
        var selected = ids.map(function (id) {
            return products.find(function (product) { return product.id === id; });
        }).filter(Boolean);

        if (!selected.length) {
            container.innerHTML = '<div class="empty-state">' + (isArabic ? 'اختر المنتجات من القائمة لمقارنة المواصفات.' : 'Select products from the catalog to compare their specifications.') + '</div>';
            return;
        }

        var specNames = [];
        selected.forEach(function (product) {
            (product.specs || []).forEach(function (spec) {
                if (spec && spec[0] && specNames.indexOf(spec[0]) === -1) specNames.push(spec[0]);
            });
        });

        var rows = [
            { label: isArabic ? 'الصورة' : 'Image', html: function (p) { return '<img src="' + assetPrefix + escapeHtml(p.image || '') + '" alt="' + escapeHtml(localize(p, 'name')) + '" style="width:120px;height:86px;object-fit:cover;border-radius:8px;">'; } },
            { label: isArabic ? 'الفئة' : 'Category', html: function (p) { return escapeHtml(isArabic ? (p.categoryLabelAr || p.categoryLabel) : (p.categoryLabel || p.category)); } },
            { label: isArabic ? 'السعات' : 'Capacities', html: function (p) { return valueList(p.capacities); } },
            { label: isArabic ? 'الجهود' : 'Voltages', html: function (p) { return valueList(p.voltages); } },
            { label: isArabic ? 'الوصف' : 'Description', html: function (p) { return escapeHtml(localize(p, 'shortDesc') || localize(p, 'description')); } }
        ];

        specNames.forEach(function (name) {
            rows.push({
                label: name,
                html: function (p) {
                    return escapeHtml(specsByName(p)[name] || '-');
                }
            });
        });

        container.innerHTML =
            '<div class="comparison-table-wrapper">' +
                '<table class="comparison-table">' +
                    '<thead><tr><th>' + (isArabic ? 'المواصفة' : 'Specification') + '</th>' +
                        selected.map(function (p) { return '<th>' + escapeHtml(localize(p, 'name')) + '</th>'; }).join('') +
                    '</tr></thead>' +
                    '<tbody>' +
                        rows.map(function (row) {
                            return '<tr><td>' + escapeHtml(row.label) + '</td>' + selected.map(function (p) { return '<td>' + row.html(p) + '</td>'; }).join('') + '</tr>';
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

    fetchProducts().then(render).catch(function () {
        container.innerHTML = '<div class="empty-state">' + (isArabic ? 'تعذر تحميل بيانات المقارنة.' : 'Unable to load comparison data.') + '</div>';
    });
})();
