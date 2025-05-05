// server/routes/stocks.js (continued)
const express = require('express');
const router = express.Router();
const db = require('../db/database');
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
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Get stocks (system stocks + user's custom stocks)
        const [stocks] = await db.query(
            `SELECT s.stockID, s.symbol, s.companyName, s.sector, s.isCustom, 
              sd.openPrice, sd.closePrice, sd.highPrice, sd.lowPrice, sd.volume,
              (SELECT closePrice FROM stock_data 
               WHERE stockID = s.stockID 
               ORDER BY dataDate DESC LIMIT 1) as marketPrice
       FROM stocks s
       LEFT JOIN stock_data sd ON s.stockID = sd.stockID AND sd.dataDate = CURDATE()
       WHERE s.userID IS NULL OR s.userID = ?
       ORDER BY s.symbol`,
            [userID]
        );

        // For each stock, get recent price history
        for (const stock of stocks) {
            // Get historical price data (last 30 days)
            const [priceHistory] = await db.query(
                `SELECT dataDate, closePrice 
         FROM stock_data 
         WHERE stockID = ? 
         ORDER BY dataDate DESC 
         LIMIT 30`,
                [stock.stockID]
            );

            // Format price history (oldest first)
            stock.priceHistory = priceHistory.reverse().map(p => p.closePrice);

            // Calculate price change
            if (stock.priceHistory.length > 1) {
                const previousClose = stock.priceHistory[stock.priceHistory.length - 2];
                stock.priceChange = stock.marketPrice - previousClose;
                stock.priceChangePercent = (stock.priceChange / previousClose) * 100;
            } else {
                stock.priceChange = 0;
                stock.priceChangePercent = 0;
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
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Get stock
        const [stocks] = await db.query(
            `SELECT s.stockID, s.symbol, s.companyName, s.sector, s.isCustom, 
              sd.openPrice, sd.closePrice, sd.highPrice, sd.lowPrice, sd.volume,
              (SELECT closePrice FROM stock_data 
               WHERE stockID = s.stockID 
               ORDER BY dataDate DESC LIMIT 1) as marketPrice
       FROM stocks s
       LEFT JOIN stock_data sd ON s.stockID = sd.stockID AND sd.dataDate = CURDATE()
       WHERE (s.userID IS NULL OR s.userID = ?) AND s.symbol = ?`,
            [userID, symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const stock = stocks[0];

        // Get historical price data (last 90 days)
        const [priceHistory] = await db.query(
            `SELECT dataDate, openPrice, highPrice, lowPrice, closePrice, volume
       FROM stock_data 
       WHERE stockID = ? 
       ORDER BY dataDate DESC 
       LIMIT 90`,
            [stock.stockID]
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

        // Calculate price change
        if (stock.priceHistory.length > 1) {
            const previousClose = stock.priceHistory[stock.priceHistory.length - 2];
            stock.priceChange = stock.marketPrice - previousClose;
            stock.priceChangePercent = (stock.priceChange / previousClose) * 100;
        } else {
            stock.priceChange = 0;
            stock.priceChangePercent = 0;
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
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Check if symbol already exists in the system stocks or user's custom stocks
        const [existingStocks] = await db.query(
            `SELECT * FROM stocks 
       WHERE symbol = ? AND (userID IS NULL OR userID = ?)`,
            [symbol, userID]
        );

        if (existingStocks.length > 0) {
            return res.status(409).json({ error: 'Stock symbol already exists' });
        }

        // Begin transaction
        await db.query('START TRANSACTION');

        // Add custom stock
        const [result] = await db.query(
            `INSERT INTO stocks (symbol, companyName, sector, isCustom, userID)
       VALUES (?, ?, ?, TRUE, ?)`,
            [symbol, companyName, sector || 'Custom', userID]
        );

        const stockID = result.insertId;

        // Add initial price data
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Slight variation for other price points
        const openPrice = initialPrice * (0.99 + Math.random() * 0.02); // +/- 1%
        const highPrice = Math.max(openPrice, initialPrice) * (1 + Math.random() * 0.01); // Up to 1% higher
        const lowPrice = Math.min(openPrice, initialPrice) * (0.99 - Math.random() * 0.01); // Up to 1% lower
        const volume = Math.floor(10000 + Math.random() * 990000); // Random volume between 10k and 1M

        await db.query(
            `INSERT INTO stock_data (stockID, dataDate, openPrice, highPrice, lowPrice, closePrice, volume)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [stockID, todayStr, openPrice, highPrice, lowPrice, initialPrice, volume]
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
                `INSERT INTO stock_data (stockID, dataDate, openPrice, highPrice, lowPrice, closePrice, volume)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [stockID, dateStr, prevOpen, prevHigh, prevLow, previousPrice, prevVolume]
            );

            currentPrice = previousPrice;
        }

        // Commit transaction
        await db.query('COMMIT');

        // Get the created stock with its data
        const [createdStocks] = await db.query(
            `SELECT s.stockID, s.symbol, s.companyName, s.sector, s.isCustom, 
              ? as marketPrice, ? as openPrice
       FROM stocks s
       WHERE s.stockID = ?`,
            [initialPrice, openPrice, stockID]
        );

        if (createdStocks.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve created stock' });
        }

        const createdStock = createdStocks[0];

        // Get historical price data
        const [priceHistory] = await db.query(
            `SELECT dataDate, closePrice 
       FROM stock_data 
       WHERE stockID = ? 
       ORDER BY dataDate`,
            [stockID]
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
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Check if stock exists and is a custom stock owned by the user
        const [stocks] = await db.query(
            `SELECT s.stockID, s.isCustom FROM stocks s
       WHERE s.symbol = ? AND s.userID = ?`,
            [symbol, userID]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Custom stock not found' });
        }

        const stock = stocks[0];

        if (!stock.isCustom) {
            return res.status(400).json({ error: 'Cannot delete system stock' });
        }

        // Check if user owns any shares of this stock
        const [holdings] = await db.query(
            `SELECT h.holdingID FROM holdings h
       JOIN portfolios p ON h.portfolioID = p.portfolioID
       JOIN stocks s ON h.stockID = s.stockID
       WHERE p.userID = ? AND s.symbol = ? AND h.quantity > 0`,
            [userID, symbol]
        );

        if (holdings.length > 0) {
            return res.status(400).json({ error: 'Cannot delete stock with active holdings' });
        }

        // Delete stock (will cascade to stock_data)
        await db.query(
            'DELETE FROM stocks WHERE stockID = ?',
            [stock.stockID]
        );

        res.json({ message: 'Custom stock deleted successfully' });
    } catch (error) {
        console.error('Delete custom stock error:', error);
        res.status(500).json({ error: 'Failed to delete custom stock' });
    }
});

module.exports = router;