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

    function t(key) {
        var labels = isArabic ? {
            pageNav: 'أقسام صفحة التعليم',
            models: 'نماذج التعاون',
            industrialCollege: 'الكلية الصناعية',
            talentTraining: 'تدريب المواهب',
            teachingEquipment: 'معدات التدريب',
            researchGlobal: 'البحث والتعاون الدولي',
            contact: 'تواصل معنا',
            fourModels: 'أربعة نماذج للتعاون',
            introTitle: 'اختر مسار تعاون يمكن عرضه وتشغيله وتوسيعه.',
            introText: 'تقدم Longxiang حلول تعاون تعليمية عملية تشمل بناء المنصات، وتنمية المواهب، وتسليم معدات التدريب، والبحث والتوسع الدولي.',
            bestFor: 'مناسب لـ',
            delivers: 'ما تقدمه Longxiang',
            outcomes: 'نتائج الشريك',
            proofAlt: 'دليل تعاون',
            proofOverlay: 'دليل التعاون',
            philosophy: 'فلسفة التعاون',
            discuss: 'مناقشة التعاون'
        } : {
            pageNav: 'Education page sections',
            models: 'Models',
            industrialCollege: 'Industrial College',
            talentTraining: 'Talent Training',
            teachingEquipment: 'Teaching Equipment',
            researchGlobal: 'R&D + Global',
            contact: 'Contact',
            fourModels: 'Four cooperation models',
            introTitle: 'Choose a cooperation path that can be shown, operated, and scaled.',
            introText: 'Based on the school-enterprise cooperation document, Longxiang packages education cooperation into four buyer-friendly solutions: platform building, talent development, equipment delivery, and research plus international expansion.',
            bestFor: 'Best for',
            delivers: 'What Longxiang Delivers',
            outcomes: 'Partner Outcomes',
            proofAlt: 'Longxiang education cooperation image',
            proofOverlay: 'Cooperation Proof',
            philosophy: 'Cooperation philosophy',
            discuss: 'Discuss Cooperation'
        };
        return labels[key] || key;
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
            return '<figure>' + imageHtml(src, title + ' ' + t('proofOverlay') + ' ' + (index + 1)) + '</figure>';
        }).join('') + '</div>';
    }

    function renderPageNav() {
        return '<nav class="education-page-nav" aria-label="' + escapeHtml(t('pageNav')) + '">' +
            '<div class="container">' +
            '<a href="#cooperation-models">' + escapeHtml(t('models')) + '</a>' +
            '<a href="#industry-college">' + escapeHtml(t('industrialCollege')) + '</a>' +
            '<a href="#talent-training">' + escapeHtml(t('talentTraining')) + '</a>' +
            '<a href="#training-equipment">' + escapeHtml(t('teachingEquipment')) + '</a>' +
            '<a href="#research-global">' + escapeHtml(t('researchGlobal')) + '</a>' +
            '<a href="#education-contact">' + escapeHtml(t('contact')) + '</a>' +
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
            '<span class="section-kicker">' + escapeHtml(t('fourModels')) + '</span>' +
            '<h2>' + escapeHtml(t('introTitle')) + '</h2>' +
            '<p>' + escapeHtml(t('introText')) + '</p>' +
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
            '<p class="education-mode-tagline">' + escapeHtml(localized(section, 'tagline') || '') + '</p>' +
            '<p class="education-mode-summary">' + escapeHtml(localized(section, 'summary')) + '</p>' +
            '<div class="education-buyer-fit"><strong>' + escapeHtml(t('bestFor')) + '</strong><span>' + escapeHtml(localized(section, 'bestFor') || '') + '</span></div>' +
            '<div class="education-mode-columns">' +
            '<div><h4>' + escapeHtml(t('delivers')) + '</h4>' + renderList(localizedList(section, 'deliverables')) + '</div>' +
            '<div><h4>' + escapeHtml(t('outcomes')) + '</h4>' + renderList(localizedList(section, 'outcomes')) + '</div>' +
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
                    imageHtml(src, t('proofAlt') + ' ' + (index + 1)) +
                    '<div class="gallery-item-overlay"><span>' + escapeHtml(t('proofOverlay')) + '</span></div>' +
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
            '<span class="section-kicker">' + escapeHtml(t('philosophy')) + '</span>' +
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
            escapeHtml(localized(cta, 'buttonText') || t('discuss')) +
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
