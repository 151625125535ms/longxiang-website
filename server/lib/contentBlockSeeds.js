const {
    overlayLifecycleInitialized,
    createContentBlock,
    updateContentBlock
} = require('./contentBlockLifecycle');
const { syncContentBlockAssetReferences } = require('./assetReferences');

const CONTENT_BLOCK_SEEDS = [
    {
        slug: 'company-identity',
        title_en: 'Company Identity',
        sort_order: 5,
        body_json: {
            legalName: 'Henan Longxiang Electric Co., Ltd.',
            brandName: 'Longxiang Electric',
            registeredCapital: 'RMB 69.552 million',
            headquarters: 'Xinzheng City, Zhengzhou City, Henan Province, P.R. China',
            productionBase: 'Huaiyang District, Zhoukou City, Henan Province, P.R. China',
            globalSalesEmail: 'henanlxgj@163.com',
            globalWebsite: 'https://www.lxenelectric.com/',
            chinaWebsite: 'https://www.lxelec.cn/'
        }
    },
    {
        slug: 'home',
        title_en: 'Home',
        sort_order: 10,
        body_json: {
            hero: {
                title: 'Henan Longxiang Electric',
                subtitle: 'Energy-saving power equipment for industrial, utility, and renewable energy projects.',
                titleAr: 'شركة خنان لونغشيانغ إلكتريك',
                subtitleAr: 'معدات كهربائية موفرة للطاقة للمشروعات الصناعية ومرافق الطاقة والطاقة المتجددة.',
                backgroundImage: 'longxiang-factory-gate.jpg',
                logo: 'longxiang-logo-symbol.png',
                logoAlt: 'Longxiang Electric logo',
                logoAltAr: 'شعار لونغشيانغ إلكتريك',
                actions: [
                    { label: 'View Products', labelAr: 'عرض المنتجات', href: 'products.html', className: 'hero-hex-btn primary' },
                    { label: 'Contact Us', labelAr: 'اتصل بنا', href: 'contact.html', className: 'hero-hex-btn' }
                ]
            },
            proof: [
                { value: '40+', label: 'years of electrical equipment experience', labelAr: 'سنة من الخبرة في معدات الكهرباء' },
                { value: '30+', label: 'patents and technical achievements', labelAr: 'براءة وإنجاز تقني' },
                { value: '100+', label: 'project applications', labelAr: 'تطبيق مشروع' }
            ],
            products: {
                title: 'Products',
                text: 'Explore transformers, switchgear, and integrated power distribution solutions.',
                titleAr: 'المنتجات',
                textAr: 'استكشف المحولات ومعدات المفاتيح وحلول توزيع الطاقة المتكاملة.',
                allProductsLabel: 'All Products',
                allProductsLabelAr: 'جميع المنتجات',
                allProductsHref: 'products.html'
            },
            applications: {
                enabled: true,
                title: 'Application Industries',
                text: 'Longxiang equipment supports industrial power distribution, grid upgrades, renewable energy, and infrastructure projects.',
                titleAr: 'قطاعات التطبيق',
                textAr: 'تدعم معدات لونغشيانغ توزيع الطاقة الصناعية وتحديث الشبكات والطاقة المتجددة ومشروعات البنية التحتية.',
                button: { label: 'View Solutions', labelAr: 'عرض الحلول', href: 'solutions.html' },
                cards: [
                    { title: 'Industrial Power', titleAr: 'الطاقة الصناعية', text: 'Stable transformer and switchgear support for factories and parks.', textAr: 'دعم مستقر بالمحولات ومعدات المفاتيح للمصانع والمجمعات الصناعية.' },
                    { title: 'Renewable Energy', titleAr: 'الطاقة المتجددة', text: 'Equipment support for photovoltaic, wind, and storage scenarios.', textAr: 'دعم بالمعدات لمشروعات الطاقة الشمسية وطاقة الرياح وأنظمة التخزين.' },
                    { title: 'Infrastructure', titleAr: 'البنية التحتية', text: 'Power distribution solutions for public and commercial projects.', textAr: 'حلول توزيع الطاقة للمشروعات العامة والتجارية.' }
                ]
            },
            news: {
                enabled: true,
                title: 'News & Updates',
                text: 'Follow Longxiang project updates, technical progress, and company news.',
                titleAr: 'الأخبار والتحديثات',
                textAr: 'تابع تحديثات مشروعات لونغشيانغ والتقدم التقني وأخبار الشركة.',
                button: { label: 'Contact for Updates', labelAr: 'تواصل للاطلاع على التحديثات', href: 'contact.html' },
                cards: [
                    { date: '2026', title: 'Manufacturing Capability Upgrade', text: 'Longxiang continues to improve power equipment production and quality control.' },
                    { date: '2026', title: 'Energy-Saving Equipment Focus', text: 'Product solutions remain focused on reliable, low-loss operation.' },
                    { date: '2026', title: 'Project Support', text: 'The team supports model selection for industrial and energy scenarios.' }
                ]
            },
            trust: {
                title: 'Trusted Manufacturing Capability',
                text: 'Longxiang combines manufacturing, quality control, and project delivery experience.',
                titleAr: 'قدرات تصنيع موثوقة',
                textAr: 'تجمع لونغشيانغ بين التصنيع وضبط الجودة وخبرة تسليم المشروعات.',
                chips: [],
                cards: []
            },
            features: [
                { title: 'Energy Efficiency', titleAr: 'كفاءة الطاقة', text: 'Focused on low-loss, reliable power equipment.', textAr: 'تركيز على معدات طاقة موثوقة ومنخفضة الفقد.' },
                { title: 'Project Support', titleAr: 'دعم المشروعات', text: 'Suitable for industrial, grid, and renewable energy scenarios.', textAr: 'مناسبة للقطاعات الصناعية والشبكات ومشروعات الطاقة المتجددة.' },
                { title: 'Quality Control', titleAr: 'ضبط الجودة', text: 'Standardized production and inspection processes.', textAr: 'عمليات إنتاج وفحص معيارية.' }
            ],
            stats: [
                { value: '40+', count: 40, label: 'Years Experience', labelAr: 'سنة خبرة' },
                { value: '30+', count: 30, label: 'Patents', labelAr: 'براءة اختراع' },
                { value: '100+', count: 100, label: 'Projects', labelAr: 'مشروع' }
            ],
            cta: {
                title: 'Need a power distribution solution?',
                text: 'Tell us your voltage, capacity, and project scenario. Our team will help match the right equipment.',
                titleAr: 'هل تحتاج إلى حل لتوزيع الطاقة؟',
                textAr: 'أخبرنا بالجهد والسعة وسيناريو المشروع، وسيساعدك فريقنا في اختيار المعدات المناسبة.',
                button: { label: 'Send Inquiry', labelAr: 'إرسال استفسار', href: 'contact.html' }
            },
            seo: {
                title: 'Henan Longxiang Electric | Power Equipment Manufacturer',
                description: 'Longxiang Electric manufactures energy-saving transformers, switchgear, and power distribution equipment.'
            }
        }
    },
    {
        slug: 'solutions',
        title_en: 'Solutions',
        sort_order: 20,
        body_json: {
            hero: {
                title: 'Solutions',
                subtitle: 'Power equipment solutions for industry, infrastructure, and new energy.',
                titleAr: 'الحلول',
                subtitleAr: 'حلول معدات الطاقة للصناعة والبنية التحتية والطاقة الجديدة.'
            },
            anchors: [],
            overview: { title: 'Application-Oriented Solutions', titleAr: 'حلول موجهة حسب التطبيق', text: 'Select equipment and service support by project scenario.', textAr: 'اختر المعدات ودعم الخدمة وفقاً لسيناريو المشروع.', cards: [] },
            marketFit: { title: 'Project Fit', titleAr: 'ملاءمة المشروع', text: 'Designed for stable operation and practical deployment.', textAr: 'مصممة للتشغيل المستقر والتنفيذ العملي.', items: [] },
            sections: [],
            scenarios: { title: 'Scenarios', titleAr: 'السيناريوهات', items: [] },
            credentials: { title: 'Credentials', titleAr: 'الاعتمادات', text: '' },
            cta: { title: 'Discuss Your Project', titleAr: 'ناقش مشروعك', text: 'Share your project requirements with us.', textAr: 'شاركنا متطلبات مشروعك.', button: { label: 'Contact Us', labelAr: 'اتصل بنا', href: 'contact.html' } },
            seo: { title: 'Solutions | Longxiang Electric', description: 'Power equipment solutions from Longxiang Electric.' }
        }
    },
    {
        slug: 'about-us',
        title_en: 'About Us',
        sort_order: 30,
        body_json: {
            hero: {
                kicker: 'About Longxiang',
                title: 'About Longxiang',
                subtitle: 'Reliable power equipment manufacturing for industrial, grid, and energy projects.',
                kickerAr: 'عن لونغشيانغ',
                titleAr: 'عن لونغشيانغ',
                subtitleAr: 'تصنيع موثوق لمعدات الطاقة للمشروعات الصناعية ومشروعات الشبكات والطاقة.',
                backgroundImage: 'longxiang-factory-gate.jpg',
                actions: [
                    { label: 'View Products', labelAr: 'عرض المنتجات', href: 'products.html' },
                    { label: 'Contact Us', labelAr: 'اتصل بنا', href: 'contact.html' }
                ]
            },
            snapshot: {
                kicker: 'Company Profile',
                title: 'Power equipment manufacturing capability',
                text: 'Longxiang focuses on transformers, switchgear, and supporting power distribution equipment.',
                kickerAr: 'نبذة عن الشركة',
                titleAr: 'قدرات تصنيع معدات الطاقة',
                textAr: 'تركز لونغشيانغ على المحولات ومعدات المفاتيح ومعدات دعم توزيع الطاقة.',
                body: [
                    'The company supports industrial, infrastructure, and energy project scenarios.',
                    'Production and inspection processes are organized around reliable delivery and practical operation.'
                ],
                bodyAr: [
                    'تدعم الشركة سيناريوهات المشروعات الصناعية والبنية التحتية ومشروعات الطاقة.',
                    'تُنظم عمليات الإنتاج والفحص بما يضمن التسليم الموثوق والتشغيل العملي.'
                ],
                stats: [
                    { value: '40+', label: 'Years of experience', labelAr: 'سنة خبرة' },
                    { value: '30+', label: 'Technical achievements', labelAr: 'إنجاز تقني' },
                    { value: '100+', label: 'Project applications', labelAr: 'تطبيق مشروع' }
                ],
                video: { caption: 'Longxiang manufacturing capability', captionAr: 'قدرات لونغشيانغ التصنيعية' }
            },
            history: {
                kicker: 'Development',
                title: 'Longxiang development history',
                text: 'Review key stages of Longxiang manufacturing and project service capability.',
                kickerAr: 'التطور',
                titleAr: 'تاريخ تطور لونغشيانغ',
                textAr: 'استعرض المراحل الرئيسية لتطور قدرات لونغشيانغ في التصنيع وخدمة المشروعات.'
            },
            milestones: [
                { date: '1980s', title: 'Manufacturing Foundation', titleAr: 'تأسيس التصنيع', text: 'Longxiang began building power equipment production capability.', textAr: 'بدأت لونغشيانغ في بناء قدراتها لإنتاج معدات الطاقة.' },
                { date: 'Today', dateAr: 'اليوم', title: 'Energy-Saving Equipment', titleAr: 'معدات موفرة للطاقة', text: 'The company continues to serve industrial and energy projects.', textAr: 'تواصل الشركة خدمة المشروعات الصناعية ومشروعات الطاقة.' }
            ],
            quality: {
                kicker: 'Quality Credentials',
                title: 'Qualification and quality control',
                text: 'Qualification materials, inspection routines, and production management support reliable delivery.',
                kickerAr: 'شهادات الجودة',
                titleAr: 'الاعتمادات وضبط الجودة',
                textAr: 'تدعم مواد الاعتماد وإجراءات الفحص وإدارة الإنتاج التسليم الموثوق.',
                items: ['Standardized production', 'Inspection process', 'Project support'],
                itemsAr: ['إنتاج معياري', 'إجراءات الفحص', 'دعم المشروعات'],
                certs: []
            },
            cta: {
                title: 'Discuss Your Equipment Requirements',
                text: 'Share your project scenario and our team will help match suitable products.',
                titleAr: 'ناقش متطلبات معداتك',
                textAr: 'شاركنا سيناريو مشروعك وسيساعدك فريقنا في اختيار المنتجات المناسبة.',
                button: { label: 'Contact Us', labelAr: 'اتصل بنا', href: 'contact.html' }
            },
            seo: { title: 'About Longxiang Electric', description: 'Learn about Henan Longxiang Electric manufacturing capability.' }
        }
    },
    {
        slug: 'contact',
        title_en: 'Contact',
        sort_order: 40,
        body_json: {
            hero: {
                title: 'Contact Us',
                subtitle: 'Send your project requirements and our team will respond quickly.',
                titleAr: 'اتصل بنا',
                subtitleAr: 'أرسل متطلبات مشروعك وسيتواصل فريقنا معك بسرعة.'
            },
            email: 'henanlxgj@163.com',
            address: 'Henan, China',
            headquarters: 'Henan, China',
            officeHours: 'Monday to Friday',
            googleMapsEmbedUrl: '',
            openStreetMapUrl: '',
            mapLocations: {},
            contactPage: {
                companyName: 'Henan Longxiang Electric',
                infoTitle: 'Contact Longxiang',
                officeLabel: 'Phone',
                emailLabel: 'Email',
                factoryAddressLabel: 'Address',
                mapTitle: 'Longxiang Location',
                socialTitle: 'Social Media',
                companyNameAr: 'شركة خنان لونغشيانغ إلكتريك',
                infoTitleAr: 'التواصل مع لونغشيانغ',
                officeLabelAr: 'رقم الهاتف',
                emailLabelAr: 'البريد الإلكتروني',
                factoryAddressLabelAr: 'العنوان',
                mapTitleAr: 'موقع لونغشيانغ',
                socialTitleAr: 'وسائل التواصل الاجتماعي',
                form: {
                    title: 'Send Inquiry',
                    note: 'Leave your contact details and project requirements.',
                    footerText: 'We will respond after receiving your message.',
                    submitLabel: 'Submit Inquiry',
                    titleAr: 'إرسال استفسار',
                    noteAr: 'اترك بيانات الاتصال ومتطلبات المشروع.',
                    footerTextAr: 'سنرد بعد استلام رسالتك.',
                    submitLabelAr: 'إرسال الاستفسار',
                    fields: [
                        { name: 'name', label: 'Name', labelAr: 'الاسم', type: 'text', required: true },
                        { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', required: true },
                        { name: 'phone', label: 'Phone', labelAr: 'رقم الهاتف', type: 'text', column: 'right' },
                        { name: 'message', label: 'Message', labelAr: 'الرسالة', type: 'textarea', required: true, column: 'right' }
                    ]
                },
                faq: {
                    title: 'Common Questions',
                    text: 'Contact us for model selection, quotation, and project support.',
                    titleAr: 'الأسئلة الشائعة',
                    textAr: 'تواصل معنا لاختيار الطراز وطلب عرض السعر ودعم المشروع.',
                    items: [
                        { question: 'What information should I provide?', questionAr: 'ما المعلومات التي ينبغي تقديمها؟', answer: 'Please share voltage level, capacity, quantity, application scenario, and destination if available.', answerAr: 'يرجى تزويدنا بمستوى الجهد والسعة والكمية وسيناريو التطبيق والوجهة إن توفرت.' },
                        { question: 'Can Longxiang support model selection?', questionAr: 'هل يمكن للونغشيانغ دعم اختيار الطراز؟', answer: 'Yes. Our team can provide product matching suggestions based on your project requirements.', answerAr: 'نعم. يمكن لفريقنا تقديم اقتراحات مطابقة المنتجات بناءً على متطلبات مشروعك.' }
                    ]
                }
            },
            seo: { title: 'Contact Longxiang Electric', description: 'Contact Henan Longxiang Electric for power equipment inquiries.' }
        }
    },
    {
        slug: 'product-pages',
        title_en: 'Product Pages',
        sort_order: 60,
        body_json: {
            productsHero: {
                title: 'Products',
                subtitle: 'Browse Longxiang transformers, switchgear, and power distribution equipment.',
                titleAr: 'المنتجات',
                subtitleAr: 'تصفح محولات لونغشيانغ ومعدات المفاتيح ومعدات توزيع الطاقة.'
            },
            detailHero: {
                title: 'Product Details',
                subtitle: 'Review product information and request a quotation.',
                titleAr: 'تفاصيل المنتج',
                subtitleAr: 'راجع معلومات المنتج واطلب عرض سعر.'
            },
            detailLabels: {
                overview: 'Overview',
                specifications: 'Specifications',
                inquiry: 'Request a Quote',
                relatedProducts: 'Related Products',
                overviewAr: 'نظرة عامة',
                specificationsAr: 'المواصفات',
                inquiryAr: 'طلب عرض سعر',
                relatedProductsAr: 'منتجات ذات صلة'
            },
            notFound: {
                title: 'Product not found',
                text: 'Please return to the product list and choose another item.',
                button: { label: 'Back to Products', href: 'products.html' }
            },
            listingSupport: {
                title: 'Product Support',
                text: 'Filter by product category and contact us for model selection support.'
            },
            listingCta: {
                title: 'Need model selection help?',
                text: 'Send us your project parameters and application scenario.',
                button: { label: 'Contact Us', href: 'contact.html' }
            },
            detailSupport: {
                title: 'Technical Support',
                text: 'Our team can help confirm parameters, voltage levels, and delivery requirements.'
            },
            detailFaq: [],
            inquiryForm: {
                title: 'Product Inquiry',
                note: 'Leave your contact details and requirements.',
                submitLabel: 'Submit Inquiry',
                titleAr: 'استفسار عن المنتج',
                noteAr: 'اترك بيانات الاتصال ومتطلباتك.',
                submitLabelAr: 'إرسال الاستفسار'
            },
            seo: { title: 'Products | Longxiang Electric', description: 'Product list of Longxiang Electric.' },
            detailSeo: { title: 'Product Detail | Longxiang Electric', description: 'Longxiang Electric product details.' }
        }
    },
    {
        slug: 'global-shell',
        title_en: 'Global Shell',
        sort_order: 70,
        body_json: {
            navigation: {
                quickTitle: 'Quick Links',
                productsTitle: 'Products',
                cookieSettingsLabel: 'Cookie Settings',
                quickTitleAr: 'روابط سريعة',
                productsTitleAr: 'المنتجات',
                cookieSettingsLabelAr: 'إعدادات ملفات تعريف الارتباط',
                mainLinks: [
                    { label: 'Home', labelAr: 'الرئيسية', href: 'index.html', activePages: ['index.html'] },
                    { label: 'Products', labelAr: 'المنتجات', href: 'products.html', activePages: ['products.html', 'product-detail.html'] },
                    { label: 'Applications', labelAr: 'التطبيقات', href: 'solutions.html', activePages: ['solutions.html'] },
                    { label: 'About Us', labelAr: 'من نحن', href: 'about.html', activePages: ['about.html'] },
                    { label: 'Contact', labelAr: 'اتصل بنا', href: 'contact.html', activePages: ['contact.html'] }
                ],
                quickLinks: [
                    { label: 'About Us', labelAr: 'من نحن', href: 'about.html' },
                    { label: 'Contact Us', labelAr: 'اتصل بنا', href: 'contact.html' },
                    { label: 'Certificates', labelAr: 'الشهادات', href: 'certifications.html' },
                    {
                        label: 'China Website / 中国官网',
                        labelAr: 'الموقع الرسمي في الصين',
                        labelFr: 'Site officiel en Chine',
                        labelRu: 'Официальный сайт в Китае',
                        href: 'https://www.lxelec.cn/'
                    }
                ],
                productLinks: [
                    { label: 'All Products', labelAr: 'جميع المنتجات', href: 'products.html' }
                ]
            },
            footer: {
                text: 'Henan Longxiang Electric manufactures power equipment for industrial and energy projects.',
                textAr: 'تصنع شركة خنان لونغشيانغ إلكتريك معدات الطاقة للمشروعات الصناعية ومشروعات الطاقة.',
                copyright: '© Henan Longxiang Electric Co., Ltd. All rights reserved.',
                copyrightAr: '© شركة خنان لونغشيانغ إلكتريك المحدودة. جميع الحقوق محفوظة.',
                icp: ''
            },
            inquiry: {
                title: 'Get a Quote',
                text: 'Send us your requirements and our team will respond quickly.',
                floatingLabel: 'Inquiry',
                hiddenName: 'Website visitor',
                productContext: 'General inquiry',
                messagePlaceholder: 'Tell us your voltage, capacity, quantity, and project location.',
                emailPlaceholder: 'Email',
                phonePlaceholder: 'Phone',
                submitLabel: 'Submit',
                modalTitle: 'Request a Quote',
                modalText: 'Fill in your contact details and project requirements.',
                modalSubmitLabel: 'Submit Inquiry',
                generalInquiryLabel: 'General inquiry',
                productMessageTemplate: 'I would like to request a quotation for {product}.',
                productIdMessageTemplate: 'I would like to request a quotation for product ID {product}.',
                titleAr: 'طلب عرض سعر',
                textAr: 'أرسل متطلباتك وسيتواصل فريقنا معك بسرعة.',
                floatingLabelAr: 'استفسار',
                hiddenNameAr: 'زائر الموقع',
                productContextAr: 'استفسار عام',
                messagePlaceholderAr: 'اذكر الجهد والسعة والكمية وموقع المشروع.',
                emailPlaceholderAr: 'البريد الإلكتروني',
                phonePlaceholderAr: 'رقم الهاتف',
                submitLabelAr: 'إرسال',
                modalTitleAr: 'طلب عرض سعر',
                modalTextAr: 'املأ بيانات الاتصال ومتطلبات المشروع.',
                modalSubmitLabelAr: 'إرسال الاستفسار',
                generalInquiryLabelAr: 'استفسار عام',
                productMessageTemplateAr: 'أرغب في طلب عرض سعر لـ {product}.',
                productIdMessageTemplateAr: 'أرغب في طلب عرض سعر للمنتج رقم {product}.',
                modalFields: [
                    { name: 'name', label: 'Name', labelAr: 'الاسم', type: 'text', required: true, row: 1 },
                    { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', required: true, row: 1 },
                    { name: 'phone', label: 'Phone', labelAr: 'رقم الهاتف', type: 'text', row: 2 },
                    { name: 'company', label: 'Company', labelAr: 'الشركة', type: 'text', row: 2 },
                    { name: 'message', label: 'Message', labelAr: 'الرسالة', type: 'textarea', required: true, rows: 5 }
                ]
            },
            cookieConsent: {},
            embedConsent: {},
            seoDefaults: {
                title: 'Henan Longxiang Electric',
                description: 'Power equipment manufacturer.'
            }
        }
    },
    {
        slug: 'certifications',
        title_en: 'Certifications',
        sort_order: 80,
        body_json: {
            hero: { title: 'Certificates', subtitle: 'Quality, qualification, and technical certificates.' },
            intro: { title: 'Quality Credentials', text: 'Review Longxiang qualification materials.' },
            stats: [],
            toolbar: { searchPlaceholder: 'Search certificates', allLabel: 'All' },
            seo: { title: 'Certificates | Longxiang Electric', description: 'Certificates and qualification materials.' }
        }
    },
    {
        slug: 'compare',
        title_en: 'Compare',
        sort_order: 90,
        body_json: {
            hero: { title: 'Product Comparison', subtitle: 'Compare selected products.', titleAr: 'مقارنة المنتجات', subtitleAr: 'قارن بين المنتجات المحددة.' },
            toolbar: { backLabel: 'Back', backLabelAr: 'رجوع', printLabel: 'Print', printLabelAr: 'طباعة' },
            emptyState: { title: 'No products selected', titleAr: 'لم يتم تحديد منتجات', text: 'Return to the product list and choose products to compare.', textAr: 'ارجع إلى قائمة المنتجات واختر المنتجات المراد مقارنتها.' },
            table: { productLabel: 'Product', productLabelAr: 'المنتج', categoryLabel: 'Category', categoryLabelAr: 'الفئة', imageLabel: 'Image', imageLabelAr: 'الصورة', capacitiesLabel: 'Capacities', capacitiesLabelAr: 'السعات', voltagesLabel: 'Voltages', voltagesLabelAr: 'الجهود', descriptionLabel: 'Description', descriptionLabelAr: 'الوصف', specificationLabel: 'Specification', specificationLabelAr: 'المواصفة' },
            seo: { title: 'Product Comparison | Longxiang Electric', description: 'Compare Longxiang Electric products.' }
        }
    },
    {
        slug: 'not-found',
        title_en: 'Not Found',
        sort_order: 100,
        body_json: {
            panel: {
                title: 'Page Not Found',
                text: 'The page you are looking for does not exist or has been moved.',
                buttons: [
                    { label: 'Back Home', href: 'index.html' },
                    { label: 'View Products', href: 'products.html' }
                ]
            },
            seo: { title: 'Page Not Found | Longxiang Electric', description: 'The page was not found.' }
        }
    }
];

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function arrayMergeKey(item, index) {
    if (!isPlainObject(item)) return 'index:' + index;
    if (item.name) return 'name:' + item.name;
    if (item.href && item.label) return 'href-label:' + item.href + '|' + item.label;
    if (item.href) return 'href:' + item.href;
    if (item.value !== undefined) return 'value:' + item.value;
    if (item.id) return 'id:' + item.id;
    if (item.title) return 'title:' + item.title;
    return 'index:' + index;
}

function mergeArrayItems(target, defaults) {
    const output = Array.isArray(target) ? target.slice() : [];
    const indexByKey = new Map();
    let changed = false;

    output.forEach(function (item, index) {
        indexByKey.set(arrayMergeKey(item, index), index);
    });

    defaults.forEach(function (defaultItem, index) {
        const matchIndex = indexByKey.get(arrayMergeKey(defaultItem, index));
        if (matchIndex === undefined) return;

        const currentItem = output[matchIndex];
        if (isPlainObject(currentItem) && isPlainObject(defaultItem)) {
            const merged = mergeMissingFields(currentItem, defaultItem);
            if (merged.changed) {
                output[matchIndex] = merged.value;
                changed = true;
            }
        }
    });

    return { value: output, changed };
}

function parseBodyJson(value) {
    try {
        const parsed = JSON.parse(value || '{}');
        return isPlainObject(parsed) ? parsed : {};
    } catch (err) {
        return {};
    }
}

function mergeMissingFields(target, defaults) {
    const output = isPlainObject(target) ? { ...target } : {};
    let changed = false;

    Object.keys(defaults || {}).forEach(function (key) {
        const defaultValue = defaults[key];
        const currentValue = output[key];
        if (currentValue === undefined) {
            output[key] = defaultValue;
            changed = true;
            return;
        }
        if (isPlainObject(currentValue) && isPlainObject(defaultValue)) {
            const merged = mergeMissingFields(currentValue, defaultValue);
            if (merged.changed) {
                output[key] = merged.value;
                changed = true;
            }
        }
        if (Array.isArray(currentValue) && Array.isArray(defaultValue)) {
            const merged = mergeArrayItems(currentValue, defaultValue);
            if (merged.changed) {
                output[key] = merged.value;
                changed = true;
            }
        }
    });

    return { value: output, changed };
}

function hasMeaningfulValue(value) {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.some(hasMeaningfulValue);
    if (isPlainObject(value)) {
        return Object.keys(value).some(function (key) {
            return key !== 'sort_order' && hasMeaningfulValue(value[key]);
        });
    }
    return false;
}

function getNestedValue(obj, path) {
    return path.reduce(function (current, key) {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

function setNestedValue(obj, path, value) {
    let current = obj;
    path.forEach(function (key, index) {
        if (index === path.length - 1) {
            current[key] = value;
            return;
        }
        if (!isPlainObject(current[key])) current[key] = {};
        current = current[key];
    });
}

function fillBlankArrayFromDefaults(body, defaults, path) {
    const defaultValue = getNestedValue(defaults, path);
    if (!Array.isArray(defaultValue) || !defaultValue.length) return false;
    const currentValue = getNestedValue(body, path);
    if (Array.isArray(currentValue) && hasMeaningfulValue(currentValue)) return false;
    setNestedValue(body, path, defaultValue);
    return true;
}

function mergeSeedBody(slug, target, defaults) {
    const merged = mergeMissingFields(target, defaults);
    let changed = merged.changed;
    const body = merged.value;

    if (slug === 'about-us') {
        changed = fillBlankArrayFromDefaults(body, defaults, ['milestones']) || changed;
    }
    if (slug === 'contact') {
        changed = fillBlankArrayFromDefaults(body, defaults, ['contactPage', 'faq', 'items']) || changed;
    }

    return { value: body, changed };
}

function ensureContentBlockSeeds(db) {
    if (!db) return { inserted: 0, updated: 0, checked: 0 };
    const now = Date.now();
    const lifecycleInitialized = overlayLifecycleInitialized(db);
    const select = db.prepare('SELECT * FROM content_blocks WHERE slug = ?');
    const insert = db.prepare(`
        INSERT OR IGNORE INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            (@slug, @title_en, @title_ar, @body_json, 'published', @sort_order, 1, @created_at, @updated_at)
    `);
    const update = db.prepare(`
        UPDATE content_blocks
        SET body_json = @body_json, updated_at = @updated_at
        WHERE slug = @slug
    `);

    let inserted = 0;
    let updated = 0;
    const run = db.transaction(function () {
        CONTENT_BLOCK_SEEDS.forEach(function (seed) {
            const existing = select.get(seed.slug);
            if (existing) {
                const merged = mergeSeedBody(seed.slug, parseBodyJson(existing.body_json), seed.body_json || {});
                if (merged.changed) {
                    if (lifecycleInitialized) {
                        updateContentBlock({
                            db,
                            contentBlockId: existing.id,
                            expectedVersion: existing.version,
                            actor: { username: 'content-seed' },
                            next: { body_json: merged.value },
                            afterWrite: function () {
                                syncContentBlockAssetReferences(db, existing.id);
                            }
                        });
                    } else {
                        update.run({
                            slug: seed.slug,
                            body_json: JSON.stringify(merged.value),
                            updated_at: now
                        });
                    }
                    updated += 1;
                }
                return;
            }

            if (lifecycleInitialized) {
                createContentBlock({
                    db,
                    actor: { username: 'content-seed' },
                    seed: {
                        ...seed,
                        status: 'published'
                    },
                    afterWrite: function (change) {
                        syncContentBlockAssetReferences(db, change.after.id);
                    }
                });
                inserted += 1;
            } else {
                const result = insert.run({
                    slug: seed.slug,
                    title_en: seed.title_en,
                    title_ar: seed.title_ar || '',
                    body_json: JSON.stringify(seed.body_json || {}),
                    sort_order: seed.sort_order || 0,
                    created_at: now,
                    updated_at: now
                });
                inserted += result.changes;
            }
        });
    });

    run.immediate();
    return { inserted, updated, checked: CONTENT_BLOCK_SEEDS.length };
}

module.exports = {
    CONTENT_BLOCK_SEEDS,
    ensureContentBlockSeeds
};
