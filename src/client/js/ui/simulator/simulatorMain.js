import { authService } from '../../dbServices/authService.js';
import { stockService } from '../../dbServices/stockService.js';
import { portfolioService } from '../../dbServices/portfolioService.js';
import { simulationService } from '../../dbServices/simulationService.js';
import PortfolioUIController from './portfolioUIController.js';
import AnimatedStockChart from './animatedStockChart.js';
import NewsGenerator from './newsGenerator.js';

class SimulatorManager {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.userProfile = null;
        this.portfolioController = null;
        this.stockChart = null;
        this.newsGenerator = null;
        this.isDemoMode = false;
    }

    async initialize() {
        try {
            console.log('Initializing simulator...');

            // Check authentication status
            const isAuthenticated = await authService.checkAuthStatus();

            if (!isAuthenticated) {
                console.log('User not authenticated, redirecting to login...');
                this.redirectToLogin();
                return;
            }

            // Get current user
            this.currentUser = await authService.getCurrentUser();
            if (!this.currentUser) {
                throw new Error('Failed to get current user');
            }

            console.log('User authenticated:', this.currentUser.username);

            // Load simulation settings
            await simulationService.loadSettings();

            // Create user profile object
            await this.createUserProfile();

            // Initialize UI components
            await this.initializeUIComponents();

            // Start simulation systems
            this.startSimulationSystems();

            this.isInitialized = true;
            console.log('Simulator initialized successfully');

        } catch (error) {
            console.error('Failed to initialize simulator:', error);
            this.showError('Failed to initialize simulator: ' + error.message);
        }
    }

    async createUserProfile() {
        try {
            // Load available stocks
            const stocks = await stockService.loadStocks();

            // Load active portfolio
            const portfolio = await portfolioService.loadActivePortfolio();

            // Create simplified user profile object for compatibility
            this.userProfile = {
                username: this.currentUser.username,
                email: this.currentUser.email,
                stocksAddedToSim: stocks || [],
                portfolio: portfolio || { balance: 500, holdingsMap: {}, portfolioValue: 0 }
            };

            // Ensure stocks have required properties
            this.userProfile.stocksAddedToSim = this.userProfile.stocksAddedToSim.map(stock => ({
                symbol: stock.symbol,
                companyName: stock.company_name || stock.companyName || 'Unknown Company',
                marketPrice: stock.value || stock.marketPrice || 100,
                sector: stock.sector || 'Unknown',
                volatility: stock.volatility || 0.015,
                currentSentiment: stock.currentSentiment || 0,
                previousClosePrice: stock.previousClosePrice || stock.value || stock.marketPrice || 100,
                openPrice: stock.openPrice || stock.value || stock.marketPrice || 100,
                volume: stock.volume || Math.floor(100000 + Math.random() * 900000),
                priceHistory: stock.priceHistory || this.generateInitialPriceHistory(stock.value || stock.marketPrice || 100)
            }));

        } catch (error) {
            console.error('Failed to create user profile:', error);
            throw error;
        }
    }

    generateInitialPriceHistory(currentPrice, days = 30) {
        const history = [];
        let price = currentPrice;

        // Generate backward history
        for (let i = 0; i < days; i++) {
            history.unshift(price);
            // Simulate price variation
            const change = (Math.random() - 0.5) * 0.02; // ±1% change
            price = price * (1 - change);
            price = Math.max(price, 0.01); // Ensure positive price
        }

        return history;
    }

    async initializeUIComponents() {
        try {
            // Initialize portfolio UI controller
            this.portfolioController = new PortfolioUIController();
            await this.portfolioController.initialize();

            // Initialize animated stock chart
            if (this.userProfile.stocksAddedToSim.length > 0) {
                this.stockChart = new AnimatedStockChart(this.userProfile);
            }

            // Initialize news generator
            this.newsGenerator = new NewsGenerator(this.userProfile);

            // Set up settings modal handler
            this.setupSettingsModal();

        } catch (error) {
            console.error('Failed to initialize UI components:', error);
            throw error;
        }
    }

    startSimulationSystems() {
        try {
            // Start stock price animation if chart exists
            if (this.stockChart) {
                // Auto-start with default timeframe
                setTimeout(() => {
                    this.stockChart.startAnimation();
                }, 1000);
            }

            // Start news generation
            if (this.newsGenerator) {
                // Start news with 90 second intervals
                this.newsGenerator.start(90000);
            }

            console.log('Simulation systems started');

        } catch (error) {
            console.error('Failed to start simulation systems:', error);
        }
    }

    setupSettingsModal() {
        const settingsBtn = document.getElementById('open-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }
    }

    openSettingsModal() {
        // Create simple settings modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-secondary p-6 rounded-xl max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-white">Simulation Settings</h3>
                    <button id="close-settings" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-300 mb-2">Simulation Speed</label>
                        <select id="sim-speed" class="w-full bg-background border border-tertiary rounded-lg px-3 py-2 text-white">
                            <option value="1">1x (Real-time)</option>
                            <option value="5">5x Faster</option>
                            <option value="10">10x Faster</option>
                            <option value="20">20x Faster</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-300 mb-2">Market Volatility</label>
                        <select id="volatility" class="w-full bg-background border border-tertiary rounded-lg px-3 py-2 text-white">
                            <option value="low">Low Volatility</option>
                            <option value="medium">Medium Volatility</option>
                            <option value="high">High Volatility</option>
                        </select>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button id="cancel-settings" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                            Cancel
                        </button>
                        <button id="save-settings" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Modal event handlers
        const closeModal = () => modal.remove();

        modal.querySelector('#close-settings').addEventListener('click', closeModal);
        modal.querySelector('#cancel-settings').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('#save-settings').addEventListener('click', async () => {
            const speed = modal.querySelector('#sim-speed').value;
            const volatility = modal.querySelector('#volatility').value;

            try {
                await simulationService.saveSettings({
                    simulationSpeed: parseInt(speed),
                    marketVolatility: volatility
                });

                this.showSuccess('Settings saved successfully');
                closeModal();
            } catch (error) {
                this.showError('Failed to save settings');
            }
        });
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        window.location.href = `./login.html?redirect=${encodeURIComponent(currentPath)}`;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.simulator-notification');
        existingNotifications.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `simulator-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">${type === 'success' ? '✓' : '✗'}</span>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Cleanup method for when user leaves page
    destroy() {
        if (this.stockChart) {
            this.stockChart.destroy();
        }
        if (this.newsGenerator) {
            this.newsGenerator.stop();
        }
    }
}

// Initialize when DOM is ready
let simulatorManager;

function initializeSimulator() {
    simulatorManager = new SimulatorManager();
    simulatorManager.initialize();
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSimulator);
} else {
    initializeSimulator();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (simulatorManager) {
        simulatorManager.destroy();
    }
});

export default SimulatorManager;