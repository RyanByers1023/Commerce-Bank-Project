import { authService } from './authService.js';
import { stockService } from './stockService.js';
import DatabaseService from './databaseService.js';
import Portfolio from '../models/portfolio.js';
import {simulationService} from "./simulationService";

/**
 * Central service for managing the user profile, portfolio, and stocks
 * This service brings together all the different services to provide
 * a unified interface for the application
 */
export default class UserProfileService {
    constructor() {
        this.dbService = new DatabaseService();
        this.username = null;
        this.email = null;
        this.stocksAddedToSim = [];
        this.portfolio = null;
        this.isInitialized = false;
        this.profileLoadedCallbacks = [];
    }

    /**
     * Initialize the user profile
     * @param {boolean} demoMode - Whether to use demo mode
     * @returns {Promise<Object>} User profile
     */
    async initialize(demoMode = false) {
        try {
            // Check if already initialized
            if (this.isInitialized) {
                return this;
            }

            // Load user data if authenticated
            if (await authService.checkAuthStatus()) {
                await this.loadUserProfile();
            } else if (demoMode) {
                // Create demo profile if not authenticated and in demo mode
                await this.createDemoProfile();
            } else {
                throw new Error('Not authenticated');
            }

            // Load simulation settings
            await simulationService.loadSettings();

            this.isInitialized = true;

            // Notify listeners
            this.notifyProfileLoaded();

            return this;
        } catch (error) {
            console.error('Failed to initialize user profile:', error);
            throw error;
        }
    }

    /**
     * Load user profile from the server
     * @returns {Promise<Object>} User profile
     */
    async loadUserProfile() {
        try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Not authenticated');
            }

            this.username = currentUser.username;
            this.email = currentUser.email;

            // Load stocks
            this.stocksAddedToSim = await stockService.loadStocks();

            // Load active portfolio
            const portfolioData = await this.dbService.getPortfolio(this.username, currentUser.activePortfolioID);

            // Create Portfolio instance
            this.portfolio = new Portfolio(
                portfolioData.initialBalance,
                this.username,
                portfolioData.portfolioID
            );

            // Copy properties from the API data
            this.portfolio.balance = portfolioData.balance;
            this.portfolio.name = portfolioData.name;
            this.portfolio.description = portfolioData.description;
            this.portfolio.holdingsMap = portfolioData.holdingsMap || {};
            this.portfolio.portfolioValue = portfolioData.portfolioValue || 0;
            this.portfolio.totalAssetsValue = portfolioData.totalAssetsValue || portfolioData.balance;

            // Attach buy/sell methods
            this.attachPortfolioMethods();

            return this;
        } catch (error) {
            console.error('Failed to load user profile:', error);
            throw error;
        }
    }

    /**
     * Create a demo profile for guest users
     * @returns {Promise<Object>} Demo profile
     */
    async createDemoProfile() {
        try {
            // Set demo user info
            this.username = 'demo_user';
            this.email = 'demo@example.com';

            // Create a demo portfolio
            this.portfolio = new Portfolio(500.00, this.username);
            this.portfolio.name = 'Demo Portfolio';
            this.portfolio.description = 'Demo portfolio for guest users';

            // Attach buy/sell methods
            this.attachPortfolioMethods();

            // Load sample stocks
            await this.createDemoStocks();

            return this;
        } catch (error) {
            console.error('Failed to create demo profile:', error);
            throw error;
        }
    }

    /**
     * Create demo stocks for the simulation
     * @returns {Promise<Array>} Demo stocks
     */
    async createDemoStocks() {
        try {
            // Add demo stocks data
            const demoStocks = [
                { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 178.72, volatility: 0.018 },
                { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', price: 397.58, volatility: 0.016 },
                { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', price: 145.92, volatility: 0.022 },
                { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', price: 235.45, volatility: 0.035 },
                { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication', price: 157.73, volatility: 0.015 }
            ];

            // Create stock objects
            this.stocksAddedToSim = [];

            for (const stockData of demoStocks) {
                const stock = this.createDemoStock(stockData);
                this.stocksAddedToSim.push(stock);
            }

            return this.stocksAddedToSim;
        } catch (error) {
            console.error('Failed to create demo stocks:', error);
            throw error;
        }
    }

    /**
     * Create a demo stock with given data
     * @param {Object} data - Stock data
     * @returns {Object} Stock object
     */
    createDemoStock(data) {
        const stock = {
            symbol: data.symbol,
            companyName: data.name,
            sector: data.sector,
            marketPrice: data.price,
            priceHistory: [],
            volatility: data.volatility || 0.015,
            currentSentiment: 0,
            previousClosePrice: data.price * (0.99 + Math.random() * 0.02),
            openPrice: data.price * (0.99 + Math.random() * 0.02),
            volume: Math.floor(100000 + Math.random() * 9900000)
        };

        // Generate price history
        this.generatePriceHistory(stock, 50);

        return stock;
    }

    /**
     * Generate realistic price history for a stock
     * @param {Object} stock - Stock object
     * @param {number} days - Number of days to generate
     */
    generatePriceHistory(stock, days) {
        let currentPrice = stock.marketPrice;

        // Add current price
        stock.priceHistory.push(currentPrice);

        // Generate historical prices (going backward)
        for (let i = 1; i < days; i++) {
            // Random daily percentage change based on volatility
            const change = (Math.random() - 0.5) * 2 * stock.volatility;

            // Calculate previous day's price
            currentPrice = currentPrice / (1 + change);

            // Add to the beginning of the array (oldest first)
            stock.priceHistory.unshift(currentPrice);
        }
    }

    /**
     * Attach buy/sell methods to the portfolio
     */
    attachPortfolioMethods() {
        // Attach buy method
        this.portfolio.buyStock = async (stock, quantity) => {
            try {
                if (this.username === 'demo_user') {
                    // For demo user, use local implementation
                    return this.buyStockLocal(stock, quantity);
                }

                // For registered users, use API
                const result = await this.dbService.executeTransaction({
                    portfolioId: this.portfolio.portfolioID,
                    symbol: stock.symbol,
                    transactionType: 'BUY',
                    quantity: quantity,
                    price: stock.marketPrice
                });

                // Update portfolio with new balance
                this.portfolio.balance = result.newBalance;

                // Reload portfolio to get updated holdings
                await this.loadUserProfile();

                return {
                    success: true,
                    message: `Successfully bought ${quantity} shares of ${stock.symbol} for $${(stock.marketPrice * quantity).toFixed(2)}`
                };
            } catch (error) {
                console.error('Failed to buy stock:', error);
                return {
                    success: false,
                    message: `Failed to buy ${quantity} shares of ${stock.symbol}: ${error.message}`
                };
            }
        };

        // Attach sell method
        this.portfolio.sellStock = async (stock, quantity) => {
            try {
                if (this.username === 'demo_user') {
                    // For demo user, use local implementation
                    return this.sellStockLocal(stock, quantity);
                }

                // Check if user has enough shares
                const holding = this.portfolio.holdingsMap[stock.symbol];
                if (!holding || holding.quantity < quantity) {
                    return {
                        success: false,
                        message: `Failed to sell ${quantity} shares of ${stock.symbol}: Insufficient shares`
                    };
                }

                // For registered users, use API
                const result = await this.dbService.executeTransaction({
                    portfolioId: this.portfolio.portfolioID,
                    symbol: stock.symbol,
                    transactionType: 'SELL',
                    quantity: quantity,
                    price: stock.marketPrice
                });

                // Update portfolio with new balance
                this.portfolio.balance = result.newBalance;

                // Reload portfolio to get updated holdings
                await this.loadUserProfile();

                return {
                    success: true,
                    message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${(stock.marketPrice * quantity).toFixed(2)}`
                };
            } catch (error) {
                console.error('Failed to sell stock:', error);
                return {
                    success: false,
                    message: `Failed to sell ${quantity} shares of ${stock.symbol}: ${error.message}`
                };
            }
        };
    }

    /**
     * Local implementation of buy stock for demo users
     * @param {Object} stock - Stock to buy
     * @param {number} quantity - Number of shares to buy
     * @returns {Object} Transaction result
     */
    buyStockLocal(stock, quantity) {
        // Check valid inputs
        if (!stock || isNaN(quantity) || quantity <= 0 || quantity > 10) {
            return {
                success: false,
                message: `Failed to buy ${quantity} shares of ${stock ? stock.symbol : 'unknown'}: Invalid inputs`
            };
        }

        const totalCost = quantity * stock.marketPrice;

        // Check if user has enough cash
        if (totalCost > this.portfolio.balance) {
            return {
                success: false,
                message: `Failed to buy ${quantity} shares of ${stock.symbol}: Insufficient funds`
            };
        }

        // Deduct from balance
        this.portfolio.balance -= totalCost;

        // Add to holdings
        const holding = this.portfolio.holdingsMap[stock.symbol];

        if (holding) {
            // Update existing holding
            const oldCost = holding.avgPrice * holding.quantity;
            const newCost = stock.marketPrice * quantity;
            holding.quantity += quantity;
            holding.avgPrice = (oldCost + newCost) / holding.quantity;
            holding.price = stock.marketPrice;
        } else {
            // Add new holding
            this.portfolio.holdingsMap[stock.symbol] = {
                stock: stock,
                quantity: quantity,
                price: stock.marketPrice,
                avgPrice: stock.marketPrice
            };
        }

        // Update portfolio values
        this.updatePortfolioValues();

        return {
            success: true,
            message: `Successfully bought ${quantity} shares of ${stock.symbol} for $${(stock.marketPrice * quantity).toFixed(2)}`
        };
    }

    /**
     * Local implementation of sell stock for demo users
     * @param {Object} stock - Stock to sell
     * @param {number} quantity - Number of shares to sell
     * @returns {Object} Transaction result
     */
    sellStockLocal(stock, quantity) {
        // Check valid inputs
        if (!stock || isNaN(quantity) || quantity <= 0) {
            return {
                success: false,
                message: `Failed to sell ${quantity} shares of ${stock ? stock.symbol : 'unknown'}: Invalid inputs`
            };
        }

        // Check if user has enough shares
        const holding = this.portfolio.holdingsMap[stock.symbol];
        if (!holding || holding.quantity < quantity) {
            return {
                success: false,
                message: `Failed to sell ${quantity} shares of ${stock.symbol}: Insufficient shares`
            };
        }

        const totalValue = quantity * stock.marketPrice;

        // Add to balance
        this.portfolio.balance += totalValue;

        // Update holdings
        holding.quantity -= quantity;

        // Remove holding if quantity is zero
        if (holding.quantity <= 0) {
            delete this.portfolio.holdingsMap[stock.symbol];
        }

        // Update portfolio values
        this.updatePortfolioValues();

        return {
            success: true,
            message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${(stock.marketPrice * quantity).toFixed(2)}`
        };
    }

    /**
     * Update portfolio value calculations
     */
    updatePortfolioValues() {
        // Calculate portfolio value
        let portfolioValue = 0;
        const holdings = this.portfolio.holdingsMap;

        for (const symbol in holdings) {
            const holding = holdings[symbol];
            portfolioValue += holding.quantity * holding.stock.marketPrice;
        }

        this.portfolio.portfolioValue = portfolioValue;
        this.portfolio.totalAssetsValue = portfolioValue + this.portfolio.balance;
    }

    /**
     * Add a callback for when profile is loaded
     * @param {Function} callback - Function to call when profile is loaded
     * @returns {Function} Function to remove the callback
     */
    onProfileLoaded(callback) {
        if (typeof callback !== 'function') {
            console.error('onProfileLoaded requires a function callback');
            return () => {};
        }

        this.profileLoadedCallbacks.push(callback);

        // Call immediately if already initialized
        if (this.isInitialized) {
            callback(this);
        }

        // Return unsubscribe function
        return () => {
            this.profileLoadedCallbacks = this.profileLoadedCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners that profile is loaded
     */
    notifyProfileLoaded() {
        this.profileLoadedCallbacks.forEach(callback => {
            if (typeof callback === 'function') {
                callback(this);
            }
        });
    }

    /**
     * Reset the user profile
     * @returns {Promise<void>}
     */
    async reset() {
        try {
            this.isInitialized = false;
            this.username = null;
            this.email = null;
            this.stocksAddedToSim = [];
            this.portfolio = null;

            // Clear auth
            await authService.logout();
        } catch (error) {
            console.error('Failed to reset user profile:', error);
            throw error;
        }
    }
}

// Create singleton instance
const userProfileService = new UserProfileService();
export { userProfileService };