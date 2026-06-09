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
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, params || {});
        }
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
                { page: 'solutions.html', label: labels.pv, hash: '#pv-solution' },
                { page: 'solutions.html', label: labels.wind, hash: '#wind-pv-ess-ev' },
                { page: 'solutions.html', label: labels.microgrid, hash: '#smart-microgrid' }
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

    function injectGa(trackingId) {
        if (!trackingId || document.querySelector('script[data-ga4-script]')) return;
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(trackingId);
        script.setAttribute('data-ga4-script', trackingId);
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
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

    function updateCompanyDom(company) {
        Object.keys(company).forEach(function (key) {
            setCompanyText('[data-company-field="' + key + '"]', company[key]);
        });

        setCompanyText('.footer-brand p', company.footerText);
        setCompanyText('[data-company-contact="email"] .footer-contact-value', company.email);
        setCompanyText('[data-company-contact="address"] .footer-contact-value', company.address);
        setCompanyHref('[data-company-email-link]', 'mailto:' + company.email);
        setCompanyHref('[data-company-phone-link]', 'tel:' + company.phone);
        setCompanyHref('[data-company-instagram-link]', company.instagram);
        setCompanyHref('[data-company-youtube-link]', company.youtube);
        document.querySelectorAll('[data-company-google-map-frame]').forEach(function (el) {
            if (company.googleMapsEmbedUrl) {
                el.src = company.googleMapsEmbedUrl;
                el.hidden = false;
            } else {
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
        if (!frame || !tabs.length) return;

        tabs.forEach(function (tab) {
            var key = tab.getAttribute('data-contact-map-target');
            var location = locations[key];
            if (location) {
                var title = tab.querySelector('strong');
                var address = tab.querySelector('span');
                if (title && location.name) title.textContent = location.name;
                if (address && location.address) address.textContent = location.address;
            }

            tab.addEventListener('click', function () {
                var next = locations[key];
                if (!next) return;
                if (next.googleMapsEmbedUrl) frame.src = next.googleMapsEmbedUrl;
                tabs.forEach(function (item) { item.classList.toggle('active', item === tab); });
            });
        });

        var active = tabs.find(function (tab) { return tab.classList.contains('active'); }) || tabs[0];
        var activeLocation = locations[active.getAttribute('data-contact-map-target')];
        if (activeLocation && activeLocation.googleMapsEmbedUrl) frame.src = activeLocation.googleMapsEmbedUrl;
    }

    function updateFooterNavigation() {
        document.querySelectorAll('.footer-grid').forEach(function (grid) {
            grid.innerHTML =
                '<div class="footer-company">' +
                    '<div class="footer-brand">' +
                        '<a href="' + pageHref('index.html') + '" class="nav-logo"><span class="nav-logo-text">LONG<span>XIANG</span></span></a>' +
                        '<p>Providing intelligent, low-carbon power equipment and cultivating excellent professional electrical talent since 2003.</p>' +
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
                    '<h4>' + (isArabic ? 'وسائل التواصل' : 'External Media') + '</h4>' +
                    '<p class="footer-conversion-text">' + (isArabic ? 'تابع لونغشيانغ أو تواصل مع فريق المبيعات عبر القنوات الرسمية.' : 'Follow Longxiang or reach our sales team through official channels.') + '</p>' +
                    '<div class="messenger-links footer-social-links" data-communication-links></div>' +
                    '<button type="button" class="footer-quote-button" data-open-inquiry>' + (isArabic ? 'طلب عرض سعر' : 'Request Quote') + '</button>' +
                '</div>';
        });
    }

    function createMessengerLink(label, href, className, trackingName) {
        var link = document.createElement('a');
        link.className = 'messenger-link ' + className;
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = label;
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
            links.push(createMessengerLink('Instagram', company.instagram, 'instagram', 'click_instagram'));
        }
        if (company.youtube) {
            links.push(createMessengerLink('YouTube', company.youtube, 'youtube', 'click_youtube'));
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
                injectGa(company.ga4TrackingId);
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
                    '<div class="form-group"><label for="modal-product-context">Interested Product</label><input id="modal-product-context" name="productContextDisplay" readonly></div>' +
                    '<div class="form-row"><div class="form-group"><label for="modal-name">Full Name *</label><input id="modal-name" name="name" required></div><div class="form-group"><label for="modal-email">Email Address *</label><input id="modal-email" type="email" name="email" required></div></div>' +
                    '<div class="form-row"><div class="form-group"><label for="modal-company">Company Name</label><input id="modal-company" name="company"></div><div class="form-group"><label for="modal-phone">WhatsApp / Phone</label><input id="modal-phone" name="phone"></div></div>' +
                    '<div class="form-group"><label for="modal-subject">Subject *</label><select id="modal-subject" name="subject" required><option value="quote">Request a Quote</option><option value="technical">Technical Consultation</option><option value="partnership">Business Partnership</option><option value="support">After-Sales Support</option><option value="other">Other Inquiry</option></select></div>' +
                    '<div class="form-group"><label for="modal-message">Message *</label><textarea id="modal-message" name="message" rows="5" required></textarea></div>' +
                    '<button type="submit" class="btn btn-primary">Submit Message</button>' +
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
            if (form.elements.productContextDisplay) form.elements.productContextDisplay.value = productContext || (isArabic ? 'General inquiry' : 'General inquiry');
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
                form.elements.message.value = 'I would like to request pricing and technical details for product: ' + productId;
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
