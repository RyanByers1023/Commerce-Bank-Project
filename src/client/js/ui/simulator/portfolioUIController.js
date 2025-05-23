class PortfolioUIController {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.initializeUI();
    }

    initializeUI() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUIAfterLoad());
        } else {
            this.setupUIAfterLoad();
        }
    }

    setupUIAfterLoad() {
        this.initializeUIElements();
        this.initializeUIListeners();
    }

    initializeUIListeners() {
        this.setStockDropdownListeners();
        this.setStockSellQuantityInputListener();
        this.setStockBuyQuantityInputListener();
        this.setBuyButtonListener();
        this.setSellButtonListener();
    }

    initializeUIElements() {
        this.populateDropdown();
        this.setGreetingMessage();
        this.updateCashDisplay();
        this.updatePortfolioDisplay();
        this.updateHoldingsTable();

        const selectElement = document.getElementById("select-stock")
        if (selectElement && selectElement.value) {
            const selectedStock = this.getSelectedStock(selectElement.value);
            if (selectedStock) {
                this.updateStockPriceTickers(selectedStock.marketPrice);
            }
        }
    }

    getSelectedStock(symbol) {
        return this.userProfile.stocksAddedToSim.find(stock => stock.symbol === symbol);
    }

    populateDropdown() {
        const selectElement = document.getElementById("select-stock")
        if (!selectElement) return;

        selectElement.innerHTML = "";

        this.userProfile.stocksAddedToSim.forEach(stock => {
            const option = document.createElement("option");
            option.value = stock.symbol;
            option.textContent = `${stock.symbol} - ${stock.companyName}`;
            selectElement.appendChild(option);
        });
    }

    setGreetingMessage() {
        const greetingElement = document.getElementById("span-welcome-message");
        if (!greetingElement) return;

        const userName = this.userProfile?.username || "Investor";
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
        if (cashElement && this.userProfile && this.userProfile.portfolio) {
            cashElement.textContent = `${this.userProfile.portfolio.balance.toFixed(2)}`;
        }
    }

    setStockDropdownListeners() {
        const dropdown = document.getElementById('select-stock')
        if (!dropdown) return;

        dropdown.addEventListener('change', () => {
            const selectedStock = this.getSelectedStock(dropdown.value);
            if (selectedStock) {
                this.handleDropdownMenuSelection(selectedStock.marketPrice);
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
            document.getElementById("currentPrice")
        ];

        elements.forEach(element => {
            if (element) {
                element.textContent = `${stockPrice.toFixed(2)}`;
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
                    this.updateStockSellTotalSpan(selectedStock.marketPrice, quantity);
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
                    this.updateStockBuyTotalSpan(selectedStock.marketPrice, quantity);
                }
            }
        });
    }

    updateStockBuyTotalSpan(stockPrice, quantity) {
        const totalSpan = document.getElementById('span-buy-total-price');
        if (totalSpan) {
            totalSpan.textContent = `${(stockPrice * quantity).toFixed(2)}`;
        }
    }

    updateStockSellTotalSpan(stockPrice, quantity) {
        const totalSpan = document.getElementById('span-sell-total-price');
        if (totalSpan) {
            totalSpan.textContent = `${(stockPrice * quantity).toFixed(2)}`;
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
                const result = await this.userProfile.portfolio.buyStock(selectedStock, quantity);

                if (result.success) {
                    alert(result.message);
                    this.updateUIAfterTrade();
                    quantityInput.value = 1;
                    this.updateStockBuyTotalSpan(selectedStock.marketPrice, 1);
                } else {
                    alert(result.message);
                }
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
                const result = await this.userProfile.portfolio.sellStock(selectedStock, quantity);

                if (result.success) {
                    alert(result.message);
                    this.updateUIAfterTrade();
                    quantityInput.value = 1;
                    this.updateStockSellTotalSpan(selectedStock.marketPrice, 1);
                } else {
                    alert(result.message);
                }
            }
        });
    }

    updateUIAfterTrade() {
        this.updateCashDisplay();
        this.updatePortfolioDisplay();
        this.updateHoldingsTable();
    }

    updatePortfolioDisplay() {
        this.userProfile.updatePortfolioValues();

        const portfolioValueDisplay = document.getElementById('span-portfolio-value');
        const totalAssetsValueDisplay = document.getElementById('span-total-assets-value');

        if (portfolioValueDisplay) {
            portfolioValueDisplay.textContent = `${this.userProfile.portfolio.portfolioValue.toFixed(2)}`;
        }

        if (totalAssetsValueDisplay) {
            totalAssetsValueDisplay.textContent = `${this.userProfile.portfolio.totalAssetsValue.toFixed(2)}`;
        }
    }

    updateHoldingsTable() {
        const tableBody = document.getElementById('holdings-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        const holdings = this.userProfile?.portfolio?.holdingsMap;

        if (!holdings || Object.keys(holdings).length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="py-4 text-center text-gray-500">No stocks in portfolio</td>';
            tableBody.appendChild(row);
            return;
        }

        Object.values(holdings).forEach(holding => {
            const currentPrice = holding.stock.marketPrice;
            const value = currentPrice * holding.quantity;
            const costBasis = holding.avgPrice * holding.quantity;
            const profitLoss = value - costBasis;
            const percentChange = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
            const profitLossClass = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 hover:bg-gray-50';
            row.innerHTML = `
                <td class="py-2">
                    <div>${holding.stock.symbol}</div>
                    <div class="text-xs text-gray-500">${holding.quantity} shares @ ${holding.avgPrice.toFixed(2)}</div>
                </td>
                <td class="py-2 text-right">${holding.quantity}</td>
                <td class="py-2 text-right">
                    <div>${value.toFixed(2)}</div>
                    <div class="text-xs ${profitLossClass}">
                        ${profitLoss >= 0 ? '+' : ''}${percentChange.toFixed(2)}%
                    </div>
                </td>`;
            tableBody.appendChild(row);
        });
    }
}

export default PortfolioUIController;