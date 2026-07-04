(function () {
    'use strict';

    var locale = window.LongxiangI18n && window.LongxiangI18n.currentLocale
        ? window.LongxiangI18n.currentLocale()
        : (/\/ar\//.test(window.location.pathname.replace(/\\/g, '/')) ? 'ar' : 'en');
    var isArabic = locale === 'ar';
    var assetPrefix = window.LongxiangI18n && window.LongxiangI18n.assetBasePrefix
        ? window.LongxiangI18n.assetBasePrefix(locale)
        : (isArabic ? '../' : '');
    var productPageContent = {};
    var ARABIC_TEXT_FALLBACKS = {
        'Product Details': 'تفاصيل المنتج',
        'Review product information and request a quotation.': 'راجع معلومات المنتج واطلب عرض سعر.',
        'Overview': 'نظرة عامة',
        'Specifications': 'المواصفات',
        'Request a Quote': 'طلب عرض سعر',
        'Related Products': 'منتجات ذات صلة',
        'Product not found': 'لم يتم العثور على المنتج',
        'Please return to the product list and choose another item.': 'يرجى العودة إلى قائمة المنتجات واختيار منتج آخر.',
        'Back to Products': 'العودة إلى المنتجات',
        'Technical Support': 'الدعم الفني',
        'Our team can help confirm parameters, voltage levels, and delivery requirements.': 'يمكن لفريقنا مساعدتك في تأكيد المعايير ومستويات الجهد ومتطلبات التسليم.',
        'Product Inquiry': 'استفسار عن المنتج',
        'Leave your contact details and requirements.': 'اترك بيانات الاتصال ومتطلباتك.',
        'Submit Inquiry': 'إرسال الاستفسار'
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
    var SPEC_LABELS = {
        fr: {
            'PRODUCT MODEL': 'Mod\u00e8le du produit',
            'MODEL': 'Mod\u00e8le',
            'INPUT / OUTPUT VOLTAGE': 'Tension d\u2019entr\u00e9e / sortie',
            'INPUT VOLTAGE': 'Tension d\u2019entr\u00e9e',
            'OUTPUT VOLTAGE': 'Tension de sortie',
            'SINGLE-GUN MAXIMUM POWER': 'Puissance maximale par connecteur',
            'TOTAL MAXIMUM POWER': 'Puissance maximale totale',
            'STANDBY POWER': 'Puissance en veille',
            'BILLING METHOD': 'Mode de facturation',
            'PAYMENT METHOD': 'Mode de paiement',
            'ENCLOSURE MATERIAL': 'Mat\u00e9riau du bo\u00eetier',
            'DISPLAY': 'Affichage',
            'CABLE LENGTH': 'Longueur du c\u00e2ble',
            'METERING ACCURACY CLASS': 'Classe de pr\u00e9cision du comptage',
            'OPERATING TEMPERATURE': 'Temp\u00e9rature de fonctionnement',
            'OPERATING HUMIDITY': 'Humidit\u00e9 de fonctionnement',
            'OPERATING ALTITUDE': 'Altitude de fonctionnement',
            'PROTECTION RATING': 'Indice de protection',
            'INSTALLATION METHOD': 'Mode d\u2019installation',
            'PRODUCT WEIGHT': 'Poids du produit',
            'DIMENSIONS': 'Dimensions',
            'RATED CAPACITY': 'Capacit\u00e9 nominale',
            'RATED VOLTAGE': 'Tension nominale',
            'VOLTAGE': 'Tension',
            'CAPACITY': 'Capacit\u00e9',
            'STANDARD': 'Norme',
            'FREQUENCY': 'Fr\u00e9quence',
            'COOLING METHOD': 'Mode de refroidissement',
            'PROTECTION LEVEL': 'Niveau de protection',
            'APPLICATION': 'Application',
            'MATERIAL': 'Mat\u00e9riau',
            'INSTALLATION': 'Installation'
        },
        ru: {
            'PRODUCT MODEL': '\u041c\u043e\u0434\u0435\u043b\u044c \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0430',
            'MODEL': '\u041c\u043e\u0434\u0435\u043b\u044c',
            'INPUT / OUTPUT VOLTAGE': '\u0412\u0445\u043e\u0434\u043d\u043e\u0435 / \u0432\u044b\u0445\u043e\u0434\u043d\u043e\u0435 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u0435',
            'INPUT VOLTAGE': '\u0412\u0445\u043e\u0434\u043d\u043e\u0435 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u0435',
            'OUTPUT VOLTAGE': '\u0412\u044b\u0445\u043e\u0434\u043d\u043e\u0435 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u0435',
            'SINGLE-GUN MAXIMUM POWER': '\u041c\u0430\u043a\u0441. \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c \u043e\u0434\u043d\u043e\u0433\u043e \u043f\u0438\u0441\u0442\u043e\u043b\u0435\u0442\u0430',
            'TOTAL MAXIMUM POWER': '\u041e\u0431\u0449\u0430\u044f \u043c\u0430\u043a\u0441. \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c',
            'STANDBY POWER': '\u041f\u043e\u0442\u0440\u0435\u0431\u043b\u0435\u043d\u0438\u0435 \u0432 \u0440\u0435\u0436\u0438\u043c\u0435 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f',
            'BILLING METHOD': '\u0421\u043f\u043e\u0441\u043e\u0431 \u0442\u0430\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438',
            'PAYMENT METHOD': '\u0421\u043f\u043e\u0441\u043e\u0431 \u043e\u043f\u043b\u0430\u0442\u044b',
            'ENCLOSURE MATERIAL': '\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043a\u043e\u0440\u043f\u0443\u0441\u0430',
            'DISPLAY': '\u0414\u0438\u0441\u043f\u043b\u0435\u0439',
            'CABLE LENGTH': '\u0414\u043b\u0438\u043d\u0430 \u043a\u0430\u0431\u0435\u043b\u044f',
            'METERING ACCURACY CLASS': '\u041a\u043b\u0430\u0441\u0441 \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u0438 \u0443\u0447\u0435\u0442\u0430',
            'OPERATING TEMPERATURE': '\u0420\u0430\u0431\u043e\u0447\u0430\u044f \u0442\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430',
            'OPERATING HUMIDITY': '\u0420\u0430\u0431\u043e\u0447\u0430\u044f \u0432\u043b\u0430\u0436\u043d\u043e\u0441\u0442\u044c',
            'OPERATING ALTITUDE': '\u0420\u0430\u0431\u043e\u0447\u0430\u044f \u0432\u044b\u0441\u043e\u0442\u0430',
            'PROTECTION RATING': '\u0421\u0442\u0435\u043f\u0435\u043d\u044c \u0437\u0430\u0449\u0438\u0442\u044b',
            'INSTALLATION METHOD': '\u0421\u043f\u043e\u0441\u043e\u0431 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438',
            'PRODUCT WEIGHT': '\u0412\u0435\u0441 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0430',
            'DIMENSIONS': '\u0413\u0430\u0431\u0430\u0440\u0438\u0442\u044b',
            'RATED CAPACITY': '\u041d\u043e\u043c\u0438\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c',
            'RATED VOLTAGE': '\u041d\u043e\u043c\u0438\u043d\u0430\u043b\u044c\u043d\u043e\u0435 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u0435',
            'VOLTAGE': '\u041d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u0435',
            'CAPACITY': '\u041c\u043e\u0449\u043d\u043e\u0441\u0442\u044c',
            'STANDARD': '\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442',
            'FREQUENCY': '\u0427\u0430\u0441\u0442\u043e\u0442\u0430',
            'COOLING METHOD': '\u0421\u043f\u043e\u0441\u043e\u0431 \u043e\u0445\u043b\u0430\u0436\u0434\u0435\u043d\u0438\u044f',
            'PROTECTION LEVEL': '\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0437\u0430\u0449\u0438\u0442\u044b',
            'APPLICATION': '\u041f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u0435',
            'MATERIAL': '\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b',
            'INSTALLATION': '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430'
        }
    };
    var SPEC_VALUE_TEXT = {
        fr: {
            'Card swiping and QR-code payment': 'Paiement par carte et QR code',
            'Charging by energy or by time': 'Facturation à l’énergie ou au temps',
            'Charging by time/power/amount/quantity': 'Facturation au temps, à la puissance, au montant ou à la quantité',
            'Mobile QR code scanning, card swiping (optional)': 'Scan du QR code mobile, paiement par carte en option',
            'QR code scanning, VIN, card swiping (optional)': 'Scan du QR code, VIN et paiement par carte en option',
            'Sheet-metal housing, oxidized black sheet-metal panel': 'Boîtier en tôle, panneau noir oxydé en tôle',
            'Three-color indicator strip: standby, charging and alarm status': 'Bande lumineuse tricolore : veille, recharge et alarme',
            'Wall-mounted': 'Montage mural',
            'Floor-mounted': 'Montage au sol',
            'Column-mounted': 'Montage sur colonne',
            'Color LCD': 'Écran LCD couleur',
            'Color LCD display': 'Écran LCD couleur',
            'Class 2': 'Classe 2',
            '-30°C to +55°C': '-30 °C à +55 °C',
            '550 x 220 x 1500 mm (L x W x H)': '550 x 220 x 1500 mm (L x l x H)'
        },
        ru: {
            'Card swiping and QR-code payment': 'Оплата картой и QR-кодом',
            'Charging by energy or by time': 'Тарификация по энергии или по времени',
            'Charging by time/power/amount/quantity': 'Тарификация по времени, мощности, сумме или количеству',
            'Mobile QR code scanning, card swiping (optional)': 'Сканирование мобильного QR-кода, оплата картой опционально',
            'QR code scanning, VIN, card swiping (optional)': 'Сканирование QR-кода, VIN и оплата картой опционально',
            'Sheet-metal housing, oxidized black sheet-metal panel': 'Корпус из листового металла, оксидированная черная панель',
            'Three-color indicator strip: standby, charging and alarm status': 'Трехцветная индикация: ожидание, зарядка и авария',
            'Wall-mounted': 'Настенный монтаж',
            'Floor-mounted': 'Напольный монтаж',
            'Column-mounted': 'Монтаж на колонне',
            'Color LCD': 'Цветной LCD-дисплей',
            'Color LCD display': 'Цветной LCD-дисплей',
            'Class 2': 'Класс 2',
            '-30°C to +55°C': 'от -30 °C до +55 °C',
            '550 x 220 x 1500 mm (L x W x H)': '550 x 220 x 1500 mm (Д x Ш x В)'
        }
    };
    var TEXT_FALLBACKS = {
        fr: {
            'Category': 'Catégorie',
            'Power Equipment': 'Équipement électrique',
            'Voltage': 'Tension',
            'Project-specific': 'Selon le projet',
            'Capacity': 'Capacité',
            'Confirm by requirement': 'À valider selon le besoin',
            'Request Configuration Quote': 'Demander un devis de configuration',
            'Application Scenarios': 'Scénarios d’application',
            'Selection & Delivery Notes': 'Notes de sélection et de livraison',
            'PV Projects': 'Projets photovoltaïques',
            'For photovoltaic access, grid connection, combiner, and distribution scenarios.': 'Pour l’accès photovoltaïque, le raccordement au réseau, les coffrets de regroupement et la distribution.',
            'Charging Sites': 'Sites de recharge',
            'Supports charging stations, commercial energy sites, and public facilities.': 'Prend en charge les stations de recharge, les sites énergétiques commerciaux et les installations publiques.',
            'Energy Integration': 'Intégration énergétique',
            'Can be matched with storage, cabinets, monitoring, and project delivery.': 'Peut être associé au stockage, aux armoires, à la supervision et à la livraison de projet.',
            'Confirm the required voltage level, rated capacity, frequency, and installation environment.': 'Validez le niveau de tension, la capacité nominale, la fréquence et l’environnement d’installation requis.',
            'Share the destination country, quantity, project schedule, and whether drawings or technical documents are required.': 'Indiquez le pays de destination, la quantité, le calendrier du projet et les documents techniques nécessaires.',
            'Use the inquiry form on this page so the sales and engineering team can reply with a matched configuration.': 'Utilisez le formulaire de cette page afin que les équipes commerciale et technique répondent avec une configuration adaptée.',
            'Voltage: ': 'Tension : ',
            'Capacity: ': 'Capacité : ',
            'Standard: ': 'Norme : '
        },
        ru: {
            'Category': 'Категория',
            'Power Equipment': 'Электрооборудование',
            'Voltage': 'Напряжение',
            'Project-specific': 'По требованиям проекта',
            'Capacity': 'Мощность',
            'Confirm by requirement': 'Уточняется по запросу',
            'Request Configuration Quote': 'Запросить расчет конфигурации',
            'Application Scenarios': 'Сценарии применения',
            'Selection & Delivery Notes': 'Примечания по подбору и поставке',
            'PV Projects': 'Фотоэлектрические проекты',
            'For photovoltaic access, grid connection, combiner, and distribution scenarios.': 'Для подключения фотоэлектрических систем, сетевого присоединения, объединительных шкафов и распределительных сценариев.',
            'Charging Sites': 'Зарядные площадки',
            'Supports charging stations, commercial energy sites, and public facilities.': 'Поддерживает зарядные станции, коммерческие энергетические объекты и общественную инфраструктуру.',
            'Energy Integration': 'Интеграция энергии',
            'Can be matched with storage, cabinets, monitoring, and project delivery.': 'Может сочетаться с накопителями энергии, шкафами, мониторингом и проектной поставкой.',
            'Confirm the required voltage level, rated capacity, frequency, and installation environment.': 'Подтвердите требуемый уровень напряжения, номинальную мощность, частоту и условия установки.',
            'Share the destination country, quantity, project schedule, and whether drawings or technical documents are required.': 'Укажите страну назначения, количество, график проекта и необходимость чертежей или технических документов.',
            'Use the inquiry form on this page so the sales and engineering team can reply with a matched configuration.': 'Используйте форму запроса на этой странице, чтобы отдел продаж и инженеры ответили с подходящей конфигурацией.',
            'Voltage: ': 'Напряжение: ',
            'Capacity: ': 'Мощность: ',
            'Standard: ': 'Стандарт: '
        }
    };

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
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(product, field, locale);
            if (value) return textFallback(value) || value;
        }
        if (isArabic) {
            var arField = field + 'Ar';
            if (product[arField]) return product[arField];
        }
        return textFallback(product[field]) || product[field] || '';
    }

    function localizedContent(item, field) {
        if (!item) return '';
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, field, locale);
            var fallbackValue = textFallback(value);
            if (fallbackValue) return fallbackValue;
            if (value && (!isArabic || value !== item[field])) return value;
        }
        if (isArabic && item[field + 'Ar']) return item[field + 'Ar'];
        if (isArabic && typeof item[field] === 'string' && ARABIC_TEXT_FALLBACKS[item[field].trim()]) {
            return ARABIC_TEXT_FALLBACKS[item[field].trim()];
        }
        return textFallback(item[field]) || item[field] || '';
    }

    function translatedSpecLabel(label) {
        label = String(label || '').trim();
        if (isArabic) return ARABIC_SPEC_LABELS[label] || label;
        var labels = SPEC_LABELS[locale] || {};
        return labels[label.toUpperCase().replace(/\s+/g, ' ')] || label;
    }

    function translatedSpecValue(value) {
        value = String(value || '').trim();
        var values = SPEC_VALUE_TEXT[locale] || {};
        return values[value] || textFallback(value) || value;
    }

    function specLabelAttrs() {
        return isArabic ? ' dir="rtl" lang="ar" class="rtl-product-text"' : '';
    }

    function specValueAttrs() {
        return isArabic ? ' dir="auto" lang="ar" class="bidi-product-text"' : '';
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
        if (window.LongxiangI18n && window.LongxiangI18n.localizedAssetPath) {
            return window.LongxiangI18n.localizedAssetPath(path, locale);
        }
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

    function text(en, ar) {
        if (isArabic) return ar;
        var pack = TEXT_FALLBACKS[locale] || {};
        return pack[en] || en;
    }

    function textFallback(value) {
        if (typeof value !== 'string') return '';
        var pack = TEXT_FALLBACKS[locale] || {};
        return pack[value.trim()] || '';
    }

    function rtlAttrs(className) {
        return isArabic ? ' dir="rtl" lang="ar" class="' + (className || 'rtl-product-text') + '"' : '';
    }

    function productSlug(product) {
        return String(product && (product.slug || product.id) || '').trim();
    }

    function productPublicPath(product, localeCode) {
        var slug = productSlug(product);
        if (window.LongxiangI18n && window.LongxiangI18n.localizedProductPath) {
            return window.LongxiangI18n.localizedProductPath(slug, localeCode || locale);
        }
        return (localeCode === 'ar' ? '/ar/products/' : '/products/') + encodeURIComponent(slug);
    }

    function detailHref(product) {
        return productPublicPath(product, locale);
    }

    function firstValue(values) {
        if (!Array.isArray(values)) return '';
        return values.filter(Boolean).slice(0, 3).join(' / ');
    }

    function findSpecValue(product, pattern) {
        var specs = Array.isArray(product.specs) ? product.specs : [];
        for (var i = 0; i < specs.length; i += 1) {
            var row = specs[i];
            if (!Array.isArray(row)) continue;
            var label = String(row[0] || '');
            if (pattern.test(label)) return row[1] || '';
        }
        return '';
    }

    function compactSpecValues(values) {
        var seen = {};
        var result = [];
        (values || []).forEach(function (value) {
            var textValue = String(value || '').trim();
            var key = textValue.toLowerCase();
            if (!textValue || seen[key]) return;
            seen[key] = true;
            result.push(textValue);
        });
        return result;
    }

    function displaySpecRows(product) {
        var specs = Array.isArray(product.specs) ? product.specs : [];
        var capacityValues = [];
        var rows = [];

        if (Array.isArray(product.capacities)) {
            capacityValues = capacityValues.concat(product.capacities);
        }

        specs.forEach(function (spec) {
            if (!Array.isArray(spec)) return;
            var label = String(spec[0] || '').trim();
            var value = spec[1];
            if (/^capacity$/i.test(label)) {
                capacityValues.push(value);
                return;
            }
            rows.push([label, value]);
        });

        capacityValues = compactSpecValues(capacityValues);
        if (capacityValues.length) {
            rows.unshift(['Capacity', capacityValues.join('/')]);
        }
        return rows;
    }

    function productContextValue(product, name) {
        return name ? name + (product.id ? ' (' + product.id + ')' : '') : (product.id || '');
    }

    function productCategoryLabel(product) {
        return localize(product, 'subCategoryLabel')
            || localize(product, 'categoryLabel')
            || localize(product, 'groupLabel')
            || '';
    }

    function productIdentifierFromPath() {
        if (window.LongxiangI18n && window.LongxiangI18n.productIdentifierFromLocalizedPath) {
            return window.LongxiangI18n.productIdentifierFromLocalizedPath(window.location.pathname);
        }
        var path = window.location.pathname.replace(/\\/g, '/');
        var match = path.match(/^\/(?:ar\/)?products\/([^/]+)\/?$/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function upsertHeadLink(rel, attrs) {
        var selector = 'link[rel="' + rel + '"]';
        if (attrs.hreflang) selector += '[hreflang="' + attrs.hreflang + '"]';
        var link = document.querySelector(selector);
        if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            if (attrs.hreflang) link.setAttribute('hreflang', attrs.hreflang);
            document.head.appendChild(link);
        }
        Object.keys(attrs).forEach(function (key) {
            link.setAttribute(key, attrs[key]);
        });
    }

    function upsertMeta(name, property, content) {
        if (!content) return;
        var selector = property ? 'meta[property="' + property + '"]' : 'meta[name="' + name + '"]';
        var meta = document.querySelector(selector);
        if (!meta) {
            meta = document.createElement('meta');
            if (property) meta.setAttribute('property', property);
            else meta.setAttribute('name', name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    function injectJsonLd(key, data) {
        var old = document.querySelector('script[data-schema-auto="' + key + '"]');
        if (old) old.remove();
        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-schema-auto', key);
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }

    function productCanonicalUrls(product) {
        var urls = {};
        var entries = window.LongxiangI18n && window.LongxiangI18n.seoLocales
            ? window.LongxiangI18n.seoLocales()
            : [{ code: 'en', hreflang: 'en' }, { code: 'ar', hreflang: 'ar' }];
        entries.forEach(function (entry) {
            urls[entry.code] = window.location.origin + productPublicPath(product, entry.code);
        });
        return urls;
    }

    function productSeoTitle(product, name) {
        var localizedSeoTitle = isArabic ? '' : localize(product, 'seoTitle');
        if (localizedSeoTitle) return localizedSeoTitle;
        var titleSuffix = detailLabel('titleSuffix');
        return titleSuffix ? name + ' | ' + titleSuffix : name;
    }

    function cleanMetaDescription(value) {
        var textValue = String(value || '').replace(/\s+/g, ' ').trim();
        if (textValue.length <= 165) return textValue;
        var clipped = textValue.slice(0, 162).replace(/[\s,;:.-]+[^\s,;:.-]*$/, '');
        return (clipped || textValue.slice(0, 162)).trim() + '...';
    }

    function productSeoDescription(product, desc) {
        var value = '';
        if (!isArabic && localize(product, 'seoDescription')) value = localize(product, 'seoDescription');
        else if (isArabic) value = localize(product, 'shortDesc') || desc;
        else value = desc || localize(product, 'shortDesc');
        return cleanMetaDescription(value);
    }

    function injectProductSeo(product, name, desc) {
        var urls = productCanonicalUrls(product);
        var entries = window.LongxiangI18n && window.LongxiangI18n.seoLocales
            ? window.LongxiangI18n.seoLocales()
            : [{ code: 'en', hreflang: 'en' }, { code: 'ar', hreflang: 'ar' }];
        var defaultLocale = window.LongxiangI18n && window.LongxiangI18n.config
            ? window.LongxiangI18n.config.defaultLocale
            : 'en';
        var canonicalUrl = urls[locale] || urls[defaultLocale] || urls.en;
        var title = productSeoTitle(product, name);
        var description = productSeoDescription(product, desc);
        var image = absoluteImageUrl(product.image);

        if (title) document.title = title;
        upsertMeta('description', '', description);
        upsertMeta('', 'og:title', title);
        upsertMeta('', 'og:description', description);
        upsertMeta('', 'og:type', 'product');
        upsertMeta('', 'og:url', canonicalUrl);
        upsertMeta('', 'og:image', image);
        upsertHeadLink('canonical', { href: canonicalUrl });
        entries.forEach(function (entry) {
            if (urls[entry.code]) {
                upsertHeadLink('alternate', { hreflang: entry.hreflang, href: urls[entry.code] });
            }
        });
        if (urls[defaultLocale]) {
            upsertHeadLink('alternate', { hreflang: 'x-default', href: urls[defaultLocale] });
        }
        return canonicalUrl;
    }

    function productGroupKey(product) {
        return String(product.group || product.category || '').toLowerCase();
    }

    function inferApplicationItems(product) {
        var group = productGroupKey(product);
        if (/transformer/.test(group)) {
            return [
                { title: text('Power Distribution', 'توزيع الطاقة'), text: text('For factories, parks, utilities, and project power rooms.', 'مناسب للمصانع والمجمعات وغرف الطاقة في المشاريع.') },
                { title: text('Industrial Loads', 'الأحمال الصناعية'), text: text('Supports stable voltage conversion for continuous production loads.', 'يدعم تحويل الجهد بشكل مستقر للأحمال الصناعية المستمرة.') },
                { title: text('Project Delivery', 'تسليم المشاريع'), text: text('Suitable for packaged delivery with switchgear and site accessories.', 'مناسب للتسليم المتكامل مع المفاتيح الكهربائية وملحقات الموقع.') }
            ];
        }
        if (/switchgear/.test(group)) {
            return [
                { title: text('Distribution Rooms', 'غرف التوزيع'), text: text('For medium and low voltage distribution, protection, and control.', 'للتوزيع والحماية والتحكم في الجهد المتوسط والمنخفض.') },
                { title: text('Substations', 'المحطات الفرعية'), text: text('Works with transformers, cabinets, and project monitoring systems.', 'يتكامل مع المحولات والخزائن وأنظمة مراقبة المشروع.') },
                { title: text('Industrial Facilities', 'المنشآت الصناعية'), text: text('Helps isolate, protect, and manage critical power circuits.', 'يساعد على عزل وحماية وإدارة دوائر الطاقة المهمة.') }
            ];
        }
        if (/energy|charging|pv|new/.test(group)) {
            return [
                { title: text('PV Projects', 'مشاريع الطاقة الشمسية'), text: text('For photovoltaic access, grid connection, combiner, and distribution scenarios.', 'لمشاريع الطاقة الشمسية والربط بالشبكة والتجميع والتوزيع.') },
                { title: text('Charging Sites', 'مواقع الشحن'), text: text('Supports charging stations, commercial energy sites, and public facilities.', 'يدعم محطات الشحن والمواقع التجارية والمرافق العامة.') },
                { title: text('Energy Integration', 'تكامل الطاقة'), text: text('Can be matched with storage, cabinets, monitoring, and project delivery.', 'يمكن دمجه مع التخزين والخزائن والمراقبة وتسليم المشروع.') }
            ];
        }
        return [
            { title: text('Industrial Projects', 'المشاريع الصناعية'), text: text('For power equipment projects requiring stable operation and clear parameters.', 'لمشاريع معدات الطاقة التي تحتاج إلى تشغيل مستقر ومعايير واضحة.') },
            { title: text('Engineering Delivery', 'التسليم الهندسي'), text: text('Supports configuration review, packaging, delivery, and after-sales coordination.', 'يدعم مراجعة التكوين والتغليف والتسليم والتنسيق بعد البيع.') },
            { title: text('Export Supply', 'توريد للتصدير'), text: text('Prepared for overseas project communication and quotation confirmation.', 'مناسب للتواصل مع المشاريع الخارجية وتأكيد عروض الأسعار.') }
        ];
    }

    function renderDecisionSummary(product, name, categoryLabel) {
        var target = document.querySelector('[data-product-decision-summary]');
        if (!target) return;
        var voltage = firstValue(product.voltages) || findSpecValue(product, /voltage|kv|v/i);
        var capacity = firstValue(product.capacities) || findSpecValue(product, /capacity|power|rated/i);
        var items = [
            { label: text('Category', 'الفئة'), value: categoryLabel || text('Power Equipment', 'معدات الطاقة') },
            { label: text('Voltage', 'الجهد'), value: voltage || text('Project-specific', 'حسب المشروع') },
            { label: text('Capacity', 'السعة'), value: capacity || text('Confirm by requirement', 'تحدد حسب الطلب') }
        ];
        target.innerHTML = '<div class="product-decision-grid">' + items.map(function (item) {
            return '<div><span>' + escapeHtml(item.label) + '</span><strong' + rtlAttrs('rtl-product-text') + '>' + escapeHtml(item.value) + '</strong></div>';
        }).join('') + '</div>' +
            '<button type="button" class="btn btn-primary btn-sm" data-open-inquiry data-product-id="' + escapeHtml(product.id || '') + '" data-product-name="' + escapeHtml(name || '') + '">' +
            escapeHtml(text('Request Configuration Quote', 'طلب عرض تكوين')) +
            '</button>';
    }

    function renderApplications(product) {
        var target = document.querySelector('[data-product-applications]');
        if (!target) return;
        var items = inferApplicationItems(product);
        target.innerHTML = '<h2>' + escapeHtml(text('Application Scenarios', 'سيناريوهات الاستخدام')) + '</h2>' +
            '<div class="product-applications-grid">' + items.map(function (item) {
                return '<div><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.text) + '</span></div>';
            }).join('') + '</div>';
    }

    function renderSelection(product) {
        var target = document.querySelector('[data-product-selection]');
        if (!target) return;
        var voltage = firstValue(product.voltages) || findSpecValue(product, /voltage|kv|v/i);
        var capacity = firstValue(product.capacities) || findSpecValue(product, /capacity|power|rated/i);
        var standard = findSpecValue(product, /standard|iec|gb/i);
        var items = [
            text('Confirm the required voltage level, rated capacity, frequency, and installation environment.', 'تأكيد مستوى الجهد والسعة المقننة والتردد وبيئة التركيب.'),
            text('Share the destination country, quantity, project schedule, and whether drawings or technical documents are required.', 'تزويد بلد المشروع والكمية والجدول الزمني وما إذا كانت الرسومات أو المستندات الفنية مطلوبة.'),
            text('Use the inquiry form on this page so the sales and engineering team can reply with a matched configuration.', 'استخدم نموذج الاستفسار في هذه الصفحة ليرد فريق المبيعات والهندسة بتكوين مناسب.')
        ];
        if (voltage || capacity || standard) {
            items.unshift([
                voltage ? text('Voltage: ', 'الجهد: ') + voltage : '',
                capacity ? text('Capacity: ', 'السعة: ') + capacity : '',
                standard ? text('Standard: ', 'المعيار: ') + standard : ''
            ].filter(Boolean).join(' | '));
        }
        target.innerHTML = '<h2>' + escapeHtml(text('Selection & Delivery Notes', 'ملاحظات الاختيار والتسليم')) + '</h2>' +
            '<ul class="product-selection-list">' + items.map(function (item) {
                return '<li>' + escapeHtml(item) + '</li>';
            }).join('') + '</ul>';
    }

    function renderRelatedProducts(current, products) {
        var target = document.querySelector('[data-product-related]');
        if (!target) return;
        var currentId = String(current.id || '');
        var category = current.category || '';
        var group = current.group || '';
        var related = (products || [])
            .filter(function (product) {
                return product && String(product.id || '') !== currentId && (product.category === category || product.group === group);
            })
            .sort(function (a, b) {
                var aScore = a.category === category ? 0 : 1;
                var bScore = b.category === category ? 0 : 1;
                return aScore - bScore;
            })
            .slice(0, 3);
        if (!related.length) {
            target.innerHTML = '';
            target.hidden = true;
            return;
        }
        target.hidden = false;
        target.innerHTML = '<h2>' + escapeHtml(detailLabel('relatedTitle', 'Related Products')) + '</h2>' +
            '<div class="product-related-grid">' + related.map(function (product) {
                var name = localize(product, 'name');
                var desc = localize(product, 'shortDesc') || localize(product, 'description');
                var imagePath = normalizeImagePath(product.image);
                return '<article class="product-related-card">' +
                    '<a href="' + escapeHtml(detailHref(product)) + '">' +
                    '<div class="product-related-image">' + (imagePath ? '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(name) + '" loading="lazy" decoding="async" width="320" height="220">' : '') + '</div>' +
                    '<div class="product-related-body"><h3' + rtlAttrs('rtl-product-text') + '>' + escapeHtml(name) + '</h3>' +
                    '<p' + rtlAttrs('rtl-product-text') + '>' + escapeHtml(desc) + '</p></div>' +
                    '</a>' +
                    '</article>';
            }).join('') + '</div>';
    }

    function loadRelatedProducts(product) {
        fetch('/api/products')
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .then(function (products) {
                renderRelatedProducts(product, products);
            })
            .catch(function () {
                renderRelatedProducts(product, []);
            });
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

    function renderDescription(id, value) {
        var el = document.getElementById(id);
        if (!el) return;
        var lines = String(value || '').split(/\r?\n/).map(function (line) {
            return line.trim();
        });
        var html = [];
        var list = [];

        function flushList() {
            if (!list.length) return;
            html.push('<ul class="product-desc-list">' + list.map(function (item) {
                return '<li>' + escapeHtml(item) + '</li>';
            }).join('') + '</ul>');
            list = [];
        }

        lines.forEach(function (line) {
            if (!line) {
                flushList();
                return;
            }
            if (/^[-*]\s+/.test(line)) {
                list.push(line.replace(/^[-*]\s+/, ''));
                return;
            }
            flushList();
            if (/^[^:：]{2,80}[:：]$/.test(line)) {
                html.push('<strong class="product-desc-heading">' + escapeHtml(line.replace(/[:：]$/, '')) + '</strong>');
            } else {
                html.push('<p>' + escapeHtml(line) + '</p>');
            }
        });
        flushList();

        el.innerHTML = html.join('');
        applyArabicTextDirection(el, 'rtl');
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

    function injectProductSchema(product, name, desc, canonicalUrl) {
        var schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: name,
            description: desc,
            image: absoluteImageUrl(product.image),
            sku: product.id || product.slug || '',
            url: canonicalUrl,
            category: product.categoryLabel || product.category
        };
        var schemaSpecs = displaySpecRows(product);
        if (schemaSpecs.length) {
            schema.additionalProperty = schemaSpecs.slice(0, 12).map(function (spec) {
                return {
                    '@type': 'PropertyValue',
                    name: translatedSpecLabel(spec[0]),
                    value: spec[1]
                };
            });
        }
        var brandName = detailLabel('schemaBrand');
        if (brandName) {
            schema.brand = {
                '@type': 'Brand',
                name: brandName
            };
        }

        injectJsonLd('product', schema);
        injectJsonLd('product-breadcrumb', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: text('Products', 'المنتجات'),
                    item: window.location.origin + (window.LongxiangI18n && window.LongxiangI18n.localizedStaticPath
                        ? window.LongxiangI18n.localizedStaticPath('/products.html', locale)
                        : (isArabic ? '/ar/products.html' : '/products.html'))
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: name,
                    item: canonicalUrl
                }
            ]
        });
    }

    function renderProduct(product) {
        if (!product) {
            showNotFound();
            return;
        }

        var name = localize(product, 'name');
        var desc = localize(product, 'description') || localize(product, 'shortDesc');
        var categoryLabel = productCategoryLabel(product);
        var contextValue = productContextValue(product, name);

        var canonicalUrl = injectProductSeo(product, name, desc);
        setText('breadcrumb-product', name);
        setText('page-title', name);
        setText('page-subtitle', categoryLabel || detailLabel('defaultSubtitle'));

        var mainImage = document.getElementById('main-product-image');
        if (mainImage) {
            var imagePath = normalizeImagePath(product.image);
            mainImage.alt = name;
            mainImage.decoding = 'async';
            mainImage.loading = 'eager';
            if ('fetchPriority' in mainImage) mainImage.fetchPriority = 'high';
            if (imagePath) {
                mainImage.src = imagePath;
                mainImage.style.display = '';
            } else {
                mainImage.removeAttribute('src');
                mainImage.style.display = 'none';
            }
        }

        setText('product-title', name);
        renderDescription('product-desc', desc);
        renderDecisionSummary(product, name, categoryLabel);
        renderApplications(product);
        renderSelection(product);

        var specsBody = document.getElementById('specs-body');
        if (specsBody) {
            specsBody.innerHTML = '';
            displaySpecRows(product).forEach(function (spec) {
                var row = document.createElement('tr');
                row.innerHTML = '<td' + specLabelAttrs() + '>' + escapeHtml(translatedSpecLabel(spec[0])) + '</td><td' + specValueAttrs() + '>' + escapeHtml(translatedSpecValue(spec[1])) + '</td>';
                specsBody.appendChild(row);
            });
        }

        document.querySelectorAll('[data-product-context]').forEach(function (input) {
            input.value = contextValue;
        });

        document.querySelectorAll('[data-product-context-display]').forEach(function (input) {
            input.value = contextValue;
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

        injectProductSchema(product, name, desc, canonicalUrl);
        loadRelatedProducts(product);
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
        var productId = getQueryParam('id') || productIdentifierFromPath();
        if (!productId) {
            window.location.replace('products.html');
            return;
        }
        (window.longxiangContentPagePromise || Promise.resolve(null)).then(function (block) {
            productPageContent = block && block.body ? block.body : {};
            if (window.LongxiangI18n && window.LongxiangI18n.localizeContentTree) {
                productPageContent = window.LongxiangI18n.localizeContentTree(productPageContent, locale);
            }
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
