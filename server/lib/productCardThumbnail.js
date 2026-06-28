const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PROJECT_ROOT, ensureDirectory, resolveUploadDir, resolveUploadPublicPath } = require('./fileStore');

const CONFIG = require('../../config/product-card-thumbnails.json');
const CARD_IMAGE_DIR = 'assets/optimized/product-cards';
const WHITE = { r: 255, g: 255, b: 255 };
const CANVAS_WIDTH = Number(CONFIG.canvas && CONFIG.canvas.width) || 960;
const CANVAS_HEIGHT = Number(CONFIG.canvas && CONFIG.canvas.height) || 720;
const WHITE_THRESHOLD = Number(CONFIG.whiteThreshold) || 246;
const ALPHA_THRESHOLD = Number(CONFIG.alphaThreshold) || 8;
const BBOX_EXPAND_RATIO = Number(CONFIG.bboxExpandRatio) || 0.035;
const WEBP_QUALITY = Number(CONFIG.webpQuality) || 88;
const SCALE_OVERRIDES = CONFIG.scaleOverrides || {};
const MAX_INPUT_PIXELS = 12000 * 12000;

const pendingJobs = new Map();
const runningJobs = new Set();

function slugify(value, fallback) {
    const slug = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return slug || fallback || '';
}

function cardImageSlug(product) {
    return slugify(product && (product.slug || product.legacy_id), product && product.id ? 'product-' + product.id : '');
}

function productKey(product) {
    return cardImageSlug(product);
}

function cardImagePublicPath(product) {
    const slug = cardImageSlug(product);
    return slug ? CARD_IMAGE_DIR + '/' + slug + '.webp' : '';
}

function normalizePublicPath(publicPath) {
    const normalized = String(publicPath || '').trim().replace(/\\/g, '/').replace(/[?#].*$/, '').replace(/^\/+/, '');
    if (!normalized) return '';
    if (normalized.indexOf('..') !== -1) return '';
    if (/^(?:https?:)?\/\//i.test(normalized) || /^data:/i.test(normalized) || /^blob:/i.test(normalized)) return '';
    return normalized;
}

function resolvePublicPathToFile(publicPath) {
    const normalized = normalizePublicPath(publicPath);
    if (!normalized) return '';

    const uploadPublicPath = normalizePublicPath(resolveUploadPublicPath());
    if (uploadPublicPath && (normalized === uploadPublicPath || normalized.startsWith(uploadPublicPath + '/'))) {
        const relativeUploadPath = normalized === uploadPublicPath
            ? ''
            : normalized.slice(uploadPublicPath.length + 1);
        const uploadDir = path.resolve(resolveUploadDir());
        const resolvedUploadFile = path.resolve(uploadDir, ...relativeUploadPath.split('/').filter(Boolean));
        const uploadRootWithSep = uploadDir.endsWith(path.sep) ? uploadDir : uploadDir + path.sep;
        if (resolvedUploadFile !== uploadDir && !resolvedUploadFile.startsWith(uploadRootWithSep)) return '';
        return resolvedUploadFile;
    }

    const resolved = path.resolve(PROJECT_ROOT, ...normalized.split('/'));
    const rootWithSep = PROJECT_ROOT.endsWith(path.sep) ? PROJECT_ROOT : PROJECT_ROOT + path.sep;
    if (resolved !== PROJECT_ROOT && !resolved.startsWith(rootWithSep)) return '';
    return resolved;
}

function isBackgroundPixel(r, g, b, a) {
    if (a <= ALPHA_THRESHOLD) return true;
    return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

function detectSubjectBounds(data, width, height, channels) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * channels;
            const r = data[offset] || 0;
            const g = data[offset + 1] || 0;
            const b = data[offset + 2] || 0;
            const a = channels >= 4 ? data[offset + 3] : 255;
            if (isBackgroundPixel(r, g, b, a)) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }

    if (maxX < 0 || maxY < 0) return null;
    return {
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

function expandBounds(bounds, imageSize) {
    const padX = Math.max(2, Math.round(bounds.width * BBOX_EXPAND_RATIO));
    const padY = Math.max(2, Math.round(bounds.height * BBOX_EXPAND_RATIO));
    const left = Math.max(0, bounds.left - padX);
    const top = Math.max(0, bounds.top - padY);
    const right = Math.min(imageSize.width, bounds.left + bounds.width + padX);
    const bottom = Math.min(imageSize.height, bounds.top + bounds.height + padY);
    return {
        left,
        top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top)
    };
}

function classifySubject(fillRatio, bounds) {
    if (!bounds) return 'low_confidence';
    if (fillRatio >= 0.985 || fillRatio <= 0.08) return 'low_confidence';
    if (fillRatio < 0.82) return 'safe_auto';
    if (fillRatio < 0.92) return 'needs_review';
    return 'low_confidence';
}

function targetLimits(cropSize) {
    const ratio = cropSize.height ? cropSize.width / cropSize.height : 1;
    if (ratio < 0.58) return { width: Math.round(CANVAS_WIDTH * 0.46), height: Math.round(CANVAS_HEIGHT * 0.84) };
    if (ratio < 0.98) return { width: Math.round(CANVAS_WIDTH * 0.62), height: Math.round(CANVAS_HEIGHT * 0.82) };
    if (ratio > 1.75) return { width: Math.round(CANVAS_WIDTH * 0.86), height: Math.round(CANVAS_HEIGHT * 0.68) };
    if (ratio > 1.28) return { width: Math.round(CANVAS_WIDTH * 0.84), height: Math.round(CANVAS_HEIGHT * 0.74) };
    return { width: Math.round(CANVAS_WIDTH * 0.80), height: Math.round(CANVAS_HEIGHT * 0.79) };
}

function scaledLimits(product, cropSize) {
    const limits = targetLimits(cropSize);
    const scale = Number(SCALE_OVERRIDES[productKey(product)]) || 1;
    return {
        width: Math.max(1, Math.round(limits.width * scale)),
        height: Math.max(1, Math.round(limits.height * scale))
    };
}

function deleteProductCardThumbnail(product) {
    const publicPath = cardImagePublicPath(product);
    const outputFile = resolvePublicPathToFile(publicPath);
    if (!outputFile) return { deleted: false, reason: 'invalid_output_path', publicPath };
    if (!fs.existsSync(outputFile)) return { deleted: false, reason: 'not_found', publicPath, outputFile };
    try {
        fs.unlinkSync(outputFile);
        return { deleted: true, publicPath, outputFile };
    } catch (err) {
        return { deleted: false, reason: 'delete_failed', publicPath, outputFile, error: err.message };
    }
}

async function generateProductCardThumbnail(product) {
    const publicPath = cardImagePublicPath(product);
    const outputFile = resolvePublicPathToFile(publicPath);
    if (!publicPath || !outputFile) {
        return { ok: false, reason: 'invalid_product', productId: product && product.id };
    }

    const sourcePath = normalizePublicPath(product && (product.cover_image || product.image || product.path));
    if (!sourcePath) {
        deleteProductCardThumbnail(product);
        return { ok: false, reason: 'empty_cover', productId: product && product.id, publicPath };
    }

    const sourceFile = resolvePublicPathToFile(sourcePath);
    if (!sourceFile || !fs.existsSync(sourceFile)) {
        deleteProductCardThumbnail(product);
        return { ok: false, reason: 'missing_file', productId: product && product.id, sourcePath, publicPath };
    }

    const raw = await sharp(sourceFile, { animated: false, limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const sourceSize = { width: raw.info.width, height: raw.info.height };
    const bounds = detectSubjectBounds(raw.data, raw.info.width, raw.info.height, raw.info.channels);
    const fillRatio = bounds ? (bounds.width * bounds.height) / (raw.info.width * raw.info.height) : 0;
    const risk = classifySubject(fillRatio, bounds);
    const cropBox = bounds && risk === 'safe_auto'
        ? expandBounds(bounds, sourceSize)
        : { left: 0, top: 0, width: sourceSize.width, height: sourceSize.height };
    const limits = scaledLimits(product, cropBox);

    const resized = await sharp(sourceFile, { animated: false, limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .extract(cropBox)
        .flatten({ background: WHITE })
        .resize({
            width: limits.width,
            height: limits.height,
            fit: 'inside',
            withoutEnlargement: false
        })
        .png()
        .toBuffer({ resolveWithObject: true });

    const left = Math.max(0, Math.round((CANVAS_WIDTH - resized.info.width) / 2));
    const top = Math.max(0, Math.round((CANVAS_HEIGHT - resized.info.height) / 2));

    ensureDirectory(path.dirname(outputFile));
    await sharp({
        create: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            channels: 3,
            background: WHITE
        }
    })
        .composite([{ input: resized.data, left, top }])
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputFile);

    return {
        ok: true,
        productId: product && product.id,
        sourcePath,
        publicPath,
        outputFile,
        action: risk === 'safe_auto' ? 'generated_cropped' : 'generated_conservative',
        risk,
        sourceSize,
        cropBox: {
            x: cropBox.left,
            y: cropBox.top,
            width: cropBox.width,
            height: cropBox.height
        },
        subjectFillRatio: Number(fillRatio.toFixed(4)),
        canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        renderedSize: { width: resized.info.width, height: resized.info.height }
    };
}

function logThumbnailFailure(product, err) {
    console.warn('[product-card-thumbnail] failed', {
        productId: product && product.id,
        slug: product && product.slug,
        coverImage: product && product.cover_image,
        message: err && err.message ? err.message : String(err)
    });
}

function queueProductCardThumbnail(product) {
    const key = String((product && product.id) || cardImageSlug(product));
    if (!key) return;
    pendingJobs.set(key, product);
    if (runningJobs.has(key)) return;

    setImmediate(async function runQueuedProductCardThumbnail() {
        runningJobs.add(key);
        try {
            while (pendingJobs.has(key)) {
                const latest = pendingJobs.get(key);
                pendingJobs.delete(key);
                try {
                    const result = await generateProductCardThumbnail(latest);
                    if (!result.ok && result.reason !== 'empty_cover') {
                        logThumbnailFailure(latest, new Error(result.reason || 'unknown failure'));
                    }
                } catch (err) {
                    logThumbnailFailure(latest, err);
                }
            }
        } finally {
            runningJobs.delete(key);
        }
    });
}

module.exports = {
    CARD_IMAGE_DIR,
    cardImagePublicPath,
    cardImageSlug,
    deleteProductCardThumbnail,
    detectSubjectBounds,
    generateProductCardThumbnail,
    queueProductCardThumbnail,
    resolvePublicPathToFile
};
