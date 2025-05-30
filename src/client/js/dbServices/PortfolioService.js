// src/client/js/PortfolioService.js
import DatabaseService from './DatabaseService.js';
import { getCurrentUser } from './AuthService.js';

/**
 * Service for managing user portfolios
 */
export default class PortfolioService {
    constructor() {
        this.dbService = new DatabaseService();
        this.currentPortfolio = null;
        this.portfolios = [];
    }

    /**
     * Load user portfolios
     * @returns {Promise<Array>} List of portfolios
     */
    async loadPortfolios() {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const portfolios = await this.dbService.getPortfolios(user.username);
            this.portfolios = portfolios;
            return portfolios;
        } catch (error) {
            console.error('Failed to load portfolios:', error);
            throw error;
        }
    }

    /**
     * Load active portfolio for current user
     * @returns {Promise<Object>} Portfolio data
     */
    async loadActivePortfolio() {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // If no portfolios loaded yet, load them
            if (this.portfolios.length === 0) {
                await this.loadPortfolios();
            }

            // Find active portfolio
            const activePortfolioId = user.activePortfolioID;

            if (!activePortfolioId) {
                // No active portfolio set, use the first one if available
                if (this.portfolios.length > 0) {
                    this.currentPortfolio = await this.getPortfolio(this.portfolios[0].portfolioID);
                } else {
                    this.currentPortfolio = null;
                }
            } else {
                this.currentPortfolio = await this.getPortfolio(activePortfolioId);
            }

            return this.currentPortfolio;
        } catch (error) {
            console.error('Failed to load active portfolio:', error);
            throw error;
        }
    }

    /**
     * Get a specific portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Portfolio data
     */
    async getPortfolio(portfolioId) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const portfolio = await this.dbService.getPortfolio(user.username, portfolioId);
            return portfolio;
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
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const portfolioData = {
                name,
                description,
                initialBalance
            };

            const newPortfolio = await this.dbService.createPortfolio(user.username, portfolioData);

            // Add to local portfolio list
            this.portfolios.push(newPortfolio);

            return newPortfolio;
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    /**
     * Update a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @param {object} updateData - Data to update (name, description)
     * @returns {Promise<Object>} Update result
     */
    async updatePortfolio(portfolioId, updateData) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const result = await this.dbService.updatePortfolio(user.username, portfolioId, updateData);

            // Update local portfolio list
            const index = this.portfolios.findIndex(p => p.portfolioID === portfolioId);
            if (index !== -1) {
                this.portfolios[index] = {
                    ...this.portfolios[index],
                    ...updateData
                };
            }

            // Update current portfolio if it's the active one
            if (this.currentPortfolio && this.currentPortfolio.portfolioID === portfolioId) {
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
     * @param {string} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Result
     */
    async setActivePortfolio(portfolioId) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const result = await this.dbService.setActivePortfolio(user.username, portfolioId);

            // Update current portfolio
            this.currentPortfolio = await this.getPortfolio(portfolioId);

            return result;
        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    /**
     * Reset a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @param {number} initialBalance - New initial balance (optional)
     * @returns {Promise<Object>} Reset result
     */
    async resetPortfolio(portfolioId, initialBalance) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const result = await this.dbService.resetPortfolio(user.username, portfolioId, initialBalance);

            // Refresh portfolio data if it's the current one
            if (this.currentPortfolio && this.currentPortfolio.portfolioID === portfolioId) {
                this.currentPortfolio = await this.getPortfolio(portfolioId);
            }

            return result;
        } catch (error) {
            console.error('Failed to reset portfolio:', error);
            throw error;
        }
    }

    /**
     * Delete a portfolio
     * @param {string} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Delete result
     */
    async deletePortfolio(portfolioId) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const result = await this.dbService.deletePortfolio(user.username, portfolioId);

            // Remove from local portfolio list
            this.portfolios = this.portfolios.filter(p => p.portfolioID !== portfolioId);

            // If deleted the current portfolio, set current to null
            if (this.currentPortfolio && this.currentPortfolio.portfolioID === portfolioId) {
                this.currentPortfolio = null;

                // Load portfolios to get the new active one
                await this.loadPortfolios();
                await this.loadActivePortfolio();
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

            const transactionData = {
                portfolioId: this.currentPortfolio.portfolioID,
                symbol,
                transactionType: 'BUY',
                quantity,
                price
            };

            const result = await this.dbService.executeTransaction(transactionData);

            // Update portfolio with new balance
            this.currentPortfolio.balance = result.newBalance;

            // Reload portfolio to get updated holdings
            await this.loadActivePortfolio();

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

            // Check if user has enough shares
            const holding = this.currentPortfolio.holdingsMap[symbol];
            if (!holding || holding.quantity < quantity) {
                throw new Error('Insufficient shares');
            }

            const transactionData = {
                portfolioId: this.currentPortfolio.portfolioID,
                symbol,
                transactionType: 'SELL',
                quantity,
                price
            };

            const result = await this.dbService.executeTransaction(transactionData);

            // Update portfolio with new balance
            this.currentPortfolio.balance = result.newBalance;

            // Reload portfolio to get updated holdings
            await this.loadActivePortfolio();

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

            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.getPortfolioTransactions(
                user.username,
                this.currentPortfolio.portfolioID
            );
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
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.getTransactionStats(user.username);
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
                portfolioValue += holding.quantity * holding.currentPrice;
            }

            // Calculate total assets
            const totalAssets = portfolioValue + this.currentPortfolio.balance;

            // Calculate profit/loss from initial investment
            const initialInvestment = this.currentPortfolio.initialBalance;
            const profitLoss = totalAssets - initialInvestment;
            const percentChange = initialInvestment > 0
                ? (profitLoss / initialInvestment) * 100
                : 0;

            return {
                portfolioValue,
                balance: this.currentPortfolio.balance,
                totalAssets,
                initialInvestment,
                profitLoss,
                percentChange
            };
        } catch (error) {
            console.error('Failed to calculate portfolio value:', error);
            throw error;
        }
    }
}