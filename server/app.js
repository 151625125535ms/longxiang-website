require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const companyRoutes = require('./routes/company');
const inquiriesRoutes = require('./routes/inquiries');
const certificationsRoutes = require('./routes/certifications');
const categoriesRoutes = require('./routes/categories');

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

// Only trust proxy XFF headers when explicitly configured — avoids IP spoofing for rate limiting.
// Set TRUST_PROXY to the upstream proxy IP/CIDR (e.g. "10.0.0.0/8") or "1" for loopback-only.
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY);
}

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(function (o) { return o.trim(); })
    : null;

if (compression) app.use(compression());
if (helmet) app.use(helmet({ contentSecurityPolicy: false }));
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

app.use(express.static(path.join(__dirname, '..'), {
    maxAge: '7d',
    setHeaders: function (res, filePath) {
        if (/\.(html|json|xml|txt)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=300');
        }
    }
}));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '30d' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/certifications', certificationsRoutes);

app.use('/api', function (req, res) {
    res.status(404).json({ error: 'API endpoint not found.' });
});

app.use(function (req, res) {
    res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
});

app.listen(PORT, function () {
    console.log('Server running on http://localhost:' + PORT);
});
