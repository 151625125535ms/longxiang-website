(function () {
    'use strict';

    var pageRoot = document.querySelector('[data-education-page]');
    var locale = window.LongxiangI18n && window.LongxiangI18n.currentLocale
        ? window.LongxiangI18n.currentLocale()
        : (/\/ar\//.test(window.location.pathname.replace(/\\/g, '/')) ? 'ar' : 'en');
    var isArabic = locale === 'ar';
    var assetPrefix = window.LongxiangI18n && window.LongxiangI18n.assetBasePrefix
        ? window.LongxiangI18n.assetBasePrefix(locale)
        : (isArabic ? '../' : '');

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
        if (window.LongxiangI18n && window.LongxiangI18n.localizedAssetPath) {
            return window.LongxiangI18n.localizedAssetPath(path, locale);
        }
        if (/^(https?:)?\/\//.test(path) || path.charAt(0) === '/') return path;
        return assetPrefix + path;
    }

    var optimizedHeroImages = {
        'assets/education/images/longxiang-electrical-college-hero.png': {
            sources: [
                { maxWidth: 768, src: 'assets/education/images/longxiang-electrical-college-hero-1280.webp' },
                { src: 'assets/education/images/longxiang-electrical-college-hero-1920.webp' }
            ]
        }
    };

    function normalizeAssetKey(path) {
        path = String(path || '').trim().replace(/\\/g, '/').replace(/^\.?\//, '').replace(/^\/+/, '');
        try {
            path = decodeURIComponent(path);
        } catch (err) {
            // Keep the original path when it is not URL encoded.
        }
        return path;
    }

    function selectResponsiveSource(sources) {
        if (!Array.isArray(sources) || !sources.length) return '';
        var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
        for (var i = 0; i < sources.length; i += 1) {
            if (!sources[i].maxWidth || viewportWidth <= sources[i].maxWidth) {
                return sources[i].src;
            }
        }
        return sources[sources.length - 1].src;
    }

    function cssUrl(path) {
        return "url('" + resolveAsset(path).replace(/'/g, "\\'") + "')";
    }

    function setOptimizedHeroBackground(element, path) {
        var optimized = optimizedHeroImages[normalizeAssetKey(path)] || null;
        var source = optimized && optimized.sources ? selectResponsiveSource(optimized.sources) : '';
        element.style.backgroundImage = cssUrl(source || path);
    }

    function backgroundVariableStyle(name, path) {
        path = resolveAsset(path);
        return path ? ' style="--' + escapeHtml(name) + ': url(&quot;' + escapeHtml(path) + '&quot;);"' : '';
    }

    var TEXT_FALLBACKS = {
        fr: {
            'Choose a cooperation path that can be shown, operated, and scaled.': 'Choisissez un parcours de coop\u00e9ration visible, exploitable et \u00e9volutif.',
            'Industrial College': 'Institut industriel',
            'Models': 'Mod\u00e8les',
            'Teaching Equipment': '\u00c9quipements p\u00e9dagogiques'
        },
        ru: {
            'Choose a cooperation path that can be shown, operated, and scaled.': '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043e\u0440\u043c\u0430\u0442 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0430, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043c\u043e\u0436\u043d\u043e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c, \u0432\u043d\u0435\u0434\u0440\u0438\u0442\u044c \u0438 \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043e\u0432\u0430\u0442\u044c.',
            'Industrial College': '\u0418\u043d\u0434\u0443\u0441\u0442\u0440\u0438\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u043e\u043b\u043b\u0435\u0434\u0436',
            'Models': '\u041c\u043e\u0434\u0435\u043b\u0438',
            'Teaching Equipment': '\u0423\u0447\u0435\u0431\u043d\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435',
            'Education Cooperation': '\u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u043e',
            'Education Cooperation | Henan Longxiang Electrical Co., Ltd.': '\u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u043e | Henan Longxiang Electrical Co., Ltd.',
            'Four cooperation models': '\u0427\u0435\u0442\u044b\u0440\u0435 \u043c\u043e\u0434\u0435\u043b\u0438 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0430',
            'FOUR COOPERATION MODELS': '\u0427\u0435\u0442\u044b\u0440\u0435 \u043c\u043e\u0434\u0435\u043b\u0438 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0430',
            'Industrial college planning and cooperation framework': '\u041f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0438\u043d\u0434\u0443\u0441\u0442\u0440\u0438\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043a\u043e\u043b\u043b\u0435\u0434\u0436\u0430 \u0438 \u0444\u043e\u0440\u043c\u0430\u0442 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0430',
            'Longxiang integrates university and research institute resources to support technical innovation, achievement transformation, and international industry-education cooperation.': 'Longxiang \u043e\u0431\u044a\u0435\u0434\u0438\u043d\u044f\u0435\u0442 \u0440\u0435\u0441\u0443\u0440\u0441\u044b \u0443\u043d\u0438\u0432\u0435\u0440\u0441\u0438\u0442\u0435\u0442\u043e\u0432 \u0438 \u043d\u0430\u0443\u0447\u043d\u043e-\u0438\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u0438\u0445 \u0438\u043d\u0441\u0442\u0438\u0442\u0443\u0442\u043e\u0432 \u0434\u043b\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0438\u043d\u043d\u043e\u0432\u0430\u0446\u0438\u0439, \u0442\u0440\u0430\u043d\u0441\u0444\u0435\u0440\u0430 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0438 \u043c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u043e\u0433\u043e \u043e\u0442\u0440\u0430\u0441\u043b\u0435\u0432\u043e-\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u0430.'
        }
    };

    function textFallback(value) {
        if (typeof value !== 'string') return '';
        var pack = TEXT_FALLBACKS[locale] || {};
        return pack[value.trim()] || '';
    }

    function localized(item, key) {
        if (!item) return '';
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, key, locale);
            var fallbackValue = textFallback(value);
            if (fallbackValue) return fallbackValue;
            if (value) return value;
        }
        if (isArabic && item[key + 'Ar']) return item[key + 'Ar'];
        return textFallback(item[key]) || item[key] || '';
    }

    function localizedList(item, key) {
        if (!item) return [];
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, key, locale);
            if (Array.isArray(value) && value.length) {
                if (locale !== 'ru') return value;
                return value.map(function (entry) {
                    return typeof entry === 'string' ? (textFallback(entry) || entry) : entry;
                });
            }
        }
        if (isArabic && item[key + 'Ar'] && item[key + 'Ar'].length) return item[key + 'Ar'];
        return (item[key] || []).map(function (entry) {
            return typeof entry === 'string' ? (textFallback(entry) || entry) : entry;
        });
    }

    function t(key) {
        var labelsByLocale = {
            en: {
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
            },
            ar: {
                pageNav: 'أقسام صفحة التعليم',
                models: 'النماذج',
                industrialCollege: 'الكلية الصناعية',
                talentTraining: 'تدريب المواهب',
                teachingEquipment: 'معدات التدريب',
                researchGlobal: 'البحث والتعاون الدولي',
                contact: 'تواصل معنا',
                fourModels: 'أربعة نماذج للتعاون',
                introTitle: 'اختر مسار تعاون قابل للعرض والتشغيل والتوسع.',
                introText: 'توفر Longxiang حلول تعاون تعليمي تشمل بناء المنصات وتنمية المواهب وتسليم معدات التدريب والتعاون الدولي.',
                bestFor: 'مناسب لـ',
                delivers: 'ما الذي تقدمه Longxiang',
                outcomes: 'نتائج الشريك',
                proofAlt: 'صورة تعاون تعليمي من Longxiang',
                proofOverlay: 'دليل التعاون',
                philosophy: 'فلسفة التعاون',
                discuss: 'ناقش التعاون'
            },
            fr: {
                pageNav: 'Sections de la page education',
                models: 'Modeles',
                industrialCollege: 'Institut industriel',
                talentTraining: 'Formation des talents',
                teachingEquipment: 'Equipements pedagogiques',
                researchGlobal: 'R&D + international',
                contact: 'Contact',
                fourModels: 'Quatre modeles de cooperation',
                introTitle: 'Choisissez un parcours de cooperation visible, exploitable et evolutif.',
                introText: 'Longxiang organise la cooperation formation-industrie autour de plateformes, du developpement des talents, des equipements pedagogiques et de la recherche internationale.',
                bestFor: 'Adapte a',
                delivers: 'Ce que Longxiang fournit',
                outcomes: 'Resultats pour le partenaire',
                proofAlt: 'Image de cooperation formation-industrie Longxiang',
                proofOverlay: 'Preuve de cooperation',
                philosophy: 'Philosophie de cooperation',
                discuss: 'Discuter de la cooperation'
            },
            ru: {
                pageNav: 'Разделы страницы образования',
                models: 'Модели',
                industrialCollege: 'Индустриальный колледж',
                talentTraining: 'Подготовка специалистов',
                teachingEquipment: 'Учебное оборудование',
                researchGlobal: 'НИОКР и международное сотрудничество',
                contact: 'Контакты',
                fourModels: 'Четыре модели сотрудничества',
                introTitle: 'Выберите формат сотрудничества, который можно показать, внедрить и масштабировать.',
                introText: 'Longxiang объединяет платформы, развитие кадров, учебное оборудование, исследования и международное развитие в практичные образовательные решения.',
                bestFor: 'Подходит для',
                delivers: 'Что предоставляет Longxiang',
                outcomes: 'Результаты для партнера',
                proofAlt: 'Изображение образовательного сотрудничества Longxiang',
                proofOverlay: 'Подтверждение сотрудничества',
                philosophy: 'Философия сотрудничества',
                discuss: 'Обсудить сотрудничество'
            }
        };
        var labels = labelsByLocale[locale] || labelsByLocale.en;
        return labels[key] || key;
    }


    function setMetaTag(attribute, key, value) {
        if (!value) return;
        var selector = 'meta[' + attribute + '="' + key + '"]';
        var meta = document.querySelector(selector);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, key);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', value);
    }

    function setCanonicalLink(path) {
        if (!path) return;
        var link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        var canonicalPath = String(path || '').trim();
        if (window.LongxiangI18n && window.LongxiangI18n.baseStaticPathFromLocalizedPath && window.LongxiangI18n.localizedStaticPath) {
            canonicalPath = window.LongxiangI18n.localizedStaticPath(
                window.LongxiangI18n.baseStaticPathFromLocalizedPath('/' + canonicalPath.replace(/^\/+/, '')),
                locale
            );
        } else if (isArabic && canonicalPath === 'education.html') {
            canonicalPath = 'ar/education.html';
        }
        try {
            link.setAttribute('href', new URL(canonicalPath.replace(/^\/+/, ''), window.location.origin + '/').href);
        } catch (err) {
            link.setAttribute('href', canonicalPath);
        }
    }

    function absoluteAssetUrl(path) {
        if (!path) return '';
        if (/^(https?:)?\/\//.test(path)) return path;
        try {
            return new URL(resolveAsset(path), window.location.href).href;
        } catch (err) {
            return resolveAsset(path);
        }
    }

    function applyEducationSeo(data) {
        var seo = data && data.seo ? data.seo : {};
        var title = localized(seo, 'title');
        var description = localized(seo, 'description');
        var image = absoluteAssetUrl(seo.image);

        if (title) {
            document.title = title;
            setMetaTag('property', 'og:title', title);
        }
        if (description) {
            setMetaTag('name', 'description', description);
            setMetaTag('property', 'og:description', description);
        }
        if (image) setMetaTag('property', 'og:image', image);
        if (seo.canonicalPath) setCanonicalLink(seo.canonicalPath);
    }

    function fetchJson(url, fallbackUrl) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .catch(function (err) {
                if (!fallbackUrl) throw err;
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
        return '<img src="' + escapeHtml(resolveAsset(src)) + '" alt="' + escapeHtml(alt || '') + '" loading="lazy" decoding="async" width="960" height="640">';
    }

    function renderList(items) {
        if (!items || !items.length) return '';
        return '<ul class="education-checklist">' + items.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</ul>';
    }

    function renderBodyParagraphs(items) {
        if (!items || !items.length) return '';
        return '<div class="education-mode-body">' + items.map(function (item) {
            return '<p>' + escapeHtml(item) + '</p>';
        }).join('') + '</div>';
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
            setOptimizedHeroBackground(heroEl, hero.backgroundImage);
        }

        var title = heroEl.querySelector('h1');
        var subtitle = heroEl.querySelector('p');
        var eyebrow = localized(hero, 'eyebrow');
        var kicker = heroEl.querySelector('.education-hero-kicker');
        if (!kicker && eyebrow && title) {
            kicker = document.createElement('span');
            kicker.className = 'education-hero-kicker section-kicker';
            title.parentNode.insertBefore(kicker, title);
        }
        if (kicker) {
            kicker.textContent = eyebrow;
            kicker.hidden = !eyebrow;
        }
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
        var intro = data.intro || {};
        var kicker = localized(intro, 'kicker') || t('fourModels');
        var title = localized(intro, 'title') || t('introTitle');
        var text = localized(intro, 'text') || t('introText');

        return '<section class="section education-conversion" id="cooperation-models">' +
            '<div class="container">' +
            '<div class="education-conversion-head fade-in">' +
            '<span class="section-kicker">' + escapeHtml(kicker) + '</span>' +
            '<h2>' + escapeHtml(title) + '</h2>' +
            '<p>' + escapeHtml(text) + '</p>' +
            '</div>' +
            '<div class="education-model-grid">' +
            sections.map(function (section) {
                return '<a class="education-model-card fade-in" href="#' + escapeHtml(section.id) + '">' +
                    '<span>' + escapeHtml(section.modeNumber || '') + '</span>' +
                    '<h3>' + escapeHtml(localized(section, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(section, 'tagline') || localized(section, 'summary')) + '</p>' +
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
            renderBodyParagraphs(localizedList(section, 'body')) +
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
            section.images.slice(0, 9).map(function (src, index) {
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
        var kicker = localized(section, 'title') || t('philosophy');
        return '<section class="section education-philosophy" id="cooperation-philosophy">' +
            '<div class="container">' +
            '<div class="education-philosophy-panel fade-in">' +
            '<span class="section-kicker">' + escapeHtml(kicker) + '</span>' +
            '<h2>' + escapeHtml(localized(section, 'summary')) + '</h2>' +
            body.map(function (item) { return '<p>' + escapeHtml(item) + '</p>'; }).join('') +
            '</div></div></section>';
    }

    function renderCta(data) {
        var cta = data.cta || {};
        return '<section class="cta-section education-cta" id="education-contact"' + backgroundVariableStyle('education-cta-bg-image', cta.backgroundImage) + '>' +
            '<div class="container">' +
            '<h2 class="fade-in">' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p class="fade-in">' + escapeHtml(localized(cta, 'text')) + '</p>' +
            '<div class="cta-buttons fade-in"><a href="' + escapeHtml(cta.href || 'contact.html') + '" class="btn btn-gold btn-lg">' +
            escapeHtml(localized(cta, 'buttonText') || t('discuss')) +
            '</a></div></div></section>';
    }

    function renderPage(data) {
        if (window.LongxiangI18n && window.LongxiangI18n.localizeContentTree) {
            data = window.LongxiangI18n.localizeContentTree(data || {}, locale);
        }
        var philosophy = findSection(data, 'cooperation-philosophy');
        var gallery = findSection(data, 'gallery');
        var sections = cooperationSections(data);

        applyEducationSeo(data);
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

    fetchJson('/api/education')
        .then(renderPage)
        .catch(function () {
            pageRoot.setAttribute('data-education-fallback', 'static');
        });
})();
