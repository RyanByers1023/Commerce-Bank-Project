// server/index.js
const express = require('express');
const session = require('express-session');
const db = require('src/server/server/db.js');
const auth = require('./middleware/auth');

// Import route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
// Import other routes...

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Add other routes...

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Test database connection
    auth.initDatabaseConnection();
});