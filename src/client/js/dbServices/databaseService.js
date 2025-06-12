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

            // FIXED: Handle user data returned from auth check
            if (this.isAuthenticated && response.user) {
                this.currentUser = response.user;
            } else {
                this.currentUser = null;
            }

            return response; // Return full response for AuthService
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
            return { authenticated: false, user: null };
        }
    }

    /**
     * Get the current authenticated user
     */
    async getCurrentUser() {
        try {
            if (!this.isAuthenticated || !this.currentUser) {
                return null;
            }

            // FIXED: Just return the current user data we already have
            // The auth/check endpoint provides user data, so we don't need a separate call
            return this.currentUser;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {boolean} rememberMe - Whether to remember login
     */
    async login(email, password, rememberMe = false) {
        try {
            const response = await this.sendRequest('auth/login', 'POST', {
                email,
                password,
                rememberMe // FIXED: Added rememberMe parameter
            });

            this.isAuthenticated = true;
            this.currentUser = response.user;
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
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
            this.isAuthenticated = false;
            this.currentUser = null;
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
            // Clear local state even if server call fails
            this.isAuthenticated = false;
            this.currentUser = null;
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
            this.isAuthenticated = false;
            this.currentUser = null;
            throw error;
        }
    }

    /**
     * Request password reset
     * @param {string} email - User email
     */
    async requestPasswordReset(email) {
        try {
            return await this.sendRequest('auth/forgot-password', 'POST', { email });
        } catch (error) {
            console.error('Password reset request failed:', error);
            throw error;
        }
    }

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} password - New password
     */
    async resetPassword(token, password) {
        try {
            return await this.sendRequest('auth/reset-password', 'POST', { token, password });
        } catch (error) {
            console.error('Password reset failed:', error);
            throw error;
        }
    }

    /**
     * Get user profile by user ID
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
            if (result.success) {
                await this.checkAuthStatus();
            }

            return result;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }

    /**
     * Delete user account
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
     * @param {number} userId - User ID
     * @param {number} portfolioId - Portfolio ID to set as active
     */
    async setActivePortfolio(userId, portfolioId) {
        try {
            const result = await this.sendRequest(`users/${userId}/active-portfolio`, 'PUT', {
                activePortfolioId: portfolioId
            });

            // Update current user's active portfolio if it's the current user
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser.activePortfolioId = portfolioId;
            }

            return result;
        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    /**
     * Get user dashboard data
     * @param {number} userId - User ID
     */
    async getUserDashboard(userId) {
        try {
            return await this.sendRequest(`users/${userId}/dashboard`, 'GET');
        } catch (error) {
            console.error('Failed to get user dashboard:', error);
            throw error;
        }
    }

    /**
     * Get all portfolios for a user
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getPortfolios(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${targetUserId}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolios:', error);
            throw error;
        }
    }

    /**
     * Get a specific portfolio
     * @param {number} portfolioId - Portfolio ID
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getPortfolio(portfolioId, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${targetUserId}/${portfolioId}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolio:', error);
            throw error;
        }
    }

    /**
     * Create a new portfolio
     * @param {object} portfolioData - Portfolio data (name, description, initialBalance)
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async createPortfolio(portfolioData, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${targetUserId}`, 'POST', portfolioData);
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    /**
     * Reset a portfolio to initial state
     * @param {number} portfolioId - Portfolio ID
     * @param {number} initialBalance - New initial balance (optional)
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async resetPortfolio(portfolioId, initialBalance, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${targetUserId}/${portfolioId}/reset`, 'POST', {
                initialBalance
            });
        } catch (error) {
            console.error('Failed to reset portfolio:', error);
            throw error;
        }
    }

    /**
     * Delete a portfolio
     * @param {number} portfolioId - Portfolio ID
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async deletePortfolio(portfolioId, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${targetUserId}/${portfolioId}`, 'DELETE');
        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        }
    }

    /**
     * Update portfolio
     * @param {number} portfolioId - Portfolio ID
     * @param {object} portfolioData - Portfolio data to update
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async updatePortfolio(portfolioId, portfolioData, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            return await this.sendRequest(`portfolios/${targetUserId}/${portfolioId}`, 'PUT', portfolioData);
        } catch (error) {
            console.error('Failed to update portfolio data:', error);
            throw error;
        }
    }

    /**
     * Get all stocks for a user
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getStocks(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`stocks/${targetUserId}`, 'GET');
        } catch (error) {
            console.error('Failed to get stocks:', error);
            throw error;
        }
    }

    /**
     * Get a specific stock
     * @param {string} symbol - Stock symbol
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getStock(symbol, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`stocks/${targetUserId}/${symbol}`, 'GET');
        } catch (error) {
            console.error('Failed to get stock:', error);
            throw error;
        }
    }

    /**
     * Add a custom stock
     * @param {object} stockData - Stock data (symbol, companyName, sector, initialPrice, volatility)
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async addCustomStock(stockData, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`stocks/${targetUserId}`, 'POST', stockData);
        } catch (error) {
            console.error('Failed to add custom stock:', error);
            throw error;
        }
    }

    /**
     * Delete a custom stock
     * @param {string} symbol - Stock symbol
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async deleteCustomStock(symbol, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`stocks/${targetUserId}/${symbol}`, 'DELETE');
        } catch (error) {
            console.error('Failed to delete custom stock:', error);
            throw error;
        }
    }

    /**
     * Get all transactions for a user
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getTransactions(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`transactions/${targetUserId}`, 'GET');
        } catch (error) {
            console.error('Failed to get transactions:', error);
            throw error;
        }
    }

    /**
     * Get transactions for a specific portfolio
     * @param {number} portfolioId - Portfolio ID
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getPortfolioTransactions(portfolioId, userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`transactions/${targetUserId}/${portfolioId}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolio transactions:', error);
            throw error;
        }
    }

    /**
     * Execute a transaction
     * @param {object} transactionData - Transaction data
     */
    async executeTransaction(transactionData) {
        try {
            return await this.sendRequest('transactions', 'POST', transactionData);
        } catch (error) {
            console.error('Failed to execute transaction:', error);
            throw error;
        }
    }

    /**
     * Get transaction statistics
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getTransactionStats(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`transactions/${targetUserId}/stats`, 'GET');
        } catch (error) {
            console.error('Failed to get transaction stats:', error);
            throw error;
        }
    }

    /**
     * Get simulation settings
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async getUserSettings(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username, renamed method
            return await this.sendRequest(`settings/${targetUserId}`, 'GET');
        } catch (error) {
            console.error('Failed to get user settings:', error);
            throw error;
        }
    }

    /**
     * Save simulation settings
     * @param {number} userId - User ID
     * @param {object} settings - Settings to save
     */
    async updateUserSettings(userId, settings) {
        try {
            // FIXED: Use user_id instead of username, renamed method
            return await this.sendRequest(`settings/${userId}`, 'PUT', settings);
        } catch (error) {
            console.error('Failed to update user settings:', error);
            throw error;
        }
    }

    /**
     * Reset simulation settings
     * @param {number} userId - User ID (optional, defaults to current user)
     */
    async resetUserSettings(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            if (!targetUserId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use user_id instead of username
            return await this.sendRequest(`settings/${targetUserId}/reset`, 'POST');
        } catch (error) {
            console.error('Failed to reset user settings:', error);
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
            try {
                const errorData = await res.json();
                msg = errorData.error || msg;
            } catch (_){}
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