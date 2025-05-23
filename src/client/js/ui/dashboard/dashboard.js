import {authService} from '../../dbServices/authService.js';
import {userProfileService} from '../../dbServices/userProfileService.js';

import DatabaseService from '../../dbServices/databaseService.js';
import NotificationSystem from './notificationSystem.js';

// Initialize components
const notifications = new NotificationSystem();
const dbService = new DatabaseService();
let portfolioMetrics = null;
let currentUserProfile = null;

// Initialize the dashboard
async function initDashboard() {
    try {
        // Check authentication first
        const isAuthenticated = await authService.checkAuthStatus();

        if (!isAuthenticated) {
            // Redirect to login if not logged in
            window.location.href = 'login.html';
            return;
        }

        // Initialize user profile service
        currentUserProfile = await userProfileService.initialize();

        if (!currentUserProfile || !currentUserProfile.portfolio) {
            notifications.error('Failed to load portfolio data');
            return;
        }

        // Initialize portfolio metrics
        portfolioMetrics = new PortfolioMetricsController(currentUserProfile);

        // Update dashboard data
        await updateDashboardData(currentUserProfile);

        // Set up refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshDashboard();
            });
        }

        // Set up auto-refresh every 30 seconds
        setInterval(() => refreshDashboard(), 30000);

        console.log('Dashboard initialized successfully');

    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        notifications.error('Failed to load dashboard. Please try again later.');
    }
}

// Refresh dashboard data
async function refreshDashboard() {
    try {
        if (!currentUserProfile) {
            console.warn('No user profile available for refresh');
            return;
        }

        // Reload user profile data
        await currentUserProfile.loadUserProfile();

        // Update dashboard displays
        await updateDashboardData(currentUserProfile);

        console.log('Dashboard refreshed');

    } catch (error) {
        console.error('Failed to refresh dashboard:', error);
        notifications.error('Failed to refresh data');
    }
}

// Update dashboard data with user profile
async function updateDashboardData(userProfile) {
    try {
        if (!userProfile || !userProfile.portfolio) {
            console.error('Invalid user profile data');
            return;
        }

        // Update overview cards
        updateOverviewCards(userProfile);

        // Update holdings table
        updateHoldingsTable(userProfile);

        // Update recent transactions
        await updateRecentTransactions(userProfile);

        // Update portfolio metrics if available
        if (portfolioMetrics) {
            portfolioMetrics.updateCharts();
        }

    } catch (error) {
        console.error('Error updating dashboard data:', error);
        notifications.error('Error updating dashboard data');
    }
}

// Update overview cards with latest data
function updateOverviewCards(userProfile) {
    try {
        const portfolio = userProfile.portfolio;

        // Update portfolio value
        const portfolioValue = document.getElementById('portfolio-value');
        if (portfolioValue) {
            portfolioValue.textContent = `$${(portfolio.portfolioValue || 0).toFixed(2)}`;
        }

        // Update portfolio change
        const portfolioChange = document.getElementById('portfolio-change');
        if (portfolioChange) {
            const initialInvestment = portfolio.initialBalance || 0;
            const currentValue = portfolio.totalAssetsValue || portfolio.balance || 0;
            const change = currentValue - initialInvestment;
            const percentChange = initialInvestment > 0 ? (change / initialInvestment) * 100 : 0;

            portfolioChange.className = `text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`;
            portfolioChange.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${percentChange.toFixed(2)}%)`;
        }

        // Update available cash
        const availableCash = document.getElementById('available-cash');
        if (availableCash) {
            availableCash.textContent = `$${(portfolio.balance || 0).toFixed(2)}`;
        }

        // Update total assets
        const totalAssets = document.getElementById('total-assets');
        if (totalAssets) {
            const totalValue = (portfolio.portfolioValue || 0) + (portfolio.balance || 0);
            totalAssets.textContent = `$${totalValue.toFixed(2)}`;
        }

        // Update holdings count
        const holdingsCount = document.getElementById('holdings-count');
        if (holdingsCount) {
            const holdings = portfolio.holdingsMap || {};
            holdingsCount.textContent = Object.keys(holdings).length;
        }

    } catch (error) {
        console.error('Error updating overview cards:', error);
    }
}

// Update holdings table with latest data
function updateHoldingsTable(userProfile) {
    try {
        const tableBody = document.getElementById('holdings-table-body');
        if (!tableBody) {
            console.warn('Holdings table body not found');
            return;
        }

        const holdings = userProfile.portfolio?.holdingsMap || {};

        // Clear existing content
        tableBody.innerHTML = '';

        if (!holdings || Object.keys(holdings).length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No holdings to display</td></tr>';
            return;
        }

        // Add each holding to the table
        Object.values(holdings).forEach(holding => {
            try {
                const stock = holding.stock;
                if (!stock) {
                    console.warn('Invalid holding data:', holding);
                    return;
                }

                const currentPrice = stock.marketPrice || 0;
                const avgPrice = holding.avgPrice || 0;
                const quantity = holding.quantity || 0;
                const value = currentPrice * quantity;
                const profitLoss = (currentPrice - avgPrice) * quantity;
                const percentChange = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';

                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div>
                                <div class="text-sm font-medium text-gray-900">${stock.symbol || 'N/A'}</div>
                                <div class="text-sm text-gray-500">${stock.companyName || 'Unknown Company'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${quantity}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${avgPrice.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${currentPrice.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${value.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${percentChange.toFixed(2)}%)
                        </span>
                    </td>
                `;

                tableBody.appendChild(row);

            } catch (error) {
                console.error('Error processing holding:', error, holding);
            }
        });

    } catch (error) {
        console.error('Error updating holdings table:', error);
    }
}

// Update recent transactions
async function updateRecentTransactions(userProfile) {
    try {
        const tableBody = document.getElementById('transactions-table-body');
        if (!tableBody) {
            console.warn('Transactions table body not found');
            return;
        }

        // Get transaction history from portfolio or API
        let transactions = [];

        if (userProfile.portfolio?.transactionHistory) {
            transactions = userProfile.portfolio.transactionHistory;
        } else if (userProfile.username && userProfile.username !== 'demo_user') {
            // For authenticated users, try to get from API
            try {
                const currentUser = await authService.getCurrentUser();
                if (currentUser?.activePortfolioID) {
                    transactions = await dbService.getPortfolioTransactions(userProfile.username, currentUser.activePortfolioID);
                }
            } catch (error) {
                console.warn('Could not load transactions from API:', error);
            }
        }

        // Clear existing content
        tableBody.innerHTML = '';

        if (!transactions || transactions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No transactions to display</td></tr>';
            return;
        }

        // Show last 10 transactions
        const recentTransactions = transactions.slice(-10).reverse();

        recentTransactions.forEach(transaction => {
            try {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';

                const date = new Date(transaction.timestamp || transaction.createdAt || Date.now());
                const formattedDate = date.toLocaleDateString();

                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    (transaction.transactionType || transaction.type) === 'BUY'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                }">
                            ${transaction.transactionType || transaction.type || 'N/A'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.symbol || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.quantity || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${(transaction.pricePaid || transaction.price || 0).toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${(transaction.totalValue || transaction.totalTransactionValue || 0).toFixed(2)}</td>
                `;

                tableBody.appendChild(row);

            } catch (error) {
                console.error('Error processing transaction:', error, transaction);
            }
        });

    } catch (error) {
        console.error('Error updating transactions table:', error);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Export for external use
window.dashboardController = {
    refresh: refreshDashboard,
    updateData: updateDashboardData
};