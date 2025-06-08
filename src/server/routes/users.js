// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Get current user (moved from auth routes for consistency)
router.get('/current', auth.verifyToken, async (req, res) => {
    try {
        // Get user data with active portfolio info
        const [users] = await db.query(
            'SELECT id, username, email, date_created, last_login, active_portfolio_id, is_demo_account, is_admin FROM user WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            dateCreated: user.date_created,
            lastLogin: user.last_login,
            activePortfolioId: user.active_portfolio_id, // FIX: Match client expectation
            isDemoAccount: Boolean(user.is_demo_account),
            isAdmin: Boolean(user.is_admin)
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Get user profile by ID
router.get('/:user_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;

        // Get user data
        const [users] = await db.query(
            `SELECT id, username, email, date_created, last_login,
                    active_portfolio_id, is_demo_account, is_admin
             FROM user WHERE id = ?`,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Get portfolio count
        const [portfolioCount] = await db.query(
            'SELECT COUNT(*) as count FROM portfolio WHERE user_id = ?',
            [user.id]
        );

        // Get total transactions
        const [transactionCount] = await db.query(
            'SELECT COUNT(*) as count FROM transaction WHERE user_id = ?',
            [user.id]
        );

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            dateCreated: user.date_created,
            lastLogin: user.last_login,
            activePortfolioId: user.active_portfolio_id,
            isDemoAccount: Boolean(user.is_demo_account),
            isAdmin: Boolean(user.is_admin),
            portfolioCount: portfolioCount[0].count,
            transactionCount: transactionCount[0].count
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Update user profile by ID
router.put('/:user_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;
        const { email, currentPassword, newPassword } = req.body;

        // Get current user data
        const [users] = await db.query(
            'SELECT email, password_hash FROM user WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        const updates = {};

        // Update email if provided
        if (email && email !== user.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Please enter a valid email address' });
            }

            // Check if email is already taken
            const [existingUsers] = await db.query(
                'SELECT id FROM user WHERE email = ? AND id != ?',
                [email, user_id]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({ error: 'Email already in use' });
            }

            updates.email = email;
        }

        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password required to change password' });
            }

            // Verify current password
            const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Validate new password
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }

            if (!/[A-Z]/.test(newPassword)) {
                return res.status(400).json({ error: 'Password must include at least one uppercase letter' });
            }

            if (!/[a-z]/.test(newPassword)) {
                return res.status(400).json({ error: 'Password must include at least one lowercase letter' });
            }

            if (!/\d/.test(newPassword)) {
                return res.status(400).json({ error: 'Password must include at least one number' });
            }

            // Hash new password
            const saltRounds = 10;
            updates.password_hash = await bcrypt.hash(newPassword, saltRounds);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid update fields provided' });
        }

        // Update user
        const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const updateValues = [...Object.values(updates), user_id];

        await db.query(
            `UPDATE user SET ${updateFields} WHERE id = ?`,
            updateValues
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Set active portfolio
router.put('/:user_id/active-portfolio', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;
        const { activePortfolioId } = req.body; // FIX: Match client field name

        if (!activePortfolioID) {
            return res.status(400).json({ error: 'Portfolio ID is required' });
        }

        // Verify portfolio belongs to user
        const [portfolios] = await db.query(
            'SELECT id FROM portfolio WHERE user_id = ? AND id = ?',
            [user_id, activePortfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Update active portfolio
        await db.query(
            'UPDATE user SET active_portfolio_id = ? WHERE id = ?',
            [activePortfolioI, user_id]
        );

        res.json({ message: 'Active portfolio updated successfully' });
    } catch (error) {
        console.error('Set active portfolio error:', error);
        res.status(500).json({ error: 'Failed to set active portfolio' });
    }
});

// Get user dashboard/overview
router.get('/:user_id/dashboard', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;

        // Get user data
        const [users] = await db.query(
            'SELECT id, active_portfolio_id FROM user WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const activePortfolioId = users[0].active_portfolio_id;

        // Get portfolio summary
        const [portfolios] = await db.query(
            'SELECT COUNT(*) as count FROM portfolio WHERE user_id = ?',
            [user_id]
        );

        // Get total holdings value (if active portfolio exists)
        let totalHoldingsValue = 0;
        if (activePortfolioId) {
        const [holdings] = await db.query(
            `SELECT SUM(h.quantity * sd.closePrice) as total_value
                FROM holding h
                JOIN stock s ON h.stock_id = s.id
                JOIN (
                    SELECT stock_id, closePrice, 
                        ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY dataDate DESC) as rn
                    FROM stock_data
                ) sd ON s.id = sd.stock_id AND sd.rn = 1
                WHERE h.portfolio_id = ?`,
            [activePortfolioId]
        );

        totalHoldingsValue = holdings[0].total_value || 0;
        }

        // Get recent transactions (last 5)
        const [recentTransactions] = await db.query(
            `SELECT t.id, t.transaction_type, t.quantity, t.price_paid,
                    t.total_value, t.timestamp, s.symbol, s.company_name
             FROM transaction t
                      JOIN stock s ON t.stock_id = s.id
             WHERE t.user_id = ?
             ORDER BY t.timestamp DESC
             LIMIT 5`,
            [user_id]
        );

        // Get simulation settings
        const [settings] = await db.query(
            'SELECT * FROM settings WHERE user_id = ?',
            [user_id]
        );

        res.json({
            portfolioCount: portfolios[0].count,
            activePortfolioId,
            totalHoldingsValue,
            recentTransactions,
            simulationSettings: settings[0] || null
        });
    } catch (error) {
        console.error('Get user dashboard error:', error);
        res.status(500).json({ error: 'Failed to get user dashboard' });
    }
});

// Delete user account by ID
router.delete('/:user_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password confirmation required' });
        }

        // Get user data
        const [users] = await db.query(
            'SELECT id, password_hash, is_demo_account FROM user WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Prevent deletion of demo account
        if (user.is_demo_account) {
            return res.status(400).json({ error: 'Demo account cannot be deleted' });
        }

        // Verify password (only if deleting own account)
        if (req.user.id == user_id) {
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Password is incorrect' });
            }
        }

        // Delete user (cascading deletes will handle related records)
        await db.query('DELETE FROM user WHERE id = ?', [user.id]);

        // Clear session if deleting own account
        if (req.user.id == user_id) {
            req.session.destroy(err => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
            });
        }

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete user account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

module.exports = router;