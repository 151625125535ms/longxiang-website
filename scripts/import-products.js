#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CATEGORY_META = {
  'oil-immersed': {
    group: 'transformer',
    subCategory: 'oil-immersed',
    categoryLabel: 'Oil Immersed Transformer',
    categoryLabelAr: 'محول مغمور بالزيت'
  },
  'dry-type': {
    group: 'transformer',
    subCategory: 'dry-type',
    categoryLabel: 'Dry Type Transformer',
    categoryLabelAr: 'محول جاف'
  },
  combined: {
    group: 'transformer',
    subCategory: 'combined',
    categoryLabel: 'Combined Transformer',
    categoryLabelAr: 'محول مدمج'
  },
  special: {
    group: 'transformer',
    subCategory: 'special',
    categoryLabel: 'Special Transformer',
    categoryLabelAr: 'محول خاص'
  },
  ac: {
    group: 'ev-charger',
    subCategory: 'ac',
    categoryLabel: 'AC EV Charging Station',
    categoryLabelAr: 'محطة شحن تيار متردد'
  },
  dc: {
    group: 'ev-charger',
    subCategory: 'dc',
    categoryLabel: 'DC EV Charging Station',
    categoryLabelAr: 'محطة شحن تيار مستمر'
  },
  'high-voltage': {
    group: 'switchgear',
    subCategory: 'high-voltage',
    categoryLabel: 'High-Voltage Switchgear',
    categoryLabelAr: 'معدات مفاتيح الجهد العالي'
  },
  'medium-low-voltage': {
    group: 'switchgear',
    subCategory: 'medium-low-voltage',
    categoryLabel: 'Medium&Low Voltage Switchgear',
    categoryLabelAr: 'معدات مفاتيح الجهد المتوسط والمنخفض'
  }
};

const SPEC_LABELS = {
  '型号': 'Product Model',
  '具体型号': 'Specific Model',
  '功率等级': 'Power Rating',
  '额定功率': 'Rated Power',
  '额定输入/输出电压': 'Rated Input / Output Voltage',
  '输入电压/输出电压': 'Input / Output Voltage',
  '输入电压范围': 'Input Voltage Range',
  '输出电压范围': 'Output Voltage Range',
  '额定输出电流': 'Rated Output Current',
  '输出电流范围': 'Output Current Range',
  '启动方式': 'Start Mode',
  '充电接口': 'Charging Connector',
  '枪线长度': 'Cable Length',
  '工作指示灯': 'Working Indicator',
  '显示界面': 'Display',
  '防护等级': 'Protection Rating',
  '计量等级': 'Metering Accuracy Class',
  '产品重量': 'Product Weight',
  '产品尺寸W×H×D（mm）': 'Dimensions (W x H x D)',
  '产品尺寸 W×H×D（mm）': 'Dimensions (W x H x D)',
  '保护特性': 'Protection Features',
  '支付方式': 'Payment Method',
  '联网方式': 'Network Connection',
  '噪音': 'Noise',
  '冷却方式': 'Cooling Method',
  '安装方式': 'Installation Method',
  '峰值效率': 'Peak Efficiency'
};

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    copyImages: false,
    commit: false,
    push: false,
    imageRoot: '',
    commitMessage: '',
    inputFile: ''
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--copy-images') args.copyImages = true;
    else if (arg === '--commit') args.commit = true;
    else if (arg === '--push') args.push = true;
    else if (arg === '--image-root') args.imageRoot = argv[++i] || '';
    else if (arg === '--commit-message') args.commitMessage = argv[++i] || '';
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!args.inputFile) {
      args.inputFile = arg;
    } else {
      fail('Unknown argument: ' + arg);
    }
  }

  if (!args.inputFile) {
    printHelp();
    process.exit(1);
  }

  if (!args.apply) args.dryRun = true;
  return args;
}

function printHelp() {
  console.log([
    'Usage:',
    '  node scripts/import-products.js <products-import.json> [options]',
    '',
    'Options:',
    '  --dry-run                 Preview only. This is the default.',
    '  --apply                   Write data/products.json.',
    '  --copy-images             Copy sourceImage files into uploads/.',
    '  --image-root <dir>        Base directory for relative sourceImage paths.',
    '  --commit                  Run git add + git commit after --apply.',
    '  --push                    Run git push origin main after commit.',
    '  --commit-message <text>   Commit message. Defaults to import count.',
    '',
    'Input may be either an array of products or { "defaults": {}, "products": [] }.'
  ].join('\n'));
}

function fail(message) {
  console.error('ERROR: ' + message);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail('Failed to read JSON ' + filePath + ': ' + err.message);
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureArray(value, fieldName) {
  if (value == null) return [];
  if (!Array.isArray(value)) fail(fieldName + ' must be an array.');
  return value;
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  if (value == null) return [];
  fail('List field must be an array or comma-separated string.');
}

function normalizeSpecs(specs) {
  return ensureArray(specs, 'specs')
    .map((spec) => {
      if (Array.isArray(spec)) {
        return [translateSpecKey(spec[0]), String(spec[1] == null ? '' : spec[1]).trim()];
      }
      if (spec && typeof spec === 'object') {
        return [translateSpecKey(spec.key || spec.name), String(spec.value == null ? '' : spec.value).trim()];
      }
      fail('Each spec must be [key, value] or { key, value }.');
    })
    .filter((spec) => spec[0] || spec[1]);
}

function translateSpecKey(key) {
  const normalized = String(key == null ? '' : key).trim();
  return SPEC_LABELS[normalized] || normalized;
}

function slugifyId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function resolveSourceImage(sourceImage, imageRoot, inputDir) {
  if (!sourceImage) return '';
  if (path.isAbsolute(sourceImage)) return sourceImage;
  if (imageRoot) return path.resolve(imageRoot, sourceImage);
  return path.resolve(inputDir, sourceImage);
}

function copyImage(product, args, inputDir, rootDir) {
  if (!args.copyImages || !product.sourceImage) return product.image || '';

  const sourcePath = resolveSourceImage(product.sourceImage, args.imageRoot, inputDir);
  if (!fs.existsSync(sourcePath)) {
    fail('Image not found for ' + product.id + ': ' + sourcePath);
  }

  const ext = path.extname(sourcePath) || '.png';
  const uploadName = product.uploadName || ('product-' + slugifyId(product.id) + ext.toLowerCase());
  const uploadPath = path.join(rootDir, 'uploads', uploadName);
  if (args.apply) {
    fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
    fs.copyFileSync(sourcePath, uploadPath);
  }
  return 'uploads/' + uploadName;
}

function normalizeProduct(raw, defaults, args, inputDir, rootDir) {
  const category = raw.category || defaults.category || '';
  const meta = CATEGORY_META[category] || {};
  const image = copyImage(raw, args, inputDir, rootDir) || raw.image || '';

  const product = {
    id: String(raw.id || '').trim(),
    name: String(raw.name || '').trim(),
    nameAr: String(raw.nameAr || '').trim(),
    image,
    category,
    group: raw.group || meta.group || '',
    subCategory: raw.subCategory || meta.subCategory || category,
    categoryLabel: raw.categoryLabel || meta.categoryLabel || '',
    categoryLabelAr: raw.categoryLabelAr || meta.categoryLabelAr || '',
    shortDesc: String(raw.shortDesc || '').trim(),
    shortDescAr: String(raw.shortDescAr || '').trim(),
    description: String(raw.description || '').trim(),
    descriptionAr: String(raw.descriptionAr || '').trim(),
    capacities: splitList(raw.capacities),
    voltages: splitList(raw.voltages),
    specs: normalizeSpecs(raw.specs),
    featured: Boolean(raw.featured)
  };

  validateProduct(product);
  return product;
}

function validateProduct(product) {
  const missing = [];
  if (!product.id) missing.push('id');
  if (!product.name) missing.push('name');
  if (!product.category) missing.push('category');
  if (!product.categoryLabel) missing.push('categoryLabel');
  if (!product.group) missing.push('group');
  if (!product.subCategory) missing.push('subCategory');
  if (missing.length) fail('Product is missing required fields: ' + missing.join(', '));
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

function runGit(args, products) {
  const files = ['data/products.json'].concat(products.map((product) => product.image).filter(Boolean));
  execFileSync('git', ['add'].concat(files), { stdio: 'inherit' });
  execFileSync('git', [
    'commit',
    '-m',
    args.commitMessage || ('Import ' + products.length + ' products')
  ], { stdio: 'inherit' });
  if (args.push) {
    execFileSync('git', ['push', 'origin', 'main'], { stdio: 'inherit' });
  }
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = process.cwd();
  const inputPath = path.resolve(args.inputFile);
  const inputDir = path.dirname(inputPath);
  const dataFile = path.join(rootDir, 'data', 'products.json');

  if (!fs.existsSync(dataFile)) fail('Run this script from the project root. Missing data/products.json.');

  const importData = readJson(inputPath);
  const defaults = Array.isArray(importData) ? {} : (importData.defaults || {});
  const rawProducts = Array.isArray(importData) ? importData : importData.products;
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    fail('Import file must contain at least one product.');
  }

  const products = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const existingIds = new Set(products.map((product) => String(product.id).toLowerCase()));
  const incomingIds = new Set();
  const normalized = rawProducts.map((raw) => normalizeProduct(raw, defaults, args, inputDir, rootDir));

  normalized.forEach((product) => {
    const id = product.id.toLowerCase();
    if (existingIds.has(id)) fail('Product id already exists: ' + product.id);
    if (incomingIds.has(id)) fail('Duplicate id in import file: ' + product.id);
    incomingIds.add(id);
  });

  console.log('Import mode: ' + (args.apply ? 'apply' : 'dry-run'));
  console.log('Products to add: ' + normalized.length);
  normalized.forEach((product) => {
    console.log('- ' + product.id + ' | ' + product.name + ' | ' + product.category + ' | specs: ' + product.specs.length);
  });

  if (!args.apply) {
    console.log('No files were changed. Re-run with --apply to write data/products.json.');
    return;
  }

  const backupFile = dataFile + '.bak-import-' + timestamp();
  fs.copyFileSync(dataFile, backupFile);
  writeJson(dataFile, products.concat(normalized));
  JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  console.log('Updated data/products.json.');
  console.log('Backup created: ' + path.relative(rootDir, backupFile));

  if (args.commit) runGit(args, normalized);
}

main();
