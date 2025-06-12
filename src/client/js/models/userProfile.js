import Portfolio from './portfolio.js';
import Stock from './stock.js';
import { userService } from '../dbServices/userProfileService.js';
import { portfolioService } from '../dbServices/portfolioService.js';
import { stockService } from '../dbServices/stockService.js';

/**
 * Modern UserProfile model with service integration and event-driven architecture
 * Manages user data, preferences, and multiple portfolios
 */
class UserProfile {
    constructor(userData = null) {
        // Core user properties
        this.id = userData?.id || null;
        this.username = userData?.username || '';
        this.email = userData?.email || '';
        this.firstName = userData?.firstName || userData?.first_name || '';
        this.lastName = userData?.lastName || userData?.last_name || '';
        this.displayName = userData?.displayName || userData?.display_name || '';

        // User preferences
        this.preferences = {
            theme: userData?.preferences?.theme || 'light',
            currency: userData?.preferences?.currency || 'USD',
            notifications: userData?.preferences?.notifications || true,
            autoRefresh: userData?.preferences?.autoRefresh || true,
            defaultPortfolioId: userData?.preferences?.defaultPortfolioId || null,
            ...userData?.preferences
        };

        // Portfolio management
        this.activePortfolio = null;
        this.portfolios = new Map(); // Map of portfolio ID -> Portfolio instance
        this.portfolioIds = userData?.portfolioIds || [];

        // Stock simulation data
        this.stocksAddedToSim = userData?.stocksAddedToSim || [];
        this.watchlist = userData?.watchlist || [];
        this.stockPreferences = userData?.stockPreferences || {};

        // Account status
        this.accountStatus = userData?.accountStatus || 'active';
        this.membershipLevel = userData?.membershipLevel || 'basic';
        this.createdAt = userData?.createdAt ? new Date(userData.createdAt) : new Date();
        this.lastLoginAt = userData?.lastLoginAt ? new Date(userData.lastLoginAt) : null;

        // State management
        this.isLoading = false;
        this.lastUpdated = null;
        this.loadingStates = new Map(); // Track loading states for different operations

        // Caching
        this.dataCache = new Map();
        this.stockCache = new Map();
        this.lastDataSync = null;

        // Event listeners
        this.changeListeners = [];
        this.portfolioListeners = [];
        this.transactionListeners = [];

        // Service references
        this.userService = userService;
        this.portfolioService = portfolioService;
        this.stockService = stockService;

        // Initialize with provided data
        if (userData) {
            this.updateFromServerData(userData);
        }
    }

    /**
     * Load complete user profile from server
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<UserProfile>} This user instance
     */
    async load(forceRefresh = false) {
        if (!this.username && !this.id) {
            throw new Error('Username or ID required to load user profile');
        }

        try {
            this.isLoading = true;
            this.setLoadingState('profile', true);
            this.notifyListeners('loadStarted');

            // Load user profile data
            const userData = await this.userService.getUserProfile(this.username || this.id, forceRefresh);

            if (userData) {
                this.updateFromServerData(userData);

                // Load portfolios
                await this.loadPortfolios(forceRefresh);

                // Load stocks and watchlist
                await Promise.allSettled([
                    this.loadStocksAddedToSim(forceRefresh),
                    this.loadWatchlist(forceRefresh)
                ]);

                this.lastUpdated = Date.now();
                this.lastDataSync = Date.now();
                this.notifyListeners('loaded', userData);
            }

            return this;
        } catch (error) {
            console.error('Failed to load user profile:', error);
            this.notifyListeners('error', error);
            throw error;
        } finally {
            this.isLoading = false;
            this.setLoadingState('profile', false);
        }
    }

    /**
     * Update local data from server response
     * @param {Object} userData - Server user data
     */
    updateFromServerData(userData) {
        // Update core properties
        this.id = userData.id || this.id;
        this.username = userData.username || this.username;
        this.email = userData.email || this.email;
        this.firstName = userData.firstName || userData.first_name || this.firstName;
        this.lastName = userData.lastName || userData.last_name || this.lastName;
        this.displayName = userData.displayName || userData.display_name || this.displayName;

        // Update preferences
        if (userData.preferences) {
            this.preferences = { ...this.preferences, ...userData.preferences };
        }

        // Update account info
        this.accountStatus = userData.accountStatus || this.accountStatus;
        this.membershipLevel = userData.membershipLevel || this.membershipLevel;
        this.portfolioIds = userData.portfolioIds || this.portfolioIds;

        // Update timestamps
        if (userData.createdAt) this.createdAt = new Date(userData.createdAt);
        if (userData.lastLoginAt) this.lastLoginAt = new Date(userData.lastLoginAt);
    }

    /**
     * Load all user portfolios
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Map>} Map of loaded portfolios
     */
    async loadPortfolios(forceRefresh = false) {
        try {
            this.setLoadingState('portfolios', true);

            const portfoliosData = await this.portfolioService.getUserPortfolios(this.username, forceRefresh);

            // Clear existing portfolios if force refresh
            if (forceRefresh) {
                this.portfolios.clear();
            }

            // Create Portfolio instances
            for (const portfolioData of portfoliosData) {
                const portfolio = new Portfolio(portfolioData);
                this.portfolios.set(portfolio.id, portfolio);

                // Set up portfolio event listeners
                portfolio.addChangeListener((event, data) => {
                    this.notifyPortfolioListeners(event, data, portfolio);
                });
            }

            // Set active portfolio
            await this.setActivePortfolio();

            this.notifyListeners('portfoliosLoaded', portfoliosData);
            return this.portfolios;

        } catch (error) {
            console.error('Failed to load portfolios:', error);
            this.notifyListeners('portfoliosError', error);
            throw error;
        } finally {
            this.setLoadingState('portfolios', false);
        }
    }

    /**
     * Set active portfolio
     * @param {string} portfolioId - Portfolio ID (optional)
     * @returns {Promise<Portfolio>} Active portfolio
     */
    async setActivePortfolio(portfolioId = null) {
        try {
            // Determine which portfolio to activate
            const targetId = portfolioId ||
                this.preferences.defaultPortfolioId ||
                this.portfolioIds[0];

            if (!targetId) {
                // Create default portfolio if none exists
                const defaultPortfolio = await this.createPortfolio('My Portfolio');
                this.activePortfolio = defaultPortfolio;
                return defaultPortfolio;
            }

            // Load portfolio if not already loaded
            if (!this.portfolios.has(targetId)) {
                const portfolioData = await this.portfolioService.getPortfolio(targetId);
                const portfolio = new Portfolio(portfolioData);
                this.portfolios.set(targetId, portfolio);
            }

            this.activePortfolio = this.portfolios.get(targetId);
            this.preferences.defaultPortfolioId = targetId;

            // Save preference
            await this.updatePreferences({ defaultPortfolioId: targetId });

            this.notifyListeners('activePortfolioChanged', this.activePortfolio);
            return this.activePortfolio;

        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    /**
     * Create new portfolio
     * @param {string} name - Portfolio name
     * @param {number} initialBalance - Initial balance
     * @returns {Promise<Portfolio>} Created portfolio
     */
    async createPortfolio(name, initialBalance = 500.0) {
        try {
            this.setLoadingState('createPortfolio', true);

            const portfolioData = await this.portfolioService.createPortfolio({
                name,
                initialBalance,
                userId: this.id
            });

            const portfolio = new Portfolio(portfolioData);
            this.portfolios.set(portfolio.id, portfolio);
            this.portfolioIds.push(portfolio.id);

            // Set up event listeners
            portfolio.addChangeListener((event, data) => {
                this.notifyPortfolioListeners(event, data, portfolio);
            });

            // Set as active if it's the first portfolio
            if (this.portfolios.size === 1) {
                this.activePortfolio = portfolio;
                this.preferences.defaultPortfolioId = portfolio.id;
            }

            this.notifyListeners('portfolioCreated', portfolio);
            return portfolio;

        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        } finally {
            this.setLoadingState('createPortfolio', false);
        }
    }

    /**
     * Delete portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {Promise<boolean>} Success status
     */
    async deletePortfolio(portfolioId) {
        try {
            if (this.portfolios.size <= 1) {
                throw new Error('Cannot delete the last portfolio');
            }

            this.setLoadingState('deletePortfolio', true);

            await this.portfolioService.deletePortfolio(portfolioId);

            // Remove from local state
            this.portfolios.delete(portfolioId);
            this.portfolioIds = this.portfolioIds.filter(id => id !== portfolioId);

            // Set new active portfolio if needed
            if (this.activePortfolio?.id === portfolioId) {
                await this.setActivePortfolio();
            }

            this.notifyListeners('portfolioDeleted', { portfolioId });
            return true;

        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        } finally {
            this.setLoadingState('deletePortfolio', false);
        }
    }

    /**
     * Load stocks added to simulation
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Array>} Array of stocks
     */
    async loadStocksAddedToSim(forceRefresh = false) {
        try {
            this.setLoadingState('stocks', true);

            const stocksData = await this.userService.getUserStocks(this.username, forceRefresh);

            // Create Stock instances
            this.stocksAddedToSim = stocksData.map(stockData => new Stock(stockData));

            this.notifyListeners('stocksLoaded', this.stocksAddedToSim);
            return this.stocksAddedToSim;

        } catch (error) {
            console.error('Failed to load stocks:', error);
            this.notifyListeners('stocksError', error);
            return this.stocksAddedToSim;
        } finally {
            this.setLoadingState('stocks', false);
        }
    }

    /**
     * Add stock to simulation
     * @param {string|Object} stockSymbolOrData - Stock symbol or stock data
     * @returns {Promise<Stock>} Added stock
     */
    async addStockToSim(stockSymbolOrData) {
        try {
            const symbol = typeof stockSymbolOrData === 'string'
                ? stockSymbolOrData.toUpperCase()
                : stockSymbolOrData.symbol?.toUpperCase();

            if (!symbol) {
                throw new Error('Stock symbol is required');
            }

            // Check if stock already exists
            const existingStock = this.stocksAddedToSim.find(s => s.symbol === symbol);
            if (existingStock) {
                return existingStock;
            }

            this.setLoadingState('addStock', true);

            // Add to server
            await this.userService.addUserStock(this.username, symbol);

            // Get stock data
            let stockData;
            if (typeof stockSymbolOrData === 'object') {
                stockData = stockSymbolOrData;
            } else {
                stockData = await this.stockService.getStock(symbol);
            }

            const stock = new Stock(stockData);
            this.stocksAddedToSim.push(stock);

            this.notifyListeners('stockAdded', stock);
            return stock;

        } catch (error) {
            console.error('Failed to add stock to simulation:', error);
            throw error;
        } finally {
            this.setLoadingState('addStock', false);
        }
    }

    /**
     * Remove stock from simulation
     * @param {string} symbol - Stock symbol
     * @returns {Promise<boolean>} Success status
     */
    async removeStockFromSim(symbol) {
        try {
            this.setLoadingState('removeStock', true);

            await this.userService.removeUserStock(this.username, symbol.toUpperCase());

            // Remove from local state
            this.stocksAddedToSim = this.stocksAddedToSim.filter(s => s.symbol !== symbol.toUpperCase());

            this.notifyListeners('stockRemoved', { symbol });
            return true;

        } catch (error) {
            console.error('Failed to remove stock from simulation:', error);
            throw error;
        } finally {
            this.setLoadingState('removeStock', false);
        }
    }

    /**
     * Load user watchlist
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Array>} Watchlist
     */
    async loadWatchlist(forceRefresh = false) {
        try {
            this.setLoadingState('watchlist', true);

            const watchlistData = await this.userService.getUserWatchlist(this.username, forceRefresh);
            this.watchlist = watchlistData || [];

            this.notifyListeners('watchlistLoaded', this.watchlist);
            return this.watchlist;

        } catch (error) {
            console.error('Failed to load watchlist:', error);
            this.notifyListeners('watchlistError', error);
            return this.watchlist;
        } finally {
            this.setLoadingState('watchlist', false);
        }
    }

    /**
     * Add stock to watchlist
     * @param {string} symbol - Stock symbol
     * @returns {Promise<boolean>} Success status
     */
    async addToWatchlist(symbol) {
        try {
            const upperSymbol = symbol.toUpperCase();

            if (this.watchlist.includes(upperSymbol)) {
                return true; // Already in watchlist
            }

            await this.userService.addToWatchlist(this.username, upperSymbol);
            this.watchlist.push(upperSymbol);

            this.notifyListeners('watchlistUpdated', { action: 'add', symbol: upperSymbol });
            return true;

        } catch (error) {
            console.error('Failed to add to watchlist:', error);
            throw error;
        }
    }

    /**
     * Remove stock from watchlist
     * @param {string} symbol - Stock symbol
     * @returns {Promise<boolean>} Success status
     */
    async removeFromWatchlist(symbol) {
        try {
            const upperSymbol = symbol.toUpperCase();

            await this.userService.removeFromWatchlist(this.username, upperSymbol);
            this.watchlist = this.watchlist.filter(s => s !== upperSymbol);

            this.notifyListeners('watchlistUpdated', { action: 'remove', symbol: upperSymbol });
            return true;

        } catch (error) {
            console.error('Failed to remove from watchlist:', error);
            throw error;
        }
    }

    /**
     * Update user preferences
     * @param {Object} newPreferences - New preferences
     * @returns {Promise<Object>} Updated preferences
     */
    async updatePreferences(newPreferences) {
        try {
            const updatedPrefs = { ...this.preferences, ...newPreferences };

            await this.userService.updatePreferences(this.username, updatedPrefs);
            this.preferences = updatedPrefs;

            this.notifyListeners('preferencesUpdated', this.preferences);
            return this.preferences;

        } catch (error) {
            console.error('Failed to update preferences:', error);
            throw error;
        }
    }

    /**
     * Update user profile information
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<UserProfile>} This user instance
     */
    async updateProfile(profileData) {
        try {
            this.setLoadingState('updateProfile', true);

            const updatedData = await this.userService.updateProfile(this.username, profileData);
            this.updateFromServerData(updatedData);

            this.notifyListeners('profileUpdated', updatedData);
            return this;

        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        } finally {
            this.setLoadingState('updateProfile', false);
        }
    }

    /**
     * Get user's transaction history across all portfolios
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Transaction history
     */
    async getTransactionHistory(options = {}) {
        try {
            const history = await this.userService.getTransactionHistory(this.username, options);
            return history;
        } catch (error) {
            console.error('Failed to get transaction history:', error);
            return [];
        }
    }

    /**
     * Get user's performance summary
     * @returns {Promise<Object>} Performance summary
     */
    async getPerformanceSummary() {
        try {
            const summary = {
                totalPortfolios: this.portfolios.size,
                totalStocksInSim: this.stocksAddedToSim.length,
                watchlistSize: this.watchlist.length,
                membershipLevel: this.membershipLevel,
                accountAge: this.createdAt ? Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
                portfolioSummaries: []
            };

            // Get summaries for all portfolios
            const portfolioPromises = Array.from(this.portfolios.values()).map(async (portfolio) => {
                try {
                    return await portfolio.getPortfolioSummary();
                } catch (error) {
                    console.error(`Failed to get summary for portfolio ${portfolio.id}:`, error);
                    return null;
                }
            });

            const portfolioSummaries = await Promise.all(portfolioPromises);
            summary.portfolioSummaries = portfolioSummaries.filter(s => s !== null);

            // Calculate aggregate metrics
            summary.totalValue = summary.portfolioSummaries.reduce((sum, p) => sum + p.totalAssetsValue, 0);
            summary.totalEarnings = summary.portfolioSummaries.reduce((sum, p) => sum + p.earnings, 0);
            summary.totalInitialInvestment = summary.portfolioSummaries.reduce((sum, p) => sum + p.initialBalance, 0);
            summary.overallReturn = summary.totalInitialInvestment > 0
                ? (summary.totalEarnings / summary.totalInitialInvestment) * 100
                : 0;

            return summary;
        } catch (error) {
            console.error('Failed to get performance summary:', error);
            throw error;
        }
    }

    /**
     * Execute stock transaction using active portfolio
     * @param {string} action - 'buy' or 'sell'
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares
     * @param {number} price - Price per share
     * @returns {Promise<Object>} Transaction result
     */
    async executeTransaction(action, symbol, quantity, price) {
        if (!this.activePortfolio) {
            throw new Error('No active portfolio available for transaction');
        }

        try {
            this.setLoadingState('transaction', true);
            this.notifyTransactionListeners('transactionStarted', { action, symbol, quantity, price });

            let result;
            if (action.toLowerCase() === 'buy') {
                result = await this.activePortfolio.buyStock(symbol, quantity, price);
            } else if (action.toLowerCase() === 'sell') {
                result = await this.activePortfolio.sellStock(symbol, quantity, price);
            } else {
                throw new Error(`Invalid transaction action: ${action}`);
            }

            this.notifyTransactionListeners('transactionCompleted', { action, symbol, quantity, price, result });
            return result;

        } catch (error) {
            this.notifyTransactionListeners('transactionFailed', { action, symbol, quantity, price, error });
            throw error;
        } finally {
            this.setLoadingState('transaction', false);
        }
    }

    /**
     * Buy stock using active portfolio
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares
     * @param {number} price - Price per share
     * @returns {Promise<Object>} Transaction result
     */
    async buyStock(symbol, quantity, price) {
        return this.executeTransaction('buy', symbol, quantity, price);
    }

    /**
     * Sell stock using active portfolio
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares
     * @param {number} price - Price per share
     * @returns {Promise<Object>} Transaction result
     */
    async sellStock(symbol, quantity, price) {
        return this.executeTransaction('sell', symbol, quantity, price);
    }

    // ===== UTILITY METHODS =====

    /**
     * Get stock by symbol from simulation
     * @param {string} symbol - Stock symbol
     * @returns {Stock|null} Stock instance or null
     */
    getStockBySymbol(symbol) {
        return this.stocksAddedToSim.find(stock => stock.symbol === symbol.toUpperCase()) || null;
    }

    /**
     * Check if user owns stock in any portfolio
     * @param {string} symbol - Stock symbol
     * @returns {boolean} Whether user owns the stock
     */
    ownsStock(symbol) {
        return Array.from(this.portfolios.values()).some(portfolio => portfolio.ownsStock(symbol));
    }

    /**
     * Get total quantity owned across all portfolios
     * @param {string} symbol - Stock symbol
     * @returns {number} Total quantity owned
     */
    getTotalQuantityOwned(symbol) {
        return Array.from(this.portfolios.values())
            .reduce((total, portfolio) => total + portfolio.getQuantityOwned(symbol), 0);
    }

    /**
     * Check if stock is in watchlist
     * @param {string} symbol - Stock symbol
     * @returns {boolean} Whether stock is in watchlist
     */
    isInWatchlist(symbol) {
        return this.watchlist.includes(symbol.toUpperCase());
    }

    /**
     * Check if stock is in simulation
     * @param {string} symbol - Stock symbol
     * @returns {boolean} Whether stock is in simulation
     */
    isInSimulation(symbol) {
        return this.stocksAddedToSim.some(stock => stock.symbol === symbol.toUpperCase());
    }

    /**
     * Get display name for user
     * @returns {string} Display name
     */
    getDisplayName() {
        if (this.displayName) return this.displayName;
        if (this.firstName && this.lastName) return `${this.firstName} ${this.lastName}`;
        if (this.firstName) return this.firstName;
        return this.username;
    }

    /**
     * Get user's full name
     * @returns {string} Full name
     */
    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim() || this.username;
    }

    /**
     * Check if user has premium features
     * @returns {boolean} Whether user has premium access
     */
    hasPremiumAccess() {
        return ['premium', 'pro', 'enterprise'].includes(this.membershipLevel);
    }

    /**
     * Get account age in days
     * @returns {number} Account age in days
     */
    getAccountAge() {
        return this.createdAt ? Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    }

    /**
     * Set loading state for specific operation
     * @param {string} operation - Operation name
     * @param {boolean} isLoading - Loading state
     */
    setLoadingState(operation, isLoading) {
        this.loadingStates.set(operation, isLoading);
        this.notifyListeners('loadingStateChanged', { operation, isLoading });
    }

    /**
     * Get loading state for specific operation
     * @param {string} operation - Operation name
     * @returns {boolean} Loading state
     */
    getLoadingState(operation) {
        return this.loadingStates.get(operation) || false;
    }

    /**
     * Check if any operation is loading
     * @returns {boolean} Whether any operation is loading
     */
    isAnyOperationLoading() {
        return this.isLoading || Array.from(this.loadingStates.values()).some(state => state);
    }

    // ===== EVENT SYSTEM =====

    /**
     * Add general change listener
     * @param {Function} listener - Event listener function
     * @returns {Function} Unsubscribe function
     */
    addChangeListener(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.changeListeners.push(listener);

        return () => {
            this.changeListeners = this.changeListeners.filter(l => l !== listener);
        };
    }

    /**
     * Add portfolio-specific listener
     * @param {Function} listener - Portfolio listener function
     * @returns {Function} Unsubscribe function
     */
    addPortfolioListener(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.portfolioListeners.push(listener);

        return () => {
            this.portfolioListeners = this.portfolioListeners.filter(l => l !== listener);
        };
    }

    /**
     * Add transaction-specific listener
     * @param {Function} listener - Transaction listener function
     * @returns {Function} Unsubscribe function
     */
    addTransactionListener(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.transactionListeners.push(listener);

        return () => {
            this.transactionListeners = this.transactionListeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all general listeners
     * @param {string} event - Event type
     * @param {*} data - Event data
     */
    notifyListeners(event, data = null) {
        this.changeListeners.forEach(listener => {
            try {
                listener(event, data, this);
            } catch (error) {
                console.error('Error in user profile change listener:', error);
            }
        });
    }

    /**
     * Notify portfolio listeners
     * @param {string} event - Event type
     * @param {*} data - Event data
     * @param {Portfolio} portfolio - Portfolio instance
     */
    notifyPortfolioListeners(event, data, portfolio) {
        this.portfolioListeners.forEach(listener => {
            try {
                listener(event, data, portfolio, this);
            } catch (error) {
                console.error('Error in portfolio listener:', error);
            }
        });
    }

    /**
     * Notify transaction listeners
     * @param {string} event - Event type
     * @param {*} data - Event data
     */
    notifyTransactionListeners(event, data) {
        this.transactionListeners.forEach(listener => {
            try {
                listener(event, data, this);
            } catch (error) {
                console.error('Error in transaction listener:', error);
            }
        });
    }

    /**
     * Refresh all user data
     * @returns {Promise<UserProfile>} This user instance
     */
    async refresh() {
        return await this.load(true);
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.dataCache.clear();
        this.stockCache.clear();
        this.lastDataSync = null;

        // Clear portfolio caches
        this.portfolios.forEach(portfolio => portfolio.clearCache());

        // Clear stock caches
        this.stocksAddedToSim.forEach(stock => stock.clearCache?.());
    }

    /**
     * Clean up resources and event listeners
     */
    destroy() {
        // Clear all listeners
        this.changeListeners = [];
        this.portfolioListeners = [];
        this.transactionListeners = [];

        // Clear caches
        this.clearCache();

        // Destroy portfolios
        this.portfolios.forEach(portfolio => {
            if (typeof portfolio.destroy === 'function') {
                portfolio.destroy();
            }
        });

        // Destroy stocks
        this.stocksAddedToSim.forEach(stock => {
            if (typeof stock.destroy === 'function') {
                stock.destroy();
            }
        });

        // Clear loading states
        this.loadingStates.clear();
    }

    /**
     * Convert user profile to JSON representation
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            displayName: this.displayName,
            preferences: this.preferences,
            portfolioIds: this.portfolioIds,
            stocksAddedToSim: this.stocksAddedToSim.map(stock => stock.toJSON()),
            watchlist: this.watchlist,
            stockPreferences: this.stockPreferences,
            accountStatus: this.accountStatus,
            membershipLevel: this.membershipLevel,
            createdAt: this.createdAt,
            lastLoginAt: this.lastLoginAt,
            lastUpdated: this.lastUpdated
        };
    }

    /**
     * Create UserProfile instance from JSON data
     * @param {Object} data - JSON data
     * @returns {UserProfile} UserProfile instance
     */
    static fromJSON(data) {
        return new UserProfile(data);
    }

    /**
     * Validate user data
     * @param {Object} userData - User data to validate
     * @returns {Object} Validation result
     */
    static validate(userData) {
        const errors = [];

        if (!userData.username || userData.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) {
            errors.push('Valid email address is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default UserProfile;