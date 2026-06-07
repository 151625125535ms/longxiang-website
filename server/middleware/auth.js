const jwt = require('jsonwebtoken');

let JWT_SECRET;
if (process.env.JWT_SECRET) {
    JWT_SECRET = process.env.JWT_SECRET;
} else {
    JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
    console.warn('WARNING: JWT_SECRET env var not set. Using a random key — all sessions will be invalidated on restart. Set JWT_SECRET in production.');
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
