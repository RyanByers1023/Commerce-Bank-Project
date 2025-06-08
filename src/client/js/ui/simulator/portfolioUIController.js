import { authService } from '../../dbServices/authService.js';
import { stockService } from '../../dbServices/stockService.js';
import { portfolioService } from '../../dbServices/portfolioService.js';

//FIXME: is this singleton not loading
import { databaseService } from '../../dbServices/databaseService.js';

class PortfolioUIController {
    constructor() {
        this.currentUser = null;
        this.currentPortfolio = null;
        this.availableStocks = [];
    }

    async initialize() {
        try {
            // Load user data and portfolio
            await this.loadUserData();

            // Initialize UI elements
            await this.initializeUIElements();

            // Set up event listeners
            this.initializeUIListeners();

            return this;
        } catch (error) {
            console.error('Failed to setup UI:', error);
            this.showError('Failed to load portfolio data');
            throw error;
        }
    }

    async loadUserData() {
        try {
            // Get current user
            this.currentUser = await authService.getCurrentUser();
            if (!this.currentUser) {
                throw new Error('Not authenticated');
            }

            // Load available stocks
            this.availableStocks = await stockService.loadStocks();

            // Load current portfolio
            this.currentPortfolio = await portfolioService.loadActivePortfolio();
        } catch (error) {
            console.error('Failed to load user data:', error);
            throw error;
        }
    }

    initializeUIListeners() {
        this.setStockDropdownListeners();
        this.setStockSellQuantityInputListener();
        this.setStockBuyQuantityInputListener();
        this.setBuyButtonListener();
        this.setSellButtonListener();
    }

    async initializeUIElements() {
        this.populateDropdown();
        this.setGreetingMessage();
        this.updateCashDisplay();
        this.updatePortfolioDisplay();
        this.updateHoldingsTable();

        const selectElement = document.getElementById("select-stock");
        if (selectElement && selectElement.value) {
            const selectedStock = this.getSelectedStock(selectElement.value);
            if (selectedStock) {
                this.updateStockPriceTickers(selectedStock.marketPrice || selectedStock.value);
            }
        }
    }

    getSelectedStock(symbol) {
        return this.availableStocks.find(stock => stock.symbol === symbol);
    }

    populateDropdown() {
        const selectElement = document.getElementById("select-stock");
        if (!selectElement) return;

        selectElement.innerHTML = "";

        this.availableStocks.forEach(stock => {
            const option = document.createElement("option");
            option.value = stock.symbol;
            option.textContent = `${stock.symbol} - ${stock.company_name || stock.companyName || 'Unknown Company'}`;
            selectElement.appendChild(option);
        });
    }

    setGreetingMessage() {
        const greetingElement = document.getElementById("span-welcome-message");
        if (!greetingElement) return;

        const userName = this.currentUser?.username || "Investor";
        const hour = new Date().getHours();

        let timeGreeting = "";
        if (hour < 12) {
            timeGreeting = "Good morning";
        } else if (hour < 18) {
            timeGreeting = "Good afternoon";
        } else {
            timeGreeting = "Good evening";
        }

        const greetingMessages = [
            `${timeGreeting}, ${userName}! Ready to trade?`,
            `Welcome back, ${userName}. Let's grow that portfolio.`,
            `Hello, ${userName}. What's the move today?`,
            `Hey ${userName}, any stocks you've got your eye on?`,
            `Market's open! Time to make some decisions, ${userName}.`
        ];

        const randomIndex = Math.floor(Math.random() * greetingMessages.length);
        greetingElement.textContent = greetingMessages[randomIndex];
    }

    updateCashDisplay() {
        const cashElement = document.getElementById("span-balance");
        if (cashElement && this.currentPortfolio) {
            const balance = this.currentPortfolio.cash_balance || this.currentPortfolio.balance || 0;
            cashElement.textContent = `$${balance.toFixed(2)}`;
        }
    }

    setStockDropdownListeners() {
        const dropdown = document.getElementById('select-stock');
        if (!dropdown) return;

        dropdown.addEventListener('change', () => {
            const selectedStock = this.getSelectedStock(dropdown.value);
            if (selectedStock) {
                const stockPrice = selectedStock.marketPrice || selectedStock.value || 0;
                this.handleDropdownMenuSelection(stockPrice);
            }
        });
    }

    handleDropdownMenuSelection(stockPrice) {
        this.updateStockPriceTickers(stockPrice);
        this.updateBuyForm(stockPrice);
        this.updateSellForm(stockPrice);
    }

    updateStockPriceTickers(stockPrice) {
        const elements = [
            document.getElementById("span-stock-market-price"),
            document.getElementById("span-buy-market-price"),
            document.getElementById("span-sell-market-price"),
        ];

        elements.forEach(element => {
            if (element) {
                element.textContent = `$${stockPrice.toFixed(2)}`;
            }
        });
    }

    setStockSellQuantityInputListener() {
        const quantityInput = document.getElementById('input-sell-quantity');
        if (!quantityInput) return;

        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            const selectElement = document.getElementById("select-stock");
            if (selectElement && selectElement.value) {
                const selectedStock = this.getSelectedStock(selectElement.value);
                if (selectedStock) {
                    const stockPrice = selectedStock.marketPrice || selectedStock.value || 0;
                    this.updateStockSellTotalSpan(stockPrice, quantity);
                }
            }
        });
    }

    setStockBuyQuantityInputListener() {
        const quantityInput = document.getElementById('input-buy-quantity');
        if (!quantityInput) return;

        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            const selectElement = document.getElementById("select-stock");
            if (selectElement && selectElement.value) {
                const selectedStock = this.getSelectedStock(selectElement.value);
                if (selectedStock) {
                    const stockPrice = selectedStock.marketPrice || selectedStock.value || 0;
                    this.updateStockBuyTotalSpan(stockPrice, quantity);
                }
            }
        });
    }

    updateStockBuyTotalSpan(stockPrice, quantity) {
        const totalSpan = document.getElementById('span-buy-total-price');
        if (totalSpan) {
            totalSpan.textContent = `$${(stockPrice * quantity).toFixed(2)}`;
        }
    }

    updateStockSellTotalSpan(stockPrice, quantity) {
        const totalSpan = document.getElementById('span-sell-total-price');
        if (totalSpan) {
            totalSpan.textContent = `$${(stockPrice * quantity).toFixed(2)}`;
        }
    }

    updateBuyForm(stockPrice) {
        const quantityInput = document.getElementById('input-buy-quantity');
        if (quantityInput) {
            const quantity = parseInt(quantityInput.value) || 1;
            this.updateStockBuyTotalSpan(stockPrice, quantity);
        }
    }

    updateSellForm(stockPrice) {
        const quantityInput = document.getElementById('input-sell-quantity');
        if (quantityInput) {
            const quantity = parseInt(quantityInput.value) || 1;
            this.updateStockSellTotalSpan(stockPrice, quantity);
        }
    }

    setBuyButtonListener() {
        const buyButton = document.getElementById('button-buy');
        if (!buyButton) return;

        buyButton.addEventListener('click', async () => {
            const quantityInput = document.getElementById('input-buy-quantity');
            const selectElement = document.getElementById("select-stock");

            if (!quantityInput || !selectElement) return;

            const quantity = parseInt(quantityInput.value) || 0;
            const selectedStock = this.getSelectedStock(selectElement.value);

            if (selectedStock && quantity > 0) {
                try {
                    // Disable button during transaction
                    buyButton.disabled = true;
                    buyButton.textContent = 'Processing...';

                    // Use portfolio service to buy stock
                    const stockPrice = selectedStock.marketPrice || selectedStock.value || 0;
                    await portfolioService.buyStock(selectedStock.symbol, quantity, stockPrice);

                    this.showSuccess(`Successfully bought ${quantity} shares of ${selectedStock.symbol}`);
                    await this.updateUIAfterTrade();
                    quantityInput.value = 1;
                    this.updateStockBuyTotalSpan(stockPrice, 1);

                } catch (error) {
                    console.error('Buy transaction failed:', error);
                    this.showError(error.message || 'Failed to buy stock');
                } finally {
                    buyButton.disabled = false;
                    buyButton.textContent = 'Buy';
                }
            } else {
                this.showError('Please select a stock and enter a valid quantity');
            }
        });
    }

    setSellButtonListener() {
        const sellButton = document.getElementById('button-sell');
        if (!sellButton) return;

        sellButton.addEventListener('click', async () => {
            const quantityInput = document.getElementById('input-sell-quantity');
            const selectElement = document.getElementById("select-stock");

            if (!quantityInput || !selectElement) return;

            const quantity = parseInt(quantityInput.value) || 0;
            const selectedStock = this.getSelectedStock(selectElement.value);

            if (selectedStock && quantity > 0) {
                try {
                    // Disable button during transaction
                    sellButton.disabled = true;
                    sellButton.textContent = 'Processing...';

                    // Use portfolio service to sell stock
                    const stockPrice = selectedStock.marketPrice || selectedStock.value || 0;
                    await portfolioService.sellStock(selectedStock.symbol, quantity, stockPrice);

                    this.showSuccess(`Successfully sold ${quantity} shares of ${selectedStock.symbol}`);
                    await this.updateUIAfterTrade();
                    quantityInput.value = 1;
                    this.updateStockSellTotalSpan(stockPrice, 1);

                } catch (error) {
                    console.error('Sell transaction failed:', error);
                    this.showError(error.message || 'Failed to sell stock');
                } finally {
                    sellButton.disabled = false;
                    sellButton.textContent = 'Sell';
                }
            } else {
                this.showError('Please select a stock and enter a valid quantity');
            }
        });
    }

    async updateUIAfterTrade() {
        try {
            // Reload portfolio data
            this.currentPortfolio = await portfolioService.loadActivePortfolio();

            // Update UI elements
            this.updateCashDisplay();
            this.updatePortfolioDisplay();
            this.updateHoldingsTable();
        } catch (error) {
            console.error('Failed to update UI after trade:', error);
        }
    }

    updatePortfolioDisplay() {
        const portfolioValueDisplay = document.getElementById('span-portfolio-value');
        const totalAssetsValueDisplay = document.getElementById('span-total-assets-value');

        if (portfolioValueDisplay && this.currentPortfolio) {
            const portfolioValue = this.currentPortfolio.portfolioValue || 0;
            portfolioValueDisplay.textContent = `$${portfolioValue.toFixed(2)}`;
        }

        if (totalAssetsValueDisplay && this.currentPortfolio) {
            const balance = this.currentPortfolio.cash_balance || this.currentPortfolio.balance || 0;
            const portfolioValue = this.currentPortfolio.portfolioValue || 0;
            const totalAssets = balance + portfolioValue;
            totalAssetsValueDisplay.textContent = `$${totalAssets.toFixed(2)}`;
        }
    }

    updateHoldingsTable() {
        const tableBody = document.getElementById('table-body-holdings');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        const holdings = this.currentPortfolio?.holdingsMap || {};

        if (!holdings || Object.keys(holdings).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="py-4 text-center text-gray-500">No stocks in portfolio</td>';
            tableBody.appendChild(row);
            return;
        }

        Object.entries(holdings).forEach(([symbol, holding]) => {
            // Get current stock price
            const stock = this.availableStocks.find(s => s.symbol === symbol);
            const currentPrice = stock ? (stock.marketPrice || stock.value || 0) : 0;

            const quantity = holding.quantity || 0;
            const avgPrice = holding.avgPrice || holding.avg_price_paid || 0;
            const value = currentPrice * quantity;
            const costBasis = avgPrice * quantity;
            const profitLoss = value - costBasis;
            const percentChange = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
            const profitLossClass = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 hover:bg-gray-50';
            row.innerHTML = `
                <td class="py-2">
                    <div>${symbol}</div>
                    <div class="text-xs text-gray-500">${quantity} shares @ $${avgPrice.toFixed(2)}</div>
                </td>
                <td class="py-2 text-right">${quantity}</td>
                <td class="py-2 text-right">
                    <div>$${value.toFixed(2)}</div>
                    <div class="text-xs ${profitLossClass}">
                        ${profitLoss >= 0 ? '+' : ''}${percentChange.toFixed(2)}%
                    </div>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
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
}

export default PortfolioUIController;