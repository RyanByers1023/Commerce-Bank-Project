// server/routes/transactions.js
const express = require('express');
const router = express.Router();

const db = require('../middleware/db');
const auth = require('../middleware/auth');

// Validation helpers
const validateTransactionInput = (portfolioId, symbol, transactionType, quantity, price) => {
    const errors = [];

    if (!portfolioId || !symbol || !transactionType || !quantity || !price) {
        errors.push('All fields are required');
    }

    if (transactionType !== 'BUY' && transactionType !== 'SELL') {
        errors.push('Transaction type must be BUY or SELL');
    }

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
        errors.push('Quantity must be a positive integer (max 100)');
    }

    if (typeof price !== 'number' || price <= 0) {
        errors.push('Price must be a positive number');
    }

    return errors;
};

// Database helper functions
const getPortfolioWithUser = async (portfolioId) => {
    const [portfolios] = await db.query(
        `SELECT p.id, p.user_id, u.username
         FROM portfolio p
         JOIN user u ON p.user_id = u.id
         WHERE p.id = ?`,
        [portfolioId]
    );
    return portfolios[0] || null;
};

const getStockBySymbol = async (symbol) => {
    const [stocks] = await db.query(
        'SELECT s.id, s.symbol, s.company_name, s.value FROM stock s JOIN user u ON s.user_id = u.id WHERE s.symbol = ?',
        [symbol]
    );
    return stocks[0] || null;
};

const getHolding = async (portfolioId, stockId) => {
    const [holdings] = await db.query(
        'SELECT * FROM holding WHERE portfolio_id = ? AND stock_id = ?',
        [portfolioId, stockId]
    );
    return holdings[0] || null;
};

const updateHolding = async (holdingId, quantity, avgPrice, totalPricePaid) => {
    await db.query(
        'UPDATE holding SET quantity = ?, avg_price_paid = ?, price_paid = ?, updated_at = NOW() WHERE id = ?',
        [quantity, avgPrice, totalPricePaid, holdingId]
    );
};

const createHolding = async (portfolioId, stockId, quantity, avgPrice, totalPricePaid) => {
    await db.query(
        'INSERT INTO holding (portfolio_id, stock_id, quantity, avg_price_paid, price_paid) VALUES (?, ?, ?, ?, ?)',
        [portfolioId, stockId, quantity, avgPrice, totalPricePaid]
    );
};

const deleteHolding = async (holdingId) => {
    await db.query('DELETE FROM holding WHERE id = ?', [holdingId]);
};

const createTransaction = async (portfolioId, stockId, transactionType, quantity, price, totalValue, userId) => {
    const [result] = await db.query(
        `INSERT INTO transaction 
         (portfolio_id, stock_id, transaction_type, quantity, price_paid, total_value, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [portfolioId, stockId, transactionType, quantity, price, totalValue, userId]
    );
    return result.insertId;
};

// Transaction processing logic
const processBuyTransaction = async (portfolioId, stockId, quantity, price, totalValue) => {
    const existingHolding = await getHolding(portfolioId, stockId);

    if (existingHolding) {
        // Update existing holding
        const newQuantity = existingHolding.quantity + quantity;
        const newTotalPaid = existingHolding.price_paid + totalValue;
        const newAvgPrice = newTotalPaid / newQuantity;

        await updateHolding(existingHolding.id, newQuantity, newAvgPrice, newTotalPaid);
    } else {
        // Create new holding
        await createHolding(portfolioId, stockId, quantity, price, totalValue);
    }
};

const processSellTransaction = async (portfolioId, stockId, quantity, price, totalValue) => {
    const existingHolding = await getHolding(portfolioId, stockId);

    if (!existingHolding || existingHolding.quantity < quantity) {
        throw new Error('Insufficient shares');
    }

    const newQuantity = existingHolding.quantity - quantity;
    const soldValue = (quantity * existingHolding.avg_price_paid);

    if (newQuantity > 0) {
        // Update holding
        const newTotalPaid = existingHolding.price_paid - soldValue;
        await updateHolding(existingHolding.id, newQuantity, existingHolding.avg_price_paid, newTotalPaid);
    } else {
        // Remove holding if no shares left
        await deleteHolding(existingHolding.id);
    }
};

// Routes

// Get all transactions for a user
router.get('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Check authorization - users can only access their own data
        if (req.session.userId) {
            const [users] = await db.query('SELECT username FROM user WHERE id = ?', [req.session.userId]);
            if (!users[0] || users[0].username !== username) {
                return res.status(403).json({ error: 'Unauthorized access to transaction data' });
            }
        }

        // Get user ID
        const [users] = await db.query('SELECT id FROM user WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Get transactions
        const [transactions] = await db.query(
            `SELECT t.id, t.portfolio_id, t.stock_id, t.transaction_type, 
                    t.quantity, t.price_paid, t.total_value, t.timestamp,
                    s.symbol, s.company_name
             FROM transaction t
             JOIN stock s ON t.stock_id = s.id
             WHERE t.user_id = ?
             ORDER BY t.timestamp DESC`,
            [userId]
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

        // Check authorization
        if (req.session.userId) {
            const [users] = await db.query('SELECT username FROM user WHERE id = ?', [req.session.userId]);
            if (!users[0] || users[0].username !== username) {
                return res.status(403).json({ error: 'Unauthorized access to transaction data' });
            }
        }

        // Verify portfolio belongs to user
        const [portfolios] = await db.query(
            `SELECT p.id FROM portfolio p
             JOIN user u ON p.user_id = u.id
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
             FROM transaction t
             JOIN stock s ON t.stock_id = s.id
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
        const validationErrors = validateTransactionInput(portfolioId, symbol, transactionType, quantity, price);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0] });
        }

        // Check if portfolio exists and get user info
        const portfolio = await getPortfolioWithUser(portfolioId);
        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        // Verify user owns this portfolio
        if (req.session.userId !== portfolio.user_id) {
            return res.status(403).json({ error: 'Unauthorized access to portfolio' });
        }

        // Get stock information
        const stock = await getStockBySymbol(symbol);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const totalValue = price * quantity;

        // Begin database transaction
        await db.query('START TRANSACTION');

        try {
            // Process the transaction based on type
            if (transactionType === 'BUY') {
                await processBuyTransaction(portfolioId, stock.id, quantity, price, totalValue);
            } else {
                await processSellTransaction(portfolioId, stock.id, quantity, price, totalValue);
            }

            // Create transaction record
            const transactionId = await createTransaction(
                portfolioId,
                stock.id,
                transactionType,
                quantity,
                price,
                totalValue,
                portfolio.user_id
            );

            // Commit transaction
            await db.query('COMMIT');

            // Return transaction details
            res.status(201).json({
                id: transactionId,
                portfolio_id: portfolioId,
                stock_id: stock.id,
                symbol: stock.symbol,
                company_name: stock.company_name,
                transaction_type: transactionType,
                quantity,
                price_paid: price,
                total_value: totalValue,
                timestamp: new Date()
            });

        } catch (processingError) {
            await db.query('ROLLBACK');

            if (processingError.message === 'Insufficient shares') {
                return res.status(400).json({ error: 'Insufficient shares' });
            }
            throw processingError;
        }

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

        // Get transaction with user info
        const [transactions] = await db.query(
            `SELECT t.id, t.portfolio_id, t.stock_id, t.transaction_type, 
                    t.quantity, t.price_paid, t.total_value, t.timestamp,
                    s.symbol, s.company_name, t.user_id
             FROM transaction t
             JOIN stock s ON t.stock_id = s.id
             WHERE t.id = ?`,
            [transactionId]
        );

        if (transactions.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = transactions[0];

        // Verify user owns this transaction
        if (req.session.userId !== transaction.user_id) {
            return res.status(403).json({ error: 'Unauthorized access to transaction data' });
        }

        // Remove user_id from response
        delete transaction.user_id;

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

        // Check authorization
        if (req.session.userId) {
            const [users] = await db.query('SELECT username FROM user WHERE id = ?', [req.session.userId]);
            if (!users[0] || users[0].username !== username) {
                return res.status(403).json({ error: 'Unauthorized access to transaction statistics' });
            }
        }

        // Get user ID
        const [users] = await db.query('SELECT id FROM user WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Get basic transaction stats
        const [stats] = await db.query(
            `SELECT COUNT(*) as totalTransactions,
                    SUM(CASE WHEN transaction_type = 'BUY' THEN 1 ELSE 0 END) as buyTransactions,
                    SUM(CASE WHEN transaction_type = 'SELL' THEN 1 ELSE 0 END) as sellTransactions,
                    SUM(CASE WHEN transaction_type = 'BUY' THEN total_value ELSE 0 END) as totalBuyValue,
                    SUM(CASE WHEN transaction_type = 'SELL' THEN total_value ELSE 0 END) as totalSellValue
             FROM transaction
             WHERE user_id = ?`,
            [userId]
        );

        // Get transactions by month (last 12 months)
        const [monthlyStats] = await db.query(
            `SELECT DATE_FORMAT(timestamp, '%Y-%m') as month,
                    COUNT(*) as transactions,
                    SUM(CASE WHEN transaction_type = 'BUY' THEN total_value ELSE 0 END) as buyValue,
                    SUM(CASE WHEN transaction_type = 'SELL' THEN total_value ELSE 0 END) as sellValue
             FROM transaction
             WHERE user_id = ?
             GROUP BY DATE_FORMAT(timestamp, '%Y-%m')
             ORDER BY month DESC
             LIMIT 12`,
            [userId]
        );

        // Get most traded stocks
        const [topStocks] = await db.query(
            `SELECT s.symbol,
                    s.company_name,
                    COUNT(*)                                               as transactions,
                    SUM(IF(t.transaction_type = 'BUY', t.quantity, 0))     as buyQuantity,
                    SUM(IF(t.transaction_type = 'SELL', t.quantity, 0))    as sellQuantity,
                    SUM(IF(t.transaction_type = 'BUY', t.total_value, 0))  as buyValue,
                    SUM(IF(t.transaction_type = 'SELL', t.total_value, 0)) as sellValue
             FROM transaction t
                      JOIN stock s ON t.stock_id = s.id
             WHERE t.user_id = ?
             GROUP BY s.id, s.symbol, s.company_name
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