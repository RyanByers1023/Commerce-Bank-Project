// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Get all transactions for a user
router.get('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is accessing their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to transaction data' });
        }

        // Get transactions
        const [transactions] = await db.query(
            `SELECT t.transactionID, t.portfolioID, t.stockID, t.transactionType, 
              t.quantity, t.pricePaid, t.totalValue, t.timestamp,
              s.symbol, s.companyName, p.name as portfolioName
       FROM transactions t
       JOIN stocks s ON t.stockID = s.stockID
       JOIN portfolios p ON t.portfolioID = p.portfolioID
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ?
       ORDER BY t.timestamp DESC`,
            [username]
        );

        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Get transactions for a specific portfolio
router.get('/:username/:portfolioId', auth.verifyToken, async (req, res) => {
    try {
        const { username, portfolioId } = req.params;

        // Verify user is accessing their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to transaction data' });
        }

        // Check if portfolio belongs to user
        const [portfolios] = await db.query(
            `SELECT p.portfolioID FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ? AND p.portfolioID = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Get transactions
        const [transactions] = await db.query(
            `SELECT t.transactionID, t.portfolioID, t.stockID, t.transactionType, 
              t.quantity, t.pricePaid, t.totalValue, t.timestamp,
              s.symbol, s.companyName
       FROM transactions t
       JOIN stocks s ON t.stockID = s.stockID
       WHERE t.portfolioID = ?
       ORDER BY t.timestamp DESC`,
            [portfolioId]
        );

        res.json(transactions);
    } catch (error) {
        console.error('Get portfolio transactions error:', error);
        res.status(500).json({ error: 'Failed to get portfolio transactions' });
    }
});

// Create a transaction (buy/sell)
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { portfolioId, symbol, transactionType, quantity, price } = req.body;

        // Validate input
        if (!portfolioId || !symbol || !transactionType || !quantity || !price) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (transactionType !== 'BUY' && transactionType !== 'SELL') {
            return res.status(400).json({ error: 'Transaction type must be BUY or SELL' });
        }

        if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
            return res.status(400).json({ error: 'Quantity must be a positive integer (max 100)' });
        }

        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ error: 'Price must be a positive number' });
        }

        // Check if portfolio belongs to user
        const [portfolios] = await db.query(
            `SELECT p.portfolioID, p.balance, u.username
       FROM portfolios p
       JOIN users u ON p.userID = u.userID
       WHERE p.portfolioID = ?`,
            [portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        const portfolio = portfolios[0];

        // Verify user is working with their own portfolio
        if (req.user.username !== portfolio.username) {
            return res.status(403).json({ error: 'Unauthorized access to portfolio' });
        }

        // Get stock information
        const [stocks] = await db.query(
            'SELECT stockID, marketPrice FROM stocks WHERE symbol = ?',
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const stock = stocks[0];
        const totalValue = price * quantity;

        // Begin transaction
        await db.query('START TRANSACTION');

        // Process based on transaction type
        if (transactionType === 'BUY') {
            // Check if user has enough cash
            if (portfolio.balance < totalValue) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient funds' });
            }

            // Update portfolio balance
            await db.query(
                'UPDATE portfolios SET balance = balance - ? WHERE portfolioID = ?',
                [totalValue, portfolioId]
            );

            // Check if holding already exists
            const [holdings] = await db.query(
                'SELECT * FROM holdings WHERE portfolioID = ? AND stockID = ?',
                [portfolioId, stock.stockID]
            );

            if (holdings.length > 0) {
                // Update existing holding
                const holding = holdings[0];
                const newQuantity = holding.quantity + quantity;
                const newAvgPrice = ((holding.quantity * holding.avgPrice) + totalValue) / newQuantity;

                await db.query(
                    'UPDATE holdings SET quantity = ?, avgPrice = ? WHERE holdingID = ?',
                    [newQuantity, newAvgPrice, holding.holdingID]
                );
            } else {
                // Create new holding
                await db.query(
                    'INSERT INTO holdings (portfolioID, stockID, quantity, avgPrice) VALUES (?, ?, ?, ?)',
                    [portfolioId, stock.stockID, quantity, price]
                );
            }
        } else { // SELL
            // Check if user has enough shares
            const [holdings] = await db.query(
                'SELECT * FROM holdings WHERE portfolioID = ? AND stockID = ?',
                [portfolioId, stock.stockID]
            );

            if (holdings.length === 0 || holdings[0].quantity < quantity) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient shares' });
            }

            const holding = holdings[0];

            // Update portfolio balance
            await db.query(
                'UPDATE portfolios SET balance = balance + ? WHERE portfolioID = ?',
                [totalValue, portfolioId]
            );

            // Update holding
            const newQuantity = holding.quantity - quantity;
            if (newQuantity > 0) {
                await db.query(
                    'UPDATE holdings SET quantity = ? WHERE holdingID = ?',
                    [newQuantity, holding.holdingID]
                );
            } else {
                // Remove holding if no shares left
                await db.query(
                    'DELETE FROM holdings WHERE holdingID = ?',
                    [holding.holdingID]
                );
            }
        }

        // Create transaction record
        const transactionID = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        await db.query(
            `INSERT INTO transactions 
       (transactionID, portfolioID, stockID, transactionType, quantity, pricePaid, totalValue) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [transactionID, portfolioId, stock.stockID, transactionType, quantity, price, totalValue]
        );

        // Commit transaction
        await db.query('COMMIT');

        // Get updated portfolio balance
        const [updatedPortfolios] = await db.query(
            'SELECT balance FROM portfolios WHERE portfolioID = ?',
            [portfolioId]
        );

        // Return transaction details
        res.status(201).json({
            transactionID,
            portfolioId,
            symbol,
            transactionType,
            quantity,
            price,
            totalValue,
            newBalance: updatedPortfolios[0].balance,
            timestamp: new Date()
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

// Get a specific transaction
router.get('/details/:transactionId', auth.verifyToken, async (req, res) => {
    try {
        const { transactionId } = req.params;

        // Get transaction
        const [transactions] = await db.query(
            `SELECT t.transactionID, t.portfolioID, t.stockID, t.transactionType, 
              t.quantity, t.pricePaid, t.totalValue, t.timestamp,
              s.symbol, s.companyName, p.name as portfolioName, u.username
       FROM transactions t
       JOIN stocks s ON t.stockID = s.stockID
       JOIN portfolios p ON t.portfolioID = p.portfolioID
       JOIN users u ON p.userID = u.userID
       WHERE t.transactionID = ?`,
            [transactionId]
        );

        if (transactions.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = transactions[0];

        // Verify user is accessing their own transaction
        if (req.user.username !== transaction.username) {
            return res.status(403).json({ error: 'Unauthorized access to transaction data' });
        }

        // Remove username from response
        delete transaction.username;

        res.json(transaction);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Failed to get transaction' });
    }
});

// Get transaction statistics
router.get('/:username/stats', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is accessing their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to transaction statistics' });
        }

        // Get basic transaction stats
        const [stats] = await db.query(
            `SELECT 
         COUNT(*) as totalTransactions,
         SUM(CASE WHEN transactionType = 'BUY' THEN 1 ELSE 0 END) as buyTransactions,
         SUM(CASE WHEN transactionType = 'SELL' THEN 1 ELSE 0 END) as sellTransactions,
         SUM(CASE WHEN transactionType = 'BUY' THEN totalValue ELSE 0 END) as totalBuyValue,
         SUM(CASE WHEN transactionType = 'SELL' THEN totalValue ELSE 0 END) as totalSellValue
       FROM transactions t
       JOIN portfolios p ON t.portfolioID = p.portfolioID
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ?`,
            [username]
        );

        // Get transactions by month
        const [monthlyStats] = await db.query(
            `SELECT 
         DATE_FORMAT(timestamp, '%Y-%m') as month,
         COUNT(*) as transactions,
         SUM(CASE WHEN transactionType = 'BUY' THEN totalValue ELSE 0 END) as buyValue,
         SUM(CASE WHEN transactionType = 'SELL' THEN totalValue ELSE 0 END) as sellValue
       FROM transactions t
       JOIN portfolios p ON t.portfolioID = p.portfolioID
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ?
       GROUP BY DATE_FORMAT(timestamp, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
            [username]
        );

        // Get most traded stocks
        const [topStocks] = await db.query(
            `SELECT 
         s.symbol, s.companyName,
         COUNT(*) as transactions,
         SUM(CASE WHEN transactionType = 'BUY' THEN quantity ELSE 0 END) as buyQuantity,
         SUM(CASE WHEN transactionType = 'SELL' THEN quantity ELSE 0 END) as sellQuantity,
         SUM(CASE WHEN transactionType = 'BUY' THEN totalValue ELSE 0 END) as buyValue,
         SUM(CASE WHEN transactionType = 'SELL' THEN totalValue ELSE 0 END) as sellValue
       FROM transactions t
       JOIN stocks s ON t.stockID = s.stockID
       JOIN portfolios p ON t.portfolioID = p.portfolioID
       JOIN users u ON p.userID = u.userID
       WHERE u.username = ?
       GROUP BY s.stockID
       ORDER BY transactions DESC
       LIMIT 10`,
            [username]
        );

        res.json({
            summary: stats[0],
            monthlyActivity: monthlyStats,
            topStocks: topStocks
        });
    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({ error: 'Failed to get transaction statistics' });
    }
});

module.exports = router;