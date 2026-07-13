require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const productGalleryThumbnailRoutes = require('./routes/product-gallery-thumbnails');
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
const { renderProductDetailSeoHtml } = require('./lib/productDetailSeoRenderer');
const { readPublicContentBlock, localizePublicContentBlock } = require('./lib/publicContentBlocks');
const { readPublicCompanyView } = require('./lib/publicCompanyView');
const { renderGlobalShellHtml } = require('./lib/globalShellHtmlRenderer');
const { createRuntimePublicSiteDataSource } = require('./lib/publicSiteDataSource');
const { renderContentPageHtml } = require('./lib/contentPageHtmlRenderer');
const { renderProductListHtml } = require('./lib/productListHtmlRenderer');
const { renderProductDetailBodyHtml } = require('./lib/productDetailHtmlRenderer');
const {
    staticSeoRouteDefinitions,
    renderStaticPageSeoHtml
} = require('./lib/staticPageSeoRenderer');
const {
    resolveLegacyProductRedirect,
    localizedLegacyProductPath
} = require('./lib/legacyProductRedirect');
const { buildSitemap } = require('../scripts/generate-sitemap');
const {
    localeForRequestPath,
    localizedHtmlShellPath,
    baseHrefForLocale,
    notFoundShellForRequestPath,
    productDetailRoutePatterns
} = require('./lib/i18nRoutes');

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
const publicSiteDataSource = createRuntimePublicSiteDataSource();
const CONTENT_PAGE_SLUGS = Object.freeze({
    '/': 'home',
    '/about.html': 'about-us',
    '/solutions.html': 'solutions',
    '/contact.html': 'contact'
});
const SEO_CONTENT_PAGE_SLUGS = Object.freeze({
    '/': 'home',
    '/about.html': 'about-us',
    '/solutions.html': 'solutions',
    '/education.html': 'education',
    '/certifications.html': 'certifications',
    '/compare.html': 'compare',
    '/contact.html': 'contact'
});

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
app.use('/media/product-gallery', productGalleryThumbnailRoutes);

try {
    ensureContentBlockSeeds(getDb());
} catch (err) {
    console.warn('WARNING: failed to ensure content block seeds: ' + err.message);
}

app.use(function (req, res, next) {
    const blocked = /^\/(?:data|server|scripts|tests|docs|logs|backups|node_modules|chanpince|\.tmp)(?:\/|$)|^\/package(?:-lock)?\.json$/i;
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

function sendHtmlString(res, html, statusCode) {
    res.status(statusCode || 200);
    res.type('html');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(html);
}

function requestOrigin(req) {
    const host = String(req.get('host') || '').toLowerCase().split(':')[0];
    if (host === 'www.lxenelectric.com' || host === 'lxenelectric.com') {
        return 'https://www.lxenelectric.com';
    }
    const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const requestHost = req.get('host') || '127.0.0.1:' + PORT;
    return protocol + '://' + requestHost;
}

function renderPublicShell(html, locale, pathname) {
    const shell = localizePublicContentBlock(readPublicContentBlock('global-shell'), locale.code || locale);
    return renderGlobalShellHtml(html, {
        locale: locale.code || locale,
        pathname,
        shell,
        company: readPublicCompanyView()
    });
}

staticSeoRouteDefinitions().forEach(function (route) {
    const requestPaths = [route.path];
    if (route.basePath === '/') {
        requestPaths.push(route.locale.pathPrefix ? route.locale.pathPrefix + '/' : '/index.html');
    }
    app.get(requestPaths, function (req, res, next) {
        fs.readFile(route.filePath, 'utf8', function (err, html) {
            if (err) return next(err);
            try {
                const contentSlug = CONTENT_PAGE_SLUGS[route.basePath];
                const seoContentSlug = SEO_CONTENT_PAGE_SLUGS[route.basePath];
                const seoContentBlock = seoContentSlug
                    ? publicSiteDataSource.readContentBlock(seoContentSlug)
                    : null;
                const withContent = contentSlug
                    ? renderContentPageHtml(html, {
                        slug: contentSlug,
                        locale: route.locale,
                        block: seoContentBlock
                    })
                    : html;
                const withShell = renderPublicShell(withContent, route.locale, req.path);
                const rendered = renderStaticPageSeoHtml(withShell, Object.assign({}, route, {
                    schemaVersion: seoContentBlock && seoContentBlock.version || 0,
                    schemaContentBlock: seoContentBlock
                }), requestOrigin(req));
                sendHtmlString(res, rendered, 200);
            } catch (renderErr) {
                next(renderErr);
            }
        });
    });
});

function sendNotFoundShell(req, res, next) {
    const shell = notFoundShellForRequestPath(req.path);
    fs.readFile(shell.filePath, 'utf8', function (err, html) {
        if (err) return next(err);
        const locale = localeForRequestPath(req.path);
        const withBase = html.replace(/<head>/i, '<head>\n    <base href="' + shell.baseHref + '">');
        sendHtmlString(res, renderPublicShell(withBase, locale, req.path), 404);
    });
}

function sendProductDetailShell(req, res, next) {
    const locale = localeForRequestPath(req.path);
    const filePath = localizedHtmlShellPath('product-detail.html', locale);
    const identifier = String(req.params.slug || '').trim();
    let product = null;
    try {
        product = identifier ? publicSiteDataSource.readProduct(identifier) : null;
        if (!product) {
            return sendNotFoundShell(req, res, next);
        }
    } catch (err) {
        return next(err);
    }
    fs.readFile(filePath, 'utf8', function (err, html) {
        if (err) return next(err);
        const withBase = html.replace(/<head>/i, '<head>\n    <base href="' + baseHrefForLocale(locale) + '">');
        const contentBlock = publicSiteDataSource.readContentBlock('product-pages');
        const withSeo = renderProductDetailSeoHtml(withBase, product, locale, requestOrigin(req));
        const withBody = renderProductDetailBodyHtml(withSeo, {
            locale,
            product,
            products: publicSiteDataSource.readProducts(),
            contentBlock
        });
        const withShell = renderPublicShell(withBody, locale, req.path);
        sendHtmlString(res, withShell, 200);
    });
}

app.get(productDetailRoutePatterns(), sendProductDetailShell);

function sendLegacyProductRedirect(req, res, next) {
    const resolved = resolveLegacyProductRedirect(req.query && req.query.id);
    if (!resolved) return sendNotFoundShell(req, res, next);
    const locale = localeForRequestPath(req.path);
    const targetPath = localizedLegacyProductPath(resolved.targetIdentifier, locale);
    res.redirect(301, targetPath);
}

app.get(/^\/(?:ar\/|fr\/|ru\/)?product-detail\.html$/, sendLegacyProductRedirect);

function hasProductFilterQuery(req) {
    return ['group', 'sub', 'search', 'page'].some(function (key) {
        return Object.prototype.hasOwnProperty.call(req.query || {}, key);
    });
}

function sendProductListShell(req, res, next) {
    const locale = localeForRequestPath(req.path);
    const filePath = localizedHtmlShellPath('products.html', locale);

    fs.readFile(filePath, 'utf8', function (err, html) {
        if (err) return next(err);
        const robots = hasProductFilterQuery(req) ? '\n    <meta name="robots" content="noindex,follow">' : '';
        const withBase = html.replace(/<head>/i,
            '<head>\n    <base href="' + baseHrefForLocale(locale) + '">' + robots);
        const withProducts = renderProductListHtml(withBase, {
            locale,
            products: publicSiteDataSource.readProducts(),
            taxonomy: publicSiteDataSource.readProductCategories(),
            query: req.query || {},
            contentBlock: publicSiteDataSource.readContentBlock('product-pages'),
            requireSeoSchema: true
        });
        sendHtmlString(res, renderPublicShell(withProducts, locale, req.path), 200);
    });
}

app.get(/^\/(?:ar\/|fr\/|ru\/)?products\.html$/, sendProductListShell);

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
