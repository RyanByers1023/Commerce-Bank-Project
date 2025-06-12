import { authService, getCurrentUser, getCurrentUserId, isDemoAccount } from './authService.js';
import { portfolioService } from './portfolioService.js';
import { databaseService } from './databaseService.js';

/**
 * Central service for managing the user profile and application state
 * This service coordinates between auth, portfolio, and other services
 */
export default class UserProfileService {
    constructor() {
        this.dbService = databaseService;
        this.isInitialized = false;
        this.profileLoadedCallbacks = [];
        this.currentUser = null;
        this.userSettings = null;

        // Subscribe to auth state changes
        this.authUnsubscribe = authService.onAuthStateChanged((user, isAuthenticated) => {
            this.handleAuthStateChange(user, isAuthenticated);
        });
    }

    /**
     * Handle authentication state changes
     * @param {Object} user - Current user or null
     * @param {boolean} isAuthenticated - Authentication status
     */
    async handleAuthStateChange(user, isAuthenticated) {
        this.currentUser = user;

        if (isAuthenticated && user) {
            // User logged in - initialize their profile
            await this.initializeUserProfile();
        } else {
            // User logged out - clear state
            this.clearUserState();
        }
    }

    /**
     * Initialize the user profile service
     * @returns {Promise<Object>} Initialization result
     */
    async initialize() {
        try {
            // Check if already initialized
            if (this.isInitialized) {
                return { success: true, user: this.currentUser };
            }

            // Check authentication status
            const isAuthenticated = await authService.checkAuthStatus();

            if (isAuthenticated) {
                const user = await getCurrentUser();
                if (user) {
                    await this.initializeUserProfile();
                    return { success: true, user: this.currentUser };
                }
            }

            // Not authenticated
            return { success: false, message: 'Not authenticated' };
        } catch (error) {
            console.error('Failed to initialize user profile service:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Initialize user profile data
     * @returns {Promise<void>}
     */
    async initializeUserProfile() {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            this.currentUser = user;

            // Load user settings
            await this.loadUserSettings();

            // Load user's portfolios and set active portfolio
            await portfolioService.loadPortfolios(true); // Force refresh
            await portfolioService.loadActivePortfolio(true);

            this.isInitialized = true;
            this.notifyProfileLoaded();

        } catch (error) {
            console.error('Failed to initialize user profile:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Load user settings
     * @returns {Promise<Object>} User settings
     */
    async loadUserSettings() {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            this.userSettings = await this.dbService.getUserSettings(userId);
            return this.userSettings;
        } catch (error) {
            console.error('Failed to load user settings:', error);
            // Set default settings if loading fails
            this.userSettings = {
                sim_speed: 1,
                market_volatility: 'medium',
                event_frequency: 'medium',
                initial_balance: 500.00
            };
            return this.userSettings;
        }
    }

    /**
     * Update user settings
     * @param {Object} newSettings - Settings to update
     * @returns {Promise<Object>} Update result
     */
    async updateUserSettings(newSettings) {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            const result = await this.dbService.updateUserSettings(userId, newSettings);

            // Update local settings
            this.userSettings = { ...this.userSettings, ...newSettings };

            return result;
        } catch (error) {
            console.error('Failed to update user settings:', error);
            throw error;
        }
    }

    /**
     * Get user dashboard data
     * @returns {Promise<Object>} Dashboard data
     */
    async getDashboardData() {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            // Get portfolio data
            const currentPortfolio = portfolioService.getCurrentPortfolio();
            const portfolios = portfolioService.getPortfolios();
            const portfolioValue = await portfolioService.calculatePortfolioValue();

            // Get transaction stats
            const transactionStats = await this.dbService.getTransactionStats(userId);

            // Get recent transactions
            const recentTransactions = await portfolioService.getTransactionHistory();

            return {
                user: this.currentUser,
                currentPortfolio,
                portfolios,
                portfolioValue,
                transactionStats,
                recentTransactions: recentTransactions?.slice(0, 10) || [], // Last 10 transactions
                settings: this.userSettings
            };
        } catch (error) {
            console.error('Failed to get dashboard data:', error);
            throw error;
        }
    }

    /**
     * Get available stocks for the user
     * @returns {Promise<Array>} Available stocks
     */
    async getAvailableStocks() {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.getStocks(userId);
        } catch (error) {
            console.error('Failed to get available stocks:', error);
            throw error;
        }
    }

    /**
     * Get specific stock data
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Stock data
     */
    async getStock(symbol) {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.getStock(symbol, userId);
        } catch (error) {
            console.error('Failed to get stock data:', error);
            throw error;
        }
    }

    /**
     * Add a custom stock (if not demo account)
     * @param {Object} stockData - Stock data to add
     * @returns {Promise<Object>} Result
     */
    async addCustomStock(stockData) {
        try {
            if (isDemoAccount()) {
                throw new Error('Demo accounts cannot add custom stocks');
            }

            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.addCustomStock(stockData, userId);
        } catch (error) {
            console.error('Failed to add custom stock:', error);
            throw error;
        }
    }

    /**
     * Delete a custom stock (if not demo account)
     * @param {string} symbol - Stock symbol to delete
     * @returns {Promise<Object>} Result
     */
    async deleteCustomStock(symbol) {
        try {
            if (isDemoAccount()) {
                throw new Error('Demo accounts cannot delete custom stocks');
            }

            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            return await this.dbService.deleteCustomStock(symbol, userId);
        } catch (error) {
            console.error('Failed to delete custom stock:', error);
            throw error;
        }
    }

    /**
     * Execute a stock transaction
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares
     * @param {number} price - Price per share
     * @param {string} type - Transaction type ('BUY' or 'SELL')
     * @returns {Promise<Object>} Transaction result
     */
    async executeTransaction(symbol, quantity, price, type) {
        try {
            if (type === 'BUY') {
                return await portfolioService.buyStock(symbol, quantity, price);
            } else if (type === 'SELL') {
                return await portfolioService.sellStock(symbol, quantity, price);
            } else {
                throw new Error('Invalid transaction type');
            }
        } catch (error) {
            console.error('Failed to execute transaction:', error);
            throw error;
        }
    }

    /**
     * Create a new portfolio
     * @param {string} name - Portfolio name
     * @param {string} description - Portfolio description
     * @param {number} initialBalance - Initial balance
     * @returns {Promise<Object>} Created portfolio
     */
    async createPortfolio(name, description = '', initialBalance = 500) {
        try {
            return await portfolioService.createPortfolio(name, description, initialBalance);
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    /**
     * Switch to a different portfolio
     * @param {number} portfolioId - Portfolio ID to switch to
     * @returns {Promise<Object>} Result
     */
    async switchPortfolio(portfolioId) {
        try {
            const result = await portfolioService.setActivePortfolio(portfolioId);

            // Notify profile updated
            this.notifyProfileLoaded();

            return result;
        } catch (error) {
            console.error('Failed to switch portfolio:', error);
            throw error;
        }
    }

    /**
     * Reset current portfolio
     * @param {number} initialBalance - New initial balance (optional)
     * @returns {Promise<Object>} Result
     */
    async resetPortfolio(initialBalance) {
        try {
            const currentPortfolio = portfolioService.getCurrentPortfolio();
            if (!currentPortfolio) {
                throw new Error('No active portfolio');
            }

            return await portfolioService.resetPortfolio(currentPortfolio.id, initialBalance);
        } catch (error) {
            console.error('Failed to reset portfolio:', error);
            throw error;
        }
    }

    /**
     * Delete a portfolio
     * @param {number} portfolioId - Portfolio ID to delete
     * @returns {Promise<Object>} Result
     */
    async deletePortfolio(portfolioId) {
        try {
            return await portfolioService.deletePortfolio(portfolioId);
        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        }
    }

    /**
     * Update user profile information
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Update result
     */
    async updateProfile(updateData) {
        try {
            const result = await authService.updateUserProfile(updateData);

            if (result.success) {
                // Refresh current user data
                this.currentUser = await getCurrentUser();
                this.notifyProfileLoaded();
            }

            return result;
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    }

    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current portfolio
     * @returns {Object|null} Current portfolio
     */
    getCurrentPortfolio() {
        return portfolioService.getCurrentPortfolio();
    }

    /**
     * Get all user portfolios
     * @returns {Array} User portfolios
     */
    getPortfolios() {
        return portfolioService.getPortfolios();
    }

    /**
     * Get user settings
     * @returns {Object} User settings
     */
    getUserSettings() {
        return this.userSettings;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return authService.isAuthenticated();
    }

    /**
     * Check if current user is demo account
     * @returns {boolean} Demo account status
     */
    isDemoAccount() {
        return isDemoAccount();
    }

    /**
     * Check if service is initialized
     * @returns {boolean} Initialization status
     */
    getInitializationStatus() {
        return this.isInitialized;
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
            try {
                callback(this);
            } catch (error) {
                console.error('Error in profile loaded callback:', error);
            }
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
                try {
                    callback(this);
                } catch (error) {
                    console.error('Error in profile loaded callback:', error);
                }
            }
        });
    }

    /**
     * Clear user state (called on logout)
     */
    clearUserState() {
        this.isInitialized = false;
        this.currentUser = null;
        this.userSettings = null;

        // Clear portfolio service cache
        portfolioService.clearCache();

        // Notify listeners
        this.notifyProfileLoaded();
    }

    /**
     * Cleanup service (removes auth listener)
     */
    cleanup() {
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
        }
        this.clearUserState();
    }

    /**
     * Reset the user profile service
     * @returns {Promise<void>}
     */
    async reset() {
        try {
            await authService.logout();
            this.clearUserState();
        } catch (error) {
            console.error('Failed to reset user profile service:', error);
            throw error;
        }
    }
}

// Create singleton instance
const userProfileService = new UserProfileService();
export { userProfileService };