const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
        { username: ADMIN_USERNAME, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({ token, username: ADMIN_USERNAME });
});

router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
        res.json({ valid: true });
    } catch (err) {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;
