// src/server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../middleware/db');
const auth = require('../middleware/auth');

/**
 * Validate password strength
 */
//TODO: remove some duplicated code below:
function validatePassword(password) {
    const result = { isValid: true, error: null };

    if (password.length < 8) {
        result.isValid = false;
        result.error = 'Password must be at least 8 characters long';
        return result;
    }

    if (!/[A-Z]/.test(password)) {
        result.isValid = false;
        result.error = 'Password must include at least one uppercase letter';
        return result;
    }

    if (!/[a-z]/.test(password)) {
        result.isValid = false;
        result.error = 'Password must include at least one lowercase letter';
        return result;
    }

    if (!/\d/.test(password)) {
        result.isValid = false;
        result.error = 'Password must include at least one number';
        return result;
    }

    return result;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user by email
        const [users] = await db.query(
            'SELECT id, username, email, password_hash FROM user WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create session
        const expiresAt = new Date();
        if (rememberMe) {
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 1);
        }

        await db.query(
            'INSERT INTO session (user_id, expires_at) VALUES (?, ?)',
            [user.id, expiresAt]
        );

        // Update last login
        await db.query(
            'UPDATE user SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Set session data
        req.session.userId = user.id;

        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; //30 days
        }

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

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (!validateUsername(username)) {
            return res.status(400).json({
                error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // Check if username or email already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM user WHERE username = ? OR email = ?',
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
            'INSERT INTO user (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        const userId = userResult.insertId;

        await db.query(
            'INSERT INTO portfolio (user_id) VALUE (?)',
            [userId]
        );

        // Set active portfolio
        await db.query(
            'INSERT INTO user (active_portfolio_id) SELECT id FROM portfolio WHERE user_id = ?',
            [userId]
        );

        // Create simulation settings with defaults
        await db.query(
            'INSERT INTO settings (user_id, sim_speed, market_volatility, event_frequency, initial_balance) VALUES (?, ?, ?, ?, ?)',
            [userId, 1, 'medium', 'medium', 500.00]
        );

        // Create session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);

        await db.query(
            'INSERT INTO session (user_id, expires_at) VALUES (?, ?)',
            [userId, expiresAt]
        );

        // Commit transaction
        await db.query('COMMIT');

        // Set session data
        req.session.userId = userId;

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
router.post('/logout', async (req, res) => {
    try {
        // Delete session from database
        if (req.session.userId) {
            await db.query(
                'DELETE FROM session WHERE user_id = ?',
                [req.session.userId]
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
    if (req.session && req.session.userId) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// Get current user profile
router.get('/current-user', async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get user data
        const [users] = await db.query(
            'SELECT id, username, email, date_created, last_login, active_portfolio_id FROM user WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Get active portfolio
        const [portfolios] = await db.query(
            'SELECT id FROM portfolio WHERE id = ?',
            [user.active_portfolio_id]
        );

        res.json({
            userId: user.id,
            username: user.username,
            email: user.email,
            dateCreated: user.date_created,
            lastLogin: user.last_login,
            activePortfolioId: user.active_portfolio_id,
            isDemoAccount: user.is_demo_account,
            isAdmin: user.is_admin
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Demo login route
router.post('/demo-login', async (req, res) => {
    try {
        const demoEmail = 'demo@investedsim.com';
        const demoUsername = 'demo_user';
        const demoPassword = 'Demo123456';

        // Check if demo user exists
        const [demoUsers] = await db.query(
            'SELECT id, username, email FROM user WHERE email = ?',
            [demoEmail]
        );

        let userId;

        await db.query('START TRANSACTION');

        if (demoUsers.length === 0) {
            // Create demo user
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

            const [userResult] = await db.query(
                'INSERT INTO user (username, email, password_hash, is_demo_account) VALUES (?, ?, ?, 1)',
                [demoUsername, demoEmail, passwordHash]
            );

            userId = userResult.insertId;

            // Create initial portfolio
            const portfolioId = `demo-portfolio-${Date.now()}`;

            await db.query(
                'INSERT INTO portfolios (id, user_id) VALUES (?, ?)',
                [portfolioId, userId]
            );

            // Set active portfolio
            await db.query(
                'UPDATE user SET active_portfolio_id = ? WHERE id = ?',
                [portfolioId, userId]
            );

            // Create simulation settings
            await db.query(
                'INSERT INTO settings (user_id, sim_speed, market_volatility, event_frequency, initial_balance) VALUES (?, ?, ?, ?, ?)',
                [userId, 5, 'high', 'high', 10000.00]
            );
        } else {
            userId = demoUsers[0].id;
        }

        // Create session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);

        await db.query(
            'INSERT INTO session (user_id, expires_at) VALUES (?, ?)',
            [userId, expiresAt]
        );

        // Update last login
        await db.query(
            'UPDATE user SET last_login = NOW() WHERE id = ?',
            [userId]
        );

        await db.query('COMMIT');

        // Set session data
        req.session.userId = userId;
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

// Forgot password request
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        // Check if email exists
        const [users] = await db.query(
            'SELECT id, username FROM user WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.json({
                message: 'If your email is registered, you will receive password reset instructions'
            });
        }

        const user = users[0];

        // Generate reset token
        const resetToken = uuidv4();
        const tokenExpiration = new Date();
        tokenExpiration.setHours(tokenExpiration.getHours() + 1);

        // Save reset token
        await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at)',
            [user.id, resetToken, tokenExpiration]
        );

        console.log(`Reset token for ${user.username}: ${resetToken}`);

        res.json({
            message: 'If your email is registered, you will receive password reset instructions',
            token: resetToken // Remove in production
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // Check if token exists and is valid
        const [tokens] = await db.query(
            'SELECT user_id, expires_at FROM password_reset_tokens WHERE token_hash = ?',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const resetToken = tokens[0];

        if (new Date(resetToken.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update user's password
        await db.query(
            'UPDATE user SET password_hash = ? WHERE id = ?',
            [passwordHash, resetToken.user_id]
        );

        // Delete the used token
        await db.query(
            'DELETE FROM password_reset_tokens WHERE token_hash = ?',
            [token]
        );

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;