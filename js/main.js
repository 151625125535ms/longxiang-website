(function () {
    'use strict';

    var navbar = document.querySelector('.navbar');
    var hamburger = document.querySelector('.hamburger');
    var navLinks = document.querySelector('.nav-links');
    var mobileOverlay = document.querySelector('.mobile-menu-overlay');
    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';
    var companyCache = null;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function fetchJson(url, fallbackUrl) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .catch(function () {
                if (!fallbackUrl) throw new Error('No fallback available');
                return fetch(fallbackUrl).then(function (res) {
                    if (!res.ok) throw new Error('Fallback request failed');
                    return res.json();
                });
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

    function getEmbedPlaceholder(el) {
        var parent = el && el.parentElement;
        return parent ? parent.querySelector(':scope > .consent-embed-placeholder') : null;
    }

    function ensureEmbedPlaceholder(el) {
        if (!el || !el.parentElement || getEmbedPlaceholder(el)) return;
        var placeholder = document.createElement('div');
        placeholder.className = 'consent-embed-placeholder';
        placeholder.innerHTML =
            '<div>' +
                '<strong>' + (isArabic ? 'يتطلب هذا المحتوى موافقة وظيفية' : 'Functional consent required') + '</strong>' +
                '<p>' + (isArabic ? 'نحظر محتوى الخرائط والفيديو من أطراف ثالثة حتى تمنح الموافقة.' : 'Maps and videos from third parties are blocked until you allow functional cookies.') + '</p>' +
                '<button type="button" data-allow-functional>' + (isArabic ? 'السماح بملفات تعريف الارتباط الوظيفية' : 'Allow functional cookies') + '</button>' +
            '</div>';
        placeholder.querySelector('[data-allow-functional]').addEventListener('click', function () {
            saveConsent(Object.assign(readConsent(), { functional: true }));
        });
        el.parentElement.appendChild(placeholder);
    }

    function consentText() {
        return isArabic ? {
            title: 'إعدادات ملفات تعريف الارتباط',
            intro: 'نستخدم التخزين الضروري لتشغيل الموقع. لن نحمل التحليلات أو الخرائط أو الفيديو بدون موافقتك.',
            necessary: 'ضروري',
            necessaryDesc: 'مطلوب للغة والأمان ووظائف الموقع الأساسية.',
            analytics: 'التحليلات',
            analyticsDesc: 'يساعدنا Google Analytics على فهم استخدام الموقع.',
            functional: 'وظيفي',
            functionalDesc: 'يسمح بتشغيل فيديو YouTube وخرائط Google.',
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
    }

    function consentToggle(name, label, desc, checked, disabled) {
        return '<label class="cookie-consent-toggle">' +
            '<span><strong>' + label + '</strong><small>' + desc + '</small></span>' +
            '<input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
            '</label>';
    }

    function ensureConsentUi() {
        if (document.getElementById('cookie-consent-root')) return;
        var text = consentText();
        var root = document.createElement('div');
        root.id = 'cookie-consent-root';
        root.innerHTML =
            '<section class="cookie-consent-banner" role="region" aria-label="' + text.title + '" hidden>' +
                '<div><h2>' + text.title + '</h2><p>' + text.intro + '</p></div>' +
                '<div class="cookie-consent-actions">' +
                    '<button type="button" data-consent-accept>' + text.accept + '</button>' +
                    '<button type="button" data-consent-reject>' + text.reject + '</button>' +
                    '<button type="button" data-consent-customize>' + text.customize + '</button>' +
                '</div>' +
            '</section>' +
            '<div class="cookie-consent-modal" hidden>' +
                '<div class="cookie-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">' +
                    '<div class="cookie-consent-dialog-header"><h2 id="cookie-consent-title">' + text.title + '</h2><button type="button" data-consent-close aria-label="' + text.close + '">&times;</button></div>' +
                    '<p>' + text.intro + '</p>' +
                    '<form data-consent-form>' +
                        consentToggle('necessary', text.necessary, text.necessaryDesc, true, true) +
                        consentToggle('analytics', text.analytics, text.analyticsDesc, false, false) +
                        consentToggle('functional', text.functional, text.functionalDesc, false, false) +
                        '<div class="cookie-consent-actions"><button type="submit">' + text.save + '</button><button type="button" data-consent-reject>' + text.reject + '</button><button type="button" data-consent-accept>' + text.accept + '</button></div>' +
                    '</form>' +
                '</div>' +
            '</div>';
        document.body.appendChild(root);

        root.addEventListener('click', function (event) {
            if (event.target.closest('[data-consent-accept]')) saveConsent({ analytics: true, functional: true });
            if (event.target.closest('[data-consent-reject]')) saveConsent({ analytics: false, functional: false });
            if (event.target.closest('[data-consent-customize]')) openConsentSettings();
            if (event.target.closest('[data-consent-close]')) closeConsentSettings();
        });
        root.querySelector('[data-consent-form]').addEventListener('submit', function (event) {
            event.preventDefault();
            saveConsent({
                analytics: event.target.elements.analytics.checked,
                functional: event.target.elements.functional.checked
            });
        });
        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('[data-cookie-settings]');
            if (!trigger) return;
            event.preventDefault();
            openConsentSettings();
        });
        updateConsentUi(readConsent());
    }

    function updateConsentUi(consent) {
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
        if (modal) modal.hidden = true;
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

    function initCookieConsent() {
        initGoogleConsentMode();
        ensureConsentUi();
        applyFunctionalEmbeds();
    }

    function currentPageName() {
        var name = window.location.pathname.split('/').pop();
        return name || 'index.html';
    }

    function supportsArabicPage(pageName) {
        return ['index.html', 'about.html', 'products.html', 'product-detail.html', 'contact.html', 'compare.html', 'solutions.html', 'education.html', 'certifications.html'].indexOf(pageName) !== -1;
    }

    function languageUrl(lang) {
        var path = window.location.pathname.replace(/\\/g, '/');
        var pageName = currentPageName();
        var targetPage = supportsArabicPage(pageName) ? pageName : 'index.html';
        var targetPath;

        if (lang === 'ar') {
            targetPath = isArabic ? path.replace(pageName, targetPage) : path.replace(/[^/]*$/, 'ar/' + targetPage);
        } else {
            targetPath = isArabic ? path.replace(/\/ar\//, '/') : path.replace(/[^/]*$/, targetPage);
        }

        return targetPath + window.location.search + window.location.hash;
    }

    function pageHref(page, hash) {
        var path = window.location.pathname.replace(/\\/g, '/');
        var prefix = '';
        if (!isArabic && !/(\/$|\/[^/]+\.html$)/.test(path)) prefix = '/';
        return prefix + page + (hash || '');
    }

    function navLink(page, label, extraClass, hash) {
        return '<a href="' + pageHref(page, hash) + '"' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + label + '</a>';
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

        if (!navLinks) return;
        var labels = isArabic ? {
            home: 'الرئيسية',
            products: 'المنتجات',
            transformer: 'المحولات',
            ev: 'شواحن المركبات الكهربائية',
            switchgear: 'معدات المفاتيح',
            solutions: 'الحلول',
            epc: 'المقاولات العامة للمشاريع الكهربائية',
            lineOm: 'تشغيل وصيانة الخطوط',
            pv: 'حل الطاقة الشمسية التجارية والصناعية',
            wind: 'حل الرياح والطاقة الشمسية والتخزين والشحن',
            microgrid: 'حل الشبكة المصغرة الذكية',
            education: 'التعليم',
            about: 'من نحن',
            aboutLongxiang: 'عن لونغشيانغ',
            certs: 'الشهادات',
            contact: 'اتصل بنا'
        } : {
            home: 'Home',
            products: 'Products',
            transformer: 'Transformer',
            ev: 'EV charger',
            switchgear: 'Switchgear',
            solutions: 'Solutions',
            epc: 'Engineering General Contracting',
            lineOm: 'Line Operation & Maintenance',
            pv: 'C&I PV Solution',
            wind: 'C&I Wind+PV+ESS+EV Charging Solution',
            microgrid: 'C&I Smart Microgrid Solution',
            education: 'Education',
            about: 'About Us',
            aboutLongxiang: 'About LongXiang',
            certs: 'Certificates',
            contact: 'Contact'
        };

        navLinks.innerHTML =
            navItem('index.html', labels.home) +
            navItem('products.html', labels.products, [
                { page: 'products.html', label: labels.transformer, hash: '?group=transformer' },
                { page: 'products.html', label: labels.ev, hash: '?group=ev-charger' },
                { page: 'products.html', label: labels.switchgear, hash: '?group=switchgear' }
            ], ['products.html', 'product-detail.html']) +
            navItem('solutions.html', labels.solutions, [
                { page: 'solutions.html', label: labels.epc, hash: '#engineering-epc' },
                { page: 'solutions.html', label: labels.lineOm, hash: '#line-om' },
                { page: 'solutions.html', label: labels.wind, hash: '#wind-pv-ess-ev' },
                { page: 'solutions.html', label: labels.microgrid, hash: '#smart-microgrid' },
                { page: 'solutions.html', label: labels.pv, hash: '#pv-solution' }
            ]) +
            navItem('education.html', labels.education) +
            navItem('about.html', labels.about, [
                { page: 'about.html', label: labels.aboutLongxiang },
                { page: 'certifications.html', label: labels.certs }
            ], ['about.html', 'certifications.html']) +
            navItem('contact.html', labels.contact);
    }

    function applyLanguagePreference() {
        var pageName = currentPageName();
        if (!supportsArabicPage(pageName)) return false;

        var stored = localStorage.getItem('site_lang');
        var preferred = stored || (/^ar/i.test(navigator.language || '') ? 'ar' : '');
        if (!preferred) return false;

        if (preferred === 'ar' && !isArabic) {
            window.location.replace(languageUrl('ar'));
            return true;
        }
        if (preferred === 'en' && isArabic) {
            window.location.replace(languageUrl('en'));
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
        select.innerHTML =
            '<option value="en">English</option>' +
            '<option value="ar">العربية</option>';
        select.value = isArabic ? 'ar' : 'en';
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

        navLinks.querySelectorAll('.nav-item.has-dropdown > a').forEach(function (link) {
            link.setAttribute('aria-expanded', 'false');
            link.addEventListener('click', function (event) {
                if (!window.matchMedia('(max-width: 768px)').matches) return;

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
            });
        });

        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function (event) {
                if (window.matchMedia('(max-width: 768px)').matches &&
                    link.closest('.nav-item.has-dropdown') &&
                    link.parentElement && link.parentElement.classList.contains('has-dropdown')) {
                    return;
                }

                closeMobileMenu();
            });
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
            { rel: 'icon', type: 'image/png', sizes: '32x32', href: assetPrefix + 'favicon-32x32.png' },
            { rel: 'icon', type: 'image/png', sizes: '16x16', href: assetPrefix + 'favicon-16x16.png' },
            { rel: 'apple-touch-icon', sizes: '180x180', href: assetPrefix + 'apple-touch-icon.png' }
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
        injectMeta('', 'og:image', window.location.origin + '/' + encodeURI('5、厂区厂貌/龙翔公司正门.jpg'));

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
        var path = window.location.pathname.replace(/\\/g, '/');
        var search = window.location.search || '';
        var enPath = path.replace(/^\/ar\//, '/');
        var arPath = /^\/ar\//.test(path) ? path : '/ar' + (path.charAt(0) === '/' ? path : '/' + path);
        upsertLink('canonical', { href: currentUrl });
        upsertLink('alternate', { hreflang: 'en', href: origin + enPath + search });
        upsertLink('alternate', { hreflang: 'ar', href: origin + arPath + search });
        upsertLink('alternate', { hreflang: 'x-default', href: origin + enPath + search });
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
        if (isArabic && company[key + 'Ar']) return company[key + 'Ar'];
        return company[key] || '';
    }

    function updateCompanyDom(company) {
        Object.keys(company).forEach(function (key) {
            setCompanyText('[data-company-field="' + key + '"]', companyValue(company, key));
        });

        setCompanyText('.footer-brand p', companyValue(company, 'footerText'));
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

    function updateFooterNavigation() {
        document.querySelectorAll('.footer-grid').forEach(function (grid) {
            grid.innerHTML =
                '<div class="footer-company">' +
                    '<div class="footer-brand">' +
                        '<a href="' + pageHref('index.html') + '" class="nav-logo"><span class="nav-logo-text">LONG<span>XIANG</span></span></a>' +
                        '<p>' + (isArabic ? 'نوفر معدات طاقة ذكية منخفضة الكربون ونساهم في تنمية الكفاءات الكهربائية المهنية منذ عام 2003.' : 'Providing intelligent, low-carbon power equipment and cultivating excellent professional electrical talent since 2003.') + '</p>' +
                    '</div>' +
                    '<div class="footer-contact-item" data-company-contact="email"><span class="icon">&#9993;</span><span class="footer-contact-value">hnlxdq2003@163.com</span></div>' +
                    '<div class="footer-contact-item" data-company-contact="address"><span class="icon">&#8982;</span><span class="footer-contact-value">Longhu New District, Xinzheng, Zhengzhou, Henan, China</span></div>' +
                    '<div class="messenger-links" data-communication-links></div>' +
                '</div>' +
                '<div class="footer-navigation">' +
                '<div class="footer-column">' +
                    '<h4>' + (isArabic ? 'روابط سريعة' : 'Quick Links') + '</h4>' +
                    '<div class="footer-links">' +
                        navLink('index.html', isArabic ? 'الرئيسية' : 'Home') +
                        navLink('products.html', isArabic ? 'المنتجات' : 'Products') +
                        navLink('solutions.html', isArabic ? 'الحلول' : 'Solutions') +
                        navLink('education.html', isArabic ? 'التعليم' : 'Education') +
                        navLink('about.html', isArabic ? 'من نحن' : 'About Us') +
                        navLink('contact.html', isArabic ? 'اتصل بنا' : 'Contact') +
                        '<button type="button" class="footer-cookie-settings" data-cookie-settings>' + (isArabic ? 'إعدادات ملفات تعريف الارتباط' : 'Cookie Settings') + '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="footer-column">' +
                    '<h4>' + (isArabic ? 'المنتجات' : 'Products') + '</h4>' +
                    '<div class="footer-links">' +
                        navLink('products.html', isArabic ? 'المحولات' : 'Transformer', '', '?group=transformer') +
                        navLink('products.html', isArabic ? 'شواحن المركبات الكهربائية' : 'EV charger', '', '?group=ev-charger') +
                        navLink('products.html', isArabic ? 'معدات المفاتيح' : 'Switchgear', '', '?group=switchgear') +
                    '</div>' +
                '</div>' +
                '</div>' +
                '<div class="footer-conversion footer-column">' +
                    '<h4>' + (isArabic ? 'طلب عرض سعر' : 'Request Quote') + '</h4>' +
                    '<p class="footer-conversion-text">' + (isArabic ? 'أرسل متطلبات مشروعك وسيتواصل فريقنا معك بسرعة.' : 'Share your project requirements and our team will respond quickly.') + '</p>' +
                    '<form class="footer-quote-form" data-inquiry-form>' +
                        '<input type="hidden" name="name" value="' + (isArabic ? 'زائر طلب عرض سعر من التذييل' : 'Footer Quote Visitor') + '">' +
                        '<input type="hidden" name="subject" value="quote">' +
                        '<input type="hidden" name="productContext" value="' + (isArabic ? 'طلب عرض سعر من التذييل' : 'Footer request quote') + '">' +
                        '<textarea name="message" rows="4" placeholder="' + (isArabic ? '* الرسالة' : '* Message') + '" required></textarea>' +
                        '<div class="footer-quote-row">' +
                            '<input type="email" name="email" placeholder="' + (isArabic ? '* البريد الإلكتروني' : '* E-mail') + '" required>' +
                            '<input type="text" name="phone" placeholder="' + (isArabic ? 'واتساب / الهاتف' : 'WhatsApp / Phone') + '">' +
                        '</div>' +
                        '<button type="submit">' + (isArabic ? 'إرسال' : 'SUBMIT') + '</button>' +
                        '<div class="form-status" aria-live="polite"></div>' +
                    '</form>' +
                '</div>';
        });
    }

    var SOCIAL_ICON_SVG = {
        instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="5"></rect><circle cx="12" cy="12" r="3.4"></circle><circle cx="17.2" cy="6.8" r="1"></circle></svg>',
        youtube: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="6.5" width="18" height="11" rx="3.2"></rect><path d="M10.4 9.4L15.2 12l-4.8 2.6z"></path></svg>'
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
        if (!path) return '';
        if (/^(https?:)?\/\//.test(path) || path.charAt(0) === '/' || /^data:/.test(path)) return path;
        return assetPrefix + path;
    }

    function renderCommunicationWidgets(company) {
        var links = [];
        if (company.whatsapp) {
            var number = String(company.whatsapp).replace(/[^\d]/g, '');
            if (number) links.push(createMessengerLink('WhatsApp', 'https://wa.me/' + number, 'whatsapp', 'click_whatsapp'));
        }
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
            appendQr(container, 'WhatsApp', company.whatsappQr);
            appendQr(container, 'WeChat', company.wechatQr);
            appendQr(container, 'Line', company.lineQr);
            if (!container.children.length) {
                container.innerHTML = '<div class="wechat-placeholder"><strong>TikTok / Line / WhatsApp / YouTube</strong><span>' + (isArabic ? 'سيتم التحديث' : 'To be updated') + '</span></div>';
            }
        });

        ensureInquiryModal(company);
        ensureFloatingInquiry();
    }

    function updateFooterProductLinks() {
        var groups = [
            { match: ['Transformer', 'المحولات'], group: 'transformer' },
            { match: ['EV charger', 'شواحن المركبات الكهربائية'], group: 'ev-charger' },
            { match: ['Switchgear', 'معدات المفاتيح'], group: 'switchgear' }
        ];

        document.querySelectorAll('.footer-links a').forEach(function (link) {
            var text = link.textContent || '';
            groups.forEach(function (item) {
                if (item.match.some(function (word) { return text.indexOf(word) !== -1; })) {
                    link.href = pageHref('products.html', '?group=' + item.group);
                }
            });
        });
    }

    function initCompanyInfo() {
        fetchJson('/api/company', assetPrefix + 'data/company.json')
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

    function ensureInquiryModal(company) {
        if (document.getElementById('inquiry-modal')) return;
        var modal = document.createElement('div');
        modal.id = 'inquiry-modal';
        modal.className = 'inquiry-modal';
        modal.innerHTML =
            '<div class="inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title">' +
                '<div class="inquiry-dialog-header">' +
                    '<div><h3 id="inquiry-modal-title">' + (isArabic ? 'طلب عرض سعر' : 'Request Quote') + '</h3><p>' + (isArabic ? 'أرسل متطلباتك وسنتواصل معك قريباً.' : 'Send your requirements and we will contact you soon.') + '</p></div>' +
                    '<button type="button" class="inquiry-dialog-close" aria-label="Close">×</button>' +
                '</div>' +
                '<form class="inquiry-form" data-inquiry-form>' +
                    '<input type="hidden" name="productContext" value="">' +
                    '<div class="form-group"><label for="modal-product-context">' + (isArabic ? 'المنتج المطلوب' : 'Interested Product') + '</label><input id="modal-product-context" name="productContextDisplay" readonly></div>' +
                    '<div class="form-row"><div class="form-group"><label for="modal-name">' + (isArabic ? 'الاسم الكامل *' : 'Full Name *') + '</label><input id="modal-name" name="name" required></div><div class="form-group"><label for="modal-email">' + (isArabic ? 'البريد الإلكتروني *' : 'Email Address *') + '</label><input id="modal-email" type="email" name="email" required></div></div>' +
                    '<div class="form-row"><div class="form-group"><label for="modal-company">' + (isArabic ? 'اسم الشركة' : 'Company Name') + '</label><input id="modal-company" name="company"></div><div class="form-group"><label for="modal-phone">' + (isArabic ? 'واتساب / الهاتف' : 'WhatsApp / Phone') + '</label><input id="modal-phone" name="phone"></div></div>' +
                    '<div class="form-group"><label for="modal-subject">' + (isArabic ? 'الموضوع *' : 'Subject *') + '</label><select id="modal-subject" name="subject" required><option value="quote">' + (isArabic ? 'طلب عرض سعر' : 'Request a Quote') + '</option><option value="technical">' + (isArabic ? 'استشارة فنية' : 'Technical Consultation') + '</option><option value="partnership">' + (isArabic ? 'شراكة تجارية' : 'Business Partnership') + '</option><option value="support">' + (isArabic ? 'دعم ما بعد البيع' : 'After-Sales Support') + '</option><option value="other">' + (isArabic ? 'استفسار آخر' : 'Other Inquiry') + '</option></select></div>' +
                    '<div class="form-group"><label for="modal-message">' + (isArabic ? 'الرسالة *' : 'Message *') + '</label><textarea id="modal-message" name="message" rows="5" required></textarea></div>' +
                    '<button type="submit" class="btn btn-primary">' + (isArabic ? 'إرسال الرسالة' : 'Submit Message') + '</button>' +
                '</form>' +
            '</div>';
        document.body.appendChild(modal);
        ensureInquiryExtraFields(modal.querySelector('form'));

        modal.addEventListener('click', function (event) {
            if (event.target === modal || event.target.classList.contains('inquiry-dialog-close')) closeInquiryModal();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeInquiryModal();
        });
        bindInquiryForm(modal.querySelector('form'));
    }

    function ensureInquiryExtraFields(form) {
        if (!form || form.querySelector('[name="country"]')) return;
        var subjectGroup = form.querySelector('#modal-subject') ? form.querySelector('#modal-subject').closest('.form-group') : null;
        if (!subjectGroup) return;
        var rowOne = document.createElement('div');
        rowOne.className = 'form-row';
        rowOne.innerHTML =
            '<div class="form-group"><label for="modal-country">' + (isArabic ? 'الدولة' : 'Country') + '</label><input id="modal-country" name="country"></div>' +
            '<div class="form-group"><label for="modal-product-type">' + (isArabic ? 'نوع المنتج' : 'Product Type') + '</label><input id="modal-product-type" name="productType" placeholder="' + (isArabic ? 'محول / مفاتيح / شاحن' : 'Transformer / Switchgear / EV Charger') + '"></div>';
        var rowTwo = document.createElement('div');
        rowTwo.className = 'form-row';
        rowTwo.innerHTML =
            '<div class="form-group"><label for="modal-quantity-scale">' + (isArabic ? 'الكمية أو حجم المشروع' : 'Quantity or Project Scale') + '</label><input id="modal-quantity-scale" name="quantityOrScale"></div>' +
            '<div class="form-group"><label for="modal-voltage-capacity">' + (isArabic ? 'الجهد أو السعة المطلوبة' : 'Required Voltage or Capacity') + '</label><input id="modal-voltage-capacity" name="requiredVoltageOrCapacity"></div>';
        form.insertBefore(rowOne, subjectGroup);
        form.insertBefore(rowTwo, subjectGroup);
    }

    function ensureFloatingInquiry() {
        if (document.querySelector('.floating-inquiry')) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'floating-inquiry';
        button.textContent = isArabic ? 'طلب عرض سعر' : 'Request Quote';
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
            if (form.elements.productContextDisplay) form.elements.productContextDisplay.value = productContext || (isArabic ? 'استفسار عام' : 'General inquiry');
            if (form.elements.subject) form.elements.subject.value = 'quote';
            if (form.elements.message && productName) {
                form.elements.message.value = isArabic
                    ? 'أرغب في طلب السعر والتفاصيل الفنية لهذا المنتج: ' + productName + (productId ? ' (' + productId + ')' : '') + '.'
                    : 'I am interested in ' + productContext + '. Please send pricing and technical details.';
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
                form.elements.message.value = isArabic
                    ? 'أرغب في طلب السعر والتفاصيل الفنية للمنتج: ' + productId
                    : 'I would like to request pricing and technical details for product: ' + productId;
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
                subject: (form.elements.subject && form.elements.subject.value || '').trim(),
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
        var homeCategories = [
            { group: 'transformer', label: 'Transformer', labelAr: 'المحولات', href: 'products.html?group=transformer', icon: '首页矢量图/变压器.png' },
            { group: 'ev-charger', label: 'EV Charger', labelAr: 'شواحن المركبات الكهربائية', href: 'products.html?group=ev-charger', icon: '首页矢量图/充电桩.png' },
            { group: 'switchgear', label: 'Switchgear', labelAr: 'معدات المفاتيح', href: 'products.html?group=switchgear', icon: '首页矢量图/成套电气.png' }
        ];

        function renderFeaturedCategories(products) {
            if (!categoryContainer) return;
            categoryContainer.innerHTML = '';
            homeCategories.forEach(function (category, index) {
                var sample = products.map(function (product) {
                    return Object.assign({}, product, {
                        group: product.group || (product.category === 'switchgear' ? 'switchgear' : 'transformer')
                    });
                }).find(function (product) { return product.group === category.group; });
                var label = isArabic ? (category.labelAr || category.label) : category.label;
                var link = document.createElement('a');
                link.className = 'home-product-category fade-in';
                link.href = pageHref(category.href);
                link.setAttribute('data-delay', (index * 100).toString());
                link.innerHTML =
                    '<span class="home-product-category-image">' +
                        (category.icon
                            ? '<img src="' + assetPrefix + escapeHtml(category.icon) + '" alt="' + escapeHtml(label) + '" loading="lazy">'
                            : sample && sample.image
                                ? '<img src="' + assetPrefix + escapeHtml(sample.image) + '" alt="' + escapeHtml(label) + '" loading="lazy">'
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
            var name = isArabic ? (product.nameAr || product.name) : product.name;
            var desc = isArabic ? (product.shortDescAr || product.shortDesc || '') : (product.shortDesc || '');
            var detail = (isArabic ? 'product-detail.html' : 'product-detail.html') + '?id=' + encodeURIComponent(product.id);
            card.innerHTML =
                '<a class="product-card-clickarea" href="' + detail + '">' +
                    '<div class="product-card-image">' +
                        '<img src="' + assetPrefix + escapeHtml(product.image) + '" alt="' + escapeHtml(name) + '" loading="lazy">' +
                    '</div>' +
                    '<div class="product-card-body">' +
                        '<h4>' + escapeHtml(name) + '</h4>' +
                        '<p>' + escapeHtml(desc) + '</p>' +
                    '</div>' +
                '</a>' +
                '<div class="product-card-footer">' +
                    '<a href="' + detail + '" class="product-card-action details">' + (isArabic ? 'عرض التفاصيل' : 'View Details') + '</a>' +
                    '<button type="button" class="product-card-action inquiry" data-inquiry-product data-product-id="' + escapeHtml(product.id) + '" data-product-name="' + escapeHtml(name) + '">' + (isArabic ? 'استعلام السعر' : 'Price Inquiry') + '</button>' +
                '</div>';
            return card;
        }

        function renderFeatured(products) {
            container.innerHTML = '';
            renderFeaturedCategories(products);
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

        fetchJson('/api/products', assetPrefix + 'data/products.json')
            .then(function (data) {
                renderFeatured(data.filter ? data : []);
            })
            .catch(function () {});
    }

    function initCertifications() {
        var container = document.getElementById('certifications-container');
        if (!container) return;

        function render(data) {
            if (!data.length) {
                container.innerHTML = '<div class="empty-state">Certification files will be updated soon.</div>';
                return;
            }

            container.innerHTML = data.map(function (cert) {
                var file = cert.image || '';
                var image = file
                    ? (/\.pdf($|\?)/i.test(file)
                        ? '<a class="cert-placeholder cert-file-link" href="' + escapeHtml(resolveAssetPath(file)) + '" target="_blank" rel="noopener">PDF</a>'
                        : '<img src="' + escapeHtml(resolveAssetPath(file)) + '" alt="' + escapeHtml(cert.name) + '">')
                    : '<div class="cert-placeholder">CERT</div>';
                return '<article class="cert-card fade-in">' +
                    '<div class="cert-media">' + image + '</div>' +
                    '<div class="cert-body">' +
                        '<h4>' + escapeHtml(cert.name) + '</h4>' +
                        '<p>' + escapeHtml(cert.description || '') + '</p>' +
                        '<span>' + escapeHtml(cert.issuer || 'Issuer to be updated') + '</span>' +
                    '</div>' +
                '</article>';
            }).join('');
            initScrollAnimations();
        }

        fetchJson('/api/certifications', assetPrefix + 'data/certifications.json').then(render).catch(function () {
            container.innerHTML = '<div class="empty-state">Certification files will be updated soon.</div>';
        });
    }

    function init() {
        if (applyLanguagePreference()) return;
        initCookieConsent();
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
