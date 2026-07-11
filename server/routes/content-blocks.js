const express = require('express');
const { readPublicContentBlock, PUBLIC_SLUGS } = require('../lib/publicContentBlocks');

const router = express.Router();

router.get('/:slug', function (req, res) {
    const slug = String(req.params.slug || '').trim();
    if (!PUBLIC_SLUGS.has(slug)) {
        return res.status(404).json({ error: 'Content block not found.' });
    }

    try {
        const block = readPublicContentBlock(slug);
        if (!block) return res.status(404).json({ error: 'Content block not found.' });
        res.json(block);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read content block.' });
    }
});

module.exports = router;
