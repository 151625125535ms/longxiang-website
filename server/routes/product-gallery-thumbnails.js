'use strict';

const express = require('express');
const { readPublicProduct } = require('../lib/publicProducts');
const { ensureProductGalleryThumbnail } = require('../lib/productGalleryThumbnail');

const router = express.Router();

router.get('/:identifier/:file', async function (req, res, next) {
    const match = String(req.params.file || '').match(/^(\d+)\.webp$/);
    if (!match) return res.status(404).end();
    const index = Number(match[1]);
    if (!Number.isInteger(index) || index < 0 || index > 6) return res.status(404).end();

    try {
        const product = readPublicProduct(req.params.identifier);
        const image = product && Array.isArray(product.images) ? product.images[index] : null;
        if (!image || !image.src) return res.status(404).end();
        const thumbnail = await ensureProductGalleryThumbnail(image.src);
        res.type('image/webp');
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(thumbnail.outputFile);
    } catch (err) {
        if (err && (err.code === 'ENOENT' || err.code === 'GALLERY_IMAGE_NOT_FOUND' || err.code === 'INVALID_GALLERY_IMAGE_PATH')) {
            return res.status(404).end();
        }
        return next(err);
    }
});

module.exports = router;
