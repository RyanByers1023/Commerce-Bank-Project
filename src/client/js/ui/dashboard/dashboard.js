// js/dashboard.js
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.portfolioData = null;
        this.init();
    }

    async init() {
        try {
            // Check if user is authenticated
            const authCheck = await fetch('/api/auth/check');
            const authData = await authCheck.json();

            if (!authData.authenticated) {
                window.location.href = '/login.html';
                return;
            }

            // Get current user data
            await this.loadCurrentUser();

            // Load dashboard data
            await this.loadDashboardData();

            // Set up event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showError('Failed to load dashboard');
        }
    }

    async loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/current-user');
            if (!response.ok) throw new Error('Failed to get user data');

            this.currentUser = await response.json();
        } catch (error) {
            console.error('Error loading user:', error);
            throw error;
        }
    }

    async loadDashboardData() {
        try {
            if (!this.currentUser.activePortfolioId) {
                this.showNoPortfolioMessage();
                return;
            }

            // Get portfolio data
            const portfolioResponse = await fetch(`/api/portfolios/${this.currentUser.username}/${this.currentUser.activePortfolioId}`);
            if (!portfolioResponse.ok) throw new Error('Failed to get portfolio data');

            this.portfolioData = await portfolioResponse.json();

            // Get recent transactions
            const transactionsResponse = await fetch(`/api/transactions/${this.currentUser.username}/${this.currentUser.activePortfolioId}`);
            const transactions = transactionsResponse.ok ? await transactionsResponse.json() : [];

            // Populate dashboard
            this.populateOverviewCards();
            this.populateHoldingsTable();
            this.populateTransactionsTable(transactions.slice(0, 10)); // Show last 10 transactions

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load portfolio data');
        }
    }

    populateOverviewCards() {
        const portfolioValue = this.portfolioData.portfolioValue || 0;
        const holdingsCount = Object.keys(this.portfolioData.holdingsMap || {}).length;

        // Assume cash balance (you may need to add this to your schema)
        const availableCash = 1000; // Placeholder - implement cash tracking
        const totalAssets = portfolioValue + availableCash;

        // Update overview cards
        document.getElementById('portfolio-value').textContent = this.formatCurrency(portfolioValue);
        document.getElementById('available-cash').textContent = this.formatCurrency(availableCash);
        document.getElementById('total-assets').textContent = this.formatCurrency(totalAssets);
        document.getElementById('holdings-count').textContent = holdingsCount.toString();

        // Calculate and show portfolio change (placeholder logic)
        this.updatePortfolioChange(portfolioValue);
    }

    updatePortfolioChange(currentValue) {
        // This would require historical data to calculate actual change
        // For now, show placeholder
        const changeElement = document.getElementById('portfolio-change');
        changeElement.innerHTML = '<span class="text-gray-500">Change tracking coming soon</span>';
    }

    populateHoldingsTable() {
        const tbody = document.getElementById('holdings-table-body');
        const holdings = this.portfolioData.holdingsMap || {};

        if (Object.keys(holdings).length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No holdings to display</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        Object.values(holdings).forEach(holding => {
            const profitLoss = holding.profitLoss || 0;
            const profitLossClass = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';
            const profitLossSign = profitLoss >= 0 ? '+' : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${holding.symbol}</div>
                    <div class="text-sm text-gray-500">${holding.companyName}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${holding.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(holding.avgPrice)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(holding.currentPrice)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(holding.value)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${profitLossClass}">
                    ${profitLossSign}${this.formatCurrency(Math.abs(profitLoss))}
                    <div class="text-xs">(${profitLossSign}${holding.percentChange?.toFixed(2) || '0.00'}%)</div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    populateTransactionsTable(transactions) {
        const tbody = document.getElementById('transactions-table-body');

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No transactions to display</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        transactions.forEach(transaction => {
            const typeClass = transaction.transaction_type === 'BUY' ? 'text-green-600' : 'text-red-600';
            const date = new Date(transaction.timestamp).toLocaleDateString();

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass === 'text-green-600' ? 'bg-green-100' : 'bg-red-100'} ${typeClass}">
                        ${transaction.transaction_type}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${transaction.symbol}</div>
                    <div class="text-sm text-gray-500">${transaction.company_name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(transaction.price_paid)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(transaction.total_value)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshDashboard();
        });
    }

    async refreshDashboard() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<svg class="w-4 h-4 inline-block mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refreshing...';

        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh data');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refresh';
        }
    }

    showNoPortfolioMessage() {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">No Active Portfolio</h2>
                <p class="text-gray-600 mb-6">You don't have an active portfolio set up yet.</p>            
            </div>
        `;
    }

    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.innerHTML = `
            <strong class="font-bold">Error:</strong>
            <span class="block sm:inline">${message}</span>
        `;

        // Insert at top of container
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);

        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});