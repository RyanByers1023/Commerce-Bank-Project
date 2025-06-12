const express = require('express');
const router = express.Router();

const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Get all stocks available to a user
router.get('/:user_id', auth.verifyToken, async (req, res) => {
    try {
        const { user_id } = req.params; // Fixed: match route parameter name
        const userId = parseInt(user_id); // Convert to number for comparison

        // Verify user is accessing their own data
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to stock data' });
        }

        // Verify user exists
        const [users] = await db.query(
            'SELECT id FROM user WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get stocks (both system stocks and user's custom stocks)
        const [stocks] = await db.query(
            `SELECT s.id, s.symbol, s.company_name, s.sector, s.value
             FROM stock s
             WHERE s.user_id = ? OR s.user_id IS NULL
             ORDER BY s.symbol`,
            [userId]
        );

        res.json(stocks);
    } catch (error) {
        console.error('Get stocks error:', error);
        res.status(500).json({ error: 'Failed to get stocks' });
    }
});

// Get a specific stock
router.get('/:user_id/:symbol', auth.verifyToken, async (req, res) => {
    try {
        const { user_id, symbol } = req.params;
        const userId = parseInt(user_id);

        // Verify user is accessing their own data
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to stock data' });
        }

        // Get stock (prioritize user's custom stocks, fall back to system stocks)
        const [stocks] = await db.query(
            `SELECT s.id, s.symbol, s.company_name, s.sector, s.value
             FROM stock s
             WHERE s.symbol = ? AND (s.user_id = ? OR s.user_id IS NULL)
             ORDER BY s.user_id DESC LIMIT 1`,
            [symbol, userId]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const stock = stocks[0];

        // Set market price from value or default
        stock.marketPrice = stock.value || 100;

        // Since we don't have price history table, set default values
        stock.priceChange = 0;
        stock.priceChangePercent = 0;
        stock.previousClosePrice = stock.marketPrice;
        stock.volatility = 0.015; // Default volatility
        stock.currentSentiment = (Math.random() * 2 - 1) * 0.2; // Random sentiment
        stock.priceHistory = [stock.marketPrice]; // Simple history

        res.json(stock);
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({ error: 'Failed to get stock' });
    }
});

// Add custom stock
router.post('/:user_id', auth.verifyToken, async (req, res) => {
    try {
        const { user_id } = req.params;
        const userId = parseInt(user_id);
        const { symbol, companyName, sector, initialPrice } = req.body;

        // Verify user is adding stock to their own account
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to add custom stock' });
        }

        // Validate input
        if (!symbol || !companyName || !initialPrice) {
            return res.status(400).json({ error: 'Symbol, company name, and initial price are required' });
        }

        // Validate symbol format (1-6 uppercase letters to match schema)
        if (!/^[A-Z]{1,6}$/.test(symbol)) {
            return res.status(400).json({ error: 'Symbol must be 1-6 uppercase letters' });
        }

        // Validate initial price
        if (typeof initialPrice !== 'number' || initialPrice <= 0) {
            return res.status(400).json({ error: 'Initial price must be a positive number' });
        }

        // Verify user exists
        const [users] = await db.query(
            'SELECT id FROM user WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if symbol already exists for this user
        const [existingStocks] = await db.query(
            'SELECT id FROM stock WHERE symbol = ? AND user_id = ?',
            [symbol, userId]
        );

        if (existingStocks.length > 0) {
            return res.status(409).json({ error: 'Stock symbol already exists' });
        }

        // Add custom stock (removed is_custom column since it doesn't exist)
        const [result] = await db.query(
            `INSERT INTO stock (symbol, company_name, sector, user_id, value)
             VALUES (?, ?, ?, ?, ?)`,
            [symbol, companyName, sector || 'Custom', userId, initialPrice]
        );

        const stockId = result.insertId;

        // Get the created stock
        const [createdStocks] = await db.query(
            `SELECT s.id, s.symbol, s.company_name, s.sector, s.value, s.user_id
             FROM stock s
             WHERE s.id = ?`,
            [stockId]
        );

        if (createdStocks.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve created stock' });
        }

        const createdStock = createdStocks[0];
        createdStock.marketPrice = createdStock.value;
        createdStock.volatility = 0.015;
        createdStock.currentSentiment = 0;
        createdStock.priceHistory = [createdStock.value];

        res.status(201).json(createdStock);
    } catch (error) {
        console.error('Add custom stock error:', error);
        res.status(500).json({ error: 'Failed to add custom stock' });
    }
});

// Delete a custom stock
router.delete('/:user_id/:symbol', auth.verifyToken, async (req, res) => {
    try {
        const { user_id, symbol } = req.params;
        const userId = parseInt(user_id);

        // Verify user is deleting their own custom stock
        if (req.user.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to delete custom stock' });
        }

        // Check if stock exists and is owned by the user
        const [stocks] = await db.query(
            `SELECT s.id FROM stock s
             WHERE s.symbol = ? AND s.user_id = ?`,
            [symbol, userId]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Custom stock not found or not owned by user' });
        }

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Custom stock not found or not owned by user' });
        }

        const stock = stocks[0];

        // Check if user owns any shares of this stock
        const [holdings] = await db.query(
            `SELECT h.id FROM holding h
                                  JOIN portfolio p ON h.portfolio_id = p.id
             WHERE p.user_id = ? AND h.stock_id = ? AND h.quantity > 0`,
            [userId, stock.id]
        );

        if (holdings.length > 0) {
            return res.status(400).json({ error: 'Cannot delete stock with active holdings' });
        }

        // Delete stock
        await db.query(
            'DELETE FROM stock WHERE id = ?',
            [stock.id]
        );

        res.json({ message: 'Custom stock deleted successfully' });
    } catch (error) {
        console.error('Delete custom stock error:', error);
        res.status(500).json({ error: 'Failed to delete custom stock' });
    }
});

module.exports = router;