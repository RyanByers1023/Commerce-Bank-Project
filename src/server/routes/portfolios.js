// server/routes/portfolios.js - FIXED VERSION
const express = require('express');
const router = express.Router();

const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Get all portfolios for a user
router.get('/:user_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;

        // Get user's portfolios
        const [portfolios] = await db.query(
            `SELECT p.id, p.user_id, p.cash_balance, p.name
             FROM portfolio p
             WHERE p.user_id = ?
             ORDER BY p.name`,
            [user_id]
        );

        if (portfolios.length === 0) {
            return res.json([]);
        }

        // For each portfolio, get total value of holdings
        for (const portfolio of portfolios) {
            // Get holdings with current stock prices from stock table
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
                portfolioValue += holding.quantity * (holding.current_price || 0);
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
router.get('/:user_id/:portfolio_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id, portfolio_id } = req.params;

        // Get portfolio
        const [portfolios] = await db.query(
            `SELECT p.id, p.user_id, p.cash_balance, p.name
             FROM portfolio p
             WHERE p.user_id = ? AND p.id = ?`,
            [user_id, portfolio_id]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        const portfolio = portfolios[0];

        // Get holdings with current prices from stock table
        const [holdings] = await db.query(
            `SELECT h.quantity, h.avg_price_paid, h.price_paid, 
                    s.id as stock_id, s.symbol, s.company_name, s.sector, s.value as current_price
             FROM holding h
             JOIN stock s ON h.stock_id = s.id
             WHERE h.portfolio_id = ?`,
            [portfolio_id]
        );

        // Format holdings
        const holdingsMap = {};
        let portfolioValue = 0;

        for (const holding of holdings) {
            const currentPrice = holding.current_price || 0;
            const value = holding.quantity * currentPrice;
            portfolioValue += value;

            holdingsMap[holding.symbol] = {
                stockId: holding.stock_id,
                symbol: holding.symbol,
                companyName: holding.company_name,
                sector: holding.sector,
                quantity: holding.quantity,
                avgPrice: holding.avg_price_paid,
                totalPricePaid: holding.price_paid,
                currentPrice: currentPrice,
                currentValue: value,
                profitLoss: value - holding.price_paid,
                percentChange: holding.price_paid > 0 ? ((value - holding.price_paid) / holding.price_paid) * 100 : 0
            };
        }

        portfolio.portfolioValue = portfolioValue;
        portfolio.holdingsMap = holdingsMap;
        portfolio.balance = portfolio.cash_balance; // Add balance alias
        portfolio.totalAssetsValue = portfolioValue + portfolio.cash_balance;

        res.json(portfolio);
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Failed to get portfolio' });
    }
});

// Create a new portfolio
router.post('/:user_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;
        const { name = 'Portfolio', initialBalance = 500.00 } = req.body;

        // Validate input
        if (typeof initialBalance !== 'number' || initialBalance < 100 || initialBalance > 10000) {
            return res.status(400).json({ error: 'Initial balance must be between 100 and 10000' });
        }

        // Verify user exists
        const [users] = await db.query(
            'SELECT id FROM user WHERE id = ?',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create portfolio
        const [result] = await db.query(
            'INSERT INTO portfolio (user_id, name, cash_balance) VALUES (?, ?, ?)',
            [user_id, name, initialBalance]
        );

        const portfolioId = result.insertId;

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
            name: portfolio.name,
            balance: portfolio.cash_balance,
            portfolioValue: 0,
            holdingsMap: {}
        });
    } catch (error) {
        console.error('Create portfolio error:', error);
        res.status(500).json({ error: 'Failed to create portfolio' });
    }
});

// Update a portfolio
router.put('/:user_id/:portfolio_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id, portfolio_id } = req.params;
        const { name, cash_balance } = req.body;

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            'SELECT id FROM portfolio WHERE user_id = ? AND id = ?',
            [user_id, portfolio_id]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (cash_balance !== undefined) {
            if (typeof cash_balance !== 'number' || cash_balance < 0) {
                return res.status(400).json({ error: 'Cash balance must be a non-negative number' });
            }
            updates.cash_balance = cash_balance;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid update fields provided' });
        }

        // Update portfolio
        const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const updateValues = [...Object.values(updates), portfolio_id];

        await db.query(
            `UPDATE portfolio SET ${updateFields} WHERE id = ?`,
            updateValues
        );

        res.json({ message: 'Portfolio updated successfully' });
    } catch (error) {
        console.error('Update portfolio error:', error);
        res.status(500).json({ error: 'Failed to update portfolio' });
    }
});

// Reset a portfolio (clear all holdings and transactions)
router.post('/:user_id/:portfolio_id/reset', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id, portfolio_id } = req.params;
        const { initialBalance } = req.body;

        // Begin transaction
        await db.query('START TRANSACTION');

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            'SELECT id, cash_balance FROM portfolio WHERE user_id = ? AND id = ?',
            [user_id, portfolio_id]
        );

        if (portfolios.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Delete all holdings for this portfolio
        await db.query(
            'DELETE FROM holding WHERE portfolio_id = ?',
            [portfolio_id]
        );

        // Delete all transactions for this portfolio
        await db.query(
            'DELETE FROM transaction WHERE portfolio_id = ?',
            [portfolio_id]
        );

        // Reset cash balance if provided
        if (initialBalance !== undefined) {
            if (typeof initialBalance !== 'number' || initialBalance < 100 || initialBalance > 10000) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Initial balance must be between 100 and 10000' });
            }

            await db.query(
                'UPDATE portfolio SET cash_balance = ? WHERE id = ?',
                [initialBalance, portfolio_id]
            );
        }

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
router.delete('/:user_id/:portfolio_id', auth.verifyToken, auth.isUserOrAdmin, async (req, res) => {
    try {
        const { user_id, portfolio_id } = req.params;

        // Check if portfolio exists and belongs to user
        const [portfolios] = await db.query(
            'SELECT id FROM portfolio WHERE user_id = ? AND id = ?',
            [user_id, portfolio_id]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Check if it's the only portfolio
        const [countResult] = await db.query(
            'SELECT COUNT(*) as portfolio_count FROM portfolio WHERE user_id = ?',
            [user_id]
        );

        if (countResult[0].portfolio_count <= 1) {
            return res.status(400).json({ error: 'Cannot delete the only portfolio' });
        }

        // Check if it's the active portfolio
        const [userResult] = await db.query(
            'SELECT active_portfolio_id FROM user WHERE id = ?',
            [user_id]
        );

        const isActivePortfolio = userResult[0].active_portfolio_id == portfolio_id;

        // Begin transaction
        await db.query('START TRANSACTION');

        // Delete holdings first (due to foreign key constraints)
        await db.query(
            'DELETE FROM holding WHERE portfolio_id = ?',
            [portfolio_id]
        );

        // Delete transactions
        await db.query(
            'DELETE FROM transaction WHERE portfolio_id = ?',
            [portfolio_id]
        );

        // Delete portfolio
        await db.query(
            'DELETE FROM portfolio WHERE id = ?',
            [portfolio_id]
        );

        // If it was the active portfolio, set another portfolio as active
        if (isActivePortfolio) {
            const [remainingPortfolios] = await db.query(
                'SELECT id FROM portfolio WHERE user_id = ? LIMIT 1',
                [user_id]
            );

            if (remainingPortfolios.length > 0) {
                await db.query(
                    'UPDATE user SET active_portfolio_id = ? WHERE id = ?',
                    [remainingPortfolios[0].id, user_id]
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