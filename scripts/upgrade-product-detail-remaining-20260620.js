const { getDb } = require('../server/lib/db');

const dryRun = process.argv.indexOf('--dry-run') !== -1;
const db = getDb();
const now = Date.now();

const EXCLUDED_SAMPLE_SLUGS = new Set([
    'grid-connected-pv-box',
    'amorphous-sbh21-m',
    'kyn28-12'
]);

const profiles = {
    'oil-immersed': {
        enFit: 'industrial parks, utility substations, factories and distribution rooms',
        enAction: 'steps medium-voltage power down for stable distribution while using oil insulation and cooling for long operating cycles',
        enTerm: 'oil-immersed transformer',
        enQuote: 'capacity, primary and secondary voltage, frequency, vector group, impedance, loss requirement, cooling method, accessories, quantity and destination country',
        arFit: 'المناطق الصناعية والمحطات الفرعية والمصانع وغرف التوزيع',
        arAction: 'يخفض جهد الشبكة المتوسطة إلى جهد توزيع مستقر مع استخدام العزل والتبريد بالزيت للتشغيل الطويل',
        arTerm: 'محول مغمور بالزيت',
        arQuote: 'السعة، الجهد الابتدائي والثانوي، التردد، مجموعة التوصيل، الممانعة، متطلبات الفواقد، طريقة التبريد، الملحقات، الكمية وبلد الوجهة'
    },
    'dry-type': {
        enFit: 'indoor distribution rooms, public buildings, factories, commercial complexes and sites that prefer oil-free equipment',
        enAction: 'provides medium-voltage to low-voltage distribution with dry insulation, simplified indoor maintenance and reduced oil-handling risk',
        enTerm: 'dry-type transformer',
        enQuote: 'capacity, voltage class, insulation class, cooling method, enclosure requirement, noise requirement, installation altitude, quantity and project standard',
        arFit: 'غرف التوزيع الداخلية والمباني العامة والمصانع والمجمعات التجارية والمواقع التي تفضل المعدات الخالية من الزيت',
        arAction: 'يوفر تحويل الجهد المتوسط إلى الجهد المنخفض بعزل جاف وصيانة داخلية أبسط وتقليل مخاطر التعامل مع الزيت',
        arTerm: 'محول جاف',
        arQuote: 'السعة، فئة الجهد، فئة العزل، طريقة التبريد، متطلبات الغلاف، مستوى الضوضاء، ارتفاع موقع التركيب، الكمية ومعيار المشروع'
    },
    special: {
        enFit: 'special industrial loads, mining sites, furnace systems and projects with non-standard operating requirements',
        enAction: 'adapts transformer design to demanding load profiles, site constraints and safety requirements that standard distribution transformers do not fully cover',
        enTerm: 'special-purpose transformer',
        enQuote: 'application, capacity, voltage, load cycle, protection requirement, cooling method, installation environment, safety standard and required drawings',
        arFit: 'الأحمال الصناعية الخاصة ومواقع التعدين وأنظمة الأفران والمشروعات ذات متطلبات تشغيل غير قياسية',
        arAction: 'يوائم تصميم المحول مع منحنيات حمل صعبة وقيود موقع ومتطلبات سلامة لا تغطيها المحولات القياسية بالكامل',
        arTerm: 'محول خاص',
        arQuote: 'التطبيق، السعة، الجهد، دورة الحمل، متطلبات الحماية، طريقة التبريد، بيئة التركيب، معيار السلامة والرسومات المطلوبة'
    },
    combined: {
        enFit: 'renewable-energy projects, outdoor substations, industrial parks and compact distribution projects that need integrated delivery',
        enAction: 'combines transformer, high-voltage switching, low-voltage distribution and enclosure design into one project-ready substation package',
        enTerm: 'combined transformer substation',
        enQuote: 'capacity, high-voltage and low-voltage scheme, incoming and outgoing circuits, enclosure layout, protection rating, accessories, site environment and destination country',
        arFit: 'مشروعات الطاقة المتجددة والمحطات الخارجية والمناطق الصناعية ومشروعات التوزيع المدمجة التي تحتاج إلى تسليم متكامل',
        arAction: 'يجمع المحول ومعدات الجهد العالي وتوزيع الجهد المنخفض وتصميم الغلاف في حزمة محطة جاهزة للمشروع',
        arTerm: 'محطة تحويل مدمجة',
        arQuote: 'السعة، مخطط الجهد العالي والمنخفض، دوائر الدخول والخروج، تخطيط الغلاف، درجة الحماية، الملحقات، بيئة الموقع وبلد الوجهة'
    },
    ac: {
        enFit: 'residential parking areas, commercial car parks, hotels, campuses and fleet sites that need everyday AC charging',
        enAction: 'delivers controlled AC charging through the vehicle onboard charger with user start modes, protection functions and outdoor-ready enclosure options',
        enTerm: 'AC EV charging station',
        enQuote: 'power rating, input voltage, connector type, cable length, start mode, billing requirement, installation method, protection rating and network requirement',
        arFit: 'مواقف السكن والمواقف التجارية والفنادق والحرم الجامعي ومواقع الأساطيل التي تحتاج إلى شحن تيار متردد يومي',
        arAction: 'يوفر شحن تيار متردد مضبوطا عبر شاحن السيارة الداخلي مع طرق تشغيل للمستخدم ووظائف حماية وخيارات غلاف مناسبة للخارج',
        arTerm: 'محطة شحن تيار متردد',
        arQuote: 'القدرة، جهد الإدخال، نوع الموصل، طول الكابل، طريقة التشغيل، متطلبات الفوترة، طريقة التركيب، درجة الحماية ومتطلبات الاتصال الشبكي'
    },
    dc: {
        enFit: 'public charging stations, highway service areas, bus depots, logistics fleets and sites that need faster DC charging turnover',
        enAction: 'converts AC input into regulated DC output for direct battery charging, with charging control, protection and communication functions',
        enTerm: 'DC EV charging station',
        enQuote: 'power range, input voltage, output voltage and current range, connector quantity, cooling method, network mode, protection rating and payment or platform requirement',
        arFit: 'محطات الشحن العامة ومناطق خدمات الطرق ومستودعات الحافلات وأساطيل الخدمات اللوجستية والمواقع التي تحتاج إلى شحن تيار مستمر أسرع',
        arAction: 'يحول دخل التيار المتردد إلى خرج تيار مستمر منظم لشحن البطارية مباشرة مع وظائف التحكم والحماية والاتصال',
        arTerm: 'محطة شحن تيار مستمر',
        arQuote: 'مدى القدرة، جهد الإدخال، مدى جهد وتيار الخرج، عدد الموصلات، طريقة التبريد، وضع الاتصال، درجة الحماية ومتطلبات الدفع أو المنصة'
    },
    'energy-storage': {
        enFit: 'solar-storage projects, industrial backup power, peak shaving, microgrids and outdoor energy support scenarios',
        enAction: 'stores electrical energy in battery modules and releases it through power conversion and control systems for backup, load shifting or renewable-energy smoothing',
        enTerm: 'energy storage system',
        enQuote: 'rated power, rated energy, battery type, voltage range, cooling method, installation environment, communication interface, protection rating and application scenario',
        arFit: 'مشروعات الطاقة الشمسية مع التخزين والطاقة الاحتياطية الصناعية وخفض الذروة والشبكات المصغرة وسيناريوهات دعم الطاقة الخارجية',
        arAction: 'يخزن الطاقة الكهربائية في وحدات بطارية ويطلقها عبر أنظمة تحويل وتحكم للطاقة الاحتياطية أو نقل الحمل أو تسوية طاقة المصادر المتجددة',
        arTerm: 'نظام تخزين طاقة',
        arQuote: 'القدرة المقننة، الطاقة المقننة، نوع البطارية، مدى الجهد، طريقة التبريد، بيئة التركيب، واجهة الاتصال، درجة الحماية وسيناريو التطبيق'
    },
    'grid-connected-pv-equipment': {
        enFit: 'grid-connected photovoltaic projects that need AC distribution, metering, combiner or grid-connection protection between inverters and the grid side',
        enAction: 'collects, distributes or connects PV system output while integrating switching, surge protection, metering and enclosure options according to project scale',
        enTerm: 'grid-connected PV equipment',
        enQuote: 'PV capacity, AC voltage, inverter circuit quantity, input and output circuits, metering requirement, enclosure material, installation method and protection degree',
        arFit: 'مشروعات الطاقة الكهروضوئية المتصلة بالشبكة التي تحتاج إلى توزيع أو قياس أو تجميع أو حماية ربط بين العواكس وجانب الشبكة',
        arAction: 'يجمع أو يوزع أو يربط خرج النظام الكهروضوئي مع دمج المفاتيح وحماية الاندفاع والقياس وخيارات الغلاف حسب حجم المشروع',
        arTerm: 'معدات كهروضوئية مرتبطة بالشبكة',
        arQuote: 'قدرة النظام الكهروضوئي، جهد التيار المتردد، عدد دوائر العواكس، دوائر الدخول والخروج، متطلبات القياس، مادة الغلاف، طريقة التركيب ودرجة الحماية'
    },
    'medium-low-voltage': {
        enFit: 'power plants, substations, factories, petrochemical facilities and building distribution rooms that need low-voltage power distribution and control',
        enAction: 'distributes low-voltage power, protects outgoing circuits and supports control, measurement and maintenance through fixed or withdrawable cabinet arrangements',
        enTerm: 'low-voltage switchgear',
        enQuote: 'rated voltage, rated current, busbar scheme, short-circuit level, incoming and outgoing circuit quantity, cabinet type, protection class and project standard',
        arFit: 'محطات الطاقة والمحطات الفرعية والمصانع والمنشآت البتروكيميائية وغرف توزيع المباني التي تحتاج إلى توزيع وتحكم في الجهد المنخفض',
        arAction: 'يوزع طاقة الجهد المنخفض ويحمي دوائر الخروج ويدعم التحكم والقياس والصيانة من خلال ترتيبات خزائن ثابتة أو قابلة للسحب',
        arTerm: 'معدات مفاتيح جهد منخفض',
        arQuote: 'الجهد المقنن، التيار المقنن، مخطط قضبان التوصيل، مستوى القصر، عدد دوائر الدخول والخروج، نوع الخزانة، فئة الحماية ومعيار المشروع'
    },
    'high-voltage': {
        enFit: 'medium-voltage distribution rooms, substations, industrial facilities and power receiving systems that need circuit control and protection',
        enAction: 'receives, distributes and protects medium-voltage circuits with switching, measurement, interlocking and protection functions arranged for project operation',
        enTerm: 'medium-voltage switchgear',
        enQuote: 'system voltage, rated current, short-circuit breaking current, busbar scheme, breaker type, protection relay, incoming and outgoing circuits and installation environment',
        arFit: 'غرف توزيع الجهد المتوسط والمحطات الفرعية والمنشآت الصناعية وأنظمة استقبال الطاقة التي تحتاج إلى تحكم وحماية للدوائر',
        arAction: 'يستقبل ويوزع ويحمي دوائر الجهد المتوسط مع وظائف الفصل والقياس والتشابك والحماية بما يناسب تشغيل المشروع',
        arTerm: 'معدات مفاتيح جهد متوسط',
        arQuote: 'جهد النظام، التيار المقنن، تيار فصل القصر، مخطط قضبان التوصيل، نوع القاطع، مرحل الحماية، دوائر الدخول والخروج وبيئة التركيب'
    }
};

function profileFor(product) {
    return profiles[product.category_slug] || profiles[product.sub_category] || profiles[product.parent_category_slug] || profiles['oil-immersed'];
}

function compact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniq(values) {
    const seen = new Set();
    const out = [];
    values.forEach(function (value) {
        const text = compact(value);
        const key = text.toLowerCase();
        if (!text || seen.has(key)) return;
        seen.add(key);
        out.push(text);
    });
    return out;
}

function titleCaseValue(value) {
    return compact(value).replace(/\s+\/\s+/g, ' / ');
}

function joinList(values, max) {
    const list = uniq(values).slice(0, max || 3).map(titleCaseValue);
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function numericRange(values, unit) {
    const cleanValues = uniq(values);
    const nums = cleanValues.map(function (value) {
        return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : null;
    }).filter(function (value) { return value !== null; });
    if (nums.length >= 2 && nums.length === cleanValues.length) {
        nums.sort(function (a, b) { return a - b; });
        return nums[0] + '-' + nums[nums.length - 1] + unit;
    }
    if (nums.length === 1 && nums.length === cleanValues.length) return nums[0] + unit;
    return joinList(cleanValues, 3);
}

function specsBundle(specRows) {
    const byKey = new Map();
    specRows.forEach(function (spec) {
        const key = compact(spec.spec_key);
        if (!key) return;
        const lower = key.toLowerCase();
        if (!byKey.has(lower)) byKey.set(lower, []);
        byKey.get(lower).push(spec.spec_value);
    });
    return {
        values: function (keys) {
            const out = [];
            keys.forEach(function (key) {
                const values = byKey.get(key.toLowerCase());
                if (values) out.push.apply(out, values);
            });
            return uniq(out);
        },
        first: function (keys) {
            return this.values(keys)[0] || '';
        }
    };
}

function capacityUnit(product) {
    if (product.parent_category_slug === 'transformer' || ['oil-immersed', 'dry-type', 'special', 'combined'].indexOf(product.category_slug) !== -1) return ' kVA';
    if (product.category_slug === 'medium-low-voltage' || product.category_slug === 'high-voltage') return '';
    if (product.category_slug === 'grid-connected-pv-equipment') return ' kW';
    if (product.category_slug === 'ac' || product.category_slug === 'dc') return ' kW';
    return '';
}

function capacityPhrase(product, bundle) {
    const values = bundle.values(['Rated Capacity Range', 'Capacity Range', 'Transformer Capacity', 'Rated Capacity', 'Capacity', 'Rated Power', 'Power Rating', 'Power Range', 'Output Power', 'Rated Output Power', 'Rated Energy', 'Energy']);
    if (!values.length) return '';
    const range = numericRange(values, capacityUnit(product));
    if (!range) return '';
    if (product.category_slug === 'energy-storage') return 'rated power or energy configuration of ' + range;
    if (product.category_slug === 'medium-low-voltage' || product.category_slug === 'high-voltage') return 'rated current or cabinet rating of ' + range;
    if (product.category_slug === 'grid-connected-pv-equipment') return 'PV capacity configuration of ' + range;
    if (product.category_slug === 'ac' || product.category_slug === 'dc') return 'charging power configuration of ' + range;
    return 'capacity configuration of ' + range;
}

function capacityPhraseAr(product, bundle) {
    const values = bundle.values(['Rated Capacity Range', 'Capacity Range', 'Transformer Capacity', 'Rated Capacity', 'Capacity', 'Rated Power', 'Power Rating', 'Power Range', 'Output Power', 'Rated Output Power', 'Rated Energy', 'Energy']);
    if (!values.length) return '';
    const range = numericRange(values, capacityUnit(product));
    if (!range) return '';
    if (product.category_slug === 'energy-storage') return 'تكوين قدرة أو طاقة مقننة ' + range;
    if (product.category_slug === 'medium-low-voltage' || product.category_slug === 'high-voltage') return 'تكوين تيار مقنن أو تصنيف خزانة ' + range;
    if (product.category_slug === 'grid-connected-pv-equipment') return 'تكوين قدرة كهروضوئية ' + range;
    if (product.category_slug === 'ac' || product.category_slug === 'dc') return 'تكوين قدرة شحن ' + range;
    return 'تكوين سعة ' + range;
}

function voltagePhrase(bundle) {
    const values = bundle.values(['Voltage', 'Voltage Class', 'Rated Voltage', 'Rated Working Voltage', 'Primary Rated Voltage', 'Secondary Rated Voltage', 'Rated Input / Output Voltage', 'Input / Output Voltage', 'Input Voltage Range', 'Output Voltage Range', 'Rated Output Voltage', 'Rated Battery Voltage', 'Battery Voltage', 'Maximum input voltage', 'Rated AC voltage']);
    return values.length ? 'voltage options including ' + joinList(values, 3) : '';
}

function voltagePhraseAr(bundle) {
    const values = bundle.values(['Voltage', 'Voltage Class', 'Rated Voltage', 'Rated Working Voltage', 'Primary Rated Voltage', 'Secondary Rated Voltage', 'Rated Input / Output Voltage', 'Input / Output Voltage', 'Input Voltage Range', 'Output Voltage Range', 'Rated Output Voltage', 'Rated Battery Voltage', 'Battery Voltage', 'Maximum input voltage', 'Rated AC voltage']);
    return values.length ? 'خيارات جهد تشمل ' + joinList(values, 3) : '';
}

function keyFeaturePhrase(product, bundle) {
    const model = bundle.first(['Product Model', 'Specific Model', 'Specific Models', 'Model range']);
    const core = bundle.first(['Core Type', 'Core Structure', 'Transformer Type', 'Switchgear Type', 'Device Type', 'Battery Type']);
    const cooling = bundle.first(['Cooling Method']);
    const protection = bundle.first(['Protection Rating', 'Protection degree', 'Protection Class', 'Protection Features']);
    const standard = bundle.first(['Standard', 'Standards']);
    const values = [];
    if (model) values.push('model reference ' + model);
    if (core) values.push(core);
    if (cooling) values.push(cooling + ' cooling');
    if (protection) values.push(protection + ' protection');
    if (standard) values.push('standard ' + standard);
    if (values.length) return values.slice(0, 3).join(', ');
    return product.category_en || profileFor(product).enTerm;
}

function keyFeaturePhraseAr(product, bundle) {
    const model = bundle.first(['Product Model', 'Specific Model', 'Specific Models', 'Model range']);
    const core = bundle.first(['Core Type', 'Core Structure', 'Transformer Type', 'Switchgear Type', 'Device Type', 'Battery Type']);
    const cooling = bundle.first(['Cooling Method']);
    const protection = bundle.first(['Protection Rating', 'Protection degree', 'Protection Class', 'Protection Features']);
    const standard = bundle.first(['Standard', 'Standards']);
    const values = [];
    if (model) values.push('مرجع النموذج ' + model);
    if (core) values.push(core);
    if (cooling) values.push('تبريد ' + cooling);
    if (protection) values.push('حماية ' + protection);
    if (standard) values.push('معيار ' + standard);
    if (values.length) return values.slice(0, 3).join('، ');
    return product.category_ar || profileFor(product).arTerm;
}

function applicationPhrase(product, bundle) {
    const app = bundle.first(['Application', 'Installation Site']);
    if (app) return app;
    return profileFor(product).enFit;
}

function applicationPhraseAr(product, bundle) {
    const app = bundle.first(['Application', 'Installation Site']);
    if (app) return app;
    return profileFor(product).arFit;
}

function cleanSeoTitle(value) {
    const text = compact(value);
    const brand = ' | Longxiang';
    if (text.length <= 68) return text;
    if (text.endsWith(brand)) {
        const name = text.slice(0, -brand.length);
        return name.slice(0, 68 - brand.length).replace(/[\s,;:|/-]+[^\s,;:|/-]*$/, '').trim() + brand;
    }
    return text.slice(0, 68).replace(/[\s,;:|/-]+[^\s,;:|/-]*$/, '').trim();
}

function cleanSeoDescription(value) {
    const text = compact(value);
    if (text.length <= 160) return text;
    return text.slice(0, 157).replace(/[\s,;:.-]+[^\s,;:.-]*$/, '').trim() + '...';
}

function buildEnglish(product, bundle) {
    const profile = profileFor(product);
    const name = product.name_en;
    const cap = capacityPhrase(product, bundle);
    const voltage = voltagePhrase(bundle);
    const feature = keyFeaturePhrase(product, bundle);
    const application = applicationPhrase(product, bundle);
    const detailParts = [cap, voltage, feature].filter(Boolean);
    const summary = cleanSeoDescription(name + ' for ' + application + (detailParts.length ? ', with ' + detailParts.join(', ') : '') + '.');
    const description = [
        'Best fit:',
        'For ' + profile.enFit + ', when the project needs a project-ready ' + profile.enTerm + (cap ? ' with ' + cap : '') + '.',
        '',
        'What it does:',
        name + ' ' + profile.enAction + '. ' + (voltage ? 'It supports ' + voltage + '. ' : '') + 'The product is positioned for procurement teams that need clear model selection, technical confirmation and export project coordination.',
        '',
        'Why buyers choose it:',
        '- ' + (cap ? 'Available ' + cap + ' helps match common project loads without changing the product family.' : 'Project-oriented configuration helps match common engineering requirements.'),
        '- ' + (voltage ? 'Selectable ' + voltage + ' supports coordination with site distribution systems.' : 'Electrical configuration can be confirmed around the site distribution scheme.'),
        '- ' + feature + ' gives engineers a clear basis for technical comparison and specification review.',
        '- The product can be coordinated with Longxiang switchgear, transformer, new-energy equipment or project accessories for packaged delivery.',
        '- English and Arabic product data support clearer communication for overseas tendering, distributor quotation and technical review.',
        '',
        'Before quotation:',
        'Please confirm ' + profile.enQuote + '.'
    ].join('\n');
    return { short_desc_en: summary, description_en: description };
}

function buildArabic(product, bundle) {
    const profile = profileFor(product);
    const name = product.name_ar || product.name_en;
    const cap = capacityPhraseAr(product, bundle);
    const voltage = voltagePhraseAr(bundle);
    const feature = keyFeaturePhraseAr(product, bundle);
    const application = applicationPhraseAr(product, bundle);
    const detailParts = [cap, voltage, feature].filter(Boolean);
    const summary = compact(name + ' مناسب لـ ' + application + (detailParts.length ? '، مع ' + detailParts.join('، ') : '') + '.');
    const description = [
        'الملاءمة الأفضل:',
        'يناسب ' + profile.arFit + ' عندما يحتاج المشروع إلى ' + profile.arTerm + ' جاهز للمشروع' + (cap ? ' مع ' + cap : '') + '.',
        '',
        'وظيفته:',
        name + ' ' + profile.arAction + '. ' + (voltage ? 'ويدعم ' + voltage + '. ' : '') + 'تم تنظيم هذا المنتج ليساعد فرق الشراء والهندسة على تأكيد النموذج والمواصفات ومتطلبات التصدير بوضوح.',
        '',
        'لماذا يختاره العملاء:',
        '- ' + (cap ? 'توفر ' + cap + ' يساعد على مطابقة أحمال المشروعات الشائعة دون تغيير عائلة المنتج.' : 'التكوين الموجه للمشروعات يساعد على مطابقة المتطلبات الهندسية الشائعة.'),
        '- ' + (voltage ? voltage + ' يدعم التنسيق مع نظام التوزيع في الموقع.' : 'يمكن تأكيد التكوين الكهربائي حسب مخطط التوزيع في الموقع.'),
        '- ' + feature + ' يعطي المهندسين أساسا واضحا للمقارنة الفنية ومراجعة المواصفات.',
        '- يمكن تنسيقه مع محولات أو معدات مفاتيح أو معدات طاقة جديدة أو ملحقات مشروعات من لونغشيانغ للتسليم كحزمة واحدة.',
        '- توفر بيانات المنتج بالإنجليزية والعربية تواصلا أوضح للمناقصات الخارجية وعروض الموزعين والمراجعة الفنية.',
        '',
        'قبل عرض السعر:',
        'يرجى تأكيد ' + profile.arQuote + '.'
    ].join('\n');
    return { short_desc_ar: summary, description_ar: description };
}

function buildSeo(product, english) {
    const titleBase = product.name_en + ' | Longxiang';
    return {
        seo_title: cleanSeoTitle(titleBase),
        seo_description: cleanSeoDescription(english.short_desc_en)
    };
}

function changed(row, next) {
    return ['short_desc_en', 'short_desc_ar', 'description_en', 'description_ar', 'seo_title', 'seo_description']
        .some(function (key) { return String(row[key] || '') !== String(next[key] || ''); });
}

const products = db.prepare(
    "SELECT p.id, p.slug, p.name_en, p.name_ar, p.short_desc_en, p.short_desc_ar, p.description_en, p.description_ar, p.seo_title, p.seo_description, p.product_group, p.sub_category, " +
    "c.slug AS category_slug, c.name_en AS category_en, c.name_ar AS category_ar, pc.slug AS parent_category_slug, pc.name_en AS parent_category_en " +
    "FROM products p " +
    "LEFT JOIN categories c ON c.id = p.category_id " +
    "LEFT JOIN categories pc ON pc.id = c.parent_id " +
    "WHERE p.status != 'deleted' " +
    "ORDER BY p.id"
).all().filter(function (product) { return !EXCLUDED_SAMPLE_SLUGS.has(product.slug); });

const specRows = db.prepare(
    "SELECT product_id, spec_group, spec_key, spec_value, unit, sort_order FROM product_specs ORDER BY product_id, sort_order, id"
).all();

const specsByProduct = new Map();
specRows.forEach(function (spec) {
    if (!specsByProduct.has(spec.product_id)) specsByProduct.set(spec.product_id, []);
    specsByProduct.get(spec.product_id).push(spec);
});

const update = db.prepare(
    'UPDATE products SET short_desc_en = @short_desc_en, short_desc_ar = @short_desc_ar, description_en = @description_en, description_ar = @description_ar, seo_title = @seo_title, seo_description = @seo_description, version = version + 1, updated_at = @updated_at WHERE id = @id'
);

const changes = [];
const run = db.transaction(function () {
    products.forEach(function (product) {
        const bundle = specsBundle(specsByProduct.get(product.id) || []);
        const english = buildEnglish(product, bundle);
        const arabic = buildArabic(product, bundle);
        const seo = buildSeo(product, english);
        const next = Object.assign({}, english, arabic, seo);
        if (!changed(product, next)) return;
        changes.push({
            id: product.id,
            slug: product.slug,
            category: product.category_slug,
            title: product.name_en,
            enLength: next.description_en.length,
            arLength: next.description_ar.length
        });
        if (!dryRun) update.run(Object.assign({ id: product.id, updated_at: now }, next));
    });
});

run();
console.log(JSON.stringify({ dryRun, excludedSamples: Array.from(EXCLUDED_SAMPLE_SLUGS), changed: changes.length, changes }, null, 2));
