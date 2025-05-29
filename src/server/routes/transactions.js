// server/routes/transactions.js
const express = require('express');
const router = express.Router();

const db = require('../middleware/db');
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
            `SELECT t.id, t.portfolio_id, t.stock_id, t.transaction_type, 
                    t.quantity, t.price_paid, t.total_value, t.timestamp,
                    s.symbol, s.company_name
             FROM transactions t
             JOIN stocks s ON t.stock_id = s.id
             WHERE t.user_id = (SELECT id FROM users WHERE username = ?)
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
            `SELECT p.id FROM portfolios p
             JOIN users u ON p.user_id = u.id
             WHERE u.username = ? AND p.id = ?`,
            [username, portfolioId]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ error: 'Portfolio not found or does not belong to user' });
        }

        // Get transactions
        const [transactions] = await db.query(
            `SELECT t.id, t.portfolio_id, t.stock_id, t.transaction_type,
                    t.quantity, t.price_paid, t.total_value, t.timestamp,
                    s.symbol, s.company_name
             FROM transactions t
             JOIN stocks s ON t.stock_id = s.id
             WHERE t.portfolio_id = ?
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
            `SELECT p.id, u.username, u.id as user_id
             FROM portfolios p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
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
            'SELECT id, value FROM stocks WHERE symbol = ?',
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
            // Check if holding already exists
            const [holdings] = await db.query(
                'SELECT * FROM holdings WHERE portfolio_id = ? AND stock_id = ?',
                [portfolioId, stock.id]
            );

            if (holdings.length > 0) {
                // Update existing holding
                const holding = holdings[0];
                const newQuantity = holding.quantity + quantity;
                const newAvgPrice = ((holding.quantity * holding.avg_price) + totalValue) / newQuantity;

                await db.query(
                    'UPDATE holdings SET quantity = ?, avg_price = ?, price_paid = price_paid + ?, updated_at = NOW() WHERE id = ?',
                    [newQuantity, newAvgPrice, totalValue, holding.id]
                );
            } else {
                // Create new holding
                await db.query(
                    'INSERT INTO holdings (portfolio_id, stock_id, quantity, avg_price, price_paid) VALUES (?, ?, ?, ?, ?)',
                    [portfolioId, stock.id, quantity, price, totalValue]
                );
            }
        } else { // SELL
            // Check if user has enough shares
            const [holdings] = await db.query(
                'SELECT * FROM holdings WHERE portfolio_id = ? AND stock_id = ?',
                [portfolioId, stock.id]
            );

            if (holdings.length === 0 || holdings[0].quantity < quantity) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient shares' });
            }

            const holding = holdings[0];
            const newQuantity = holding.quantity - quantity;

            if (newQuantity > 0) {
                // Update holding
                const soldValue = (quantity * holding.avg_price);
                await db.query(
                    'UPDATE holdings SET quantity = ?, price_paid = price_paid - ?, updated_at = NOW() WHERE id = ?',
                    [newQuantity, soldValue, holding.id]
                );
            } else {
                // Remove holding if no shares left
                await db.query(
                    'DELETE FROM holdings WHERE id = ?',
                    [holding.id]
                );
            }
        }

        // Create transaction record
        const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        await db.query(
            `INSERT INTO transactions 
             (id, portfolio_id, stock_id, transaction_type, quantity, price_paid, total_value, user_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [transactionId, portfolioId, stock.id, transactionType, quantity, price, totalValue, portfolio.user_id]
        );

        // Commit transaction
        await db.query('COMMIT');

        // Return transaction details
        res.status(201).json({
            id: transactionId,
            portfolio_id: portfolioId,
            stock_id: stock.id,
            symbol,
            transaction_type: transactionType,
            quantity,
            price_paid: price,
            total_value: totalValue,
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
            `SELECT t.id, t.portfolio_id, t.stock_id, t.transaction_type, 
                    t.quantity, t.price_paid, t.total_value, t.timestamp,
                    s.symbol, s.company_name, u.username
             FROM transactions t
             JOIN stocks s ON t.stock_id = s.id
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`,
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

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Get basic transaction stats
        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as totalTransactions,
                SUM(CASE WHEN transaction_type = 'BUY' THEN 1 ELSE 0 END) as buyTransactions,
                SUM(CASE WHEN transaction_type = 'SELL' THEN 1 ELSE 0 END) as sellTransactions,
                SUM(CASE WHEN transaction_type = 'BUY' THEN total_value ELSE 0 END) as totalBuyValue,
                SUM(CASE WHEN transaction_type = 'SELL' THEN total_value ELSE 0 END) as totalSellValue
             FROM transactions
             WHERE user_id = ?`,
            [userId]
        );

        // Get transactions by month
        const [monthlyStats] = await db.query(
            `SELECT 
                DATE_FORMAT(timestamp, '%Y-%m') as month,
                COUNT(*) as transactions,
                SUM(CASE WHEN transaction_type = 'BUY' THEN total_value ELSE 0 END) as buyValue,
                SUM(CASE WHEN transaction_type = 'SELL' THEN total_value ELSE 0 END) as sellValue
             FROM transactions
             WHERE user_id = ?
             GROUP BY DATE_FORMAT(timestamp, '%Y-%m')
             ORDER BY month DESC
             LIMIT 12`,
            [userId]
        );

        // Get most traded stocks
        const [topStocks] = await db.query(
            `SELECT 
                s.symbol, s.company_name,
                COUNT(*) as transactions,
                SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END) as buyQuantity,
                SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.quantity ELSE 0 END) as sellQuantity,
                SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_value ELSE 0 END) as buyValue,
                SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.total_value ELSE 0 END) as sellValue
             FROM transactions t
             JOIN stocks s ON t.stock_id = s.id
             WHERE t.user_id = ?
             GROUP BY s.id
             ORDER BY transactions DESC
             LIMIT 10`,
            [userId]
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