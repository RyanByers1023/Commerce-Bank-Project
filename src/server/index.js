require('dotenv').config();
const express   = require('express');
const app  = express();

const session   = require('express-session');
const path      = require('path');
const helmet    = require('helmet');
const morgan    = require('morgan');
const db        = require('./middleware/db');  // make sure this connects

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const portfolioRoutes   = require('./routes/portfolios');
const stockRoutes       = require('./routes/stocks');
const transactionRoutes = require('./routes/transactions');
const settingsRoutes    = require('./routes/settings');


const PORT = process.env.PORT

// ─── Global middleware ────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.json());

db.testConnection()
    .then(connected => {
        if (!connected) {
            console.error('WARNING: Database connection failed during startup');
        }
    })
    .catch(err => {
        console.error('Error testing database connection:', err);
    });


// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/portfolios',  portfolioRoutes);
app.use('/api/stocks',      stockRoutes);
app.use('/api/transactions',transactionRoutes);
app.use('/api/settings',    settingsRoutes);

// Simple liveness check
app.get('/api/test', (_, res) => res.json({ message: 'Server is running!' }));

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {})

// ─── Error handling ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
});

// 404 for anything else
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});