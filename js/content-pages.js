(function () {
    'use strict';

    var pageRoot = document.querySelector('[data-content-page]');
    if (!pageRoot) return;

    var pageSlug = pageRoot.getAttribute('data-content-page');
    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';

    function camelToSnake(value) {
        return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resolveAsset(path) {
        path = String(path || '').trim();
        if (!path) return '';
        if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/' || /^data:/i.test(path)) return path;
        return assetPrefix + path.replace(/^\/+/, '');
    }

    function localized(item, key) {
        if (!item) return '';
        if (isArabic) {
            if (item[key + 'Ar']) return item[key + 'Ar'];
            if (item[camelToSnake(key) + '_ar']) return item[camelToSnake(key) + '_ar'];
            if (item[key + '_ar']) return item[key + '_ar'];
        }
        return item[key] || '';
    }

    function localizedList(item, key) {
        if (!item) return [];
        if (isArabic) {
            if (Array.isArray(item[key + 'Ar']) && item[key + 'Ar'].length) return item[key + 'Ar'];
            if (Array.isArray(item[camelToSnake(key) + '_ar']) && item[camelToSnake(key) + '_ar'].length) return item[camelToSnake(key) + '_ar'];
            if (Array.isArray(item[key + '_ar']) && item[key + '_ar'].length) return item[key + '_ar'];
        }
        return Array.isArray(item[key]) ? item[key] : [];
    }

    function pageHref(href) {
        href = String(href || '#');
        if (/^(https?:)?\/\//i.test(href) || href.charAt(0) === '#' || href.charAt(0) === '/') return href;
        return href.replace(/^\/+/, '');
    }

    function imageHtml(image, className) {
        if (!image || !image.src) return '';
        var attrs = [
            className ? 'class="' + escapeHtml(className) + '"' : '',
            'src="' + escapeHtml(resolveAsset(image.src)) + '"',
            'alt="' + escapeHtml(localized(image, 'alt')) + '"',
            image.width ? 'width="' + escapeHtml(image.width) + '"' : '',
            image.height ? 'height="' + escapeHtml(image.height) + '"' : '',
            'loading="lazy"'
        ].filter(Boolean).join(' ');
        return '<img ' + attrs + '>';
    }

    function buttonHtml(button, fallbackClass) {
        if (!button) return '';
        var label = localized(button, 'label');
        if (!label) return '';
        var classes = button.className || fallbackClass || 'btn btn-primary';
        if (button.inquiry) {
            return '<button type="button" class="' + escapeHtml(classes) + '" data-open-inquiry data-product-name="' + escapeHtml(localized(button, 'productName') || label) + '">' + escapeHtml(label) + '</button>';
        }
        return '<a href="' + escapeHtml(pageHref(button.href || '#')) + '" class="' + escapeHtml(classes) + '">' + escapeHtml(label) + '</a>';
    }

    function updateHero(hero) {
        var heroEl = document.querySelector('.page-hero');
        if (!heroEl || !hero) return;
        if (hero.backgroundImage) {
            heroEl.style.backgroundImage = "url('" + resolveAsset(hero.backgroundImage).replace(/'/g, "\\'") + "')";
        }
        var title = heroEl.querySelector('h1');
        var desc = heroEl.querySelector('p:not(.page-hero-title)');
        var actions = heroEl.querySelector('.solutions-hero-actions, .page-hero-actions');
        if (title && localized(hero, 'title')) title.textContent = localized(hero, 'title');
        if (desc && localized(hero, 'subtitle')) desc.textContent = localized(hero, 'subtitle');
        if (actions && Array.isArray(hero.actions)) {
            actions.innerHTML = hero.actions.map(function (action, index) {
                return buttonHtml(action, index === 0 ? 'btn btn-primary' : 'btn btn-secondary');
            }).join('');
        }
    }

    function updateSeo(seo, hero) {
        seo = seo || {};
        var title = localized(seo, 'title');
        var description = localized(seo, 'description');
        var image = seo.image || (hero && hero.backgroundImage);
        if (title) document.title = title;
        var descMeta = document.querySelector('meta[name="description"]');
        if (descMeta && description) descMeta.setAttribute('content', description);
        if (image) {
            var ogImage = document.querySelector('meta[property="og:image"]');
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.setAttribute('content', window.location.origin + '/' + encodeURI(resolveAsset(image).replace(/^\.\.\//, '')));
        }
    }

    function listHtml(items) {
        if (!items || !items.length) return '';
        return '<ul class="solution-check-list">' + items.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</ul>';
    }

    function renderAnchorBar(anchors) {
        if (!anchors || !anchors.length) return '';
        return '<section class="solutions-anchor-bar" aria-label="' + (isArabic ? 'أقسام الحلول' : 'Solution sections') + '">' +
            '<div class="container"><div class="solutions-anchor-list">' +
            anchors.map(function (anchor) {
                return '<a href="' + escapeHtml(anchor.href || '#') + '">' + escapeHtml(localized(anchor, 'label')) + '</a>';
            }).join('') +
            '</div></div></section>';
    }

    function renderOverview(overview) {
        if (!overview) return '';
        var cards = overview.cards || [];
        return '<section class="section solutions-overview">' +
            '<div class="container">' +
            '<div class="section-header">' +
            '<h2>' + escapeHtml(localized(overview, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(overview, 'text')) + '</p>' +
            '</div>' +
            '<div class="solutions-overview-grid" data-stagger="120">' +
            cards.map(function (card, index) {
                return '<article class="solution-overview-card fade-in">' +
                    '<span class="solution-number">' + escapeHtml(card.number || String(index + 1).padStart(2, '0')) + '</span>' +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(card, 'text')) + '</p>' +
                    '</article>';
            }).join('') +
            '</div></div></section>';
    }

    function renderMarketFit(marketFit) {
        if (!marketFit) return '';
        return '<section class="section market-fit-section"><div class="container">' +
            '<div class="section-header">' +
            '<h2>' + escapeHtml(localized(marketFit, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(marketFit, 'text')) + '</p>' +
            '</div>' +
            '<div class="export-support-grid">' +
            (marketFit.items || []).map(function (item) {
                return '<div><strong>' + escapeHtml(localized(item, 'title')) + '</strong><span>' + escapeHtml(localized(item, 'text')) + '</span></div>';
            }).join('') +
            '</div></div></section>';
    }

    function renderImageCluster(section) {
        var images = section.images || [];
        if (!images.length && !section.panel) return '';
        var variant = section.imageLayout || 'cluster';
        if (variant === 'pv-board') {
            return '<div class="solution-pv-board">' + images.map(function (image, index) {
                return imageHtml(image, index === 0 ? 'solution-media-main' : '');
            }).join('') + renderFlow(section.flow) + '</div>';
        }
        if (variant === 'media-stack') {
            return '<div class="solution-media-stack" aria-label="' + escapeHtml(localized(section, 'mediaLabel')) + '">' +
                (images[0] ? imageHtml(images[0], 'solution-stack-topology') : '') +
                '<div class="solution-stack-devices">' + images.slice(1).map(function (image) { return imageHtml(image, ''); }).join('') + '</div>' +
                '</div>';
        }
        if (variant === 'technical-board') {
            return '<div class="solution-technical-board">' +
                (images[0] ? imageHtml(images[0], '') : '') +
                '<div class="solution-board-equipment">' + images.slice(1).map(function (image) { return imageHtml(image, ''); }).join('') + '</div>' +
                '</div>';
        }
        return '<div class="solution-media-cluster" aria-label="' + escapeHtml(localized(section, 'mediaLabel')) + '">' +
            images.map(function (image, index) { return imageHtml(image, index === 0 ? 'solution-media-main' : ''); }).join('') +
            renderPanel(section.panel) +
            '</div>';
    }

    function renderPanel(panel) {
        if (!panel) return '';
        return '<div class="solution-om-panel" aria-label="' + escapeHtml(localized(panel, 'label')) + '">' +
            (panel.items || []).map(function (item) {
                return '<div><span class="solution-panel-kicker">' + escapeHtml(localized(item, 'kicker')) + '</span>' +
                    '<strong>' + escapeHtml(item.value || '') + '</strong>' +
                    '<p>' + escapeHtml(localized(item, 'text')) + '</p></div>';
            }).join('') +
            '<div class="solution-om-route" aria-hidden="true"><span></span><span></span><span></span></div></div>';
    }

    function renderFlow(flow) {
        if (!flow || !flow.items || !flow.items.length) return '';
        return '<div class="solution-pv-flow" aria-label="' + escapeHtml(localized(flow, 'label')) + '">' +
            flow.items.map(function (item) { return '<span>' + escapeHtml(localized(item, 'label')) + '</span>'; }).join('') +
            '<strong>' + escapeHtml(localized(flow, 'strong')) + '</strong></div>';
    }

    function renderFeatureSection(section, index) {
        var reverse = section.reverse ? ' solution-feature-reverse' : '';
        var bg = section.light ? ' bg-light' : '';
        return '<section class="section solution-feature' + reverse + bg + '" id="' + escapeHtml(section.id || '') + '">' +
            '<div class="container"><div class="solution-feature-layout">' +
            '<div class="solution-feature-copy">' +
            '<span class="solution-index">' + escapeHtml(localized(section, 'indexLabel') || ('Solution ' + String(index + 1).padStart(2, '0'))) + '</span>' +
            '<h2>' + escapeHtml(localized(section, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(section, 'text')) + '</p>' +
            listHtml(localizedList(section, 'bullets')) +
            buttonHtml(section.button, 'btn btn-primary') +
            '</div>' +
            renderImageCluster(section) +
            '</div></div></section>';
    }

    function renderCardGrid(section) {
        if (!section || !section.cards || !section.cards.length) return '';
        return '<section class="section ' + escapeHtml(section.className || '') + '"><div class="container">' +
            '<div class="section-header"><h2>' + escapeHtml(localized(section, 'title')) + '</h2><p>' + escapeHtml(localized(section, 'text')) + '</p></div>' +
            '<div class="' + escapeHtml(section.gridClass || 'solution-diagram-grid') + '">' +
            section.cards.map(function (card) {
                return '<article class="' + escapeHtml(section.cardClass || 'solution-diagram-card') + ' fade-in">' +
                    imageHtml(card.image, '') +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    (localized(card, 'text') ? '<p>' + escapeHtml(localized(card, 'text')) + '</p>' : '') +
                    '</article>';
            }).join('') +
            '</div></div></section>';
    }

    function renderCredentials(credentials) {
        if (!credentials) return '';
        return '<section class="section solution-credibility"><div class="container">' +
            '<div class="section-header"><h2>' + escapeHtml(localized(credentials, 'title')) + '</h2><p>' + escapeHtml(localized(credentials, 'text')) + '</p></div>' +
            '<div class="solution-credential-strip">' +
            (credentials.items || []).map(function (item) {
                return '<figure>' + imageHtml(item.image, '') + '<figcaption>' + escapeHtml(localized(item, 'label')) + '</figcaption></figure>';
            }).join('') +
            '</div></div></section>';
    }

    function renderCta(cta) {
        if (!cta) return '';
        return '<section class="cta-section solutions-cta"><div class="container">' +
            '<h2>' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(cta, 'text')) + '</p>' +
            '<div class="cta-buttons">' + buttonHtml(cta.button, 'btn btn-gold btn-lg') + '</div>' +
            '</div></section>';
    }

    function backgroundStyle(path) {
        path = resolveAsset(path);
        return path ? ' style="background-image: url(&quot;' + escapeHtml(path) + '&quot;);"' : '';
    }

    function backgroundVariableStyle(name, path) {
        path = resolveAsset(path);
        return path ? ' style="--' + escapeHtml(name) + ': url(&quot;' + escapeHtml(path) + '&quot;);"' : '';
    }

    function refreshDynamicUi() {
        if (typeof window.initScrollAnimations === 'function') window.initScrollAnimations();
        if (typeof window.initStaggeredAnimations === 'function') window.initStaggeredAnimations();
        if (typeof window.applyFunctionalEmbeds === 'function') {
            window.applyFunctionalEmbeds();
        } else {
            applyRenderedFunctionalEmbeds();
        }
        if (typeof window.initContactForm === 'function') window.initContactForm();
        if (typeof window.initStatCounters === 'function') window.initStatCounters();
    }

    function applyRenderedFunctionalEmbeds() {
        var consent = {};
        try {
            consent = JSON.parse(localStorage.getItem('lx_cookie_consent_v1') || '{}');
        } catch (err) {
            consent = {};
        }
        document.querySelectorAll('[data-consent-category="functional"][data-consent-src]').forEach(function (el) {
            var src = el.getAttribute('data-consent-src');
            if (consent.functional === true && src) {
                el.setAttribute('src', src);
                el.hidden = false;
            } else {
                el.removeAttribute('src');
                el.hidden = true;
            }
        });
    }

    function renderAboutHero(hero) {
        updateHero(hero);
        var heroEl = document.querySelector('.about-page-hero');
        if (!heroEl || !hero) return;
        var kicker = heroEl.querySelector('.section-kicker');
        var actions = heroEl.querySelector('.about-hero-actions');
        if (kicker && localized(hero, 'kicker')) kicker.textContent = localized(hero, 'kicker');
        if (actions) {
            actions.innerHTML = (hero.actions || []).map(function (action, index) {
                return buttonHtml(action, index === 0 ? 'btn btn-primary' : 'btn btn-secondary');
            }).join('');
        }
    }

    function renderAboutSnapshot(snapshot) {
        if (!snapshot) return '';
        var video = snapshot.video || {};
        return '<section class="about-snapshot-section"><div class="container"><div class="about-snapshot-card">' +
            '<div class="about-snapshot-copy">' +
            '<span class="section-kicker">' + escapeHtml(localized(snapshot, 'kicker')) + '</span>' +
            '<h2>' + escapeHtml(localized(snapshot, 'title')) + '</h2>' +
            (localized(snapshot, 'text') ? '<p>' + escapeHtml(localized(snapshot, 'text')) + '</p>' : '') +
            (snapshot.body || []).map(function (item) {
                var field = item.companyField ? ' data-company-field="' + escapeHtml(item.companyField) + '"' : '';
                var text = typeof item === 'string' ? item : localized(item, 'text');
                return '<p' + field + '>' + escapeHtml(text) + '</p>';
            }).join('') +
            '</div>' +
            '<div class="about-snapshot-media"><div class="about-inline-video">' +
            (video.src ? '<iframe title="' + escapeHtml(localized(video, 'title')) + '" data-consent-category="functional" data-consent-src="' + escapeHtml(video.src) + '" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' : '') +
            '</div><p class="about-video-caption">' + escapeHtml(localized(video, 'caption')) + '</p></div>' +
            '<div class="about-stats-grid" aria-label="' + escapeHtml(isArabic ? 'أبرز بيانات الشركة' : 'Company highlights') + '">' +
            (snapshot.stats || []).map(function (stat) {
                return '<div class="about-stat"><strong>' + escapeHtml(stat.value || '') + '</strong><span>' + escapeHtml(localized(stat, 'label')) + '</span></div>';
            }).join('') +
            '</div></div></div></section>';
    }

    function renderAboutValues(values) {
        if (!values || !values.length) return '';
        return '<section class="section about-values-section"><div class="about-values-grid">' +
            values.map(function (item) {
                return '<article class="about-value-card"' + backgroundStyle(item.image) + '><div>' +
                    '<span>' + escapeHtml(localized(item, 'label')) + '</span>' +
                    '<h3>' + escapeHtml(localized(item, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(item, 'text')) + '</p>' +
                    '</div></article>';
            }).join('') +
            '</div></section>';
    }

    function renderAboutQuality(quality) {
        if (!quality) return '';
        return '<section class="section about-quality-section"><div class="container"><div class="about-quality-layout">' +
            '<div class="about-quality-copy">' +
            '<span class="section-kicker">' + escapeHtml(localized(quality, 'kicker')) + '</span>' +
            '<h2>' + escapeHtml(localized(quality, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(quality, 'text')) + '</p>' +
            '<div class="about-quality-list">' + localizedList(quality, 'items').map(function (item) {
                return '<span>' + escapeHtml(item) + '</span>';
            }).join('') + '</div></div>' +
            '<div class="about-cert-board">' + (quality.certs || []).map(function (cert) {
                return '<div class="about-cert-card">' + imageHtml(cert.image, '') + '<span>' + escapeHtml(localized(cert, 'label')) + '</span></div>';
            }).join('') + '</div></div></div></section>';
    }

    function renderAboutHistory(body) {
        var milestones = body.milestones || [];
        var history = body.history || {};
        if (!milestones.length) return '';
        return '<section class="section about-history-section"><div class="container">' +
            '<div class="section-header"><span class="section-kicker">' + escapeHtml(localized(history, 'kicker')) + '</span>' +
            '<h2>' + escapeHtml(localized(history, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(history, 'text')) + '</p></div>' +
            '<div class="about-history-rail">' + milestones.map(function (item) {
                var date = item.date || item.year || '';
                var title = localized(item, 'title') || item.title_en || item.title_cn || '';
                var text = localized(item, 'text') || item.description_en || item.description_cn || '';
                return '<article class="about-history-item"><time>' + escapeHtml(date) + '</time>' +
                    '<h3>' + escapeHtml(title) + '</h3>' +
                    '<p>' + escapeHtml(text) + '</p></article>';
            }).join('') + '</div></div></section>';
    }

    function renderAboutCapability(capability) {
        if (!capability) return '';
        return '<section class="section bg-light about-capability-section"><div class="container">' +
            '<div class="section-header"><span class="section-kicker">' + escapeHtml(localized(capability, 'kicker')) + '</span>' +
            '<h2>' + escapeHtml(localized(capability, 'title')) + '</h2><p>' + escapeHtml(localized(capability, 'text')) + '</p></div>' +
            '<div class="about-capability-grid">' + (capability.cards || []).map(function (card) {
                return '<article class="about-capability-card">' + imageHtml(card.image, '') +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(card, 'text')) + '</p></article>';
            }).join('') + '</div></div></section>';
    }

    function renderAboutFactory(factory) {
        if (!factory) return '';
        return '<section class="section about-factory-section"><div class="container">' +
            '<div class="section-header"><span class="section-kicker">' + escapeHtml(localized(factory, 'kicker')) + '</span>' +
            '<h2>' + escapeHtml(localized(factory, 'title')) + '</h2><p>' + escapeHtml(localized(factory, 'text')) + '</p></div>' +
            '<div class="about-factory-grid">' + (factory.images || []).map(function (item, index) {
                var className = index === 0 ? 'about-factory-card about-factory-card-large' : 'about-factory-card';
                return '<figure class="' + className + '">' + imageHtml(item.image, '') +
                    '<figcaption>' + escapeHtml(localized(item, 'caption')) + '</figcaption></figure>';
            }).join('') + '</div></div></section>';
    }

    function renderAboutMarkets(markets) {
        if (!markets) return '';
        return '<section class="about-market-section"><div class="container"><div class="about-market-panel">' +
            '<div><span class="section-kicker">' + escapeHtml(localized(markets, 'kicker')) + '</span>' +
            '<h2>' + escapeHtml(localized(markets, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(markets, 'text')) + '</p></div>' +
            '<div class="about-market-tags" aria-label="' + escapeHtml(isArabic ? 'أسواق التطبيق' : 'Application markets') + '">' +
            localizedList(markets, 'tags').map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') +
            '</div></div></div></section>';
    }

    function renderAboutCta(cta) {
        if (!cta) return '';
        return '<section class="about-cta-section"' + backgroundVariableStyle('about-cta-bg-image', cta.backgroundImage) + '><div class="container"><div class="about-cta-panel">' +
            '<h2>' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(cta, 'text')) + '</p>' +
            buttonHtml(cta.button, 'btn btn-primary') +
            '</div></div></section>';
    }

    function renderAbout(body) {
        renderAboutHero(body.hero);
        updateSeo(body.seo, body.hero);
        pageRoot.innerHTML =
            renderAboutSnapshot(body.snapshot) +
            renderAboutValues(body.values) +
            renderAboutQuality(body.quality) +
            renderAboutHistory(body) +
            renderAboutCapability(body.capability) +
            renderAboutFactory(body.factory) +
            renderAboutMarkets(body.markets) +
            renderAboutCta(body.cta);
        refreshDynamicUi();
    }

    function phoneHref(phone) {
        var clean = String(phone || '').replace(/[^\d+]/g, '');
        return clean ? 'tel:' + clean : '#';
    }

    function emailHref(email) {
        return email ? 'mailto:' + email : '#';
    }

    function socialSvg(name) {
        if (name === 'youtube') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.5 12s0-3.5-.45-5.12a3.02 3.02 0 0 0-2.13-2.13C18.3 4.3 12 4.3 12 4.3s-6.3 0-7.92.45a3.02 3.02 0 0 0-2.13 2.13C1.5 8.5 1.5 12 1.5 12s0 3.5.45 5.12a3.02 3.02 0 0 0 2.13 2.13c1.62.45 7.92.45 7.92.45s6.3 0 7.92-.45a3.02 3.02 0 0 0 2.13-2.13C22.5 15.5 22.5 12 22.5 12z" fill="#ff0000"></path><path d="M10 15.4V8.6l6 3.4z" fill="#fff"></path></svg>';
        }
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none"></circle></svg>';
    }

    function renderContactPrimary(body) {
        var page = body.contactPage || {};
        var mapSrc = body.googleMapsEmbedUrl || body.googleMyMapsEmbedUrl || '';
        var socials = [
            { key: 'instagram', label: 'Instagram' },
            { key: 'youtube', label: 'YouTube' }
        ].filter(function (item) { return body[item.key]; });

        return '<section class="section bg-light contact-primary-section"><div class="container"><div class="contact-section">' +
            '<div class="contact-info-card fade-in-left">' +
            '<div class="contact-section-heading"><span>' + escapeHtml(localized(page, 'companyName')) + '</span><h2>' + escapeHtml(localized(page, 'infoTitle')) + '</h2></div>' +
            '<div class="contact-info-list">' +
            '<div class="contact-info-row"><span>&#9742;</span><div><strong>' + escapeHtml(localized(page, 'officeLabel')) + '</strong><a href="' + escapeHtml(phoneHref(body.phone)) + '">' + escapeHtml(body.phone || '') + '</a></div></div>' +
            '<div class="contact-info-row"><span>&#9993;</span><div><strong>' + escapeHtml(localized(page, 'emailLabel')) + '</strong><a href="' + escapeHtml(emailHref(body.email)) + '">' + escapeHtml(body.email || '') + '</a></div></div>' +
            '<div class="contact-info-row contact-address-row"><span>&#8982;</span><div><strong>' + escapeHtml(localized(page, 'factoryAddressLabel')) + '</strong><span>' + escapeHtml(localized(body, 'headquarters') || localized(body, 'address')) + '</span></div></div>' +
            '<div class="contact-info-row contact-address-row"><span>&#9635;</span><div><strong>' + escapeHtml(localized(page, 'factoryAddressLabel')) + '</strong><span>' + escapeHtml(localized(body, 'huaiyangBase')) + '</span></div></div>' +
            '</div>' +
            (socials.length ? '<div class="contact-social-block"><h4>' + escapeHtml(localized(page, 'socialTitle')) + '</h4><div class="contact-social-icons">' +
                socials.map(function (item) {
                    return '<a href="' + escapeHtml(body[item.key]) + '" aria-label="' + escapeHtml(item.label) + '" target="_blank" rel="noopener">' + socialSvg(item.key) + '</a>';
                }).join('') +
                '</div></div>' : '') +
            '</div>' +
            '<div class="map-placeholder contact-location-panel contact-npc-map-panel fade-in-right">' +
            (mapSrc ? '<iframe class="contact-map-frame" title="' + escapeHtml(localized(page, 'mapTitle')) + '" data-consent-category="functional" data-consent-src="' + escapeHtml(mapSrc) + '" width="640" height="480" loading="eager" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' : '') +
            '</div></div></div></section>';
    }

    function renderContactField(field) {
        var id = escapeHtml(field.name || '');
        var required = field.required ? ' required' : '';
        var label = escapeHtml(localized(field, 'label')) + (field.required && localized(field, 'label').indexOf('*') === -1 ? ' *' : '');
        var placeholder = escapeHtml(localized(field, 'placeholder'));
        if (field.type === 'textarea') {
            return '<div class="form-group form-group-message"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" name="' + id + '" rows="' + escapeHtml(field.rows || 5) + '"' + required + ' placeholder="' + placeholder + '"></textarea></div>';
        }
        if (field.type === 'select') {
            return '<div class="form-group"><label for="' + id + '">' + label + '</label><select id="' + id + '" name="' + id + '"' + required + '>' +
                (field.options || []).map(function (option) {
                    return '<option value="' + escapeHtml(option.value || '') + '">' + escapeHtml(localized(option, 'label')) + '</option>';
                }).join('') +
                '</select></div>';
        }
        return '<div class="form-group"><label for="' + id + '">' + label + '</label><input type="' + escapeHtml(field.type || 'text') + '" id="' + id + '" name="' + id + '"' + required + ' placeholder="' + placeholder + '"></div>';
    }

    function renderContactForm(form) {
        if (!form) return '';
        var fields = form.fields || [];
        var left = fields.filter(function (field) { return field.column !== 'right'; });
        var right = fields.filter(function (field) { return field.column === 'right'; });
        return '<section class="section contact-form-section"><div class="container">' +
            '<div class="contact-form-heading fade-in"><h2>' + escapeHtml(localized(form, 'title')) + '</h2><p>' + escapeHtml(localized(form, 'note')) + '</p></div>' +
            '<div class="contact-form contact-page-form fade-in"><form id="contactForm">' +
            '<div class="contact-inquiry-columns">' +
            '<div class="contact-inquiry-column">' + left.map(renderContactField).join('') + '</div>' +
            '<div class="contact-inquiry-column">' + right.map(renderContactField).join('') + '</div>' +
            '</div>' +
            '<div class="contact-form-footer"><p>' + escapeHtml(localized(form, 'footerText')) + '</p><button type="submit" class="btn btn-primary">' + escapeHtml(localized(form, 'submitLabel')) + '</button></div>' +
            '</form></div></div></section>';
    }

    function renderContactFaq(faq) {
        if (!faq || !faq.items || !faq.items.length) return '';
        return '<section class="section bg-light faq-block"><div class="container">' +
            '<div class="section-header"><h2>' + escapeHtml(localized(faq, 'title')) + '</h2><p>' + escapeHtml(localized(faq, 'text')) + '</p></div>' +
            faq.items.map(function (item) {
                return '<details><summary>' + escapeHtml(localized(item, 'question')) + '</summary><p>' + escapeHtml(localized(item, 'answer')) + '</p></details>';
            }).join('') +
            '</div></section>';
    }

    function renderContact(body) {
        updateHero(body.hero);
        updateSeo(body.seo, body.hero);
        var page = body.contactPage || {};
        pageRoot.innerHTML =
            renderContactPrimary(body) +
            renderContactForm(page.form) +
            renderContactFaq(page.faq);
        refreshDynamicUi();
    }

    function renderProductSupport(section) {
        if (!section) return '';
        return '<div class="section-header"><h2>' + escapeHtml(localized(section, 'title')) + '</h2><p>' + escapeHtml(localized(section, 'text')) + '</p></div>' +
            '<div class="export-support-grid">' +
            (section.items || []).map(function (item) {
                return '<div><strong>' + escapeHtml(localized(item, 'title')) + '</strong><span>' + escapeHtml(localized(item, 'text')) + '</span></div>';
            }).join('') +
            '</div>';
    }

    function renderProductListingCta(cta) {
        if (!cta) return '';
        return '<div class="container"><h2 class="fade-in">' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p class="fade-in">' + escapeHtml(localized(cta, 'text')) + '</p>' +
            '<div class="cta-buttons fade-in">' + buttonHtml(cta.button, 'btn btn-gold btn-lg') + '</div></div>';
    }

    function renderProductDetailSupport(section) {
        var target = pageRoot.querySelector('[data-product-detail-support]');
        if (!target || !section) return;
        target.innerHTML = '<h2>' + escapeHtml(localized(section, 'title')) + '</h2><div class="export-support-grid">' +
            (section.items || []).map(function (item) {
                return '<div><strong>' + escapeHtml(localized(item, 'title')) + '</strong><span>' + escapeHtml(localized(item, 'text')) + '</span></div>';
            }).join('') +
            '</div>';
    }

    function renderProductDetailFaq(items, labels) {
        var target = pageRoot.querySelector('[data-product-detail-faq]');
        if (!target || !items || !items.length) return;
        target.innerHTML = '<h2>' + escapeHtml(localized(labels, 'faqTitle')) + '</h2>' +
            items.map(function (item) {
                return '<details><summary>' + escapeHtml(localized(item, 'question')) + '</summary><p>' + escapeHtml(localized(item, 'answer')) + '</p></details>';
            }).join('');
    }

    function setDetailText(selector, value) {
        var el = document.querySelector(selector);
        if (el && value) el.textContent = value;
    }

    function renderProductDetailHero(body) {
        var detailHero = body.detailHero || {};
        var heroEl = document.querySelector('.page-hero');
        if (heroEl && detailHero.backgroundImage) {
            heroEl.style.backgroundImage = "url('" + resolveAsset(detailHero.backgroundImage).replace(/'/g, "\\'") + "')";
        }
        renderHeroBreadcrumb(detailHero);
        setDetailText('#page-title', localized(detailHero, 'title'));
        setDetailText('#page-subtitle', localized(detailHero, 'subtitle'));
        updateSeo(body.detailSeo || body.seo, detailHero);
    }

    function renderProductDetailLabels(labels) {
        if (!labels) return;
        setDetailText('[data-product-specs-title]', localized(labels, 'specsTitle'));
        setDetailText('#product-title', localized(labels, 'loadingTitle'));
        setDetailText('#product-desc', localized(labels, 'loadingText'));
        setDetailText('[data-product-detail-support] .empty-state', localized(labels, 'supportLoading'));
        setDetailText('[data-product-detail-faq] .empty-state', localized(labels, 'faqLoading'));
        setDetailText('[data-product-detail-inquiry] .empty-state', localized(labels, 'inquiryLoading'));
    }

    function productFieldId(name) {
        return 'detail-' + String(name || '').replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    function renderProductInquiryField(field) {
        var id = productFieldId(field.name);
        var label = localized(field, 'label') + (field.required ? ' *' : '');
        var required = field.required ? ' required' : '';
        var attrs = ' id="' + escapeHtml(id) + '" name="' + escapeHtml(field.name || '') + '"' + required;
        var placeholder = localized(field, 'placeholder');
        if (field.type === 'textarea') {
            return '<div class="form-group"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><textarea' + attrs + ' rows="' + escapeHtml(field.rows || 5) + '"' + (field.productMessage ? ' data-product-message' : '') + '></textarea></div>';
        }
        if (field.type === 'select') {
            return '<div class="form-group"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><select' + attrs + '>' +
                (field.options || []).map(function (option) {
                    return '<option value="' + escapeHtml(option.value || '') + '">' + escapeHtml(localized(option, 'label')) + '</option>';
                }).join('') +
                '</select></div>';
        }
        return '<div class="form-group"><label for="' + escapeHtml(id) + '">' + escapeHtml(label) + '</label><input type="' + escapeHtml(field.type || 'text') + '"' + attrs + (placeholder ? ' placeholder="' + escapeHtml(placeholder) + '"' : '') + '></div>';
    }

    function renderProductInquiryForm(form) {
        var target = pageRoot.querySelector('[data-product-detail-inquiry]');
        if (!target || !form) return;
        target.innerHTML = '<h3>' + escapeHtml(localized(form, 'title')) + '</h3>' +
            '<form class="inquiry-form" data-inquiry-form>' +
            '<input type="hidden" name="productContext" data-product-context value="">' +
            (form.fields || []).map(renderProductInquiryField).join('') +
            '<button type="submit" class="btn btn-primary">' + escapeHtml(localized(form, 'submitLabel')) + '</button>' +
            '</form>';
    }

    function renderProductPages(body) {
        var kind = pageRoot.getAttribute('data-product-page-kind') || 'listing';
        if (kind === 'detail') {
            var labels = body.detailLabels || {};
            renderProductDetailHero(body);
            renderProductDetailLabels(labels);
            renderProductDetailSupport(body.detailSupport);
            renderProductDetailFaq(body.detailFaq, labels);
            renderProductInquiryForm(body.inquiryForm);
            refreshDynamicUi();
            return;
        }

        updateHero(body.productsHero);
        updateSeo(body.seo, body.productsHero);
        renderHeroBreadcrumb(body.productsHero);
        var support = pageRoot.querySelector('[data-product-listing-support]');
        if (support) support.innerHTML = '<div class="container">' + renderProductSupport(body.listingSupport) + '</div>';
        var cta = pageRoot.querySelector('[data-product-listing-cta]');
        if (cta) cta.innerHTML = renderProductListingCta(body.listingCta);
        refreshDynamicUi();
    }

    function renderHomeHero(body) {
        var hero = body.hero || {};
        var heroEl = document.querySelector('.hero-hex');
        if (!heroEl) return;
        var bg = heroEl.querySelector('.hero-bg');
        var logo = heroEl.querySelector('.hero-hex-logo');
        var title = heroEl.querySelector('.hero-hex-title');
        var subtitle = heroEl.querySelector('.hero-hex-subtitle');
        var actions = heroEl.querySelector('.hero-hex-actions');
        var proof = heroEl.querySelector('.hero-proof-strip');

        if (bg && hero.backgroundImage) bg.style.backgroundImage = "url('" + resolveAsset(hero.backgroundImage).replace(/'/g, "\\'") + "')";
        if (logo && hero.logo) {
            logo.src = resolveAsset(hero.logo);
            logo.alt = localized(hero, 'logoAlt') || 'Longxiang Electrical logo';
        }
        if (title && localized(hero, 'title')) title.textContent = localized(hero, 'title');
        if (subtitle && localized(hero, 'subtitle')) subtitle.textContent = localized(hero, 'subtitle');
        if (actions) {
            actions.innerHTML = (hero.actions || []).map(function (action) {
                return buttonHtml(action, action.className || 'hero-hex-btn');
            }).join('');
        }
        if (proof) {
            proof.innerHTML = (body.proof || []).map(function (item) {
                return '<span><strong>' + escapeHtml(item.value || '') + '</strong> ' + escapeHtml(localized(item, 'label')) + '</span>';
            }).join('');
        }
    }

    function renderHomeProducts(products) {
        var section = pageRoot.querySelector('[data-home-products]');
        if (!section || !products) return;
        var header = section.querySelector('.section-header');
        var button = section.querySelector('.all-products-btn');
        if (header) {
            header.innerHTML = '<h2>' + escapeHtml(localized(products, 'title')) + '</h2>' +
                (localized(products, 'text') ? '<p>' + escapeHtml(localized(products, 'text')) + '</p>' : '');
        }
        if (button) {
            button.textContent = localized(products, 'allProductsLabel') || button.textContent;
            button.href = pageHref(products.allProductsHref || 'products.html');
        }
    }

    function renderHomeApplications(applications) {
        var section = pageRoot.querySelector('[data-home-applications]');
        if (!section || !applications || applications.enabled === false) {
            if (section) section.hidden = true;
            return;
        }
        section.hidden = false;
        var cards = Array.isArray(applications.cards) ? applications.cards : [];
        section.innerHTML = '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(localized(applications, 'title')) + '</h2>' +
            (localized(applications, 'text') ? '<p>' + escapeHtml(localized(applications, 'text')) + '</p>' : '') + '</div>' +
            '<div class="home-applications-grid" data-stagger="120">' + cards.map(function (card) {
                return '<article class="home-application-card fade-in">' +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(card, 'text')) + '</p>' +
                '</article>';
            }).join('') + '</div>' +
            '<div class="text-center mt-4 fade-in">' + buttonHtml(applications.button, 'btn btn-secondary') + '</div>' +
        '</div>';
    }

    function renderHomeNews(news) {
        var section = pageRoot.querySelector('[data-home-news]');
        if (!section || !news || news.enabled === false) {
            if (section) section.hidden = true;
            return;
        }
        section.hidden = false;
        var cards = Array.isArray(news.cards) ? news.cards : [];
        section.innerHTML = '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(localized(news, 'title')) + '</h2>' +
            (localized(news, 'text') ? '<p>' + escapeHtml(localized(news, 'text')) + '</p>' : '') + '</div>' +
            '<div class="home-news-grid" data-stagger="120">' + cards.map(function (card) {
                var inner = '<span>' + escapeHtml(card.date || '') + '</span>' +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(card, 'text')) + '</p>';
                return card.href
                    ? '<a class="home-news-card fade-in" href="' + escapeHtml(pageHref(card.href)) + '">' + inner + '</a>'
                    : '<article class="home-news-card fade-in">' + inner + '</article>';
            }).join('') + '</div>' +
            '<div class="text-center mt-4 fade-in">' + buttonHtml(news.button, 'btn btn-secondary') + '</div>' +
        '</div>';
    }

    function renderHomeTrust(trust) {
        var section = pageRoot.querySelector('[data-home-trust]');
        if (!section || !trust) return;
        section.innerHTML = '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(localized(trust, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(trust, 'text')) + '</p></div>' +
            '<div class="trust-logos fade-in">' +
            (trust.chips || []).map(function (chip) {
                return '<div class="trust-chip"><strong>' + escapeHtml(localized(chip, 'title')) + '</strong><span>' + escapeHtml(localized(chip, 'text')) + '</span></div>';
            }).join('') +
            '</div>' +
            '<div class="testimonials-grid trust-testimonials fade-in">' +
            (trust.cards || []).map(function (card) {
                return '<div class="testimonial-card"><p class="testimonial-text">' + escapeHtml(localized(card, 'text')) + '</p>' +
                    '<div class="testimonial-author"><div class="testimonial-author-info"><strong>' + escapeHtml(localized(card, 'title')) + '</strong>' +
                    '<span>' + escapeHtml(localized(card, 'meta')) + '</span></div></div></div>';
            }).join('') +
            '</div></div>';
    }

    function renderHomeFeatures(body) {
        var section = pageRoot.querySelector('[data-home-features]');
        var features = body.features || [];
        if (!section || !features.length) return;
        section.innerHTML = '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(isArabic ? 'لماذا Longxiang' : 'Why Choose Longxiang') + '</h2></div>' +
            '<div class="features-grid" data-stagger="150">' +
            features.map(function (feature) {
                return '<div class="feature-card fade-in"><div class="feature-icon">' + (feature.icon || '') + '</div>' +
                    '<h4>' + escapeHtml(localized(feature, 'title')) + '</h4><p>' + escapeHtml(localized(feature, 'text')) + '</p></div>';
            }).join('') +
            '</div></div>';
    }

    function renderHomeStats(stats) {
        var section = pageRoot.querySelector('[data-home-stats]');
        if (!section || !stats || !stats.length) return;
        section.innerHTML = '<div class="container"><div class="stats-grid">' +
            stats.map(function (stat) {
                var count = stat.count || String(stat.value || '').replace(/[^\d]/g, '') || 0;
                return '<div class="stat-item fade-in"><div class="stat-number" data-count="' + escapeHtml(count) + '">0</div>' +
                    '<div class="stat-divider"></div><div class="stat-label">' + escapeHtml(localized(stat, 'label')) + '</div></div>';
            }).join('') +
            '</div></div>';
    }

    function renderHomeCta(cta) {
        var section = pageRoot.querySelector('[data-home-cta]');
        if (!section || !cta) return;
        section.innerHTML = '<div class="container"><h2 class="fade-in">' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p class="fade-in">' + escapeHtml(localized(cta, 'text')) + '</p>' +
            '<div class="cta-buttons fade-in">' + buttonHtml(cta.button, 'btn btn-gold btn-lg') + '</div></div>';
    }

    function renderHome(body) {
        renderHomeHero(body);
        updateSeo(body.seo, body.hero);
        renderHomeProducts(body.products);
        renderHomeApplications(body.applications);
        renderHomeNews(body.news);
        renderHomeTrust(body.trust);
        renderHomeFeatures(body);
        renderHomeStats(body.stats);
        renderHomeCta(body.cta);
        refreshDynamicUi();
    }

    function renderCertifications(body) {
        updateHero(body.hero);
        updateSeo(body.seo, body.hero);

        var intro = body.intro || {};
        var kicker = pageRoot.querySelector('.certifications-kicker');
        var introTitle = pageRoot.querySelector('.certifications-intro h2');
        var introText = pageRoot.querySelector('.certifications-intro > p');
        if (kicker && localized(intro, 'kicker')) kicker.textContent = localized(intro, 'kicker');
        if (introTitle && localized(intro, 'title')) introTitle.textContent = localized(intro, 'title');
        if (introText && localized(intro, 'text')) introText.textContent = localized(intro, 'text');

        (body.stats || []).forEach(function (stat) {
            var value = pageRoot.querySelector('[data-cert-stat="' + escapeHtml(stat.key || '') + '"]');
            if (!value) return;
            var label = value.parentElement && value.parentElement.querySelector('span');
            if (stat.value != null && value.textContent === '0') value.textContent = stat.value;
            if (label && localized(stat, 'label')) label.textContent = localized(stat, 'label');
        });

        var toolbar = body.toolbar || {};
        var searchLabel = pageRoot.querySelector('.cert-search span');
        var searchInput = pageRoot.querySelector('#certification-search');
        var resultCount = pageRoot.querySelector('#certifications-result-count');
        var loadMore = pageRoot.querySelector('#certifications-load-more');
        if (searchLabel && localized(toolbar, 'searchLabel')) searchLabel.textContent = localized(toolbar, 'searchLabel');
        if (searchInput && localized(toolbar, 'searchPlaceholder')) searchInput.setAttribute('placeholder', localized(toolbar, 'searchPlaceholder'));
        if (resultCount && localized(toolbar, 'loadingText') && /loading|جاري/i.test(resultCount.textContent || '')) resultCount.textContent = localized(toolbar, 'loadingText');
        if (loadMore && localized(toolbar, 'loadMoreLabel')) loadMore.textContent = localized(toolbar, 'loadMoreLabel');

        refreshDynamicUi();
    }

    function renderHeroBreadcrumb(hero) {
        var breadcrumb = document.querySelector('.page-hero .breadcrumb');
        if (!breadcrumb || !hero || !Array.isArray(hero.breadcrumb)) return;
        breadcrumb.innerHTML = hero.breadcrumb.map(function (item, index) {
            var label = localized(item, 'label');
            if (!label) return '';
            var isCurrent = item.current || index === hero.breadcrumb.length - 1;
            if (isCurrent) return '<span class="current">' + escapeHtml(label) + '</span>';
            return '<a href="' + escapeHtml(pageHref(item.href || '#')) + '">' + escapeHtml(label) + '</a><span class="separator">/</span>';
        }).join('');
    }

    function renderCompare(body) {
        updateHero(body.hero);
        updateSeo(body.seo, body.hero);
        renderHeroBreadcrumb(body.hero);

        var toolbar = body.toolbar || {};
        var back = pageRoot.querySelector('[data-compare-back]');
        var print = pageRoot.querySelector('[data-compare-print]');
        var empty = pageRoot.querySelector('#comparison-container .empty-state');
        if (back && localized(toolbar, 'backLabel')) {
            back.textContent = localized(toolbar, 'backLabel');
            back.href = pageHref(toolbar.backHref || 'products.html');
        }
        if (print && localized(toolbar, 'printLabel')) print.textContent = localized(toolbar, 'printLabel');
        if (empty && localized(body.emptyState, 'text')) empty.textContent = localized(body.emptyState, 'text');

        refreshDynamicUi();
    }

    function renderNotFound(body) {
        updateSeo(body.seo, body.hero);
        var panel = body.panel || {};
        pageRoot.innerHTML =
            '<div class="container"><div class="not-found-panel">' +
                '<span>' + escapeHtml(panel.code || '404') + '</span>' +
                '<h1>' + escapeHtml(localized(panel, 'title')) + '</h1>' +
                '<p>' + escapeHtml(localized(panel, 'text')) + '</p>' +
                '<div class="hero-buttons">' +
                    (panel.actions || []).map(function (action, index) {
                        return buttonHtml(action, index === 0 ? 'btn btn-primary' : 'btn btn-secondary');
                    }).join('') +
                '</div>' +
            '</div></div>';
        refreshDynamicUi();
    }

    function renderSolutions(body) {
        updateHero(body.hero);
        updateSeo(body.seo, body.hero);
        pageRoot.innerHTML =
            renderAnchorBar(body.anchors) +
            renderOverview(body.overview) +
            renderMarketFit(body.marketFit) +
            (body.sections || []).map(function (section, index) {
                if (section.type === 'card-grid') return renderCardGrid(section);
                return renderFeatureSection(section, index);
            }).join('') +
            renderCardGrid(body.scenarios) +
            renderCredentials(body.credentials) +
            renderCta(body.cta);
        refreshDynamicUi();
    }

    function renderPage(block) {
        var body = block && block.body ? block.body : {};
        if (pageSlug === 'solutions') renderSolutions(body);
        if (pageSlug === 'about-us') renderAbout(body);
        if (pageSlug === 'contact') renderContact(body);
        if (pageSlug === 'product-pages') renderProductPages(body);
        if (pageSlug === 'home') renderHome(body);
        if (pageSlug === 'certifications') renderCertifications(body);
        if (pageSlug === 'compare') renderCompare(body);
        if (pageSlug === 'not-found') renderNotFound(body);
    }

    var contentPromise = fetch('/api/content-blocks/' + encodeURIComponent(pageSlug))
        .then(function (res) {
            if (!res.ok) throw new Error('Content block request failed');
            return res.json();
        })
        .then(function (block) {
            renderPage(block);
            return block;
        })
        .catch(function () {
            pageRoot.setAttribute('data-content-fallback', 'static');
            return null;
        });

    window.longxiangContentPagePromise = contentPromise;
})();
