const express = require('express');
const { getDb } = require('../lib/db');

let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    nodemailer = null;
}

const router = express.Router();

function normalizeInquiry(body) {
    return {
        name: String(body.name || '').trim(),
        email: String(body.email || '').trim(),
        company: String(body.company || '').trim(),
        phone: String(body.phone || '').trim(),
        country: String(body.country || '').trim(),
        productType: String(body.productType || '').trim(),
        quantityOrScale: String(body.quantityOrScale || '').trim(),
        requiredVoltageOrCapacity: String(body.requiredVoltageOrCapacity || '').trim(),
        productContext: String(body.productContext || '').trim(),
        subject: String(body.subject || '').trim(),
        message: String(body.message || '').trim()
    };
}

function validateInquiry(inquiry) {
    const errors = [];
    if (!inquiry.name) errors.push('Name is required.');
    if (!inquiry.email) errors.push('Email is required.');
    if (inquiry.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) errors.push('Email format is invalid.');
    if (!inquiry.subject) errors.push('Subject is required.');
    if (!inquiry.message) errors.push('Message is required.');
    return errors;
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '';
}

function parseJson(value, fallback) {
    try {
        return JSON.parse(value || '');
    } catch (err) {
        return fallback;
    }
}

function findEmail(value) {
    if (!value || typeof value !== 'object') return '';
    const candidates = [
        value.email,
        value.contactEmail,
        value.inquiryEmail,
        value.salesEmail
    ];
    for (const candidate of candidates) {
        if (candidate) return String(candidate).trim();
    }
    if (Array.isArray(value.emails) && value.emails[0]) return String(value.emails[0]).trim();
    if (Array.isArray(value.contacts)) {
        for (const item of value.contacts) {
            const email = findEmail(item);
            if (email) return email;
        }
    }
    return '';
}

function getNotifyTarget() {
    if (process.env.INQUIRY_NOTIFY_TO) return process.env.INQUIRY_NOTIFY_TO;

    try {
        const row = getDb()
            .prepare("SELECT body_json FROM content_blocks WHERE slug = 'contact'")
            .get();
        return row ? findEmail(parseJson(row.body_json, {})) : '';
    } catch (err) {
        return '';
    }
}

async function sendNotification(inquiry) {
    if (!nodemailer) {
        return { sent: false, reason: 'nodemailer_not_installed' };
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const to = getNotifyTarget();
    if (!host || !user || !pass || !to) {
        return { sent: false, reason: 'smtp_not_configured' };
    }

    const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: { user, pass }
    });

    const subjectLabel = inquiry.subject || 'New inquiry';
    await transporter.sendMail({
        from: process.env.SMTP_FROM || user,
        to,
        subject: '[Longxiang Website] ' + subjectLabel,
        text: [
            'A new inquiry was submitted from the website.',
            '',
            'Name: ' + inquiry.name,
            'Email: ' + inquiry.email,
            'Company: ' + (inquiry.company || '-'),
            'WhatsApp / Phone: ' + (inquiry.phone || '-'),
            'Country: ' + (inquiry.country || '-'),
            'Product Type: ' + (inquiry.productType || '-'),
            'Quantity / Project Scale: ' + (inquiry.quantityOrScale || '-'),
            'Required Voltage / Capacity: ' + (inquiry.requiredVoltageOrCapacity || '-'),
            'Interested Product: ' + (inquiry.productContext || '-'),
            'Subject: ' + inquiry.subject,
            'Message:',
            inquiry.message,
            '',
            'IP: ' + inquiry.ip,
            'Created at: ' + inquiry.createdAt
        ].join('\n')
    });

    return { sent: true };
}

function sendGone(res) {
    return res.status(410).json({
        ok: false,
        error: {
            code: 'GONE',
            message: 'Legacy JSON inquiry management is disabled. Use /api/admin/inquiries.'
        }
    });
}

router.post('/', async function (req, res) {
    try {
        const normalized = normalizeInquiry(req.body || {});
        const errors = validateInquiry(normalized);
        if (errors.length) {
            return res.status(400).json({ error: errors.join(' ') });
        }

        const now = Date.now();
        const ip = req.ip || getClientIp(req);
        const userAgent = String(req.headers['user-agent'] || '');
        const result = getDb().prepare(`
            INSERT INTO inquiries
                (
                    legacy_id, name, email, company, phone, subject, message,
                    product_context, status, is_read, notes, ip, user_agent,
                    replied_at, deleted_at, created_at, updated_at
                )
            VALUES
                (
                    NULL, @name, @email, @company, @phone, @subject, @message,
                    @product_context, 'new', 0, '', @ip, @user_agent,
                    NULL, NULL, @created_at, @updated_at
                )
        `).run({
            name: normalized.name,
            email: normalized.email,
            company: normalized.company,
            phone: normalized.phone,
            subject: normalized.subject,
            message: normalized.message,
            product_context: normalized.productContext,
            ip,
            user_agent: userAgent,
            created_at: now,
            updated_at: now
        });

        const createdAt = new Date(now).toISOString();
        const inquiry = {
            id: String(result.lastInsertRowid),
            createdAt,
            status: 'new'
        };

        let notification = { sent: false, reason: 'not_attempted' };
        try {
            notification = await sendNotification({
                ...normalized,
                ip,
                createdAt
            });
        } catch (err) {
            notification = { sent: false, reason: err.message };
        }

        res.status(201).json({
            message: 'Inquiry submitted successfully.',
            inquiry,
            notification
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit inquiry.' });
    }
});

router.get('/', function (req, res) {
    return sendGone(res);
});

router.get('/:id', function (req, res) {
    return sendGone(res);
});

router.put('/:id', function (req, res) {
    return sendGone(res);
});

router.delete('/:id', function (req, res) {
    return sendGone(res);
});

module.exports = router;
