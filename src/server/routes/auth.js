// src/server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../middleware/db');
const auth = require('../middleware/auth');

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {Object} - Result with isValid flag and error message
 */
function validatePassword(password) {
    const result = { isValid: true, error: null };

    // Check for minimum length (8 characters)
    if (password.length < 8) {
        result.isValid = false;
        result.error = 'Password must be at least 8 characters long';
        return result;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        result.isValid = false;
        result.error = 'Password must include at least one uppercase letter';
        return result;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        result.isValid = false;
        result.error = 'Password must include at least one lowercase letter';
        return result;
    }

    // Check for number
    if (!/\d/.test(password)) {
        result.isValid = false;
        result.error = 'Password must include at least one number';
        return result;
    }

    return result;
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate username format
 * @param {string} username - The username to validate
 * @returns {boolean} - Whether the username is valid
 */
function validateUsername(username) {
    // 3-20 alphanumeric characters and underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

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

        // Set expiration based on rememberMe
        const expiresAt = new Date();
        if (rememberMe) {
            // Expire in 30 days if remember me is checked
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else {
            // Expire in 24 hours by default
            expiresAt.setDate(expiresAt.getDate() + 1);
        }

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

        // Set cookie expiration to match session expiration
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
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

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Validate username format
        if (!validateUsername(username)) {
            return res.status(400).json({
                error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
            });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
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

        // Create simulation settings with defaults
        await db.query(
            `INSERT INTO simulation_settings 
             (userID, simulationSpeed, marketVolatility, eventFrequency, startingCash)
             VALUES (?, ?, ?, ?, ?)`,
            [userID, 1, 'medium', 'medium', 500.00]
        );

        // Create session
        const sessionID = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 24 hours

        await db.query(
            'INSERT INTO sessions (sessionID, userID, expiresAt) VALUES (?, ?, ?)',
            [sessionID, userID, expiresAt]
        );

        // Add default stocks to user's simulation
        const [systemStocks] = await db.query(
            'SELECT stockID FROM stocks WHERE userID IS NULL LIMIT 10'
        );

        if (systemStocks.length > 0) {
            // Create a values string for bulk insert
            const values = systemStocks.map(stock => `(${userID}, ${stock.stockID}, NOW())`).join(', ');

            await db.query(
                `INSERT INTO user_stocks (userID, stockID, addedAt) VALUES ${values}`
            );
        }

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

// Get current user profile
router.get('/current-user', auth.verifyToken, async (req, res) => {
    try {
        const userID = req.session.userID;

        // Get user data
        const [users] = await db.query(
            'SELECT userID, username, email, dateCreated, lastLogin, activePortfolioID FROM users WHERE userID = ?',
            [userID]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Get active portfolio
        const [portfolios] = await db.query(
            'SELECT portfolioID, name, description, initialBalance, balance FROM portfolios WHERE portfolioID = ?',
            [user.activePortfolioID]
        );

        // Return user data
        res.json({
            username: user.username,
            email: user.email,
            dateCreated: user.dateCreated,
            lastLogin: user.lastLogin,
            activePortfolioID: user.activePortfolioID,
            portfolio: portfolios.length > 0 ? portfolios[0] : null
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Demo login route for testing
router.post('/demo-login', async (req, res) => {
    try {
        // Create or get demo user
        const demoEmail = 'demo@investedsim.com';
        const demoUsername = 'demo_user';
        const demoPassword = 'Demo123456';

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

            // Create simulation settings with defaults
            await db.query(
                `INSERT INTO simulation_settings 
                 (userID, simulationSpeed, marketVolatility, eventFrequency, startingCash)
                 VALUES (?, ?, ?, ?, ?)`,
                [userID, 5, 'high', 'high', 10000.00]  // More exciting settings for demo
            );

            // Add default stocks to demo user
            const [systemStocks] = await db.query(
                'SELECT stockID FROM stocks WHERE userID IS NULL'
            );

            if (systemStocks.length > 0) {
                // Create a values string for bulk insert
                const values = systemStocks.map(stock => `(${userID}, ${stock.stockID}, NOW())`).join(', ');

                await db.query(
                    `INSERT INTO user_stocks (userID, stockID, addedAt) VALUES ${values}`
                );
            }
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

// Forgot password request
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        // Check if email exists
        const [users] = await db.query(
            'SELECT userID, username FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // For security, don't reveal if email exists or not
            return res.json({
                message: 'If your email is registered, you will receive password reset instructions'
            });
        }

        const user = users[0];

        // Generate reset token
        const resetToken = uuidv4();
        const tokenExpiration = new Date();
        tokenExpiration.setHours(tokenExpiration.getHours() + 1); // Token expires in 1 hour

        // Save reset token to database - create the table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                tokenID INT AUTO_INCREMENT PRIMARY KEY,
                userID INT NOT NULL,
                token VARCHAR(255) NOT NULL,
                expiresAt TIMESTAMP NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
                UNIQUE KEY (token)
            )
        `);

        // Insert or update reset token
        await db.query(`
            INSERT INTO password_reset_tokens (userID, token, expiresAt) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE token = VALUES(token), expiresAt = VALUES(expiresAt)
        `, [user.userID, resetToken, tokenExpiration]);

        // In a real application, send an email with reset link
        // For this example, we'll just return the token (in production, never do this!)
        console.log(`Reset token for ${user.username}: ${resetToken}`);

        res.json({
            message: 'If your email is registered, you will receive password reset instructions',
            // Remove the following line in production
            token: resetToken // For testing only
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

        // Validate input
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // Check if token exists and is valid
        const [tokens] = await db.query(
            'SELECT userID, expiresAt FROM password_reset_tokens WHERE token = ?',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const resetToken = tokens[0];

        // Check if token has expired
        if (new Date(resetToken.expiresAt) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update user's password
        await db.query(
            'UPDATE users SET passwordHash = ? WHERE userID = ?',
            [passwordHash, resetToken.userID]
        );

        // Delete the used token
        await db.query(
            'DELETE FROM password_reset_tokens WHERE token = ?',
            [token]
        );

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;