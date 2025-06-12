import { databaseService } from './databaseService.js';
import { getCurrentUser, getCurrentUserId } from './authService.js';

/**
 * Service for managing simulation settings and state
 */
class SimulationService {
    constructor() {
        this.dbService = databaseService;

        // Default settings (matching backend schema)
        this.settings = {
            sim_speed: 1,
            market_volatility: 'medium',
            event_frequency: 'medium',
            initial_balance: 500.00
        };

        // Volatility factors by level
        this.volatilityFactors = {
            low: 0.6,
            medium: 1.0,
            high: 1.6
        };

        // Event probabilities by level
        this.eventProbabilities = {
            none: 0,
            low: 0.02,
            medium: 0.05,
            high: 0.1
        };

        // Listeners for settings changes
        this.settingsChangeListeners = [];
        this.isLoaded = false;
    }

    /**
     * Load simulation settings for current user
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Object>} Simulation settings
     */
    async loadSettings(forceRefresh = false) {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                // If not authenticated, use defaults
                return this.settings;
            }

            // Return cached settings if already loaded and not forcing refresh
            if (this.isLoaded && !forceRefresh) {
                return this.settings;
            }

            // FIXED: Use correct method name and user ID
            const settings = await this.dbService.getUserSettings(userId);

            // Update local settings with server data
            this.settings = {
                sim_speed: settings.sim_speed || 1,
                market_volatility: settings.market_volatility || 'medium',
                event_frequency: settings.event_frequency || 'medium',
                initial_balance: settings.initial_balance || 500.00
            };

            this.isLoaded = true;

            // Notify listeners
            this.notifySettingsChanged();

            return this.settings;
        } catch (error) {
            console.error('Failed to load simulation settings:', error);
            // Return defaults on error but still mark as loaded to avoid infinite retries
            this.isLoaded = true;
            return this.settings;
        }
    }

    /**
     * Save simulation settings
     * @param {Object} newSettings - Settings to save
     * @returns {Promise<Object>} Updated settings
     */
    async saveSettings(newSettings) {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            // Validate settings
            const validatedSettings = this.validateSettings(newSettings);

            // FIXED: Use correct method name and parameter order
            const updatedSettings = await this.dbService.updateUserSettings(userId, validatedSettings);

            // Update local settings
            this.settings = {
                ...this.settings,
                ...validatedSettings
            };

            // Notify listeners
            this.notifySettingsChanged();

            return this.settings;
        } catch (error) {
            console.error('Failed to save simulation settings:', error);
            throw error;
        }
    }

    /**
     * Reset settings to defaults
     * @returns {Promise<Object>} Default settings
     */
    async resetSettings() {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            // FIXED: Use correct method name and user ID
            const defaultSettings = await this.dbService.resetUserSettings(userId);

            // Update local settings
            this.settings = {
                sim_speed: defaultSettings.sim_speed || 1,
                market_volatility: defaultSettings.market_volatility || 'medium',
                event_frequency: defaultSettings.event_frequency || 'medium',
                initial_balance: defaultSettings.initial_balance || 500.00
            };

            // Notify listeners
            this.notifySettingsChanged();

            return this.settings;
        } catch (error) {
            console.error('Failed to reset simulation settings:', error);
            throw error;
        }
    }

    /**
     * Validate settings before saving
     * @param {Object} settings - Settings to validate
     * @returns {Object} Validated settings
     */
    validateSettings(settings) {
        const validated = {};

        // Validate sim_speed
        if (settings.sim_speed !== undefined) {
            if (!Number.isInteger(settings.sim_speed) || settings.sim_speed < 1 || settings.sim_speed > 40) {
                throw new Error('Simulation speed must be an integer between 1 and 40');
            }
            validated.sim_speed = settings.sim_speed;
        }

        // Validate market_volatility
        if (settings.market_volatility !== undefined) {
            if (!['low', 'medium', 'high'].includes(settings.market_volatility)) {
                throw new Error('Market volatility must be "low", "medium", or "high"');
            }
            validated.market_volatility = settings.market_volatility;
        }

        // Validate event_frequency
        if (settings.event_frequency !== undefined) {
            if (!['none', 'low', 'medium', 'high'].includes(settings.event_frequency)) {
                throw new Error('Event frequency must be "none", "low", "medium", or "high"');
            }
            validated.event_frequency = settings.event_frequency;
        }

        // Validate initial_balance
        if (settings.initial_balance !== undefined) {
            if (typeof settings.initial_balance !== 'number' || settings.initial_balance < 100 || settings.initial_balance > 10000) {
                throw new Error('Initial balance must be a number between 100 and 10000');
            }
            validated.initial_balance = settings.initial_balance;
        }

        return validated;
    }

    /**
     * Update a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {Promise<Object>} Updated settings
     */
    async updateSetting(key, value) {
        try {
            const settingsUpdate = { [key]: value };
            return await this.saveSettings(settingsUpdate);
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get current simulation speed (multiplier)
     * @returns {number} Speed multiplier
     */
    getSimulationSpeed() {
        return this.settings.sim_speed || 1;
    }

    /**
     * Get current market volatility factor
     * @returns {number} Volatility factor
     */
    getVolatilityFactor() {
        const level = this.settings.market_volatility || 'medium';
        return this.volatilityFactors[level] || 1.0;
    }

    /**
     * Get current event probability
     * @returns {number} Event probability
     */
    getEventProbability() {
        const level = this.settings.event_frequency || 'medium';
        return this.eventProbabilities[level] || 0.05;
    }

    /**
     * Get initial balance amount
     * @returns {number} Initial balance
     */
    getInitialBalance() {
        return this.settings.initial_balance || 500.00;
    }

    /**
     * Get all current settings
     * @returns {Object} Current settings
     */
    getCurrentSettings() {
        return { ...this.settings };
    }

    /**
     * Check if settings are loaded
     * @returns {boolean} Whether settings are loaded
     */
    isSettingsLoaded() {
        return this.isLoaded;
    }

    /**
     * Add a listener for settings changes
     * @param {Function} listener - Callback function
     * @returns {Function} Function to remove the listener
     */
    onSettingsChanged(listener) {
        if (typeof listener !== 'function') {
            console.error('onSettingsChanged requires a function callback');
            return () => {};
        }

        this.settingsChangeListeners.push(listener);

        // Call immediately with current settings if loaded
        if (this.isLoaded) {
            try {
                listener(this.settings);
            } catch (error) {
                console.error('Error in settings change listener:', error);
            }
        }

        // Return unsubscribe function
        return () => {
            this.settingsChangeListeners = this.settingsChangeListeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of settings changes
     */
    notifySettingsChanged() {
        this.settingsChangeListeners.forEach(listener => {
            if (typeof listener === 'function') {
                try {
                    listener(this.settings);
                } catch (error) {
                    console.error('Error in settings change listener:', error);
                }
            }
        });
    }

    /**
     * Get available simulation speed options
     * @returns {Array} Speed options
     */
    getSpeedOptions() {
        return [
            { value: 1, label: '1x', description: 'Real-time simulation' },
            { value: 5, label: '5x', description: '5x faster than real-time' },
            { value: 10, label: '10x', description: '10x faster than real-time' },
            { value: 20, label: '20x', description: '20x faster than real-time' },
            { value: 40, label: '40x', description: '40x faster than real-time' }
        ];
    }

    /**
     * Get available market volatility options
     * @returns {Array} Volatility options
     */
    getVolatilityOptions() {
        return [
            {
                value: 'low',
                label: 'Low',
                description: 'Lower price fluctuations',
                factor: this.volatilityFactors.low
            },
            {
                value: 'medium',
                label: 'Medium',
                description: 'Moderate price fluctuations',
                factor: this.volatilityFactors.medium
            },
            {
                value: 'high',
                label: 'High',
                description: 'Higher price fluctuations',
                factor: this.volatilityFactors.high
            }
        ];
    }

    /**
     * Get available event frequency options
     * @returns {Array} Frequency options
     */
    getEventFrequencyOptions() {
        return [
            {
                value: 'none',
                label: 'None',
                description: 'No market events',
                probability: this.eventProbabilities.none
            },
            {
                value: 'low',
                label: 'Low',
                description: 'Occasional market events',
                probability: this.eventProbabilities.low
            },
            {
                value: 'medium',
                label: 'Medium',
                description: 'Regular market events',
                probability: this.eventProbabilities.medium
            },
            {
                value: 'high',
                label: 'High',
                description: 'Frequent market events',
                probability: this.eventProbabilities.high
            }
        ];
    }

    /**
     * Get available initial balance options
     * @returns {Array} Balance options
     */
    getInitialBalanceOptions() {
        return [
            { value: 500, label: '$500', description: 'Conservative starting amount' },
            { value: 1000, label: '$1,000', description: 'Standard starting amount' },
            { value: 2500, label: '$2,500', description: 'Moderate starting amount' },
            { value: 5000, label: '$5,000', description: 'Aggressive starting amount' },
            { value: 10000, label: '$10,000', description: 'Maximum starting amount' }
        ];
    }

    /**
     * Clear settings cache
     */
    clearCache() {
        this.isLoaded = false;
        this.settings = {
            sim_speed: 1,
            market_volatility: 'medium',
            event_frequency: 'medium',
            initial_balance: 500.00
        };
    }

    /**
     * Export settings for backup
     * @returns {Object} Settings export
     */
    exportSettings() {
        return {
            settings: { ...this.settings },
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import settings from backup
     * @param {Object} exportData - Exported settings data
     * @returns {Promise<Object>} Imported settings
     */
    async importSettings(exportData) {
        try {
            if (!exportData || !exportData.settings) {
                throw new Error('Invalid export data');
            }

            return await this.saveSettings(exportData.settings);
        } catch (error) {
            console.error('Failed to import settings:', error);
            throw error;
        }
    }
}

// Create singleton instance
const simulationService = new SimulationService();
export { simulationService };