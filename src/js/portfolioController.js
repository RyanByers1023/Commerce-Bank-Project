// Portfolio Controller - Manages user portfolio, cash, and transactions

class Portfolio {
    constructor(initialCash = 2000) {
        this.cash = initialCash;
        this.holdings = {};  // Map of stock symbols to quantity owned
        this.transactions = []; // Record of all transactions
        this.startingCash = initialCash; // For calculating total profits/losses
    }

    // Buy a stock
    buyStock(stock, quantity) {
        // Convert quantity to number and validate
        quantity = parseInt(quantity);
        if (isNaN(quantity) || quantity <= 0) {
            return { success: false, message: "Please enter a valid quantity" };
        }

        // Calculate total cost
        const totalCost = stock.price * quantity;

        // Check if user has enough cash
        if (totalCost > this.cash) {
            return { success: false, message: "Not enough cash available for this purchase" };
        }

        // Update cash
        this.cash -= totalCost;

        // Update holdings
        if (this.holdings[stock.symbol]) {
            this.holdings[stock.symbol].quantity += quantity;
            this.holdings[stock.symbol].avgPrice =
                (this.holdings[stock.symbol].avgPrice * (this.holdings[stock.symbol].quantity - quantity) +
                    stock.price * quantity) / this.holdings[stock.symbol].quantity;
        } else {
            this.holdings[stock.symbol] = {
                symbol: stock.symbol,
                name: stock.name,
                quantity: quantity,
                avgPrice: stock.price
            };
        }

        // Record transaction
        const transaction = {
            type: "BUY",
            symbol: stock.symbol,
            name: stock.name,
            quantity: quantity,
            price: stock.price,
            total: totalCost,
            timestamp: new Date()
        };

        this.transactions.push(transaction);

        return {
            success: true,
            message: `Successfully bought ${quantity} shares of ${stock.symbol} for $${totalCost.toFixed(2)}`,
            transaction: transaction
        };
    }

    // Sell a stock
    sellStock(stock, quantity) {
        // Convert quantity to number and validate
        quantity = parseInt(quantity);
        if (isNaN(quantity) || quantity <= 0) {
            return { success: false, message: "Please enter a valid quantity" };
        }

        // Check if user owns the stock
        if (!this.holdings[stock.symbol]) {
            return { success: false, message: `You don't own any shares of ${stock.symbol}` };
        }

        // Check if user owns enough shares
        if (this.holdings[stock.symbol].quantity < quantity) {
            return { success: false, message: `You only own ${this.holdings[stock.symbol].quantity} shares of ${stock.symbol}` };
        }

        // Calculate total value
        const totalValue = stock.price * quantity;

        // Update cash
        this.cash += totalValue;

        // Update holdings
        this.holdings[stock.symbol].quantity -= quantity;

        // Remove stock from holdings if quantity is 0
        if (this.holdings[stock.symbol].quantity === 0) {
            delete this.holdings[stock.symbol];
        }

        // Record transaction
        const transaction = {
            type: "SELL",
            symbol: stock.symbol,
            name: stock.name,
            quantity: quantity,
            price: stock.price,
            total: totalValue,
            timestamp: new Date()
        };

        this.transactions.push(transaction);

        return {
            success: true,
            message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${totalValue.toFixed(2)}`,
            transaction: transaction
        };
    }

    // Calculate total portfolio value
    getPortfolioValue(stockMap) {
        let total = 0;

        for (const symbol in this.holdings) {
            if (stockMap[symbol]) {
                total += stockMap[symbol].price * this.holdings[symbol].quantity;
            }
        }

        return total;
    }

    // Get total assets (cash + portfolio)
    getTotalAssets(stockMap) {
        return this.cash + this.getPortfolioValue(stockMap);
    }

    // Get profit/loss
    getProfitLoss(stockMap) {
        return this.getTotalAssets(stockMap) - this.startingCash;
    }

    // Get portfolio summary
    getSummary(stockMap) {
        return {
            cash: this.cash,
            portfolioValue: this.getPortfolioValue(stockMap),
            totalAssets: this.getTotalAssets(stockMap),
            profitLoss: this.getProfitLoss(stockMap),
            holdings: this.holdings,
            numTransactions: this.transactions.length
        };
    }
}

// Initialize the global portfolio
let userPortfolio = new Portfolio(10000);

// Initialize UI elements
document.addEventListener('DOMContentLoaded', function() {
    // Buy form handler
    const buyQuantityInput = document.getElementById('buy-quantity');
    const buyTotalSpan = document.getElementById('buy-total');
    const buyButton = document.getElementById('buy-button');

    // Sell form handler
    const sellQuantityInput = document.getElementById('sell-quantity');
    const sellTotalSpan = document.getElementById('sell-total');
    const sellButton = document.getElementById('sell-button');

    // Calculate buy total when quantity changes
    buyQuantityInput.addEventListener('input', function() {
        const quantity = parseInt(buyQuantityInput.value) || 0;
        const currentStock = getCurrentStock();
        if (currentStock) {
            const total = currentStock.price * quantity;
            buyTotalSpan.textContent = `$${total.toFixed(2)}`;
        }
    });

    // Calculate sell total when quantity changes
    sellQuantityInput.addEventListener('input', function() {
        const quantity = parseInt(sellQuantityInput.value) || 0;
        const currentStock = getCurrentStock();
        if (currentStock) {
            const total = currentStock.price * quantity;
            sellTotalSpan.textContent = `$${total.toFixed(2)}`;
        }
    });

    // Buy button click handler
    buyButton.addEventListener('click', function() {
        const quantity = parseInt(buyQuantityInput.value) || 0;
        const currentStock = getCurrentStock();

        if (currentStock) {
            const result = userPortfolio.buyStock(currentStock, quantity);

            if (result.success) {
                // Show success message
                alert(result.message);

                // Update UI
                updatePortfolioUI();

                // Reset quantity
                buyQuantityInput.value = 1;
                buyTotalSpan.textContent = `$${currentStock.price.toFixed(2)}`;
            } else {
                // Show error message
                alert(result.message);
            }
        }
    });

    // Sell button click handler
    sellButton.addEventListener('click', function() {
        const quantity = parseInt(sellQuantityInput.value) || 0;
        const currentStock = getCurrentStock();

        if (currentStock) {
            const result = userPortfolio.sellStock(currentStock, quantity);

            if (result.success) {
                // Show success message
                alert(result.message);

                // Update UI
                updatePortfolioUI();

                // Reset quantity
                sellQuantityInput.value = 1;
                sellTotalSpan.textContent = `$${currentStock.price.toFixed(2)}`;
            } else {
                // Show error message
                alert(result.message);
            }
        }
    });

    // Initial update
    updatePortfolioUI();
});

// Helper to get current stock
function getCurrentStock() {
    return userStocks.find(stock => stock.symbol === currentStock);
}

// Update all portfolio-related UI elements
function updatePortfolioUI() {
    // Update cash display
    const cashDisplay = document.getElementById('available-cash');
    cashDisplay.textContent = `$${userPortfolio.cash.toFixed(2)}`;

    // Update portfolio value
    const portfolioValueDisplay = document.getElementById('portfolio-value');
    const portfolioValue = userPortfolio.getPortfolioValue(userStocks.reduce((map, stock) => {
        map[stock.symbol] = stock;
        return map;
    }, {}));
    portfolioValueDisplay.textContent = `$${portfolioValue.toFixed(2)}`;

    // Update total assets
    const totalAssetsDisplay = document.getElementById('total-assets');
    totalAssetsDisplay.textContent = `$${(userPortfolio.cash + portfolioValue).toFixed(2)}`;

    // Update holdings table
    updateHoldingsTable();

    // Update buy/sell price displays
    const currentStock = getCurrentStock();
    if (currentStock) {
        document.getElementById('buy-price').textContent = `$${currentStock.price.toFixed(2)}`;
        document.getElementById('sell-price').textContent = `$${currentStock.price.toFixed(2)}`;

        // Update buy/sell totals
        const buyQuantity = parseInt(document.getElementById('buy-quantity').value) || 0;
        document.getElementById('buy-total').textContent = `$${(currentStock.price * buyQuantity).toFixed(2)}`;

        const sellQuantity = parseInt(document.getElementById('sell-quantity').value) || 0;
        document.getElementById('sell-total').textContent = `$${(currentStock.price * sellQuantity).toFixed(2)}`;
    }
}

// Update holdings table
function updateHoldingsTable() {
    const tableBody = document.getElementById('holdings-table-body');
    tableBody.innerHTML = '';

    const stockMap = userStocks.reduce((map, stock) => {
        map[stock.symbol] = stock;
        return map;
    }, {});

    const holdings = Object.values(userPortfolio.holdings);

    if (holdings.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="3" class="py-4 text-center text-gray-500">No stocks in portfolio</td>
        `;
        tableBody.appendChild(row);
        return;
    }

    holdings.forEach(holding => {
        const currentPrice = stockMap[holding.symbol] ? stockMap[holding.symbol].price : 0;
        const value = currentPrice * holding.quantity;
        const profitLoss = currentPrice - holding.avgPrice;
        const profitLossClass = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';

        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-2">
                <div>${holding.symbol}</div>
                <div class="text-xs text-gray-500">${holding.quantity} shares @ $${holding.avgPrice.toFixed(2)}</div>
            </td>
            <td class="py-2 text-right">${holding.quantity}</td>
            <td class="py-2 text-right">
                <div>$${value.toFixed(2)}</div>
                <div class="text-xs ${profitLossClass}">${profitLoss >= 0 ? '+' : ''}${(profitLoss * 100 / holding.avgPrice).toFixed(2)}%</div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}