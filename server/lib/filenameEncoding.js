function readableScore(value) {
    const text = String(value || '');
    let score = 0;
    for (const char of text) {
        const code = char.charCodeAt(0);
        if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x0600 && code <= 0x06ff)) {
            score += 4;
        } else if (code >= 0x20 && code <= 0x7e) {
            score += 1;
        } else if (code >= 0x80 && code <= 0x9f) {
            score -= 6;
        } else if (char === '\ufffd') {
            score -= 10;
        } else {
            score += 0;
        }
    }
    return score;
}

function hasLikelyMojibake(value) {
    return /[\u0080-\u009f]/.test(value) || /[ÃÂÄÅÆÇÈÉåæçèé]/.test(value);
}

function normalizeUploadedFilename(value) {
    const original = String(value || '').trim();
    if (!original || !hasLikelyMojibake(original)) return original;

    const decoded = Buffer.from(original, 'latin1').toString('utf8');
    if (!decoded || decoded.indexOf('\ufffd') !== -1) return original;

    return readableScore(decoded) > readableScore(original) + 2 ? decoded : original;
}

module.exports = { normalizeUploadedFilename };
