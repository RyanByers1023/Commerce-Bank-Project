import { databaseService } from './databaseService.js';

/**
 * Service for handling authentication and user management
 */
export default class AuthService {
    constructor() {
        this.dbService = databaseService;
        this.authStateChangedCallbacks = [];
        this._currentUser = null;
        this._isAuthenticated = false;

        // Initialize auth state
        this.checkAuthStatus();
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} Authentication status
     */
    async checkAuthStatus() {
        try {
            const authResult = await this.dbService.checkAuthStatus();

            if (authResult && authResult.authenticated && authResult.user) {
                this._currentUser = authResult.user;
                this._isAuthenticated = true;
            } else {
                this._currentUser = null;
                this._isAuthenticated = false;
            }

            this.notifyAuthStateChanged();
            return this._isAuthenticated;
        } catch (error) {
            console.error('Auth check failed:', error);
            this._currentUser = null;
            this._isAuthenticated = false;
            this.notifyAuthStateChanged();
            return false;
        }
    }

    /**
     * Get current user
     * @returns {Object|null} User data or null if not authenticated
     */
    getCurrentUser() {
        return this._currentUser;
    }

    /**
     * Get current user ID
     * @returns {number|null} User ID or null if not authenticated
     */
    getCurrentUserId() {
        return this._currentUser?.id || null;
    }

    /**
     * Check if current user is a demo account
     * @returns {boolean} Whether current user is demo account
     */
    isDemoAccount() {
        return this._currentUser?.isDemo || false;
    }

    /**
     * Check if current user is an admin
     * @returns {boolean} Whether current user is admin
     */
    isAdmin() {
        return this._currentUser?.isAdmin || false;
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {boolean} rememberMe - Whether to remember login
     * @returns {Promise<Object>} Login result
     */
    async login(email, password, rememberMe = false) {
        try {
            const result = await this.dbService.login(email, password, rememberMe);

            if (result.user) {
                this._currentUser = result.user;
                this._isAuthenticated = true;
            }

            this.notifyAuthStateChanged();
            return result;
        } catch (error) {
            console.error('Login failed:', error);
            this._currentUser = null;
            this._isAuthenticated = false;
            this.notifyAuthStateChanged();
            throw error;
        }
    }

    /**
     * Register a new user
     * @param {string} username - Desired username
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Registration result
     */
    async register(username, email, password) {
        try {
            const result = await this.dbService.register(username, email, password);

            if (result.user) {
                this._currentUser = result.user;
                this._isAuthenticated = true;
            }

            this.notifyAuthStateChanged();
            return result;
        } catch (error) {
            console.error('Registration failed:', error);
            this._currentUser = null;
            this._isAuthenticated = false;
            this.notifyAuthStateChanged();
            throw error;
        }
    }

    /**
     * Logout current user
     * @returns {Promise<boolean>} Logout success
     */
    async logout() {
        try {
            await this.dbService.logout();
            this._currentUser = null;
            this._isAuthenticated = false;
            this.notifyAuthStateChanged();
            return true;
        } catch (error) {
            console.error('Logout failed:', error);
            // Still clear local state even if server call fails
            this._currentUser = null;
            this._isAuthenticated = false;
            this.notifyAuthStateChanged();
            throw error;
        }
    }

    /**
     * Use demo account
     * @returns {Promise<Object>} Demo login result
     */
    async demoLogin() {
        try {
            const result = await this.dbService.demoLogin();

            if (result.user) {
                this._currentUser = result.user;
                this._isAuthenticated = true;
            }

            this.notifyAuthStateChanged();
            return result;
        } catch (error) {
            console.error('Demo login failed:', error);
            this._currentUser = null;
            this._isAuthenticated = false;
            this.notifyAuthStateChanged();
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this._isAuthenticated;
    }

    /**
     * Add a listener for auth state changes
     * @param {Function} callback - Function to call when auth state changes
     * @returns {Function} Function to remove the listener
     */
    onAuthStateChanged(callback) {
        if (typeof callback !== 'function') {
            console.error('onAuthStateChanged requires a function callback');
            return () => {};
        }

        this.authStateChangedCallbacks.push(callback);

        // Call immediately with current state
        callback(this._currentUser, this._isAuthenticated);

        // Return unsubscribe function
        return () => {
            this.authStateChangedCallbacks = this.authStateChangedCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners of auth state change
     */
    notifyAuthStateChanged() {
        this.authStateChangedCallbacks.forEach(callback => {
            if (typeof callback === 'function') {
                try {
                    callback(this._currentUser, this._isAuthenticated);
                } catch (error) {
                    console.error('Error in auth state change callback:', error);
                }
            }
        });
    }

    /**
     * Update user profile
     * @param {Object} updateData - Data to update (email, currentPassword, newPassword)
     * @returns {Promise<Object>} Update result
     */
    async updateUserProfile(updateData) {
        try {
            const result = await this.dbService.updateUserProfile(updateData);

            // If update was successful, refresh user data
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
            const result = await this.dbService.deleteAccount(password);

            // Clear auth state after successful deletion
            if (result.success) {
                this._currentUser = null;
                this._isAuthenticated = false;
                this.notifyAuthStateChanged();
            }

            return result;
        } catch (error) {
            console.error('Account deletion failed:', error);
            throw error;
        }
    }

    /**
     * Set active portfolio
     * @param {number} portfolioId - Portfolio ID to set as active
     * @returns {Promise<Object>} Result
     */
    async setActivePortfolio(portfolioId) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const result = await this.dbService.setActivePortfolio(userId, portfolioId);

            // Update current user data if successful
            if (result.success && this._currentUser) {
                this._currentUser.activePortfolioId = portfolioId;
                this.notifyAuthStateChanged();
            }

            return result;
        } catch (error) {
            console.error('Failed to set active portfolio:', error);
            throw error;
        }
    }

    /**
     * Get user dashboard data
     * @returns {Promise<Object>} Dashboard data
     */
    async getUserDashboard() {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            return await this.dbService.getUserDashboard(userId);
        } catch (error) {
            console.error('Failed to get dashboard data:', error);
            throw error;
        }
    }

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise<Object>} Reset request result
     */
    async requestPasswordReset(email) {
        try {
            return await this.dbService.requestPasswordReset(email);
        } catch (error) {
            console.error('Password reset request failed:', error);
            throw error;
        }
    }

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Reset result
     */
    async resetPassword(token, newPassword) {
        try {
            return await this.dbService.resetPassword(token, newPassword);
        } catch (error) {
            console.error('Password reset failed:', error);
            throw error;
        }
    }

    /**
     * Get user preferences/settings
     * @returns {Promise<Object>} User settings
     */
    async getUserSettings() {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            return await this.dbService.getUserSettings(userId);
        } catch (error) {
            console.error('Failed to get user settings:', error);
            throw error;
        }
    }

    /**
     * Update user settings
     * @param {Object} settings - Settings to update
     * @returns {Promise<Object>} Update result
     */
    async updateUserSettings(settings) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            return await this.dbService.updateUserSettings(userId, settings);
        } catch (error) {
            console.error('Failed to update user settings:', error);
            throw error;
        }
    }
}

// Create singleton instance
const authService = new AuthService();
export { authService };

// Helper functions for common auth operations
export function getCurrentUser() {
    return authService.getCurrentUser();
}

export function getCurrentUserId() {
    return authService.getCurrentUserId();
}

export function isAuthenticated() {
    return authService.isAuthenticated();
}

export function isDemoAccount() {
    return authService.isDemoAccount();
}

export function isAdmin() {
    return authService.isAdmin();
}

export function requireAuth(redirectUrl = '/login.html') {
    if (!authService.isAuthenticated()) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(currentPath)}`;
        return false;
    }
    return true;
}

export function requireNonDemo(message = 'This action is not available for demo accounts') {
    if (authService.isDemoAccount()) {
        alert(message);
        return false;
    }
    return true;
}

export function redirectIfAuthenticated(redirectUrl = '/dashboard.html') {
    if (authService.isAuthenticated()) {
        // Check for redirect parameter
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');

        if (redirect && redirect.startsWith('/')) {
            window.location.href = redirect;
        } else {
            window.location.href = redirectUrl;
        }
        return true;
    }
    return false;
}