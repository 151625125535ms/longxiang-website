(function () {
    'use strict';

    var pageRoot = document.querySelector('[data-education-page]');
    var isArabic = /\/ar\//.test(window.location.pathname.replace(/\\/g, '/'));
    var assetPrefix = isArabic ? '../' : '';

    if (!pageRoot) return;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resolveAsset(path) {
        if (!path) return '';
        if (/^(https?:)?\/\//.test(path) || path.charAt(0) === '/') return path;
        return assetPrefix + path;
    }

    function localized(item, key) {
        if (!item) return '';
        if (isArabic && item[key + 'Ar']) return item[key + 'Ar'];
        return item[key] || '';
    }

    function localizedList(item, key) {
        if (!item) return [];
        if (isArabic && item[key + 'Ar'] && item[key + 'Ar'].length) return item[key + 'Ar'];
        return item[key] || [];
    }

    function fetchJson(url, fallbackUrl) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .catch(function () {
                return fetch(fallbackUrl).then(function (res) {
                    if (!res.ok) throw new Error('Fallback request failed');
                    return res.json();
                });
            });
    }

    function findSection(data, id) {
        return (data.sections || []).filter(function (section) {
            return section.id === id;
        })[0] || null;
    }

    function imageHtml(src, alt) {
        if (!src) return '';
        return '<img src="' + escapeHtml(resolveAsset(src)) + '" alt="' + escapeHtml(alt || '') + '">';
    }

    function renderList(items) {
        if (!items || !items.length) return '';
        return '<ul class="education-checklist">' + items.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</ul>';
    }

    function renderProofImages(images, title) {
        var selected = (images || []).slice(0, 3);
        if (!selected.length) return '';
        return '<div class="education-proof-strip">' + selected.map(function (src, index) {
            return '<figure>' + imageHtml(src, title + ' proof ' + (index + 1)) + '</figure>';
        }).join('') + '</div>';
    }

    function renderPageNav() {
        if (isArabic) return '';
        return '<nav class="education-page-nav" aria-label="Education page sections">' +
            '<div class="container">' +
            '<a href="#cooperation-models">Models</a>' +
            '<a href="#industry-college">Industrial College</a>' +
            '<a href="#talent-training">Talent Training</a>' +
            '<a href="#training-equipment">Teaching Equipment</a>' +
            '<a href="#research-global">R&D + Global</a>' +
            '<a href="#education-contact">Contact</a>' +
            '</div></nav>';
    }

    function renderHero(data) {
        var hero = data.hero || {};
        var heroEl = document.querySelector('.education-page-hero');
        if (!heroEl) return;

        if (hero.backgroundImage) {
            heroEl.style.backgroundImage = "url('" + resolveAsset(hero.backgroundImage).replace(/'/g, "\\'") + "')";
        }

        var title = heroEl.querySelector('h1');
        var subtitle = heroEl.querySelector('p');
        if (title) title.textContent = localized(hero, 'title') || 'Education';
        if (subtitle) subtitle.textContent = localized(hero, 'subtitle');
    }

    function renderStats(data) {
        var stats = data.stats || [];
        if (!stats.length) return '';

        return '<section class="education-proof-bar" id="education-proof">' +
            '<div class="container education-proof-grid">' +
            stats.map(function (stat) {
                return '<article class="education-proof-item fade-in">' +
                    '<strong>' + escapeHtml(stat.value || '') + '</strong>' +
                    '<span>' + escapeHtml(localized(stat, 'label')) + '</span>' +
                    '</article>';
            }).join('') +
            '</div></section>';
    }

    function cooperationSections(data) {
        return ['industry-college', 'talent-training', 'training-equipment', 'research-global']
            .map(function (id) { return findSection(data, id); })
            .filter(Boolean);
    }

    function renderConversionIntro(data) {
        var sections = cooperationSections(data);
        return '<section class="section education-conversion" id="cooperation-models">' +
            '<div class="container">' +
            '<div class="education-conversion-head fade-in">' +
            '<span class="section-kicker">Four cooperation models</span>' +
            '<h2>Choose a cooperation path that can be shown, operated, and scaled.</h2>' +
            '<p>Based on the school-enterprise cooperation document, Longxiang packages education cooperation into four buyer-friendly solutions: platform building, talent development, equipment delivery, and research plus international expansion.</p>' +
            '</div>' +
            '<div class="education-model-grid">' +
            sections.map(function (section) {
                return '<a class="education-model-card fade-in" href="#' + escapeHtml(section.id) + '">' +
                    '<span>' + escapeHtml(section.modeNumber || '') + '</span>' +
                    '<h3>' + escapeHtml(localized(section, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(section.tagline || localized(section, 'summary')) + '</p>' +
                    '</a>';
            }).join('') +
            '</div></div></section>';
    }

    function renderModeSection(section, index) {
        var reverse = index % 2 ? ' education-mode-reverse' : '';
        var cards = section.cards || [];

        return '<section class="section education-mode' + reverse + '" id="' + escapeHtml(section.id) + '">' +
            '<div class="container">' +
            '<div class="education-mode-layout">' +
            '<div class="education-mode-media fade-in">' +
            '<div class="education-mode-image">' + imageHtml(section.image, localized(section, 'title')) + '</div>' +
            renderProofImages(section.images, localized(section, 'title')) +
            '</div>' +
            '<div class="education-mode-copy fade-in">' +
            '<span class="education-mode-number">' + escapeHtml(section.modeNumber || String(index + 1).padStart(2, '0')) + '</span>' +
            '<h2>' + escapeHtml(localized(section, 'title')) + '</h2>' +
            '<p class="education-mode-tagline">' + escapeHtml(section.tagline || '') + '</p>' +
            '<p class="education-mode-summary">' + escapeHtml(localized(section, 'summary')) + '</p>' +
            '<div class="education-buyer-fit"><strong>Best for</strong><span>' + escapeHtml(section.bestFor || '') + '</span></div>' +
            '<div class="education-mode-columns">' +
            '<div><h4>What Longxiang Delivers</h4>' + renderList(localizedList(section, 'deliverables')) + '</div>' +
            '<div><h4>Partner Outcomes</h4>' + renderList(localizedList(section, 'outcomes')) + '</div>' +
            '</div>' +
            '</div></div>' +
            (cards.length ? '<div class="education-offer-grid">' + cards.map(function (card) {
                return '<article class="education-offer-card fade-in">' +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(card, 'text')) + '</p>' +
                    '</article>';
            }).join('') + '</div>' : '') +
            '</div></section>';
    }

    function renderGallery(section) {
        if (!section || !section.images || !section.images.length) return '';

        return '<section class="section education-gallery-section" id="education-gallery">' +
            '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(localized(section, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(section, 'summary')) + '</p></div>' +
            '<div class="gallery-grid education-gallery-grid" data-stagger="80">' +
            section.images.slice(0, 8).map(function (src, index) {
                return '<div class="gallery-item fade-in">' +
                    imageHtml(src, 'Longxiang education cooperation image ' + (index + 1)) +
                    '<div class="gallery-item-overlay"><span>Cooperation Proof</span></div>' +
                    '</div>';
            }).join('') +
            '</div></div></section>';
    }

    function renderPhilosophy(section) {
        if (!section) return '';
        var body = localizedList(section, 'body');
        return '<section class="section education-philosophy" id="cooperation-philosophy">' +
            '<div class="container">' +
            '<div class="education-philosophy-panel fade-in">' +
            '<span class="section-kicker">Cooperation philosophy</span>' +
            '<h2>' + escapeHtml(localized(section, 'summary')) + '</h2>' +
            body.map(function (item) { return '<p>' + escapeHtml(item) + '</p>'; }).join('') +
            '</div></div></section>';
    }

    function renderCta(data) {
        var cta = data.cta || {};
        return '<section class="cta-section education-cta" id="education-contact">' +
            '<div class="container">' +
            '<h2 class="fade-in">' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p class="fade-in">' + escapeHtml(localized(cta, 'text')) + '</p>' +
            '<div class="cta-buttons fade-in"><a href="' + escapeHtml(cta.href || 'contact.html') + '" class="btn btn-gold btn-lg">' +
            escapeHtml(localized(cta, 'buttonText') || 'Discuss Cooperation') +
            '</a></div></div></section>';
    }

    function renderPage(data) {
        var philosophy = findSection(data, 'cooperation-philosophy');
        var gallery = findSection(data, 'gallery');
        var sections = cooperationSections(data);

        renderHero(data);
        pageRoot.innerHTML =
            renderPageNav() +
            renderStats(data) +
            renderConversionIntro(data) +
            sections.map(renderModeSection).join('') +
            renderGallery(gallery) +
            renderPhilosophy(philosophy) +
            renderCta(data);
        hydrateRenderedUi();
    }

    function hydrateRenderedUi() {
        if (typeof window.initScrollAnimations === 'function') {
            window.initScrollAnimations();
        } else {
            pageRoot.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale').forEach(function (el) {
                el.classList.add('visible');
            });
        }
    }

    fetchJson('/api/education', assetPrefix + 'data/education.json')
        .then(renderPage)
        .catch(function () {
            pageRoot.setAttribute('data-education-fallback', 'static');
        });
})();
