// src/server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user by email
        const [users] = await db.query(
            'SELECT userID, username, email, passwordHash FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create session
        const sessionID = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 24 hours

        await db.query(
            'INSERT INTO sessions (sessionID, userID, expiresAt) VALUES (?, ?, ?)',
            [sessionID, user.userID, expiresAt]
        );

        // Update last login
        await db.query(
            'UPDATE users SET lastLogin = NOW() WHERE userID = ?',
            [user.userID]
        );

        // Set session data
        req.session.userID = user.userID;
        req.session.sessionID = sessionID;

        res.json({
            message: 'Login successful',
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if username or email already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.username === username) {
                return res.status(409).json({ error: 'Username already exists' });
            } else {
                return res.status(409).json({ error: 'Email already exists' });
            }
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Begin transaction
        await db.query('START TRANSACTION');

        // Create user
        const [userResult] = await db.query(
            'INSERT INTO users (username, email, passwordHash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        const userID = userResult.insertId;

        // Create initial portfolio
        const portfolioID = `portfolio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const initialBalance = 500.00;

        await db.query(
            `INSERT INTO portfolios (portfolioID, userID, name, description, initialBalance, balance)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [portfolioID, userID, 'Default Portfolio', 'My first portfolio', initialBalance, initialBalance]
        );

        // Set active portfolio
        await db.query(
            'UPDATE users SET activePortfolioID = ? WHERE userID = ?',
            [portfolioID, userID]
        );

        // Create session
        const sessionID = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 24 hours

        await db.query(
            'INSERT INTO sessions (sessionID, userID, expiresAt) VALUES (?, ?, ?)',
            [sessionID, userID, expiresAt]
        );

        // Commit transaction
        await db.query('COMMIT');

        // Set session data
        req.session.userID = userID;
        req.session.sessionID = sessionID;

        res.status(201).json({
            message: 'Registration successful',
            user: {
                username,
                email
            }
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Logout route
router.post('/logout', auth.verifyToken, async (req, res) => {
    try {
        // Delete session from database
        if (req.session.sessionID) {
            await db.query(
                'DELETE FROM sessions WHERE sessionID = ?',
                [req.session.sessionID]
            );
        }

        // Clear session
        req.session.destroy(err => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ error: 'Logout failed' });
            }

            res.json({ message: 'Logout successful' });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Check if user is authenticated
router.get('/check', (req, res) => {
    if (req.session && req.session.userID) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// Demo login route for testing
router.post('/demo-login', async (req, res) => {
    try {
        // Create or get demo user
        const demoEmail = 'demo@stocksim.com';
        const demoUsername = 'demo_user';
        const demoPassword = 'demo123';

        // Check if demo user exists
        const [demoUsers] = await db.query(
            'SELECT userID, username, email FROM users WHERE email = ?',
            [demoEmail]
        );

        let userID;

        // Begin transaction
        await db.query('START TRANSACTION');

        if (demoUsers.length === 0) {
            // Create demo user if not exists
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

            const [userResult] = await db.query(
                'INSERT INTO users (username, email, passwordHash, isDemoAccount) VALUES (?, ?, ?, TRUE)',
                [demoUsername, demoEmail, passwordHash]
            );

            userID = userResult.insertId;

            // Create initial portfolio
            const portfolioID = `demo-portfolio-${Date.now()}`;
            const initialBalance = 10000.00; // More money for demo

            await db.query(
                `INSERT INTO portfolios (portfolioID, userID, name, description, initialBalance, balance)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [portfolioID, userID, 'Demo Portfolio', 'Try out the simulator', initialBalance, initialBalance]
            );

            // Set active portfolio
            await db.query(
                'UPDATE users SET activePortfolioID = ? WHERE userID = ?',
                [portfolioID, userID]
            );
        } else {
            userID = demoUsers[0].userID;
        }

        // Create session
        const sessionID = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 24 hours

        await db.query(
            'INSERT INTO sessions (sessionID, userID, expiresAt) VALUES (?, ?, ?)',
            [sessionID, userID, expiresAt]
        );

        // Update last login
        await db.query(
            'UPDATE users SET lastLogin = NOW() WHERE userID = ?',
            [userID]
        );

        // Commit transaction
        await db.query('COMMIT');

        // Set session data
        req.session.userID = userID;
        req.session.sessionID = sessionID;
        req.session.isDemo = true;

        res.json({
            message: 'Demo login successful',
            user: {
                username: demoUsername,
                email: demoEmail,
                isDemo: true
            }
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Demo login error:', error);
        res.status(500).json({ error: 'Demo login failed' });
    }
});

module.exports = router;