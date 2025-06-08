import Portfolio from './portfolio.js';
import {databaseService} from '../dbServices/databaseService.js';

//FIXME: IDE states this class is never used, check this
class UserProfile {
    constructor(userData = null) {
        this.stocksAddedToSim = [];
        this.username = "";
        this.email = "";
        this.portfolio = null;

        // Initialize database manager
        this.dbService = databaseService;

        if (userData) {
            // Initialize from existing user data
            this.username = userData.username;
            this.email = userData.email;
            this.portfolio = userData.portfolio || new Portfolio();
            this.stocksAddedToSim = userData.stocksAddedToSim || [];
        } else {
            // Create new user with default portfolio
            this.portfolio = new Portfolio();
        }
    }

    // Load user data from database
    async loadUserData() {
        if (!this.username) {
            throw new Error('Cannot load user data: No username');
        }

        try {
            // Get user data
            const userData = await this.dbService.loadUserProfile(this.username);

            // Get stocks for simulation
            const stocks = await this.dbService.sendRequest(`stocks/${this.username}`);
            this.stocksAddedToSim = stocks || [];

            // Get active portfolio
            const portfolios = await this.dbService.sendRequest(`portfolios/${this.username}`);
            if (portfolios && portfolios.length > 0) {
                // Find active portfolio
                this.portfolio = portfolios.find(p => p.id === userData.activePortfolioId) || portfolios[0];
            } else {
                // Create default portfolio if none exists
                const multiPortfolioManager = new MultiPortfolioManager(this);
                await multiPortfolioManager.createPortfolio('My First Portfolio');
            }

            return this;
        } catch (error) {
            console.error('Failed to load user data:', error);
            throw error;
        }
    }

    // Buy stock method with database integration
    async buyStock(stock, quantity) {
        try {
            // Pre-transaction validation
            if (isNaN(quantity) || quantity <= 0 || quantity > 10 || !stock) {
                return { success: false, message: 'Invalid quantity or stock' };
            }

            const totalCost = quantity * stock.marketPrice;

            // Check if user has enough cash
            if (totalCost > this.portfolio.balance) {
                return { success: false, message: 'Insufficient funds for purchase' };
            }

            // Create transaction object
            const transaction = {
                transactionID: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                portfolioID: this.portfolio.id,
                stockID: stock.id || null,
                symbol: stock.symbol,
                companyName: stock.companyName,
                transactionType: 'BUY',
                quantity: quantity,
                pricePaid: stock.marketPrice,
                totalValue: totalCost,
                timestamp: new Date()
            };

            // Record transaction in database
            await this.dbService.executeTransaction(transaction);

            // Update portfolio
            const portfolioUpdate = {
                balance: this.portfolio.balance - totalCost
            };
            await this.dbService.sendRequest(`portfolios/${this.username}/${this.portfolio.id}`, 'PUT', portfolioUpdate);

            // Update holdings
            const holding = this.portfolio.holdingsMap[stock.symbol];
            let newQuantity, newAvgPrice;

            if (holding) {
                // Update existing holding
                const oldCost = holding.avgPrice * holding.quantity;
                const newCost = stock.marketPrice * quantity;
                newQuantity = holding.quantity + quantity;
                newAvgPrice = (oldCost + newCost) / newQuantity;
            } else {
                // New holding
                newQuantity = quantity;
                newAvgPrice = stock.marketPrice;
            }

            // Update holdings in database
            await this.dbService.sendRequest(`holdings/${this.username}/${this.portfolio.id}/${stock.symbol}`, 'PUT', {
                quantity: newQuantity,
                avgPrice: newAvgPrice
            });

            // Update local state
            if (holding) {
                holding.quantity = newQuantity;
                holding.avgPrice = newAvgPrice;
            } else {
                this.portfolio.holdingsMap[stock.symbol] = {
                    stock: stock,
                    quantity: newQuantity,
                    avgPrice: newAvgPrice
                };
            }
            this.portfolio.balance -= totalCost;

            // Update transaction history
            if (!this.portfolio.transactionHistory) {
                this.portfolio.transactionHistory = [];
            }
            this.portfolio.transactionHistory.push(transaction);

            return { success: true, message: `Successfully purchased ${quantity} shares of ${stock.symbol}` };
        } catch (error) {
            console.error('Buy stock failed:', error);
            return { success: false, message: 'Transaction failed: ' + (error.message || 'Unknown error') };
        }
    }

    // Add sell stock method with database integration
    async sellStock(stock, quantity) {
        try {
            // Pre-transaction validation
            if (isNaN(quantity) || quantity <= 0 || !stock) {
                return { success: false, message: 'Invalid quantity or stock' };
            }

            const holding = this.portfolio.holdingsMap[stock.symbol];

            // Check if user owns the stock and has enough shares
            if (!holding || holding.quantity < quantity) {
                return { success: false, message: 'Insufficient shares for sale' };
            }

            const totalValue = quantity * stock.marketPrice;

            // Create transaction object
            const transaction = {
                transactionID: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                portfolioID: this.portfolio.id,
                stockID: stock.id || null,
                symbol: stock.symbol,
                companyName: stock.companyName,
                transactionType: 'SELL',
                quantity: quantity,
                pricePaid: stock.marketPrice,
                totalValue: totalValue,
                timestamp: new Date()
            };

            // Record transaction in database
            await this.dbService.recordTransaction(transaction);

            // Update portfolio
            const portfolioUpdate = {
                balance: this.portfolio.balance + totalValue
            };
            await this.dbService.sendRequest(`portfolios/${this.username}/${this.portfolio.id}`, 'PUT', portfolioUpdate);

            // Update holdings
            const newQuantity = holding.quantity - quantity;

            if (newQuantity > 0) {
                // Update existing holding
                await this.dbService.sendRequest(`holdings/${this.username}/${this.portfolio.id}/${stock.symbol}`, 'PUT', {
                    quantity: newQuantity
                });

                // Update local state
                holding.quantity = newQuantity;
            } else {
                // Remove holding
                await this.dbService.sendRequest(`holdings/${this.username}/${this.portfolio.id}/${stock.symbol}`, 'DELETE');

                // Update local state
                delete this.portfolio.holdingsMap[stock.symbol];
            }

            this.portfolio.balance += totalValue;

            // Update transaction history
            if (!this.portfolio.transactionHistory) {
                this.portfolio.transactionHistory = [];
            }
            this.portfolio.transactionHistory.push(transaction);

            return { success: true, message: `Successfully sold ${quantity} shares of ${stock.symbol}` };
        } catch (error) {
            console.error('Sell stock failed:', error);
            return { success: false, message: 'Transaction failed: ' + (error.message || 'Unknown error') };
        }
    }

    // Add stock to simulation
    async addStockToSim(stock) {
        try {
            // Check if stock is already in simulation
            const existingStock = this.stocksAddedToSim.find(s => s.symbol === stock.symbol);
            if (existingStock) {
                return existingStock;
            }

            // Add to database
            await this.dbService.sendRequest(`user-stocks/${this.username}`, 'POST', {
                symbol: stock.symbol
            });

            // Add to local list
            this.stocksAddedToSim.push(stock);

            return stock;
        } catch (error) {
            console.error('Failed to add stock to simulation:', error);
            throw error;
        }
    }
}