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

    function renderParagraphs(items) {
        return (items || []).map(function (item) {
            return '<p>' + escapeHtml(item) + '</p>';
        }).join('');
    }

    function renderChecklist(items) {
        if (!items || !items.length) return '';
        return '<ul class="education-checklist">' + items.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</ul>';
    }

    function renderPageNav() {
        if (isArabic) return '';
        return '<nav class="education-page-nav" aria-label="Education page sections">' +
            '<div class="container">' +
            '<a href="#industrial-college">Industrial College</a>' +
            '<a href="#cooperation-pillars">Cooperation Pillars</a>' +
            '<a href="#training-scenes">Training Scenes</a>' +
            '<a href="#education-gallery">Gallery</a>' +
            '<a href="#education-contact">Contact Team</a>' +
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
        if (title) title.textContent = (localized(hero, 'title') || 'Education').replace(/School-Enterprise/g, 'School\u2011Enterprise');
        if (subtitle) subtitle.textContent = localized(hero, 'subtitle');
    }

    function renderStats(data) {
        var stats = data.stats || [];
        if (!stats.length) return '';

        return '<section class="stats-section education-stats" id="education-stats">' +
            '<div class="container"><div class="stats-grid">' +
            stats.map(function (stat) {
                var value = stat.value || '';
                var numeric = /^\d+$/.test(value) ? ' data-count="' + escapeHtml(value) + '">' + escapeHtml(value) : '>' + escapeHtml(value);
                return '<div class="stat-item fade-in">' +
                    '<div class="stat-number"' + numeric + '</div>' +
                    '<div class="stat-divider"></div>' +
                    '<div class="stat-label">' + escapeHtml(localized(stat, 'label')) + '</div>' +
                    '</div>';
            }).join('') +
            '</div></div></section>';
    }

    function renderOverview(section) {
        if (!section) return '';
        var body = isArabic && section.bodyAr && section.bodyAr.length ? section.bodyAr : section.body;
        return '<section class="section education-overview" id="industrial-college">' +
            '<div class="container"><div class="about-intro education-intro">' +
            '<div class="about-intro-text fade-in-left">' +
            '<h2>' + escapeHtml(localized(section, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(section, 'summary')) + '</p>' +
            renderParagraphs(body) +
            '</div>' +
            '<div class="about-intro-image fade-in-right">' + imageHtml(section.image, localized(section, 'title')) + '</div>' +
            '</div></div></section>';
    }

    function renderPillars(data) {
        var ids = ['industry-college', 'talent-training', 'training-equipment', 'research-global'];
        var sections = ids.map(function (id) { return findSection(data, id); }).filter(Boolean);
        if (!sections.length) return '';

        return '<section class="section bg-light education-pillars" id="cooperation-pillars">' +
            '<div class="container">' +
            '<div class="section-header fade-in"><h2>Cooperation Pillars</h2>' +
            '<p>Longxiang brings together school-enterprise cooperation, practical teaching, equipment platforms, and research collaboration.</p></div>' +
            '<div class="features-grid education-pillar-grid" data-stagger="120">' +
            sections.map(function (section) {
                return '<article class="feature-card fade-in">' +
                    '<div class="education-card-image">' + imageHtml(section.image || (section.images || [])[0], localized(section, 'title')) + '</div>' +
                    '<h4>' + escapeHtml(localized(section, 'title')) + '</h4>' +
                    '<p>' + escapeHtml(localized(section, 'summary')) + '</p>' +
                    '</article>';
            }).join('') +
            '</div></div></section>';
    }

    function renderScenes(data) {
        var talent = findSection(data, 'talent-training');
        var equipment = findSection(data, 'training-equipment');
        var cards = talent && talent.cards ? talent.cards.slice(0, 2) : [];
        var sceneItems = cards.map(function (card) {
            return {
                title: localized(card, 'title'),
                text: localized(card, 'text'),
                image: card.image,
                points: []
            };
        });

        if (equipment) {
            sceneItems.push({
                title: 'Equipment Platform Practice',
                text: localized(equipment, 'summary'),
                image: (equipment.images || [])[1] || equipment.image,
                points: isArabic && equipment.bodyAr && equipment.bodyAr.length ? equipment.bodyAr : equipment.body
            });
        }

        if (!sceneItems.length) return '';

        return '<section class="section education-scenes" id="training-scenes">' +
            '<div class="container">' +
            '<div class="section-header fade-in"><h2>Training Scenes</h2>' +
            '<p>From classroom discussion to field operation, Longxiang turns engineering practice into visible learning scenarios.</p></div>' +
            '<div class="education-scene-list">' +
            sceneItems.map(function (item, index) {
                return '<article class="education-scene' + (index % 2 ? ' education-scene-reverse' : '') + ' fade-in">' +
                    '<div class="education-scene-media">' + imageHtml(item.image, item.title) + '</div>' +
                    '<div class="education-scene-content">' +
                    '<h3>' + escapeHtml(item.title) + '</h3>' +
                    '<p>' + escapeHtml(item.text) + '</p>' +
                    renderChecklist(item.points) +
                    '</div></article>';
            }).join('') +
            '</div></div></section>';
    }

    function renderGallery(section) {
        if (!section || !section.images || !section.images.length) return '';

        return '<section class="section bg-light education-gallery-section" id="education-gallery">' +
            '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(localized(section, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(section, 'summary')) + '</p></div>' +
            '<div class="gallery-grid education-gallery-grid" data-stagger="80">' +
            section.images.slice(0, 8).map(function (src, index) {
                return '<div class="gallery-item fade-in">' +
                    imageHtml(src, 'Longxiang education cooperation image ' + (index + 1)) +
                    '<div class="gallery-item-overlay"><span>Education Cooperation</span></div>' +
                    '</div>';
            }).join('') +
            '</div></div></section>';
    }

    function renderPlaques(section) {
        if (!section || !section.images || !section.images.length) return '';
        var labels = ['Vocational Education Demonstration', 'Industry-Education Integration', 'Teaching & Production Base'];

        return '<section class="section education-plaques" id="cooperation-platform">' +
            '<div class="container">' +
            '<div class="section-header fade-in"><h2>Recognized Cooperation Platform</h2>' +
            '<p>Longxiang&rsquo;s education work is supported by school-enterprise cooperation bases and industry-education integration platforms.</p></div>' +
            '<div class="education-plaque-grid">' +
            section.images.slice(0, 3).map(function (src, index) {
                return '<article class="education-plaque fade-in">' +
                    imageHtml(src, labels[index]) +
                    '<h4>' + escapeHtml(labels[index] || 'Cooperation Platform') + '</h4>' +
                    '</article>';
            }).join('') +
            '</div></div></section>';
    }

    function renderPhilosophy(section) {
        if (!section) return '';
        var body = isArabic && section.bodyAr && section.bodyAr.length ? section.bodyAr : section.body;
        return '<section class="section bg-light education-philosophy" id="cooperation-philosophy">' +
            '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(localized(section, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(section, 'summary')) + '</p></div>' +
            '<div class="education-philosophy-panel fade-in">' + renderParagraphs(body) + '</div>' +
            '</div></section>';
    }

    function renderCta(data) {
        var cta = data.cta || {};
        return '<section class="cta-section education-cta" id="education-contact">' +
            '<div class="container">' +
            '<h2 class="fade-in">' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p class="fade-in">' + escapeHtml(localized(cta, 'text')) + '</p>' +
            '<div class="cta-buttons fade-in"><a href="' + escapeHtml(cta.href || 'contact.html') + '" class="btn btn-gold btn-lg">' +
            escapeHtml(localized(cta, 'buttonText') || 'Contact Education Team') +
            '</a></div></div></section>';
    }

    function renderPage(data) {
        var industryCollege = findSection(data, 'industry-college');
        var philosophy = findSection(data, 'cooperation-philosophy');
        var gallery = findSection(data, 'gallery');

        renderHero(data);
        pageRoot.innerHTML =
            renderPageNav() +
            renderOverview(industryCollege) +
            renderStats(data) +
            renderPillars(data) +
            renderScenes(data) +
            renderGallery(gallery) +
            renderPlaques(philosophy) +
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
