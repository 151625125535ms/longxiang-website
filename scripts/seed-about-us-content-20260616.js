require('./lib/archived-legacy-writer-guard').assertArchivedLegacyWriterAllowed(__filename);

const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const db = new Database(path.join(ROOT, 'data', 'longxiang.db'));
const now = Date.now();

function image(src, alt, altAr, width, height) {
    return { src, alt, altAr, width, height };
}

const aboutBody = {
    hero: {
        kicker: 'Listed high-tech manufacturer',
        kickerAr: 'شركة تصنيع مدرجة عالية التقنية',
        title: 'About Longxiang',
        titleAr: 'عن Longxiang',
        subtitle: 'Power equipment built for reliable, low-carbon distribution. Henan Longxiang Electric integrates R&D, manufacturing, sales, project delivery, and technical education for modern power distribution systems.',
        subtitleAr: 'معدات طاقة مصممة لتوزيع موثوق ومنخفض الكربون. تجمع Henan Longxiang Electric بين البحث والتطوير والتصنيع والمبيعات وتسليم المشاريع والتعليم الفني لأنظمة توزيع الطاقة الحديثة.',
        backgroundImage: '5、厂区厂貌/龙翔公司正门.jpg',
        actions: [
            { label: 'Discuss a Project', labelAr: 'ناقش مشروعك', href: 'contact.html', className: 'btn btn-primary' },
            { label: 'View Products', labelAr: 'عرض المنتجات', href: 'products.html', className: 'btn btn-secondary' }
        ]
    },
    snapshot: {
        kicker: 'About Longxiang',
        kickerAr: 'عن Longxiang',
        title: 'Henan Longxiang Electric Co., Ltd.',
        titleAr: 'Henan Longxiang Electric Co., Ltd.',
        body: [
            {
                companyField: 'aboutIntro',
                text: 'Founded in 2003, Henan Longxiang Electric Co., Ltd. is a national high-tech enterprise focused on R&D, production, and sales of power transmission and distribution equipment.',
                textAr: 'تأسست شركة Henan Longxiang Electric Co., Ltd. عام 2003، وهي مؤسسة وطنية عالية التقنية تركز على البحث والتطوير والإنتاج وبيع معدات نقل وتوزيع الطاقة.'
            },
            {
                companyField: 'aboutDetail',
                text: 'The company is listed on the National Equities Exchange and Quotations with stock code 836070. Its portfolio covers amorphous alloy transformers, oil-immersed and dry-type transformers, photovoltaic and wind power transformer solutions, 40.5kV and below switchgear, box-type substations, reactive power compensation equipment, and related intelligent distribution systems.',
                textAr: 'الشركة مدرجة في National Equities Exchange and Quotations برمز السهم 836070. وتشمل منتجاتها محولات السبيكة غير المتبلورة، والمحولات المغمورة بالزيت والجافة، وحلول محولات الطاقة الشمسية والرياح، ومعدات المفاتيح حتى 40.5kV، ومحطات التحويل الصندوقية، ومعدات تعويض القدرة غير الفعالة، وأنظمة التوزيع الذكية ذات الصلة.'
            },
            {
                text: 'With a headquarters in Longhu, Xinzheng, a modern production base in Huaiyang, Zhoukou, and long-term partnerships with universities and research institutes, Longxiang serves utilities, industrial facilities, renewable energy projects, and overseas engineering partners.',
                textAr: 'من خلال مقرها في لونغهو، شينتشنغ، وقاعدة إنتاج حديثة في هوايانغ، تشوكو، وشراكات طويلة الأمد مع الجامعات ومعاهد البحث، تخدم Longxiang المرافق والمنشآت الصناعية ومشروعات الطاقة المتجددة وشركاء الهندسة في الخارج.'
            }
        ],
        video: {
            title: 'Longxiang company video',
            titleAr: 'فيديو شركة Longxiang',
            src: 'https://www.youtube.com/embed/BDmaZ_a1Fb0?rel=0&playsinline=1',
            caption: "Watch Longxiang's factory, production capability, and electrical equipment scenes.",
            captionAr: 'شاهد مشاهد مصنع Longxiang وقدرات الإنتاج ومعدات الطاقة.'
        },
        stats: [
            { value: '2003', label: 'Founded in Henan', labelAr: 'تأسست في خنان' },
            { value: '836070', label: 'NEEQ stock code', labelAr: 'رمز السهم في NEEQ' },
            { value: '10,000+', label: 'm2 modern workshop', labelAr: 'م2 ورشة حديثة' },
            { value: '5.67 ha', label: 'Huaiyang production base', labelAr: 'قاعدة إنتاج هوايانغ' },
            { value: '100+', label: 'patents and certifications', labelAr: 'براءات وشهادات' },
            { value: '20+', label: 'research partners', labelAr: 'شركاء بحث' }
        ]
    },
    values: [
        {
            label: 'Vision',
            labelAr: 'الرؤية',
            title: 'Intelligent low-carbon power equipment',
            titleAr: 'معدات طاقة ذكية منخفضة الكربون',
            text: 'Support safer, cleaner, and more efficient power distribution for industrial, utility, and renewable energy systems.',
            textAr: 'دعم توزيع طاقة أكثر أماناً ونظافة وكفاءة للأنظمة الصناعية والمرافق والطاقة المتجددة.',
            image: 'assets/solutions/smart-energy/wind-solar-field.png'
        },
        {
            label: 'Mission',
            labelAr: 'الرسالة',
            title: 'Quality in every system',
            titleAr: 'جودة في كل نظام',
            text: 'Deliver reliable equipment, practical engineering support, and responsive service through the full project lifecycle.',
            textAr: 'تقديم معدات موثوقة ودعم هندسي عملي وخدمة سريعة الاستجابة طوال دورة حياة المشروع.',
            image: 'assets/solutions/smart-energy/industrial-park-solar-scene.png'
        },
        {
            label: 'Culture',
            labelAr: 'الثقافة',
            title: 'Cooperation, win-win, innovation, development',
            titleAr: 'التعاون، الربح المشترك، الابتكار، التطوير',
            text: 'Combine manufacturing discipline with research collaboration and talent cultivation.',
            textAr: 'دمج انضباط التصنيع مع التعاون البحثي وتنمية المواهب.',
            image: 'assets/education/images/factory-visit-workshop.jpeg'
        }
    ],
    quality: {
        kicker: 'Quality & certification',
        kickerAr: 'الجودة والشهادات',
        title: 'Certified capability customers can verify.',
        titleAr: 'قدرات معتمدة يمكن للعملاء التحقق منها.',
        text: 'Longxiang has built a quality foundation around high-tech enterprise recognition, engineering research platforms, product innovation, and process-controlled manufacturing.',
        textAr: 'بنت Longxiang أساس الجودة على اعتماد المؤسسة عالية التقنية ومنصات البحث الهندسي وابتكار المنتجات والتصنيع المنضبط بالعمليات.',
        items: [
            'High-tech enterprise',
            'Enterprise technology center',
            'Transformer engineering research center',
            'Charging station research center',
            'Green factory recognition',
            '100+ patents and authorized achievements'
        ],
        itemsAr: [
            'مؤسسة عالية التقنية',
            'مركز تقني للمؤسسة',
            'مركز أبحاث هندسة المحولات',
            'مركز أبحاث محطات الشحن',
            'اعتماد المصنع الأخضر',
            'أكثر من 100 براءة وإنجاز معتمد'
        ],
        certs: [
            { label: 'High-tech Enterprise', labelAr: 'مؤسسة عالية التقنية', image: image('assets/solutions/smart-energy/cert-high-tech-enterprise.png', 'High-tech enterprise certificate', 'شهادة مؤسسة عالية التقنية', 362, 236) },
            { label: 'Transformer Research Center', labelAr: 'مركز أبحاث المحولات', image: image('assets/solutions/smart-energy/cert-transformer-research-center.png', 'Transformer research center certificate', 'شهادة مركز أبحاث المحولات', 362, 241) },
            { label: 'Technology Center', labelAr: 'مركز تقني', image: image('assets/solutions/smart-energy/cert-enterprise-technology-center.png', 'Enterprise technology center certificate', 'شهادة المركز التقني للمؤسسة', 362, 236) },
            { label: 'Green Factory', labelAr: 'مصنع أخضر', image: image('assets/solutions/smart-energy/cert-green-factory.png', 'Green factory certificate', 'شهادة المصنع الأخضر', 362, 242) }
        ]
    },
    history: {
        kicker: 'History',
        kickerAr: 'التاريخ',
        title: "Built through manufacturing, technology, and new energy expansion.",
        titleAr: 'تطور قائم على التصنيع والتقنية والتوسع في الطاقة الجديدة.',
        text: "A concise timeline of Longxiang's development from a local manufacturer into a listed power equipment enterprise.",
        textAr: 'خط زمني موجز لتطور Longxiang من مصنع محلي إلى مؤسسة مدرجة لمعدات الطاقة.'
    },
    milestones: [
        { date: '2003.09', title: 'Company founded', titleAr: 'تأسيس الشركة', text: 'Longxiang was established in Zhengzhou, Henan, entering the power distribution equipment industry.', textAr: 'تأسست Longxiang في تشنغتشو، خنان، ودخلت صناعة معدات توزيع الطاقة.' },
        { date: '2009.09', title: 'Manufacturing transformation', titleAr: 'تحول التصنيع', text: 'The company strengthened production-oriented operations and expanded its equipment manufacturing base.', textAr: 'عززت الشركة عملياتها القائمة على الإنتاج ووسعت قاعدة تصنيع المعدات.' },
        { date: '2013.10', title: 'High-tech recognition', titleAr: 'اعتماد عالي التقنية', text: 'Longxiang was recognized as a high-tech enterprise, reinforcing its R&D-led development path.', textAr: 'حصلت Longxiang على اعتماد مؤسسة عالية التقنية، مما عزز مسار التطوير القائم على البحث والتطوير.' },
        { date: '2016.03', title: 'Listed on NEEQ', titleAr: 'الإدراج في NEEQ', text: 'The company listed on the National Equities Exchange and Quotations under stock code 836070.', textAr: 'أدرجت الشركة في National Equities Exchange and Quotations برمز السهم 836070.' },
        { date: '2021.10', title: 'New energy company', titleAr: 'شركة الطاقة الجديدة', text: 'Longxiang New Energy was established to serve charging, distributed energy, and integrated power projects.', textAr: 'تأسست Longxiang New Energy لخدمة الشحن والطاقة الموزعة ومشروعات الطاقة المتكاملة.' },
        { date: '2022.07', title: 'Education company', titleAr: 'شركة التعليم', text: 'Longxiang expanded its school-enterprise cooperation platform for power industry training and talent development.', textAr: 'وسعت Longxiang منصة التعاون بين المدرسة والمؤسسة لتدريب صناعة الطاقة وتنمية المواهب.' }
    ],
    capability: {
        kicker: 'Technical advantages',
        kickerAr: 'المزايا الفنية',
        title: 'End-to-end capability for distribution projects.',
        titleAr: 'قدرات شاملة لمشروعات التوزيع.',
        text: 'From transformer design and manufacturing to integrated switchgear, new energy distribution, and service support.',
        textAr: 'من تصميم وتصنيع المحولات إلى معدات المفاتيح المتكاملة وتوزيع الطاقة الجديدة ودعم الخدمة.',
        cards: [
            { title: 'Transformer manufacturing', titleAr: 'تصنيع المحولات', text: 'Oil-immersed, dry-type, amorphous alloy, photovoltaic, wind power, and special transformer product lines.', textAr: 'خطوط منتجات محولات مغمورة بالزيت وجافة وسبائك غير متبلورة وطاقة شمسية ورياح ومحولات خاصة.', image: image('成品区/油式非晶S(B)H15.png', 'Amorphous alloy transformer', 'محول من سبيكة غير متبلورة', 520, 354) },
            { title: 'Switchgear & substations', titleAr: 'معدات المفاتيح والمحطات', text: '40.5kV and below switchgear, ring main units, box-type substations, and compensation equipment.', textAr: 'معدات مفاتيح حتى 40.5kV، ووحدات حلقية، ومحطات صندوقية، ومعدات تعويض.', image: image('assets/solutions/smart-energy/grid-connection-cabinet.png', 'Grid connection cabinet', 'خزانة ربط بالشبكة', 349, 425) },
            { title: 'New energy systems', titleAr: 'أنظمة الطاقة الجديدة', text: 'Charging, photovoltaic, energy storage, microgrid, and smart distribution integration for C&I scenarios.', textAr: 'تكامل الشحن والطاقة الشمسية وتخزين الطاقة والشبكات المصغرة والتوزيع الذكي للسيناريوهات التجارية والصناعية.', image: image('assets/solutions/smart-energy/smart-ev-network-hero.png', 'Smart energy solution', 'حل طاقة ذكية', 1009, 420) }
        ]
    },
    factory: {
        kicker: 'Factory',
        kickerAr: 'المصنع',
        title: 'Real production scenes, not stock imagery.',
        titleAr: 'مشاهد إنتاج حقيقية وليست صوراً جاهزة.',
        text: 'Manufacturing spaces across Longhu and Huaiyang support production, assembly, testing, and delivery.',
        textAr: 'تدعم مساحات التصنيع في لونغهو وهوايانغ الإنتاج والتجميع والاختبار والتسليم.',
        images: [
            { caption: 'Production campus', captionAr: 'مجمع الإنتاج', image: image('5、厂区厂貌/厂区.JPG', 'Longxiang production campus', 'مجمع إنتاج Longxiang', 1400, 1013) },
            { caption: 'Longhu workshop', captionAr: 'ورشة لونغهو', image: image('5、厂区厂貌/龙湖车间一角2.jpg', 'Longhu workshop', 'ورشة لونغهو', 1088, 795) },
            { caption: 'Huaiyang workshop', captionAr: 'ورشة هوايانغ', image: image('5、厂区厂貌/淮阳车间一角.jpg', 'Huaiyang workshop', 'ورشة هوايانغ', 1072, 797) },
            { caption: 'Factory equipment area', captionAr: 'منطقة معدات المصنع', image: image('厂区风采/IMG_7584.JPG', 'Factory equipment area', 'منطقة معدات المصنع', 1050, 1400) },
            { caption: 'Huaiyang base', captionAr: 'قاعدة هوايانغ', image: image('5、厂区厂貌/淮阳厂区正门.png', 'Huaiyang production base', 'قاعدة إنتاج هوايانغ', 520, 347) }
        ]
    },
    markets: {
        kicker: 'Markets & partners',
        kickerAr: 'الأسواق والشركاء',
        title: 'Serving utilities, industrial parks, renewable energy, and training ecosystems.',
        titleAr: 'خدمة المرافق والمجمعات الصناعية والطاقة المتجددة ومنظومات التدريب.',
        text: 'Longxiang combines equipment manufacturing with project support and school-enterprise cooperation, making it suitable for buyers who need both product supply and technical continuity.',
        textAr: 'تجمع Longxiang بين تصنيع المعدات ودعم المشروعات والتعاون بين المدرسة والمؤسسة، مما يجعلها مناسبة للمشترين الذين يحتاجون إلى توريد المنتجات واستمرارية الدعم الفني.',
        tags: ['Utilities', 'Industrial parks', 'PV power collection', 'EV charging stations', 'Smart microgrids', 'Vocational training'],
        tagsAr: ['المرافق', 'المجمعات الصناعية', 'تجميع الطاقة الشمسية', 'محطات شحن المركبات الكهربائية', 'الشبكات المصغرة الذكية', 'التدريب المهني']
    },
    cta: {
        title: 'Need a manufacturer for your next distribution project?',
        titleAr: 'هل تحتاج إلى مصنع لمشروع التوزيع القادم؟',
        text: 'Send your voltage level, application scenario, drawings, or tender requirements. Longxiang can respond with product matching and technical discussion.',
        textAr: 'أرسل مستوى الجهد وسيناريو التطبيق والرسومات أو متطلبات المناقصة، ويمكن لفريق Longxiang الرد بترشيح المنتج والنقاش الفني.',
        button: { label: 'Contact Longxiang', labelAr: 'تواصل مع Longxiang', href: 'contact.html', className: 'btn btn-primary' }
    },
    seo: {
        title: 'About Us | Henan Longxiang Electric Co., Ltd.',
        titleAr: 'من نحن | Henan Longxiang Electric Co., Ltd.',
        description: 'About Henan Longxiang Electric, a listed high-tech manufacturer of intelligent low-carbon power distribution equipment.',
        descriptionAr: 'تعرف على Henan Longxiang Electric، شركة مدرجة عالية التقنية لتصنيع معدات توزيع الطاقة الذكية منخفضة الكربون.',
        image: '5、厂区厂貌/龙翔公司正门.jpg'
    }
};

function parseBody(value) {
    try {
        return JSON.parse(value || '{}');
    } catch (err) {
        return {};
    }
}

function isEmptyAbout(body) {
    const hero = body.hero || {};
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const milestones = Array.isArray(body.milestones) ? body.milestones : [];
    return !hero.title && !hero.titleAr && sections.length <= 1 && milestones.length <= 1;
}

const row = db.prepare('SELECT id, body_json, version FROM content_blocks WHERE slug = ?').get('about-us');

if (!row) {
    db.prepare(`
        INSERT INTO content_blocks
            (slug, title_en, title_ar, body_json, status, sort_order, version, created_at, updated_at)
        VALUES
            ('about-us', 'About Us', 'من نحن', @body_json, 'published', 30, 1, @now, @now)
    `).run({ body_json: JSON.stringify(aboutBody), now });
    console.log('inserted content block: about-us');
} else if (isEmptyAbout(parseBody(row.body_json))) {
    db.prepare(`
        UPDATE content_blocks
        SET title_en = 'About Us',
            title_ar = 'من نحن',
            body_json = @body_json,
            status = 'published',
            version = @version,
            updated_at = @now
        WHERE id = @id
    `).run({
        id: row.id,
        body_json: JSON.stringify(aboutBody),
        version: (row.version || 1) + 1,
        now
    });
    console.log('updated empty content block: about-us');
} else {
    console.log('skip non-empty content block: about-us');
}
