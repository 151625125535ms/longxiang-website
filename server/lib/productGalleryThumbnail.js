'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
    ensureDirectory,
    normalizePublicPath,
    resolveProductGalleryThumbnailCacheDir,
    resolvePublicFilePath
} = require('./fileStore');

const WIDTH = 320;
const HEIGHT = 240;
const WEBP_QUALITY = 78;
const MAX_INPUT_PIXELS = 12000 * 12000;
const WHITE = { r: 255, g: 255, b: 255 };
const pending = new Map();

function hash(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function productGalleryThumbnailUrl(identifier, index, sourcePath, version) {
    const normalized = normalizePublicPath(sourcePath);
    const numericIndex = Number(index);
    if (!identifier || !normalized || !Number.isInteger(numericIndex) || numericIndex < 0) return '';
    const cacheVersion = version == null || version === '' ? hash(normalized).slice(0, 12) : String(version);
    return '/media/product-gallery/' + encodeURIComponent(String(identifier)) + '/' + numericIndex + '.webp?v=' + encodeURIComponent(cacheVersion);
}

function cacheDescriptor(sourcePath) {
    const normalized = normalizePublicPath(sourcePath);
    const sourceFile = resolvePublicFilePath(normalized);
    if (!normalized || !sourceFile) {
        const error = new Error('Invalid product gallery image path.');
        error.code = 'INVALID_GALLERY_IMAGE_PATH';
        throw error;
    }

    let stat;
    try {
        stat = fs.statSync(sourceFile);
    } catch (err) {
        err.code = err.code || 'GALLERY_IMAGE_NOT_FOUND';
        throw err;
    }
    if (!stat.isFile()) {
        const error = new Error('Product gallery image is not a file.');
        error.code = 'GALLERY_IMAGE_NOT_FOUND';
        throw error;
    }

    const key = hash([normalized, stat.size, Math.round(stat.mtimeMs)].join('\n'));
    return {
        key,
        normalized,
        sourceFile,
        outputFile: path.join(resolveProductGalleryThumbnailCacheDir(), key + '.webp')
    };
}

async function generateThumbnail(descriptor) {
    if (fs.existsSync(descriptor.outputFile)) return descriptor;
    ensureDirectory(path.dirname(descriptor.outputFile));
    const temporaryFile = descriptor.outputFile + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
    try {
        await sharp(descriptor.sourceFile, { animated: false, limitInputPixels: MAX_INPUT_PIXELS })
            .rotate()
            .flatten({ background: WHITE })
            .resize({
                width: WIDTH,
                height: HEIGHT,
                fit: 'contain',
                background: WHITE,
                withoutEnlargement: false
            })
            .webp({ quality: WEBP_QUALITY })
            .toFile(temporaryFile);

        try {
            fs.renameSync(temporaryFile, descriptor.outputFile);
        } catch (err) {
            if (!fs.existsSync(descriptor.outputFile)) throw err;
            fs.rmSync(temporaryFile, { force: true });
        }
        return descriptor;
    } catch (err) {
        fs.rmSync(temporaryFile, { force: true });
        throw err;
    }
}

function ensureProductGalleryThumbnail(sourcePath) {
    const descriptor = cacheDescriptor(sourcePath);
    if (fs.existsSync(descriptor.outputFile)) return Promise.resolve(descriptor);
    if (!pending.has(descriptor.key)) {
        pending.set(descriptor.key, generateThumbnail(descriptor).finally(function () {
            pending.delete(descriptor.key);
        }));
    }
    return pending.get(descriptor.key);
}

module.exports = {
    HEIGHT,
    WIDTH,
    ensureProductGalleryThumbnail,
    productGalleryThumbnailUrl
};
