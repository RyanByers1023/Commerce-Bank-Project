// server/routes/stocks.js - FIXED VERSION
const express = require('express');
const router = express.Router();

const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Get all stocks available to a user
router.get('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is accessing their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to stock data' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Get stocks (system stocks + user's custom stocks)
        const [stocks] = await db.query(
            `SELECT s.id, s.symbol, s.company_name, s.sector, s.is_custom,
                    (SELECT closePrice FROM stock_data 
                     WHERE stock_id = s.id 
                     ORDER BY dataDate DESC LIMIT 1) as marketPrice,
                    (SELECT openPrice FROM stock_data 
                     WHERE stock_id = s.id 
                     ORDER BY dataDate DESC LIMIT 1) as openPrice,
                    (SELECT volume FROM stock_data 
                     WHERE stock_id = s.id 
                     ORDER BY dataDate DESC LIMIT 1) as volume
             FROM stock s
             WHERE s.user_id IS NULL OR s.user_id = ?
             ORDER BY s.symbol`,
            [userId]
        );

        // For each stock, get recent price history
        for (const stock of stocks) {
            // Get historical price data (last 30 days)
            const [priceHistory] = await db.query(
                `SELECT dataDate, closePrice 
                 FROM stock_data 
                 WHERE stock_id = ? 
                 ORDER BY dataDate DESC 
                 LIMIT 30`,
                [stock.id]
            );

            // Format price history (oldest first)
            stock.priceHistory = priceHistory.reverse().map(p => p.closePrice);

            // Set value property for compatibility
            stock.value = stock.marketPrice || 100;

            // Calculate price change
            if (stock.priceHistory.length > 1) {
                const previousClose = stock.priceHistory[stock.priceHistory.length - 2];
                stock.priceChange = stock.marketPrice - previousClose;
                stock.priceChangePercent = (stock.priceChange / previousClose) * 100;
                stock.previousClosePrice = previousClose;
            } else {
                stock.priceChange = 0;
                stock.priceChangePercent = 0;
                stock.previousClosePrice = stock.marketPrice;
            }

            // Estimate volatility based on price history
            if (stock.priceHistory.length > 2) {
                const returns = [];
                for (let i = 1; i < stock.priceHistory.length; i++) {
                    returns.push((stock.priceHistory[i] - stock.priceHistory[i-1]) / stock.priceHistory[i-1]);
                }

                // Calculate standard deviation of returns
                const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
                const squaredDiffs = returns.map(val => Math.pow(val - avgReturn, 2));
                const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / returns.length;
                stock.volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
            } else {
                stock.volatility = 0.015; // Default volatility if not enough history
            }

            // Add sentiment value (randomly initialized)
            stock.currentSentiment = (Math.random() * 2 - 1) * 0.2; // Between -0.2 and 0.2
        }

        res.json(stocks);
    } catch (error) {
        console.error('Get stocks error:', error);
        res.status(500).json({ error: 'Failed to get stocks' });
    }
});

// Get a specific stock
router.get('/:username/:symbol', auth.verifyToken, async (req, res) => {
    try {
        const { username, symbol } = req.params;

        // Verify user is accessing their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to stock data' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Get stock
        const [stocks] = await db.query(
            `SELECT s.id, s.symbol, s.company_name, s.sector, s.is_custom,
                    (SELECT closePrice FROM stock_data 
                     WHERE stock_id = s.id 
                     ORDER BY dataDate DESC LIMIT 1) as marketPrice,
                    (SELECT openPrice FROM stock_data 
                     WHERE stock_id = s.id 
                     ORDER BY dataDate DESC LIMIT 1) as openPrice,
                    (SELECT volume FROM stock_data 
                     WHERE stock_id = s.id 
                     ORDER BY dataDate DESC LIMIT 1) as volume
             FROM stock s
             WHERE (s.user_id IS NULL OR s.user_id = ?) AND s.symbol = ?`,
            [userId, symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const stock = stocks[0];

        // Get historical price data (last 90 days)
        const [priceHistory] = await db.query(
            `SELECT dataDate, openPrice, highPrice, lowPrice, closePrice, volume
             FROM stock_data 
             WHERE stock_id = ? 
             ORDER BY dataDate DESC 
             LIMIT 90`,
            [stock.id]
        );

        // Format price history (oldest first)
        stock.priceData = priceHistory.reverse().map(p => ({
            date: p.dataDate,
            open: p.openPrice,
            high: p.highPrice,
            low: p.lowPrice,
            close: p.closePrice,
            volume: p.volume
        }));

        stock.priceHistory = stock.priceData.map(p => p.close);

        // Set value property for compatibility
        stock.value = stock.marketPrice || 100;

        // Calculate price change
        if (stock.priceHistory.length > 1) {
            const previousClose = stock.priceHistory[stock.priceHistory.length - 2];
            stock.priceChange = stock.marketPrice - previousClose;
            stock.priceChangePercent = (stock.priceChange / previousClose) * 100;
            stock.previousClosePrice = previousClose;
        } else {
            stock.priceChange = 0;
            stock.priceChangePercent = 0;
            stock.previousClosePrice = stock.marketPrice;
        }

        // Calculate volatility
        if (stock.priceHistory.length > 2) {
            const returns = [];
            for (let i = 1; i < stock.priceHistory.length; i++) {
                returns.push((stock.priceHistory[i] - stock.priceHistory[i-1]) / stock.priceHistory[i-1]);
            }

            // Calculate standard deviation of returns
            const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
            const squaredDiffs = returns.map(val => Math.pow(val - avgReturn, 2));
            const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / returns.length;
            stock.volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
        } else {
            stock.volatility = 0.015; // Default volatility if not enough history
        }

        // Add sentiment value (randomly initialized)
        stock.currentSentiment = (Math.random() * 2 - 1) * 0.2; // Between -0.2 and 0.2

        res.json(stock);
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({ error: 'Failed to get stock' });
    }
});

// Add custom stock
router.post('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { symbol, companyName, sector, initialPrice, volatility = 0.015 } = req.body;

        // Verify user is adding stock to their own account
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to add custom stock' });
        }

        // Validate input
        if (!symbol || !companyName || !initialPrice) {
            return res.status(400).json({ error: 'Symbol, company name, and initial price are required' });
        }

        // Validate symbol format (1-5 uppercase letters)
        if (!/^[A-Z]{1,5}$/.test(symbol)) {
            return res.status(400).json({ error: 'Symbol must be 1-5 uppercase letters' });
        }

        // Validate initial price
        if (typeof initialPrice !== 'number' || initialPrice <= 0) {
            return res.status(400).json({ error: 'Initial price must be a positive number' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Check if symbol already exists in the system stocks or user's custom stocks
        const [existingStocks] = await db.query(
            `SELECT * FROM stock 
             WHERE symbol = ? AND (user_id IS NULL OR user_id = ?)`,
            [symbol, userId]
        );

        if (existingStocks.length > 0) {
            return res.status(409).json({ error: 'Stock symbol already exists' });
        }

        // Begin transaction
        await db.query('START TRANSACTION');

        // Add custom stock
        const [result] = await db.query(
            `INSERT INTO stock (symbol, company_name, sector, is_custom, user_id)
             VALUES (?, ?, ?, TRUE, ?)`,
            [symbol, companyName, sector || 'Custom', userId]
        );

        const stockId = result.insertId;

        // Add initial price data
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Slight variation for other price points
        const openPrice = initialPrice * (0.99 + Math.random() * 0.02); // +/- 1%
        const highPrice = Math.max(openPrice, initialPrice) * (1 + Math.random() * 0.01); // Up to 1% higher
        const lowPrice = Math.min(openPrice, initialPrice) * (0.99 - Math.random() * 0.01); // Up to 1% lower
        const volume = Math.floor(10000 + Math.random() * 990000); // Random volume between 10k and 1M

        await db.query(
            `INSERT INTO stock_data (stock_id, dataDate, openPrice, highPrice, lowPrice, closePrice, volume)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [stockId, todayStr, openPrice, highPrice, lowPrice, initialPrice, volume]
        );

        // Generate historical data (30 days)
        let currentPrice = initialPrice;
        for (let i = 1; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Random daily change based on volatility
            const dailyChange = (Math.random() * 2 - 1) * volatility / Math.sqrt(252);
            const previousPrice = currentPrice / (1 + dailyChange);

            // Variation for other price points
            const prevOpen = previousPrice * (0.99 + Math.random() * 0.02);
            const prevHigh = Math.max(prevOpen, previousPrice) * (1 + Math.random() * 0.01);
            const prevLow = Math.min(prevOpen, previousPrice) * (0.99 - Math.random() * 0.01);
            const prevVolume = Math.floor(10000 + Math.random() * 990000);

            await db.query(
                `INSERT INTO stock_data (stock_id, dataDate, openPrice, highPrice, lowPrice, closePrice, volume)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [stockId, dateStr, prevOpen, prevHigh, prevLow, previousPrice, prevVolume]
            );

            currentPrice = previousPrice;
        }

        // Commit transaction
        await db.query('COMMIT');

        // Get the created stock with its data
        const [createdStocks] = await db.query(
            `SELECT s.id, s.symbol, s.company_name, s.sector, s.is_custom, 
                    ? as marketPrice, ? as value, ? as openPrice
             FROM stock s
             WHERE s.id = ?`,
            [initialPrice, initialPrice, openPrice, stockId]
        );

        if (createdStocks.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve created stock' });
        }

        const createdStock = createdStocks[0];

        // Get historical price data
        const [priceHistory] = await db.query(
            `SELECT dataDate, closePrice 
             FROM stock_data 
             WHERE stock_id = ? 
             ORDER BY dataDate`,
            [stockId]
        );

        createdStock.priceHistory = priceHistory.map(p => p.closePrice);
        createdStock.volatility = volatility;
        createdStock.currentSentiment = 0;

        res.status(201).json(createdStock);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Add custom stock error:', error);
        res.status(500).json({ error: 'Failed to add custom stock' });
    }
});

// Delete a custom stock
router.delete('/:username/:symbol', auth.verifyToken, async (req, res) => {
    try {
        const { username, symbol } = req.params;

        // Verify user is deleting their own custom stock
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to delete custom stock' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Check if stock exists and is a custom stock owned by the user
        const [stocks] = await db.query(
            `SELECT s.id, s.is_custom FROM stock s
             WHERE s.symbol = ? AND s.user_id = ?`,
            [symbol, userId]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Custom stock not found' });
        }

        const stock = stocks[0];

        if (!stock.is_custom) {
            return res.status(400).json({ error: 'Cannot delete system stock' });
        }

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

        // Delete stock (will cascade to stock_data)
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