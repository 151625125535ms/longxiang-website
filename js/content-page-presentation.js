(function (root, factory) {
    'use strict';
    var i18n = root && root.LongxiangContentPresentationI18n;
    if (typeof module === 'object' && module.exports) {
        i18n = require('./content-presentation-i18n');
        module.exports = factory(i18n);
    } else if (root) {
        root.LongxiangContentPagePresentation = factory(i18n);
    }
}(typeof window !== 'undefined' ? window : null, function (i18n) {
    'use strict';

    if (!i18n) throw new Error('Content presentation i18n dependency is missing');

    var SUPPORTED_PAGES = ['home', 'about-us', 'solutions', 'contact'];

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function camelToSnake(value) {
        return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    }

    function hasValue(value) {
        return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
    }

    function repairFrenchText(value, locale) {
        if (locale !== 'fr' || typeof value !== 'string' || value.indexOf('?') === -1) return value;
        return value
            .replace(/\?lectrique/g, 'électrique').replace(/c\?blage/g, 'câblage').replace(/\? valider/g, 'À valider')
            .replace(/p\?rim\?tre/g, 'périmètre').replace(/b\?timents/g, 'bâtiments').replace(/immerg\?s/g, 'immergés')
            .replace(/l\?huile/g, 'l’huile').replace(/d\?usine/g, 'd’usine').replace(/Bo\?te/g, 'Boîte')
            .replace(/\?quipements/g, 'équipements').replace(/capacit\?/g, 'capacité').replace(/r\?seau/g, 'réseau')
            .replace(/\?nerg\?tiques/g, 'énergétiques').replace(/d\?exploitation/g, 'd’exploitation').replace(/\?les/g, 'ôles')
            .replace(/contr\?le/g, 'contrôle').replace(/dur\?e/g, 'durée').replace(/priorit\?/g, 'priorité')
            .replace(/d\?extension/g, 'd’extension').replace(/personnalis\?e/g, 'personnalisée').replace(/\?quipement/g, 'équipement')
            .replace(/adapt\?/g, 'adapté').replace(/r\?els/g, 'réels').replace(/apr\?s/g, 'après')
            .replace(/mod\?le/g, 'modèle').replace(/sp\?cifications/g, 'spécifications').replace(/s\?lection/g, 'sélection')
            .replace(/sch\?ma/g, 'schéma').replace(/l\?environnement/g, 'l’environnement').replace(/d\?installation/g, 'd’installation')
            .replace(/l\?enveloppe/g, 'l’enveloppe').replace(/l\?implantation/g, 'l’implantation').replace(/\?tre/g, 'être')
            .replace(/paramêtres/g, 'paramètres');
    }

    function fallbackText(value, locale, pageSlug) {
        value = String(value == null ? '' : value);
        var trimmed = value.trim();
        if (locale === 'fr' && pageSlug === 'solutions' && i18n.FR_SOLUTIONS_TEXT_FALLBACKS[trimmed]) return i18n.FR_SOLUTIONS_TEXT_FALLBACKS[trimmed];
        if (locale === 'ar' && i18n.ARABIC_TEXT_FALLBACKS[trimmed]) return i18n.ARABIC_TEXT_FALLBACKS[trimmed];
        var pack = i18n.TEXT_FALLBACKS[locale] || {};
        return repairFrenchText(pack[trimmed] || value, locale);
    }

    function localized(item, key, locale, pageSlug) {
        if (!item) return '';
        locale = String(locale || 'en').toLowerCase();
        var direct = item[key];
        var value = '';
        if (direct && typeof direct === 'object' && !Array.isArray(direct) && hasValue(direct[locale])) value = direct[locale];
        if (locale !== 'en') {
            var suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
            var snake = camelToSnake(key);
            var candidates = [key + suffix, snake + '_' + locale, key + '_' + locale];
            for (var i = 0; i < candidates.length; i += 1) {
                if (hasValue(item[candidates[i]])) { value = item[candidates[i]]; break; }
            }
        }
        if (!hasValue(value)) value = hasValue(direct) ? direct : '';
        if (Array.isArray(value)) return value.map(function (entry) { return typeof entry === 'string' ? fallbackText(entry, locale, pageSlug) : entry; });
        var contactPack = pageSlug === 'contact' && (i18n.CONTACT_FIELD_TEXT_FALLBACKS[locale] || {});
        var contactFallback = contactPack && contactPack[key] && item.name ? contactPack[key][item.name] : '';
        if (contactFallback && (!hasValue(value) || value === direct)) return contactFallback;
        return typeof value === 'string' ? fallbackText(value, locale, pageSlug) : value;
    }

    function clone(value) {
        if (Array.isArray(value)) return value.map(clone);
        if (!value || typeof value !== 'object') return value;
        var out = {};
        Object.keys(value).forEach(function (key) { out[key] = clone(value[key]); });
        return out;
    }

    function normalizedKey(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    function merge(base, patch) {
        if (!patch || typeof patch !== 'object') return clone(patch);
        if (Array.isArray(base)) return Array.isArray(patch) ? clone(patch) : applyArrayPatch(base, patch);
        if (!base || typeof base !== 'object' || Array.isArray(patch)) return clone(patch);
        var out = clone(base);
        Object.keys(patch).forEach(function (key) { out[key] = merge(out[key], patch[key]); });
        return out;
    }

    function patchIndex(items, key) {
        var match = /^index_(\d+)$/i.exec(String(key || ''));
        if (match) return Number(match[1]) < items.length ? Number(match[1]) : -1;
        var normalized = normalizedKey(key);
        return items.findIndex(function (item) {
            if (!item || typeof item !== 'object') return false;
            return String(item.id || '') === String(key) || item.slug === key || item.key === key || item.name === key || item.href === key || item.hash === '#' + key || normalizedKey(item.label) === normalized || normalizedKey(item.title) === normalized;
        });
    }

    function applyArrayPatch(items, patch) {
        var out = (items || []).map(clone);
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return out;
        Object.keys(patch).forEach(function (key) {
            var index = patchIndex(out, key);
            if (index >= 0) out[index] = merge(out[index], patch[key]);
        });
        return out;
    }

    function localizeTree(value, locale) {
        if (!value || typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map(function (item) { return localizeTree(item, locale); });
        var out = {};
        Object.keys(value).forEach(function (key) { out[key] = localizeTree(value[key], locale); });
        var suffix = String(locale || 'en').charAt(0).toUpperCase() + String(locale || 'en').slice(1);
        Object.keys(value).forEach(function (key) {
            var camel = key.endsWith('Patch' + suffix) ? key.slice(0, -('Patch' + suffix).length) : '';
            var snakeSuffix = '_patch_' + locale;
            var snake = key.endsWith(snakeSuffix) ? key.slice(0, -snakeSuffix.length) : '';
            var base = camel || snake;
            if (!base || !Object.prototype.hasOwnProperty.call(out, base)) return;
            out[base] = Array.isArray(out[base]) ? applyArrayPatch(out[base], value[key]) : merge(out[base], value[key]);
        });
        return out;
    }

    function context(options, pageSlug) {
        options = options || {};
        var locale = String(options.locale || 'en');
        var prefix = locale === 'en' ? '' : '../';
        return {
            locale: locale,
            isArabic: locale === 'ar',
            pageSlug: pageSlug || '',
            localized: function (item, key) { return localized(item, key, locale, pageSlug); },
            localizedList: function (item, key) {
                var value = localized(item, key, locale, pageSlug);
                return Array.isArray(value) ? value : [];
            },
            asset: function (value) {
                value = String(value || '');
                if (!value || /[\u0000-\u001f\u007f]/.test(value) || /^\/\//.test(value)) return '';
                if (/^https:\/\//i.test(value) || (value.charAt(0) === '/' && value.charAt(1) !== '/')) return value;
                if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
                return prefix + value.replace(/^\.\.\//, '');
            },
            cssAsset: function (value) {
                value = this.asset(value);
                return /["'()\\]/.test(value) ? '' : value;
            },
            iframe: function (value) {
                value = String(value || '').trim();
                return /^https:\/\//i.test(value) && !/[\u0000-\u001f\u007f"']/i.test(value) ? value : '';
            },
            href: function (value) {
                value = String(value || '#');
                if (/[\u0000-\u001f\u007f]/.test(value) || /^\/\//.test(value)) return '#';
                if (/^https:\/\//i.test(value) || value.charAt(0) === '#') return value;
                if (value.charAt(0) === '/' && value.charAt(1) !== '/') return value;
                if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '#';
                return value.replace(/^\/+/, '') || '#';
            }
        };
    }

    function imageHtml(image, className, ctx) {
        if (!image || !image.src) return '';
        return '<img ' + [
            className ? 'class="' + escapeHtml(className) + '"' : '',
            'src="' + escapeHtml(ctx.asset(image.src)) + '"',
            'alt="' + escapeHtml(ctx.localized(image, 'alt')) + '"',
            image.width ? 'width="' + escapeHtml(image.width) + '"' : '',
            image.height ? 'height="' + escapeHtml(image.height) + '"' : '',
            'loading="lazy"',
            'decoding="async"'
        ].filter(Boolean).join(' ') + '>';
    }

    function buttonHtml(button, fallbackClass, ctx) {
        if (!button) return '';
        var label = ctx.localized(button, 'label');
        if (!label) return '';
        var classes = button.className || fallbackClass || 'btn btn-primary';
        if (button.inquiry) {
            return '<button type="button" class="' + escapeHtml(classes) + '" data-open-inquiry data-product-name="' + escapeHtml(ctx.localized(button, 'productName') || label) + '">' + escapeHtml(label) + '</button>';
        }
        return '<a href="' + escapeHtml(ctx.href(button.href || '#')) + '" class="' + escapeHtml(classes) + '">' + escapeHtml(label) + '</a>';
    }

    function listHtml(items, className) {
        if (!items || !items.length) return '';
        return '<ul class="' + escapeHtml(className || 'solution-check-list') + '">' + items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>';
    }

    function safeIconHtml(value) {
        value = String(value || '').trim();
        return /^&#\d+;$/.test(value) ? value : '';
    }

    function renderSolutions(body, ctx) {
        function anchors(value) {
            if (!value || !value.length) return '';
            return '<section class="solutions-anchor-bar" aria-label="' + escapeHtml(ctx.isArabic ? 'أقسام الحلول' : 'Solution sections') + '"><div class="container"><div class="solutions-anchor-list">' + value.map(function (item) {
                return '<a href="' + escapeHtml(ctx.href(item.href || '#')) + '">' + escapeHtml(ctx.localized(item, 'label')) + '</a>';
            }).join('') + '</div></div></section>';
        }
        function overview(value) {
            if (!value) return '';
            return '<section class="section solutions-overview"><div class="container"><div class="section-header"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="solutions-overview-grid" data-stagger="120">' + (value.cards || []).map(function (card, index) {
                return '<article class="solution-overview-card fade-in"><span class="solution-number">' + escapeHtml(card.number || String(index + 1).padStart(2, '0')) + '</span><h3>' + escapeHtml(ctx.localized(card, 'title')) + '</h3><p>' + escapeHtml(ctx.localized(card, 'text')) + '</p>' + listHtml(ctx.localizedList(card, 'items'), 'solution-overview-details') + '</article>';
            }).join('') + '</div></div></section>';
        }
        function market(value) {
            if (!value) return '';
            return '<section class="section market-fit-section"><div class="container"><div class="section-header"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="export-support-grid">' + (value.items || []).map(function (item) {
                return '<div><strong>' + escapeHtml(ctx.localized(item, 'title')) + '</strong><span>' + escapeHtml(ctx.localized(item, 'text')) + '</span></div>';
            }).join('') + '</div></div></section>';
        }
        function panel(value) {
            if (!value) return '';
            return '<div class="solution-om-panel" aria-label="' + escapeHtml(ctx.localized(value, 'label')) + '">' + (value.items || []).map(function (item) {
                return '<div><span class="solution-panel-kicker">' + escapeHtml(ctx.localized(item, 'kicker')) + '</span><strong>' + escapeHtml(item.value || '') + '</strong><p>' + escapeHtml(ctx.localized(item, 'text')) + '</p></div>';
            }).join('') + '<div class="solution-om-route" aria-hidden="true"><span></span><span></span><span></span></div></div>';
        }
        function flow(value) {
            if (!value || !value.items || !value.items.length) return '';
            return '<div class="solution-pv-flow" aria-label="' + escapeHtml(ctx.localized(value, 'label')) + '">' + value.items.map(function (item) { return '<span>' + escapeHtml(ctx.localized(item, 'label')) + '</span>'; }).join('') + '<strong>' + escapeHtml(ctx.localized(value, 'strong')) + '</strong></div>';
        }
        function media(section) {
            var images = section.images || [];
            if (!images.length && !section.panel) return '';
            if (section.imageLayout === 'pv-board') return '<div class="solution-pv-board">' + images.map(function (image, index) { return imageHtml(image, index === 0 ? 'solution-media-main' : '', ctx); }).join('') + flow(section.flow) + '</div>';
            if (section.imageLayout === 'media-stack') return '<div class="solution-media-stack" aria-label="' + escapeHtml(ctx.localized(section, 'mediaLabel')) + '">' + (images[0] ? imageHtml(images[0], 'solution-stack-topology', ctx) : '') + '<div class="solution-stack-devices">' + images.slice(1).map(function (image) { return imageHtml(image, '', ctx); }).join('') + '</div></div>';
            if (section.imageLayout === 'technical-board') return '<div class="solution-technical-board">' + (images[0] ? imageHtml(images[0], '', ctx) : '') + '<div class="solution-board-equipment">' + images.slice(1).map(function (image) { return imageHtml(image, '', ctx); }).join('') + '</div></div>';
            return '<div class="solution-media-cluster" aria-label="' + escapeHtml(ctx.localized(section, 'mediaLabel')) + '">' + images.map(function (image, index) { return imageHtml(image, index === 0 ? 'solution-media-main' : '', ctx); }).join('') + panel(section.panel) + '</div>';
        }
        function feature(section, index) {
            return '<section class="section solution-feature' + (section.reverse ? ' solution-feature-reverse' : '') + (section.light ? ' bg-light' : '') + '" id="' + escapeHtml(section.id || '') + '"><div class="container"><div class="solution-feature-layout"><div class="solution-feature-copy"><span class="solution-index">' + escapeHtml(ctx.localized(section, 'indexLabel') || ('Solution ' + String(index + 1).padStart(2, '0'))) + '</span><h2>' + escapeHtml(ctx.localized(section, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(section, 'text')) + '</p>' + listHtml(ctx.localizedList(section, 'bullets')) + buttonHtml(section.button, 'btn btn-primary', ctx) + '</div>' + media(section) + '</div></div></section>';
        }
        function cardGrid(section) {
            if (!section || !section.cards || !section.cards.length) return '';
            return '<section class="section ' + escapeHtml(section.className || '') + '"><div class="container"><div class="section-header"><h2>' + escapeHtml(ctx.localized(section, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(section, 'text')) + '</p></div><div class="' + escapeHtml(section.gridClass || 'solution-diagram-grid') + '">' + section.cards.map(function (card) {
                return '<article class="' + escapeHtml(section.cardClass || 'solution-diagram-card') + ' fade-in">' + imageHtml(card.image, '', ctx) + '<h3>' + escapeHtml(ctx.localized(card, 'title')) + '</h3>' + (ctx.localized(card, 'text') ? '<p>' + escapeHtml(ctx.localized(card, 'text')) + '</p>' : '') + '</article>';
            }).join('') + '</div></div></section>';
        }
        function credentials(value) {
            if (!value) return '';
            return '<section class="section solution-credibility"><div class="container"><div class="section-header"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="solution-credential-strip">' + (value.items || []).map(function (item) {
                return '<figure>' + imageHtml(item.image, '', ctx) + '<figcaption>' + escapeHtml(ctx.localized(item, 'label')) + '</figcaption></figure>';
            }).join('') + '</div></div></section>';
        }
        function cta(value) {
            if (!value) return '';
            return '<section class="cta-section solutions-cta"><div class="container"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p>' + listHtml(ctx.localizedList(value, 'parameters'), 'solutions-cta-parameters') + '<div class="cta-buttons">' + buttonHtml(value.button, 'btn btn-gold btn-lg', ctx) + '</div></div></section>';
        }
        return anchors(body.anchors) + overview(body.overview) + market(body.marketFit) + (body.sections || []).map(function (section, index) { return section.type === 'card-grid' ? cardGrid(section) : feature(section, index); }).join('') + cardGrid(body.scenarios) + credentials(body.credentials) + cta(body.cta);
    }

    function renderAbout(body, ctx) {
        function snapshot(value) {
            if (!value) return '';
            var video = value.video || {};
            var videoSrc = ctx.iframe(video.src);
            return '<section class="about-snapshot-section"><div class="container"><div class="about-snapshot-card"><div class="about-snapshot-copy"><span class="section-kicker">' + escapeHtml(ctx.localized(value, 'kicker')) + '</span><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2>' + (ctx.localized(value, 'text') ? '<p>' + escapeHtml(ctx.localized(value, 'text')) + '</p>' : '') + (value.body || []).map(function (item) {
                var field = item && item.companyField ? ' data-company-field="' + escapeHtml(item.companyField) + '"' : '';
                var text = typeof item === 'string' ? item : ctx.localized(item, 'text');
                return '<p' + field + '>' + escapeHtml(text) + '</p>';
            }).join('') + '</div><div class="about-snapshot-media"><div class="about-inline-video">' + (videoSrc ? '<iframe title="' + escapeHtml(ctx.localized(video, 'title')) + '" data-consent-category="functional" data-consent-src="' + escapeHtml(videoSrc) + '" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' : '') + '</div><p class="about-video-caption">' + escapeHtml(ctx.localized(video, 'caption')) + '</p></div><div class="about-stats-grid" aria-label="' + escapeHtml(ctx.isArabic ? 'أبرز بيانات الشركة' : 'Company highlights') + '">' + (value.stats || []).map(function (stat) { return '<div class="about-stat"><strong>' + escapeHtml(stat.value || '') + '</strong><span>' + escapeHtml(ctx.localized(stat, 'label')) + '</span></div>'; }).join('') + '</div></div></div></section>';
        }
        function values(value) {
            if (!value || !value.length) return '';
            return '<section class="section about-values-section"><div class="about-values-grid">' + value.map(function (item) {
                var background = ctx.cssAsset(item.image);
                var style = background ? ' style="background-image: url(&quot;' + escapeHtml(background) + '&quot;);"' : '';
                return '<article class="about-value-card"' + style + '><div><span>' + escapeHtml(ctx.localized(item, 'label')) + '</span><h3>' + escapeHtml(ctx.localized(item, 'title')) + '</h3><p>' + escapeHtml(ctx.localized(item, 'text')) + '</p></div></article>';
            }).join('') + '</div></section>';
        }
        function quality(value) {
            if (!value) return '';
            return '<section class="section about-quality-section"><div class="container"><div class="about-quality-layout"><div class="about-quality-copy"><span class="section-kicker">' + escapeHtml(ctx.localized(value, 'kicker')) + '</span><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p><div class="about-quality-list">' + ctx.localizedList(value, 'items').map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join('') + '</div></div><div class="about-cert-board">' + (value.certs || []).map(function (cert) { return '<div class="about-cert-card">' + imageHtml(cert.image, '', ctx) + '<span>' + escapeHtml(ctx.localized(cert, 'label')) + '</span></div>'; }).join('') + '</div></div></div></section>';
        }
        function history() {
            if (!body.milestones || !body.milestones.length) return '';
            var value = body.history || {};
            return '<section class="section about-history-section"><div class="container"><div class="section-header"><span class="section-kicker">' + escapeHtml(ctx.localized(value, 'kicker')) + '</span><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="about-history-rail">' + body.milestones.map(function (item) { return '<article class="about-history-item"><time>' + escapeHtml(ctx.localized(item, 'date') || item.year || '') + '</time><h3>' + escapeHtml(ctx.localized(item, 'title') || item.title_en || item.title_cn || '') + '</h3><p>' + escapeHtml(ctx.localized(item, 'text') || item.description_en || item.description_cn || '') + '</p></article>'; }).join('') + '</div></div></section>';
        }
        function cards(value, sectionClass, gridClass) {
            if (!value) return '';
            return '<section class="section ' + sectionClass + '"><div class="container"><div class="section-header"><span class="section-kicker">' + escapeHtml(ctx.localized(value, 'kicker')) + '</span><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="' + gridClass + '">' + (value.cards || []).map(function (card) { return '<article class="about-capability-card">' + imageHtml(card.image, '', ctx) + '<h3>' + escapeHtml(ctx.localized(card, 'title')) + '</h3><p>' + escapeHtml(ctx.localized(card, 'text')) + '</p></article>'; }).join('') + '</div></div></section>';
        }
        function factory(value) {
            if (!value) return '';
            return '<section class="section about-factory-section"><div class="container"><div class="section-header"><span class="section-kicker">' + escapeHtml(ctx.localized(value, 'kicker')) + '</span><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="about-factory-grid">' + (value.images || []).map(function (item, index) { return '<figure class="about-factory-card' + (index === 0 ? ' about-factory-card-large' : '') + '">' + imageHtml(item.image, '', ctx) + '<figcaption>' + escapeHtml(ctx.localized(item, 'caption')) + '</figcaption></figure>'; }).join('') + '</div></div></section>';
        }
        function markets(value) {
            if (!value) return '';
            return '<section class="about-market-section"><div class="container"><div class="about-market-panel"><div><span class="section-kicker">' + escapeHtml(ctx.localized(value, 'kicker')) + '</span><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div><div class="about-market-tags" aria-label="' + escapeHtml(ctx.isArabic ? 'أسواق التطبيق' : 'Application markets') + '">' + ctx.localizedList(value, 'tags').map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') + '</div></div></div></section>';
        }
        function cta(value) {
            if (!value) return '';
            var background = ctx.cssAsset(value.backgroundImage);
            var style = background ? ' style="--about-cta-bg-image: url(&quot;' + escapeHtml(background) + '&quot;);"' : '';
            return '<section class="about-cta-section"' + style + '><div class="container"><div class="about-cta-panel"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p>' + buttonHtml(value.button, 'btn btn-primary', ctx) + '</div></div></section>';
        }
        return snapshot(body.snapshot) + values(body.values) + quality(body.quality) + history() + cards(body.capability, 'bg-light about-capability-section', 'about-capability-grid') + factory(body.factory) + markets(body.markets) + cta(body.cta);
    }

    function renderContact(body, ctx) {
        var page = body.contactPage || {};
        function socialSvg(name) {
            if (name === 'youtube') return '<svg class="social-brand-icon youtube-brand-icon" viewBox="0 0 24 24" aria-hidden="true"><path class="youtube-back" d="M22.5 12s0-3.5-.45-5.12a3.02 3.02 0 0 0-2.13-2.13C18.3 4.3 12 4.3 12 4.3s-6.3 0-7.92.45a3.02 3.02 0 0 0-2.13 2.13C1.5 8.5 1.5 12 1.5 12s0 3.5.45 5.12a3.02 3.02 0 0 0 2.13 2.13c1.62.45 7.92.45 7.92.45s6.3 0 7.92-.45a3.02 3.02 0 0 0 2.13-2.13C22.5 15.5 22.5 12 22.5 12z"></path><path class="youtube-play" d="M10 15.4V8.6l6 3.4z"></path></svg>';
            return '<svg class="social-brand-icon instagram-brand-icon" viewBox="0 0 24 24" aria-hidden="true"><rect class="instagram-glyph" x="5" y="5" width="14" height="14" rx="4"></rect><circle class="instagram-glyph" cx="12" cy="12" r="3.2"></circle><circle class="instagram-dot" cx="16.8" cy="7.2" r="1.05"></circle></svg>';
        }
        function primary() {
            var mapSrc = ctx.iframe(body.googleMapsEmbedUrl || body.googleMyMapsEmbedUrl || '');
            var socials = [{ key: 'instagram', label: 'Instagram' }, { key: 'youtube', label: 'YouTube' }].filter(function (item) { return body[item.key]; });
            var label = ctx.localized(page, 'factoryAddressLabel');
            return '<section class="section bg-light contact-primary-section"><div class="container"><div class="contact-section"><div class="contact-info-card fade-in-left"><div class="contact-section-heading"><span>' + escapeHtml(ctx.localized(page, 'companyName')) + '</span><h2>' + escapeHtml(ctx.localized(page, 'infoTitle')) + '</h2></div><div class="contact-info-list"><div class="contact-info-row contact-email-row"><span>&#9993;</span><div><strong>' + escapeHtml(ctx.localized(page, 'emailLabel')) + '</strong><a href="mailto:' + escapeHtml(body.email || '') + '">' + escapeHtml(body.email || '') + '</a></div></div><div class="contact-info-row contact-address-row"><span>&#8982;</span><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(ctx.localized(body, 'headquarters') || ctx.localized(body, 'address')) + '</span></div></div><div class="contact-info-row contact-address-row"><span>&#9635;</span><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(ctx.localized(body, 'huaiyangBase')) + '</span></div></div></div>' + (socials.length ? '<div class="contact-social-block"><h4>' + escapeHtml(ctx.localized(page, 'socialTitle')) + '</h4><div class="contact-social-icons">' + socials.map(function (item) { return '<a href="' + escapeHtml(ctx.href(body[item.key])) + '" aria-label="' + escapeHtml(item.label) + '" target="_blank" rel="noopener">' + socialSvg(item.key) + '</a>'; }).join('') + '</div></div>' : '') + '</div><div class="map-placeholder contact-location-panel contact-npc-map-panel fade-in-right">' + (mapSrc ? '<iframe class="contact-map-frame" title="' + escapeHtml(ctx.localized(page, 'mapTitle')) + '" data-consent-category="functional" data-consent-src="' + escapeHtml(mapSrc) + '" width="640" height="480" loading="eager" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' : '') + '</div></div></div></section>';
        }
        function defaultFields(fields) {
            var source = Array.isArray(fields) ? fields.filter(function (field) { return !field || field.name !== 'subject'; }).slice(0) : [];
            var defaults = [
                { name: 'company', label: 'Company', labelAr: 'الشركة', labelFr: 'Entreprise', labelRu: 'Компания', type: 'text' },
                { name: 'country', label: 'Destination Country', labelAr: 'بلد المشروع', labelFr: 'Pays de destination', labelRu: 'Страна назначения', type: 'text' },
                { name: 'productType', label: 'Product Type', labelAr: 'نوع المنتج', labelFr: 'Type de produit', labelRu: 'Тип продукта', type: 'text' },
                { name: 'requiredVoltageOrCapacity', label: 'Required Voltage / Capacity', labelAr: 'الجهد / السعة المطلوبة', labelFr: 'Tension / capacité requise', labelRu: 'Требуемое напряжение / мощность', type: 'text', column: 'right' },
                { name: 'quantityOrScale', label: 'Quantity / Project Scale', labelAr: 'الكمية / حجم المشروع', labelFr: 'Quantité / taille du projet', labelRu: 'Количество / масштаб проекта', type: 'text', column: 'right' },
                { name: 'applicationScenario', label: 'Application Scenario', labelAr: 'سيناريو الاستخدام', labelFr: 'Scénario d’application', labelRu: 'Сценарий применения', type: 'text', column: 'right' }
            ];
            var existing = {};
            source.forEach(function (field) { if (field && field.name) existing[field.name] = true; });
            defaults.forEach(function (field) { if (!existing[field.name]) source.splice(Math.max(0, source.length - 1), 0, field); });
            return source;
        }
        function fieldHtml(field) {
            var id = escapeHtml(field.name || '');
            var required = field.required ? ' required' : '';
            var fieldLabel = ctx.localized(field, 'label');
            var label = escapeHtml(fieldLabel) + (field.required && fieldLabel.indexOf('*') === -1 ? ' *' : '');
            var placeholder = escapeHtml(ctx.localized(field, 'placeholder'));
            if (field.type === 'textarea') return '<div class="form-group form-group-message"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" name="' + id + '" rows="' + escapeHtml(field.rows || 5) + '"' + required + ' placeholder="' + placeholder + '"></textarea></div>';
            if (field.type === 'select') return '<div class="form-group"><label for="' + id + '">' + label + '</label><select id="' + id + '" name="' + id + '"' + required + '>' + (field.options || []).map(function (option) { return '<option value="' + escapeHtml(option.value || '') + '">' + escapeHtml(ctx.localized(option, 'label')) + '</option>'; }).join('') + '</select></div>';
            return '<div class="form-group"><label for="' + id + '">' + label + '</label><input type="' + escapeHtml(field.type || 'text') + '" id="' + id + '" name="' + id + '"' + required + ' placeholder="' + placeholder + '"></div>';
        }
        function form(value) {
            if (!value) return '';
            var fields = defaultFields(value.fields);
            var left = fields.filter(function (field) { return field.column !== 'right'; });
            var right = fields.filter(function (field) { return field.column === 'right'; });
            return '<section class="section contact-form-section"><div class="container"><div class="contact-form-heading fade-in"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'note')) + '</p></div><div class="contact-form contact-page-form fade-in"><form id="contactForm"><input type="hidden" name="subject" value="quote"><div class="contact-inquiry-columns"><div class="contact-inquiry-column">' + left.map(fieldHtml).join('') + '</div><div class="contact-inquiry-column">' + right.map(fieldHtml).join('') + '</div></div><div class="contact-form-footer"><p>' + escapeHtml(ctx.localized(value, 'footerText')) + '</p><button type="submit" class="btn btn-primary">' + escapeHtml(ctx.localized(value, 'submitLabel')) + '</button></div></form></div></div></section>';
        }
        function faq(value) {
            if (!value || !value.items || !value.items.length) return '';
            return '<section class="section bg-light faq-block"><div class="container"><div class="section-header"><h2>' + escapeHtml(ctx.localized(value, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(value, 'text')) + '</p></div>' + value.items.map(function (item) { return '<details><summary>' + escapeHtml(ctx.localized(item, 'question')) + '</summary><p>' + escapeHtml(ctx.localized(item, 'answer')) + '</p></details>'; }).join('') + '</div></section>';
        }
        return primary() + form(page.form) + faq(page.faq);
    }

    function renderHomeSections(body, ctx) {
        function header(section) {
            return '<div class="section-header"><h2>' + escapeHtml(ctx.localized(section, 'title')) + '</h2>' + (ctx.localized(section, 'text') ? '<p>' + escapeHtml(ctx.localized(section, 'text')) + '</p>' : '') + '</div>';
        }
        var applications = body.applications;
        var news = body.news;
        var trust = body.trust;
        var featureTitle = { en: 'Why Choose Longxiang', ar: 'لماذا Longxiang', fr: 'Pourquoi choisir Longxiang', ru: 'Почему выбирают Longxiang' }[ctx.locale];
        return {
            productsHeader: body.products ? header(body.products) : '',
            productsButton: body.products ? { label: ctx.localized(body.products, 'allProductsLabel'), href: ctx.href(body.products.allProductsHref || 'products.html') } : null,
            applicationsHidden: !applications || applications.enabled === false,
            applications: applications && applications.enabled !== false ? '<div class="container"><div class="section-header fade-in"><h2>' + escapeHtml(ctx.localized(applications, 'title')) + '</h2>' + (ctx.localized(applications, 'text') ? '<p>' + escapeHtml(ctx.localized(applications, 'text')) + '</p>' : '') + '</div><div class="home-applications-grid" data-stagger="120">' + (applications.cards || []).map(function (card) { return '<article class="home-application-card fade-in"><h3>' + escapeHtml(ctx.localized(card, 'title')) + '</h3><p>' + escapeHtml(ctx.localized(card, 'text')) + '</p></article>'; }).join('') + '</div><div class="text-center mt-4 fade-in">' + buttonHtml(applications.button, 'btn btn-secondary', ctx) + '</div></div>' : '',
            newsHidden: !news || news.enabled === false,
            news: news && news.enabled !== false ? '<div class="container"><div class="section-header fade-in"><h2>' + escapeHtml(ctx.localized(news, 'title')) + '</h2>' + (ctx.localized(news, 'text') ? '<p>' + escapeHtml(ctx.localized(news, 'text')) + '</p>' : '') + '</div><div class="home-news-grid" data-stagger="120">' + (news.cards || []).map(function (card) { var inner = '<span>' + escapeHtml(card.date || '') + '</span><h3>' + escapeHtml(ctx.localized(card, 'title')) + '</h3><p>' + escapeHtml(ctx.localized(card, 'text')) + '</p>'; return card.href ? '<a class="home-news-card fade-in" href="' + escapeHtml(ctx.href(card.href)) + '">' + inner + '</a>' : '<article class="home-news-card fade-in">' + inner + '</article>'; }).join('') + '</div><div class="text-center mt-4 fade-in">' + buttonHtml(news.button, 'btn btn-secondary', ctx) + '</div></div>' : '',
            trust: trust ? '<div class="container"><div class="section-header fade-in"><h2>' + escapeHtml(ctx.localized(trust, 'title')) + '</h2><p>' + escapeHtml(ctx.localized(trust, 'text')) + '</p></div><div class="trust-logos fade-in">' + (trust.chips || []).map(function (chip) { return '<div class="trust-chip"><strong>' + escapeHtml(ctx.localized(chip, 'title')) + '</strong><span>' + escapeHtml(ctx.localized(chip, 'text')) + '</span></div>'; }).join('') + '</div><div class="testimonials-grid trust-testimonials fade-in">' + (trust.cards || []).map(function (card) { return '<div class="testimonial-card"><p class="testimonial-text">' + escapeHtml(ctx.localized(card, 'text')) + '</p><div class="testimonial-author"><div class="testimonial-author-info"><strong>' + escapeHtml(ctx.localized(card, 'title')) + '</strong><span>' + escapeHtml(ctx.localized(card, 'meta')) + '</span></div></div></div>'; }).join('') + '</div></div>' : '',
            features: body.features && body.features.length ? '<div class="container"><div class="section-header fade-in"><h2>' + escapeHtml(featureTitle) + '</h2></div><div class="features-grid" data-stagger="150">' + body.features.map(function (item) { return '<div class="feature-card fade-in"><div class="feature-icon">' + safeIconHtml(item.icon) + '</div><h4>' + escapeHtml(ctx.localized(item, 'title')) + '</h4><p>' + escapeHtml(ctx.localized(item, 'text')) + '</p></div>'; }).join('') + '</div></div>' : '',
            stats: body.stats && body.stats.length ? '<div class="container"><div class="stats-grid">' + body.stats.map(function (stat) { var count = stat.count || String(stat.value || '').replace(/[^\d]/g, '') || 0; return '<div class="stat-item fade-in"><div class="stat-number" data-count="' + escapeHtml(count) + '">' + escapeHtml(stat.value || count) + '</div><div class="stat-divider"></div><div class="stat-label">' + escapeHtml(ctx.localized(stat, 'label')) + '</div></div>'; }).join('') + '</div></div>' : '',
            cta: body.cta ? '<div class="container"><h2 class="fade-in">' + escapeHtml(ctx.localized(body.cta, 'title')) + '</h2><p class="fade-in">' + escapeHtml(ctx.localized(body.cta, 'text')) + '</p><div class="cta-buttons fade-in">' + buttonHtml(body.cta.button, 'btn btn-gold btn-lg', ctx) + '</div></div>' : ''
        };
    }

    function renderHeroFragments(slug, body, ctx) {
        var hero = body && body.hero || {};
        var result = {
            title: ctx.localized(hero, 'title'),
            subtitle: ctx.localized(hero, 'subtitle'),
            kicker: ctx.localized(hero, 'kicker'),
            actionsHtml: '',
            proofHtml: ''
        };
        if (slug === 'home') {
            result.actionsHtml = (hero.actions || []).map(function (action) {
                return buttonHtml(action, action.className || 'hero-hex-btn', ctx);
            }).join('');
            result.proofHtml = (body.proof || []).map(function (item) {
                return '<span><strong>' + escapeHtml(item.value || '') + '</strong> ' + escapeHtml(ctx.localized(item, 'label')) + '</span>';
            }).join('');
        } else if (slug === 'about-us' || slug === 'solutions') {
            result.actionsHtml = (hero.actions || []).map(function (action, index) {
                return buttonHtml(action, index === 0 ? 'btn btn-primary' : 'btn btn-secondary', ctx);
            }).join('');
        }
        return result;
    }

    function renderPageBody(slug, body, options) {
        if (SUPPORTED_PAGES.indexOf(slug) === -1) throw new Error('Unsupported content page: ' + slug);
        var ctx = context(options, slug);
        body = localizeTree(body || {}, ctx.locale);
        if (slug === 'about-us') return renderAbout(body, ctx);
        if (slug === 'solutions') return renderSolutions(body, ctx);
        if (slug === 'contact') return renderContact(body, ctx);
        return renderHomeSections(body, ctx);
    }

    return {
        SUPPORTED_PAGES: SUPPORTED_PAGES.slice(),
        escapeHtml: escapeHtml,
        localized: localized,
        localizeTree: localizeTree,
        renderHomeSections: function (body, options) { var ctx = context(options, 'home'); return renderHomeSections(localizeTree(body || {}, ctx.locale), ctx); },
        renderHeroFragments: function (slug, body, options) { var ctx = context(options, slug); return renderHeroFragments(slug, localizeTree(body || {}, ctx.locale), ctx); },
        renderPageBody: renderPageBody
    };
}));
