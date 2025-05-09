// src/client/js/SimulationService.js
import DatabaseService from './DatabaseService.js';
import { getCurrentUser } from './AuthService.js';

/**
 * Service for managing simulation settings and state
 */
export default class SimulationService {
    constructor() {
        this.dbService = new DatabaseService();

        // Default settings
        this.settings = {
            simulationSpeed: 1,
            marketVolatility: 'medium',
            eventFrequency: 'medium',
            startingCash: 500
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
    }

    /**
     * Load simulation settings for current user
     * @returns {Promise<Object>} Simulation settings
     */
    async loadSettings() {
        try {
            const user = await getCurrentUser();
            if (!user) {
                // If not authenticated, use defaults
                return this.settings;
            }

            const settings = await this.dbService.getSimulationSettings(user.username);
            this.settings = settings;

            // Notify listeners
            this.notifySettingsChanged();

            return settings;
        } catch (error) {
            console.error('Failed to load simulation settings:', error);
            // Return defaults on error
            return this.settings;
        }
    }

    /**
     * Save simulation settings
     * @param {Object} settings - Settings to save
     * @returns {Promise<Object>} Updated settings
     */
    async saveSettings(settings) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Update settings
            const updatedSettings = await this.dbService.saveSimulationSettings(user.username, settings);
            this.settings = updatedSettings;

            // Notify listeners
            this.notifySettingsChanged();

            return updatedSettings;
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
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const defaultSettings = await this.dbService.resetSimulationSettings(user.username);
            this.settings = defaultSettings;

            // Notify listeners
            this.notifySettingsChanged();

            return defaultSettings;
        } catch (error) {
            console.error('Failed to reset simulation settings:', error);
            throw error;
        }
    }

    /**
     * Get current simulation speed (multiplier)
     * @returns {number} Speed multiplier
     */
    getSimulationSpeed() {
        return this.settings.simulationSpeed;
    }

    /**
     * Get current market volatility factor
     * @returns {number} Volatility factor
     */
    getVolatilityFactor() {
        const level = this.settings.marketVolatility;
        return this.volatilityFactors[level] || 1.0;
    }

    /**
     * Get current event probability
     * @returns {number} Event probability
     */
    getEventProbability() {
        const level = this.settings.eventFrequency;
        return this.eventProbabilities[level] || 0.05;
    }

    /**
     * Get starting cash amount
     * @returns {number} Starting cash
     */
    getStartingCash() {
        return this.settings.startingCash;
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

        // Call immediately with current settings
        listener(this.settings);

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
                listener(this.settings);
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
            { value: 'low', label: 'Low', description: 'Lower price fluctuations', factor: this.volatilityFactors.low },
            { value: 'medium', label: 'Medium', description: 'Moderate price fluctuations', factor: this.volatilityFactors.medium },
            { value: 'high', label: 'High', description: 'Higher price fluctuations', factor: this.volatilityFactors.high }
        ];
    }

    /**
     * Get available event frequency options
     * @returns {Array} Frequency options
     */
    getEventFrequencyOptions() {
        return [
            { value: 'none', label: 'None', description: 'No market events', probability: this.eventProbabilities.none },
            { value: 'low', label: 'Low', description: 'Occasional market events', probability: this.eventProbabilities.low },
            { value: 'medium', label: 'Medium', description: 'Regular market events', probability: this.eventProbabilities.medium },
            { value: 'high', label: 'High', description: 'Frequent market events', probability: this.eventProbabilities.high }
        ];
    }
}

// Create singleton instance
const simulationService = new SimulationService();
export { simulationService };