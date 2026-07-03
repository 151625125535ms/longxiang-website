(function () {
    'use strict';

    var pageRoot = document.querySelector('[data-content-page]');
    if (!pageRoot) return;

    var pageSlug = pageRoot.getAttribute('data-content-page');
    var locale = window.LongxiangI18n && window.LongxiangI18n.currentLocale
        ? window.LongxiangI18n.currentLocale()
        : (/\/ar\//.test(window.location.pathname.replace(/\\/g, '/')) ? 'ar' : 'en');
    var isArabic = locale === 'ar';
    var assetPrefix = window.LongxiangI18n && window.LongxiangI18n.assetBasePrefix
        ? window.LongxiangI18n.assetBasePrefix(locale)
        : (isArabic ? '../' : '');
    var ARABIC_CHAT_APP_NAME = '\u0648\u0627\u062a\u0633\u0627\u0628';
    var ARABIC_TEXT_FALLBACKS = {
        'Home': 'الرئيسية',
        'Products': 'المنتجات',
        'Product Details': 'تفاصيل المنتج',
        'Contact Us': 'اتصل بنا',
        'Contact': 'اتصل بنا',
        'About Us': 'من نحن',
        'Applications': 'التطبيقات',
        'Certificates': 'الشهادات',
        'Henan Longxiang Electrical': 'شركة خنان لونغشيانغ إلكتريكال',
        'Energy-saving power equipment for industrial, utility, and renewable energy projects.': 'معدات كهربائية موفرة للطاقة للمشروعات الصناعية ومرافق الطاقة والطاقة المتجددة.',
        'Longxiang Electrical logo': 'شعار لونغشيانغ إلكتريكال',
        'View Products': 'عرض المنتجات',
        'years of electrical equipment experience': 'سنة من الخبرة في معدات الكهرباء',
        'patents and technical achievements': 'براءة وإنجاز تقني',
        'project applications': 'تطبيق مشروع',
        'Explore transformers, switchgear, and integrated power distribution solutions.': 'استكشف المحولات ومعدات المفاتيح وحلول توزيع الطاقة المتكاملة.',
        'All Products': 'جميع المنتجات',
        'Application Industries': 'قطاعات التطبيق',
        'Longxiang equipment supports industrial power distribution, grid upgrades, renewable energy, and infrastructure projects.': 'تدعم معدات لونغشيانغ توزيع الطاقة الصناعية وتحديث الشبكات والطاقة المتجددة ومشروعات البنية التحتية.',
        'View Solutions': 'عرض الحلول',
        'Industrial Power': 'الطاقة الصناعية',
        'Stable transformer and switchgear support for factories and parks.': 'دعم مستقر بالمحولات ومعدات المفاتيح للمصانع والمجمعات الصناعية.',
        'Renewable Energy': 'الطاقة المتجددة',
        'Equipment support for photovoltaic, wind, and storage scenarios.': 'دعم بالمعدات لمشروعات الطاقة الشمسية وطاقة الرياح وأنظمة التخزين.',
        'Infrastructure': 'البنية التحتية',
        'Power distribution solutions for public and commercial projects.': 'حلول توزيع الطاقة للمشروعات العامة والتجارية.',
        'News & Updates': 'الأخبار والتحديثات',
        'Follow Longxiang project updates, technical progress, and company news.': 'تابع تحديثات مشروعات لونغشيانغ والتقدم التقني وأخبار الشركة.',
        'Contact for Updates': 'تواصل للاطلاع على التحديثات',
        'Trusted Manufacturing Capability': 'قدرات تصنيع موثوقة',
        'Longxiang combines manufacturing, quality control, and project delivery experience.': 'تجمع لونغشيانغ بين التصنيع وضبط الجودة وخبرة تسليم المشروعات.',
        'Energy Efficiency': 'كفاءة الطاقة',
        'Focused on low-loss, reliable power equipment.': 'تركيز على معدات طاقة موثوقة ومنخفضة الفقد.',
        'Project Support': 'دعم المشروعات',
        'Suitable for industrial, grid, and renewable energy scenarios.': 'مناسبة للقطاعات الصناعية والشبكات ومشروعات الطاقة المتجددة.',
        'Quality Control': 'ضبط الجودة',
        'Standardized production and inspection processes.': 'عمليات إنتاج وفحص معيارية.',
        'Years Experience': 'سنة خبرة',
        'Patents': 'براءة اختراع',
        'Projects': 'مشروع',
        'Send Inquiry': 'إرسال استفسار',
        'Need a power distribution solution?': 'هل تحتاج إلى حل لتوزيع الطاقة؟',
        'Tell us your voltage, capacity, and project scenario. Our team will help match the right equipment.': 'أخبرنا بالجهد والسعة وسيناريو المشروع، وسيساعدك فريقنا في اختيار المعدات المناسبة.',
        'Contact Longxiang': 'التواصل مع لونغشيانغ',
        'Phone': 'رقم الهاتف',
        'Email': 'البريد الإلكتروني',
        'Address': 'العنوان',
        'Longxiang Location': 'موقع لونغشيانغ',
        'Social Media': 'وسائل التواصل الاجتماعي',
        'Send Inquiry': 'إرسال استفسار',
        'Leave your contact details and project requirements.': 'اترك بيانات الاتصال ومتطلبات المشروع.',
        'We will respond after receiving your message.': 'سنرد بعد استلام رسالتك.',
        'Submit Inquiry': 'إرسال الاستفسار',
        'Name': 'الاسم',
        'Message': 'الرسالة',
        'Send your project requirements and our team will respond quickly.': 'أرسل متطلبات مشروعك وسيتواصل فريقنا معك بسرعة.',
        'Products': 'المنتجات',
        'Browse Longxiang transformers, switchgear, and power distribution equipment.': 'تصفح محولات لونغشيانغ ومعدات المفاتيح ومعدات توزيع الطاقة.',
        'Review product information and request a quotation.': 'راجع معلومات المنتج واطلب عرض سعر.',
        'Overview': 'نظرة عامة',
        'Specifications': 'المواصفات',
        'Request a Quote': 'طلب عرض سعر',
        'Related Products': 'منتجات ذات صلة',
        'Product Inquiry': 'استفسار عن المنتج',
        'Leave your contact details and requirements.': 'اترك بيانات الاتصال ومتطلباتك.',
        'Product Support': 'دعم المنتجات',
        'Filter by product category and contact us for model selection support.': 'صف المنتجات حسب الفئة وتواصل معنا لدعم اختيار الطراز.',
        'Need model selection help?': 'هل تحتاج إلى مساعدة في اختيار الطراز؟',
        'Send us your project parameters and application scenario.': 'أرسل لنا معايير المشروع وسيناريو التطبيق.',
        'Technical Support': 'الدعم الفني',
        'Our team can help confirm parameters, voltage levels, and delivery requirements.': 'يمكن لفريقنا مساعدتك في تأكيد المعايير ومستويات الجهد ومتطلبات التسليم.',
        'About Longxiang': 'عن لونغشيانغ',
        'Reliable power equipment manufacturing for industrial, grid, and energy projects.': 'تصنيع موثوق لمعدات الطاقة للمشروعات الصناعية ومشروعات الشبكات والطاقة.',
        'Company Profile': 'نبذة عن الشركة',
        'Power equipment manufacturing capability': 'قدرات تصنيع معدات الطاقة',
        'Longxiang focuses on transformers, switchgear, and supporting power distribution equipment.': 'تركز لونغشيانغ على المحولات ومعدات المفاتيح ومعدات دعم توزيع الطاقة.',
        'The company supports industrial, infrastructure, and energy project scenarios.': 'تدعم الشركة سيناريوهات المشروعات الصناعية والبنية التحتية ومشروعات الطاقة.',
        'Production and inspection processes are organized around reliable delivery and practical operation.': 'تُنظم عمليات الإنتاج والفحص بما يضمن التسليم الموثوق والتشغيل العملي.',
        'Years of experience': 'سنة خبرة',
        'Technical achievements': 'إنجاز تقني',
        'Longxiang manufacturing capability': 'قدرات لونغشيانغ التصنيعية',
        'Quality Credentials': 'شهادات الجودة',
        'Qualification and quality control': 'الاعتمادات وضبط الجودة',
        'Qualification materials, inspection routines, and production management support reliable delivery.': 'تدعم مواد الاعتماد وإجراءات الفحص وإدارة الإنتاج التسليم الموثوق.',
        'Standardized production': 'إنتاج معياري',
        'Inspection process': 'إجراءات الفحص',
        'Development': 'التطور',
        'Longxiang development history': 'تاريخ تطور لونغشيانغ',
        'Review key stages of Longxiang manufacturing and project service capability.': 'استعرض المراحل الرئيسية لتطور قدرات لونغشيانغ في التصنيع وخدمة المشروعات.',
        'Manufacturing Foundation': 'تأسيس التصنيع',
        'Longxiang began building power equipment production capability.': 'بدأت لونغشيانغ في بناء قدراتها لإنتاج معدات الطاقة.',
        'Today': 'اليوم',
        'Energy-Saving Equipment': 'معدات موفرة للطاقة',
        'The company continues to serve industrial and energy projects.': 'تواصل الشركة خدمة المشروعات الصناعية ومشروعات الطاقة.',
        'Discuss Your Equipment Requirements': 'ناقش متطلبات معداتك',
        'Share your project scenario and our team will help match suitable products.': 'شاركنا سيناريو مشروعك وسيساعدك فريقنا في اختيار المنتجات المناسبة.',
        'Solutions': 'الحلول',
        'Power equipment solutions for industry, infrastructure, and new energy.': 'حلول معدات الطاقة للصناعة والبنية التحتية والطاقة الجديدة.',
        'Application-Oriented Solutions': 'حلول موجهة حسب التطبيق',
        'Select equipment and service support by project scenario.': 'اختر المعدات ودعم الخدمة وفقاً لسيناريو المشروع.',
        'Project Fit': 'ملاءمة المشروع',
        'Designed for stable operation and practical deployment.': 'مصممة للتشغيل المستقر والتنفيذ العملي.',
        'Scenarios': 'السيناريوهات',
        'Credentials': 'الاعتمادات',
        'Discuss Your Project': 'ناقش مشروعك',
        'Share your project requirements with us.': 'شاركنا متطلبات مشروعك.',
        'Common Questions': 'الأسئلة الشائعة',
        'Contact us for model selection, quotation, and project support.': 'تواصل معنا لاختيار الطراز وطلب عرض السعر ودعم المشروع.',
        'What information should I provide?': 'ما المعلومات التي ينبغي تقديمها؟',
        'Please share voltage level, capacity, quantity, application scenario, and destination if available.': 'يرجى تزويدنا بمستوى الجهد والسعة والكمية وسيناريو التطبيق والوجهة إن توفرت.',
        'Can Longxiang support model selection?': 'هل يمكن للونغشيانغ دعم اختيار الطراز؟',
        'Yes. Our team can provide product matching suggestions based on your project requirements.': 'نعم. يمكن لفريقنا تقديم اقتراحات مطابقة المنتجات بناءً على متطلبات مشروعك.'
    };
    var TEXT_FALLBACKS = {
        fr: {
            'About Longxiang': '\u00c0 propos de Longxiang',
            'Certificates': 'Certificats',
            'Certificates & Qualification Archive': 'Archives des certificats et qualifications',
            'Enterprise Qualifications': 'Qualifications de l\u2019entreprise',
            'EXPLORE SOLUTIONS': 'Explorer les solutions',
            'Integrated Smart Energy': '\u00c9nergie intelligente int\u00e9gr\u00e9e',
            'Integrated Smart Energy & Power Distribution Solutions': 'Solutions d\u2019\u00e9nergie intelligente int\u00e9gr\u00e9e et de distribution \u00e9lectrique',
            'Integrated Smart Energy & distribution \u00e9lectrique Solutions': 'Solutions d\u2019\u00e9nergie intelligente int\u00e9gr\u00e9e et de distribution \u00e9lectrique',
            'Patent Certificates': 'Certificats de brevet',
            'Qualification materials': 'Documents de qualification',
            'Qualification materials for procurement and technical due diligence': 'Documents de qualification pour les achats et la revue technique',
            'Solutions by Project Scenario': 'Solutions par sc\u00e9nario de projet',
            'Solutions by projet Scenario': 'Solutions par sc\u00e9nario de projet',
            '*Your information is protected and used only for Longxiang technical consultation and quotation follow-up.': '*Vos informations sont prot\u00e9g\u00e9es et utilis\u00e9es uniquement pour la consultation technique Longxiang et le suivi des devis.'
        }
    };
    var PAGE_TEXT_FALLBACKS = {
        fr: {
            productDetailTitle: 'Détails du produit',
            productDetailSubtitle: 'Consultez les informations produit, les spécifications et les détails de demande.',
            productDetailSpecsTitle: 'Spécifications',
            productDetailSupportTitle: 'Support produit',
            productDetailFaqTitle: 'Questions fréquentes',
            productInquiryTitle: 'Demande produit',
            productInquiryNote: 'Laissez vos coordonnées et les exigences du projet.',
            productInquirySubmit: 'Envoyer la demande',
            contactSeoTitle: 'Contactez Longxiang | Henan Longxiang Electrical',
            contactSeoDescription: 'Contactez Longxiang pour une sélection de modèles, un devis et un support de projet.',
            contactHeroTitle: 'Contactez-nous',
            contactHeroSubtitle: 'Parlez-nous de vos besoins en équipements électriques et de votre calendrier de projet.',
            contactInfoTitle: 'Coordonnées',
            contactOfficeLabel: 'Téléphone',
            contactEmailLabel: 'E-mail',
            contactAddressLabel: 'Adresse',
            contactSocialTitle: 'Réseaux sociaux',
            contactMapTitle: 'Carte de Longxiang',
            contactFormTitle: 'Envoyer une demande',
            contactFormNote: 'Laissez vos coordonnées et les exigences du projet.',
            contactFormFooterText: 'Nous vous répondrons après réception de votre message.',
            contactFormSubmit: 'Envoyer',
            contactFaqTitle: 'Questions fréquentes',
            contactFaqText: 'Réponses rapides pour les premières demandes de projet.',
            productDetailSupportLoading: 'Chargement du support produit...',
            productDetailFaqLoading: 'Chargement des questions fréquentes...',
            productDetailInquiryLoading: 'Chargement du formulaire de demande...',
            compareTitle: 'Comparaison de produits',
            compareSubtitle: 'Comparez les modèles sélectionnés et leurs principales spécifications.',
            compareSeoTitle: 'Comparaison de produits | Longxiang Electrical',
            compareSeoDescription: 'Comparez côte à côte les modèles d’équipements Longxiang sélectionnés.',
            compareBack: 'Retour',
            comparePrint: 'Imprimer',
            compareLoading: 'Chargement de la comparaison...'
        },
        ru: {
            productDetailTitle: 'Информация о продукте',
            productDetailSubtitle: 'Просмотрите информацию о продукте, характеристики и форму запроса.',
            productDetailSpecsTitle: 'Характеристики',
            productDetailSupportTitle: 'Поддержка продукта',
            productDetailFaqTitle: 'Частые вопросы',
            productInquiryTitle: 'Запрос по продукту',
            productInquiryNote: 'Оставьте контактные данные и требования проекта.',
            productInquirySubmit: 'Отправить запрос',
            contactSeoTitle: 'Свяжитесь с Longxiang | Henan Longxiang Electrical',
            contactSeoDescription: 'Свяжитесь с Longxiang для подбора модели, расчета стоимости и поддержки проекта.',
            contactHeroTitle: 'Свяжитесь с нами',
            contactHeroSubtitle: 'Расскажите нам о потребностях в электрооборудовании и графике проекта.',
            contactInfoTitle: 'Контактная информация',
            contactOfficeLabel: 'Телефон',
            contactEmailLabel: 'Электронная почта',
            contactAddressLabel: 'Адрес',
            contactSocialTitle: 'Социальные сети',
            contactMapTitle: 'Карта Longxiang',
            contactFormTitle: 'Отправить запрос',
            contactFormNote: 'Оставьте контактные данные и требования проекта.',
            contactFormFooterText: 'Мы ответим после получения вашего сообщения.',
            contactFormSubmit: 'Отправить',
            contactFaqTitle: 'Частые вопросы',
            contactFaqText: 'Краткие ответы для первичных запросов по проектам.',
            productDetailSupportLoading: 'Загрузка поддержки продукта...',
            productDetailFaqLoading: 'Загрузка часто задаваемых вопросов...',
            productDetailInquiryLoading: 'Загрузка формы запроса...',
            compareTitle: 'Сравнение продукции',
            compareSubtitle: 'Сравните выбранные модели и основные технические характеристики.',
            compareSeoTitle: 'Сравнение продукции | Longxiang Electrical',
            compareSeoDescription: 'Сравните выбранные модели оборудования Longxiang рядом друг с другом.',
            compareBack: 'Назад',
            comparePrint: 'Печать',
            compareLoading: 'Загрузка сравнения...'
        }
    };
    var CONTACT_FIELD_TEXT_FALLBACKS = {
        fr: {
            label: {
                name: 'Nom complet',
                phone: 'Téléphone',
                productType: 'Type de produit',
                quantityOrScale: 'Quantité / taille du projet',
                message: 'Message',
                applicationScenario: 'Scénario d’application',
                email: 'Adresse e-mail',
                company: 'Nom de l’entreprise',
                country: 'Pays',
                requiredVoltageOrCapacity: 'Tension / capacité requise'
            },
            placeholder: {
                name: 'Votre nom',
                phone: 'Votre numéro de téléphone',
                productType: 'Transformateur, appareillage, borne de recharge...',
                quantityOrScale: 'Quantité ou taille du projet',
                message: 'Décrivez vos besoins de projet',
                applicationScenario: 'Usine, projet photovoltaïque, station de recharge...',
                email: 'Votre adresse e-mail',
                company: 'Votre entreprise',
                country: 'Pays ou région',
                requiredVoltageOrCapacity: 'Tension, capacité ou puissance'
            }
        },
        ru: {
            label: {
                name: 'Полное имя',
                phone: 'Телефон',
                productType: 'Тип продукта',
                quantityOrScale: 'Количество / масштаб проекта',
                message: 'Сообщение',
                applicationScenario: 'Сценарий применения',
                email: 'Электронная почта',
                company: 'Название компании',
                country: 'Страна',
                requiredVoltageOrCapacity: 'Требуемое напряжение / мощность'
            },
            placeholder: {
                name: 'Ваше имя',
                phone: 'Ваш номер телефона',
                productType: 'Трансформатор, КРУ, зарядная станция...',
                quantityOrScale: 'Количество или масштаб проекта',
                message: 'Опишите требования проекта',
                applicationScenario: 'Завод, солнечный проект, зарядная станция...',
                email: 'Ваш адрес электронной почты',
                company: 'Ваша компания',
                country: 'Страна или регион',
                requiredVoltageOrCapacity: 'Напряжение, емкость или мощность'
            }
        }
    };

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
        if (window.LongxiangI18n && window.LongxiangI18n.localizedAssetPath) {
            return window.LongxiangI18n.localizedAssetPath(path, locale);
        }
        if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/' || /^data:/i.test(path)) return path;
        return assetPrefix + path.replace(/^\/+/, '');
    }

    var optimizedImages = {
        'longxiang-logo-symbol.png': {
            src: 'assets/optimized/longxiang-logo-symbol-320.webp',
            fallback: 'longxiang-logo-symbol.png?v=20260618-imgopt2',
            width: 320,
            height: 336
        },
        'longxiang-factory-gate.jpg': {
            sources: [
                { maxWidth: 768, src: 'assets/optimized/longxiang-factory-gate-768.webp' },
                { src: 'assets/optimized/longxiang-factory-gate-1147.webp' }
            ]
        },
        '5\u3001\u5382\u533a\u5382\u8c8c/\u9f99\u7fd4\u516c\u53f8\u6b63\u95e8.jpg': {
            sources: [
                { maxWidth: 768, src: 'assets/optimized/longxiang-factory-main-768-clear.webp' },
                { maxWidth: 1024, src: 'assets/optimized/longxiang-factory-main-1280-clear.webp' },
                { src: 'assets/optimized/longxiang-factory-main-1971-clear.webp' }
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

    function getOptimizedImage(path) {
        return optimizedImages[normalizeAssetKey(path)] || null;
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

    function setOptimizedBackground(element, path) {
        var optimized = getOptimizedImage(path);
        var source = optimized && optimized.sources ? selectResponsiveSource(optimized.sources) : '';
        element.style.backgroundImage = cssUrl(source || path);
    }

    function setOptimizedImage(image, path, alt) {
        var optimized = getOptimizedImage(path);
        var source = optimized && optimized.src ? optimized.src : path;
        image.src = resolveAsset(source);
        image.alt = alt || '';
        image.decoding = 'async';
        if (optimized && optimized.width) image.width = optimized.width;
        if (optimized && optimized.height) image.height = optimized.height;
        if (optimized && optimized.fallback) {
            image.onerror = function () {
                image.onerror = null;
                image.src = resolveAsset(optimized.fallback);
            };
        }
    }

    function textFallback(value) {
        if (typeof value !== 'string') return '';
        var pack = TEXT_FALLBACKS[locale] || {};
        return pack[value.trim()] || '';
    }

    function localizedText(value) {
        var fallback = textFallback(value);
        if (fallback) return fallback;
        if (isArabic && typeof value === 'string' && ARABIC_TEXT_FALLBACKS[value.trim()]) {
            return ARABIC_TEXT_FALLBACKS[value.trim()];
        }
        return value || '';
    }

    function pageTextFallback(key, fallback) {
        var pack = PAGE_TEXT_FALLBACKS[locale] || {};
        return pack[key] || fallback || '';
    }

    function localized(item, key) {
        if (!item) return '';
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, key, locale);
            var fallbackValue = textFallback(value);
            if (fallbackValue) return fallbackValue;
            if (value && (!isArabic || value !== item[key])) return value;
        }
        if (isArabic) {
            if (item[key + 'Ar']) return item[key + 'Ar'];
            if (item[camelToSnake(key) + '_ar']) return item[camelToSnake(key) + '_ar'];
            if (item[key + '_ar']) return item[key + '_ar'];
            return localizedText(item[key]);
        }
        return item[key] || '';
    }

    function localizedOrPageFallback(item, key, fallbackKey, fallback) {
        var value = localized(item, key);
        if ((locale === 'fr' || locale === 'ru') && item && value && value === item[key]) {
            return pageTextFallback(fallbackKey, fallback);
        }
        return value || pageTextFallback(fallbackKey, fallback);
    }

    function localizedContactField(field, key) {
        var value = localized(field, key);
        var pack = CONTACT_FIELD_TEXT_FALLBACKS[locale] || {};
        var fallback = pack[key] && field ? pack[key][field.name] : '';
        if ((locale === 'fr' || locale === 'ru') && field && value && value === field[key]) {
            return fallback || value;
        }
        return value || fallback || '';
    }

    function localizedList(item, key) {
        if (!item) return [];
        if (window.LongxiangI18n && window.LongxiangI18n.localized) {
            var value = window.LongxiangI18n.localized(item, key, locale);
            if (Array.isArray(value) && value.length && (!isArabic || value !== item[key])) return value;
        }
        if (isArabic) {
            if (Array.isArray(item[key + 'Ar']) && item[key + 'Ar'].length) return item[key + 'Ar'];
            if (Array.isArray(item[camelToSnake(key) + '_ar']) && item[camelToSnake(key) + '_ar'].length) return item[camelToSnake(key) + '_ar'];
            if (Array.isArray(item[key + '_ar']) && item[key + '_ar'].length) return item[key + '_ar'];
        }
        var list = Array.isArray(item[key]) ? item[key] : [];
        if (isArabic) {
            return list.map(function (entry) {
                return typeof entry === 'string' ? localizedText(entry) : entry;
            });
        }
        return list;
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
            'loading="lazy"',
            'decoding="async"'
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

    function upsertHeadLink(rel, attrs) {
        if (!rel || !attrs || !attrs.href) return;
        var selector = 'link[rel="' + rel + '"]';
        if (attrs.hreflang) selector += '[hreflang="' + attrs.hreflang + '"]';
        var link = document.querySelector(selector);
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            document.head.appendChild(link);
        }
        Object.keys(attrs).forEach(function (key) {
            link.setAttribute(key, attrs[key]);
        });
    }

    function absoluteSiteUrl(pathname) {
        if (/^https?:\/\//i.test(String(pathname || ''))) return pathname;
        var path = String(pathname || window.location.pathname || '/').split('#')[0].split('?')[0];
        if (path === '/index.html') path = '/';
        if (/\/index\.html$/i.test(path)) path = path.replace(/index\.html$/i, '');
        return window.location.origin + path;
    }

    function localizedCanonicalPath(pathname) {
        var path = String(pathname || '').trim();
        if (/^https?:\/\//i.test(path)) return path;
        path = path || window.location.pathname || '/';
        if (window.LongxiangI18n && window.LongxiangI18n.baseStaticPathFromLocalizedPath && window.LongxiangI18n.localizedStaticPath) {
            return window.LongxiangI18n.localizedStaticPath(
                window.LongxiangI18n.baseStaticPathFromLocalizedPath(path),
                locale
            );
        }
        if (isArabic && path.charAt(0) !== '/') return '/ar/' + path.replace(/^\/+/, '');
        return path.charAt(0) === '/' ? path : '/' + path;
    }

    function alternatePathsForCanonical(pathname) {
        var basePath = window.LongxiangI18n && window.LongxiangI18n.baseStaticPathFromLocalizedPath
            ? window.LongxiangI18n.baseStaticPathFromLocalizedPath(pathname)
            : String(pathname || window.location.pathname || '/').split('#')[0].split('?')[0];
        var entries = window.LongxiangI18n && window.LongxiangI18n.seoLocales
            ? window.LongxiangI18n.seoLocales()
            : [{ code: 'en', hreflang: 'en' }, { code: 'ar', hreflang: 'ar' }];
        return entries.map(function (entry) {
            return {
                locale: entry.code,
                hreflang: entry.hreflang,
                path: window.LongxiangI18n && window.LongxiangI18n.localizedStaticPath
                    ? window.LongxiangI18n.localizedStaticPath(basePath, entry.code)
                    : (entry.code === 'ar' ? '/ar' + basePath : basePath)
            };
        });
    }

    function upsertAlternateLinks(canonicalPath) {
        var paths = alternatePathsForCanonical(canonicalPath);
        var defaultLocale = window.LongxiangI18n && window.LongxiangI18n.config
            ? window.LongxiangI18n.config.defaultLocale
            : 'en';
        paths.forEach(function (entry) {
            upsertHeadLink('alternate', { hreflang: entry.hreflang, href: window.location.origin + entry.path });
        });
        var xDefault = paths.filter(function (entry) {
            return entry.locale === defaultLocale;
        })[0] || paths[0];
        if (xDefault) {
            upsertHeadLink('alternate', { hreflang: 'x-default', href: window.location.origin + xDefault.path });
        }
    }

    function absoluteAssetUrl(path) {
        path = resolveAsset(path || '').replace(/^\.\.\//, '');
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        return window.location.origin + '/' + path.replace(/^\/+/, '');
    }

    function defaultSeoForPage() {
        if (pageSlug === 'home') {
            return {
                title: isArabic ? '' : 'Transformer & Switchgear Manufacturer | Longxiang',
                description: isArabic ? '' : 'Longxiang Electrical manufactures transformers, switchgear, EV charging stations and energy storage systems for industrial and renewable energy projects.',
                canonicalPath: isArabic ? '/ar/' : '/'
            };
        }
        if (pageSlug === 'product-pages') {
            return {
                title: isArabic ? 'منتجات المحولات ومعدات التوزيع | لونغشيانغ' : 'Transformers, Switchgear & EV Chargers | Longxiang',
                description: isArabic ? 'تصفح محولات لونغشيانغ ومعدات المفاتيح ومحطات شحن المركبات الكهربائية وأنظمة تخزين الطاقة لمشروعات الصناعة والطاقة المتجددة.' : 'Browse Longxiang transformers, switchgear, EV charging stations, energy storage and PV equipment for industrial and renewable energy projects.',
                canonicalPath: isArabic ? '/ar/products.html' : '/products.html'
            };
        }
        if (pageSlug === 'compare' && (locale === 'fr' || locale === 'ru')) {
            return {
                title: pageTextFallback('compareSeoTitle'),
                description: pageTextFallback('compareSeoDescription'),
                canonicalPath: '/compare.html'
            };
        }
        if (pageSlug === 'contact' && (locale === 'fr' || locale === 'ru')) {
            return {
                title: pageTextFallback('contactSeoTitle'),
                description: pageTextFallback('contactSeoDescription'),
                canonicalPath: '/contact.html'
            };
        }
        return {};
    }

    function shouldUseDefaultSeo(value, fallbackValue) {
        if (!fallbackValue) return false;
        var text = String(value || '').trim();
        if (!text) return true;
        return [
            'Henan Longxiang Electrical | Power Equipment Manufacturer',
            'Longxiang Electrical manufactures energy-saving transformers, switchgear, and power distribution equipment.',
            'Transformer, Switchgear & EV Charger Manufacturer | Henan Longxiang Electrical',
            'Henan Longxiang Electrical manufactures transformers, switchgear, and EV charging equipment for power distribution projects.',
            'Products | Longxiang Electrical',
            'Product list of Longxiang Electrical.',
            'Products | Henan Longxiang Electrical Co., Ltd.',
            'Explore Longxiang transformers, switchgear, EV chargers, and power distribution equipment for industrial parks, PV projects, charging stations, and utility applications.',
            'Product Comparison | Longxiang Electrical',
            'Product Comparison | Henan Longxiang Electrical Co., Ltd.',
            'Compare Longxiang Electrical products.',
            'Compare selected Longxiang power equipment models side by side.',
            'Contact Us | Henan Longxiang Electrical Co., Ltd.',
            'Contact Longxiang for model selection, quotation, and project support.'
        ].indexOf(text) !== -1;
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
        var defaults = defaultSeoForPage();
        var title = localized(seo, 'title');
        var description = localized(seo, 'description');
        if (shouldUseDefaultSeo(title, defaults.title)) title = defaults.title;
        if (shouldUseDefaultSeo(description, defaults.description)) description = defaults.description;
        var image = seo.image || (hero && hero.backgroundImage);
        var canonicalPath = localizedCanonicalPath(seo.canonicalPath || defaults.canonicalPath);
        var canonicalUrl = absoluteSiteUrl(canonicalPath);
        if (title) document.title = title;
        upsertMeta('description', '', description);
        upsertMeta('', 'og:title', title);
        upsertMeta('', 'og:description', description);
        upsertMeta('', 'og:type', 'website');
        upsertMeta('', 'og:url', canonicalUrl);
        upsertMeta('twitter:card', '', image ? 'summary_large_image' : 'summary');
        upsertMeta('twitter:title', '', title);
        upsertMeta('twitter:description', '', description);
        upsertHeadLink('canonical', { href: canonicalUrl });
        upsertAlternateLinks(canonicalPath);
        if (image) {
            var imageUrl = encodeURI(absoluteAssetUrl(image));
            upsertMeta('', 'og:image', imageUrl);
            upsertMeta('twitter:image', '', imageUrl);
        }
    }

    function listHtml(items) {
        if (!items || !items.length) return '';
        return '<ul class="solution-check-list">' + items.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</ul>';
    }

    function compactListHtml(items, className) {
        if (!items || !items.length) return '';
        return '<ul class="' + escapeHtml(className || '') + '">' + items.map(function (item) {
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
                var items = localizedList(card, 'items');
                return '<article class="solution-overview-card fade-in">' +
                    '<span class="solution-number">' + escapeHtml(card.number || String(index + 1).padStart(2, '0')) + '</span>' +
                    '<h3>' + escapeHtml(localized(card, 'title')) + '</h3>' +
                    '<p>' + escapeHtml(localized(card, 'text')) + '</p>' +
                    compactListHtml(items, 'solution-overview-details') +
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
        var parameters = localizedList(cta, 'parameters');
        return '<section class="cta-section solutions-cta"><div class="container">' +
            '<h2>' + escapeHtml(localized(cta, 'title')) + '</h2>' +
            '<p>' + escapeHtml(localized(cta, 'text')) + '</p>' +
            compactListHtml(parameters, 'solutions-cta-parameters') +
            '<div class="cta-buttons">' + buttonHtml(cta.button, 'btn btn-gold btn-lg') + '</div>' +
            '</div></section>';
    }

    function scrollToCurrentHash() {
        if (!window.location.hash) return;
        var id = window.location.hash.slice(1);
        if (!id) return;
        try {
            id = decodeURIComponent(id);
        } catch (err) {
            // Keep the raw hash when decoding fails.
        }
        var target = document.getElementById(id);
        if (!target) return;
        window.requestAnimationFrame(function () {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
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
                var text = typeof item === 'string' ? localizedText(item) : localized(item, 'text');
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
                var date = localized(item, 'date') || item.year || '';
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
            return '<svg class="social-brand-icon youtube-brand-icon" viewBox="0 0 24 24" aria-hidden="true"><path class="youtube-back" d="M22.5 12s0-3.5-.45-5.12a3.02 3.02 0 0 0-2.13-2.13C18.3 4.3 12 4.3 12 4.3s-6.3 0-7.92.45a3.02 3.02 0 0 0-2.13 2.13C1.5 8.5 1.5 12 1.5 12s0 3.5.45 5.12a3.02 3.02 0 0 0 2.13 2.13c1.62.45 7.92.45 7.92.45s6.3 0 7.92-.45a3.02 3.02 0 0 0 2.13-2.13C22.5 15.5 22.5 12 22.5 12z"></path><path class="youtube-play" d="M10 15.4V8.6l6 3.4z"></path></svg>';
        }
        return '<svg class="social-brand-icon instagram-brand-icon" viewBox="0 0 24 24" aria-hidden="true"><rect class="instagram-glyph" x="5" y="5" width="14" height="14" rx="4"></rect><circle class="instagram-glyph" cx="12" cy="12" r="3.2"></circle><circle class="instagram-dot" cx="16.8" cy="7.2" r="1.05"></circle></svg>';
    }

    function renderContactPrimary(body) {
        var page = body.contactPage || {};
        var mapSrc = body.googleMapsEmbedUrl || body.googleMyMapsEmbedUrl || '';
        var socials = [
            { key: 'instagram', label: 'Instagram' },
            { key: 'youtube', label: 'YouTube' }
        ].filter(function (item) { return body[item.key]; });
        var infoTitle = localizedOrPageFallback(page, 'infoTitle', 'contactInfoTitle', localized(page, 'infoTitle'));
        var officeLabel = localizedOrPageFallback(page, 'officeLabel', 'contactOfficeLabel', localized(page, 'officeLabel'));
        var emailLabel = localizedOrPageFallback(page, 'emailLabel', 'contactEmailLabel', localized(page, 'emailLabel'));
        var addressLabel = localizedOrPageFallback(page, 'factoryAddressLabel', 'contactAddressLabel', localized(page, 'factoryAddressLabel'));
        var socialTitle = localizedOrPageFallback(page, 'socialTitle', 'contactSocialTitle', localized(page, 'socialTitle'));
        var mapTitle = localizedOrPageFallback(page, 'mapTitle', 'contactMapTitle', localized(page, 'mapTitle'));

        return '<section class="section bg-light contact-primary-section"><div class="container"><div class="contact-section">' +
            '<div class="contact-info-card fade-in-left">' +
            '<div class="contact-section-heading"><span>' + escapeHtml(localized(page, 'companyName')) + '</span><h2>' + escapeHtml(infoTitle) + '</h2></div>' +
            '<div class="contact-info-list">' +
            '<div class="contact-info-row"><span>&#9742;</span><div><strong>' + escapeHtml(officeLabel) + '</strong><a href="' + escapeHtml(phoneHref(body.phone)) + '">' + escapeHtml(body.phone || '') + '</a></div></div>' +
            '<div class="contact-info-row"><span>&#9993;</span><div><strong>' + escapeHtml(emailLabel) + '</strong><a href="' + escapeHtml(emailHref(body.email)) + '">' + escapeHtml(body.email || '') + '</a></div></div>' +
            '<div class="contact-info-row contact-address-row"><span>&#8982;</span><div><strong>' + escapeHtml(addressLabel) + '</strong><span>' + escapeHtml(localized(body, 'headquarters') || localized(body, 'address')) + '</span></div></div>' +
            '<div class="contact-info-row contact-address-row"><span>&#9635;</span><div><strong>' + escapeHtml(addressLabel) + '</strong><span>' + escapeHtml(localized(body, 'huaiyangBase')) + '</span></div></div>' +
            '</div>' +
            (socials.length ? '<div class="contact-social-block"><h4>' + escapeHtml(socialTitle) + '</h4><div class="contact-social-icons">' +
                socials.map(function (item) {
                    return '<a href="' + escapeHtml(body[item.key]) + '" aria-label="' + escapeHtml(item.label) + '" target="_blank" rel="noopener">' + socialSvg(item.key) + '</a>';
                }).join('') +
                '</div></div>' : '') +
            '</div>' +
            '<div class="map-placeholder contact-location-panel contact-npc-map-panel fade-in-right">' +
            (mapSrc ? '<iframe class="contact-map-frame" title="' + escapeHtml(mapTitle) + '" data-consent-category="functional" data-consent-src="' + escapeHtml(mapSrc) + '" width="640" height="480" loading="eager" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' : '') +
            '</div></div></div></section>';
    }

    function renderContactField(field) {
        var id = escapeHtml(field.name || '');
        var required = field.required ? ' required' : '';
        var fieldLabel = localizedContactField(field, 'label');
        var label = escapeHtml(fieldLabel) + (field.required && fieldLabel.indexOf('*') === -1 ? ' *' : '');
        var placeholder = escapeHtml(localizedContactField(field, 'placeholder'));
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

    function contactInquiryDefaultFields(fields) {
        var source = Array.isArray(fields) ? fields.filter(function (field) {
            return !field || field.name !== 'subject';
        }).slice(0) : [];
        var existing = {};
        source.forEach(function (field) {
            if (field && field.name) existing[field.name] = true;
        });
        [
            { name: 'company', label: 'Company', labelAr: 'الشركة', labelFr: 'Entreprise', labelRu: 'Компания', type: 'text' },
            { name: 'country', label: 'Destination Country', labelAr: 'بلد المشروع', labelFr: 'Pays de destination', labelRu: 'Страна назначения', type: 'text', placeholder: 'Country or region', placeholderAr: 'الدولة أو المنطقة', placeholderFr: 'Pays ou région', placeholderRu: 'Страна или регион' },
            { name: 'productType', label: 'Product Type', labelAr: 'نوع المنتج', labelFr: 'Type de produit', labelRu: 'Тип продукта', type: 'text', placeholder: 'Transformer, switchgear, EV charger...', placeholderAr: 'محول، مفاتيح كهربائية، شاحن مركبات...', placeholderFr: 'Transformateur, appareillage, borne de recharge...', placeholderRu: 'Трансформатор, КРУ, зарядная станция...' },
            { name: 'requiredVoltageOrCapacity', label: 'Required Voltage / Capacity', labelAr: 'الجهد / السعة المطلوبة', labelFr: 'Tension / capacité requise', labelRu: 'Требуемое напряжение / мощность', type: 'text', column: 'right', placeholder: 'Voltage, capacity, power rating', placeholderAr: 'الجهد أو السعة أو القدرة', placeholderFr: 'Tension, capacité ou puissance', placeholderRu: 'Напряжение, емкость или мощность' },
            { name: 'quantityOrScale', label: 'Quantity / Project Scale', labelAr: 'الكمية / حجم المشروع', labelFr: 'Quantité / taille du projet', labelRu: 'Количество / масштаб проекта', type: 'text', column: 'right', placeholder: 'Quantity or project scale', placeholderAr: 'الكمية أو حجم المشروع', placeholderFr: 'Quantité ou taille du projet', placeholderRu: 'Количество или масштаб проекта' },
            { name: 'applicationScenario', label: 'Application Scenario', labelAr: 'سيناريو الاستخدام', labelFr: 'Scénario d’application', labelRu: 'Сценарий применения', type: 'text', column: 'right', placeholder: 'Factory, PV project, charging station...', placeholderAr: 'مصنع، مشروع شمسي، محطة شحن...', placeholderFr: 'Usine, projet photovoltaïque, station de recharge...', placeholderRu: 'Завод, солнечный проект, зарядная станция...' }
        ].forEach(function (field) {
            if (!existing[field.name]) {
                source.splice(Math.max(0, source.length - 1), 0, field);
                existing[field.name] = true;
            }
        });
        return source.map(function (field) {
            if (field.name === 'phone') {
                return Object.assign({}, field, { label: field.label || 'Phone', labelAr: field.labelAr && field.labelAr.indexOf(ARABIC_CHAT_APP_NAME) === -1 ? field.labelAr : 'رقم الهاتف' });
            }
            return field;
        });
    }

    function renderContactForm(form) {
        if (!form) return '';
        var fields = contactInquiryDefaultFields(form.fields);
        var left = fields.filter(function (field) { return field.column !== 'right'; });
        var right = fields.filter(function (field) { return field.column === 'right'; });
        var title = localizedOrPageFallback(form, 'title', 'contactFormTitle', localized(form, 'title'));
        var note = localizedOrPageFallback(form, 'note', 'contactFormNote', localized(form, 'note'));
        var footerText = localizedOrPageFallback(form, 'footerText', 'contactFormFooterText', localized(form, 'footerText'));
        var submitLabel = localizedOrPageFallback(form, 'submitLabel', 'contactFormSubmit', localized(form, 'submitLabel'));
        return '<section class="section contact-form-section"><div class="container">' +
            '<div class="contact-form-heading fade-in"><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(note) + '</p></div>' +
            '<div class="contact-form contact-page-form fade-in"><form id="contactForm">' +
            '<input type="hidden" name="subject" value="quote">' +
            '<div class="contact-inquiry-columns">' +
            '<div class="contact-inquiry-column">' + left.map(renderContactField).join('') + '</div>' +
            '<div class="contact-inquiry-column">' + right.map(renderContactField).join('') + '</div>' +
            '</div>' +
            '<div class="contact-form-footer"><p>' + escapeHtml(footerText) + '</p><button type="submit" class="btn btn-primary">' + escapeHtml(submitLabel) + '</button></div>' +
            '</form></div></div></section>';
    }

    function renderContactFaq(faq) {
        if (!faq || !faq.items || !faq.items.length) return '';
        var title = localizedOrPageFallback(faq, 'title', 'contactFaqTitle', localized(faq, 'title'));
        var text = localizedOrPageFallback(faq, 'text', 'contactFaqText', localized(faq, 'text'));
        return '<section class="section bg-light faq-block"><div class="container">' +
            '<div class="section-header"><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(text) + '</p></div>' +
            faq.items.map(function (item) {
                return '<details><summary>' + escapeHtml(localized(item, 'question')) + '</summary><p>' + escapeHtml(localized(item, 'answer')) + '</p></details>';
            }).join('') +
            '</div></section>';
    }

    function renderContact(body) {
        updateHero(body.hero);
        var heroTitle = document.querySelector('.page-hero h1');
        var heroSubtitle = document.querySelector('.page-hero p:not(.page-hero-title)');
        if (heroTitle) heroTitle.textContent = localizedOrPageFallback(body.hero || {}, 'title', 'contactHeroTitle', heroTitle.textContent);
        if (heroSubtitle) heroSubtitle.textContent = localizedOrPageFallback(body.hero || {}, 'subtitle', 'contactHeroSubtitle', heroSubtitle.textContent);
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

    function defaultProductDetailSupportItems() {
        return [
            { title: 'Parameter Review', titleAr: 'مراجعة المعايير', titleFr: 'Revue des paramètres', titleRu: 'Проверка параметров', text: 'Confirm voltage, capacity, protection level, and project conditions before quotation.', textAr: 'تأكيد الجهد والسعة ومستوى الحماية وظروف المشروع قبل عرض السعر.', textFr: 'Valider la tension, la capacité, le niveau de protection et les conditions du projet avant le devis.', textRu: 'Перед расчетом подтвердите напряжение, мощность, уровень защиты и условия проекта.' },
            { title: 'Project Configuration', titleAr: 'تكوين المشروع', titleFr: 'Configuration du projet', titleRu: 'Конфигурация проекта', text: 'Match products with transformers, switchgear, charging, PV, or storage systems.', textAr: 'مطابقة المنتجات مع المحولات والمفاتيح والشحن والطاقة الشمسية أو التخزين.', textFr: 'Associer les produits aux transformateurs, appareillages, systèmes de recharge, photovoltaïques ou de stockage.', textRu: 'Подобрать продукцию для трансформаторов, КРУ, зарядных, солнечных или накопительных систем.' },
            { title: 'Export Delivery', titleAr: 'تسليم التصدير', titleFr: 'Livraison export', titleRu: 'Экспортная поставка', text: 'Support packaging, documents, delivery schedule, and destination requirements.', textAr: 'دعم التغليف والمستندات وجدول التسليم ومتطلبات بلد الوصول.', textFr: 'Accompagnement pour l’emballage, les documents, le calendrier de livraison et les exigences de destination.', textRu: 'Поддержка по упаковке, документам, графику поставки и требованиям страны назначения.' },
            { title: 'After-sales Support', titleAr: 'دعم ما بعد البيع', titleFr: 'Support après-vente', titleRu: 'Послепродажная поддержка', text: 'Provide technical communication for installation, operation, and maintenance.', textAr: 'توفير تواصل فني للتركيب والتشغيل والصيانة.', textFr: 'Assurer les échanges techniques pour l’installation, l’exploitation et la maintenance.', textRu: 'Техническое сопровождение по монтажу, эксплуатации и обслуживанию.' }
        ];
    }

    function defaultProductDetailFaqItems() {
        return [
            { question: 'What information is needed for a quotation?', questionAr: 'ما المعلومات المطلوبة لعرض السعر؟', questionFr: 'Quelles informations sont nécessaires pour un devis ?', questionRu: 'Какие данные нужны для расчета?', answer: 'Please provide product type, voltage or capacity, quantity, destination country, and application scenario.', answerAr: 'يرجى تزويد نوع المنتج والجهد أو السعة والكمية وبلد المشروع وسيناريو الاستخدام.', answerFr: 'Merci d’indiquer le type de produit, la tension ou la capacité, la quantité, le pays de destination et le scénario d’application.', answerRu: 'Укажите тип продукта, напряжение или мощность, количество, страну назначения и сценарий применения.' },
            { question: 'Can Longxiang help with product selection?', questionAr: 'هل يمكن لونغشيانغ المساعدة في اختيار المنتج؟', questionFr: 'Longxiang peut-il aider au choix du produit ?', questionRu: 'Может ли Longxiang помочь с подбором продукта?', answer: 'Yes. Our team can review parameters and recommend a suitable configuration for the project.', answerAr: 'نعم، يمكن لفريقنا مراجعة المعايير واقتراح تكوين مناسب للمشروع.', answerFr: 'Oui. Notre équipe peut examiner les paramètres et recommander une configuration adaptée au projet.', answerRu: 'Да. Наша команда проверит параметры и предложит подходящую конфигурацию для проекта.' },
            { question: 'Are drawings or technical documents available?', questionAr: 'هل تتوفر الرسومات أو المستندات الفنية؟', questionFr: 'Des plans ou documents techniques sont-ils disponibles ?', questionRu: 'Доступны ли чертежи или технические документы?', answer: 'Technical documents can be provided according to the product model and project requirements.', answerAr: 'يمكن توفير المستندات الفنية حسب طراز المنتج ومتطلبات المشروع.', answerFr: 'Les documents techniques peuvent être fournis selon le modèle du produit et les exigences du projet.', answerRu: 'Технические документы могут быть предоставлены в зависимости от модели продукта и требований проекта.' },
            { question: 'Can products be supplied for overseas projects?', questionAr: 'هل يمكن توريد المنتجات للمشاريع الخارجية؟', questionFr: 'Les produits peuvent-ils être fournis pour des projets à l’étranger ?', questionRu: 'Можно ли поставлять продукцию для зарубежных проектов?', answer: 'Yes. Please share the destination country and delivery requirements so we can confirm packaging and documents.', answerAr: 'نعم. يرجى مشاركة بلد الوصول ومتطلبات التسليم لتأكيد التغليف والمستندات.', answerFr: 'Oui. Merci d’indiquer le pays de destination et les exigences de livraison afin de valider l’emballage et les documents.', answerRu: 'Да. Сообщите страну назначения и требования к поставке, чтобы мы подтвердили упаковку и документы.' }
        ];
    }

    function renderProductDetailSupport(section) {
        var target = pageRoot.querySelector('[data-product-detail-support]');
        if (!target) return;
        section = section || {};
        var items = Array.isArray(section.items) && section.items.length ? section.items : defaultProductDetailSupportItems();
        var title = localizedOrPageFallback(section, 'title', 'productDetailSupportTitle', localized(section, 'title'));
        target.innerHTML = '<h2>' + escapeHtml(title) + '</h2><div class="export-support-grid">' +
            items.map(function (item) {
                return '<div><strong>' + escapeHtml(localized(item, 'title')) + '</strong><span>' + escapeHtml(localized(item, 'text')) + '</span></div>';
            }).join('') +
            '</div>';
    }

    function renderProductDetailFaq(items, labels) {
        var target = pageRoot.querySelector('[data-product-detail-faq]');
        if (!target) return;
        items = Array.isArray(items) && items.length ? items : defaultProductDetailFaqItems();
        var title = localizedOrPageFallback(labels, 'faqTitle', 'productDetailFaqTitle', localized(labels, 'faqTitle'));
        target.innerHTML = '<h2>' + escapeHtml(title) + '</h2>' +
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
        setDetailText('#page-title', localizedOrPageFallback(detailHero, 'title', 'productDetailTitle', localized(detailHero, 'title')));
        setDetailText('#page-subtitle', localizedOrPageFallback(detailHero, 'subtitle', 'productDetailSubtitle', localized(detailHero, 'subtitle')));
        updateSeo(body.detailSeo || body.seo, detailHero);
    }

    function renderProductDetailLabels(labels) {
        if (!labels) return;
        setDetailText('[data-product-specs-title]', localizedOrPageFallback(labels, 'specsTitle', 'productDetailSpecsTitle', localized(labels, 'specsTitle')));
        setDetailText('#product-title', localizedOrPageFallback(labels, 'loadingTitle', 'productDetailTitle', localized(labels, 'loadingTitle')));
        setDetailText('#product-desc', localizedOrPageFallback(labels, 'loadingText', 'productDetailSubtitle', localized(labels, 'loadingText')));
        setDetailText('[data-product-detail-support] .empty-state', localizedOrPageFallback(labels, 'supportLoading', 'productDetailSupportLoading', localized(labels, 'supportLoading')));
        setDetailText('[data-product-detail-faq] .empty-state', localizedOrPageFallback(labels, 'faqLoading', 'productDetailFaqLoading', localized(labels, 'faqLoading')));
        setDetailText('[data-product-detail-inquiry] .empty-state', localizedOrPageFallback(labels, 'inquiryLoading', 'productDetailInquiryLoading', localized(labels, 'inquiryLoading')));
    }

    function productFieldId(name) {
        return 'detail-' + String(name || '').replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    function renderProductInquiryField(field) {
        var id = productFieldId(field.name);
        var label = localized(field, 'label') + (field.required ? ' *' : '');
        var required = field.required ? ' required' : '';
        var readonly = field.readonly ? ' readonly' : '';
        var displayAttr = field.productContextDisplay ? ' data-product-context-display' : '';
        var attrs = ' id="' + escapeHtml(id) + '" name="' + escapeHtml(field.name || '') + '"' + required + readonly + displayAttr;
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

    function productInquiryDefaultFields(form) {
        var fields = form && Array.isArray(form.fields) ? form.fields.filter(function (field) {
            return !field || field.name !== 'subject';
        }).slice(0) : [];
        var existing = {};
        fields.forEach(function (field) {
            if (field && field.name) existing[field.name] = true;
        });
        [
            { name: 'productContextDisplay', label: 'Interested Product', labelAr: 'المنتج المطلوب', labelFr: 'Produit demandé', labelRu: 'Интересующий продукт', type: 'text', readonly: true, productContextDisplay: true },
            { name: 'name', label: 'Name', labelAr: 'الاسم', labelFr: 'Nom', labelRu: 'Имя', type: 'text', required: true },
            { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', labelFr: 'E-mail', labelRu: 'Электронная почта', type: 'email', required: true },
            { name: 'phone', label: 'Phone', labelAr: 'رقم الهاتف', labelFr: 'Téléphone', labelRu: 'Телефон', type: 'text' },
            { name: 'company', label: 'Company', labelAr: 'الشركة', labelFr: 'Entreprise', labelRu: 'Компания', type: 'text' },
            { name: 'country', label: 'Destination Country', labelAr: 'بلد المشروع', labelFr: 'Pays de destination', labelRu: 'Страна назначения', type: 'text', placeholder: 'Country or region', placeholderAr: 'الدولة أو المنطقة', placeholderFr: 'Pays ou région', placeholderRu: 'Страна или регион' },
            { name: 'productType', label: 'Product Type', labelAr: 'نوع المنتج', labelFr: 'Type de produit', labelRu: 'Тип продукта', type: 'text', placeholder: 'Transformer, switchgear, EV charger...', placeholderAr: 'محول، مفاتيح كهربائية، شاحن مركبات...', placeholderFr: 'Transformateur, appareillage, borne de recharge...', placeholderRu: 'Трансформатор, КРУ, зарядная станция...' },
            { name: 'requiredVoltageOrCapacity', label: 'Required Voltage / Capacity', labelAr: 'الجهد / السعة المطلوبة', labelFr: 'Tension / capacité requise', labelRu: 'Требуемое напряжение / мощность', type: 'text', placeholder: 'Voltage, capacity, power rating', placeholderAr: 'الجهد أو السعة أو القدرة', placeholderFr: 'Tension, capacité ou puissance', placeholderRu: 'Напряжение, емкость или мощность' },
            { name: 'quantityOrScale', label: 'Quantity / Project Scale', labelAr: 'الكمية / حجم المشروع', labelFr: 'Quantité / taille du projet', labelRu: 'Количество / масштаб проекта', type: 'text', placeholder: 'Quantity or project scale', placeholderAr: 'الكمية أو حجم المشروع', placeholderFr: 'Quantité ou taille du projet', placeholderRu: 'Количество или масштаб проекта' },
            { name: 'applicationScenario', label: 'Application Scenario', labelAr: 'سيناريو الاستخدام', labelFr: 'Scénario d’application', labelRu: 'Сценарий применения', type: 'text', placeholder: 'Factory, PV project, charging station...', placeholderAr: 'مصنع، مشروع شمسي، محطة شحن...', placeholderFr: 'Usine, projet photovoltaïque, station de recharge...', placeholderRu: 'Завод, солнечный проект, зарядная станция...' },
            { name: 'message', label: 'Message', labelAr: 'الرسالة', labelFr: 'Message', labelRu: 'Сообщение', type: 'textarea', required: true, rows: 5, productMessage: true }
        ].forEach(function (field) {
            if (!existing[field.name]) {
                fields.push(field);
                existing[field.name] = true;
            }
        });
        return fields.map(function (field) {
            if (field.name === 'phone') {
                return Object.assign({}, field, { label: field.label || 'Phone', labelAr: field.labelAr && field.labelAr.indexOf(ARABIC_CHAT_APP_NAME) === -1 ? field.labelAr : 'رقم الهاتف' });
            }
            return field;
        });
    }

    function renderProductInquiryForm(form) {
        var target = pageRoot.querySelector('[data-product-detail-inquiry]');
        if (!target) return;
        form = form || {};
        var fields = productInquiryDefaultFields(form);
        var fallbackTitle = locale === 'fr' ? 'Demande produit' : (locale === 'ru' ? 'Запрос по продукту' : (isArabic ? 'استفسار عن المنتج' : 'Product Inquiry'));
        var fallbackNote = locale === 'fr' ? 'Laissez vos coordonnées et les exigences du projet.' : (locale === 'ru' ? 'Оставьте контактные данные и требования проекта.' : '');
        var fallbackSubmit = locale === 'fr' ? 'Envoyer la demande' : (locale === 'ru' ? 'Отправить запрос' : (isArabic ? 'إرسال الاستفسار' : 'Submit Inquiry'));
        var title = localizedOrPageFallback(form, 'title', 'productInquiryTitle', fallbackTitle);
        var note = localizedOrPageFallback(form, 'note', 'productInquiryNote', fallbackNote);
        var submitLabel = localizedOrPageFallback(form, 'submitLabel', 'productInquirySubmit', fallbackSubmit);
        target.innerHTML = '<h3>' + escapeHtml(title) + '</h3>' +
            (note ? '<p class="product-inquiry-note">' + escapeHtml(note) + '</p>' : '') +
            '<form class="inquiry-form" data-inquiry-form>' +
            '<input type="hidden" name="subject" value="quote">' +
            '<input type="hidden" name="productContext" data-product-context value="">' +
            fields.map(renderProductInquiryField).join('') +
            '<button type="submit" class="btn btn-primary">' + escapeHtml(submitLabel) + '</button>' +
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

        if (bg && hero.backgroundImage) setOptimizedBackground(bg, hero.backgroundImage);
        if (logo && hero.logo && getComputedStyle(logo).display !== 'none') {
            setOptimizedImage(logo, hero.logo, localized(hero, 'logoAlt') || 'Longxiang Electrical logo');
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
        var titleText = {
            en: 'Why Choose Longxiang',
            ar: 'لماذا Longxiang',
            fr: 'Pourquoi choisir Longxiang',
            ru: 'Почему выбирают Longxiang'
        }[locale] || 'Why Choose Longxiang';
        section.innerHTML = '<div class="container">' +
            '<div class="section-header fade-in"><h2>' + escapeHtml(titleText) + '</h2></div>' +
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
        var hero = body.hero || {};
        var heroTitle = document.querySelector('.page-hero h1');
        var heroSubtitle = document.querySelector('.page-hero p:not(.page-hero-title)');
        if (heroTitle) heroTitle.textContent = localizedOrPageFallback(hero, 'title', 'compareTitle', heroTitle.textContent);
        if (heroSubtitle) heroSubtitle.textContent = localizedOrPageFallback(hero, 'subtitle', 'compareSubtitle', heroSubtitle.textContent);

        var toolbar = body.toolbar || {};
        var back = pageRoot.querySelector('[data-compare-back]');
        var print = pageRoot.querySelector('[data-compare-print]');
        var empty = pageRoot.querySelector('#comparison-container .empty-state');
        if (back) {
            back.textContent = localizedOrPageFallback(toolbar, 'backLabel', 'compareBack', back.textContent);
            back.href = pageHref(toolbar.backHref || 'products.html');
        }
        if (print) print.textContent = localizedOrPageFallback(toolbar, 'printLabel', 'comparePrint', print.textContent);
        if (empty) empty.textContent = localizedOrPageFallback(body.emptyState, 'text', 'compareLoading', empty.textContent);

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
        scrollToCurrentHash();
    }

    function renderPage(block) {
        var body = block && block.body ? block.body : {};
        if (window.LongxiangI18n && window.LongxiangI18n.localizeContentTree) {
            body = window.LongxiangI18n.localizeContentTree(body, locale);
        }
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
