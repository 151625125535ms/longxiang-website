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
            'Explore Solutions': 'Explorer les solutions',
            'Integrated Smart Energy': '\u00c9nergie intelligente int\u00e9gr\u00e9e',
            'Integrated Smart Energy & Power Distribution Solutions': 'Solutions d\u2019\u00e9nergie intelligente int\u00e9gr\u00e9e et de distribution \u00e9lectrique',
            'Integrated Smart Energy & Power Distribution Solutions | Longxiang': 'Solutions d\u2019\u00e9nergie intelligente int\u00e9gr\u00e9e et de distribution \u00e9lectrique | Longxiang',
            'Integrated Smart Energy & distribution \u00e9lectrique Solutions': 'Solutions d\u2019\u00e9nergie intelligente int\u00e9gr\u00e9e et de distribution \u00e9lectrique',
            'Integrated Smart Energy & distribution \u00e9lectrique Solutions | Longxiang': 'Solutions d\u2019\u00e9nergie intelligente int\u00e9gr\u00e9e et de distribution \u00e9lectrique | Longxiang',
            'Patent Certificates': 'Certificats de brevet',
            'Qualification materials': 'Documents de qualification',
            'Qualification materials for procurement and technical due diligence': 'Documents de qualification pour les achats et la revue technique',
            'Can these products be supplied for Middle East, Africa, or Southeast Asia projects?': 'Ces produits peuvent-ils \u00eatre fournis pour des projets au Moyen-Orient, en Afrique ou en Asie du Sud-Est ?',
            'Can these products be supplied for Moyen-Orient, Afrique, or Asie du Sud-Est projects?': 'Ces produits peuvent-ils \u00eatre fournis pour des projets au Moyen-Orient, en Afrique ou en Asie du Sud-Est ?',
            'Solutions by Project Scenario': 'Solutions par sc\u00e9nario de projet',
            'Solutions by projet Scenario': 'Solutions par sc\u00e9nario de projet',
            'C&I Photovoltaic': 'Photovolta\u00efque C&I',
            'C&I Photovoltaic Solution': 'Solution photovolta\u00efque C&I',
            'C&I Smart Microgrid Solution': 'Solution de micror\u00e9seau intelligent C&I',
            'Smart Micro-r\u00e9seau': 'Micror\u00e9seau intelligent',
            'Smart Microgrid': 'Micror\u00e9seau intelligent',
            'distribution \u00e9lectrique engineering for residential communities, industriel parks, and public facilities.': 'Ing\u00e9nierie de distribution \u00e9lectrique pour les r\u00e9sidences, les parcs industriels et les \u00e9quipements publics.',
            'High-voltage and low-voltage appareillages, transformer, cable, metering, and auxiliary \u00e9quipements configuration.': 'Configuration des appareillages haute et basse tension, transformateurs, c\u00e2bles, comptage et \u00e9quipements auxiliaires.',
            'Integrated delivery from \u00e9quipements supply through installation, commissioning, energization, and handover.': 'Livraison int\u00e9gr\u00e9e depuis la fourniture des \u00e9quipements jusqu\u2019\u00e0 l\u2019installation, la mise en service, la mise sous tension et la remise du projet.',
            'Kaifeng Bianjing Xihuafu projet reference: RMB 31.19 million total distribution engineering investment and successful energization.': 'R\u00e9f\u00e9rence du projet Kaifeng Bianjing Xihuafu : investissement total de 31,19 millions RMB dans l\u2019ing\u00e9nierie de distribution \u00e9lectrique et mise sous tension r\u00e9ussie.',
            'distribution \u00e9lectrique Integration': 'Int\u00e9gration de la distribution \u00e9lectrique',
            'distribution \u00e9lectrique System Integration': 'Int\u00e9gration du syst\u00e8me de distribution \u00e9lectrique',
            'Single-line diagram for distribution \u00e9lectrique system integration': 'Sch\u00e9ma unifilaire pour l\u2019int\u00e9gration du syst\u00e8me de distribution \u00e9lectrique',
            '*Your information is protected and used only for Longxiang technical consultation and quotation follow-up.': '*Vos informations sont prot\u00e9g\u00e9es et utilis\u00e9es uniquement pour la consultation technique Longxiang et le suivi des devis.',
            '*Your information is protected and used only for Longxiang consultation technique and quotation follow-up.': '*Vos informations sont prot\u00e9g\u00e9es et utilis\u00e9es uniquement pour la consultation technique Longxiang et le suivi des devis.',
            'Verified test reports, enterprise qualifications, honors, patent certificates, and compliance materials for power \u00e9quipements supplier review.': 'Rapports d\u2019essai v\u00e9rifi\u00e9s, qualifications de l\u2019entreprise, distinctions, certificats de brevet et documents de conformit\u00e9 pour la revue fournisseur d\u2019\u00e9quipements \u00e9lectriques.'
        },
        ru: {
            'About Us': '\u041e \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438',
            'About Us | Henan Longxiang Electrical Co., Ltd.': '\u041e \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 | Henan Longxiang Electrical Co., Ltd.',
            'About Longxiang': '\u041e Longxiang',
            'Transformer Manufacturing': '\u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u043e \u0442\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\u043e\u0432',
            'Transformer manufacturing': '\u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u043e \u0442\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\u043e\u0432',
            'Certificates': '\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b',
            'Certificates | Henan Longxiang Electrical Co., Ltd.': '\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b | Henan Longxiang Electrical Co., Ltd.',
            'Certificates & Qualification Archive': '\u0410\u0440\u0445\u0438\u0432 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0432 \u0438 \u043a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0439',
            'Enterprise Qualifications': '\u041a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f',
            'Patent Certificates': '\u041f\u0430\u0442\u0435\u043d\u0442\u043d\u044b\u0435 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b',
            'Qualification materials': '\u041a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b',
            'Qualification materials for procurement and technical due diligence': '\u041a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0434\u043b\u044f \u0437\u0430\u043a\u0443\u043f\u043e\u043a \u0438 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438',
            'EXPLORE SOLUTIONS': '\u0418\u0437\u0443\u0447\u0438\u0442\u044c \u0440\u0435\u0448\u0435\u043d\u0438\u044f',
            'Explore Solutions': '\u0418\u0437\u0443\u0447\u0438\u0442\u044c \u0440\u0435\u0448\u0435\u043d\u0438\u044f',
            'Integrated Smart Energy': '\u0418\u043d\u0442\u0435\u0433\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u0430\u044f \u0438\u043d\u0442\u0435\u043b\u043b\u0435\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0430\u044f \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u0430',
            'Integrated Smart Energy & Power Distribution Solutions': '\u0420\u0435\u0448\u0435\u043d\u0438\u044f \u0434\u043b\u044f \u0438\u043d\u0442\u0435\u043b\u043b\u0435\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0439 \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u0438 \u0438 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u044d\u043d\u0435\u0440\u0433\u0438\u0438',
            'Integrated Smart Energy & Power Distribution Solutions | Longxiang': '\u0420\u0435\u0448\u0435\u043d\u0438\u044f \u0434\u043b\u044f \u0438\u043d\u0442\u0435\u043b\u043b\u0435\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0439 \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u0438 \u0438 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u044d\u043d\u0435\u0440\u0433\u0438\u0438 | Longxiang',
            'Solutions by Project Scenario': '\u0420\u0435\u0448\u0435\u043d\u0438\u044f \u043f\u043e \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u044f\u043c \u043f\u0440\u043e\u0435\u043a\u0442\u0430',
            'Engineering EPC': '\u0418\u043d\u0436\u0438\u043d\u0438\u0440\u0438\u043d\u0433 \u0438 EPC',
            'Line O&M': '\u042d\u043a\u0441\u043f\u043b\u0443\u0430\u0442\u0430\u0446\u0438\u044f \u0438 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u043b\u0438\u043d\u0438\u0439',
            'Power Distribution Integration': '\u0418\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044f \u0441\u0438\u0441\u0442\u0435\u043c \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f',
            'C&I Photovoltaic': '\u0421\u043e\u043b\u043d\u0435\u0447\u043d\u0430\u044f \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u0430 \u0434\u043b\u044f \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u0438 \u043f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u043e\u0441\u0442\u0438',
            'Storage & Charging': '\u041d\u0430\u043a\u043e\u043f\u043b\u0435\u043d\u0438\u0435 \u044d\u043d\u0435\u0440\u0433\u0438\u0438 \u0438 \u0437\u0430\u0440\u044f\u0434\u043a\u0430',
            'Smart Microgrid': '\u0418\u043d\u0442\u0435\u043b\u043b\u0435\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0430\u044f \u043c\u0438\u043a\u0440\u043e\u0441\u0435\u0442\u044c',
            'Best fit: power distribution projects': '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f: \u043f\u0440\u043e\u0435\u043a\u0442\u043e\u0432 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u044d\u043d\u0435\u0440\u0433\u0438\u0438',
            'Includes: transformer, switchgear, cabling and metering': '\u0412\u043a\u043b\u044e\u0447\u0430\u0435\u0442: \u0442\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440, \u041a\u0420\u0423, \u043a\u0430\u0431\u0435\u043b\u0438 \u0438 \u0443\u0447\u0435\u0442',
            'Confirm: voltage, load, site scope and delivery boundary': '\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c: \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u0435, \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0443, \u043e\u0431\u044a\u0435\u043c \u0440\u0430\u0431\u043e\u0442 \u043d\u0430 \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0435 \u0438 \u0433\u0440\u0430\u043d\u0438\u0446\u044b \u043f\u043e\u0441\u0442\u0430\u0432\u043a\u0438',
            'Best fit: highways, tunnels, substations and park lines': '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f: \u0430\u0432\u0442\u043e\u043c\u0430\u0433\u0438\u0441\u0442\u0440\u0430\u043b\u0435\u0439, \u0442\u043e\u043d\u043d\u0435\u043b\u0435\u0439, \u043f\u043e\u0434\u0441\u0442\u0430\u043d\u0446\u0438\u0439 \u0438 \u043b\u0438\u043d\u0438\u0439 \u043f\u0430\u0440\u043a\u043e\u0432',
            'Includes: inspection, maintenance and response': '\u0412\u043a\u043b\u044e\u0447\u0430\u0435\u0442: \u043e\u0441\u043c\u043e\u0442\u0440, \u0442\u0435\u0445\u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0438 \u0440\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435',
            'Confirm: line length, voltage level and service boundary': '\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c: \u0434\u043b\u0438\u043d\u0443 \u043b\u0438\u043d\u0438\u0438, \u043a\u043b\u0430\u0441\u0441 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u044f \u0438 \u0433\u0440\u0430\u043d\u0438\u0446\u044b \u0441\u0435\u0440\u0432\u0438\u0441\u0430',
            'Best fit: factories, parks, buildings and substations': '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f: \u0437\u0430\u0432\u043e\u0434\u043e\u0432, \u043f\u0430\u0440\u043a\u043e\u0432, \u0437\u0434\u0430\u043d\u0438\u0439 \u0438 \u043f\u043e\u0434\u0441\u0442\u0430\u043d\u0446\u0438\u0439',
            'Includes: dry-type, oil-immersed, amorphous or silicon-steel transformers': '\u0412\u043a\u043b\u044e\u0447\u0430\u0435\u0442: \u0441\u0443\u0445\u0438\u0435, \u043c\u0430\u0441\u043b\u044f\u043d\u044b\u0435, \u0430\u043c\u043e\u0440\u0444\u043d\u044b\u0435 \u0438\u043b\u0438 \u0441\u0442\u0430\u043b\u044c\u043d\u044b\u0435 \u0442\u0440\u0430\u043d\u0441\u0444\u043e\u0440\u043c\u0430\u0442\u043e\u0440\u044b',
            'Confirm: capacity, voltage class, installation environment and load type': '\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c: \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c, \u043a\u043b\u0430\u0441\u0441 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u044f, \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u043c\u043e\u043d\u0442\u0430\u0436\u0430 \u0438 \u0442\u0438\u043f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0438',
            'Best fit: factory roofs, parks and public buildings': '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f: \u043a\u0440\u044b\u0448 \u0437\u0430\u0432\u043e\u0434\u043e\u0432, \u043f\u0430\u0440\u043a\u043e\u0432 \u0438 \u043e\u0431\u0449\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0445 \u0437\u0434\u0430\u043d\u0438\u0439',
            'Includes: PV combiner, grid cabinet and distribution equipment': '\u0412\u043a\u043b\u044e\u0447\u0430\u0435\u0442: PV-\u043a\u043e\u043c\u0431\u0430\u0439\u043d\u0435\u0440, \u0441\u0435\u0442\u0435\u0432\u043e\u0439 \u0448\u043a\u0430\u0444 \u0438 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435',
            'Confirm: PV capacity, grid access point and monitoring need': '\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c: \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c PV, \u0442\u043e\u0447\u043a\u0443 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f \u043a \u0441\u0435\u0442\u0438 \u0438 \u043f\u043e\u0442\u0440\u0435\u0431\u043d\u043e\u0441\u0442\u044c \u0432 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433\u0435',
            'Best fit: charging stations and commercial energy sites': '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f: \u0437\u0430\u0440\u044f\u0434\u043d\u044b\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439 \u0438 \u043a\u043e\u043c\u043c\u0435\u0440\u0447\u0435\u0441\u043a\u0438\u0445 \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043e\u0431\u044a\u0435\u043a\u0442\u043e\u0432',
            'Includes: ESS, AC/DC charging, EMS and distribution': '\u0412\u043a\u043b\u044e\u0447\u0430\u0435\u0442: ESS, \u0437\u0430\u0440\u044f\u0434\u043a\u0443 AC/DC, EMS \u0438 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435',
            'Confirm: charging power, storage capacity, grid limit and operation mode': '\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c: \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c \u0437\u0430\u0440\u044f\u0434\u043a\u0438, \u0435\u043c\u043a\u043e\u0441\u0442\u044c \u043d\u0430\u043a\u043e\u043f\u0438\u0442\u0435\u043b\u044f, \u043b\u0438\u043c\u0438\u0442 \u0441\u0435\u0442\u0438 \u0438 \u0440\u0435\u0436\u0438\u043c \u0440\u0430\u0431\u043e\u0442\u044b',
            'Best fit: parks, mines, islands and critical loads': '\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u0434\u043b\u044f: \u043f\u0430\u0440\u043a\u043e\u0432, \u0448\u0430\u0445\u0442, \u043e\u0441\u0442\u0440\u043e\u0432\u043e\u0432 \u0438 \u043a\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043d\u0430\u0433\u0440\u0443\u0437\u043e\u043a',
            'Includes: PV, ESS, distribution, EMS and grid/off-grid control': '\u0412\u043a\u043b\u044e\u0447\u0430\u0435\u0442: PV, ESS, \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435, EMS \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u0435\u0442\u0435\u0432\u044b\u043c/\u0430\u0432\u0442\u043e\u043d\u043e\u043c\u043d\u044b\u043c \u0440\u0435\u0436\u0438\u043c\u043e\u043c',
            'Confirm: grid mode, backup duration, load priority and expansion plan': '\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c: \u0440\u0435\u0436\u0438\u043c \u0441\u0435\u0442\u0438, \u0432\u0440\u0435\u043c\u044f \u0440\u0435\u0437\u0435\u0440\u0432\u0430, \u043f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442 \u043d\u0430\u0433\u0440\u0443\u0437\u043e\u043a \u0438 \u043f\u043b\u0430\u043d \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u044f',
            'Before quotation, confirm capacity, voltage class, load type, installation environment, protection level, enclosure requirement, and destination standard.': '\u041f\u0435\u0440\u0435\u0434 \u0440\u0430\u0441\u0447\u0435\u0442\u043e\u043c \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u0435 \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c, \u043a\u043b\u0430\u0441\u0441 \u043d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u044f, \u0442\u0438\u043f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0438, \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u043c\u043e\u043d\u0442\u0430\u0436\u0430, \u0441\u0442\u0435\u043f\u0435\u043d\u044c \u0437\u0430\u0449\u0438\u0442\u044b, \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f \u043a \u043a\u043e\u0440\u043f\u0443\u0441\u0443 \u0438 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442 \u0441\u0442\u0440\u0430\u043d\u044b \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f.',
            'Before design, confirm charger quantity, power rating, parking layout, grid capacity, billing/monitoring requirement, and future expansion plan.': '\u041f\u0435\u0440\u0435\u0434 \u043f\u0440\u043e\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435\u043c \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u0435 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0437\u0430\u0440\u044f\u0434\u043d\u044b\u0445 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432, \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c, \u0441\u0445\u0435\u043c\u0443 \u043f\u0430\u0440\u043a\u043e\u0432\u043a\u0438, \u0435\u043c\u043a\u043e\u0441\u0442\u044c \u0441\u0435\u0442\u0438, \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f \u043a \u0431\u0438\u043b\u043b\u0438\u043d\u0433\u0443/\u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433\u0443 \u0438 \u043f\u043b\u0430\u043d \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u044f.'
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
    var FR_SOLUTIONS_TEXT_FALLBACKS = {
        "Long-term inspection, maintenance, defect handling, and emergency response for operating high-voltage line assets.": "Inspection longue durée, maintenance, traitement des défauts et intervention d’urgence pour les lignes haute tension en exploitation.",
        "Middle East": "Moyen-Orient",
        "Africa": "Afrique",
        "Southeast Asia": "Asie du Sud-Est",
        "Engineering Review": "Revue technique",
        "Representative General Contracting References": "Références représentatives de contractant général",
        "Kaifeng Bianjing Xihuafu Power Distribution": "Distribution électrique Kaifeng Bianjing Xihuafu",
        "The project planned 19 residential buildings, with RMB 31.19 million total power distribution engineering investment, including RMB 10 million in high-voltage and low-voltage cabinets and transformer equipment. The project has been energized.": "Le projet comprenait 19 bâtiments résidentiels, avec un investissement total de 31,19 millions RMB en ingénierie de distribution électrique, dont 10 millions RMB pour les armoires haute et basse tension et les équipements de transformation. Le projet a été mis sous tension.",
        "Huaiyang Industrial Park Charging Station": "Station de recharge du parc industriel de Huaiyang",
        "About RMB 2.3 million investment with 16 dual-gun DC chargers, two 2000kVA box transformers, 200kW PV canopy, and 20kW wind power equipment.": "Investissement d’environ 2,3 millions RMB avec 16 chargeurs DC double pistolet, deux transformateurs compacts de 2000 kVA, une ombrière PV de 200 kW et un équipement éolien de 20 kW.",
        "Provide entrusted operation, inspection, maintenance, and response support for high-voltage power supply lines serving highway stations, tunnels, substations, and critical facilities.": "Fournir un support d’exploitation confiée, d’inspection, de maintenance et d’intervention pour les lignes d’alimentation haute tension desservant stations autoroutières, tunnels, postes et installations critiques.",
        "Custody and maintenance for high-voltage power supply lines across operating facilities.": "Garde et maintenance des lignes d’alimentation haute tension sur sites en exploitation.",
        "Routine inspection, defect handling, emergency response, and safety-oriented field operations.": "Inspection régulière, traitement des défauts, intervention d’urgence et opérations de terrain orientées sécurité.",
        "Support for toll station, tunnel, substation, and public infrastructure power systems.": "Support des systèmes électriques de gares de péage, tunnels, postes et infrastructures publiques.",
        "Field experience across expressway line maintenance and 500kV substation expansion support.": "Expérience terrain en maintenance de lignes autoroutières et support d’extension de poste 500 kV.",
        "expressway power supply lines": "lignes d’alimentation autoroutières",
        "toll station and tunnel circuits": "circuits de gares de péage et tunnels",
        "Operation Coverage and Service Records": "Couverture d’exploitation et références de service",
        "Line operation services focus on safe continuity for distributed power supply assets across long-distance highway and substation scenarios.": "Les services d’exploitation de lignes visent la continuité sûre des actifs d’alimentation distribuée dans les scénarios autoroutiers longue distance et de postes.",
        "Expressway Line Custody": "Garde de lignes autoroutières",
        "Entrusted maintenance for 311km across the Luanshuang section of Mianchi-Xixia Expressway, Luoluan-Luolu Expressway, and Yaoluan section of Zhengluan Expressway, covering 32 toll station and tunnel high-voltage supply lines.": "Maintenance confiée sur 311 km couvrant la section Luanshuang de l’autoroute Mianchi-Xixia, l’autoroute Luoluan-Luolu et la section Yaoluan de l’autoroute Zhengluan, avec 32 lignes d’alimentation haute tension pour gares de péage et tunnels.",
        "Substation Expansion Support": "Support d’extension de poste",
        "For the Jinshanling 500kV substation bay expansion, Longxiang completed delivery and on-site installation and commissioning of high-voltage circuit breakers and disconnectors in 2021.": "Pour l’extension de la travée du poste Jinshanling 500 kV, Longxiang a réalisé en 2021 la livraison, l’installation sur site et la mise en service de disjoncteurs et sectionneurs haute tension.",
        "PV power access for factories, schools, hospitals, public buildings, and commercial rooftops.": "Raccordement photovoltaïque pour usines, écoles, hôpitaux, bâtiments publics et toitures commerciales.",
        "Grid connection cabinets, transformer systems, and switchgear for stable operation.": "Armoires de raccordement réseau, systèmes de transformation et appareillages pour une exploitation stable.",
        "Integrated monitoring and energy management for project operation teams.": "Supervision intégrée et gestion de l’énergie pour les équipes d’exploitation du projet.",
        "Flexible equipment configuration for rooftop, park-level, and distributed PV scenarios.": "Configuration flexible des équipements pour les scénarios photovoltaïques en toiture, à l’échelle d’un parc et distribués.",
        "PV Array": "Champ photovoltaïque",
        "Inverter": "Onduleur",
        "Transformer": "Transformateur",
        "Grid Cabinet": "Armoire réseau",
        "Grid-ready delivery": "Livraison prête au raccordement",
        "Hybrid renewable energy access for wind and solar resources.": "Accès hybride aux énergies renouvelables éoliennes et solaires.",
        "Energy storage support for peak shaving and renewable energy consumption.": "Support de stockage d’énergie pour l’écrêtement des pointes et la consommation des énergies renouvelables.",
        "EV charging station equipment with distribution and monitoring support.": "Équipements de station de recharge EV avec support de distribution et de supervision.",
        "Suitable for industrial parks, campuses, commercial complexes, and transport charging sites.": "Adapté aux parcs industriels, campus, complexes commerciaux et sites de recharge de transport.",
        "Energy Flow and System Topology": "Flux d’énergie et topologie du système",
        "Hybrid Energy Dispatch": "Dispatching énergétique hybride",
        "Coordinated power flow between grid supply, renewable generation, storage equipment, and charging terminals.": "Flux de puissance coordonné entre alimentation réseau, génération renouvelable, équipements de stockage et bornes de recharge.",
        "Electrical Configuration": "Configuration électrique",
        "Project-level transformer, switchgear, metering, and grid connection layouts for engineering design.": "Schémas de transformateurs, appareillages, comptage et raccordement réseau au niveau projet pour la conception d’ingénierie.",
        "Source-grid-load-storage coordination for commercial and industrial sites.": "Coordination source-réseau-charge-stockage pour sites commerciaux et industriels.",
        "Improved power reliability for critical buildings and park-level distribution networks.": "Fiabilité électrique améliorée pour bâtiments critiques et réseaux de distribution à l’échelle d’un parc.",
        "Flexible integration with transformers, switchgear, grid cabinets, and monitoring platforms.": "Intégration flexible avec transformateurs, appareillages, armoires réseau et plateformes de supervision.",
        "Scalable architecture for campuses, factories, and public infrastructure.": "Architecture évolutive pour campus, usines et infrastructures publiques.",
        "Public Buildings": "Bâtiments publics",
        "Highway Facilities": "Installations autoroutières",
        "Engineering Capability Behind Every Solution": "Capacité d’ingénierie derrière chaque solution",
        "High-tech Enterprise": "Entreprise high-tech",
        "Green Factory": "Usine verte",
        "Technology Center": "Centre technologique",
        "Charging Research Center": "Centre de recherche sur la recharge",
        "Transformer Research Center": "Centre de recherche sur les transformateurs",
        "Project type and application site": "Type de projet et site d’application",
        "Voltage level, load demand, and capacity": "Niveau de tension, demande de charge et capacité",
        "Grid-connected or off-grid operation mode": "Mode d’exploitation raccordé réseau ou hors réseau",
        "Solar, storage, EV charging, transformer, and switchgear scope": "Périmètre solaire, stockage, recharge EV, transformateur et appareillage",
        "Delivery boundary, installation environment, and destination country": "Limite de livraison, environnement d’installation et pays de destination"
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
        if (locale === 'fr' && pageSlug === 'solutions' && FR_SOLUTIONS_TEXT_FALLBACKS[value.trim()]) {
            return FR_SOLUTIONS_TEXT_FALLBACKS[value.trim()];
        }
        var pack = TEXT_FALLBACKS[locale] || {};
        return pack[value.trim()] || '';
    }

    function repairFrenchAccentQuestionMarks(value) {
        if (locale !== 'fr' || typeof value !== 'string' || value.indexOf('?') === -1) return value;
        return value
            .replace(/\?lectrique/g, 'électrique')
            .replace(/c\?blage/g, 'câblage')
            .replace(/\? valider/g, 'À valider')
            .replace(/p\?rim\?tre/g, 'périmètre')
            .replace(/b\?timents/g, 'bâtiments')
            .replace(/immerg\?s/g, 'immergés')
            .replace(/l\?huile/g, 'l’huile')
            .replace(/d\?usine/g, 'd’usine')
            .replace(/Bo\?te/g, 'Boîte')
            .replace(/\?quipements/g, 'équipements')
            .replace(/capacit\?/g, 'capacité')
            .replace(/r\?seau/g, 'réseau')
            .replace(/\?nerg\?tiques/g, 'énergétiques')
            .replace(/d\?exploitation/g, 'd’exploitation')
            .replace(/\?les/g, 'îles')
            .replace(/contr\?le/g, 'contrôle')
            .replace(/dur\?e/g, 'durée')
            .replace(/priorit\?/g, 'priorité')
            .replace(/d\?extension/g, 'd’extension')
            .replace(/personnalis\?e/g, 'personnalisée')
            .replace(/\?quipement/g, 'équipement')
            .replace(/adapt\?/g, 'adapté')
            .replace(/r\?els/g, 'réels')
            .replace(/apr\?s/g, 'après')
            .replace(/mod\?le/g, 'modèle')
            .replace(/sp\?cifications/g, 'spécifications')
            .replace(/s\?lection/g, 'sélection')
            .replace(/sch\?ma/g, 'schéma')
            .replace(/l\?environnement/g, 'l’environnement')
            .replace(/d\?installation/g, 'd’installation')
            .replace(/l\?enveloppe/g, 'l’enveloppe')
            .replace(/l\?implantation/g, 'l’implantation')
            .replace(/\?tre/g, 'être')
            .replace(/paramêtres/g, 'paramètres');
    }

    function localizedText(value) {
        var fallback = textFallback(value);
        if (fallback) return fallback;
        if (isArabic && typeof value === 'string' && ARABIC_TEXT_FALLBACKS[value.trim()]) {
            return ARABIC_TEXT_FALLBACKS[value.trim()];
        }
        return repairFrenchAccentQuestionMarks(value || '');
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
            if (value && (!isArabic || value !== item[key])) return repairFrenchAccentQuestionMarks(value);
        }
        if (isArabic) {
            if (item[key + 'Ar']) return item[key + 'Ar'];
            if (item[camelToSnake(key) + '_ar']) return item[camelToSnake(key) + '_ar'];
            if (item[key + '_ar']) return item[key + '_ar'];
            return localizedText(item[key]);
        }
        return localizedText(item[key] || '');
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
            if (Array.isArray(value) && value.length && (!isArabic || value !== item[key])) {
                if (locale === 'fr' || locale === 'ru') {
                    return value.map(function (entry) {
                        return typeof entry === 'string' ? localizedText(entry) : entry;
                    });
                }
                return value;
            }
        }
        if (isArabic) {
            if (Array.isArray(item[key + 'Ar']) && item[key + 'Ar'].length) return item[key + 'Ar'];
            if (Array.isArray(item[camelToSnake(key) + '_ar']) && item[camelToSnake(key) + '_ar'].length) return item[camelToSnake(key) + '_ar'];
            if (Array.isArray(item[key + '_ar']) && item[key + '_ar'].length) return item[key + '_ar'];
        }
        var list = Array.isArray(item[key]) ? item[key] : [];
        if (locale === 'fr' || locale === 'ru') {
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

    function clipSeoText(value, maxLength) {
        var textValue = String(value || '').replace(/\s+/g, ' ').trim();
        var chars = Array.from(textValue);
        if (chars.length <= maxLength) return textValue;
        var clipped = chars.slice(0, Math.max(0, maxLength - 3)).join('').replace(/[\s,;:.-]+\S*$/, '').trim();
        return (clipped || chars.slice(0, Math.max(0, maxLength - 3)).join('').trim()) + '...';
    }

    function cleanSeoTitle(value) {
        var textValue = String(value || '').replace(/\s+/g, ' ').trim();
        var maxLength = 90;
        if (Array.from(textValue).length <= maxLength) return textValue;
        var separator = ' | ';
        var index = textValue.lastIndexOf(separator);
        if (index > 0) {
            var suffix = textValue.slice(index + separator.length);
            var suffixLength = Array.from(suffix).length + separator.length;
            if (suffixLength < maxLength - 24) {
                return clipSeoText(textValue.slice(0, index), maxLength - suffixLength) + separator + suffix;
            }
        }
        return clipSeoText(textValue, maxLength);
    }

    function cleanMetaDescription(value) {
        return clipSeoText(value, 170);
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

    function upsertJsonLd(key, data) {
        if (!key || !data) return;
        var script = document.querySelector('script[data-schema-auto="' + key + '"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-schema-auto', key);
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    }

    function stripBrandSuffix(value) {
        return String(value || '')
            .replace(/\s+\|\s+(Longxiang|Longxiang Electrical|Henan Longxiang Electrical).*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function localizedHomeLabel() {
        return {
            en: 'Home',
            ar: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
            fr: 'Accueil',
            ru: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f'
        }[locale] || 'Home';
    }

    function localizedHomePath() {
        if (window.LongxiangI18n && window.LongxiangI18n.localizedStaticPath) {
            return window.LongxiangI18n.localizedStaticPath('/', locale);
        }
        if (locale === 'ar') return '/ar/';
        if (locale === 'fr') return '/fr/';
        if (locale === 'ru') return '/ru/';
        return '/';
    }

    function contentPageSchemaType() {
        return {
            'about-us': 'AboutPage',
            solutions: 'WebPage',
            education: 'WebPage',
            certifications: 'CollectionPage',
            compare: 'WebPage'
        }[pageSlug] || '';
    }

    function visiblePageName(title) {
        var heading = document.querySelector('.page-hero h1');
        var headingText = heading ? String(heading.textContent || '').replace(/\s+/g, ' ').trim() : '';
        return headingText || stripBrandSuffix(title) || document.title || 'Longxiang Electrical';
    }

    function injectContentPageSchema(title, description, canonicalUrl) {
        var supportedSchemaLocales = ['en', 'ar', 'fr', 'ru'];
        var schemaType = contentPageSchemaType();
        if (!schemaType || supportedSchemaLocales.indexOf(locale) === -1 || !canonicalUrl) return;

        var name = visiblePageName(title);
        var language = document.documentElement.getAttribute('lang') || locale;
        var pageSchema = {
            '@context': 'https://schema.org',
            '@type': schemaType,
            name: name,
            description: description || stripBrandSuffix(title),
            url: canonicalUrl,
            inLanguage: language,
            isPartOf: {
                '@type': 'WebSite',
                name: 'Longxiang Electrical',
                url: window.location.origin + '/'
            }
        };
        var homeUrl = window.location.origin + localizedHomePath();
        upsertJsonLd('content-page', pageSchema);
        upsertJsonLd('content-breadcrumb', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: localizedHomeLabel(),
                    item: homeUrl
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: name,
                    item: canonicalUrl
                }
            ]
        });
    }

    function currentCanonicalUrl() {
        var canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && canonical.href) return canonical.href;
        return absoluteSiteUrl(window.location.pathname);
    }

    function currentMetaDescription() {
        var meta = document.querySelector('meta[name="description"]');
        return meta ? meta.getAttribute('content') || '' : '';
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
        if (pageSlug === 'compare' && locale === 'ar') {
            return {
                description: 'قارن نماذج معدات الطاقة المختارة من Longxiang جنباً إلى جنب، وراجع الفئات والمواصفات الأساسية قبل اختيار التكوين المناسب لمشروعك.',
                canonicalPath: '/compare.html'
            };
        }
        if (pageSlug === 'certifications' && locale === 'ar') {
            return {
                description: 'استعرض شهادات الجودة والاعتمادات الفنية وبراءات الاختراع ووثائق التأهيل الخاصة بشركة Henan Longxiang Electrical لدعم مراجعة المشروعات والتوريد.',
                canonicalPath: '/certifications.html'
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
        if (defaults.description && Array.from(String(description || '').trim()).length < 50) {
            description = defaults.description;
        }
        title = cleanSeoTitle(title);
        description = cleanMetaDescription(description);
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
        injectContentPageSchema(title, description, canonicalUrl);
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
        var emailLabel = localizedOrPageFallback(page, 'emailLabel', 'contactEmailLabel', localized(page, 'emailLabel'));
        var addressLabel = localizedOrPageFallback(page, 'factoryAddressLabel', 'contactAddressLabel', localized(page, 'factoryAddressLabel'));
        var socialTitle = localizedOrPageFallback(page, 'socialTitle', 'contactSocialTitle', localized(page, 'socialTitle'));
        var mapTitle = localizedOrPageFallback(page, 'mapTitle', 'contactMapTitle', localized(page, 'mapTitle'));

        return '<section class="section bg-light contact-primary-section"><div class="container"><div class="contact-section">' +
            '<div class="contact-info-card fade-in-left">' +
            '<div class="contact-section-heading"><span>' + escapeHtml(localized(page, 'companyName')) + '</span><h2>' + escapeHtml(infoTitle) + '</h2></div>' +
            '<div class="contact-info-list">' +
            '<div class="contact-info-row contact-email-row"><span>&#9993;</span><div><strong>' + escapeHtml(emailLabel) + '</strong><a href="' + escapeHtml(emailHref(body.email)) + '">' + escapeHtml(body.email || '') + '</a></div></div>' +
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

    injectContentPageSchema(document.title, currentMetaDescription(), currentCanonicalUrl());

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
