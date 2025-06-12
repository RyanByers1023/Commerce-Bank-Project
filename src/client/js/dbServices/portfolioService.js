import { databaseService } from './databaseService.js';
import { getCurrentUser, getCurrentUserId } from './authService.js';

/**
 * Service for managing user portfolios
 */
export default class PortfolioService {
    constructor() {
        this.dbService = databaseService;
        this.currentPortfolio = null;
        this.portfolios = [];
        this.lastUpdated = null;

        // Cache for performance
        this._cachedUser = null;
    }

    /**
     * Get current user with caching
     * @returns {Promise<Object>} Current user
     */
    async _getCurrentUser() {
        if (!this._cachedUser) {
            this._cachedUser = await getCurrentUser();
        }
        return this._cachedUser;
    }

    /**
     * Clear user cache (call when user changes)
     */
    _clearUserCache() {
        this._cachedUser = null;
        this.currentPortfolio = null;
        this.portfolios = [];
        this.lastUpdated = null;
    }

    /**
     * Load user portfolios
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Array>} List of portfolios
     */
    async loadPortfolios(forceRefresh = false) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Check if we need to refresh
            if (!forceRefresh && this.portfolios.length > 0 && this.lastUpdated) {
                const timeSinceUpdate = Date.now() - this.lastUpdated;
                if (timeSinceUpdate < 30000) { // 30 seconds cache
                    return this.portfolios;
                }
            }

            const portfolios = await this.dbService.getPortfolios(user.id);
            this.portfolios = portfolios || [];
            this.lastUpdated = Date.now();

            return this.portfolios;
        } catch (error) {
            console.error('Failed to load portfolios:', error);
            throw error;
        }
    }

    /**
     * Load active portfolio for current user
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Object>} Portfolio data
     */
    async loadActivePortfolio(forceRefresh = false) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // If no portfolios loaded yet, load them
            if (this.portfolios.length === 0) {
                await this.loadPortfolios(forceRefresh);
            }

            // Find active portfolio
            const activePortfolioId = user.activePortfolioId;

            if (!activePortfolioId || activePortfolioId === null) {
                // No active portfolio set, use the first one if available
                if (this.portfolios.length > 0) {
                    this.currentPortfolio = await this.getPortfolio(this.portfolios[0].id);

                    // Set this portfolio as active
                    await this.setActivePortfolio(this.portfolios[0].id);
                } else {
                    this.currentPortfolio = null;
                }
            } else {
                this.currentPortfolio = await this.getPortfolio(parseInt(activePortfolioId));
            }

            return this.currentPortfolio;
        } catch (error) {
            console.error('Failed to load active portfolio:', error);
            throw error;
        }
    }

    /**
     * Get a specific portfolio
     * @param {number} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Portfolio data
     */
    async getPortfolio(portfolioId) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Ensure portfolioId is a number
            const id = typeof portfolioId === 'string' ? parseInt(portfolioId) : portfolioId;

            if (isNaN(id)) {
                throw new Error('Invalid portfolio ID');
            }

            return await this.dbService.getPortfolio(id, user.id);
        } catch (error) {
            console.error('Failed to get portfolio:', error);
            throw error;
        }
    }

    /**
     * Create a new portfolio
     * @param {string} name - Portfolio name
     * @param {string} description - Portfolio description
     * @param {number} initialBalance - Initial cash balance
     * @returns {Promise<Object>} Created portfolio
     */
    async createPortfolio(name, description = '', initialBalance = 500) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Validate inputs
            if (!name || name.trim().length === 0) {
                throw new Error('Portfolio name is required');
            }

            if (typeof initialBalance !== 'number' || initialBalance < 100 || initialBalance > 10000) {
                throw new Error('Initial balance must be between 100 and 10000');
            }

            const portfolioData = {
                name: name.trim(),
                description: description.trim(),
                initialBalance
            };

            const newPortfolio = await this.dbService.createPortfolio(portfolioData, user.id);

            // Add to local portfolio list
            this.portfolios.push(newPortfolio);

            // If this is the first portfolio, set it as active
            if (this.portfolios.length === 1) {
                await this.setActivePortfolio(newPortfolio.id);
            }

            return newPortfolio;
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    /**
     * Update a portfolio
     * @param {number} portfolioId - Portfolio ID
     * @param {object} updateData - Data to update (name, description, cash_balance)
     * @returns {Promise<Object>} Update result
     */
    async updatePortfolio(portfolioId, updateData) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Ensure portfolioId is a number
            const id = typeof portfolioId === 'string' ? parseInt(portfolioId) : portfolioId;

            if (isNaN(id)) {
                throw new Error('Invalid portfolio ID');
            }

            // Validate update data
            if (updateData.name !== undefined && (!updateData.name || updateData.name.trim().length === 0)) {
                throw new Error('Portfolio name cannot be empty');
            }

            if (updateData.cash_balance !== undefined) {
                if (typeof updateData.cash_balance !== 'number' || updateData.cash_balance < 0) {
                    throw new Error('Cash balance must be a non-negative number');
                }
            }

            const result = await this.dbService.updatePortfolio(id, updateData, user.id);

            // Update local portfolio list
            const index = this.portfolios.findIndex(p => p.id === id);
            if (index !== -1) {
                this.portfolios[index] = {
                    ...this.portfolios[index],
                    ...updateData
                };
            }

            // Update current portfolio if it's the active one
            if (this.currentPortfolio && this.currentPortfolio.id === id) {
                this.currentPortfolio = {
                    ...this.currentPortfolio,
                    ...updateData
                };
            }

            return result;
        } catch (error) {
            console.error('Failed to update portfolio:', error);
            throw error;
        }
    }

    /**
     * Set active portfolio
     * @param {number} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Result
     */
    async setActivePortfolio(portfolioId) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Ensure portfolioId is a number
            const id = typeof portfolioId === 'string' ? parseInt(portfolioId) : portfolioId;

            if (isNaN(id)) {
                throw new Error('Invalid portfolio ID');
            }

            // FIXED: Pass userId to databaseService
            const result = await this.dbService.setActivePortfolio(user.id, id);

            // Update current portfolio
            this.currentPortfolio = await this.getPortfolio(id);

            // Update cached user data
            if (this._cachedUser) {
                this._cachedUser.activePortfolioId = id;
            }

            return result;
        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    /**
     * Reset a portfolio
     * @param {number} portfolioId - Portfolio ID
     * @param {number} initialBalance - New initial balance (optional)
     * @returns {Promise<Object>} Reset result
     */
    async resetPortfolio(portfolioId, initialBalance) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Ensure portfolioId is a number
            const id = typeof portfolioId === 'string' ? parseInt(portfolioId) : portfolioId;

            if (isNaN(id)) {
                throw new Error('Invalid portfolio ID');
            }

            if (initialBalance !== undefined) {
                if (typeof initialBalance !== 'number' || initialBalance < 100 || initialBalance > 10000) {
                    throw new Error('Initial balance must be between 100 and 10000');
                }
            }

            const result = await this.dbService.resetPortfolio(id, initialBalance, user.id);

            // Refresh portfolio data if it's the current one
            if (this.currentPortfolio && this.currentPortfolio.id === id) {
                this.currentPortfolio = await this.getPortfolio(id);
            }

            // Update local portfolio list
            const index = this.portfolios.findIndex(p => p.id === id);
            if (index !== -1) {
                this.portfolios[index] = await this.getPortfolio(id);
            }

            return result;
        } catch (error) {
            console.error('Failed to reset portfolio:', error);
            throw error;
        }
    }

    /**
     * Delete a portfolio
     * @param {number} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Delete result
     */
    async deletePortfolio(portfolioId) {
        try {
            const user = await this._getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Ensure portfolioId is a number
            const id = typeof portfolioId === 'string' ? parseInt(portfolioId) : portfolioId;

            if (isNaN(id)) {
                throw new Error('Invalid portfolio ID');
            }

            // Check if this is the only portfolio
            if (this.portfolios.length <= 1) {
                throw new Error('Cannot delete the only portfolio');
            }

            const result = await this.dbService.deletePortfolio(id, user.id);

            // Remove from local portfolio list
            this.portfolios = this.portfolios.filter(p => p.id !== id);

            // If deleted the current portfolio, set current to null and reload
            if (this.currentPortfolio && this.currentPortfolio.id === id) {
                this.currentPortfolio = null;

                // Load portfolios to get the new active one
                await this.loadPortfolios(true);
                if (this.portfolios.length > 0) {
                    await this.loadActivePortfolio(true);
                }
            }

            return result;
        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        }
    }

    /**
     * Buy stock for the current portfolio
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares to buy
     * @param {number} price - Price per share
     * @returns {Promise<Object>} Transaction result
     */
    async buyStock(symbol, quantity, price) {
        try {
            if (!this.currentPortfolio) {
                throw new Error('No active portfolio');
            }

            // Validate inputs
            if (!symbol || symbol.trim().length === 0) {
                throw new Error('Stock symbol is required');
            }

            if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
                throw new Error('Quantity must be a positive integer (max 100)');
            }

            if (typeof price !== 'number' || price <= 0) {
                throw new Error('Price must be a positive number');
            }

            const totalCost = quantity * price;
            if (this.currentPortfolio.balance < totalCost) {
                throw new Error('Insufficient funds');
            }

            const transactionData = {
                portfolioId: this.currentPortfolio.id,
                symbol: symbol.trim().toUpperCase(),
                transactionType: 'BUY',
                quantity,
                price
            };

            const result = await this.dbService.executeTransaction(transactionData);

            // Reload portfolio to get updated holdings and balance
            await this.loadActivePortfolio(true);

            return result;
        } catch (error) {
            console.error('Failed to buy stock:', error);
            throw error;
        }
    }

    /**
     * Sell stock from the current portfolio
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares to sell
     * @param {number} price - Price per share
     * @returns {Promise<Object>} Transaction result
     */
    async sellStock(symbol, quantity, price) {
        try {
            if (!this.currentPortfolio) {
                throw new Error('No active portfolio');
            }

            // Validate inputs
            if (!symbol || symbol.trim().length === 0) {
                throw new Error('Stock symbol is required');
            }

            if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
                throw new Error('Quantity must be a positive integer (max 100)');
            }

            if (typeof price !== 'number' || price <= 0) {
                throw new Error('Price must be a positive number');
            }

            // Check if user has enough shares
            const symbolUpper = symbol.trim().toUpperCase();
            const holding = this.currentPortfolio.holdingsMap?.[symbolUpper];
            if (!holding || holding.quantity < quantity) {
                throw new Error('Insufficient shares');
            }

            const transactionData = {
                portfolioId: this.currentPortfolio.id,
                symbol: symbolUpper,
                transactionType: 'SELL',
                quantity,
                price
            };

            const result = await this.dbService.executeTransaction(transactionData);

            // Reload portfolio to get updated holdings and balance
            await this.loadActivePortfolio(true);

            return result;
        } catch (error) {
            console.error('Failed to sell stock:', error);
            throw error;
        }
    }

    /**
     * Get transaction history for current portfolio
     * @returns {Promise<Array>} Transaction history
     */
    async getTransactionHistory() {
        try {
            if (!this.currentPortfolio) {
                throw new Error('No active portfolio');
            }

            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.getPortfolioTransactions(this.currentPortfolio.id, userId);
        } catch (error) {
            console.error('Failed to get transaction history:', error);
            throw error;
        }
    }

    /**
     * Get transaction statistics
     * @returns {Promise<Object>} Transaction statistics
     */
    async getTransactionStats() {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.getTransactionStats(userId);
        } catch (error) {
            console.error('Failed to get transaction statistics:', error);
            throw error;
        }
    }

    /**
     * Calculate current portfolio value
     * @returns {Promise<Object>} Portfolio value information
     */
    async calculatePortfolioValue() {
        try {
            if (!this.currentPortfolio) {
                throw new Error('No active portfolio');
            }

            // Sum up the value of all holdings
            let portfolioValue = 0;
            const holdings = this.currentPortfolio.holdingsMap || {};

            for (const symbol in holdings) {
                const holding = holdings[symbol];
                portfolioValue += holding.quantity * (holding.currentPrice || 0);
            }

            // Calculate total assets
            const balance = this.currentPortfolio.balance || this.currentPortfolio.cash_balance || 0;
            const totalAssets = portfolioValue + balance;

            // Calculate profit/loss
            let totalInvested = 0;
            for (const symbol in holdings) {
                const holding = holdings[symbol];
                totalInvested += holding.totalPricePaid || 0;
            }

            const profitLoss = portfolioValue - totalInvested;
            const percentChange = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

            return {
                portfolioValue,
                balance,
                totalAssets,
                totalInvested,
                profitLoss,
                percentChange,
                holdings: Object.keys(holdings).length
            };
        } catch (error) {
            console.error('Failed to calculate portfolio value:', error);
            throw error;
        }
    }

    /**
     * Get current portfolio
     * @returns {Object|null} Current portfolio
     */
    getCurrentPortfolio() {
        return this.currentPortfolio;
    }

    /**
     * Get all portfolios
     * @returns {Array} All portfolios
     */
    getPortfolios() {
        return this.portfolios;
    }

    /**
     * Clear service cache (useful when user logs out)
     */
    clearCache() {
        this._clearUserCache();
    }
}

// Create singleton instance
const portfolioService = new PortfolioService();
export { portfolioService };