export default class DatabaseManager {
    constructor() {
        // Connection settings would be loaded from a config file in production
        this.apiEndpoint = '/db.js';
    }

    // Generic method to send requests to the server API
    async sendRequest(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.apiEndpoint}/${endpoint}`, options);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Database request failed:', error);
            throw error;
        }
    }

    // Load user profile from database
    async loadUserProfile(username) {
        return this.sendRequest(`users/${username}`);
    }

    // Save user profile to database
    async saveUserProfile(userProfile) {
        const userData = {
            username: userProfile.username,
            portfolio: {
                balance: userProfile.portfolio.balance,
                initialBalance: userProfile.portfolio.initialBalance,
                totalAssetsValue: userProfile.portfolio.totalAssetsValue
            }
        };

        return this.sendRequest(`users/${userProfile.username}`, 'PUT', userData);
    }

    // Record a transaction in the database
    async recordTransaction(transaction) {
        return this.sendRequest('transactions', 'POST', transaction);
    }

    // Get transaction history for a user
    async getTransactionHistory(username) {
        return this.sendRequest(`transactions/${username}`);
    }

    // Save updated stock holdings
    async updateHoldings(username, holdings) {
        return this.sendRequest(`holdings/${username}`, 'PUT', holdings);
    }

    // Get holdings for a user
    async getHoldings(username) {
        return this.sendRequest(`holdings/${username}`);
    }
}