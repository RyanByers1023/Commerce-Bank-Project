export default class SimulationSettings {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.settings = {
            simulationSpeed: 1,
            marketVolatility: 'medium',
            eventFrequency: 'medium',
            startingCash: 500
        };

        this.volatilityFactors = {
            low: 0.6,
            medium: 1.0,
            high: 1.6
        };

        this.eventProbabilities = {
            none: 0,
            low: 0.02,
            medium: 0.05,
            high: 0.1
        };

        this.loadSettings();
        this.initModal();
    }

    // Load settings from localStorage or database
    async loadSettings() {
        try {
            // Try to load from database if user is logged in
            if (this.userProfile && this.userProfile.username) {
                const dbManager = new window.DatabaseManager();
                const savedSettings = await dbManager.sendRequest(`settings/${this.userProfile.username}`);

                if (savedSettings) {
                    this.settings = savedSettings;
                    this.applySettings();
                    return;
                }
            }

            // Fall back to localStorage if no database settings or not logged in
            const savedSettings = localStorage.getItem('investED_simulationSettings');

            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
                this.applySettings();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    // Save settings to localStorage and database if logged in
    async saveSettings(settings = this.settings) {
        this.settings = settings;

        // Save to localStorage
        localStorage.setItem('investED_simulationSettings', JSON.stringify(this.settings));

        // Save to database if logged in
        if (this.userProfile && this.userProfile.username) {
            try {
                const dbManager = new window.DatabaseManager();
                await dbManager.sendRequest(`settings/${this.userProfile.username}`, 'PUT', this.settings);
            } catch (error) {
                console.error('Failed to save settings to database:', error);
            }
        }

        // Apply the settings
        this.applySettings();
    }

    // Apply current settings to the simulation
    applySettings() {
        // Apply simulation speed
        window.simulationSpeed = this.settings.simulationSpeed;

        // Apply market volatility to all stocks
        if (this.userProfile && this.userProfile.stocksAddedToSim) {
            const volatilityFactor = this.volatilityFactors[this.settings.marketVolatility];

            this.userProfile.stocksAddedToSim.forEach(stock => {
                stock.volatility = stock.volatility * volatilityFactor;
            });
        }

        // Apply event frequency
        if (window.marketEventsSimulator) {
            const eventProbability = this.eventProbabilities[this.settings.eventFrequency];
            window.marketEventsSimulator.eventProbability = eventProbability;
        }

        // Starting cash affects new simulations only
        if (window.appConfig) {
            window.appConfig.defaultStartingCash = this.settings.startingCash;
        }

        // Dispatch event so other components can react to settings changes
        const event = new CustomEvent('simulationSettingsChanged', { detail: this.settings });
        document.dispatchEvent(event);
    }

    // Initialize settings modal
    initModal() {
        // Check if modal exists in the DOM
        const modal = document.getElementById('simulation-settings-modal');
        if (!modal) {
            console.warn('Simulation settings modal not found in the DOM');
            return;
        }

        // Initialize modal controls
        this.initModalControls();

        // Add settings button to the UI
        this.addSettingsButton();
    }

    // Add settings button to the UI
    addSettingsButton() {
        // Find a good insertion point (e.g., next to time-frame buttons)
        const timeframeButtons = document.querySelector('[data-timeframe]');
        if (!timeframeButtons) return;

        const parent = timeframeButtons.parentElement;
        if (!parent) return;

        // Create settings button
        const settingsButton = document.createElement('button');
        settingsButton.className = 'bg-gray-600 px-4 py-2 text-white rounded hover:bg-gray-700 transition';
        settingsButton.innerHTML = `
      <svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      Settings
    `;

        // Add click event
        settingsButton.addEventListener('click', () => {
            this.openModal();
        });

        // Insert button
        parent.appendChild(settingsButton);
    }

    // Initialize modal controls
    initModalControls() {
        const modal = document.getElementById('simulation-settings-modal');
        const closeBtn = document.getElementById('close-settings-btn');
        const saveBtn = document.getElementById('save-settings-btn');
        const resetBtn = document.getElementById('reset-simulation-btn');
        const speedRange = document.getElementById('simulation-speed-range');
        const speedValue = document.getElementById('simulation-speed-value');
        const volatilitySelect = document.getElementById('market-volatility');
        const eventFrequencySelect = document.getElementById('event-frequency');
        const startingCashInput = document.getElementById('starting-cash');

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettingsFromForm();
                this.closeModal();
            });
        }

        // Reset button
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset the simulation? This will reset all stocks and your portfolio.')) {
                    this.resetSimulation();
                }
            });
        }

        // Simulation speed range
        if (speedRange && speedValue) {
            speedRange.value = this.settings.simulationSpeed;
            speedValue.textContent = `${this.settings.simulationSpeed}x`;

            speedRange.addEventListener('input', () => {
                speedValue.textContent = `${speedRange.value}x`;
            });
        }

        // Market volatility select
        if (volatilitySelect) {
            volatilitySelect.value = this.settings.marketVolatility;
        }

        // Event frequency select
        if (eventFrequencySelect) {
            eventFrequencySelect.value = this.settings.eventFrequency;
        }

        // Starting cash input
        if (startingCashInput) {
            startingCashInput.value = this.settings.startingCash;
        }

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // Open settings modal
    openModal() {
        const modal = document.getElementById('simulation-settings-modal');
        if (modal) {
            // Update form values to current settings
            const speedRange = document.getElementById('simulation-speed-range');
            const speedValue = document.getElementById('simulation-speed-value');
            const volatilitySelect = document.getElementById('market-volatility');
            const eventFrequencySelect = document.getElementById('event-frequency');
            const startingCashInput = document.getElementById('starting-cash');

            if (speedRange) {
                if (speedValue) {
                    speedRange.value = this.settings.simulationSpeed;
                    speedValue.textContent = `${this.settings.simulationSpeed}x`;
                }
            }

            if (volatilitySelect) {
                volatilitySelect.value = this.settings.marketVolatility;
            }

            if (eventFrequencySelect) {
                eventFrequencySelect.value = this.settings.eventFrequency;
            }

            if (startingCashInput) {
                startingCashInput.value = this.settings.startingCash;
            }

            // Show modal
            modal.classList.remove('hidden');
        }
    }

    // Close settings modal
    closeModal() {
        const modal = document.getElementById('simulation-settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Save settings from form values
    saveSettingsFromForm() {
        const speedRange = document.getElementById('simulation-speed-range');
        const volatilitySelect = document.getElementById('market-volatility');
        const eventFrequencySelect = document.getElementById('event-frequency');
        const startingCashInput = document.getElementById('starting-cash');

        const newSettings = {
            simulationSpeed: parseInt(speedRange.value) || 1,
            marketVolatility: volatilitySelect.value || 'medium',
            eventFrequency: eventFrequencySelect.value || 'medium',
            startingCash: parseInt(startingCashInput.value) || 500
        };

        this.saveSettings(newSettings);
    }

// Reset simulation to initial state
    async resetSimulation() {
        try {
            // Reset stocks to initial state
            if (this.userProfile && this.userProfile.stocksAddedToSim) {
                this.userProfile.stocksAddedToSim.forEach(stock => {
                    // Reset stock to initial state
                    stock.marketPrice = stock.openPrice;
                    stock.priceHistory = [];
                    stock.currentSentiment = 0;

                    // Generate new price history
                    if (typeof stock.setSimulatedPriceHistory === 'function') {
                        stock.setSimulatedPriceHistory(30, stock.openPrice);
                    }
                });

                // Reset user's portfolio
                if (this.userProfile.portfolio) {
                    // Save current portfolio ID
                    const portfolioId = this.userProfile.portfolio.id;

                    // Create a database request to reset portfolio
                    const dbManager = new window.DatabaseManager();
                    await dbManager.sendRequest(`portfolios/${this.userProfile.username}/${portfolioId}/reset`, 'POST', {
                        initialBalance: this.settings.startingCash
                    });

                    // Update local portfolio
                    this.userProfile.portfolio.balance = this.settings.startingCash;
                    this.userProfile.portfolio.initialBalance = this.settings.startingCash;
                    this.userProfile.portfolio.holdingsMap = {};
                    this.userProfile.portfolio.transactionHistory = [];
                    this.userProfile.portfolio.portfolioValue = 0;
                    this.userProfile.portfolio.totalAssetsValue = this.settings.startingCash;
                }

                // Reset news
                if (window.newsGenerator) {
                    window.newsGenerator.newsHistory = [];
                    window.newsGenerator.render();
                }

                // Reset market events
                if (window.marketEventsSimulator) {
                    window.marketEventsSimulator.lastEventTime = Date.now();
                }

                // Update UI
                if (window.portfolioUIController) {
                    window.portfolioUIController.updateCashDisplay();
                    window.portfolioUIController.updatePortfolioDisplay();
                    window.portfolioUIController.updateHoldingsTable();
                }

                // Display success notification
                if (window.notificationSystem) {
                    window.notificationSystem.success('Simulation has been reset successfully!');
                }

                // Close the settings modal
                this.closeModal();

                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to reset simulation:', error);

            // Display error notification
            if (window.notificationSystem) {
                window.notificationSystem.error('Failed to reset simulation. Please try again.');
            }

            return false;
        }
    }}