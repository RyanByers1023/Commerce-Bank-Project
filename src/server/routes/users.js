// server/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Get user profile
router.get('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is accessing their own data or is an admin
        if (req.user.username !== username && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access to user data' });
        }

        // Get user data
        const [users] = await db.query(
            'SELECT userID, username, email, dateCreated, lastLogin, activePortfolioID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Get user's active portfolio
        const [portfolios] = await db.query(
            'SELECT portfolioID, name, description, initialBalance, balance FROM portfolios WHERE portfolioID = ?',
            [user.activePortfolioID]
        );

        const portfolio = portfolios.length > 0 ? portfolios[0] : null;

        // Return user profile with portfolio
        res.json({
            username: user.username,
            email: user.email,
            dateCreated: user.dateCreated,
            lastLogin: user.lastLogin,
            portfolio: portfolio
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Update user profile
router.put('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { email, currentPassword, newPassword } = req.body;

        // Verify user is updating their own data or is an admin
        if (req.user.username !== username && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access to update user data' });
        }

        // Get user data
        const [users] = await db.query(
            'SELECT userID, passwordHash FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // If updating password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to set a new password' });
            }

            const bcrypt = require('bcrypt');
            const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);

            if (!passwordMatch) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Update password
            await db.query(
                'UPDATE users SET passwordHash = ? WHERE userID = ?',
                [newPasswordHash, user.userID]
            );
        }

        // Update email if provided
        if (email) {
            await db.query(
                'UPDATE users SET email = ? WHERE userID = ?',
                [email, user.userID]
            );
        }

        res.json({ message: 'User profile updated successfully' });
    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});

// Update active portfolio
router.put('/:username/active-portfolio', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { activePortfolioId } = req.body;

        // Verify user is updating their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to update user data' });
        }

        // Verify portfolio exists and belongs to user
        const [portfolios] = await db.query(
            `SELECT p.portfolioID FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ? AND p.portfolioID = ?`,
            [username, activePortfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Update active portfolio
        await db.query(
            'UPDATE users SET activePortfolioID = ? WHERE username = ?',
            [activePortfolioId, username]
        );

        res.json({ message: 'Active portfolio updated successfully' });
    } catch (error) {
        console.error('Update active portfolio error:', error);
        res.status(500).json({ error: 'Failed to update active portfolio' });
    }
});

// Delete user account
router.delete('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is deleting their own account or is an admin
        if (req.user.username !== username && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access to delete user' });
        }

        // Delete user (cascading delete will remove portfolios, holdings, transactions, etc.)
        const [result] = await db.query(
            'DELETE FROM users WHERE username = ?',
            [username]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If user deleted their own account, destroy session
        if (req.user.username === username) {
            req.session.destroy();
        }

        res.json({ message: 'User account deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user account' });
    }
});

module.exports = router;