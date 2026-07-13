'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

sharp.cache(false);

const ROOT = path.join(__dirname, '..');
const TEST_ROOT = path.join(ROOT, '.tmp', 'product-gallery-thumbnail-test-' + process.pid + '-' + Date.now());
const UPLOAD_DIR = path.join(TEST_ROOT, 'uploads');
const SOURCE_PUBLIC_PATH = 'uploads/source.png';
const SOURCE_FILE = path.join(UPLOAD_DIR, 'source.png');

process.env.UPLOAD_DIR = UPLOAD_DIR;
process.env.UPLOAD_PUBLIC_PATH = 'uploads';

const {
    HEIGHT,
    WIDTH,
    ensureProductGalleryThumbnail,
    productGalleryThumbnailUrl
} = require('../server/lib/productGalleryThumbnail');

async function writeLargeFixture() {
    const width = 1600;
    const height = 1200;
    await sharp(crypto.randomBytes(width * height * 3), {
        raw: { width, height, channels: 3 }
    }).png().toFile(SOURCE_FILE);
}

async function main() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    try {
        await writeLargeFixture();
        const sourceBytes = fs.statSync(SOURCE_FILE).size;
        const first = await ensureProductGalleryThumbnail(SOURCE_PUBLIC_PATH);
        assert(fs.existsSync(first.outputFile));
        const metadata = await sharp(first.outputFile).metadata();
        assert.strictEqual(metadata.format, 'webp');
        assert.strictEqual(metadata.width, WIDTH);
        assert.strictEqual(metadata.height, HEIGHT);
        assert(fs.statSync(first.outputFile).size < sourceBytes);

        const repeated = await ensureProductGalleryThumbnail(SOURCE_PUBLIC_PATH);
        assert.strictEqual(repeated.outputFile, first.outputFile);
        assert.strictEqual(
            productGalleryThumbnailUrl('sample-product', 1, SOURCE_PUBLIC_PATH, 42),
            '/media/product-gallery/sample-product/1.webp?v=42'
        );

        const changedTime = new Date(Date.now() + 2000);
        fs.utimesSync(SOURCE_FILE, changedTime, changedTime);
        const changed = await ensureProductGalleryThumbnail(SOURCE_PUBLIC_PATH);
        assert.notStrictEqual(changed.outputFile, first.outputFile);
        assert(fs.existsSync(changed.outputFile));
        console.log('Product gallery thumbnail tests passed.');
    } finally {
        fs.rmSync(TEST_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

main().catch(function (err) {
    console.error(err.stack || err.message);
    process.exit(1);
});
