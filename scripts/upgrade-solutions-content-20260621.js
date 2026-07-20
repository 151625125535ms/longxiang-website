require('./lib/archived-legacy-writer-guard').assertArchivedLegacyWriterAllowed(__filename);

const { getDb } = require('../server/lib/db');

const DRY_RUN = process.argv.includes('--dry-run');
const now = Date.now();

function parseBody(value) {
    try {
        return JSON.parse(value || '{}') || {};
    } catch (err) {
        return {};
    }
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
    if (Array.isArray(value)) {
        return '[' + value.map(stableStringify).join(',') + ']';
    }
    if (value && typeof value === 'object') {
        return '{' + Object.keys(value).sort().map(function (key) {
            return JSON.stringify(key) + ':' + stableStringify(value[key]);
        }).join(',') + '}';
    }
    return JSON.stringify(value);
}

function image(src, alt, altAr, width, height) {
    return { src, alt, altAr, width, height };
}

function sectionKey(section) {
    if (!section) return '';
    if (section.id) return 'id:' + section.id;
    if (section.title) return 'title:' + section.title;
    return '';
}

function summarizeSolutions(body) {
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const overviewCards = body.overview && Array.isArray(body.overview.cards) ? body.overview.cards : [];
    return {
        anchors: (body.anchors || []).map(function (anchor) { return anchor.href; }),
        overviewCards: overviewCards.map(function (card) { return card.title; }),
        sections: sections.map(function (section) {
            return {
                id: section.id || '',
                type: section.type || 'feature',
                title: section.title || '',
                cardCount: Array.isArray(section.cards) ? section.cards.length : 0
            };
        }),
        seo: body.seo || {}
    };
}

function overviewCards() {
    return [
        {
            number: '01',
            title: 'Engineering EPC',
            titleAr: 'الهندسة والمقاولات EPC',
            text: 'Project delivery support from solution configuration to equipment supply, installation coordination, commissioning, and handover.',
            textAr: 'دعم تسليم المشروعات من تكوين الحل إلى توريد المعدات وتنسيق التركيب والتشغيل والتسليم.',
            items: ['Best fit: power distribution projects', 'Includes: transformer, switchgear, cabling and metering', 'Confirm: voltage, load, site scope and delivery boundary'],
            itemsAr: ['الأنسب: مشروعات توزيع الكهرباء', 'يشمل: المحولات والمفاتيح والكابلات والقياس', 'يلزم التأكيد: الجهد والحمل ونطاق الموقع وحدود التسليم']
        },
        {
            number: '02',
            title: 'Line O&M',
            titleAr: 'تشغيل وصيانة الخطوط',
            text: 'Long-term inspection, maintenance, defect handling, and emergency response for operating high-voltage line assets.',
            textAr: 'الفحص والصيانة ومعالجة العيوب والاستجابة الطارئة طويلة الأمد لأصول خطوط الجهد العالي العاملة.',
            items: ['Best fit: highways, tunnels, substations and park lines', 'Includes: inspection, maintenance and response', 'Confirm: line length, voltage level and service boundary'],
            itemsAr: ['الأنسب: الطرق السريعة والأنفاق والمحطات وخطوط المجمعات', 'يشمل: الفحص والصيانة والاستجابة', 'يلزم التأكيد: طول الخط ومستوى الجهد وحدود الخدمة']
        },
        {
            number: '03',
            title: 'Power Distribution Integration',
            titleAr: 'تكامل أنظمة توزيع الكهرباء',
            text: 'Transformer, box substation, high- and low-voltage switchgear, compensation, protection, and monitoring equipment for stable site power.',
            textAr: 'محولات ومحطات صندوقية ومعدات مفاتيح جهد عال ومنخفض وتعويض وحماية ومراقبة لتغذية مستقرة في الموقع.',
            items: ['Best fit: factories, parks, buildings and substations', 'Includes: dry-type, oil-immersed, amorphous or silicon-steel transformers', 'Confirm: capacity, voltage class, installation environment and load type'],
            itemsAr: ['الأنسب: المصانع والمجمعات والمباني والمحطات', 'يشمل: محولات جافة أو زيتية أو غير بلورية أو من الفولاذ السيليكوني', 'يلزم التأكيد: السعة ومستوى الجهد وبيئة التركيب ونوع الحمل']
        },
        {
            number: '04',
            title: 'C&I Photovoltaic',
            titleAr: 'حلول الطاقة الشمسية التجارية والصناعية',
            text: 'PV access, combiner, grid-connected cabinet, transformer, switchgear, metering, and monitoring support for distributed solar projects.',
            textAr: 'دعم دخول الطاقة الشمسية والتجميع وخزانة الربط بالشبكة والمحولات والمفاتيح والقياس والمراقبة للمشروعات الشمسية الموزعة.',
            items: ['Best fit: factory roofs, parks and public buildings', 'Includes: PV combiner, grid cabinet and distribution equipment', 'Confirm: PV capacity, grid access point and monitoring need'],
            itemsAr: ['الأنسب: أسطح المصانع والمجمعات والمباني العامة', 'يشمل: صندوق تجميع شمسي وخزانة ربط ومعدات توزيع', 'يلزم التأكيد: قدرة الطاقة الشمسية ونقطة الربط بالشبكة ومتطلبات المراقبة']
        },
        {
            number: '05',
            title: 'Storage & Charging',
            titleAr: 'التخزين والشحن',
            text: 'Solar, wind, energy storage, EV charging, transformer, switchgear, and EMS coordination for load shifting and renewable energy use.',
            textAr: 'تنسيق الطاقة الشمسية والرياح وتخزين الطاقة وشحن المركبات والمحولات والمفاتيح ونظام إدارة الطاقة لتخفيض الذروة واستخدام الطاقة المتجددة.',
            items: ['Best fit: charging stations and commercial energy sites', 'Includes: ESS, AC/DC charging, EMS and distribution', 'Confirm: charging power, storage capacity, grid limit and operation mode'],
            itemsAr: ['الأنسب: محطات الشحن ومواقع الطاقة التجارية', 'يشمل: التخزين وشحن AC/DC ونظام إدارة الطاقة والتوزيع', 'يلزم التأكيد: قدرة الشحن وسعة التخزين وحد الشبكة ونمط التشغيل']
        },
        {
            number: '06',
            title: 'Smart Microgrid',
            titleAr: 'الشبكة المصغرة الذكية',
            text: 'Source-grid-load-storage coordination for industrial parks, weak-grid areas, islands, mines, and backup power scenarios.',
            textAr: 'تنسيق المصدر والشبكة والحمل والتخزين للمجمعات الصناعية والمناطق ضعيفة الشبكة والجزر والمناجم وسيناريوهات الطاقة الاحتياطية.',
            items: ['Best fit: parks, mines, islands and critical loads', 'Includes: PV, ESS, distribution, EMS and grid/off-grid control', 'Confirm: grid mode, backup duration, load priority and expansion plan'],
            itemsAr: ['الأنسب: المجمعات والمناجم والجزر والأحمال الحرجة', 'يشمل: الطاقة الشمسية والتخزين والتوزيع وEMS والتحكم المتصل أو المنفصل عن الشبكة', 'يلزم التأكيد: نمط الشبكة ومدة الاحتياط وأولوية الأحمال وخطة التوسع']
        }
    ];
}

function powerDistributionSection() {
    return {
        id: 'power-distribution',
        indexLabel: 'Solution 03',
        indexLabelAr: 'الحل 03',
        title: 'Power Distribution System Integration',
        titleAr: 'تكامل أنظمة توزيع الكهرباء',
        text: 'Configure transformers, box-type substations, high- and low-voltage switchgear, compensation, protection, and monitoring equipment as one practical distribution package for factories, parks, commercial buildings, substations, and new-energy projects.',
        textAr: 'تكوين المحولات والمحطات الصندوقية ومعدات المفاتيح عالية ومنخفضة الجهد والتعويض والحماية والمراقبة كحزمة توزيع عملية واحدة للمصانع والمجمعات والمباني التجارية والمحطات ومشروعات الطاقة الجديدة.',
        light: true,
        imageLayout: 'technical-board',
        bullets: [
            'Dry-type, oil-immersed, amorphous alloy, and silicon-steel transformer options can be matched by loss target, capacity, and installation environment.',
            'High-voltage switchgear, low-voltage cabinets, ring main units, reactive power compensation, metering, and protection equipment support complete distribution rooms.',
            'Box-type substations and outdoor integrated equipment can support photovoltaic, wind, charging, and infrastructure projects.',
            'Before quotation, confirm capacity, voltage class, load type, installation environment, protection level, enclosure requirement, and destination standard.'
        ],
        bulletsAr: [
            'يمكن مطابقة المحولات الجافة والزيتية وغير البلورية والفولاذ السيليكوني حسب هدف الفقد والسعة وبيئة التركيب.',
            'تدعم معدات المفاتيح عالية الجهد والخزائن منخفضة الجهد والوحدات الحلقية وتعويض القدرة غير الفعالة والقياس والحماية غرف توزيع كاملة.',
            'يمكن أن تدعم المحطات الصندوقية والمعدات الخارجية المتكاملة مشروعات الطاقة الشمسية والرياح والشحن والبنية التحتية.',
            'قبل عرض السعر، يجب تأكيد السعة ومستوى الجهد ونوع الحمل وبيئة التركيب ومستوى الحماية ومتطلبات الغلاف ومعيار بلد الوجهة.'
        ],
        button: { label: 'Request Distribution Configuration', labelAr: 'طلب تكوين نظام التوزيع', inquiry: true, productName: 'Power Distribution System Integration', productNameAr: 'تكامل أنظمة توزيع الكهرباء' },
        images: [
            image('assets/solutions/smart-energy/single-line-diagram-b.png', 'Single-line diagram for power distribution system integration', 'مخطط خط واحد لتكامل نظام توزيع الكهرباء', 1339, 578),
            image('assets/solutions/smart-energy/dry-type-transformer.png', 'Dry-type transformer for distribution systems', 'محول جاف لأنظمة التوزيع', 636, 629),
            image('assets/solutions/smart-energy/grid-connection-cabinet.png', 'Grid connection and switchgear cabinet', 'خزانة ربط ومفاتيح كهربائية', 349, 425)
        ]
    };
}

function evChargingStationSection() {
    return {
        id: 'ev-charging-station',
        indexLabel: 'Solution 07',
        indexLabelAr: 'الحل 07',
        title: 'EV Charging Station Construction',
        titleAr: 'إنشاء محطات شحن المركبات الكهربائية',
        text: 'Combine AC chargers, DC fast chargers, high-power charging cabinets, energy storage, transformer and switchgear systems, and operation monitoring for public charging stations, industrial parks, logistics fleets, highway service areas, and commercial parking lots.',
        textAr: 'دمج شواحن AC وشواحن DC السريعة وخزائن الشحن عالية القدرة وتخزين الطاقة وأنظمة المحولات والمفاتيح ومراقبة التشغيل لمحطات الشحن العامة والمجمعات الصناعية وأساطيل الخدمات اللوجستية ومناطق خدمة الطرق السريعة ومواقف السيارات التجارية.',
        reverse: true,
        imageLayout: 'media-stack',
        bullets: [
            'AC and DC charging equipment can be configured by vehicle type, site turnover, power supply capacity, and operation model.',
            'Energy storage can reduce peak grid pressure and improve charging availability when transformer capacity is limited.',
            'PV canopy, storage, charging, transformer, switchgear, and EMS can be combined into one station-level package.',
            'Before design, confirm charger quantity, power rating, parking layout, grid capacity, billing/monitoring requirement, and future expansion plan.'
        ],
        bulletsAr: [
            'يمكن تكوين معدات شحن AC وDC حسب نوع المركبات ومعدل دوران الموقع وسعة التغذية ونموذج التشغيل.',
            'يمكن لتخزين الطاقة تقليل ضغط الذروة على الشبكة وتحسين توفر الشحن عندما تكون سعة المحول محدودة.',
            'يمكن دمج مظلة الطاقة الشمسية والتخزين والشحن والمحولات والمفاتيح ونظام EMS في حزمة واحدة على مستوى المحطة.',
            'قبل التصميم، يجب تأكيد عدد الشواحن وقدرتها وتخطيط المواقف وسعة الشبكة ومتطلبات الفوترة أو المراقبة وخطة التوسع.'
        ],
        button: { label: 'Plan Charging Station', labelAr: 'تخطيط محطة الشحن', inquiry: true, productName: 'EV Charging Station Construction', productNameAr: 'إنشاء محطة شحن المركبات الكهربائية' },
        images: [
            image('assets/solutions/smart-energy/wind-pv-storage-charging-system.png', 'Solar storage EV charging station system', 'نظام محطة شحن مع الطاقة الشمسية والتخزين', 640, 420),
            image('assets/solutions/smart-energy/dual-ev-charging-cabinet.png', 'Dual EV charging cabinet', 'خزانة شحن مزدوجة للمركبات الكهربائية', 382, 292),
            image('assets/solutions/smart-energy/containerized-energy-storage.png', 'Containerized energy storage equipment for charging stations', 'معدات تخزين طاقة حاوية لمحطات الشحن', 381, 335),
            image('assets/solutions/smart-energy/mobile-monitoring-dashboard.png', 'Mobile monitoring dashboard for charging operations', 'لوحة مراقبة متنقلة لعمليات الشحن', 301, 390)
        ]
    };
}

function normalizeFeatureIndex(section, indexLabel, indexLabelAr) {
    if (!section || section.type === 'card-grid') return section;
    const next = clone(section);
    next.indexLabel = indexLabel;
    next.indexLabelAr = indexLabelAr;
    return next;
}

function reorderSections(existingSections) {
    const byId = new Map();
    const byTitle = new Map();
    existingSections.forEach(function (section) {
        if (section.id) byId.set(section.id, section);
        if (section.title) byTitle.set(section.title, section);
    });

    const ordered = [
        normalizeFeatureIndex(byId.get('engineering-epc'), 'Solution 01', 'الحل 01'),
        byTitle.get('Representative General Contracting References'),
        normalizeFeatureIndex(byId.get('line-om'), 'Solution 02', 'الحل 02'),
        byTitle.get('Operation Coverage and Service Records'),
        powerDistributionSection(),
        normalizeFeatureIndex(byId.get('pv-solution'), 'Solution 04', 'الحل 04'),
        normalizeFeatureIndex(byId.get('wind-pv-ess-ev'), 'Solution 05', 'الحل 05'),
        byTitle.get('Energy Flow and System Topology'),
        normalizeFeatureIndex(byId.get('smart-microgrid'), 'Solution 06', 'الحل 06'),
        evChargingStationSection()
    ].filter(Boolean);

    const used = new Set(ordered.map(sectionKey));
    existingSections.forEach(function (section) {
        const key = sectionKey(section);
        if (key && !used.has(key) && key !== 'id:power-distribution' && key !== 'id:ev-charging-station') {
            ordered.push(section);
        }
    });

    return ordered;
}

function updateSolutionsBody(body) {
    if (!body || !Array.isArray(body.sections) || body.sections.length < 5) {
        throw new Error('The local solutions content is not aligned with the current online baseline. Sync the production database copy before running this migration.');
    }

    body.hero = Object.assign({}, body.hero || {}, {
        title: 'Integrated Smart Energy & Power Distribution Solutions',
        titleAr: 'حلول الطاقة الذكية وتوزيع الكهرباء المتكاملة',
        subtitle: 'Transformer, switchgear, solar PV, energy storage, EV charging, smart microgrid, EPC, and line O&M support for industrial and commercial power projects.',
        subtitleAr: 'دعم المحولات ومعدات المفاتيح والطاقة الشمسية وتخزين الطاقة وشحن المركبات الكهربائية والشبكات المصغرة وEPC وتشغيل وصيانة الخطوط لمشروعات الطاقة الصناعية والتجارية.',
        backgroundImage: 'assets/solutions/smart-energy/smart-ev-network-hero.png',
        actions: [
            { label: 'Explore Solutions', labelAr: 'استكشف الحلول', href: '#power-distribution', className: 'btn btn-primary' },
            { label: 'Send Project Requirements', labelAr: 'أرسل متطلبات المشروع', inquiry: true, productName: 'Integrated Smart Energy & Power Distribution Solutions', productNameAr: 'حلول الطاقة الذكية وتوزيع الكهرباء المتكاملة', className: 'btn btn-secondary' }
        ]
    });

    body.anchors = [
        { href: '#engineering-epc', label: 'EPC', labelAr: 'EPC' },
        { href: '#line-om', label: 'O&M', labelAr: 'التشغيل والصيانة' },
        { href: '#power-distribution', label: 'Power Distribution', labelAr: 'توزيع الكهرباء' },
        { href: '#pv-solution', label: 'Solar PV', labelAr: 'الطاقة الشمسية' },
        { href: '#wind-pv-ess-ev', label: 'Storage & Charging', labelAr: 'التخزين والشحن' },
        { href: '#smart-microgrid', label: 'Microgrid', labelAr: 'الشبكة المصغرة' },
        { href: '#ev-charging-station', label: 'Charging Station', labelAr: 'محطة الشحن' }
    ];

    body.overview = {
        title: 'Solutions by Project Scenario',
        titleAr: 'حلول حسب سيناريو المشروع',
        text: 'Longxiang organizes equipment and service capability around real project needs, so overseas buyers can confirm the application, included equipment, and quotation parameters before model selection.',
        textAr: 'تنظم Longxiang قدرات المعدات والخدمات حول احتياجات المشروع الفعلية، حتى يتمكن المشترون الخارجيون من تأكيد التطبيق والمعدات المشمولة ومعايير عرض السعر قبل اختيار الطراز.',
        cards: overviewCards()
    };

    body.sections = reorderSections(body.sections);

    body.cta = {
        title: 'Send Project Parameters for Configuration Review',
        titleAr: 'أرسل معايير المشروع لمراجعة التكوين',
        text: 'For a faster quotation, share the project type, voltage level, load or capacity, grid-connected or off-grid mode, required solar/storage/charging scope, delivery boundary, and destination country.',
        textAr: 'للحصول على عرض أسرع، أرسل نوع المشروع ومستوى الجهد والحمل أو السعة ونمط الاتصال بالشبكة أو التشغيل المنفصل ونطاق الطاقة الشمسية أو التخزين أو الشحن المطلوب وحدود التسليم وبلد الوجهة.',
        parameters: [
            'Project type and application site',
            'Voltage level, load demand, and capacity',
            'Grid-connected or off-grid operation mode',
            'Solar, storage, EV charging, transformer, and switchgear scope',
            'Delivery boundary, installation environment, and destination country'
        ],
        parametersAr: [
            'نوع المشروع وموقع التطبيق',
            'مستوى الجهد وطلب الحمل والسعة',
            'نمط التشغيل المتصل بالشبكة أو المنفصل عنها',
            'نطاق الطاقة الشمسية والتخزين وشحن المركبات والمحولات والمفاتيح',
            'حدود التسليم وبيئة التركيب وبلد الوجهة'
        ],
        button: { label: 'Submit Project Requirements', labelAr: 'إرسال متطلبات المشروع', href: 'contact.html', inquiry: true, productName: 'Integrated Smart Energy & Power Distribution Solutions', productNameAr: 'حلول الطاقة الذكية وتوزيع الكهرباء المتكاملة' }
    };

    body.seo = {
        title: 'Integrated Smart Energy & Power Distribution Solutions | Longxiang',
        titleAr: 'حلول الطاقة الذكية وتوزيع الكهرباء المتكاملة | Longxiang',
        description: 'Longxiang provides transformer, switchgear, solar PV, energy storage, EV charging, smart microgrid, EPC, and line O&M solutions for industrial and commercial power projects.',
        descriptionAr: 'توفر Longxiang حلول المحولات ومعدات المفاتيح والطاقة الشمسية والتخزين وشحن المركبات الكهربائية والشبكات المصغرة ومشروعات EPC والتشغيل والصيانة.',
        image: 'assets/solutions/smart-energy/smart-ev-network-hero.png',
        canonicalPath: '/solutions.html'
    };

    return body;
}

function updateGlobalShellBody(body) {
    body.navigation = body.navigation || {};
    const children = [
        { href: 'solutions.html', hash: '#engineering-epc', label: 'Engineering EPC', labelAr: 'الهندسة والمقاولات EPC' },
        { href: 'solutions.html', hash: '#line-om', label: 'Line O&M', labelAr: 'تشغيل وصيانة الخطوط' },
        { href: 'solutions.html', hash: '#power-distribution', label: 'Power Distribution', labelAr: 'توزيع الكهرباء' },
        { href: 'solutions.html', hash: '#pv-solution', label: 'Solar PV', labelAr: 'الطاقة الشمسية' },
        { href: 'solutions.html', hash: '#wind-pv-ess-ev', label: 'Storage & Charging', labelAr: 'التخزين والشحن' },
        { href: 'solutions.html', hash: '#smart-microgrid', label: 'Smart Microgrid', labelAr: 'الشبكة المصغرة الذكية' },
        { href: 'solutions.html', hash: '#ev-charging-station', label: 'Charging Station', labelAr: 'محطة الشحن' }
    ];

    if (Array.isArray(body.navigation.mainLinks)) {
        body.navigation.mainLinks = body.navigation.mainLinks.map(function (item) {
            if (item && item.href === 'solutions.html') {
                return Object.assign({}, item, { children });
            }
            return item;
        });
    }
    return body;
}

function upsertBlock(db, slug, defaults, updater) {
    const row = db.prepare('SELECT id, title_en, title_ar, body_json, version FROM content_blocks WHERE slug = ?').get(slug);
    if (!row) {
        throw new Error('Missing content block: ' + slug);
    }

    const body = parseBody(row.body_json);
    const beforeBody = clone(body);
    const before = stableStringify(beforeBody);
    const nextBody = updater(clone(body));
    const afterCompare = stableStringify(nextBody);
    const after = JSON.stringify(nextBody);
    const summary = {
        slug,
        changed: before !== afterCompare,
        before: slug === 'solutions' ? summarizeSolutions(beforeBody) : undefined,
        after: slug === 'solutions' ? summarizeSolutions(nextBody) : undefined
    };

    if (!DRY_RUN && before !== afterCompare) {
        db.prepare(`
            UPDATE content_blocks
            SET title_en = @title_en,
                title_ar = @title_ar,
                body_json = @body_json,
                version = @version,
                updated_at = @updated_at
            WHERE id = @id
        `).run({
            id: row.id,
            title_en: defaults.title_en || row.title_en,
            title_ar: defaults.title_ar || row.title_ar || '',
            body_json: after,
            version: (row.version || 1) + 1,
            updated_at: now
        });
    }

    return summary;
}

function main() {
    const db = getDb();
    const result = [];
    result.push(upsertBlock(db, 'solutions', {
        title_en: 'Solutions',
        title_ar: 'الحلول'
    }, updateSolutionsBody));
    result.push(upsertBlock(db, 'global-shell', {
        title_en: 'Global Shell',
        title_ar: 'الإطار العام'
    }, updateGlobalShellBody));

    console.log(JSON.stringify({
        dryRun: DRY_RUN,
        changedBlocks: result.filter(function (item) { return item.changed; }).map(function (item) { return item.slug; }),
        result
    }, null, 2));
}

if (require.main === module) {
    main();
}

module.exports = {
    updateSolutionsBody,
    updateGlobalShellBody
};
