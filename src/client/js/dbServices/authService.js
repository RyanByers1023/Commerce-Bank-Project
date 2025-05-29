import { databaseService } from './databaseService.js';

/**
 * Service for handling authentication and user management
 */
export default class AuthService {
    constructor() {
        this.dbService = databaseService;
        this.authStateChangedCallbacks = [];

        // Initialize auth state
        this.checkAuthStatus();
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} Authentication status
     */
    async checkAuthStatus() {
        try {
            const isAuthenticated = await this.dbService.checkAuthStatus();
            this.notifyAuthStateChanged();
            return isAuthenticated;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    /**
     * Get current user
     * @returns {Promise<Object|null>} User data or null if not authenticated
     */
    async getCurrentUser() {
        try {
            return await this.dbService.getCurrentUser();
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Login result
     */
    async login(email, password) {
        try {
            const result = await this.dbService.login(email, password);
            this.notifyAuthStateChanged();
            return result;
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
     * @returns {Promise<Object>} Registration result
     */
    async register(username, email, password) {
        try {
            const result = await this.dbService.register(username, email, password);
            this.notifyAuthStateChanged();
            return result;
        } catch (error) {
            console.error('Registration failed:', error);
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
            this.notifyAuthStateChanged();
            return true;
        } catch (error) {
            console.error('Logout failed:', error);
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
            this.notifyAuthStateChanged();
            return result;
        } catch (error) {
            console.error('Demo login failed:', error);
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this.dbService.isAuthenticated;
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
        const currentUser = this.dbService.currentUser;
        const isAuthenticated = this.dbService.isAuthenticated;
        callback(currentUser, isAuthenticated);

        // Return unsubscribe function
        return () => {
            this.authStateChangedCallbacks = this.authStateChangedCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners of auth state change
     */
    notifyAuthStateChanged() {
        const currentUser = this.dbService.currentUser;
        const isAuthenticated = this.dbService.isAuthenticated;

        this.authStateChangedCallbacks.forEach(callback => {
            if (typeof callback === 'function') {
                callback(currentUser, isAuthenticated);
            }
        });
    }

    /**
     * Update user profile
     * @param {string} username - Username
     * @param {Object} updateData - Data to update (email, password)
     * @returns {Promise<Object>} Update result
     */
    async updateUserProfile(username, updateData) {
        try {
            const result = await this.dbService.sendRequest(`users/${username}`, 'PUT', updateData);

            // Refresh current user if it was updated
            if (this.dbService.currentUser && this.dbService.currentUser.username === username) {
                await this.dbService.getCurrentUser();
                this.notifyAuthStateChanged();
            }

            return result;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }

    /**
     * Delete user account
     * @param {string} username - Username to delete
     * @returns {Promise<Object>} Delete result
     */
    async deleteAccount(username) {
        try {
            const result = await this.dbService.sendRequest(`users/${username}`, 'DELETE');

            // If current user was deleted, update auth state
            if (this.dbService.currentUser && this.dbService.currentUser.username === username) {
                this.dbService.isAuthenticated = false;
                this.dbService.currentUser = null;
                this.notifyAuthStateChanged();
            }

            return result;
        } catch (error) {
            console.error('Account deletion failed:', error);
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

export function isAuthenticated() {
    return authService.isAuthenticated();
}

export function requireAuth(redirectUrl = '/login.html') {
    if (!authService.isAuthenticated()) {
        window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
        return false;
    }
    return true;
}

export function redirectIfAuthenticated(redirectUrl = '/dashboard.html') {
    if (authService.isAuthenticated()) {
        window.location.href = redirectUrl;
        return true;
    }
    return false;
}