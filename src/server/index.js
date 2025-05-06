// src/server/index.js
const express = require('express');
const session = require('express-session');
const path = require('path');

// Import db
const db = require('./middleware/db');

// Import route files - comment out any that aren't ready yet
const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const portfolioRoutes = require('./routes/portfolios');
// const stockRoutes = require('./routes/stocks');
// const transactionRoutes = require('./routes/transactions');
// const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

// Routes - only include ones that are ready
app.use('./routes/auth.js', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/portfolios', portfolioRoutes);
// app.use('/api/stocks', stockRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/settings', settingsRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all route for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test your server at http://localhost:${PORT}/api/test`);
});