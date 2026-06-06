const express = require('express');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readJson, writeJson, makeId } = require('../lib/fileStore');

let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    nodemailer = null;
}

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'inquiries.json');
const COMPANY_FILE = path.join(__dirname, '..', '..', 'data', 'company.json');
const STATUSES = ['new', 'read', 'replied', 'closed'];

function readInquiries() {
    return readJson(DATA_FILE, []);
}

function writeInquiries(inquiries) {
    writeJson(DATA_FILE, inquiries);
}

function normalizeInquiry(body) {
    return {
        name: String(body.name || '').trim(),
        email: String(body.email || '').trim(),
        company: String(body.company || '').trim(),
        phone: String(body.phone || '').trim(),
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

function getNotifyTarget() {
    if (process.env.INQUIRY_NOTIFY_TO) return process.env.INQUIRY_NOTIFY_TO;
    try {
        const company = readJson(COMPANY_FILE, {});
        return company.email || '';
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

router.post('/', async (req, res) => {
    try {
        const normalized = normalizeInquiry(req.body || {});
        const errors = validateInquiry(normalized);
        if (errors.length) {
            return res.status(400).json({ error: errors.join(' ') });
        }

        const inquiries = readInquiries();
        const inquiry = {
            id: makeId('inq'),
            ...normalized,
            ip: getClientIp(req),
            createdAt: new Date().toISOString(),
            status: 'new',
            repliedAt: '',
            notes: ''
        };

        inquiries.unshift(inquiry);
        writeInquiries(inquiries);

        let notification = { sent: false, reason: 'not_attempted' };
        try {
            notification = await sendNotification(inquiry);
        } catch (err) {
            notification = { sent: false, reason: err.message };
        }

        res.status(201).json({
            message: 'Inquiry submitted successfully.',
            inquiry: { id: inquiry.id, createdAt: inquiry.createdAt, status: inquiry.status },
            notification
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit inquiry.' });
    }
});

router.get('/', authMiddleware, (req, res) => {
    try {
        let inquiries = readInquiries();
        const status = String(req.query.status || '').trim();
        if (status && STATUSES.includes(status)) {
            inquiries = inquiries.filter(item => item.status === status);
        }

        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '50', 10), 1), 200);
        const total = inquiries.length;
        const start = (page - 1) * pageSize;
        const items = inquiries.slice(start, start + pageSize);

        res.json({ items, total, page, pageSize });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read inquiries.' });
    }
});

router.get('/:id', authMiddleware, (req, res) => {
    try {
        const inquiry = readInquiries().find(item => item.id === req.params.id);
        if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
        res.json(inquiry);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read inquiry.' });
    }
});

router.put('/:id', authMiddleware, (req, res) => {
    try {
        const inquiries = readInquiries();
        const index = inquiries.findIndex(item => item.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Inquiry not found.' });

        const nextStatus = String(req.body.status || inquiries[index].status).trim();
        if (!STATUSES.includes(nextStatus)) {
            return res.status(400).json({ error: 'Invalid inquiry status.' });
        }

        inquiries[index] = {
            ...inquiries[index],
            status: nextStatus,
            notes: typeof req.body.notes === 'string' ? req.body.notes : inquiries[index].notes,
            repliedAt: nextStatus === 'replied' && !inquiries[index].repliedAt ? new Date().toISOString() : inquiries[index].repliedAt
        };

        writeInquiries(inquiries);
        res.json(inquiries[index]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update inquiry.' });
    }
});

router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const inquiries = readInquiries();
        const index = inquiries.findIndex(item => item.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Inquiry not found.' });

        const deleted = inquiries.splice(index, 1)[0];
        writeInquiries(inquiries);
        res.json({ message: 'Inquiry deleted.', inquiry: deleted });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete inquiry.' });
    }
});

module.exports = router;
