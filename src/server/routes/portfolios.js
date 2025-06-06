// server/routes/portfolios.js
const express = require('express');
const router = express.Router();

const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Get all portfolios for a user
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // Verify user is accessing their own data or is an admin
        if (req.user.id !== user_id && !req.user.is_admin) {
            return res.status(403).json({ error: 'Unauthorized access to portfolio data' });
        }

        // Get user's portfolios
        const [portfolios] = await db.query(
            `SELECT p.id, p.user_id, p.cash_balance, p.name
             FROM portfolio p
             JOIN user u ON p.user_id = u.id
             WHERE u.id = ?
             ORDER BY p.cash_balance`,
            [user_id]
        );

        if (portfolios.length === 0) {
            return res.json([]);
        }

        // For each portfolio, get total value of holdings
        for (const portfolio of portfolios) {
            // Get holdings with stock prices
            const [holdingsResult] = await db.query(
                `SELECT h.quantity, h.avg_price_paid, s.symbol, s.value as current_price
                 FROM holding h
                 JOIN stock s ON h.stock_id = s.id
                 WHERE h.portfolio_id = ?`,
                [portfolio.id]
            );

            // Calculate portfolio value
            let portfolioValue = 0;
            for (const holding of holdingsResult) {
                portfolioValue += holding.quantity * holding.current_price;
            }

            portfolio.portfolioValue = portfolioValue;
            portfolio.holdingsCount = holdingsResult.length;
        }

        res.json(portfolios);
    } catch (error) {
        console.error('Get portfolios error:', error);
        res.status(500).json({ error: 'Failed to get portfolios' });
    }
});

// Get a specific portfolio
router.get('/:user_id/:active_portfolio_id', async (req, res) => {
    try {
        const { user_id, active_portfolio_id } = req.params;

        // Verify user is accessing their own data or is an admin
        if (req.user.userId !== user_id && !req.user.is_admin) {
            return res.status(403).json({ error: 'Unauthorized access to portfolio data' });
        }

        // Get portfolio
        const [portfolios] = await db.query(
            `SELECT p.id, p.user_id, p.cash_balance, p.name
             FROM portfolio p
             JOIN user u ON p.user_id = u.id
             WHERE u.id = ? AND p.id = ?`,
            [user_id, active_portfolio_id]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        const portfolio = portfolios[0];

        // Get holdings
        const [holdings] = await db.query(
            `SELECT h.quantity, h.avg_price_paid, h.price_paid, s.id as stock_id, s.symbol, 
                    s.company_name, s.sector, s.value as current_price
             FROM holding h
             JOIN stock s ON h.stock_id = s.id
             WHERE h.portfolio_id = ?`,
            [active_portfolio_id]
        );

        // Format holdings
        const holdingsMap = {};
        let portfolioValue = 0;

        for (const holding of holdings) {
            //const value = holding.quantity * holding.current_price;
            //portfolioValue += value;

            holdingsMap[holding.symbol] = {
                stockId: holding.stock_id,
                symbol: holding.symbol,
                companyName: null,
                //sector: holding.sector,
                quantity: holding.quantity,
                avgPrice: holding.avg_price_paid,
                totalPrice: holding.price_paid,
                value: holding.value,
                profitLoss: (holding.current_price - holding.avg_price_paid) * holding.quantity,
                //percentChange: ((holding.current_price - holding.avg_price) / holding.avg_price) * 100
            };
        }

        portfolio.portfolioValue = portfolioValue;
        portfolio.holdingsMap = holdingsMap;

        res.json(portfolio);
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Failed to get portfolio' });
    }
});

// Create a new portfolio
router.post('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // Verify user is creating a portfolio for themselves
        if (req.user.user_id !== user_id) {
            return res.status(403).json({ error: 'Unauthorized access to create portfolio' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM user WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Create portfolio
        await db.query(
            'INSERT INTO portfolio (id, user_id) VALUE (?)',
            [userId]
        );

        // Get created portfolio
        const [portfolios] = await db.query(
            'SELECT * FROM portfolio WHERE id = ?',
            [portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(500).json({ error: 'Failed to create portfolio' });
        }

        const portfolio = portfolios[0];

        res.status(201).json({
            id: portfolio.id,
            userId: portfolio.user_id,
            createdAt: portfolio.created_at,
            updatedAt: portfolio.updated_at,
            portfolioValue: 0,
            holdingsMap: {}
        });
    } catch (error) {
        console.error('Create portfolio error:', error);
        res.status(500).json({ error: 'Failed to create portfolio' });
    }
});

// Reset a portfolio (clear all holdings and transactions)
router.post('/:user_id/:portfolioId/reset', async (req, res) => {
    try {
        const { user_id, portfolioId } = req.params;

        // Verify user is resetting their own portfolio
        if (req.user.user_id !== user_id) {
            return res.status(403).json({ error: 'Unauthorized access to reset portfolio' });
        }

        // Begin transaction
        await db.query('START TRANSACTION');

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            `SELECT p.id FROM portfolio p
             JOIN user u ON p.user_id = u.id
             WHERE u.id = ? AND p.id = ?`,
            [user_id, portfolioId]
        );

        if (portfolios.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Delete all holdings for this portfolio
        await db.query(
            'DELETE FROM holding WHERE portfolio_id = ?',
            [portfolioId]
        );

        // Delete all transactions for this portfolio
        await db.query(
            'DELETE FROM transaction WHERE portfolio_id = ?',
            [portfolioId]
        );

        // Commit transaction
        await db.query('COMMIT');

        res.json({
            message: 'Portfolio reset successfully'
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Reset portfolio error:', error);
        res.status(500).json({ error: 'Failed to reset portfolio' });
    }
});

// Delete a portfolio
router.delete('/:username/:portfolioId', async (req, res) => {
    try {
        const { username, portfolioId } = req.params;

        // Verify user is deleting their own portfolio
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to delete portfolio' });
        }

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            `SELECT p.id FROM portfolio p
             JOIN user u ON p.user_id = u.id
             WHERE u.username = ? AND p.id = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Check if it's the only portfolio
        const [countResult] = await db.query(
            `SELECT COUNT(*) as portfolio_count FROM portfolio p
             JOIN user u ON p.user_id = u.id
             WHERE u.username = ?`,
            [username]
        );

        if (countResult[0].portfolio_count <= 1) {
            return res.status(400).json({ error: 'Cannot delete the only portfolio' });
        }

        // Check if it's the active portfolio
        const [userResult] = await db.query(
            'SELECT active_portfolio_id FROM user WHERE username = ?',
            [username]
        );

        const isActivePortfolio = userResult[0].active_portfolio_id === portfolioId;

        // Begin transaction
        await db.query('START TRANSACTION');

        // Delete portfolio (cascading delete will remove holdings and transactions)
        await db.query(
            'DELETE FROM portfolio WHERE id = ?',
            [portfolioId]
        );

        // If it was the active portfolio, set another portfolio as active
        if (isActivePortfolio) {
            const [remainingPortfolios] = await db.query(
                `SELECT id FROM portfolio p
                 JOIN user u ON p.user_id = u.id
                 WHERE u.username = ? LIMIT 1`,
                [username]
            );

            if (remainingPortfolios.length > 0) {
                await db.query(
                    'UPDATE user SET active_portfolio_id = ? WHERE username = ?',
                    [remainingPortfolios[0].id, username]
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