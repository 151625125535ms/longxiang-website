#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const arabicDir = path.join(root, 'ar');
const frontendJs = [
  'js/main.js',
  'js/products-list.js',
  'js/product-detail.js',
  'js/compare.js',
  'js/education.js'
];
const frontendJson = [
  'data/company.json',
  'data/products.json',
  'data/certifications.json',
  'data/education.json'
];

const mojibakeRe = /[\u3400-\u4dbf\u4e00-\u9fff\ufffd]/;
const arabicRe = /[\u0600-\u06ff]/;

const allowedLatin = [
  'Longxiang',
  'Henan',
  'Electrical',
  'Co.',
  'Ltd.',
  'NEEQ',
  'GB',
  'IEC',
  'ISO',
  'CQC',
  'CNAS',
  'CE',
  'CCC',
  'EV',
  'AC',
  'DC',
  'PV',
  'EMS',
  'BMS',
  'PCS',
  'YouTube',
  'Google',
  'WhatsApp',
  'TikTok',
  'Line',
  'RMB',
  'UTC',
  'kV',
  'kVA',
  'kW',
  'kWh',
  'Hz',
  'V',
  'A',
  'm2',
  'm²'
];

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function add(issues, file, message, detail) {
  issues.push({ file, message, detail });
}

function stripNonVisibleHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\s(?:src|href)=["'][^"']*["']/gi, '')
    .replace(/url\(["']?[^)"']+["']?\)/gi, 'url()')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function textFromHtml(html) {
  return stripNonVisibleHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasUnexpectedLatin(value) {
  const withoutAllowed = allowedLatin.reduce((text, term) => {
    return text.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }, value);
  return /[A-Za-z]{4,}/.test(withoutAllowed);
}

function auditHtml(issues) {
  for (const name of fs.readdirSync(arabicDir).filter((item) => item.endsWith('.html')).sort()) {
    const file = path.join(arabicDir, name);
    const html = fs.readFileSync(file, 'utf8');
    const visible = textFromHtml(html);
    if (!/<html[^>]+lang=["']ar["'][^>]+dir=["']rtl["']/i.test(html)) {
      add(issues, rel(file), 'Arabic page is missing lang="ar" dir="rtl".');
    }
    if (mojibakeRe.test(visible)) {
      add(issues, rel(file), 'Visible Arabic HTML text contains mojibake/CJK characters.');
    }
    if (!arabicRe.test(visible)) {
      add(issues, rel(file), 'Arabic page has no Arabic visible text.');
    }
  }
}

function walkJson(value, visitor, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, visitor, trail.concat(index)));
    return;
  }
  if (value && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      visitor(key, value[key], trail.concat(key));
      walkJson(value[key], visitor, trail.concat(key));
    });
  }
}

function auditJson(issues) {
  for (const file of frontendJson) {
    const data = JSON.parse(read(file));
    walkJson(data, (key, value, trail) => {
      if (!/Ar$/.test(key)) return;
      const loc = `${file}:${trail.join('.')}`;
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const itemLoc = `${loc}.${index}`;
          if (typeof item !== 'string') {
            add(issues, itemLoc, 'Arabic array item is not a string.');
            return;
          }
          if (!item.trim()) add(issues, itemLoc, 'Arabic array item is empty.');
          if (mojibakeRe.test(item)) add(issues, itemLoc, 'Arabic array item contains mojibake/CJK characters.', item);
          if (item.trim() && !arabicRe.test(item) && hasUnexpectedLatin(item)) {
            add(issues, itemLoc, 'Arabic array item appears to be untranslated English.', item);
          }
        });
        return;
      }
      if (typeof value !== 'string') {
        add(issues, loc, 'Arabic field is not a string.');
        return;
      }
      if (!value.trim()) {
        add(issues, loc, 'Arabic field is empty.');
      }
      if (mojibakeRe.test(value)) {
        add(issues, loc, 'Arabic field contains mojibake/CJK characters.', value);
      }
      if (value.trim() && !arabicRe.test(value) && hasUnexpectedLatin(value)) {
        add(issues, loc, 'Arabic field appears to be untranslated English.', value);
      }
    });
  }
}

function auditJs(issues) {
  for (const file of frontendJs) {
    const source = read(file);
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      const isAssetLine = /(image|icon|src|href|url|encodeURI|background)/i.test(line);
      if (!isAssetLine && mojibakeRe.test(line)) {
        add(issues, `${file}:${index + 1}`, 'Frontend JS line contains mojibake/CJK characters.', line.trim());
      }
    });
  }
}

const issues = [];
auditHtml(issues);
auditJson(issues);
auditJs(issues);

if (issues.length) {
  console.error(`Arabic frontend audit failed with ${issues.length} issue(s):`);
  issues.forEach((issue) => {
    console.error(`- ${issue.file}: ${issue.message}${issue.detail ? ` ${issue.detail}` : ''}`);
  });
  process.exit(1);
}

console.log('Arabic frontend audit passed.');
