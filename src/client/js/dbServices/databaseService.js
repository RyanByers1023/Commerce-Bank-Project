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
     */
    async getCurrentUser() {
        try {
            if (!this.isAuthenticated) {
                return null;
            }

            // The server knows the current user from the session
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
     * Get user profile by username
     * @param {string} username - Username to fetch
     */
    async getUserProfile(username) {
        try {
            return await this.sendRequest(`users/${username}`, 'GET');
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    /**
     * Get all portfolios for a user
     * @param {string} username - Username
     */
    async getPortfolios(username) {
        try {
            return await this.sendRequest(`portfolios/${username}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolios:', error);
            throw error;
        }
    }

    /**
     * Get a specific portfolio
     * @param {string} username - Username
     * @param {string} portfolioId - Portfolio ID
     */
    async getPortfolio(username, portfolioId) {
        try {
            return await this.sendRequest(`portfolios/${username}/${portfolioId}`, 'GET');
        } catch (error) {
            console.error('Failed to get portfolio:', error);
            throw error;
        }
    }

    /**
     * Create a new portfolio
     * @param {string} username - Username
     * @param {object} portfolioData - Portfolio data (name, description, initialBalance)
     */
    async createPortfolio(username, portfolioData) {
        try {
            return await this.sendRequest(`portfolios/${username}`, 'POST', portfolioData);
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    /**
     * Reset a portfolio to initial state
     * @param {string} username - Username
     * @param {string} portfolioId - Portfolio ID
     * @param {number} initialBalance - New initial balance (optional)
     */
    async resetPortfolio(username, portfolioId, initialBalance) {
        try {
            return await this.sendRequest(`portfolios/${username}/${portfolioId}/reset`, 'POST', {
                initialBalance
            });
        } catch (error) {
            console.error('Failed to reset portfolio:', error);
            throw error;
        }
    }

    /**
     * Delete a portfolio
     * @param {string} username - Username
     * @param {string} portfolioId - Portfolio ID
     */
    async deletePortfolio(username, portfolioId) {
        try {
            return await this.sendRequest(`portfolios/${username}/${portfolioId}`, 'DELETE');
        } catch (error) {
            console.error('Failed to delete portfolio:', error);
            throw error;
        }
    }

    /**
     * Set active portfolio
     * @param {string} username - Username
     * @param {string} portfolioId - Portfolio ID to set as active
     */
    async setActivePortfolio(username, portfolioId) {
        this.currentUser.setEarnings();
        this.currentUser.setTotalStocksOwned();
        try {
            return await this.sendRequest(`users/${username}/active-portfolio`, 'PUT', {
                activePortfolioId: portfolioId
            });
        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    async updatePortfolio(username, portfolioId, portfolioData) {
        try {
            return await this.sendRequest(`portfolios/${username}/${portfolioId}`, 'PUT', portfolioData);
        } catch (error) {
            console.error('Failed to update portfolio data:', error);
            throw error;
        }
    }

    async saveTransaction(portfolioId, txnOrList) {
        const payload = Array.isArray(txnOrList) ? txnOrList : [txnOrList];

        try {
            return await this.sendRequest(
                `portfolios/${portfolioId}/transactions`,   // ← note: removed stray space
                'POST',
                { transactions: payload }
            );
        } catch (err) {
            console.error('Failed to save transaction(s):', err);
            throw err;
        }
    }

    async getStocks(userID) {
        try {
            return await this.sendRequest(`stocks/${userID}`, 'GET');
        } catch (error) {
            console.error('Failed to get stocks:', error);
            throw error;
        }
    }

    /**
     * Get a specific stock
     * @param {int} user_id -- user's unique id
     * @param {string} symbol - Stock symbol
     */
    async getStock(user_id, symbol) {
        try {
            return await this.sendRequest(`stocks/${user_id}/${symbol}`, 'GET');
        } catch (error) {
            console.error('Failed to get stock:', error);
            throw error;
        }
    }

    /**
     * Add a custom stock
     * @param {string} username - Username
     * @param {object} stockData - Stock data (symbol, companyName, sector, initialPrice, volatility)
     */
    async addCustomStock(username, stockData) {
        try {
            return await this.sendRequest(`stocks/${username}`, 'POST', stockData);
        } catch (error) {
            console.error('Failed to add custom stock:', error);
            throw error;
        }
    }

    /**
     * Delete a custom stock
     * @param {string} username - Username
     * @param {string} symbol - Stock symbol
     */
    async deleteCustomStock(username, symbol) {
        try {
            return await this.sendRequest(`stocks/${username}/${symbol}`, 'DELETE');
        } catch (error) {
            console.error('Failed to delete custom stock:', error);
            throw error;
        }
    }

    /**
     * Get all transactions for a user
     * @param {string} username - Username
     */
    async getTransactions(username) {
        try {
            return await this.sendRequest(`transactions/${username}`, 'GET');
        } catch (error) {
            console.error('Failed to get transactions:', error);
            throw error;
        }
    }

    /**
     * Get transactions for a specific portfolio
     * @param {string} username - Username
     * @param {string} portfolioId - Portfolio ID
     */
    async getPortfolioTransactions(username, portfolioId) {
        try {
            return await this.sendRequest(`transactions/${username}/${portfolioId}`, 'GET');
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

    async getTransactionStats(username) {
        try {
            return await this.sendRequest(`transactions/${username}/stats`, 'GET');
        } catch (error) {
            console.error('Failed to get transaction stats:', error);
            throw error;
        }
    }

    async getSimulationSettings(username) {
        try {
            return await this.sendRequest(`settings/${username}`, 'GET');
        } catch (error) {
            console.error('Failed to get simulation settings:', error);
            throw error;
        }
    }

    async saveSimulationSettings(username, settings) {
        try {
            return await this.sendRequest(`settings/${username}`, 'PUT', settings);
        } catch (error) {
            console.error('Failed to save simulation settings:', error);
            throw error;
        }
    }

    async resetSimulationSettings(username) {
        try {
            return await this.sendRequest(`settings/${username}/reset`, 'POST');
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