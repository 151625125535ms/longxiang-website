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

async function createExternalUploadImage(uploadDir, filename) {
    fs.mkdirSync(uploadDir, { recursive: true });
    await sharp({
        create: {
            width: 360,
            height: 260,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    })
        .composite([
            {
                input: Buffer.from(
                    '<svg width="180" height="150" xmlns="http://www.w3.org/2000/svg">' +
                    '<rect x="0" y="0" width="180" height="150" rx="10" fill="#1492d0"/>' +
                    '<circle cx="90" cy="76" r="44" fill="#ffffff" opacity="0.24"/>' +
                    '</svg>'
                ),
                left: 90,
                top: 55
            }
        ])
        .png()
        .toFile(path.join(uploadDir, filename));
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

    const previousUploadDir = process.env.UPLOAD_DIR;
    const previousUploadPublicPath = process.env.UPLOAD_PUBLIC_PATH;
    const externalUploadDir = path.join(TMP_DIR, 'external-uploads');
    const externalUploadFilename = 'product-card-thumbnail-upload-dir.png';
    const externalProduct = {
        ...TEST_PRODUCT,
        id: 999002,
        slug: 'test-card-thumbnail-upload-dir',
        legacy_id: 'test-card-thumbnail-upload-dir',
        cover_image: 'uploads/' + externalUploadFilename,
        updated_at: Date.now()
    };
    process.env.UPLOAD_DIR = externalUploadDir;
    process.env.UPLOAD_PUBLIC_PATH = 'uploads';
    await createExternalUploadImage(externalUploadDir, externalUploadFilename);
    deleteProductCardThumbnail(externalProduct);
    const externalResult = await generateProductCardThumbnail(externalProduct);
    assert.strictEqual(externalResult.ok, true, 'external UPLOAD_DIR image should generate successfully');
    assert.ok(fs.existsSync(path.join(ROOT, externalResult.publicPath)), 'external upload thumbnail should exist');
    let externalRemoved = deleteProductCardThumbnail(externalProduct);
    if (!externalRemoved.deleted && externalRemoved.reason === 'delete_failed') {
        await new Promise(resolve => setTimeout(resolve, 250));
        externalRemoved = deleteProductCardThumbnail(externalProduct);
    }
    assert.strictEqual(externalRemoved.deleted, true, 'external upload thumbnail should be deleted');
    if (previousUploadDir == null) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousUploadDir;
    if (previousUploadPublicPath == null) delete process.env.UPLOAD_PUBLIC_PATH;
    else process.env.UPLOAD_PUBLIC_PATH = previousUploadPublicPath;

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
