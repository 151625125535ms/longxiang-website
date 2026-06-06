const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const companyRoutes = require('./routes/company');
const inquiriesRoutes = require('./routes/inquiries');
const certificationsRoutes = require('./routes/certifications');

let compression = null;
try {
    compression = require('compression');
} catch (err) {
    compression = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

if (compression) app.use(compression());
app.use(cors());
app.use(express.json());
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
app.use('/api/products', productsRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/certifications', certificationsRoutes);

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
});

app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
});
