import { getUserProfile } from '../authentication/authHandler.js';
import DatabaseManager from 'src/client/js/services/databaseManager.js';
import NotificationSystem from './notificationSystem.js';
import PortfolioMetricsController from 'src/client/js/utils/portfolioMetricsController.js';

// Initialize components
const notifications = new NotificationSystem();
const dbManager = new DatabaseManager();
let portfolioMetrics = null;

// Initialize the dashboard
async function initDashboard() {
    try {
        // Get user profile
        const userProfile = await getUserProfile();

        if (!userProfile) {
            // Redirect to login if not logged in
            window.location.href = 'login.html';
            return;
        }

        // Initialize portfolio metrics
        portfolioMetrics = new PortfolioMetricsController(userProfile);
        portfolioMetrics.initializeDashboard();

        // Update dashboard data
        updateDashboardData(userProfile);

        // Set up refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshDashboard();
            });
        }

        // Set up auto-refresh
        setInterval(() => refreshDashboard(), 30000); // Refresh every 30 seconds
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        notifications.error('Failed to load dashboard. Please try again later.');
    }
}

// Refresh dashboard data
async function refreshDashboard() {
    try {
        const userProfile = await getUserProfile();
        if (userProfile) {
            updateDashboardData(userProfile);
        }
    } catch (error) {
        console.error('Failed to refresh dashboard:', error);
    }
}

// Update dashboard data with user profile
function updateDashboardData(userProfile) {
    // Update overview cards
    updateOverviewCards(userProfile);

    // Update holdings table
    updateHoldingsTable(userProfile);

    // Update recent transactions
    updateRecentTransactions(userProfile);
}

// Update overview cards with latest data
function updateOverviewCards(userProfile) {
    const portfolio = userProfile.portfolio;
    const portfolioValue = document.getElementById('portfolio-value');
    const portfolioChange = document.getElementById('portfolio-change');
    const availableCash = document.getElementById('available-cash');
    const totalAssets = document.getElementById('total-assets');
    const holdingsCount = document.getElementById('holdings-count');

    if (portfolioValue) {
        portfolioValue.textContent = `$${portfolio.portfolioValue.toFixed(2)}`;
    }

    if (portfolioChange) {
        // Calculate change from initial investment
        const initialInvestment = portfolio.initialBalance;
        const currentValue = portfolio.totalAssetsValue;
        const change = currentValue - initialInvestment;
        const percentChange = (change / initialInvestment) * 100;

        portfolioChange.className = `text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`;
        portfolioChange.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${percentChange.toFixed(2)}%)`;
    }

    if (availableCash) {
        availableCash.textContent = `$${portfolio.balance.toFixed(2)}`;
    }

    if (totalAssets) {
        totalAssets.textContent = `$${portfolio.totalAssetsValue.toFixed(2)}`;
    }

    if (holdingsCount) {
        holdingsCount.textContent = Object.keys(portfolio.holdingsMap).length;
    }
}

// Update holdings table with latest data
function updateHoldingsTable(userProfile) {
    const tableBody = document.getElementById('holdings-table-body');
    if (!tableBody) return;

    const holdings = userProfile.portfolio.holdingsMap;

    if (!holdings || Object.keys(holdings).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No holdings to display</td></tr>';
        return;
    }

    // Clear table
    tableBody.innerHTML = '';

    // Add each holding to the table
    Object.values(holdings).forEach(holding => {
        const stock = holding.stock;
        const currentPrice = stock.marketPrice;
        const avgPrice = holding.avgPrice;
        const quantity = holding.quantity;
        const value = currentPrice * quantity;
        const profitLoss = (currentPrice - avgPrice) * quantity;
        const percentChange = ((currentPrice - avgPrice) / avgPrice) * 100;

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${stock.symbol}</div>
                        <div class="text-sm text-gray-500">${stock.companyName}</div>
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
    });
}