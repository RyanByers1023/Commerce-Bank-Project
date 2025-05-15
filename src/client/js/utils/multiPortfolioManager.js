export default class MultiPortfolioManager {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.dbManager = new window.DatabaseManager();
        this.portfolios = [];
        this.activePortfolioId = null;

        // Load portfolios
        this.loadPortfolios();
    }

    // Load user portfolios from database
    async loadPortfolios() {
        try {
            if (!this.userProfile || !this.userProfile.username) {
                console.warn('Cannot load portfolios: No user profile');
                return;
            }

            const portfolios = await this.dbManager.sendRequest(`portfolios/${this.userProfile.username}`);

            if (portfolios && portfolios.length > 0) {
                this.portfolios = portfolios;

                // Set the active portfolio if not already set
                if (!this.activePortfolioId && this.portfolios.length > 0) {
                    this.setActivePortfolio(this.portfolios[0].id);
                }
            } else {
                // Create a default portfolio if none exists
                await this.createPortfolio('My First Portfolio');
            }
        } catch (error) {
            console.error('Failed to load portfolios:', error);

            // Create a default portfolio as fallback
            if (this.portfolios.length === 0) {
                await this.createPortfolio('My First Portfolio');
            }
        }
    }

    // Create a new portfolio
    async createPortfolio(name, initialBalance = 500, description = '') {
        try {
            // Validate input
            if (!name || name.trim().length === 0) {
                throw new Error('Portfolio name is required');
            }

            // Create portfolio object
            const newPortfolio = {
                id: `portfolio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: name.trim(),
                description: description.trim(),
                initialBalance: initialBalance,
                balance: initialBalance,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                holdingsMap: {},
                transactionHistory: []
            };

            // Save to database
            await this.dbManager.sendRequest(`portfolios/${this.userProfile.username}`, 'POST', newPortfolio);

            // Add to local list
            this.portfolios.push(newPortfolio);

            // Set as active if it's the first one
            if (this.portfolios.length === 1) {
                this.setActivePortfolio(newPortfolio.id);
            }

            return newPortfolio;
        } catch (error) {
            console.error('Failed to create portfolio:', error);
            throw error;
        }
    }

    // Set the active portfolio
    async setActivePortfolio(portfolioId) {
        const portfolio = this.portfolios.find(p => p.id === portfolioId);

        if (!portfolio) {
            throw new Error('Portfolio not found');
        }

        this.activePortfolioId = portfolioId;

        // Update user's active portfolio in the database
        await this.dbManager.sendRequest(`users/${this.userProfile.username}/active-portfolio`, 'PUT', {
            activePortfolioId: portfolioId
        });

        // Update the user's current portfolio object
        this.userProfile.portfolio = portfolio;

        // Dispatch event
        const event = new CustomEvent('activePortfolioChanged', { detail: portfolio });
        document.dispatchEvent(event);

        return portfolio;
    }

    // Get all portfolios
    getPortfolios() {
        return [...this.portfolios];
    }

    // Get the active portfolio
    getActivePortfolio() {
        return this.portfolios.find(p => p.id === this.activePortfolioId) || null;
    }

    // Update portfolio details
    async updatePortfolio(portfolioId, updates) {
        const portfolioIndex = this.portfolios.findIndex(p => p.id === portfolioId);

        if (portfolioIndex === -1) {
            throw new Error('Portfolio not found');
        }

        // Apply updates
        const updatedPortfolio = {
            ...this.portfolios[portfolioIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Save to database
        await this.dbManager.sendRequest(`portfolios/${this.userProfile.username}/${portfolioId}`, 'PUT', updatedPortfolio);

        // Update local copy
        this.portfolios[portfolioIndex] = updatedPortfolio;

        // Update active portfolio if needed
        if (portfolioId === this.activePortfolioId) {
            this.userProfile.portfolio = updatedPortfolio;

            // Dispatch event
            const event = new CustomEvent('activePortfolioChanged', { detail: updatedPortfolio });
            document.dispatchEvent(event);
        }

        return updatedPortfolio;
    }

    // Delete a portfolio
    async deletePortfolio(portfolioId) {
        const portfolioIndex = this.portfolios.findIndex(p => p.id === portfolioId);

        if (portfolioIndex === -1) {
            throw new Error('Portfolio not found');
        }

        // Cannot delete if it's the only portfolio
        if (this.portfolios.length === 1) {
            throw new Error('Cannot delete the only portfolio');
        }

        // Delete from database
        await this.dbManager.sendRequest(`portfolios/${this.userProfile.username}/${portfolioId}`, 'DELETE');

        // Remove from local list
        this.portfolios.splice(portfolioIndex, 1);

        // If the active portfolio was deleted, set a new active portfolio
        if (portfolioId === this.activePortfolioId) {
            await this.setActivePortfolio(this.portfolios[0].id);
        }

        return true;
    }
}