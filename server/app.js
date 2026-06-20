require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const productCategoriesRoutes = require('./routes/product-categories');
const companyRoutes = require('./routes/company');
const inquiriesRoutes = require('./routes/inquiries');
const certificationsRoutes = require('./routes/certifications');
const educationRoutes = require('./routes/education');
const contentBlocksRoutes = require('./routes/content-blocks');
const adminRoutes = require('./routes/admin/index');
const { ensureDirectory, resolveUploadDir } = require('./lib/fileStore');
const { getDb } = require('./lib/db');
const { ensureContentBlockSeeds } = require('./lib/contentBlockSeeds');
const { buildSitemap } = require('../scripts/generate-sitemap');

let compression = null;
try { compression = require('compression'); } catch (err) { compression = null; }

let helmet = null;
try { helmet = require('helmet'); } catch (err) { helmet = null; console.warn('WARNING: helmet not found. Security headers will not be set.'); }

let morgan = null;
try { morgan = require('morgan'); } catch (err) { morgan = null; console.warn('WARNING: morgan not found. HTTP request logging is disabled.'); }

let rateLimit = null;
try { rateLimit = require('express-rate-limit'); } catch (err) { rateLimit = null; console.warn('WARNING: express-rate-limit not found. Rate limiting is disabled.'); }

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Only trust proxy XFF headers when explicitly configured — avoids IP spoofing for rate limiting.
// Set TRUST_PROXY to the upstream proxy IP/CIDR (e.g. "10.0.0.0/8") or "1" for loopback-only.
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY);
}

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(function (o) { return o.trim(); })
    : null;

if (compression) app.use(compression());
if (helmet) {
    const cspDirectives = {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        scriptSrc: [
            "'self'",
            'https://www.googletagmanager.com'
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com'
        ],
        fontSrc: [
            "'self'",
            'https://fonts.gstatic.com',
            'data:'
        ],
        imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://www.google.com',
            'https://maps.gstatic.com',
            'https://*.googleusercontent.com',
            'https://www.google-analytics.com'
        ],
        connectSrc: [
            "'self'",
            'https://www.google-analytics.com',
            'https://region1.google-analytics.com',
            'https://stats.g.doubleclick.net'
        ],
        frameSrc: [
            "'self'",
            'https://www.youtube.com',
            'https://www.google.com'
        ],
        formAction: ["'self'"]
    };

    if (process.env.NODE_ENV === 'production') {
        cspDirectives.upgradeInsecureRequests = [];
    }

    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            reportOnly: true,
            directives: cspDirectives
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));
}
if (morgan) app.use(morgan('combined'));

app.use(cors({
    origin: ALLOWED_ORIGINS
        ? function (origin, callback) {
            if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) return callback(null, true);
            callback(new Error('CORS: origin not allowed'));
        }
        : true
}));

app.use(express.json());

app.use('/api', function (req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

if (rateLimit) {
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many login attempts. Please try again later.' }
    });
    app.use('/api/auth/login', loginLimiter);

    const apiLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests. Please slow down.' }
    });
    app.use('/api', apiLimiter);
}

const uploadDir = resolveUploadDir();
ensureDirectory(uploadDir);
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', fallthrough: false }));

try {
    ensureContentBlockSeeds(getDb());
} catch (err) {
    console.warn('WARNING: failed to ensure content block seeds: ' + err.message);
}

app.use(function (req, res, next) {
    const blocked = /^\/(?:data|server|scripts|logs|backups|node_modules)(?:\/|$)|^\/package(?:-lock)?\.json$/i;
    if (blocked.test(req.path)) {
        return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }
    next();
});

app.get('/sitemap.xml', function (req, res, next) {
    try {
        res.type('application/xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(buildSitemap());
    } catch (err) {
        next(err);
    }
});

function parseJsonArray(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function activeProductExists(identifier) {
    const db = getDb();
    const direct = db.prepare(`
        SELECT p.id
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
            AND (p.slug = ? OR p.legacy_id = ?)
        LIMIT 1
    `).get(identifier, identifier);
    if (direct) return true;

    const rows = db.prepare(`
        SELECT p.aliases_json
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE p.status = 'published'
            AND p.category_id IS NOT NULL
            AND c.id IS NOT NULL
            AND c.is_active = 1
            AND (c.parent_id IS NULL OR parent.is_active = 1)
            AND p.aliases_json IS NOT NULL
            AND p.aliases_json != ''
    `).all();

    return rows.some(function (row) {
        return parseJsonArray(row.aliases_json).indexOf(identifier) !== -1;
    });
}

function sendHtmlShell(res, next, filePath, baseHref, statusCode) {
    fs.readFile(filePath, 'utf8', function (err, html) {
        if (err) return next(err);
        const withBase = html.replace(/<head>/i, '<head>\n    <base href="' + baseHref + '">');
        res.status(statusCode || 200);
        res.type('html');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(withBase);
    });
}

function sendNotFoundShell(req, res, next) {
    const isArabic = req.path.indexOf('/ar/') === 0 || req.path === '/ar';
    const filePath = path.join(__dirname, '..', isArabic ? 'ar/404.html' : '404.html');
    sendHtmlShell(res, next, filePath, isArabic ? '/ar/' : '/', 404);
}

function sendProductDetailShell(req, res, next) {
    const isArabicProduct = req.path.indexOf('/ar/') === 0;
    const filePath = path.join(__dirname, '..', isArabicProduct ? 'ar/product-detail.html' : 'product-detail.html');
    const identifier = String(req.params.slug || '').trim();
    try {
        if (!identifier || !activeProductExists(identifier)) {
            return sendNotFoundShell(req, res, next);
        }
    } catch (err) {
        return next(err);
    }
    sendHtmlShell(res, next, filePath, isArabicProduct ? '/ar/' : '/', 200);
}

app.get(['/products/:slug', '/ar/products/:slug'], sendProductDetailShell);

app.use(express.static(path.join(__dirname, '..'), {
    maxAge: '7d',
    setHeaders: function (res, filePath) {
        if (/\.(html|json|xml|txt)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=300');
        } else if (/\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        }
    }
}));

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/product-categories', productCategoriesRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/certifications', certificationsRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/content-blocks', contentBlocksRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', function (req, res) {
    const sqlite = {
        enabled: true,
        available: false,
        schemaVersion: null
    };

    try {
        const row = getDb()
            .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
            .get();
        sqlite.available = true;
        sqlite.schemaVersion = row ? row.version : null;
    } catch (err) {
        sqlite.available = false;
        sqlite.schemaVersion = null;
    }

    res.json({
        ok: true,
        service: 'longxiang-website',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        sqlite
    });
});

app.use('/api', function (req, res) {
    res.status(404).json({ error: 'API endpoint not found.' });
});

app.use(function (req, res, next) {
    sendNotFoundShell(req, res, next);
});

app.listen(PORT, HOST, function () {
    console.log('Server running on http://' + HOST + ':' + PORT);
});
