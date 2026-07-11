const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));

const now = Date.now();

function image(src, alt, altAr, width, height) {
    return { src, alt, altAr, width, height };
}

const blocks = [
    {
        slug: 'home',
        title_en: 'Home Page',
        body: {
            hero: {
                title: 'Henan Longxiang Electric',
                titleAr: 'Henan Longxiang Electric',
                subtitle: 'Transformer, switchgear and EV charging equipment manufacturer for power distribution projects.',
                subtitleAr: 'شركة مصنعة للمحولات ومعدات المفاتيح ومعدات شحن المركبات الكهربائية لمشروعات توزيع الطاقة.',
                backgroundImage: '5、厂区厂貌/龙翔公司正门.jpg',
                logo: 'longxiang-logo-symbol.png',
                actions: [
                    { label: 'View Products', labelAr: 'عرض المنتجات', href: 'products.html', className: 'hero-hex-btn products' },
                    { label: 'Request a Quote', labelAr: 'طلب عرض سعر', href: 'contact.html', className: 'hero-hex-btn solutions' },
                    { label: 'Talk to an Engineer', labelAr: 'تحدث مع مهندس', href: 'solutions.html', className: 'hero-hex-btn contact' }
                ]
            },
            proof: [
                { value: '2003', label: 'Founded', labelAr: 'تأسست' },
                { value: 'NEEQ', label: 'Listed 836070', labelAr: 'مدرجة 836070' },
                { value: 'Power', label: 'Distribution Equipment', labelAr: 'معدات توزيع الطاقة' }
            ],
            stats: [
                { value: '2003', count: 2003, label: 'Year Founded', labelAr: 'سنة التأسيس' },
                { value: '10,000+', count: 10000, label: 'Sq.m Factory Area', labelAr: 'مساحة المصنع بالمتر المربع' },
                { value: '100+', count: 100, label: 'Patent Certifications', labelAr: 'براءات وشهادات' },
                { value: '20+', count: 20, label: 'Research Partners', labelAr: 'شركاء بحث' }
            ],
            seo: {
                title: 'Transformer, Switchgear & EV Charger Manufacturer | Henan Longxiang Electric',
                description: 'Henan Longxiang Electric manufactures transformers, switchgear, and EV charging equipment for power distribution projects.',
                image: '5、厂区厂貌/龙翔公司正门.jpg'
            }
        }
    },
    {
        slug: 'solutions',
        title_en: 'Solutions',
        body: {
            hero: {
                title: 'Integrated Smart Energy Solutions',
                titleAr: 'حلول الطاقة الذكية المتكاملة',
                subtitle: 'Transformer, switchgear, EV charging, solar, storage, and microgrid equipment support for commercial and industrial power infrastructure.',
                subtitleAr: 'دعم بمعدات المحولات والمفاتيح وشحن المركبات الكهربائية والطاقة الشمسية والتخزين والشبكات المصغرة للبنية التحتية التجارية والصناعية.',
                backgroundImage: 'assets/solutions/smart-energy/smart-ev-network-hero.png'
            },
            anchors: [
                { href: '#engineering-epc', label: 'Engineering General Contracting', labelAr: 'المقاولات العامة للمشاريع الكهربائية' },
                { href: '#line-om', label: 'Line O&M Projects', labelAr: 'مشروعات تشغيل وصيانة الخطوط' },
                { href: '#wind-pv-ess-ev', label: 'Wind + PV + ESS + EV Charging', labelAr: 'رياح + شمس + تخزين + شحن' },
                { href: '#smart-microgrid', label: 'Smart Microgrid', labelAr: 'الشبكة المصغرة الذكية' },
                { href: '#pv-solution', label: 'C&I PV Solution', labelAr: 'حل الطاقة الشمسية التجاري والصناعي' }
            ],
            overview: {
                title: 'One Platform for Power Equipment, Project Delivery, and Operation',
                titleAr: 'منصة واحدة للمعدات الكهربائية وتسليم المشروعات والتشغيل',
                text: 'Longxiang combines power transformation, distribution, charging, monitoring, engineering delivery, and line maintenance into project-ready solutions for industrial parks, campuses, public buildings, highway facilities, and commercial energy sites, including requirements from the Middle East, Africa, and Southeast Asia.',
                textAr: 'تجمع Longxiang بين التحويل والتوزيع والشحن والمراقبة وتسليم المشروعات وصيانة الخطوط في حلول جاهزة للمجمعات الصناعية والجامعات والمباني العامة ومرافق الطرق ومواقع الطاقة التجارية، بما في ذلك متطلبات الشرق الأوسط وأفريقيا وجنوب شرق آسيا.',
                cards: [
                    { number: '01', title: 'Generate', titleAr: 'التوليد', text: 'Photovoltaic and wind power access for commercial and industrial renewable energy projects.', textAr: 'ربط الطاقة الشمسية وطاقة الرياح لمشروعات الطاقة المتجددة التجارية والصناعية.' },
                    { number: '02', title: 'Store', titleAr: 'التخزين', text: 'Containerized energy storage and distribution equipment for load shifting and reliable operation.', textAr: 'تخزين طاقة حاوي ومعدات توزيع لتحويل الأحمال وتحسين الاعتمادية.' },
                    { number: '03', title: 'Charge', titleAr: 'الشحن', text: 'EV charging cabinets, power conversion, and monitoring support for smart charging stations.', textAr: 'خزائن شحن وتحويل قدرة ومراقبة لمحطات الشحن الذكية.' },
                    { number: '04', title: 'Manage', titleAr: 'الإدارة', text: 'Microgrid coordination across generation, grid connection, storage, loads, and charging terminals.', textAr: 'تنسيق الشبكات المصغرة بين التوليد والربط والتخزين والأحمال ومحطات الشحن.' },
                    { number: '05', title: 'Deliver', titleAr: 'التسليم', text: 'EPC-style project coordination across equipment supply, civil works, installation, commissioning, and energization.', textAr: 'تنسيق مشروعات بنمط EPC يشمل التوريد والأعمال المدنية والتركيب والتشغيل والتغذية.' },
                    { number: '06', title: 'Maintain', titleAr: 'الصيانة', text: 'Long-term high-voltage line custody, inspection, maintenance, and emergency response for operating power assets.', textAr: 'إدارة وفحص وصيانة واستجابة طارئة طويلة الأمد لخطوط الجهد العالي وأصول الطاقة العاملة.' }
                ]
            },
            marketFit: {
                title: 'For Warm-Climate Distribution Projects',
                titleAr: 'لمشروعات التوزيع في المناخات الحارة',
                text: 'For early overseas inquiries, Longxiang focuses on clear technical matching instead of public MOQ or trade-term promises. Share the environment, voltage level, project scale, and equipment scope so engineers can review feasibility.',
                textAr: 'في الاستفسارات الخارجية المبكرة تركز Longxiang على المطابقة الفنية الواضحة بدلاً من وعود عامة حول الحد الأدنى أو شروط التجارة. شارك البيئة ومستوى الجهد وحجم المشروع ونطاق المعدات ليراجع المهندسون الجدوى.',
                items: [
                    { title: 'Middle East', titleAr: 'الشرق الأوسط', text: 'Industrial parks, solar power access, commercial buildings, and charging stations where heat tolerance and low maintenance matter.', textAr: 'مجمعات صناعية وربط شمسي ومبان تجارية ومحطات شحن حيث تتحكم مقاومة الحرارة وانخفاض الصيانة في القرار.' },
                    { title: 'Africa', titleAr: 'أفريقيا', text: 'Distribution transformers, switchgear, and project-ready equipment for utility, industrial, campus, and public infrastructure needs.', textAr: 'محولات توزيع ومعدات مفاتيح ومعدات جاهزة للمرافق والصناعة والجامعات والبنية التحتية العامة.' },
                    { title: 'Southeast Asia', titleAr: 'جنوب شرق آسيا', text: 'Compact distribution systems, PV integration, EV charging, and grid connection equipment for fast-growing sites.', textAr: 'أنظمة توزيع مدمجة وتكامل شمسي وشحن مركبات كهربائية ومعدات ربط للشبكة للمواقع سريعة النمو.' },
                    { title: 'Engineering Review', titleAr: 'مراجعة هندسية', text: 'Custom specifications are available on request after voltage, capacity, load, and installation requirements are confirmed.', textAr: 'تتوفر مواصفات مخصصة بعد تأكيد الجهد والسعة والحمل ومتطلبات التركيب.' }
                ]
            },
            sections: [
                {
                    id: 'engineering-epc',
                    indexLabel: 'Solution 01',
                    indexLabelAr: 'الحل 01',
                    title: 'Engineering General Contracting (EPC)',
                    titleAr: 'المقاولات العامة للمشاريع الكهربائية (EPC)',
                    text: 'Coordinate residential and commercial power distribution engineering from equipment configuration to installation, commissioning, energization, and handover.',
                    textAr: 'تنسيق هندسة توزيع الطاقة للمشروعات السكنية والتجارية من تكوين المعدات إلى التركيب والتشغيل والتغذية والتسليم.',
                    bullets: [
                        'Power distribution engineering for residential communities, industrial parks, and public facilities.',
                        'High-voltage and low-voltage switchgear, transformer, cable, metering, and auxiliary equipment configuration.',
                        'Integrated delivery from equipment supply through installation, commissioning, energization, and handover.',
                        'Kaifeng Bianjing Xihuafu project reference: RMB 31.19 million total distribution engineering investment and successful energization.'
                    ],
                    bulletsAr: [
                        'هندسة توزيع الطاقة للمجمعات السكنية والمجمعات الصناعية والمرافق العامة.',
                        'تكوين معدات المفاتيح عالية ومنخفضة الجهد والمحولات والكابلات والعدادات والمعدات المساعدة.',
                        'تسليم متكامل من توريد المعدات إلى التركيب والتشغيل والتغذية والتسليم.',
                        'مرجع مشروع Kaifeng Bianjing Xihuafu: استثمار 31.19 مليون يوان وتمت التغذية بنجاح.'
                    ],
                    button: { label: 'Discuss EPC Project', labelAr: 'ناقش مشروع EPC', inquiry: true, productName: 'Engineering General Contracting EPC', productNameAr: 'المقاولات العامة EPC' },
                    imageLayout: 'pv-board',
                    images: [
                        image('assets/solutions/project-services/kaifeng-xihuafu-power-distribution.png', 'Kaifeng Bianjing Xihuafu power distribution engineering project', 'مشروع توزيع الطاقة Kaifeng Bianjing Xihuafu', 600, 450),
                        image('assets/solutions/smart-energy/grid-connection-cabinet.png', 'Grid connection cabinet for power engineering projects', 'خزانة ربط الشبكة لمشروعات الطاقة', 349, 425),
                        image('assets/solutions/smart-energy/dry-type-transformer.png', 'Transformer equipment for power distribution engineering', 'معدات محولات لهندسة توزيع الطاقة', 636, 629)
                    ]
                },
                {
                    type: 'card-grid',
                    className: 'bg-light solution-system-map',
                    gridClass: 'solution-diagram-grid solution-image-led-grid',
                    title: 'Representative General Contracting References',
                    titleAr: 'مراجع تمثيلية للمقاولات العامة',
                    text: 'Project examples led by residential power distribution delivery, with charging station construction as complementary project capability.',
                    textAr: 'أمثلة لمشروعات تقودها أعمال توزيع الطاقة السكنية، مع إنشاء محطات الشحن كقدرة مكملة.',
                    cards: [
                        { title: 'Kaifeng Bianjing Xihuafu Power Distribution', titleAr: 'توزيع الطاقة في Kaifeng Bianjing Xihuafu', text: 'The project planned 19 residential buildings, with RMB 31.19 million total power distribution engineering investment, including RMB 10 million in high-voltage and low-voltage cabinets and transformer equipment. The project has been energized.', textAr: 'خطط المشروع لـ 19 مبنى سكنياً باستثمار إجمالي 31.19 مليون يوان في هندسة التوزيع، منها 10 ملايين يوان لخزائن الجهد العالي والمنخفض ومعدات المحولات. وقد تمت تغذية المشروع.', image: image('assets/solutions/project-services/kaifeng-xihuafu-power-distribution.png', 'Kaifeng Bianjing Xihuafu power distribution project', 'مشروع توزيع الطاقة Kaifeng Bianjing Xihuafu', 600, 450) },
                        { title: 'Huaiyang Industrial Park Charging Station', titleAr: 'محطة شحن مجمع هوايانغ الصناعي', text: 'About RMB 2.3 million investment with 16 dual-gun DC chargers, two 2000kVA box transformers, 200kW PV canopy, and 20kW wind power equipment.', textAr: 'استثمار يقارب 2.3 مليون يوان مع 16 شاحناً سريعاً ثنائي المسدس، ومحولين صندوقيين بقدرة 2000kVA، ومظلة كهروضوئية 200kW، ومعدات رياح 20kW.', image: image('assets/solutions/project-services/epc-charging-station.jpg', 'Huaiyang industrial park charging station with photovoltaic canopy', 'محطة شحن مجمع هوايانغ الصناعي مع مظلة كهروضوئية', 1439, 1080) }
                    ]
                },
                {
                    id: 'line-om',
                    indexLabel: 'Solution 02',
                    indexLabelAr: 'الحل 02',
                    title: 'Line Operation & Maintenance Projects',
                    titleAr: 'مشروعات تشغيل وصيانة الخطوط',
                    text: 'Provide entrusted operation, inspection, maintenance, and response support for high-voltage power supply lines serving highway stations, tunnels, substations, and critical facilities.',
                    textAr: 'توفير التشغيل والفحص والصيانة والاستجابة لخطوط تغذية الجهد العالي التي تخدم محطات الطرق والأنفاق والمحطات الفرعية والمرافق الحرجة.',
                    reverse: true,
                    light: true,
                    bullets: [
                        'Custody and maintenance for high-voltage power supply lines across operating facilities.',
                        'Routine inspection, defect handling, emergency response, and safety-oriented field operations.',
                        'Support for toll station, tunnel, substation, and public infrastructure power systems.',
                        'Field experience across expressway line maintenance and 500kV substation expansion support.'
                    ],
                    bulletsAr: [
                        'إدارة وصيانة خطوط تغذية الجهد العالي عبر المرافق العاملة.',
                        'فحص دوري ومعالجة العيوب والاستجابة الطارئة وعمليات ميدانية تركز على السلامة.',
                        'دعم أنظمة الطاقة لمحطات الرسوم والأنفاق والمحطات الفرعية والبنية التحتية العامة.',
                        'خبرة ميدانية في صيانة خطوط الطرق السريعة ودعم توسعات محطات 500kV.'
                    ],
                    button: { label: 'Request O&M Support', labelAr: 'طلب دعم التشغيل والصيانة', inquiry: true, productName: 'Line Operation and Maintenance Projects', productNameAr: 'تشغيل وصيانة الخطوط' },
                    images: [
                        image('assets/solutions/project-services/line-operation-maintenance.jpg', 'Technicians maintaining high-voltage power supply line equipment', 'فنيون يصينون معدات خط جهد عالي', 1280, 1707),
                        image('assets/solutions/project-services/substation-expansion.jpg', '500kV substation expansion project equipment', 'معدات مشروع توسعة محطة 500kV', 1024, 576)
                    ],
                    panel: {
                        label: 'Line operation service dashboard',
                        labelAr: 'لوحة خدمة تشغيل الخطوط',
                        items: [
                            { kicker: 'Route Custody', kickerAr: 'إدارة المسار', value: '311km', text: 'expressway power supply lines', textAr: 'خطوط تغذية طرق سريعة' },
                            { kicker: 'Coverage', kickerAr: 'التغطية', value: '32', text: 'toll station and tunnel circuits', textAr: 'دوائر محطات رسوم وأنفاق' }
                        ]
                    }
                },
                {
                    type: 'card-grid',
                    className: 'solution-system-map',
                    gridClass: 'solution-diagram-grid solution-image-led-grid',
                    title: 'Operation Coverage and Service Records',
                    titleAr: 'تغطية التشغيل وسجلات الخدمة',
                    text: 'Line operation services focus on safe continuity for distributed power supply assets across long-distance highway and substation scenarios.',
                    textAr: 'تركز خدمات تشغيل الخطوط على استمرارية آمنة لأصول التغذية الموزعة في سيناريوهات الطرق الطويلة والمحطات الفرعية.',
                    cards: [
                        { title: 'Expressway Line Custody', titleAr: 'إدارة خطوط الطرق السريعة', text: 'Entrusted maintenance for 311km across the Luanshuang section of Mianchi-Xixia Expressway, Luoluan-Luolu Expressway, and Yaoluan section of Zhengluan Expressway, covering 32 toll station and tunnel high-voltage supply lines.', textAr: 'صيانة موكلة لمسافة 311km عبر عدة مقاطع طرق سريعة، تغطي 32 خط تغذية عالي الجهد لمحطات الرسوم والأنفاق.', image: image('assets/solutions/project-services/line-operation-maintenance.jpg', 'Expressway high-voltage line maintenance work', 'أعمال صيانة خط جهد عالي على طريق سريع', 1280, 1707) },
                        { title: 'Substation Expansion Support', titleAr: 'دعم توسعة المحطات الفرعية', text: 'For the Jinshanling 500kV substation bay expansion, Longxiang completed delivery and on-site installation and commissioning of high-voltage circuit breakers and disconnectors in 2021.', textAr: 'في مشروع توسعة محطة جينشانلينغ 500kV، أنجزت Longxiang توريد وتركيب وتشغيل قواطع الجهد العالي ومفاتيح الفصل في الموقع عام 2021.', image: image('assets/solutions/project-services/substation-expansion.jpg', 'Chongqing Jinshan 500kV substation expansion project', 'مشروع توسعة محطة جينشان 500kV', 1024, 576) }
                    ]
                },
                {
                    id: 'wind-pv-ess-ev',
                    indexLabel: 'Solution 03',
                    indexLabelAr: 'الحل 03',
                    title: 'C&I Wind + PV + ESS + EV Charging Solution',
                    titleAr: 'حل الرياح والطاقة الشمسية والتخزين والشحن التجاري والصناعي',
                    text: 'Integrates wind power, photovoltaic generation, energy storage, EV charging, and intelligent monitoring into one coordinated energy system.',
                    textAr: 'يدمج طاقة الرياح والتوليد الشمسي وتخزين الطاقة وشحن المركبات والمراقبة الذكية في نظام طاقة منسق.',
                    light: true,
                    imageLayout: 'media-stack',
                    bullets: [
                        'Hybrid renewable energy access for wind and solar resources.',
                        'Energy storage support for peak shaving and renewable energy consumption.',
                        'EV charging station equipment with distribution and monitoring support.',
                        'Suitable for industrial parks, campuses, commercial complexes, and transport charging sites.'
                    ],
                    bulletsAr: [
                        'ربط هجين لموارد الرياح والطاقة الشمسية.',
                        'دعم تخزين الطاقة لخفض الذروة واستهلاك الطاقة المتجددة.',
                        'معدات محطات شحن مع دعم التوزيع والمراقبة.',
                        'مناسبة للمجمعات الصناعية والجامعات والمجمعات التجارية ومواقع شحن النقل.'
                    ],
                    button: { label: 'Send Project Requirements', labelAr: 'أرسل متطلبات المشروع', inquiry: true, productName: 'C&I Wind + PV + ESS + EV Charging Solution', productNameAr: 'حل الرياح والشمس والتخزين والشحن' },
                    images: [
                        image('assets/solutions/smart-energy/hybrid-energy-topology-b.png', 'Hybrid wind, photovoltaic, storage, grid, and EV charging system topology', 'طوبولوجيا نظام الرياح والشمس والتخزين والشبكة والشحن', 639, 455),
                        image('assets/solutions/smart-energy/containerized-energy-storage.png', 'Containerized energy storage equipment', 'معدات تخزين طاقة حاوية', 381, 335),
                        image('assets/solutions/smart-energy/dual-ev-charging-cabinet.png', 'Dual EV charging cabinet', 'خزانة شحن مزدوجة', 382, 292),
                        image('assets/solutions/smart-energy/mobile-monitoring-dashboard.png', 'Mobile monitoring dashboard for charging operations', 'لوحة مراقبة متنقلة لعمليات الشحن', 301, 390)
                    ]
                },
                {
                    type: 'card-grid',
                    className: 'solution-system-map',
                    title: 'Energy Flow and System Topology',
                    titleAr: 'تدفق الطاقة وطوبولوجيا النظام',
                    text: 'Connect renewable generation, energy storage, transformer and switchgear systems, EV charging terminals, and monitoring platforms in one controllable architecture.',
                    textAr: 'يربط التوليد المتجدد وتخزين الطاقة وأنظمة المحولات والمفاتيح ومحطات الشحن ومنصات المراقبة في بنية واحدة قابلة للتحكم.',
                    cards: [
                        { title: 'Hybrid Energy Dispatch', titleAr: 'جدولة الطاقة الهجينة', text: 'Coordinated power flow between grid supply, renewable generation, storage equipment, and charging terminals.', textAr: 'تدفق طاقة منسق بين إمداد الشبكة والتوليد المتجدد ومعدات التخزين ومحطات الشحن.', image: image('assets/solutions/smart-energy/hybrid-energy-topology-a.png', 'Hybrid wind, photovoltaic, storage, and charging topology diagram', 'رسم طوبولوجيا الرياح والشمس والتخزين والشحن', 639, 455) },
                        { title: 'Electrical Configuration', titleAr: 'التكوين الكهربائي', text: 'Project-level transformer, switchgear, metering, and grid connection layouts for engineering design.', textAr: 'تخطيطات محولات ومفاتيح وقياس وربط شبكة على مستوى المشروع للتصميم الهندسي.', image: image('assets/solutions/smart-energy/single-line-diagram-a.png', 'Single-line electrical diagram for a smart charging energy system', 'مخطط خط واحد لنظام طاقة شحن ذكي', 1339, 578) }
                    ]
                },
                {
                    id: 'smart-microgrid',
                    indexLabel: 'Solution 04',
                    indexLabelAr: 'الحل 04',
                    title: 'C&I Smart Microgrid Solution',
                    titleAr: 'حل الشبكة المصغرة الذكية التجاري والصناعي',
                    text: 'Build a controllable microgrid that coordinates distributed generation, storage, grid access, industrial loads, and EV charging demand.',
                    textAr: 'يبني شبكة مصغرة قابلة للتحكم تنسق التوليد الموزع والتخزين وربط الشبكة والأحمال الصناعية وطلب الشحن.',
                    reverse: true,
                    light: true,
                    imageLayout: 'technical-board',
                    bullets: [
                        'Source-grid-load-storage coordination for commercial and industrial sites.',
                        'Improved power reliability for critical buildings and park-level distribution networks.',
                        'Flexible integration with transformers, switchgear, grid cabinets, and monitoring platforms.',
                        'Scalable architecture for campuses, factories, and public infrastructure.'
                    ],
                    bulletsAr: [
                        'تنسيق المصدر والشبكة والحمل والتخزين للمواقع التجارية والصناعية.',
                        'تحسين اعتمادية الطاقة للمباني الحرجة وشبكات التوزيع على مستوى المجمعات.',
                        'تكامل مرن مع المحولات ومعدات المفاتيح وخزائن الشبكة ومنصات المراقبة.',
                        'بنية قابلة للتوسع للجامعات والمصانع والبنية التحتية العامة.'
                    ],
                    button: { label: 'Discuss Microgrid Project', labelAr: 'ناقش مشروع شبكة مصغرة', inquiry: true, productName: 'C&I Smart Microgrid Solution', productNameAr: 'حل الشبكة المصغرة الذكية' },
                    images: [
                        image('assets/solutions/smart-energy/microgrid-topology.png', 'Smart microgrid topology diagram', 'رسم طوبولوجيا الشبكة المصغرة الذكية', 639, 455),
                        image('assets/solutions/smart-energy/grid-connection-cabinet.png', 'Grid connection cabinet', 'خزانة ربط الشبكة', 349, 425),
                        image('assets/solutions/smart-energy/dry-type-transformer.png', 'Dry-type transformer used in energy systems', 'محول جاف مستخدم في أنظمة الطاقة', 636, 629)
                    ]
                },
                {
                    id: 'pv-solution',
                    indexLabel: 'Solution 05',
                    indexLabelAr: 'الحل 05',
                    title: 'C&I Photovoltaic Solution',
                    titleAr: 'حل الطاقة الشمسية التجاري والصناعي',
                    text: 'Provide transformer, switchgear, distribution, grid connection, and monitoring equipment support for commercial and industrial photovoltaic projects.',
                    textAr: 'يوفر دعم المحولات ومعدات المفاتيح والتوزيع وربط الشبكة والمراقبة لمشروعات الطاقة الشمسية التجارية والصناعية.',
                    imageLayout: 'pv-board',
                    bullets: [
                        'PV power access for factories, schools, hospitals, public buildings, and commercial rooftops.',
                        'Grid connection cabinets, transformer systems, and switchgear for stable operation.',
                        'Integrated monitoring and energy management for project operation teams.',
                        'Flexible equipment configuration for rooftop, park-level, and distributed PV scenarios.'
                    ],
                    bulletsAr: [
                        'ربط الطاقة الشمسية للمصانع والمدارس والمستشفيات والمباني العامة والأسطح التجارية.',
                        'خزائن ربط الشبكة وأنظمة المحولات ومعدات المفاتيح لتشغيل مستقر.',
                        'مراقبة وإدارة طاقة متكاملة لفرق تشغيل المشروع.',
                        'تكوين معدات مرن للأسطح والمجمعات وسيناريوهات الطاقة الشمسية الموزعة.'
                    ],
                    button: { label: 'Request PV Configuration', labelAr: 'طلب تكوين الطاقة الشمسية', inquiry: true, productName: 'C&I Photovoltaic Solution', productNameAr: 'حل الطاقة الشمسية التجاري والصناعي' },
                    images: [
                        image('assets/solutions/smart-energy/industrial-park-solar-scene.png', 'Industrial park photovoltaic application scene', 'مشهد تطبيق الطاقة الشمسية في مجمع صناعي', 548, 332),
                        image('assets/solutions/smart-energy/pv-grid-topology.png', 'Photovoltaic grid connection topology', 'طوبولوجيا ربط الطاقة الشمسية بالشبكة', 639, 455)
                    ],
                    flow: {
                        label: 'Photovoltaic grid connection capability',
                        labelAr: 'قدرة ربط الطاقة الشمسية بالشبكة',
                        items: [
                            { label: 'PV Array', labelAr: 'مصفوفة شمسية' },
                            { label: 'Inverter', labelAr: 'عاكس' },
                            { label: 'Transformer', labelAr: 'محول' },
                            { label: 'Grid Cabinet', labelAr: 'خزانة الشبكة' }
                        ],
                        strong: 'Grid-ready delivery',
                        strongAr: 'تسليم جاهز للشبكة'
                    }
                }
            ],
            scenarios: {
                className: 'bg-light solution-scenarios',
                gridClass: 'solution-scenario-grid',
                cardClass: 'solution-scenario-card',
                title: 'Application Scenarios',
                titleAr: 'سيناريوهات التطبيق',
                text: 'Smart energy and project service systems can be configured for multiple commercial, industrial, transportation, and public infrastructure environments.',
                textAr: 'يمكن تكوين أنظمة الطاقة الذكية وخدمات المشروعات لبيئات تجارية وصناعية ونقل وبنية تحتية عامة متعددة.',
                cards: [
                    { title: 'Campus', titleAr: 'الجامعة', image: image('assets/solutions/smart-energy/campus-solar-scene.png', 'Campus photovoltaic and smart energy application scene', 'مشهد تطبيق الطاقة الشمسية والطاقة الذكية في الجامعة', 738, 447) },
                    { title: 'Public Buildings', titleAr: 'المباني العامة', image: image('assets/solutions/smart-energy/public-building-solar-scene.png', 'Public building photovoltaic application scene', 'مشهد تطبيق الطاقة الشمسية في مبنى عام', 690, 419) },
                    { title: 'Commercial Complex', titleAr: 'مجمع تجاري', image: image('assets/solutions/smart-energy/commercial-complex-solar-scene.png', 'Commercial complex smart energy application scene', 'مشهد طاقة ذكية في مجمع تجاري', 963, 584) },
                    { title: 'Industrial Park', titleAr: 'مجمع صناعي', image: image('assets/solutions/smart-energy/industrial-park-solar-scene.png', 'Industrial park smart energy application scene', 'مشهد طاقة ذكية في مجمع صناعي', 548, 332) },
                    { title: 'Highway Facilities', titleAr: 'مرافق الطرق السريعة', image: image('assets/solutions/project-services/line-operation-maintenance.jpg', 'Highway power line operation and maintenance application scene', 'مشهد تشغيل وصيانة خطوط الطاقة للطرق السريعة', 1280, 1707) },
                    { title: 'Substation Projects', titleAr: 'مشروعات المحطات الفرعية', image: image('assets/solutions/project-services/substation-expansion.jpg', 'Substation project operation support scene', 'مشهد دعم تشغيل مشروع محطة فرعية', 1024, 576) }
                ]
            },
            credentials: {
                title: 'Engineering Capability Behind Every Solution',
                titleAr: 'قدرة هندسية خلف كل حل',
                text: "Longxiang's project delivery is supported by manufacturing qualifications, green factory recognition, and dedicated engineering research centers.",
                textAr: 'يدعم تسليم مشروعات Longxiang مؤهلات تصنيع واعتماد مصنع أخضر ومراكز بحث هندسية متخصصة.',
                items: [
                    { label: 'High-tech Enterprise', labelAr: 'مؤسسة عالية التقنية', image: image('assets/solutions/smart-energy/cert-high-tech-enterprise.png', 'High-tech enterprise certificate', 'شهادة مؤسسة عالية التقنية', 362, 236) },
                    { label: 'Green Factory', labelAr: 'مصنع أخضر', image: image('assets/solutions/smart-energy/cert-green-factory.png', 'Green factory certificate', 'شهادة مصنع أخضر', 362, 242) },
                    { label: 'Technology Center', labelAr: 'مركز تقنية', image: image('assets/solutions/smart-energy/cert-enterprise-technology-center.png', 'Enterprise technology center certificate', 'شهادة مركز تقنية المؤسسة', 362, 236) },
                    { label: 'Charging Research Center', labelAr: 'مركز بحث الشحن', image: image('assets/solutions/smart-energy/cert-charging-station-research-center.png', 'Charging station engineering technology research center certificate', 'شهادة مركز بحث تقنية هندسة محطات الشحن', 362, 238) },
                    { label: 'Transformer Research Center', labelAr: 'مركز بحث المحولات', image: image('assets/solutions/smart-energy/cert-transformer-research-center.png', 'Transformer engineering technology research center certificate', 'شهادة مركز بحث تقنية هندسة المحولات', 362, 241) }
                ]
            },
            cta: {
                title: 'Plan Your Energy Project with Longxiang',
                titleAr: 'خطط مشروع الطاقة مع Longxiang',
                text: 'Share your project type, load demand, grid access requirements, delivery scope, or operation and maintenance scenario. Our team will help match the right equipment and service configuration.',
                textAr: 'شارك نوع المشروع وطلب الحمل ومتطلبات ربط الشبكة ونطاق التسليم أو سيناريو التشغيل والصيانة. سيساعدك فريقنا في مطابقة المعدات وتكوين الخدمة المناسبين.',
                button: { label: 'Send Project Requirements', labelAr: 'أرسل متطلبات المشروع', inquiry: true, productName: 'Integrated Smart Energy Solutions', productNameAr: 'حلول الطاقة الذكية المتكاملة' }
            },
            seo: {
                title: 'Integrated Smart Energy Solutions | Henan Longxiang Electric Co., Ltd.',
                titleAr: 'حلول الطاقة الذكية المتكاملة | Henan Longxiang Electric Co., Ltd.',
                description: 'Integrated transformer, switchgear, EV charging, PV, energy storage, microgrid, EPC, and line O&M solutions from Longxiang.',
                descriptionAr: 'حلول متكاملة للمحولات والمفاتيح والشحن والطاقة الشمسية والتخزين والشبكات المصغرة وEPC وتشغيل وصيانة الخطوط من Longxiang.',
                image: 'assets/solutions/smart-energy/smart-ev-network-hero.png'
            }
        }
    },
    {
        slug: 'product-pages',
        title_en: 'Product Page Copy',
        body: {
            productsHero: {
                title: 'Products',
                titleAr: 'المنتجات',
                subtitle: 'Transformer, switchgear, and EV charging equipment for power distribution projects.',
                subtitleAr: 'محولات ومعدات مفاتيح ومعدات شحن للمركبات الكهربائية لمشروعات توزيع الطاقة.',
                backgroundImage: 'assets/hero/product.webp'
            },
            detailHero: {
                title: 'Product Details',
                titleAr: 'تفاصيل المنتج',
                subtitle: 'Detailed specifications and pricing information',
                subtitleAr: 'المواصفات التفصيلية ومعلومات التسعير',
                backgroundImage: 'assets/hero/product.webp'
            },
            seo: { image: 'assets/hero/product.webp' }
        }
    },
    {
        slug: 'global-shell',
        title_en: 'Global Shell',
        body: {
            seoDefaults: {
                image: '5、厂区厂貌/龙翔公司正门.jpg'
            },
            footer: {
                text: 'Providing intelligent, low-carbon power equipment and cultivating excellent professional electrical talent since 2003.',
                textAr: 'نوفر معدات طاقة ذكية منخفضة الكربون ونساهم في تنمية الكفاءات الكهربائية المهنية منذ عام 2003.'
            },
            inquiry: {
                title: 'Request Quote',
                titleAr: 'طلب عرض سعر',
                text: 'Share your project requirements and our team will respond quickly.',
                textAr: 'أرسل متطلبات مشروعك وسيتواصل فريقنا معك بسرعة.'
            }
        }
    }
];

const insert = db.prepare(`
    INSERT INTO content_blocks
        (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
    VALUES
        (@slug, @title_en, @title_ar, @body_json, 'published', @sort_order, 1, @created_at, @updated_at)
`);

const exists = db.prepare('SELECT id FROM content_blocks WHERE slug = ?').pluck();

const run = db.transaction(function () {
    blocks.forEach(function (block, index) {
        if (exists.get(block.slug)) {
            console.log('skip existing content block: ' + block.slug);
            return;
        }
        insert.run({
            slug: block.slug,
            title_en: block.title_en || block.slug,
            title_ar: block.title_ar || '',
            body_json: JSON.stringify(block.body || {}),
            sort_order: index,
            created_at: now,
            updated_at: now
        });
        console.log('inserted content block: ' + block.slug);
    });
});

run();
