const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
    cardImagePublicPath,
    deleteProductCardThumbnail,
    generateProductCardThumbnail
} = require('../server/lib/productCardThumbnail');

const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const TMP_DIR = path.join(ROOT, '.tmp');
const SOURCE_PUBLIC_PATH = '.tmp/product-card-thumbnail-test-source.png';
const SOURCE_FILE = path.join(ROOT, SOURCE_PUBLIC_PATH);
const TEST_PRODUCT = {
    id: 999001,
    slug: 'test-card-thumbnail',
    legacy_id: 'test-card-thumbnail',
    name_en: 'Test Card Thumbnail',
    cover_image: SOURCE_PUBLIC_PATH,
    updated_at: Date.now()
};

async function createSourceImage() {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    await sharp({
        create: {
            width: 400,
            height: 300,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
    })
        .composite([
            {
                input: Buffer.from(
                    '<svg width="180" height="160" xmlns="http://www.w3.org/2000/svg">' +
                    '<rect x="0" y="0" width="180" height="160" rx="8" fill="#d83232"/>' +
                    '<rect x="44" y="30" width="92" height="100" fill="#ffffff" opacity="0.18"/>' +
                    '</svg>'
                ),
                left: 110,
                top: 70
            }
        ])
        .png()
        .toFile(SOURCE_FILE);
}

async function main() {
    await createSourceImage();
    deleteProductCardThumbnail(TEST_PRODUCT);

    const result = await generateProductCardThumbnail(TEST_PRODUCT);
    assert.strictEqual(result.ok, true, 'single product thumbnail should generate successfully');
    assert.strictEqual(result.publicPath, 'assets/optimized/product-cards/test-card-thumbnail.webp');
    assert.strictEqual(result.canvasSize.width, 960);
    assert.strictEqual(result.canvasSize.height, 720);
    assert.ok(fs.existsSync(path.join(ROOT, result.publicPath)), 'thumbnail file should exist');

    const outputBuffer = fs.readFileSync(path.join(ROOT, result.publicPath));
    const metadata = await sharp(outputBuffer).metadata();
    assert.strictEqual(metadata.format, 'webp');
    assert.strictEqual(metadata.width, 960);
    assert.strictEqual(metadata.height, 720);

    const missing = await generateProductCardThumbnail({
        ...TEST_PRODUCT,
        slug: 'missing-card-thumbnail',
        cover_image: 'uploads/does-not-exist-for-card-thumbnail.png'
    });
    assert.strictEqual(missing.ok, false, 'missing source should not throw or block product save');
    assert.strictEqual(missing.reason, 'missing_file');

    await new Promise(resolve => setTimeout(resolve, 100));
    let removed = deleteProductCardThumbnail(TEST_PRODUCT);
    if (!removed.deleted && removed.reason === 'delete_failed') {
        await new Promise(resolve => setTimeout(resolve, 250));
        removed = deleteProductCardThumbnail(TEST_PRODUCT);
    }
    assert.strictEqual(removed.deleted, true, 'delete should remove generated thumbnail');
    assert.ok(!fs.existsSync(path.join(ROOT, result.publicPath)), 'thumbnail should be deleted');
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
