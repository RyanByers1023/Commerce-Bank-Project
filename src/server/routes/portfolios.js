// server/routes/portfolios.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Get all portfolios for a user
router.get('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is accessing their own data or is an admin
        if (req.user.username !== username && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access to portfolio data' });
        }

        // Get user's portfolios
        const [portfolios] = await db.query(
            `SELECT p.portfolioID, p.name, p.description, p.initialBalance, p.balance, 
              p.createdAt, p.updatedAt
       FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ?
       ORDER BY p.createdAt`,
            [username]
        );

        if (portfolios.length === 0) {
            return res.json([]);
        }

        // For each portfolio, get total value of holdings
        for (const portfolio of portfolios) {
            // Get holdings
            const [holdingsResult] = await db.query(
                `SELECT h.quantity, h.avgPrice, s.symbol, s.marketPrice
         FROM holdings h
         JOIN stocks s ON h.stockID = s.stockID
         WHERE h.portfolioID = ?`,
                [portfolio.portfolioID]
            );

            // Calculate portfolio value
            let portfolioValue = 0;
            for (const holding of holdingsResult) {
                portfolioValue += holding.quantity * holding.marketPrice;
            }

            portfolio.portfolioValue = portfolioValue;
            portfolio.totalAssetsValue = portfolioValue + portfolio.balance;
            portfolio.holdingsCount = holdingsResult.length;
        }

        res.json(portfolios);
    } catch (error) {
        console.error('Get portfolios error:', error);
        res.status(500).json({ error: 'Failed to get portfolios' });
    }
});

// Get a specific portfolio
router.get('/:username/:portfolioId', auth.verifyToken, async (req, res) => {
    try {
        const { username, portfolioId } = req.params;

        // Verify user is accessing their own data or is an admin
        if (req.user.username !== username && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access to portfolio data' });
        }

        // Get portfolio
        const [portfolios] = await db.query(
            `SELECT p.portfolioID, p.name, p.description, p.initialBalance, p.balance, 
              p.createdAt, p.updatedAt
       FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ? AND p.portfolioID = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        const portfolio = portfolios[0];

        // Get holdings
        const [holdings] = await db.query(
            `SELECT h.quantity, h.avgPrice, s.stockID, s.symbol, s.companyName, 
              s.sector, s.marketPrice
       FROM holdings h
       JOIN stocks s ON h.stockID = s.stockID
       WHERE h.portfolioID = ?`,
            [portfolioId]
        );

        // Format holdings
        const holdingsMap = {};
        let portfolioValue = 0;

        for (const holding of holdings) {
            const value = holding.quantity * holding.marketPrice;
            portfolioValue += value;

            holdingsMap[holding.symbol] = {
                stockID: holding.stockID,
                symbol: holding.symbol,
                companyName: holding.companyName,
                sector: holding.sector,
                quantity: holding.quantity,
                avgPrice: holding.avgPrice,
                currentPrice: holding.marketPrice,
                value: value,
                profitLoss: (holding.marketPrice - holding.avgPrice) * holding.quantity,
                percentChange: ((holding.marketPrice - holding.avgPrice) / holding.avgPrice) * 100
            };
        }

        // Calculate portfolio value
        portfolio.portfolioValue = portfolioValue;
        portfolio.totalAssetsValue = portfolioValue + portfolio.balance;
        portfolio.holdingsMap = holdingsMap;

        res.json(portfolio);
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Failed to get portfolio' });
    }
});

// Create a new portfolio
router.post('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { name, description, initialBalance = 500 } = req.body;

        // Validate input
        if (!name) {
            return res.status(400).json({ error: 'Portfolio name is required' });
        }

        // Verify user is creating a portfolio for themselves
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to create portfolio' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Create portfolio ID
        const portfolioID = `portfolio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Create portfolio
        await db.query(
            `INSERT INTO portfolios (portfolioID, userID, name, description, initialBalance, balance)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [portfolioID, userID, name, description || '', initialBalance, initialBalance]
        );

        // Get created portfolio
        const [portfolios] = await db.query(
            'SELECT * FROM portfolios WHERE portfolioID = ?',
            [portfolioID]
        );

        if (portfolios.length === 0) {
            return res.status(500).json({ error: 'Failed to create portfolio' });
        }

        const portfolio = portfolios[0];

        // Return the created portfolio
        res.status(201).json({
            portfolioID: portfolio.portfolioID,
            name: portfolio.name,
            description: portfolio.description,
            initialBalance: portfolio.initialBalance,
            balance: portfolio.balance,
            createdAt: portfolio.createdAt,
            updatedAt: portfolio.updatedAt,
            portfolioValue: 0,
            totalAssetsValue: portfolio.balance,
            holdingsMap: {}
        });
    } catch (error) {
        console.error('Create portfolio error:', error);
        res.status(500).json({ error: 'Failed to create portfolio' });
    }
});

// Update a portfolio
router.put('/:username/:portfolioId', auth.verifyToken, async (req, res) => {
    try {
        const { username, portfolioId } = req.params;
        const { name, description } = req.body;

        // Verify user is updating their own portfolio
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to update portfolio' });
        }

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            `SELECT p.portfolioID FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ? AND p.portfolioID = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Update portfolio
        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }

        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No update fields provided' });
        }

        // Add portfolio ID to values
        updateValues.push(portfolioId);

        await db.query(
            `UPDATE portfolios SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE portfolioID = ?`,
            updateValues
        );

        res.json({ message: 'Portfolio updated successfully' });
    } catch (error) {
        console.error('Update portfolio error:', error);
        res.status(500).json({ error: 'Failed to update portfolio' });
    }
});

// Reset a portfolio
router.post('/:username/:portfolioId/reset', auth.verifyToken, async (req, res) => {
    try {
        const { username, portfolioId } = req.params;
        const { initialBalance } = req.body;

        // Verify user is resetting their own portfolio
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to reset portfolio' });
        }

        // Begin transaction
        await db.query('START TRANSACTION');

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            `SELECT p.portfolioID, p.initialBalance FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ? AND p.portfolioID = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        const portfolio = portfolios[0];

        // Use provided initial balance or the existing one
        const newBalance = initialBalance || portfolio.initialBalance;

        // Delete all holdings for this portfolio
        await db.query(
            'DELETE FROM holdings WHERE portfolioID = ?',
            [portfolioId]
        );

        // Delete all transactions for this portfolio
        await db.query(
            'DELETE FROM transactions WHERE portfolioID = ?',
            [portfolioId]
        );

        // Update portfolio balance and initial balance
        await db.query(
            'UPDATE portfolios SET balance = ?, initialBalance = ?, updatedAt = NOW() WHERE portfolioID = ?',
            [newBalance, newBalance, portfolioId]
        );

        // Commit transaction
        await db.query('COMMIT');

        res.json({
            message: 'Portfolio reset successfully',
            initialBalance: newBalance,
            balance: newBalance
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Reset portfolio error:', error);
        res.status(500).json({ error: 'Failed to reset portfolio' });
    }
});

// Delete a portfolio
router.delete('/:username/:portfolioId', auth.verifyToken, async (req, res) => {
    try {
        const { username, portfolioId } = req.params;

        // Verify user is deleting their own portfolio
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to delete portfolio' });
        }

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            `SELECT p.portfolioID FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ? AND p.portfolioID = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Check if it's the only portfolio
        const [countResult] = await db.query(
            `SELECT COUNT(*) as portfolioCount FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ?`,
            [username]
        );

        if (countResult[0].portfolioCount <= 1) {
            return res.status(400).json({ error: 'Cannot delete the only portfolio' });
        }

        // Check if it's the active portfolio
        const [userResult] = await db.query(
            'SELECT activePortfolioID FROM users WHERE username = ?',
            [username]
        );

        const isActivePortfolio = userResult[0].activePortfolioID === portfolioId;

        // Begin transaction
        await db.query('START TRANSACTION');

        // Delete portfolio (cascading delete will remove holdings and transactions)
        await db.query(
            'DELETE FROM portfolios WHERE portfolioID = ?',
            [portfolioId]
        );

        // If it was the active portfolio, set another portfolio as active
        if (isActivePortfolio) {
            const [remainingPortfolios] = await db.query(
                `SELECT portfolioID FROM portfolios p
         JOIN users u ON p.userID = u.userID
         WHERE u.username = ? LIMIT 1`,
                [username]
            );

            if (remainingPortfolios.length > 0) {
                await db.query(
                    'UPDATE users SET activePortfolioID = ? WHERE username = ?',
                    [remainingPortfolios[0].portfolioID, username]
                );
            }
        }

        // Commit transaction
        await db.query('COMMIT');

        res.json({ message: 'Portfolio deleted successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Delete portfolio error:', error);
        res.status(500).json({ error: 'Failed to delete portfolio' });
    }
});

module.exports = router;