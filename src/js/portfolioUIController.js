
//-------------------------------------------Portfolio UI Elements---------------------------------------------//

class PortfolioUIController{
    PortfolioUIController(){
        // Initialize the global portfolio
        let userPortfolio = new Portfolio(10000);
        InitializeUIElements(userPortfolio);
    }

    //Initialize UI elements
    InitializeUIElements(userPortfolio){
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
                    const total = currentStock.marketPrice * quantity;
                    buyTotalSpan.textContent = `$${total.toFixed(2)}`;
                }
            });
        
            // Calculate sell total when quantity changes
            sellQuantityInput.addEventListener('input', function() {
                const quantity = parseInt(sellQuantityInput.value) || 0;
                const currentStock = getCurrentStock();
                if (currentStock) {
                    const total = currentStock.marketPrice * quantity;
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
                        buyTotalSpan.textContent = `$${currentStock.marketPrice.toFixed(2)}`;
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
                        sellTotalSpan.textContent = `$${currentStock.marketPrice.toFixed(2)}`;
                    } else {
                        // Show error message
                        alert(result.message);
                    }
                }
            });
        
            // Initial update
            updatePortfolioUI(userPortfolio);
        });
    }

    // Update all portfolio-related UI elements
    updateAllUIElements(userPortfolio) {
        this.updateCashDisplay(userPortfolio);
        this.updatePortfolioDisplay(userPortfolio);
        this.updateAssetsDisplay(userPortfolio);
        this.updateHoldingsTable(userPortfolio);
        this.updateBuySellDisplay(userPortfolio);
    }

    updateBuySellDisplay(){
        // Update buy/sell price displays
        const currentStock = getCurrentStock();
        if (currentStock) {
            document.getElementById('buy-price').textContent = `$${currentStock.marketPrice.toFixed(2)}`;
            document.getElementById('sell-price').textContent = `$${currentStock.marketPrice.toFixed(2)}`;

            // Update buy/sell totals
            const buyQuantity = parseInt(document.getElementById('buy-quantity').value) || 0;
            document.getElementById('buy-total').textContent = `$${(currentStock.marketPrice * buyQuantity).toFixed(2)}`;

            const sellQuantity = parseInt(document.getElementById('sell-quantity').value) || 0;
            document.getElementById('sell-total').textContent = `$${(currentStock.marketPrice * sellQuantity).toFixed(2)}`;
        }
    }

    updateAssetsDisplay(){
        // Update total assets
        const totalAssetsDisplay = document.getElementById('total-assets');
        totalAssetsDisplay.textContent = `$${(userPortfolio.cash + portfolioValue).toFixed(2)}`;
    }

    updatePortfolioDisplay(){
        // Update portfolio value
        const portfolioValueDisplay = document.getElementById('portfolio-value');
        const portfolioValue = userPortfolio.getPortfolioValue(userStocks.reduce((map, stock) => {
            map[stock.symbol] = stock;
            return map;
        }, {}));
        portfolioValueDisplay.textContent = `$${portfolioValue.toFixed(2)}`;
    }

    updateCashDisplay(){
        // Update cash display
        const cashDisplay = document.getElementById('available-cash');
        cashDisplay.textContent = `$${userPortfolio.cash.toFixed(2)}`;
    }

    // Update holdings table
    updateHoldingsTable() {
        const tableBody = document.getElementById('holdings-table-body');
        tableBody.innerHTML = '';

        const stockMap = userStocks.reduce((map, stock) => {
            map[stock.symbol] = stock;
            return map;
        }, {});

        const holdings = Object.values(userPortfolio.holdings);

        if (holdings.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML =
                '<td colspan="3" class="py-4 text-center text-gray-500">No stocks in portfolio</td>`;
            tableBody.appendChild(row);
            return;
        }

        holdings.forEach(holding => {
            const currentPrice = stockMap[holding.symbol] ? stockMap[holding.symbol].marketPrice : 0;
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

    //---------------------------------some useful notes for meeting------------------------------//
    /* exerpt from chatGPT regarding es6 (modern javascript) modules (any js file that is a class):
    Modules (import/export) need setup:
    If you're using ES6 modules (import/export), your HTML file must load your JavaScript with the type="module" attribute:
    <script type="module" src="main.js"></script>
    And your files must be served from a local server (not just opened as file://), or some browsers will block them due to security policies.

    exerpt regarding moving data from front end (javascript) to back end (java w/ springboot):
    Backend Options in Java:
    Spring Boot (Most Popular & Modern)
    Easy setup for REST APIs

    Works great with MySQL

    Handles JSON, validation, security, etc.

    Ideal for full-stack apps
    */
}