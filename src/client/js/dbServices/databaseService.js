/**
 * Service for handling all database operations via API calls
 * This client-side service communicates with the server-side MySQL database
 */
class DatabaseService {
    constructor() {
        // Base API URL
        this.baseUrl = '/api';

        // Track auth status
        this.isAuthenticated = false;
        this.currentUser = null;

        // Check for existing session
        this.checkAuthStatus();
    }

    /**
     * Check if user is currently authenticated
     */
    async checkAuthStatus() {
        try {
            const response = await this.sendRequest('auth/check', 'GET');
            this.isAuthenticated = response.authenticated;

            if (this.isAuthenticated) {
                // Get current user data if authenticated
                await this.getCurrentUser();
            }

            return this.isAuthenticated;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isAuthenticated = false;
            return false;
        }
    }

    /**
     * Get the current authenticated user
     * FIX: Changed endpoint to match server route
     */
    async getCurrentUser() {
        try {
            if (!this.isAuthenticated) {
                return null;
            }

            // FIX: Call users/current instead of auth/current-user
            const response = await this.sendRequest('users/current', 'GET');
            this.currentUser = response;
            return response;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async login(email, password) {
        try {
            const response = await this.sendRequest('auth/login', 'POST', {
                email,
                password
            });

            this.isAuthenticated = true;
            this.currentUser = response.user;
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Register a new user
     * @param {string} username - Desired username
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async register(username, email, password) {
        try {
            const response = await this.sendRequest('auth/register', 'POST', {
                username,
                email,
                password
            });

            this.isAuthenticated = true;
            this.currentUser = response.user;
            return response;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    /**
     * Logout the current user
     */
    async logout() {
        try {
            await this.sendRequest('auth/logout', 'POST');
            this.isAuthenticated = false;
            this.currentUser = null;
            return true;
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    /**
     * Use demo account
     */
    async demoLogin() {
        try {
            const response = await this.sendRequest('auth/demo-login', 'POST');

            this.isAuthenticated = true;
            this.currentUser = response.user;
            return response;
        } catch (error) {
            console.error('Demo login failed:', error);
            throw error;
        }
    }

    /**
     * Get user profile by user ID
     * FIX: Changed parameter name to be clear about expecting user ID
     */
    async getUserProfile(user_id) {
        try {
            return await this.sendRequest(`users/${user_id}`, 'GET');
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     * FIX: Now uses current user's ID instead of username
     * @param {Object} updateData - Data to update (email, currentPassword, newPassword)
     * @returns {Promise<Object>} Update result
     */
    async updateUserProfile(updateData) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            const result = await this.sendRequest(`users/${this.currentUser.id}`, 'PUT', updateData);

            // Refresh current user data after update
            await this.getCurrentUser();

            return result;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }

    /**
     * Delete user account
     * FIX: Now uses current user's ID and requires password
     * @param {string} password - User's password for confirmation
     * @returns {Promise<Object>} Delete result
     */
    async deleteAccount(password) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            const result = await this.sendRequest(`users/${this.currentUser.id}`, 'DELETE', {
                password
            });

            // Clear auth state after deletion
            this.isAuthenticated = false;
            this.currentUser = null;

            return result;
        } catch (error) {
            console.error('Account deletion failed:', error);
            throw error;
        }
    }

    /**
     * Set active portfolio
     * FIX: Use current user ID and correct field name in body
     * @param {string} portfolio_id - Portfolio ID to set as active
     */
    async setActivePortfolio(portfolio_id) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            const result = await this.sendRequest(`users/${this.currentUser.id}/active-portfolio`, 'PUT', {
                activePortfolioID: portfolio_id // FIX: Correct field name
            });

            // Update current user's active portfolio
            if (this.currentUser) {
                this.currentUser.activePortfolioID = portfolio_id;
            }

            return result;
        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    /**
     * Get user dashboard data
     */
    async getUserDashboard() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`users/${this.currentUser.id}/dashboard`, 'GET');
        } catch (error) {
            console.error('Failed to get user dashboard:', error);
            throw error;
        }
    }

    /**
     * Get all portfolios for current user
     */
    async getPortfolios() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${this.currentUser.id}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolios:', error);
            throw error;
        }
    }

    /**
     * Get a specific portfolio
     * @param {string} portfolio_id - Portfolio ID
     */
    async getPortfolio(portfolio_id) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${this.currentUser.id}/${portfolio_id}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolio:', error);
            throw error;
        }
    }

    /**
     * Create a new portfolio
     * @param {object} portfolioData - Portfolio data (name, description, initialBalance)
     */
    async createPortfolio(portfolioData) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${this.currentUser.id}`, 'POST', portfolioData);
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    /**
     * Reset a portfolio to initial state
     * @param {string} portfolio_id - Portfolio ID
     * @param {number} initialBalance - New initial balance (optional)
     */
    async resetPortfolio(portfolio_id, initialBalance) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${this.currentUser.id}/${portfolio_id}/reset`, 'POST', {
                initialBalance
            });
        } catch (error) {
            console.error('Failed to reset portfolio:', error);
            throw error;
        }
    }

    /**
     * Delete a portfolio
     * @param {string} portfolio_id - Portfolio ID
     */
    async deletePortfolio(portfolio_id) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${this.currentUser.id}/${portfolio_id}`, 'DELETE');
        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        }
    }

    async updatePortfolio(portfolio_id, portfolioData) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${this.currentUser.id}/${portfolio_id}`, 'PUT', portfolioData);
        } catch (error) {
            console.error('Failed to update portfolio data:', error);
            throw error;
        }
    }

    async saveTransaction(portfolio_id, txnOrList) {
        const payload = Array.isArray(txnOrList) ? txnOrList : [txnOrList];

        try {
            return await this.sendRequest(
                `portfolios/${portfolio_id}/transactions`,
                'POST',
                { transactions: payload }
            );
        } catch (err) {
            console.error('Failed to save transaction(s):', err);
            throw err;
        }
    }

    async getStocks() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`stocks/${this.currentUser.username}`, 'GET');
        } catch (error) {
            console.error('Failed to get stocks:', error);
            throw error;
        }
    }

    /**
     * Get a specific stock
     * @param {string} symbol - Stock symbol
     */
    async getStock(symbol) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`stocks/${this.currentUser.username}/${symbol}`, 'GET');
        } catch (error) {
            console.error('Failed to get stock:', error);
            throw error;
        }
    }

    /**
     * Add a custom stock
     * @param {object} stockData - Stock data (symbol, companyName, sector, initialPrice, volatility)
     */
    async addCustomStock(stockData) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`stocks/${this.currentUser.username}`, 'POST', stockData);
        } catch (error) {
            console.error('Failed to add custom stock:', error);
            throw error;
        }
    }

    /**
     * Delete a custom stock
     * @param {string} symbol - Stock symbol
     */
    async deleteCustomStock(symbol) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`stocks/${this.currentUser.username}/${symbol}`, 'DELETE');
        } catch (error) {
            console.error('Failed to delete custom stock:', error);
            throw error;
        }
    }

    /**
     * Get all transactions for current user
     */
    async getTransactions() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`transactions/${this.currentUser.username}`, 'GET');
        } catch (error) {
            console.error('Failed to get transactions:', error);
            throw error;
        }
    }

    /**
     * Get transactions for a specific portfolio
     * @param {string} portfolio_id - Portfolio ID
     */
    async getPortfolioTransactions(portfolio_id) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`transactions/${this.currentUser.username}/${portfolio_id}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolio transactions:', error);
            throw error;
        }
    }

    async executeTransaction(transactionData) {
        try {
            return await this.sendRequest('transactions', 'POST', transactionData);
        } catch (error) {
            console.error('Failed to execute transaction:', error);
            throw error;
        }
    }

    async getTransactionStats() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`transactions/${this.currentUser.username}/stats`, 'GET');
        } catch (error) {
            console.error('Failed to get transaction stats:', error);
            throw error;
        }
    }

    async getSimulationSettings() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`settings/${this.currentUser.username}`, 'GET');
        } catch (error) {
            console.error('Failed to get simulation settings:', error);
            throw error;
        }
    }

    async saveSimulationSettings(settings) {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`settings/${this.currentUser.username}`, 'PUT', settings);
        } catch (error) {
            console.error('Failed to save simulation settings:', error);
            throw error;
        }
    }

    async resetSimulationSettings() {
        try {
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`settings/${this.currentUser.username}/reset`, 'POST');
        } catch (error) {
            console.error('Failed to reset simulation settings:', error);
            throw error;
        }
    }

    async sendRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}/${endpoint}`;
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        // allow bodies for PATCH / DELETE too
        if (data && !['GET','HEAD'].includes(method))
            opts.body = JSON.stringify(data);

        const res = await fetch(url, opts);

        if (!res.ok) {
            // 204 or 205 have no body → skip .json()
            let msg = `HTTP ${res.status}`;
            try { msg = (await res.json()).error || msg; } catch (_){}
            throw new Error(msg);
        }

        // 204 No Content → return null
        if (res.status === 204) return null;
        return res.json();
    }
}

export default DatabaseService;

const databaseService = new DatabaseService();
export { databaseService };