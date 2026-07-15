'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, 'config', 'locales.json');
const PUBLIC_STATE = 'supported';
const PLANNED_STATES = new Set(['planned', 'editing', 'qa']);

function normalizeCode(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizePathPrefix(value) {
    const prefix = String(value || '').trim().replace(/\/+$/, '');
    if (!prefix || prefix === '/') return '';
    return prefix.charAt(0) === '/' ? prefix : '/' + prefix;
}

function assert(condition, message) {
    if (!condition) throw new Error('Invalid locale configuration: ' + message);
}

function uniqueCodes(values, label) {
    const result = [];
    const seen = new Set();
    (values || []).forEach(function (value) {
        const code = normalizeCode(value);
        assert(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code), label + ' contains invalid locale code: ' + value);
        assert(!seen.has(code), label + ' contains duplicate locale: ' + code);
        seen.add(code);
        result.push(code);
    });
    return result;
}

function normalizeEntry(code, source, state) {
    const config = source || {};
    const prefix = normalizePathPrefix(config.pathPrefix);
    const includeInSitemap = state === PUBLIC_STATE
        ? config.includeInSitemap !== false
        : config.includeInSitemap === true;
    if (state === PUBLIC_STATE) {
        assert(config.includeInSitemap !== false, code + ' is supported but includeInSitemap is false');
    } else {
        assert(!includeInSitemap, code + ' is non-public but includeInSitemap is true');
    }
    return Object.freeze({
        code,
        state,
        isPublic: state === PUBLIC_STATE,
        isSelectable: state === PUBLIC_STATE,
        isEditable: state === PUBLIC_STATE || state === 'editing' || state === 'qa',
        label: config.label || code,
        nativeLabel: config.nativeLabel || config.label || code,
        htmlLang: config.htmlLang || code,
        hreflang: config.hreflang || config.htmlLang || code,
        dir: config.dir === 'rtl' ? 'rtl' : 'ltr',
        pathPrefix: prefix,
        homePath: config.homePath || (prefix ? prefix + '/index.html' : '/'),
        fallbackLocale: normalizeCode(config.fallbackLocale) || null,
        includeInSitemap
    });
}

function stableJson(value) {
    if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
    if (value && typeof value === 'object') {
        return '{' + Object.keys(value).sort().map(function (key) {
            return JSON.stringify(key) + ':' + stableJson(value[key]);
        }).join(',') + '}';
    }
    return JSON.stringify(value);
}

function createLocaleRegistry(configValue) {
    const config = configValue || {};
    const activeMap = config.locales || {};
    const plannedMap = config.plannedLocales || {};
    const supportedCodes = uniqueCodes(
        Array.isArray(config.supportedLocales) && config.supportedLocales.length
            ? config.supportedLocales
            : Object.keys(activeMap),
        'supportedLocales'
    );
    assert(supportedCodes.length > 0, 'at least one supported locale is required');

    const entries = [];
    const byCode = new Map();
    supportedCodes.forEach(function (code) {
        assert(Object.prototype.hasOwnProperty.call(activeMap, code), 'supported locale is missing from locales: ' + code);
        const configuredState = normalizeCode(activeMap[code] && activeMap[code].state);
        assert(!configuredState || configuredState === PUBLIC_STATE, code + ' has conflicting state: ' + configuredState);
        const entry = normalizeEntry(code, activeMap[code], PUBLIC_STATE);
        entries.push(entry);
        byCode.set(code, entry);
    });

    Object.keys(activeMap).forEach(function (rawCode) {
        const code = normalizeCode(rawCode);
        assert(byCode.has(code), 'locales contains an entry not listed as supported: ' + rawCode);
    });

    const plannedCodes = uniqueCodes(Object.keys(plannedMap), 'plannedLocales');
    plannedCodes.forEach(function (code) {
        assert(!byCode.has(code), 'locale cannot be both supported and planned: ' + code);
        const configuredState = normalizeCode(plannedMap[code] && (plannedMap[code].workflowState || plannedMap[code].state)) || 'planned';
        assert(PLANNED_STATES.has(configuredState), code + ' has invalid planned state: ' + configuredState);
        const entry = normalizeEntry(code, plannedMap[code], configuredState);
        entries.push(entry);
        byCode.set(code, entry);
    });

    const defaultLocale = normalizeCode(config.defaultLocale) || supportedCodes[0];
    assert(byCode.has(defaultLocale) && byCode.get(defaultLocale).isPublic, 'defaultLocale must be supported: ' + defaultLocale);
    entries.forEach(function (entry) {
        if (!entry.fallbackLocale) return;
        assert(byCode.has(entry.fallbackLocale), entry.code + ' fallbackLocale is unknown: ' + entry.fallbackLocale);
        assert(byCode.get(entry.fallbackLocale).isPublic, entry.code + ' fallbackLocale is not public: ' + entry.fallbackLocale);
    });

    const publicEntries = entries.filter(function (entry) { return entry.isPublic; });
    const plannedEntries = entries.filter(function (entry) { return !entry.isPublic; });
    const manifestBody = {
        defaultLocale,
        locales: entries.reduce(function (output, entry) {
            output[entry.code] = {
                state: entry.state,
                label: entry.label,
                nativeLabel: entry.nativeLabel,
                htmlLang: entry.htmlLang,
                hreflang: entry.hreflang,
                dir: entry.dir,
                pathPrefix: entry.pathPrefix,
                homePath: entry.homePath,
                fallbackLocale: entry.fallbackLocale,
                isPublic: entry.isPublic,
                isSelectable: entry.isSelectable,
                includeInSitemap: entry.includeInSitemap
            };
            return output;
        }, {})
    };
    const hash = crypto.createHash('sha256').update(stableJson(manifestBody)).digest('hex').slice(0, 16);

    function legacyConfig() {
        return {
            defaultLocale,
            supportedLocales: publicEntries.map(function (entry) { return entry.code; }),
            locales: publicEntries.reduce(function (output, entry) {
                output[entry.code] = { ...entry };
                return output;
            }, {}),
            plannedLocales: plannedEntries.reduce(function (output, entry) {
                output[entry.code] = { ...entry, workflowState: entry.state };
                return output;
            }, {})
        };
    }

    return Object.freeze({
        defaultLocale,
        hash,
        entries: Object.freeze(entries.slice()),
        publicEntries: Object.freeze(publicEntries.slice()),
        plannedEntries: Object.freeze(plannedEntries.slice()),
        get: function (code) { return byCode.get(normalizeCode(code)) || null; },
        has: function (code) { return byCode.has(normalizeCode(code)); },
        legacyConfig,
        browserManifest: function () {
            return {
                defaultLocale,
                supportedLocales: publicEntries.map(function (entry) { return entry.code; }),
                locales: publicEntries.reduce(function (output, entry) {
                    output[entry.code] = manifestBody.locales[entry.code];
                    return output;
                }, {}),
                plannedLocales: plannedEntries.reduce(function (output, entry) {
                    output[entry.code] = manifestBody.locales[entry.code];
                    return output;
                }, {}),
                hash
            };
        }
    });
}

function loadLocaleRegistry(configPath) {
    const resolvedPath = configPath || DEFAULT_CONFIG_PATH;
    return createLocaleRegistry(JSON.parse(fs.readFileSync(resolvedPath, 'utf8')));
}

module.exports = {
    DEFAULT_CONFIG_PATH,
    createLocaleRegistry,
    loadLocaleRegistry,
    normalizeCode,
    normalizePathPrefix,
    stableJson
};
