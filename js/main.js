(function () {
    'use strict';

    var LOCALE_CONFIG = {
        defaultLocale: 'en',
        supportedLocales: ['en', 'ar', 'fr'],
        locales: {
            en: {
                label: 'English',
                nativeLabel: 'English',
                htmlLang: 'en',
                hreflang: 'en',
                dir: 'ltr',
                pathPrefix: '',
                homePath: '/',
                fallbackLocale: null,
                includeInSitemap: true
            },
            ar: {
                label: 'Arabic',
                nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
                htmlLang: 'ar',
                hreflang: 'ar',
                dir: 'rtl',
                pathPrefix: '/ar',
                homePath: '/ar/index.html',
                fallbackLocale: 'en',
                includeInSitemap: true
            },
            fr: {
                label: 'French',
                nativeLabel: 'Fran\u00e7ais',
                htmlLang: 'fr',
                hreflang: 'fr',
                dir: 'ltr',
                pathPrefix: '/fr',
                homePath: '/fr/index.html',
                fallbackLocale: 'en',
                includeInSitemap: true
            }
        }
    };

    var STATIC_PAGE_BASE_PATHS = ['/', '/about.html', '/products.html', '/solutions.html', '/education.html', '/certifications.html', '/compare.html', '/contact.html'];
    var PLANNED_LOCALE_PATH_PREFIXES = ['/pt', '/ru'];

    function normalizePathPrefix(value) {
        var prefix = String(value || '').trim().replace(/\/+$/, '');
        if (!prefix || prefix === '/') return '';
        return prefix.charAt(0) === '/' ? prefix : '/' + prefix;
    }

    function normalizeBasePath(value) {
        var path = String(value || '/').trim().split('#')[0].split('?')[0];
        if (!path || path === '/' || path === '/index.html') return '/';
        path = '/' + path.replace(/^\/+/, '');
        if (/\/index\.html$/i.test(path)) return path.replace(/\/index\.html$/i, '/');
        return path;
    }

    function plannedLocalePathInfo(pathname) {
        var path = normalizeBasePath(pathname || window.location.pathname || '/');
        for (var i = 0; i < PLANNED_LOCALE_PATH_PREFIXES.length; i += 1) {
            var prefix = normalizePathPrefix(PLANNED_LOCALE_PATH_PREFIXES[i]);
            if (!prefix) continue;
            if (path === prefix || path === prefix + '/') {
                return {
                    pathPrefix: prefix,
                    basePath: '/'
                };
            }
            if (path.indexOf(prefix + '/') === 0) {
                return {
                    pathPrefix: prefix,
                    basePath: normalizeBasePath('/' + path.slice(prefix.length + 1))
                };
            }
        }
        return null;
    }

    function isPlannedLocalePath(pathname) {
        return Boolean(plannedLocalePathInfo(pathname));
    }

    function localeEntry(code) {
        code = normalizeLocale(code);
        var config = LOCALE_CONFIG.locales[code] || {};
        var prefix = normalizePathPrefix(config.pathPrefix);
        return {
            code: code,
            label: config.label || code,
            nativeLabel: config.nativeLabel || config.label || code,
            htmlLang: config.htmlLang || code,
            hreflang: config.hreflang || config.htmlLang || code,
            dir: config.dir || '',
            pathPrefix: prefix,
            homePath: config.homePath || (prefix ? prefix + '/index.html' : '/'),
            fallbackLocale: config.fallbackLocale || null,
            includeInSitemap: config.includeInSitemap !== false
        };
    }

    function localeEntries() {
        return LOCALE_CONFIG.supportedLocales.map(function (code) {
            return localeEntry(code);
        });
    }

    function nonDefaultLocaleEntriesByPrefix() {
        return localeEntries().filter(function (entry) {
            return entry.code !== LOCALE_CONFIG.defaultLocale && entry.pathPrefix;
        }).sort(function (a, b) {
            return b.pathPrefix.length - a.pathPrefix.length;
        });
    }

    function hasLocalizedValue(value) {
        if (value == null || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }

    function normalizeLocale(locale) {
        locale = String(locale || '').toLowerCase();
        return LOCALE_CONFIG.locales[locale] ? locale : LOCALE_CONFIG.defaultLocale;
    }

    function inferLocaleFromPath(pathname) {
        var path = String(pathname || window.location.pathname || '').replace(/\\/g, '/');
        path = '/' + path.replace(/^\/+/, '');
        var matches = nonDefaultLocaleEntriesByPrefix();
        for (var i = 0; i < matches.length; i += 1) {
            var prefix = matches[i].pathPrefix;
            if (path === prefix || path.indexOf(prefix + '/') === 0) return matches[i].code;
        }
        return LOCALE_CONFIG.defaultLocale;
    }

    function currentLocale() {
        return inferLocaleFromPath(window.location.pathname);
    }

    function currentLocaleEntry() {
        return localeEntry(currentLocale());
    }

    function isRtl(locale) {
        return localeEntry(locale || currentLocale()).dir === 'rtl';
    }

    function localizedStaticPath(basePath, locale) {
        var entry = localeEntry(locale);
        var normalized = normalizeBasePath(basePath);
        if (normalized === '/') return entry.homePath;
        return entry.pathPrefix + normalized;
    }

    function localizedProductPath(productId, locale) {
        var entry = localeEntry(locale);
        return entry.pathPrefix + '/products/' + encodeURIComponent(String(productId || '').trim());
    }

    function assetBasePrefix(locale) {
        var entry = localeEntry(locale || currentLocale());
        return entry.pathPrefix ? '../' : '';
    }

    function localizedAssetPath(path, locale) {
        path = String(path || '').trim().replace(/\\/g, '/');
        if (!path) return '';
        if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/' || /^data:/i.test(path) || /^blob:/i.test(path)) return path;
        return assetBasePrefix(locale) + path.replace(/^\/+/, '');
    }

    function baseStaticPathFromLocalizedPath(pathname) {
        var planned = plannedLocalePathInfo(pathname);
        if (planned) return planned.basePath;

        var path = normalizeBasePath(pathname || window.location.pathname || '/');
        var entry = localeEntry(inferLocaleFromPath(path));
        if (path === entry.homePath || path === entry.pathPrefix || path === entry.pathPrefix + '/') return '/';
        if (entry.pathPrefix && path.indexOf(entry.pathPrefix + '/') === 0) {
            return normalizeBasePath('/' + path.slice(entry.pathPrefix.length + 1));
        }
        return path;
    }

    function productIdentifierFromLocalizedPath(pathname) {
        var path = String(pathname || window.location.pathname || '').replace(/\\/g, '/');
        path = '/' + path.replace(/^\/+/, '');
        var entries = localeEntries().sort(function (a, b) {
            return b.pathPrefix.length - a.pathPrefix.length;
        });
        for (var i = 0; i < entries.length; i += 1) {
            var prefix = entries[i].pathPrefix + '/products/';
            if (path.indexOf(prefix) === 0) {
                return decodeURIComponent(path.slice(prefix.length).replace(/\/+$/, ''));
            }
        }
        return '';
    }

    function runtimePageExists(basePath, locale) {
        normalizeLocale(locale);
        return STATIC_PAGE_BASE_PATHS.indexOf(normalizeBasePath(basePath)) !== -1;
    }

    function seoLocales() {
        return localeEntries().filter(function (entry) {
            return entry.includeInSitemap;
        });
    }

    function localeFieldSuffix(locale) {
        locale = normalizeLocale(locale);
        return locale.charAt(0).toUpperCase() + locale.slice(1);
    }

    function localizedFieldValue(entity, field, locale) {
        if (!entity || !field) return '';
        var snakeField = camelToSnake(field);
        var candidates = [
            field + localeFieldSuffix(locale),
            snakeField + '_' + locale,
            field + '_' + locale
        ];
        for (var i = 0; i < candidates.length; i += 1) {
            if (hasLocalizedValue(entity[candidates[i]])) return entity[candidates[i]];
        }
        return '';
    }

    function localizedObjectValue(value, locale) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
        if (hasLocalizedValue(value[locale])) return value[locale];
        return '';
    }

    function localized(entity, field, locale) {
        if (!entity || !field) return '';
        locale = normalizeLocale(locale || currentLocale());

        var directValue = entity[field];
        var objectValue = localizedObjectValue(directValue, locale);
        if (hasLocalizedValue(objectValue)) return objectValue;

        var localeValue = localizedFieldValue(entity, field, locale);
        if (hasLocalizedValue(localeValue)) return localeValue;

        if (hasLocalizedValue(directValue) && (typeof directValue !== 'object' || Array.isArray(directValue))) {
            return directValue;
        }

        var fallbackLocale = LOCALE_CONFIG.locales[locale].fallbackLocale;
        if (fallbackLocale) {
            var fallbackObjectValue = localizedObjectValue(directValue, fallbackLocale);
            if (hasLocalizedValue(fallbackObjectValue)) return fallbackObjectValue;

            var fallbackValue = localizedFieldValue(entity, field, fallbackLocale);
            if (hasLocalizedValue(fallbackValue)) return fallbackValue;
        }

        return '';
    }

    window.LongxiangI18n = {
        config: LOCALE_CONFIG,
        normalizeLocale: normalizeLocale,
        localeEntry: localeEntry,
        localeEntries: localeEntries,
        currentLocale: currentLocale,
        currentLocaleEntry: currentLocaleEntry,
        inferLocaleFromPath: inferLocaleFromPath,
        isRtl: isRtl,
        localized: localized,
        localizedStaticPath: localizedStaticPath,
        localizedProductPath: localizedProductPath,
        assetBasePrefix: assetBasePrefix,
        localizedAssetPath: localizedAssetPath,
        baseStaticPathFromLocalizedPath: baseStaticPathFromLocalizedPath,
        plannedLocalePathInfo: plannedLocalePathInfo,
        isPlannedLocalePath: isPlannedLocalePath,
        productIdentifierFromLocalizedPath: productIdentifierFromLocalizedPath,
        runtimePageExists: runtimePageExists,
        seoLocales: seoLocales
    };

    var navbar = document.querySelector('.navbar');
    var hamburger = document.querySelector('.hamburger');
    var navLinks = document.querySelector('.nav-links');
    var mobileOverlay = document.querySelector('.mobile-menu-overlay');
    var locale = window.LongxiangI18n.currentLocale();
    var isArabic = locale === 'ar';
    var assetPrefix = window.LongxiangI18n.assetBasePrefix(locale);
    var companyCache = null;
    var globalShellCache = null;
    var consentDocumentClickBound = false;
    var ARABIC_CHAT_APP_NAME = '\u0648\u0627\u062a\u0633\u0627\u0628';
    var ARABIC_TEXT_FALLBACKS = {
        'Home': 'الرئيسية',
        'Products': 'المنتجات',
        'Applications': 'التطبيقات',
        'About Us': 'من نحن',
        'Contact': 'اتصل بنا',
        'Contact Us': 'اتصل بنا',
        'Certificates': 'الشهادات',
        'Quick Links': 'روابط سريعة',
        'All Products': 'جميع المنتجات',
        'Cookie Settings': 'إعدادات ملفات تعريف الارتباط',
        'Get a Quote': 'طلب عرض سعر',
        'Send us your requirements and our team will respond quickly.': 'أرسل متطلبات مشروعك وسيتواصل فريقنا معك بسرعة.',
        'Inquiry': 'استفسار',
        'Website visitor': 'زائر الموقع',
        'General inquiry': 'استفسار عام',
        'Tell us your voltage, capacity, quantity, and project location.': 'اذكر الجهد والسعة والكمية وموقع المشروع.',
        'Email': 'البريد الإلكتروني',
        ['Phone / ' + 'Whats' + 'App']: 'رقم الهاتف',
        'Submit': 'إرسال',
        'Request a Quote': 'طلب عرض سعر',
        'Fill in your contact details and project requirements.': 'املأ بيانات الاتصال ومتطلبات المشروع.',
        'Submit Inquiry': 'إرسال الاستفسار',
        'Name': 'الاسم',
        'Phone': 'رقم الهاتف',
        'Company': 'الشركة',
        'Message': 'الرسالة',
        'I would like to request a quotation for {product}.': 'أرغب في طلب عرض سعر لـ {product}.',
        'I would like to request a quotation for product ID {product}.': 'أرغب في طلب عرض سعر للمنتج رقم {product}.',
        'Henan Longxiang Electrical manufactures power equipment for industrial and energy projects.': 'تصنع شركة خنان لونغشيانغ إلكتريكال معدات الطاقة للمشروعات الصناعية ومشروعات الطاقة.',
        '© Henan Longxiang Electrical Co., Ltd. All rights reserved.': '© شركة خنان لونغشيانغ إلكتريكال المحدودة. جميع الحقوق محفوظة.'
    };

    function camelToSnake(value) {
        return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    }

    function arabicTextFallback(value) {
        if (!isArabic || typeof value !== 'string') return '';
        return ARABIC_TEXT_FALLBACKS[value.trim()] || '';
    }

    function localizedArabicValue(item, key) {
        if (!item || !isArabic) return '';
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, key, locale);
            if (value && value !== item[key]) return value;
        }
        if (item[key + 'Ar']) return item[key + 'Ar'];
        if (item[camelToSnake(key) + '_ar']) return item[camelToSnake(key) + '_ar'];
        if (item[key + '_ar']) return item[key + '_ar'];
        return arabicTextFallback(item[key]);
    }

    function localizeFallback(value) {
        return arabicTextFallback(value) || value || '';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function fetchJson(url) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            });
    }

    function trackEvent(name, params) {
        if (isConsentGranted('analytics') && typeof window.gtag === 'function') {
            window.gtag('event', name, params || {});
        }
    }

    var CONSENT_KEY = 'lx_cookie_consent_v1';
    var gaTrackingId = '';

    function defaultConsent() {
        return {
            necessary: true,
            analytics: false,
            functional: false,
            updatedAt: ''
        };
    }

    function readConsent() {
        try {
            var stored = localStorage.getItem(CONSENT_KEY);
            if (!stored) return defaultConsent();
            var parsed = JSON.parse(stored);
            return {
                necessary: true,
                analytics: parsed.analytics === true,
                functional: parsed.functional === true,
                updatedAt: parsed.updatedAt || ''
            };
        } catch (err) {
            return defaultConsent();
        }
    }

    function hasStoredConsent() {
        try {
            return !!localStorage.getItem(CONSENT_KEY);
        } catch (err) {
            return false;
        }
    }

    function saveConsent(next) {
        var consent = Object.assign(defaultConsent(), next || {}, {
            necessary: true,
            updatedAt: new Date().toISOString()
        });
        localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
        updateGoogleConsent(consent);
        loadGaIfAllowed();
        applyFunctionalEmbeds();
        updateConsentUi(consent);
        window.dispatchEvent(new CustomEvent('lx:cookie-consent-change', { detail: consent }));
        return consent;
    }

    function isConsentGranted(category) {
        return readConsent()[category] === true;
    }

    function initGoogleConsentMode() {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        if (window.__lxConsentDefaultSet) return;
        window.__lxConsentDefaultSet = true;
        window.gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        updateGoogleConsent(readConsent());
    }

    function updateGoogleConsent(consent) {
        if (typeof window.gtag !== 'function') return;
        window.gtag('consent', 'update', {
            analytics_storage: consent.analytics ? 'granted' : 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
    }

    function loadGaIfAllowed() {
        if (gaTrackingId && isConsentGranted('analytics')) injectGa(gaTrackingId);
    }

    function setFunctionalEmbed(el, src) {
        if (!el || !src) return;
        el.setAttribute('data-consent-category', 'functional');
        el.setAttribute('data-consent-src', src);
        if (isConsentGranted('functional')) {
            el.src = src;
            el.hidden = false;
        } else {
            el.removeAttribute('src');
            el.hidden = true;
        }
        ensureEmbedPlaceholder(el);
    }

    function applyFunctionalEmbeds() {
        document.querySelectorAll('[data-consent-category="functional"][data-consent-src]').forEach(function (el) {
            var src = el.getAttribute('data-consent-src');
            ensureEmbedPlaceholder(el);
            var placeholder = getEmbedPlaceholder(el);
            if (isConsentGranted('functional')) {
                if (src && el.getAttribute('src') !== src) el.setAttribute('src', src);
                el.hidden = false;
                if (placeholder) placeholder.hidden = true;
            } else {
                el.removeAttribute('src');
                el.hidden = true;
                if (placeholder) placeholder.hidden = false;
            }
        });
    }

    window.applyFunctionalEmbeds = applyFunctionalEmbeds;

    function getEmbedPlaceholder(el) {
        var parent = el && el.parentElement;
        return parent ? parent.querySelector(':scope > .consent-embed-placeholder') : null;
    }

    function localizedSectionValue(sectionName, key, fallback) {
        var section = shellSection(sectionName);
        var arabicValue = localizedArabicValue(section, key);
        if (arabicValue) return arabicValue;
        if (section[key]) return localizeFallback(section[key]);
        return localizeFallback(fallback);
    }

    function embedConsentText() {
        var fallback = isArabic ? {
            title: 'يتطلب هذا المحتوى موافقة وظيفية',
            intro: 'يتم حظر الخرائط والفيديو من أطراف خارجية حتى تسمح بملفات تعريف الارتباط الوظيفية.',
            allow: 'السماح بملفات تعريف الارتباط الوظيفية'
        } : {
            title: 'Functional consent required',
            intro: 'Maps and videos from third parties are blocked until you allow functional cookies.',
            allow: 'Allow functional cookies'
        };
        return {
            title: localizedSectionValue('embedConsent', 'title', fallback.title),
            intro: localizedSectionValue('embedConsent', 'intro', fallback.intro),
            allow: localizedSectionValue('embedConsent', 'allow', fallback.allow)
        };
    }

    function renderEmbedPlaceholder(placeholder) {
        var text = embedConsentText();
        placeholder.innerHTML =
            '<div>' +
                '<strong>' + escapeHtml(text.title) + '</strong>' +
                '<p>' + escapeHtml(text.intro) + '</p>' +
                '<button type="button" data-allow-functional>' + escapeHtml(text.allow) + '</button>' +
            '</div>';
        placeholder.querySelector('[data-allow-functional]').addEventListener('click', function () {
            saveConsent(Object.assign(readConsent(), { functional: true }));
        });
    }

    function ensureEmbedPlaceholder(el) {
        if (!el || !el.parentElement) return;
        var placeholder = getEmbedPlaceholder(el);
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'consent-embed-placeholder';
            el.parentElement.appendChild(placeholder);
        }
        renderEmbedPlaceholder(placeholder);
    }

    function consentText() {
        var fallback = isArabic ? {
            title: 'إعدادات ملفات تعريف الارتباط',
            intro: 'نستخدم التخزين الضروري لتشغيل الموقع. لا يتم تحميل التحليلات أو الخرائط أو الفيديو إلا بعد موافقتك.',
            necessary: 'ضروري',
            necessaryDesc: 'مطلوب للغة والأمان ووظائف الموقع الأساسية.',
            analytics: 'التحليلات',
            analyticsDesc: 'يساعدنا Google Analytics على فهم استخدام الموقع.',
            functional: 'وظيفي',
            functionalDesc: 'يسمح بتحميل فيديوهات YouTube وخرائط Google.',
            accept: 'قبول الكل',
            reject: 'رفض الكل',
            customize: 'تخصيص',
            save: 'حفظ الإعدادات',
            close: 'إغلاق'
        } : {
            title: 'Cookie settings',
            intro: 'We use necessary storage to run the site. Analytics, maps, and video are not loaded unless you opt in.',
            necessary: 'Necessary',
            necessaryDesc: 'Required for language, security, and core site functions.',
            analytics: 'Analytics',
            analyticsDesc: 'Helps us understand site usage with Google Analytics.',
            functional: 'Functional',
            functionalDesc: 'Allows YouTube videos and Google Maps embeds to load.',
            accept: 'Accept all',
            reject: 'Reject all',
            customize: 'Customize',
            save: 'Save settings',
            close: 'Close'
        };
        var text = {};
        Object.keys(fallback).forEach(function (key) {
            text[key] = localizedSectionValue('cookieConsent', key, fallback[key]);
        });
        return text;
    }

    function consentToggle(name, label, desc, checked, disabled) {
        return '<label class="cookie-consent-toggle">' +
            '<span><strong>' + escapeHtml(label) + '</strong><small>' + escapeHtml(desc) + '</small></span>' +
            '<input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
            '</label>';
    }

    function renderConsentUi(root) {
        var text = consentText();
        root.innerHTML =
            '<section class="cookie-consent-banner" role="region" aria-label="' + escapeHtml(text.title) + '" hidden>' +
                '<div><h2>' + escapeHtml(text.title) + '</h2><p>' + escapeHtml(text.intro) + '</p></div>' +
                '<div class="cookie-consent-actions">' +
                    '<button type="button" data-consent-accept>' + escapeHtml(text.accept) + '</button>' +
                    '<button type="button" data-consent-reject>' + escapeHtml(text.reject) + '</button>' +
                    '<button type="button" data-consent-customize>' + escapeHtml(text.customize) + '</button>' +
                '</div>' +
            '</section>' +
            '<div class="cookie-consent-modal" hidden>' +
                '<div class="cookie-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">' +
                    '<div class="cookie-consent-dialog-header"><h2 id="cookie-consent-title">' + escapeHtml(text.title) + '</h2><button type="button" data-consent-close aria-label="' + escapeHtml(text.close) + '">&times;</button></div>' +
                    '<p>' + escapeHtml(text.intro) + '</p>' +
                    '<form data-consent-form>' +
                        consentToggle('necessary', text.necessary, text.necessaryDesc, true, true) +
                        consentToggle('analytics', text.analytics, text.analyticsDesc, false, false) +
                        consentToggle('functional', text.functional, text.functionalDesc, false, false) +
                        '<div class="cookie-consent-actions"><button type="submit">' + escapeHtml(text.save) + '</button><button type="button" data-consent-reject>' + escapeHtml(text.reject) + '</button><button type="button" data-consent-accept>' + escapeHtml(text.accept) + '</button></div>' +
                    '</form>' +
                '</div>' +
            '</div>';
    }

    function ensureConsentUi() {
        var root = document.getElementById('cookie-consent-root');
        var modal = root && root.querySelector('.cookie-consent-modal');
        var modalWasOpen = modal && !modal.hidden;
        if (!root) {
            root = document.createElement('div');
            root.id = 'cookie-consent-root';
            document.body.appendChild(root);

            root.addEventListener('click', function (event) {
                if (event.target.closest('[data-consent-accept]')) saveConsent({ analytics: true, functional: true });
                if (event.target.closest('[data-consent-reject]')) saveConsent({ analytics: false, functional: false });
                if (event.target.closest('[data-consent-customize]')) openConsentSettings();
                if (event.target.closest('[data-consent-close]')) closeConsentSettings();
            });
            root.addEventListener('submit', function (event) {
                if (!event.target.closest('[data-consent-form]')) return;
                event.preventDefault();
                saveConsent({
                    analytics: event.target.elements.analytics.checked,
                    functional: event.target.elements.functional.checked
                });
            });
        }

        renderConsentUi(root);
        if (!consentDocumentClickBound) {
            consentDocumentClickBound = true;
            document.addEventListener('click', function (event) {
                var trigger = event.target.closest('[data-cookie-settings]');
                if (!trigger) return;
                event.preventDefault();
                openConsentSettings();
            });
        }
        updateConsentUi(readConsent(), { keepModalOpen: modalWasOpen });
    }

    function updateConsentUi(consent, options) {
        var root = document.getElementById('cookie-consent-root');
        if (!root) return;
        var banner = root.querySelector('.cookie-consent-banner');
        var modal = root.querySelector('.cookie-consent-modal');
        var form = root.querySelector('[data-consent-form]');
        if (form) {
            form.elements.analytics.checked = consent.analytics === true;
            form.elements.functional.checked = consent.functional === true;
        }
        if (banner) banner.hidden = hasStoredConsent();
        if (modal && !(options && options.keepModalOpen)) modal.hidden = true;
        if (modal && options && options.keepModalOpen) modal.hidden = false;
    }

    function openConsentSettings() {
        ensureConsentUi();
        updateConsentUi(readConsent());
        var modal = document.querySelector('.cookie-consent-modal');
        if (modal) modal.hidden = false;
    }

    function closeConsentSettings() {
        var modal = document.querySelector('.cookie-consent-modal');
        if (modal) modal.hidden = true;
    }

    function initCookieConsent(shellPromise) {
        var showConsentUi = function () {
            ensureConsentUi();
            applyFunctionalEmbeds();
        };
        initGoogleConsentMode();
        applyFunctionalEmbeds();
        if (shellPromise && typeof shellPromise.then === 'function') {
            shellPromise.then(showConsentUi, showConsentUi);
            window.setTimeout(function () {
                if (!document.getElementById('cookie-consent-root')) showConsentUi();
            }, 1200);
        } else {
            showConsentUi();
        }
    }

    function currentPageName() {
        var productId = window.LongxiangI18n.productIdentifierFromLocalizedPath(window.location.pathname);
        if (productId) return 'product-detail.html';
        var basePath = window.LongxiangI18n.baseStaticPathFromLocalizedPath(window.location.pathname);
        if (basePath === '/') return 'index.html';
        return basePath.split('/').pop() || 'index.html';
    }

    function pageNameToBasePath(pageName) {
        pageName = pageName || 'index.html';
        return pageName === 'index.html' ? '/' : '/' + pageName.replace(/^\/+/, '');
    }

    function supportsLocalizedPage(pageName, localeCode) {
        if (pageName === 'product-detail.html') return true;
        return window.LongxiangI18n.runtimePageExists(pageNameToBasePath(pageName), localeCode);
    }

    function languageUrl(lang) {
        var targetLocale = window.LongxiangI18n.normalizeLocale(lang);
        var productId = window.LongxiangI18n.productIdentifierFromLocalizedPath(window.location.pathname);
        if (productId) {
            return window.LongxiangI18n.localizedProductPath(productId, targetLocale) + window.location.search + window.location.hash;
        }

        var basePath = window.LongxiangI18n.baseStaticPathFromLocalizedPath(window.location.pathname);
        if (!window.LongxiangI18n.runtimePageExists(basePath, targetLocale)) {
            return window.LongxiangI18n.localeEntry(targetLocale).homePath + window.location.search + window.location.hash;
        }
        return window.LongxiangI18n.localizedStaticPath(basePath, targetLocale) + window.location.search + window.location.hash;
    }

    function pageHref(page, hash) {
        var value = String(page || 'index.html');
        var hashIndex = value.indexOf('#');
        var embeddedHash = '';
        if (hashIndex !== -1) {
            embeddedHash = value.slice(hashIndex);
            value = value.slice(0, hashIndex);
        }
        var queryIndex = value.indexOf('?');
        var query = '';
        if (queryIndex !== -1) {
            query = value.slice(queryIndex);
            value = value.slice(0, queryIndex);
        }
        var basePath = pageNameToBasePath(value || 'index.html');
        return window.LongxiangI18n.localizedStaticPath(basePath, locale) + query + (hash || embeddedHash || '');
    }

    function navLink(page, label, extraClass, hash) {
        return '<a href="' + pageHref(page, hash) + '"' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + escapeHtml(label) + '</a>';
    }

    function navItem(page, label, dropdown, activePages) {
        var current = currentPageName();
        var isActive = (activePages || [page]).indexOf(current) !== -1;
        var html = '<div class="nav-item' + (dropdown && dropdown.length ? ' has-dropdown' : '') + '">' +
            navLink(page, label, isActive ? 'active' : '');
        if (dropdown && dropdown.length) {
            html += '<div class="nav-dropdown">';
            dropdown.forEach(function (item) {
                html += navLink(item.page, item.label, '', item.hash || '');
            });
            html += '</div>';
        }
        return html + '</div>';
    }

    function initUnifiedNavigation() {
        if (!document.querySelector('.site-top-strip')) {
            var strip = document.createElement('div');
            strip.className = 'site-top-strip';
            document.body.insertBefore(strip, document.body.firstChild);
        }

        updateMainNavigation();
    }

    function applyLanguagePreference() {
        if (new URLSearchParams(window.location.search).has('visualPreview')) return false;
        var pageName = currentPageName();

        var stored = localStorage.getItem('site_lang');
        var preferred = stored || (/^ar/i.test(navigator.language || '') ? 'ar' : '');
        if (!preferred) return false;
        preferred = window.LongxiangI18n.normalizeLocale(preferred);
        if (!supportsLocalizedPage(pageName, preferred)) return false;

        if (preferred !== locale) {
            window.location.replace(languageUrl(preferred));
            return true;
        }
        return false;
    }

    function initLanguageSwitcher() {
        var navContainer = document.querySelector('.navbar .container');
        if (!navContainer || document.querySelector('.language-switcher')) return;

        var switcher = document.createElement('label');
        switcher.className = 'language-switcher';
        switcher.setAttribute('aria-label', isArabic ? 'اختيار اللغة' : 'Choose language');

        var select = document.createElement('select');
        select.innerHTML = window.LongxiangI18n.localeEntries().filter(function (entry) {
            return supportsLocalizedPage(currentPageName(), entry.code);
        }).map(function (entry) {
            return '<option value="' + escapeHtml(entry.code) + '">' + escapeHtml(entry.nativeLabel) + '</option>';
        }).join('');
        select.value = locale;
        select.addEventListener('change', function () {
            localStorage.setItem('site_lang', select.value);
            window.location.href = languageUrl(select.value);
        });

        switcher.appendChild(select);
        navContainer.insertBefore(switcher, document.querySelector('.hamburger'));
    }

    function initNavbar() {
        if (!navbar) return;

        window.addEventListener('scroll', function () {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, { passive: true });

        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        }
    }

    function initMobileMenu() {
        if (!hamburger || !navLinks) return;

        function closeMobileMenu() {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
            navLinks.querySelectorAll('.nav-item.has-dropdown.is-open').forEach(function (openItem) {
                openItem.classList.remove('is-open');
                var openLink = openItem.querySelector(':scope > a');
                if (openLink) openLink.setAttribute('aria-expanded', 'false');
            });
            document.body.classList.remove('mobile-menu-open');
            document.body.style.overflow = '';
        }

        hamburger.addEventListener('click', function () {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (mobileOverlay) mobileOverlay.classList.toggle('active');
            var isOpen = navLinks.classList.contains('active');
            if (!isOpen) {
                closeMobileMenu();
                return;
            }
            document.body.classList.toggle('mobile-menu-open', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        navLinks.addEventListener('click', function (event) {
            var link = event.target.closest('a');
            if (!link || !navLinks.contains(link)) return;
            var parentDropdown = link.parentElement && link.parentElement.classList.contains('has-dropdown');

            if (window.matchMedia('(max-width: 768px)').matches && parentDropdown) {
                event.preventDefault();
                var item = link.closest('.nav-item');
                var willOpen = item && !item.classList.contains('is-open');

                navLinks.querySelectorAll('.nav-item.has-dropdown.is-open').forEach(function (openItem) {
                    if (openItem !== item) {
                        openItem.classList.remove('is-open');
                        var openLink = openItem.querySelector(':scope > a');
                        if (openLink) openLink.setAttribute('aria-expanded', 'false');
                    }
                });

                if (item) item.classList.toggle('is-open', willOpen);
                link.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                return;
            }

            closeMobileMenu();
        });

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', function () {
                closeMobileMenu();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    }

    function initScrollAnimations() {
        var fadeElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale');
        if (!fadeElements.length) return;

        if (!('IntersectionObserver' in window)) {
            fadeElements.forEach(function (el) { el.classList.add('visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var delay = entry.target.getAttribute('data-delay');
                    if (delay) {
                        setTimeout(function () {
                            entry.target.classList.add('visible');
                        }, parseInt(delay, 10));
                    } else {
                        entry.target.classList.add('visible');
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });

        fadeElements.forEach(function (el) { observer.observe(el); });
    }

    window.initScrollAnimations = initScrollAnimations;

    function initProductFilter() {
        var filterBtns = document.querySelectorAll('.filter-btn');
        var productCards = document.querySelectorAll('.product-card');
        var productsGrid = document.querySelector('.products-grid');
        if (!filterBtns.length || !productCards.length) return;

        filterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var category = btn.getAttribute('data-filter');
                filterBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                if (productsGrid) productsGrid.classList.add('filtered');

                productCards.forEach(function (card) {
                    var cardCategory = card.getAttribute('data-category');
                    card.classList.remove('show');
                    if (category === 'all' || cardCategory === category) {
                        card.style.display = '';
                        requestAnimationFrame(function () {
                            requestAnimationFrame(function () { card.classList.add('show'); });
                        });
                    } else {
                        card.style.display = 'none';
                    }
                });

                setTimeout(function () {
                    if (productsGrid) productsGrid.classList.remove('filtered');
                }, 500);
            });
        });

        productCards.forEach(function (card) { card.classList.add('show'); });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                var targetId = link.getAttribute('href');
                if (targetId === '#' || targetId === '#0') return;
                var target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();
                var navbarHeight = navbar ? navbar.offsetHeight : 0;
                var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            });
        });
    }

    function initActiveNavLink() {
        var currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(function (link) {
            var href = link.getAttribute('href');
            if (!href) return;
            var linkPage = href.split('?')[0].split('/').pop();
            link.classList.remove('active');
            if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    function initStaggeredAnimations() {
        document.querySelectorAll('[data-stagger]').forEach(function (group) {
            var baseDelay = parseInt(group.getAttribute('data-stagger') || '100', 10);
            Array.from(group.children).forEach(function (child, index) {
                child.style.transitionDelay = (index * baseDelay) + 'ms';
            });
        });
    }

    function initStatCounters() {
        var statNumbers = document.querySelectorAll('.stat-number');
        if (!statNumbers.length || !('IntersectionObserver' in window)) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(function (el) { observer.observe(el); });
    }

    window.initStatCounters = initStatCounters;

    function animateCounter(element) {
        var target = parseInt(element.getAttribute('data-count'), 10);
        if (isNaN(target)) return;

        var duration = 2000;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var easedProgress = 1 - Math.pow(1 - progress, 4);
            element.textContent = Math.floor(easedProgress * target);
            if (progress < 1) requestAnimationFrame(step);
            else element.textContent = target;
        }

        requestAnimationFrame(step);
    }

    function initParallax() {
        var heroBg = document.querySelector('.hero-bg');
        if (!heroBg) return;
        window.addEventListener('scroll', function () {
            var scrolled = window.pageYOffset;
            if (scrolled < window.innerHeight) {
                heroBg.style.transform = 'translateY(' + (scrolled * 0.3) + 'px) scale(1.05)';
            }
        }, { passive: true });
    }

    function initBackToTop() {
        var backToTop = document.querySelector('.back-to-top');
        if (!backToTop) return;

        window.addEventListener('scroll', function () {
            if (window.scrollY > 600) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        }, { passive: true });

        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function injectFavicons() {
        var icons = [
            { rel: 'icon', type: 'image/png', sizes: '32x32', href: assetPrefix + 'favicon-32x32.png?v=20260615-lxdq' },
            { rel: 'icon', type: 'image/png', sizes: '16x16', href: assetPrefix + 'favicon-16x16.png?v=20260615-lxdq' },
            { rel: 'apple-touch-icon', sizes: '180x180', href: assetPrefix + 'apple-touch-icon.png?v=20260615-lxdq' }
        ];

        icons.forEach(function (icon) {
            if (document.querySelector('link[href="' + icon.href + '"]')) return;
            var link = document.createElement('link');
            Object.keys(icon).forEach(function (key) { link.setAttribute(key, icon[key]); });
            document.head.appendChild(link);
        });
    }

    function injectMeta(name, property, content) {
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

    function absoluteAssetUrl(path) {
        path = resolveAssetPath(path || '');
        if (!path) return '';
        if (/^(https?:)?\/\//.test(path)) return path;
        path = path.replace(/^\.\.\//, '').replace(/^\/+/, '');
        return window.location.origin + '/' + encodeURI(path);
    }

    function seoDefaultImage(company) {
        var defaults = shellSection('seoDefaults');
        return absoluteAssetUrl(defaults.image || defaults.ogImage || company.ogImage || company.seoImage || company.logo || '');
    }

    function initSeoMeta(company) {
        var title = document.title || company.name;
        var descriptionMeta = document.querySelector('meta[name="description"]');
        var description = descriptionMeta ? descriptionMeta.getAttribute('content') : company.description;
        var url = window.location.href.split('#')[0];
        injectMeta('', 'og:title', title);
        injectMeta('', 'og:description', description);
        injectMeta('', 'og:type', 'website');
        injectMeta('', 'og:url', url);
        injectAlternateSeoLinks(url);
        injectMeta('', 'og:image', seoDefaultImage(company));

        var path = window.location.pathname;
        var schema = null;
        if (/contact\.html$/.test(path)) {
            schema = {
                '@context': 'https://schema.org',
                '@type': 'LocalBusiness',
                name: company.name,
                email: company.email,
                telephone: company.phone,
                address: company.address,
                url: window.location.origin + '/'
            };
        } else if (/\/$|index\.html$/.test(path)) {
            schema = {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: company.name,
                alternateName: company.nameCN,
                email: company.email,
                telephone: company.phone,
                address: company.address,
                url: window.location.origin + '/'
            };
        }

        if (schema && !document.querySelector('script[data-schema-auto="site"]')) {
            var script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-schema-auto', 'site');
            script.textContent = JSON.stringify(schema);
            document.head.appendChild(script);
        }
    }

    function upsertLink(rel, attrs) {
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

    function injectAlternateSeoLinks(currentUrl) {
        var origin = window.location.origin;
        var search = window.location.search || '';
        var plannedPath = window.LongxiangI18n.plannedLocalePathInfo(window.location.pathname);
        var productId = window.LongxiangI18n.productIdentifierFromLocalizedPath(window.location.pathname);
        var basePath = window.LongxiangI18n.baseStaticPathFromLocalizedPath(window.location.pathname);
        var defaultLocale = window.LongxiangI18n.config.defaultLocale;
        var defaultPath = productId
            ? window.LongxiangI18n.localizedProductPath(productId, defaultLocale)
            : window.LongxiangI18n.localizedStaticPath(basePath, defaultLocale);
        var canonicalUrl = plannedPath ? origin + defaultPath + search : currentUrl;

        upsertLink('canonical', { href: canonicalUrl });
        window.LongxiangI18n.seoLocales().forEach(function (entry) {
            var localizedPath = productId
                ? window.LongxiangI18n.localizedProductPath(productId, entry.code)
                : window.LongxiangI18n.localizedStaticPath(basePath, entry.code);
            upsertLink('alternate', { hreflang: entry.hreflang, href: origin + localizedPath + search });
        });
        upsertLink('alternate', { hreflang: 'x-default', href: origin + defaultPath + search });
    }

    function injectGa(trackingId) {
        gaTrackingId = trackingId || gaTrackingId;
        if (!trackingId || !isConsentGranted('analytics') || document.querySelector('script[data-ga4-script]')) return;
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(trackingId);
        script.setAttribute('data-ga4-script', trackingId);
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        updateGoogleConsent(readConsent());
        window.gtag('js', new Date());
        window.gtag('config', trackingId);
    }

    function setCompanyText(selector, value) {
        if (!value) return;
        document.querySelectorAll(selector).forEach(function (el) {
            el.textContent = value;
        });
    }

    function setCompanyHref(selector, href) {
        if (!href) return;
        document.querySelectorAll(selector).forEach(function (el) {
            el.setAttribute('href', href);
        });
    }

    function companyValue(company, key) {
        if (!company) return '';
        var arabicValue = localizedArabicValue(company, key);
        if (arabicValue) return arabicValue;
        return company[key] || '';
    }

    function updateCompanyDom(company) {
        Object.keys(company).forEach(function (key) {
            setCompanyText('[data-company-field="' + key + '"]', companyValue(company, key));
        });

        setCompanyText('.footer-brand p', shellValue('footer', 'text', companyValue(company, 'footerText')));
        setCompanyText('[data-company-contact="email"] .footer-contact-value', company.email);
        setCompanyText('[data-company-contact="address"] .footer-contact-value', companyValue(company, 'address'));
        setCompanyHref('[data-company-email-link]', 'mailto:' + company.email);
        setCompanyHref('[data-company-phone-link]', 'tel:' + company.phone);
        setCompanyHref('[data-company-instagram-link]', company.instagram);
        setCompanyHref('[data-company-youtube-link]', company.youtube);
        document.querySelectorAll('[data-company-google-map-frame]').forEach(function (el) {
            var embedUrl = company.googleMyMapsEmbedUrl || company.googleMapsEmbedUrl;
            if (embedUrl) {
                setFunctionalEmbed(el, embedUrl);
            } else {
                el.removeAttribute('src');
                el.hidden = true;
            }
        });
        document.querySelectorAll('[data-company-google-map]').forEach(function (el) {
            if (company.googleMapsUrl) {
                el.href = company.googleMapsUrl;
                el.hidden = false;
            } else {
                el.hidden = true;
            }
        });
        document.querySelectorAll('[data-company-osm-map]').forEach(function (el) {
            if (company.openStreetMapUrl) {
                el.href = company.openStreetMapUrl;
                el.hidden = false;
            } else {
                el.hidden = true;
            }
        });

        document.querySelectorAll('[data-company-map-qr]').forEach(function (el) {
            if (company.mapQr) {
                el.innerHTML = '<img src="' + escapeHtml(resolveAssetPath(company.mapQr)) + '" alt="Map QR code"><span>' + (isArabic ? 'رمز موقع الشركة' : 'Company location QR') + '</span>';
                el.hidden = false;
            } else {
                el.hidden = true;
            }
        });
    }

    function initContactMapTabs(company) {
        var locations = company.mapLocations || {};
        var frame = document.querySelector('[data-company-google-map-frame]');
        var tabs = Array.from(document.querySelectorAll('[data-contact-map-target]'));
        var panel = frame && frame.closest('.contact-location-panel');
        var mapCompany = document.querySelector('[data-contact-map-company]');
        var mapAddress = document.querySelector('[data-contact-map-address]');
        var mapOpen = document.querySelector('[data-contact-map-open]');
        if (!frame || !tabs.length) return;

        function syncMapInfo(location) {
            if (!location) return;
            if (mapCompany && location.name) mapCompany.textContent = companyValue(location, 'name');
            if (mapAddress) mapAddress.textContent = companyValue(location, 'displayAddress') || companyValue(location, 'address') || '';
            if (mapOpen) mapOpen.href = location.googleMapsUrl || location.directionsUrl || '#';
        }

        tabs.forEach(function (tab) {
            var key = tab.getAttribute('data-contact-map-target');
            var location = locations[key];
            if (location) {
                var title = tab.querySelector('strong');
                var address = tab.querySelector('span');
                var directions = tab.querySelector('[data-contact-map-directions]');
                if (title && location.mapLabel) title.textContent = companyValue(location, 'mapLabel');
                if (address && location.mapSubLabel) address.textContent = companyValue(location, 'mapSubLabel');
                if (directions && location.directionsUrl) directions.href = location.directionsUrl;
            }

            var switchControl = tab.querySelector('.contact-map-tab-main') || tab;
            switchControl.addEventListener('click', function () {
                var next = locations[key];
                if (!next) return;
                var nextEmbedUrl = next.mapEmbedUrl || next.googleMapsEmbedUrl;
                if (nextEmbedUrl) setFunctionalEmbed(frame, nextEmbedUrl);
                if (panel) panel.setAttribute('data-map-location', key);
                syncMapInfo(next);
                tabs.forEach(function (item) { item.classList.toggle('active', item === tab); });
            });
        });

        var active = tabs.find(function (tab) { return tab.classList.contains('active'); }) || tabs[0];
        var activeKey = active.getAttribute('data-contact-map-target');
        var activeLocation = locations[activeKey];
        if (panel) panel.setAttribute('data-map-location', activeKey);
        var activeEmbedUrl = activeLocation && (activeLocation.mapEmbedUrl || activeLocation.googleMapsEmbedUrl);
        if (activeEmbedUrl) setFunctionalEmbed(frame, activeEmbedUrl);
        syncMapInfo(activeLocation);
    }

    function shellSection(name) {
        return globalShellCache && globalShellCache[name] ? globalShellCache[name] : {};
    }

    function shellValue(sectionName, key, fallback) {
        var section = shellSection(sectionName);
        var arabicValue = localizedArabicValue(section, key);
        if (arabicValue) return arabicValue;
        return localizeFallback(section[key] || fallback);
    }

    function shellLabel(item, fallback) {
        if (!item) return localizeFallback(fallback);
        var arabicValue = localizedArabicValue(item, 'label');
        if (arabicValue) return arabicValue;
        return localizeFallback(item.label || fallback);
    }

    function renderShellLinks(items, fallbackItems) {
        var links = Array.isArray(items) && items.length ? items : (fallbackItems || []);
        return links.map(function (item) {
            return navLink(item.href || 'index.html', shellLabel(item), '', item.search || '');
        }).join('');
    }

    function shellLinkPage(item) {
        var href = String((item && item.href) || 'index.html').split('#')[0].split('?')[0];
        return href.split('/').pop() || 'index.html';
    }

    function isActiveShellNavItem(item) {
        var current = currentPageName();
        var activePages = Array.isArray(item.activePages) ? item.activePages : [shellLinkPage(item)];
        if (activePages.indexOf(current) !== -1) return true;
        return Array.isArray(item.children) && item.children.some(function (child) {
            return isActiveShellNavItem(child);
        });
    }

    function renderMainNavItem(item) {
        var label = shellLabel(item);
        if (!label) return '';
        var children = Array.isArray(item.children) ? item.children : [];
        var hasDropdown = children.length > 0;
        var activeClass = isActiveShellNavItem(item) ? 'active' : '';
        var html = '<div class="nav-item' + (hasDropdown ? ' has-dropdown' : '') + '">' +
            navLink(item.href || 'index.html', label, activeClass, item.search || item.hash || '');
        if (hasDropdown) {
            html += '<div class="nav-dropdown">' + children.map(function (child) {
                return navLink(child.href || 'index.html', shellLabel(child), '', child.search || child.hash || '');
            }).join('') + '</div>';
        }
        return html + '</div>';
    }

    function updateMainNavigation() {
        var links = document.querySelector('.navbar .nav-links');
        if (!links) return;
        var mainLinks = shellSection('navigation').mainLinks;
        links.innerHTML = Array.isArray(mainLinks) ? mainLinks.map(renderMainNavItem).join('') : '';
        links.querySelectorAll('.nav-item.has-dropdown > a').forEach(function (link) {
            link.setAttribute('aria-expanded', 'false');
        });
    }

    function updateFooterNavigation() {
        var navigation = shellSection('navigation');
        document.querySelectorAll('.footer-grid').forEach(function (grid) {
            grid.innerHTML =
                '<div class="footer-company">' +
                    '<div class="footer-brand">' +
                        '<a href="' + pageHref('index.html') + '" class="nav-logo"><span class="nav-logo-text">LONG<span>XIANG</span></span></a>' +
                        '<p>' + shellValue('footer', 'text', '') + '</p>' +
                    '</div>' +
                    '<div class="footer-contact-item" data-company-contact="email"><span class="icon">&#9993;</span><span class="footer-contact-value"></span></div>' +
                    '<div class="footer-contact-item" data-company-contact="address"><span class="icon">&#8982;</span><span class="footer-contact-value"></span></div>' +
                    '<div class="messenger-links" data-communication-links></div>' +
                '</div>' +
                '<div class="footer-navigation">' +
                '<div class="footer-column">' +
                    '<h4>' + shellValue('navigation', 'quickTitle', '') + '</h4>' +
                    '<div class="footer-links">' +
                        renderShellLinks(navigation.quickLinks) +
                        '<button type="button" class="footer-cookie-settings" data-cookie-settings>' + shellValue('navigation', 'cookieSettingsLabel', '') + '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="footer-column">' +
                    '<h4>' + shellValue('navigation', 'productsTitle', '') + '</h4>' +
                    '<div class="footer-links">' +
                        renderShellLinks(navigation.productLinks) +
                    '</div>' +
                '</div>' +
                '</div>' +
                '<div class="footer-conversion footer-column">' +
                    '<h4>' + shellValue('inquiry', 'title', '') + '</h4>' +
                    '<p class="footer-conversion-text">' + shellValue('inquiry', 'text', '') + '</p>' +
                    '<form class="footer-quote-form" data-inquiry-form>' +
                        '<input type="hidden" name="name" value="' + shellValue('inquiry', 'hiddenName', '') + '">' +
                        '<input type="hidden" name="subject" value="quote">' +
                        '<input type="hidden" name="productContext" value="' + shellValue('inquiry', 'productContext', '') + '">' +
                        '<textarea name="message" rows="4" placeholder="' + shellValue('inquiry', 'messagePlaceholder', '') + '" required></textarea>' +
                        '<div class="footer-quote-row">' +
                            '<input type="email" name="email" placeholder="' + shellValue('inquiry', 'emailPlaceholder', '') + '" required>' +
                            '<input type="text" name="phone" placeholder="' + shellValue('inquiry', 'phonePlaceholder', '') + '">' +
                        '</div>' +
                        '<button type="submit">' + shellValue('inquiry', 'submitLabel', '') + '</button>' +
                        '<div class="form-status" aria-live="polite"></div>' +
                    '</form>' +
                '</div>';
        });
        document.querySelectorAll('.footer-bottom p').forEach(function (item) {
            item.textContent = shellValue('footer', 'copyright', '');
        });
    }

    var SOCIAL_ICON_SVG = {
        instagram: '<svg class="social-brand-icon instagram-brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect class="instagram-glyph" x="5" y="5" width="14" height="14" rx="4"></rect><circle class="instagram-glyph" cx="12" cy="12" r="3.2"></circle><circle class="instagram-dot" cx="16.8" cy="7.2" r="1.05"></circle></svg>',
        youtube: '<svg class="social-brand-icon youtube-brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect class="youtube-back" x="3" y="6.5" width="18" height="11" rx="3.2"></rect><path class="youtube-play" d="M10.4 9.4L15.2 12l-4.8 2.6z"></path></svg>'
    };

    function createMessengerLink(label, href, className, trackingName, iconName) {
        var link = document.createElement('a');
        link.className = 'messenger-link ' + className + (iconName ? ' is-icon' : '');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.setAttribute('aria-label', label);
        link.setAttribute('title', label);
        if (iconName && SOCIAL_ICON_SVG[iconName]) {
            link.innerHTML = SOCIAL_ICON_SVG[iconName] + '<span class="sr-only">' + escapeHtml(label) + '</span>';
        } else {
            link.textContent = label;
        }
        link.setAttribute('data-track-event', trackingName);
        link.addEventListener('click', function () { trackEvent(trackingName); });
        return link;
    }

    function appendQr(container, label, src) {
        if (!src) return;
        var qr = document.createElement('div');
        qr.className = 'communication-qr';
        qr.innerHTML =
            '<img src="' + escapeHtml(resolveAssetPath(src)) + '" alt="' + escapeHtml(label) + ' QR code">' +
            '<span>' + escapeHtml(label) + '</span>';
        container.appendChild(qr);
    }

    function resolveAssetPath(path) {
        return window.LongxiangI18n.localizedAssetPath(path, locale);
    }

    function localizedApiValue(item, field) {
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, field, locale);
            if (value) return value;
        }
        if (isArabic && item && item[field + 'Ar']) return item[field + 'Ar'];
        return item && item[field] || '';
    }

    function renderCommunicationWidgets(company) {
        var links = [];
        if (company.line) {
            links.push(createMessengerLink('Line', company.line, 'line', 'click_line'));
        }
        if (company.tiktok) {
            links.push(createMessengerLink('TikTok', company.tiktok, 'tiktok', 'click_tiktok'));
        }
        if (company.instagram) {
            links.push(createMessengerLink('Instagram', company.instagram, 'instagram', 'click_instagram', 'instagram'));
        }
        if (company.youtube) {
            links.push(createMessengerLink('YouTube', company.youtube, 'youtube', 'click_youtube', 'youtube'));
        }
        if (company.skype) {
            links.push(createMessengerLink('Skype', 'skype:' + encodeURIComponent(company.skype) + '?chat', 'skype', 'click_skype'));
        }
        document.querySelectorAll('[data-communication-links]').forEach(function (container) {
            container.innerHTML = '';
            links.forEach(function (link) { container.appendChild(link.cloneNode(true)); });
            container.querySelectorAll('[data-track-event]').forEach(function (link) {
                link.addEventListener('click', function () { trackEvent(link.getAttribute('data-track-event')); });
            });
            if (company.wechat) {
                var wechat = document.createElement('div');
                wechat.className = 'wechat-placeholder';
                wechat.innerHTML = '<strong>WeChat</strong><span>' + escapeHtml(company.wechat) + '</span>';
                container.appendChild(wechat);
            }
            appendQr(container, 'WeChat', company.wechatQr);
            appendQr(container, 'Line', company.lineQr);
            if (!container.children.length) {
                container.innerHTML = '<div class="wechat-placeholder"><strong>TikTok / Line / YouTube</strong><span>' + (isArabic ? 'سيتم التحديث' : 'To be updated') + '</span></div>';
            }
        });

        ensureInquiryModal(company);
        ensureFloatingInquiry();
    }

    function updateFooterProductLinks() {
    }

    function initCompanyInfo() {
        fetchJson('/api/company')
            .then(function (company) {
                companyCache = company;
                updateCompanyDom(company);
                initContactMapTabs(company);
                renderCommunicationWidgets(company);
                gaTrackingId = company.ga4TrackingId || '';
                loadGaIfAllowed();
                initSeoMeta(company);
            })
            .catch(function () {});
    }

    function initGlobalShellContent() {
        return fetchJson('/api/content-blocks/global-shell')
            .then(function (block) {
                globalShellCache = block && block.body ? block.body : {};
                ensureConsentUi();
                applyFunctionalEmbeds();
                updateMainNavigation();
                updateFooterNavigation();
                initActiveNavLink();
                if (companyCache) {
                    updateCompanyDom(companyCache);
                    renderCommunicationWidgets(companyCache);
                    initSeoMeta(companyCache);
                }
                var modal = document.getElementById('inquiry-modal');
                if (modal) modal.remove();
                var floating = document.querySelector('.floating-inquiry');
                if (floating) floating.textContent = shellValue('inquiry', 'floatingLabel', '');
                initContactForm();
            })
            .catch(function () {});
    }

    function setFormStatus(form, message, type) {
        var status = form.querySelector('.form-status');
        if (!status) {
            status = document.createElement('div');
            status.className = 'form-status';
            form.appendChild(status);
        }
        status.textContent = message;
        status.className = 'form-status ' + (type || '');
    }

    function modalFieldId(name) {
        return 'modal-' + String(name || '').replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    function renderInquiryField(field) {
        var id = modalFieldId(field.name);
        var label = shellLabel(field) + (field.required ? ' *' : '');
        var required = field.required ? ' required' : '';
        var readonly = field.readonly ? ' readonly' : '';
        var displayAttr = field.productContextDisplay ? ' data-product-context-display' : '';
        var attrs = ' id="' + escapeHtml(id) + '" name="' + escapeHtml(field.name || '') + '"' + required + readonly + displayAttr;
        var placeholder = localizedArabicValue(field, 'placeholder') || localizeFallback(field.placeholder);
        if (field.type === 'textarea') {
            return '<div class="form-group"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><textarea' + attrs + ' rows="' + escapeHtml(field.rows || 5) + '"></textarea></div>';
        }
        if (field.type === 'select') {
            return '<div class="form-group"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><select' + attrs + '>' +
                (field.options || []).map(function (option) {
                    return '<option value="' + escapeHtml(option.value || '') + '">' + escapeHtml(shellLabel(option)) + '</option>';
                }).join('') +
                '</select></div>';
        }
        return '<div class="form-group"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><input type="' + escapeHtml(field.type || 'text') + '"' + attrs + (placeholder ? ' placeholder="' + escapeHtml(placeholder) + '"' : '') + '></div>';
    }

    function defaultInquiryModalFields(fields) {
        var source = Array.isArray(fields) ? fields.filter(function (field) {
            return !field || field.name !== 'subject';
        }).slice(0) : [];
        var existing = {};
        source.forEach(function (field) {
            if (field && field.name) existing[field.name] = true;
        });

        [
            { name: 'productContextDisplay', label: 'Interested Product', labelAr: 'المنتج المطلوب', type: 'text', readonly: true, productContextDisplay: true },
            { name: 'name', label: 'Name', labelAr: 'الاسم', type: 'text', required: true, row: 'contact' },
            { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', required: true, row: 'contact' },
            { name: 'phone', label: 'Phone', labelAr: 'رقم الهاتف', type: 'text', row: 'company' },
            { name: 'company', label: 'Company', labelAr: 'الشركة', type: 'text', row: 'company' },
            { name: 'country', label: 'Destination Country', labelAr: 'بلد المشروع', type: 'text', row: 'project', placeholder: 'Country or region', placeholderAr: 'الدولة أو المنطقة' },
            { name: 'productType', label: 'Product Type', labelAr: 'نوع المنتج', type: 'text', row: 'project', placeholder: 'Transformer, switchgear, EV charger...', placeholderAr: 'محول، مفاتيح كهربائية، شاحن مركبات...' },
            { name: 'requiredVoltageOrCapacity', label: 'Required Voltage / Capacity', labelAr: 'الجهد / السعة المطلوبة', type: 'text', row: 'requirement', placeholder: 'Voltage, capacity, power rating', placeholderAr: 'الجهد أو السعة أو القدرة' },
            { name: 'quantityOrScale', label: 'Quantity / Project Scale', labelAr: 'الكمية / حجم المشروع', type: 'text', row: 'requirement', placeholder: 'Quantity or project scale', placeholderAr: 'الكمية أو حجم المشروع' },
            { name: 'applicationScenario', label: 'Application Scenario', labelAr: 'سيناريو الاستخدام', type: 'text', placeholder: 'Factory, PV project, charging station...', placeholderAr: 'مصنع، مشروع شمسي، محطة شحن...' },
            { name: 'message', label: 'Message', labelAr: 'الرسالة', type: 'textarea', required: true, rows: 5 }
        ].forEach(function (field) {
            if (!existing[field.name]) {
                source.push(field);
                existing[field.name] = true;
            }
        });

        return source.map(function (field) {
            if (field.name === 'phone') {
                return Object.assign({}, field, {
                    label: field.label || 'Phone',
                    labelAr: field.labelAr && field.labelAr.indexOf(ARABIC_CHAT_APP_NAME) === -1 ? field.labelAr : 'رقم الهاتف'
                });
            }
            return field;
        });
    }

    function renderInquiryFields(fields) {
        var html = '';
        var index = 0;
        while (index < fields.length) {
            var field = fields[index];
            if (field.row) {
                var row = field.row;
                var rowFields = [];
                while (index < fields.length && fields[index].row === row) {
                    rowFields.push(fields[index]);
                    index += 1;
                }
                html += '<div class="form-row">' + rowFields.map(renderInquiryField).join('') + '</div>';
            } else {
                html += renderInquiryField(field);
                index += 1;
            }
        }
        return html;
    }

    function inquiryTemplate(key, product) {
        var template = shellValue('inquiry', key, '');
        return template ? template.replace(/\{product\}/g, product || '') : '';
    }

    function ensureInquiryModal(company) {
        if (document.getElementById('inquiry-modal')) return;
        var inquiry = shellSection('inquiry');
        var fields = defaultInquiryModalFields(inquiry.modalFields);
        var modal = document.createElement('div');
        modal.id = 'inquiry-modal';
        modal.className = 'inquiry-modal';
        modal.innerHTML =
            '<div class="inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title">' +
                '<div class="inquiry-dialog-header">' +
                    '<div><h3 id="inquiry-modal-title">' + shellValue('inquiry', 'modalTitle', '') + '</h3><p>' + shellValue('inquiry', 'modalText', '') + '</p></div>' +
                    '<button type="button" class="inquiry-dialog-close" aria-label="Close">×</button>' +
                '</div>' +
                '<form class="inquiry-form" data-inquiry-form>' +
                    '<input type="hidden" name="productContext" value="">' +
                    renderInquiryFields(fields) +
                    '<button type="submit" class="btn btn-primary">' + shellValue('inquiry', 'modalSubmitLabel', '') + '</button>' +
                '</form>' +
            '</div>';
        document.body.appendChild(modal);

        modal.addEventListener('click', function (event) {
            if (event.target === modal || event.target.classList.contains('inquiry-dialog-close')) closeInquiryModal();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeInquiryModal();
        });
        bindInquiryForm(modal.querySelector('form'));
    }

    function ensureInquiryExtraFields(form) {
    }

    function ensureFloatingInquiry() {
        if (document.querySelector('.floating-inquiry')) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'floating-inquiry';
        button.textContent = shellValue('inquiry', 'floatingLabel', '');
        button.addEventListener('click', function () { openInquiryModal(); });
        document.body.appendChild(button);
    }

    function openInquiryModal(context) {
        ensureInquiryModal(companyCache || {});
        var modal = document.getElementById('inquiry-modal');
        if (!modal) return;
        var form = modal.querySelector('form');
        var productName = context && (context.productName || context.name);
        var productId = context && context.productId;
        var productContext = productName ? productName + (productId ? ' (' + productId + ')' : '') : '';
        if (form) {
            if (form.elements.productContext) form.elements.productContext.value = productContext;
            if (form.elements.productContextDisplay) form.elements.productContextDisplay.value = productContext || shellValue('inquiry', 'generalInquiryLabel', '');
            if (form.elements.subject) form.elements.subject.value = 'quote';
            if (form.elements.message && productName) {
                form.elements.message.value = inquiryTemplate('productMessageTemplate', productContext);
            } else if (form.elements.message && !form.elements.message.value) {
                form.elements.message.value = '';
            }
        }
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeInquiryModal() {
        var modal = document.getElementById('inquiry-modal');
        if (!modal) return;
        modal.classList.remove('show');
        if (!navLinks || !navLinks.classList.contains('active')) document.body.style.overflow = '';
    }

    window.openInquiryModal = openInquiryModal;

    function bindInquiryForm(form) {
        if (!form) return;
        if (form._inquiryBound) return;
        form._inquiryBound = true;
        var isSubmitting = false;
        var productId = new URLSearchParams(window.location.search).get('product');
        if (productId && form.elements.subject && form.elements.message) {
            form.elements.subject.value = 'quote';
            if (!form.elements.message.value) {
                form.elements.message.value = inquiryTemplate('productIdMessageTemplate', productId);
            }
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (isSubmitting) return;

            var payload = {
                name: (form.elements.name && form.elements.name.value || '').trim(),
                email: (form.elements.email && form.elements.email.value || '').trim(),
                company: (form.elements.company && form.elements.company.value || '').trim(),
                phone: (form.elements.phone && form.elements.phone.value || '').trim(),
                country: (form.elements.country && form.elements.country.value || '').trim(),
                productType: (form.elements.productType && form.elements.productType.value || '').trim(),
                quantityOrScale: (form.elements.quantityOrScale && form.elements.quantityOrScale.value || '').trim(),
                requiredVoltageOrCapacity: (form.elements.requiredVoltageOrCapacity && form.elements.requiredVoltageOrCapacity.value || '').trim(),
                applicationScenario: (form.elements.applicationScenario && form.elements.applicationScenario.value || '').trim(),
                subject: (form.elements.subject && form.elements.subject.value || 'quote').trim(),
                message: (form.elements.message && form.elements.message.value || '').trim(),
                productContext: (form.elements.productContext && form.elements.productContext.value || '').trim()
            };

            var errors = [];
            if (!payload.name) errors.push(isArabic ? 'يرجى إدخال الاسم.' : 'Please enter your name.');
            if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.push(isArabic ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
            if (!payload.subject) errors.push(isArabic ? 'يرجى اختيار الموضوع.' : 'Please select a subject.');
            if (!payload.message) errors.push(isArabic ? 'يرجى إدخال الرسالة.' : 'Please enter your message.');

            if (errors.length) {
                setFormStatus(form, errors.join(' '), 'error');
                return;
            }

            var submitBtn = form.querySelector('button[type="submit"], .btn');
            var originalText = submitBtn ? submitBtn.textContent : '';
            isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isArabic ? 'جار الإرسال...' : 'Sending...';
            }

            fetch('/api/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) throw new Error(data.error || 'Submit failed');
                    return data;
                });
            }).then(function () {
                setFormStatus(form, isArabic ? 'تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.' : 'Your message has been sent successfully. We will contact you soon.', 'success');
                trackEvent('generate_lead', { form_name: 'contact_form' });
                form.reset();
                if (form.closest('#inquiry-modal')) setTimeout(closeInquiryModal, 700);
            }).catch(function (err) {
                setFormStatus(form, err.message || (isArabic ? 'فشل الإرسال، يرجى المحاولة لاحقاً.' : 'Failed to send. Please try again later.'), 'error');
            }).finally(function () {
                isSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });
    }

    function initContactForm() {
        document.querySelectorAll('#contactForm, [data-inquiry-form]').forEach(bindInquiryForm);
    }

    window.initContactForm = initContactForm;

    function initInquiryTriggers() {
        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('[data-inquiry-product], [data-open-inquiry]');
            if (!trigger) return;
            event.preventDefault();
            event.stopPropagation();
            openInquiryModal({
                productId: trigger.getAttribute('data-product-id') || '',
                productName: trigger.getAttribute('data-product-name') || ''
            });
        });
    }

    function initFeaturedProducts() {
        var container = document.getElementById('featured-products-container');
        if (!container) return;
        var categoryContainer = document.getElementById('featured-product-categories');

        function productGroup(product) {
            return product.group || product.category || '';
        }

        function configuredHomeCategories(homeContent) {
            var products = homeContent && homeContent.products ? homeContent.products : {};
            return Array.isArray(products.categories) ? products.categories.filter(function (item) {
                return item && item.group && (item.label || item.labelAr);
            }) : [];
        }

        function apiHomeCategories(apiCategories, products) {
            var groupsWithProducts = products.reduce(function (acc, product) {
                var group = productGroup(product);
                if (group) acc[group] = true;
                return acc;
            }, {});
            return apiCategories.filter(function (category) {
                return category && category.group && (!Object.keys(groupsWithProducts).length || groupsWithProducts[category.group]);
            }).map(function (category) {
                return {
                    group: category.group,
                    label: category.label,
                    labelAr: category.labelAr,
                    labelFr: category.labelFr || '',
                    labelRu: category.labelRu || '',
                    href: 'products.html?group=' + encodeURIComponent(category.group),
                    icon: category.icon || category.image || ''
                };
            });
        }

        function sampleForCategory(products, category) {
            return products.find(function (product) {
                return productGroup(product) === category.group;
            });
        }

        function renderFeaturedCategories(products, homeContent, apiCategories) {
            if (!categoryContainer) return;
            categoryContainer.innerHTML = '';
            var homeCategories = configuredHomeCategories(homeContent);
            if (!homeCategories.length) homeCategories = apiHomeCategories(apiCategories, products);
            homeCategories.forEach(function (category, index) {
                var sample = sampleForCategory(products, category);
                var label = localizedApiValue(category, 'label') || category.label || category.group || '';
                var link = document.createElement('a');
                link.className = 'home-product-category fade-in';
                link.href = pageHref(category.href);
                link.setAttribute('data-delay', (index * 100).toString());
                link.innerHTML =
                    '<span class="home-product-category-image">' +
                        (category.icon
                            ? '<img src="' + escapeHtml(resolveAssetPath(category.icon)) + '" alt="' + escapeHtml(label) + '" loading="lazy" decoding="async" width="240" height="180">'
                            : sample && sample.image
                                ? '<img src="' + escapeHtml(resolveAssetPath(sample.image)) + '" alt="' + escapeHtml(label) + '" loading="lazy" decoding="async" width="240" height="180">'
                            : '<span class="home-product-category-fallback">' + escapeHtml(label.charAt(0)) + '</span>') +
                    '</span>' +
                    '<span class="home-product-category-title">' + escapeHtml(label) + '</span>';
                categoryContainer.appendChild(link);
            });
        }

        function createFeaturedCard(product, index) {
            var card = document.createElement('div');
            card.className = 'product-card product-card-v2 fade-in';
            card.setAttribute('data-delay', (index * 100).toString());
            var name = localizedApiValue(product, 'name');
            var desc = localizedApiValue(product, 'shortDesc');
            var detail = window.LongxiangI18n.localizedProductPath(product.slug || product.id, locale);
            var imagePath = resolveAssetPath(product.image);
            var textAttrs = isArabic ? ' dir="rtl" lang="ar" class="rtl-product-text"' : '';
            card.innerHTML =
                '<a class="product-card-clickarea" href="' + detail + '">' +
                    '<div class="product-card-image">' +
                        (imagePath ? '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(name) + '" loading="lazy" decoding="async" width="640" height="420">' : '') +
                    '</div>' +
                    '<div class="product-card-body">' +
                        '<h4' + textAttrs + '>' + escapeHtml(name) + '</h4>' +
                        '<p' + textAttrs + '>' + escapeHtml(desc) + '</p>' +
                    '</div>' +
                '</a>' +
                '<div class="product-card-footer">' +
                    '<a href="' + detail + '" class="product-card-action details">' + (isArabic ? 'عرض التفاصيل' : 'View Details') + '</a>' +
                    '<button type="button" class="product-card-action inquiry" data-inquiry-product data-product-id="' + escapeHtml(product.id) + '" data-product-name="' + escapeHtml(name) + '">' + (isArabic ? 'استعلام السعر' : 'Price Inquiry') + '</button>' +
                '</div>';
            return card;
        }

        function renderFeatured(products, homeContent, apiCategories) {
            container.innerHTML = '';
            renderFeaturedCategories(products, homeContent, apiCategories);
            var featured = products.filter(function (product) { return product.featured; });
            products.forEach(function (product) {
                if (featured.length < 8 && featured.indexOf(product) === -1) featured.push(product);
            });
            featured.slice(0, 8).forEach(function (product, index) {
                container.appendChild(createFeaturedCard(product, index));
            });
            initScrollAnimations();
            initStaggeredAnimations();
        }

        function fetchHomeContent() {
            var promise = window.longxiangContentPagePromise || fetchJson('/api/content-blocks/home');
            return promise.then(function (block) {
                return block && block.body ? block.body : {};
            }).catch(function () {
                return {};
            });
        }

        function fetchProductCategories() {
            return fetchJson('/api/product-categories')
                .then(function (response) {
                    if (Array.isArray(response)) return response;
                    return Array.isArray(response.data) ? response.data : [];
                })
                .catch(function () {
                    return [];
                });
        }

        Promise.all([
            fetchJson('/api/products').catch(function () { return []; }),
            fetchHomeContent(),
            fetchProductCategories()
        ])
            .then(function (result) {
                renderFeatured(result[0].filter ? result[0] : [], result[1], result[2]);
            })
            .catch(function () {});
    }

    function initCertifications() {
        var container = document.getElementById('certifications-container');
        if (!container) return;

        var tabsContainer = document.getElementById('certification-tabs');
        var searchInput = document.getElementById('certification-search');
        var resultCount = document.getElementById('certifications-result-count');
        var loadMore = document.getElementById('certifications-load-more');
        var pageSize = 24;
        var visibleCount = pageSize;
        var activeCategory = 'all';
        var certifications = [];
        var filtered = [];

        var labels = isArabic ? {
            all: 'الكل',
            loadMore: 'تحميل المزيد',
            noResults: 'لا توجد سجلات مطابقة.',
            showing: 'عرض {shown} من {total} سجل',
            imageAlt: 'معاينة الشهادة',
            close: 'إغلاق',
            sourceImage: 'صورة',
            sourcePdf: 'غلاف PDF',
            pages: '{count} صفحات',
            onePage: 'صفحة واحدة'
        } : {
            all: 'All',
            loadMore: 'Load More',
            noResults: 'No matching records.',
            showing: 'Showing {shown} of {total} records',
            imageAlt: 'Certificate preview',
            close: 'Close',
            sourceImage: 'Image',
            sourcePdf: 'PDF cover',
            pages: '{count} pages',
            onePage: '1 page'
        };

        function categoryLabel(category, data) {
            var match = data.find(function (item) { return item.category === category; });
            if (!match) return category;
            return localizedApiValue(match, 'categoryLabel') || category;
        }

        function certName(cert) {
            return localizedApiValue(cert, 'name');
        }

        function certDescription(cert) {
            return localizedApiValue(cert, 'description');
        }

        function sourceLabel(cert) {
            if ((cert.sourceType || '').toLowerCase() === 'pdf') return labels.sourcePdf;
            return labels.sourceImage;
        }

        function pagesLabel(cert) {
            var pages = Number(cert.pages || 1);
            if (pages <= 1) return labels.onePage;
            return labels.pages.replace('{count}', pages);
        }

        function updateStats(data) {
            var totals = data.reduce(function (acc, item) {
                acc.total += 1;
                if (item.category === 'test-reports' || item.category === 'test-reports-extra') acc.reports += 1;
                if (item.category === 'patents') acc.patents += 1;
                if (item.category === 'qualifications') acc.qualifications += 1;
                return acc;
            }, { total: 0, reports: 0, patents: 0, qualifications: 0 });

            Object.keys(totals).forEach(function (key) {
                var el = document.querySelector('[data-cert-stat="' + key + '"]');
                if (el) el.textContent = totals[key];
            });
        }

        function renderTabs(data) {
            if (!tabsContainer) return;
            var counts = data.reduce(function (acc, item) {
                acc[item.category] = (acc[item.category] || 0) + 1;
                return acc;
            }, {});
            var categoryOrder = data.reduce(function (order, item) {
                if (item.category && order.indexOf(item.category) === -1) order.push(item.category);
                return order;
            }, []);
            var buttons = ['all'].concat(categoryOrder.filter(function (category) { return counts[category]; }));
            tabsContainer.innerHTML = buttons.map(function (category) {
                var count = category === 'all' ? data.length : counts[category];
                var label = category === 'all' ? labels.all : categoryLabel(category, data);
                var active = category === activeCategory ? ' active' : '';
                return '<button type="button" class="cert-tab' + active + '" data-cert-category="' + escapeHtml(category) + '">' +
                    '<span>' + escapeHtml(label) + '</span><strong>' + count + '</strong>' +
                '</button>';
            }).join('');
        }

        function applyFilters() {
            var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
            filtered = certifications.filter(function (cert) {
                var categoryMatch = activeCategory === 'all' || cert.category === activeCategory;
                if (!categoryMatch) return false;
                if (!query) return true;
                return [
                    cert.name,
                    cert.nameAr,
                    cert.nameFr,
                    cert.nameRu,
                    cert.categoryLabel,
                    cert.categoryLabelAr,
                    cert.categoryLabelFr,
                    cert.categoryLabelRu,
                    cert.description,
                    cert.descriptionAr,
                    cert.descriptionFr,
                    cert.descriptionRu
                ].join(' ').toLowerCase().indexOf(query) !== -1;
            });
            visibleCount = pageSize;
            renderCards();
        }

        function renderCards() {
            if (!filtered.length) {
                container.innerHTML = '<div class="empty-state">' + labels.noResults + '</div>';
                if (resultCount) resultCount.textContent = labels.showing.replace('{shown}', 0).replace('{total}', 0);
                if (loadMore) loadMore.hidden = true;
                return;
            }

            var visible = filtered.slice(0, visibleCount);
            container.innerHTML = visible.map(function (cert) {
                var image = cert.image ? resolveAssetPath(cert.image) : '';
                var name = certName(cert);
                var description = certDescription(cert);
                var category = localizedApiValue(cert, 'categoryLabel');
                var meta = sourceLabel(cert) + (cert.category && cert.category.indexOf('test-reports') === 0 ? ' · ' + pagesLabel(cert) : '');
                return '<button type="button" class="cert-card fade-in" data-cert-id="' + escapeHtml(cert.id) + '">' +
                    '<span class="cert-media">' +
                        (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '" loading="lazy" decoding="async" width="' + escapeHtml(cert.width || 800) + '" height="' + escapeHtml(cert.height || 1100) + '">' : '<span class="cert-placeholder">CERT</span>') +
                    '</span>' +
                    '<span class="cert-body">' +
                        '<span class="cert-category">' + escapeHtml(category) + '</span>' +
                        '<span class="cert-title">' + escapeHtml(name) + '</span>' +
                        '<span class="cert-description">' + escapeHtml(description) + '</span>' +
                        '<span class="cert-meta">' + escapeHtml(meta) + '</span>' +
                    '</span>' +
                '</button>';
            }).join('');

            if (resultCount) {
                resultCount.textContent = labels.showing
                    .replace('{shown}', Math.min(visibleCount, filtered.length))
                    .replace('{total}', filtered.length);
            }
            if (loadMore) {
                loadMore.hidden = visibleCount >= filtered.length;
                loadMore.textContent = labels.loadMore;
            }
            initScrollAnimations();
        }

        function ensurePreviewModal() {
            var modal = document.getElementById('certification-preview-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'certification-preview-modal';
            modal.className = 'cert-preview-modal';
            modal.innerHTML =
                '<div class="cert-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="cert-preview-title">' +
                    '<button type="button" class="cert-preview-close" aria-label="' + escapeHtml(labels.close) + '">×</button>' +
                    '<div class="cert-preview-image-wrap"><img src="" alt="' + escapeHtml(labels.imageAlt) + '" decoding="async"></div>' +
                    '<div class="cert-preview-info">' +
                        '<span class="cert-category"></span>' +
                        '<h3 id="cert-preview-title"></h3>' +
                        '<p></p>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
            modal.addEventListener('click', function (event) {
                if (event.target === modal || event.target.classList.contains('cert-preview-close')) closePreviewModal();
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') closePreviewModal();
            });
            return modal;
        }

        function openPreview(cert) {
            if (!cert || !cert.image) return;
            var modal = ensurePreviewModal();
            var image = modal.querySelector('img');
            var title = modal.querySelector('h3');
            var description = modal.querySelector('p');
            var category = modal.querySelector('.cert-preview-info .cert-category');
            var name = certName(cert);
            image.src = resolveAssetPath(cert.image);
            image.alt = name || labels.imageAlt;
            title.textContent = name;
            description.textContent = sourceLabel(cert) + ' · ' + pagesLabel(cert);
            category.textContent = localizedApiValue(cert, 'categoryLabel');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closePreviewModal() {
            var modal = document.getElementById('certification-preview-modal');
            if (!modal || !modal.classList.contains('show')) return;
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }

        if (tabsContainer) {
            tabsContainer.addEventListener('click', function (event) {
                var button = event.target.closest('[data-cert-category]');
                if (!button) return;
                activeCategory = button.getAttribute('data-cert-category') || 'all';
                renderTabs(certifications);
                applyFilters();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }

        if (loadMore) {
            loadMore.addEventListener('click', function () {
                visibleCount += pageSize;
                renderCards();
            });
        }

        container.addEventListener('click', function (event) {
            var card = event.target.closest('[data-cert-id]');
            if (!card) return;
            var cert = certifications.find(function (item) { return item.id === card.getAttribute('data-cert-id'); });
            openPreview(cert);
        });

        fetchJson('/api/certifications').then(function (data) {
            certifications = Array.isArray(data) ? data : [];
            updateStats(certifications);
            renderTabs(certifications);
            applyFilters();
        }).catch(function () {
            container.innerHTML = '<div class="empty-state">Certification files will be updated soon.</div>';
            if (loadMore) loadMore.hidden = true;
        });
    }

    function init() {
        if (applyLanguagePreference()) return;
        var shellPromise = initGlobalShellContent();
        initCookieConsent(shellPromise);
        initUnifiedNavigation();
        injectFavicons();
        initLanguageSwitcher();
        updateFooterNavigation();
        initCompanyInfo();
        updateFooterProductLinks();
        initNavbar();
        initMobileMenu();
        initScrollAnimations();
        initProductFilter();
        initSmoothScroll();
        initActiveNavLink();
        initStaggeredAnimations();
        initStatCounters();
        initParallax();
        initBackToTop();
        initContactForm();
        initInquiryTriggers();
        initFeaturedProducts();
        initCertifications();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
