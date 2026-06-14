#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const removeIds = new Set([
  'scb14',
  'SCB13',
  's13',
  'wound-core-oil',
  'anti-short-3d',
  's20',
  'high-overload',
  'SCBH15',
  'sbh15',
  'SBH21-M-RL',
  'dgh'
]);

function specs(rows) {
  return rows.map(row => [row[0], row[1]]);
}

function transformerProduct(product) {
  return Object.assign({
    group: 'transformer',
    featured: false,
    seoKeywords: 'transformer, distribution transformer, Longxiang'
  }, product);
}

const newProducts = [
  transformerProduct({
    id: 'silicon-scb-dry',
    name: 'SC(B)13 / SC(B)14 / SC(B)18 Silicon Steel Laminated Dry-Type Transformer',
    nameAr: 'محول جاف من صفائح الفولاذ السيليكوني SC(B)13 / SC(B)14 / SC(B)18',
    image: 'uploads/product-scb13-silicon-dry.png',
    category: 'dry-type',
    subCategory: 'dry-type',
    categoryLabel: 'Dry Type Transformer',
    categoryLabelAr: 'محول جاف',
    shortDesc: 'Consolidated SC(B) silicon steel dry-type transformer family covering SC(B)13, SC(B)14 and SC(B)18 efficiency variants.',
    shortDescAr: 'عائلة محولات جافة من الفولاذ السيليكوني تشمل مستويات الكفاءة SC(B)13 وSC(B)14 وSC(B)18.',
    description: 'This product module combines the SC(B)13, SC(B)14 and SC(B)18 laminated silicon steel dry-type power transformers from the silicon steel product manual. The variants share a cast-resin dry-type platform and differ mainly by efficiency and loss-performance level.',
    descriptionAr: 'يجمع هذا المنتج محولات القدرة الجافة من الفولاذ السيليكوني SC(B)13 وSC(B)14 وSC(B)18 الواردة في كتالوج الفولاذ السيليكوني. تعتمد النماذج على منصة عزل جافة مصبوبة، مع اختلافات رئيسية في مستوى الكفاءة والفواقد.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class', '6kV class'],
    aliases: ['scb14', 'SCB13', 'SCB14', 'SCB18'],
    specs: specs([
      ['Product Model', 'SC(B)13 / SC(B)14 / SC(B)18 Series'],
      ['Transformer Type', 'Dry-type cast-resin power transformer'],
      ['Core Type', 'Silicon steel laminated core'],
      ['Cooling Method', 'AN / AF optional'],
      ['Capacity Range', '30-2500 kVA'],
      ['Voltage Class', '6-10kV distribution class'],
      ['Series / Variants', 'SC(B)13, SC(B)14, SC(B)18']
    ])
  }),
  transformerProduct({
    id: 'silicon-smrl-wound-core',
    name: 'S13 / S20 / S22-M.RL Oil-Immersed 3D Wound Core Distribution Transformer',
    nameAr: 'محول توزيع مغمور بالزيت بقلب ملفوف ثلاثي الأبعاد S13 / S20 / S22-M.RL',
    image: '成品区/硅钢立体卷S13图片.png',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'S-M.RL silicon steel 3D wound core distribution transformer family covering S13, S20 and S22 efficiency variants.',
    shortDescAr: 'عائلة محولات توزيع مغمورة بالزيت بقلب ملفوف ثلاثي الأبعاد من الفولاذ السيليكوني، تشمل S13 وS20 وS22.',
    description: 'This module consolidates the first S-M.RL group in the silicon steel manual: S13, S20 and S22 oil-immersed 3D wound core distribution transformers. The triangular wound core structure is intended for compact magnetic circuits, lower no-load loss and reliable distribution-network operation.',
    descriptionAr: 'يجمع هذا المنتج المجموعة الأولى من سلسلة S-M.RL في كتالوج الفولاذ السيليكوني: محولات S13 وS20 وS22 المغمورة بالزيت ذات القلب الملفوف ثلاثي الأبعاد. يساعد القلب المثلث الملفوف على تقليل فواقد اللاحمل وتحسين الاعتمادية في شبكات التوزيع.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class', '6kV class'],
    aliases: ['s13', 'wound-core-oil', 'S13-M-RL', 'S20-M-RL', 'S22-M-RL'],
    specs: specs([
      ['Product Model', 'S13 / S20 / S22-M.RL Series'],
      ['Transformer Type', 'Oil-immersed distribution transformer'],
      ['Core Type', 'Silicon steel 3D wound core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Voltage Class', '6-10kV distribution class'],
      ['Series / Variants', 'S13-M.RL, S20-M.RL, S22-M.RL']
    ])
  }),
  transformerProduct({
    id: 'silicon-smrl-anti-short',
    name: 'S13 / S20 / S22-M.RL Anti-Short-Circuit 3D Wound Core Transformer',
    nameAr: 'محول S13 / S20 / S22-M.RL بقلب ملفوف ثلاثي الأبعاد مقاوم لقصر الدائرة',
    image: '产品图片(1)/抗短路油浸式立体卷铁芯配电变压器.jpg',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'Anti-short-circuit S-M.RL silicon steel 3D wound core transformer family covering S13, S20 and S22 variants.',
    shortDescAr: 'عائلة محولات S-M.RL من الفولاذ السيليكوني بقلب ملفوف ثلاثي الأبعاد ومقاومة محسنة لقصر الدائرة.',
    description: 'This module corresponds to the anti-short-circuit S-M.RL group in the silicon steel manual. It keeps the 3D wound core platform while emphasizing improved short-circuit withstand capability for demanding distribution applications.',
    descriptionAr: 'يمثل هذا المنتج مجموعة S-M.RL المقاومة لقصر الدائرة في كتالوج الفولاذ السيليكوني، مع الحفاظ على منصة القلب الملفوف ثلاثي الأبعاد وتعزيز تحمل القصر في تطبيقات التوزيع الأكثر تطلبا.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class', '6kV class'],
    aliases: ['anti-short-3d', 'S13-M-RL-anti-short', 'S20-M-RL-anti-short', 'S22-M-RL-anti-short'],
    specs: specs([
      ['Product Model', 'S13 / S20 / S22-M.RL Anti-Short-Circuit Series'],
      ['Transformer Type', 'Oil-immersed distribution transformer'],
      ['Core Type', 'Silicon steel 3D wound core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Key Feature', 'Enhanced short-circuit withstand design'],
      ['Series / Variants', 'S13-M.RL, S20-M.RL, S22-M.RL anti-short-circuit variants']
    ])
  }),
  transformerProduct({
    id: 'silicon-sm-oil-power',
    name: 'S13 / S20 / S22-M Oil-Immersed Power Transformer',
    nameAr: 'محول قدرة مغمور بالزيت S13 / S20 / S22-M',
    image: '产品图片(1)/S20-M.RL-30～160010油浸式电力变压器.jpg',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'Conventional S-M oil-immersed silicon steel power transformer family covering S13, S20 and S22 variants.',
    shortDescAr: 'عائلة محولات قدرة مغمورة بالزيت من سلسلة S-M تشمل S13 وS20 وS22.',
    description: 'This product module consolidates the S13, S20 and S22 oil-immersed power transformer group from the silicon steel manual. The models share the same oil-immersed transformer platform and differ by efficiency and loss class.',
    descriptionAr: 'يجمع هذا المنتج مجموعة محولات القدرة المغمورة بالزيت S13 وS20 وS22 من كتالوج الفولاذ السيليكوني. تشترك النماذج في منصة محول مغمور بالزيت وتختلف حسب مستوى الكفاءة والفواقد.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class', '35kV class optional'],
    aliases: ['s20', 'S13-M', 'S20-M', 'S22-M'],
    specs: specs([
      ['Product Model', 'S13 / S20 / S22-M Series'],
      ['Transformer Type', 'Oil-immersed power transformer'],
      ['Core Type', 'Silicon steel laminated core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Voltage Class', '10kV distribution class, 35kV optional'],
      ['Series / Variants', 'S13-M, S20-M, S22-M']
    ])
  }),
  transformerProduct({
    id: 'silicon-s13-vegetable-oil-high-overload',
    name: 'S13-M Vegetable Oil High-Overload Distribution Transformer',
    nameAr: 'محول توزيع S13-M بزيت نباتي وقدرة تحمل حمل زائد عالية',
    image: '产品图片(1)/油浸式（植物油）高过载配电变压器.jpg',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'S13-M vegetable-oil high-overload distribution transformer from the silicon steel manual.',
    shortDescAr: 'محول توزيع S13-M بزيت نباتي مع قدرة تحمل عالية للأحمال الزائدة.',
    description: 'This module corresponds to the S13-M vegetable-oil high-overload distribution transformer in the silicon steel catalog. It is intended for distribution scenarios requiring higher overload capability and environmentally oriented insulating oil selection.',
    descriptionAr: 'يمثل هذا المنتج محول التوزيع S13-M بزيت نباتي وقدرة تحمل عالية للحمل الزائد في كتالوج الفولاذ السيليكوني، وهو مناسب لتطبيقات التوزيع التي تتطلب قدرة أعلى على تحمل الأحمال واختيار زيت عزل أكثر ملاءمة بيئيا.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class'],
    aliases: ['high-overload', 'S13-M-vegetable-oil'],
    specs: specs([
      ['Product Model', 'S13-M Vegetable Oil High-Overload Series'],
      ['Transformer Type', 'Oil-immersed distribution transformer'],
      ['Insulating Oil', 'Vegetable oil'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Key Feature', 'High-overload distribution application']
    ])
  }),
  transformerProduct({
    id: 'amorphous-scbh-dry',
    name: 'SC(B)H15 / SC(B)H17 / SC(B)H19 Dry-Type Amorphous Alloy Core Transformer',
    nameAr: 'محول جاف بقلب من سبيكة غير متبلورة SC(B)H15 / SC(B)H17 / SC(B)H19',
    image: 'uploads/product-scbh15-dry-amorphous.png',
    category: 'dry-type',
    subCategory: 'dry-type',
    categoryLabel: 'Dry Type Transformer',
    categoryLabelAr: 'محول جاف',
    shortDesc: 'Dry-type amorphous alloy core transformer family covering SC(B)H15, SC(B)H17 and SC(B)H19 variants.',
    shortDescAr: 'عائلة محولات جافة بقلب من سبيكة غير متبلورة تشمل SC(B)H15 وSC(B)H17 وSC(B)H19.',
    description: 'This product module consolidates the SC(B)H15, SC(B)H17 and SC(B)H19 dry-type amorphous alloy core transformers from the amorphous alloy catalog. The models focus on reduced no-load loss and dry-type safety for indoor distribution environments.',
    descriptionAr: 'يجمع هذا المنتج محولات SC(B)H15 وSC(B)H17 وSC(B)H19 الجافة ذات القلب من السبيكة غير المتبلورة من كتالوج المحولات غير المتبلورة، مع التركيز على تقليل فواقد اللاحمل وتحسين الأمان في بيئات التوزيع الداخلية.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class', '6kV class'],
    aliases: ['SCBH15', 'SCBH17', 'SCBH19', 'single-phase-dry', '3phase-3limb', '3phase-5limb'],
    specs: specs([
      ['Product Model', 'SC(B)H15 / SC(B)H17 / SC(B)H19 Series'],
      ['Transformer Type', 'Dry-type amorphous alloy transformer'],
      ['Core Type', 'Amorphous alloy core'],
      ['Cooling Method', 'AN / AF optional'],
      ['Capacity Range', '30-2500 kVA'],
      ['Voltage Class', '6-10kV distribution class'],
      ['Series / Variants', 'SC(B)H15, SC(B)H17, SC(B)H19']
    ])
  }),
  transformerProduct({
    id: 'amorphous-dgh-furnace',
    name: 'DGH Series Dry-Type Amorphous Alloy Furnace Transformer',
    nameAr: 'محول فرن جاف من السبيكة غير المتبلورة سلسلة DGH',
    image: '成品区/电炉变图片.png',
    category: 'special',
    subCategory: 'special',
    categoryLabel: 'Special Transformer',
    categoryLabelAr: 'محول خاص',
    shortDesc: 'DGH dry-type amorphous alloy furnace transformer for specialized industrial applications.',
    shortDescAr: 'محول فرن جاف من السبيكة غير المتبلورة سلسلة DGH للتطبيقات الصناعية الخاصة.',
    description: 'The DGH series is a dry-type amorphous alloy furnace transformer module from the amorphous alloy catalog. It is separated from standard distribution transformers because furnace transformer duty and application conditions are different.',
    descriptionAr: 'تمثل سلسلة DGH محول فرن جافا بقلب من السبيكة غير المتبلورة من كتالوج المحولات غير المتبلورة. يتم فصله عن محولات التوزيع القياسية لاختلاف طبيعة الحمل وظروف التطبيق.',
    capacities: ['Project-specific'],
    voltages: ['Customized voltage class'],
    aliases: ['dgh', 'DGH'],
    specs: specs([
      ['Product Model', 'DGH Series'],
      ['Transformer Type', 'Dry-type furnace transformer'],
      ['Core Type', 'Amorphous alloy core'],
      ['Application', 'Industrial furnace power supply'],
      ['Configuration', 'Project-specific design']
    ])
  }),
  transformerProduct({
    id: 'amorphous-sbh-mrl-wound-core',
    name: 'S(B)H21-M.RL Oil-Immersed Amorphous Alloy 3D Wound Core Transformer',
    nameAr: 'محول مغمور بالزيت بقلب ملفوف ثلاثي الأبعاد من السبيكة غير المتبلورة S(B)H21-M.RL',
    image: 'uploads/product-sbh21-m-rl-amorphous-wound-core.png',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'S(B)H21-M.RL amorphous alloy oil-immersed 3D wound core transformer module.',
    shortDescAr: 'محول S(B)H21-M.RL مغمور بالزيت بقلب ملفوف ثلاثي الأبعاد من السبيكة غير المتبلورة.',
    description: 'This module corresponds to the S(B)H21-M.RL oil-immersed amorphous alloy 3D wound core transformer in the amorphous alloy catalog, combining low-loss amorphous core material with a wound-core structure.',
    descriptionAr: 'يمثل هذا المنتج محول S(B)H21-M.RL المغمور بالزيت بقلب ملفوف ثلاثي الأبعاد من السبيكة غير المتبلورة، ويجمع بين مادة قلب منخفضة الفواقد وبنية القلب الملفوف.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class'],
    aliases: ['SBH21-M-RL', 'S(B)H21-M.RL'],
    specs: specs([
      ['Product Model', 'S(B)H21-M.RL Series'],
      ['Transformer Type', 'Oil-immersed amorphous alloy transformer'],
      ['Core Type', 'Amorphous alloy 3D wound core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Series / Variants', 'S(B)H21-M.RL']
    ])
  }),
  transformerProduct({
    id: 'amorphous-sbh15-m',
    name: 'S(B)H15-M Oil-Immersed Amorphous Alloy Distribution Transformer',
    nameAr: 'محول توزيع مغمور بالزيت بقلب غير متبلور S(B)H15-M',
    image: '成品区/油式非晶S(B)H15.png',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'S(B)H15-M oil-immersed amorphous alloy distribution transformer module.',
    shortDescAr: 'محول توزيع S(B)H15-M مغمور بالزيت بقلب من السبيكة غير المتبلورة.',
    description: 'This product module represents the S(B)H15-M oil-immersed amorphous alloy distribution transformer group in the amorphous alloy catalog. It is kept separate from S(B)H21-M and S(B)H25-M because the catalog treats them as distinct product groups.',
    descriptionAr: 'يمثل هذا المنتج مجموعة محولات التوزيع S(B)H15-M المغمورة بالزيت بقلب من السبيكة غير المتبلورة. ويتم فصلها عن S(B)H21-M وS(B)H25-M لأن الكتالوج يعرضها كمجموعات منتجات مستقلة.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class'],
    aliases: ['sbh15', 'S(B)H15-M'],
    specs: specs([
      ['Product Model', 'S(B)H15-M Series'],
      ['Transformer Type', 'Oil-immersed amorphous alloy distribution transformer'],
      ['Core Type', 'Amorphous alloy core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Series / Variants', 'S(B)H15-M']
    ])
  }),
  transformerProduct({
    id: 'amorphous-sbh21-m',
    name: 'S(B)H21-M Oil-Immersed Amorphous Alloy Distribution Transformer',
    nameAr: 'محول توزيع مغمور بالزيت بقلب غير متبلور S(B)H21-M',
    image: '成品区/油式非晶S(B)H15.png',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'S(B)H21-M oil-immersed amorphous alloy distribution transformer module.',
    shortDescAr: 'محول توزيع S(B)H21-M مغمور بالزيت بقلب من السبيكة غير المتبلورة.',
    description: 'This module represents the S(B)H21-M oil-immersed amorphous alloy distribution transformer group. It is managed separately from the S(B)H15-M and S(B)H25-M groups to preserve the catalog product structure.',
    descriptionAr: 'يمثل هذا المنتج مجموعة محولات التوزيع S(B)H21-M المغمورة بالزيت بقلب من السبيكة غير المتبلورة، ويتم إدارتها بشكل منفصل عن S(B)H15-M وS(B)H25-M للحفاظ على بنية الكتالوج.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class'],
    aliases: ['sbh21', 'S(B)H21-M'],
    specs: specs([
      ['Product Model', 'S(B)H21-M Series'],
      ['Transformer Type', 'Oil-immersed amorphous alloy distribution transformer'],
      ['Core Type', 'Amorphous alloy core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Series / Variants', 'S(B)H21-M']
    ])
  }),
  transformerProduct({
    id: 'amorphous-sbh25-m',
    name: 'S(B)H25-M Oil-Immersed Amorphous Alloy Distribution Transformer',
    nameAr: 'محول توزيع مغمور بالزيت بقلب غير متبلور S(B)H25-M',
    image: '产品图片(1)/非晶合金（植物油）高过载配电变压器.jpg',
    category: 'oil-immersed',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت',
    shortDesc: 'S(B)H25-M oil-immersed amorphous alloy distribution transformer module.',
    shortDescAr: 'محول توزيع S(B)H25-M مغمور بالزيت بقلب من السبيكة غير المتبلورة.',
    description: 'This module represents the S(B)H25-M oil-immersed amorphous alloy distribution transformer group from the amorphous alloy catalog. It remains a separate product module because the catalog lists it as a distinct product group.',
    descriptionAr: 'يمثل هذا المنتج مجموعة محولات التوزيع S(B)H25-M المغمورة بالزيت بقلب من السبيكة غير المتبلورة، ويبقى كمنتج مستقل لأن الكتالوج يعرضه كمجموعة منفصلة.',
    capacities: ['30-2500 kVA'],
    voltages: ['10kV class'],
    aliases: ['sbh25', 'S(B)H25-M'],
    specs: specs([
      ['Product Model', 'S(B)H25-M Series'],
      ['Transformer Type', 'Oil-immersed amorphous alloy distribution transformer'],
      ['Core Type', 'Amorphous alloy core'],
      ['Cooling Method', 'ONAN'],
      ['Capacity Range', '30-2500 kVA'],
      ['Series / Variants', 'S(B)H25-M']
    ])
  })
];

const remaining = products.filter(product => !removeIds.has(product.id));
const next = remaining.concat(newProducts);

fs.writeFileSync(dataFile, JSON.stringify(next, null, 2), 'utf8');
console.log('Removed old product IDs: ' + Array.from(removeIds).join(', '));
console.log('Added product IDs: ' + newProducts.map(product => product.id).join(', '));
console.log('Total products: ' + next.length);
