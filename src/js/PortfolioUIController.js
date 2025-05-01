
export default class PortfolioUIController{
    constructor(userProfile){
        this.initializeUI(userProfile);
    }

    initializeUI(userProfile){
        this.initializeUIListeners();
        this.initializeUIElements(userProfile);
    }

    initializeUIListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setStockDropdownListeners();
            this.setStockSellQuantityInputListener();
            this.setStockBuyQuantityInputListener();
        });
    }

    initializeUIElements(userProfile){
        this.populateDropdown(userProfile);
        this.setGreetingMessage(userProfile);
        this.updateCashDisplay(userProfile);
        this.updatePortfolioDisplay(userProfile);

        this.updateHoldingsTable(userProfile);



        this.updateStockPriceTickers(stockPrice);
    }

    populateDropdown(userProfile){
        const selectElement = document.getElementById("selectStock");

        // Clear any existing options
        selectElement.innerHTML = "";

        // Add an option for each stock
        userProfile.stocksAddedToSim.forEach(stock => {
            const option = document.createElement("option");
            option.value = stock.symbol;
            option.textContent = `${stock.symbol} - ${stock.companyName}`;
            selectElement.appendChild(option);
        });
    }

    setGreetingMessage(userProfile) {
        const userName = userProfile?.username || "Investor";
        const hour = new Date().getHours();

        let timeGreeting = "";
        if (hour < 12) {
            timeGreeting = "Good morning";
        } else if (hour < 18) {
            timeGreeting = "Good afternoon";
        } else {
            timeGreeting = "Good evening";
        }

        let greetingMessages = [
            `${timeGreeting}, ${userName}! Ready to trade?`,
            `Welcome back, ${userName}. Let’s grow that portfolio.`,
            `Hello, ${userName}. What’s the move today?`,
            `Hey ${userName}, any stocks you’ve got your eye on?`,
            `Market’s open! Time to make some decisions, ${userName}.`
        ];

        const randomIndex = Math.floor(Math.random() * greetingMessage.length);
        document.getElementById("spanWelcomeMessage").textContent = greetingMessages[randomIndex];
    }

    updateCashDisplay(userProfile){
        const spanStockPrice = document.getElementById("spanStockPrice");
        if (spanStockPrice) {
            spanStockPrice.textContent = `$${userProfile.portfolio.balance.toFixed(2)}`;
        }
    }

    setStockDropdownListeners(){
        const dropdown = document.getElementById('selectStock');

        // Check if the dropdown exists before adding the listener
        if (dropdown) {
            dropdown.addEventListener('change', () => {
                this.handleDropdownMenuSelection(dropdown.value);
            });
        } else {
            console.error('Stock dropdown element not found.');
        }
    }

    handleDropdownMenuSelection(stockPrice){
        this.updateStockPriceTickers(stockPrice);
        this.updateStockPriceTickers(stockPrice);
    }

    updateStockPriceTickers(stockPrice) {
        const mainPriceSpan = document.getElementById("spanStockPrice");
        const buyBoxPriceSpan = document.getElementById("spanStockBuyPrice");
        const sellBoxPriceSpan = document.getElementById("spanStockSellPrice");

        if (mainPriceSpan) {
            mainPriceSpan.textContent = `$${stockPrice.toFixed(2)}`;
        }

        if(buyBoxPriceSpan){
            buyBoxPriceSpan.textContent = `$${stockPrice.toFixed(2)}`;
        }

        if(sellBoxPriceSpan){
            sellBoxPriceSpan.textContent = `$${stockPrice.toFixed(2)}`;
        }

    }

    setStockSellQuantityInputListener(stockPrice){
        //get the quantity from the html document:
        let quantity = parseInt(document.getElementById('spanStockSellQuantity').value);

        //when input is detected in the 'stockBuyQuantity' field (up/down arrow press), it gets parsed as in int and stored in this.stockBuyQuantity
        quantity.addEventListener('input', () => {
            this.updateStockSellTotalSpan(stockPrice, quantity);
        });
    }

    setStockBuyQuantityInputListener(stockPrice){
        //get the quantity from the html document:
        const quantity = parseInt(document.getElementById('spanStockBuyQuantity').value);

        //when input is detected in the 'stockBuyQuantity' field (up/down arrow press), it gets parsed as in int and stored in this.stockBuyQuantity
        quantity.addEventListener('input', () => {
            this.updateStockBuyTotalSpan(stockPrice, quantity);
        });
    }

    updateStockBuyTotalSpan(stockPrice, quantity){
        document.getElementById('spanStockBuyPrice').textContent = `$${(stockPrice * quantity).toFixed(2)}`;
    }

    updateStockSellTotalSpan(stockPrice, quantity){
        document.getElementById('spanStockSellPrice').textContent = `$${(stockPrice * quantity).toFixed(2)}`;
    }

    handleBuyButtonClick(userPortfolio){
        //get information regarding stock purchase from UI:
        const buyQuantityInput = document.getElementById('buy-quantity');
        const buyTotalSpan = document.getElementById('buy-total');
        const buyButton = document.getElementById('buy-button');

        // Buy button click handler
        buyButton.addEventListener('click', function() {
            const quantity = parseInt(buyQuantityInput.value) || 0;
            const selectedStock = getSelectedStock();
    
            if (selectedStock) {
                const result = userPortfolio.buyStock(selectedStock, quantity);
    
                if (result.success) {
                    // Show success message
                    alert(result.message);
    
                    // Update UI
                    updatePortfolioUI();
    
                    // Reset quantity
                    buyQuantityInput.value = 1;
                    buyTotalSpan.textContent = `$${selectedStock.marketPrice.toFixed(2)}`;
                } else {
                    // Show error message
                    alert(result.message);
                }
            }
        });
    }

    //add listener to Sell button on UI, handle click
    handleSellButtonClick(userPortfolio){
        // Sell form handler
        const sellQuantityInput = document.getElementById('sell-quantity');
        const sellTotalSpan = document.getElementById('sell-total');
        const sellButton = document.getElementById('sell-button');

        // Sell button click handler
        sellButton.addEventListener('click', function() {
            //TODO: sanitize input
            const quantity = parseInt(sellQuantityInput.value) || 0;

            //get the stock selected from the drop down menu
            const selectedStock = getSelectedStock();
    
            if (selectedStock) {
                //perform the sell and update userPortfolio
                const result = userPortfolio.sellStock(selectedStock, quantity);
    
                //attempt to sell was successful
                if (result.success) {
                    // Show success message
                    alert(result.message);
    
                    // Update the UI
                    updateAllPortfolioUIElements();
    
                    // Reset quantity
                    sellQuantityInput.value = 1;
                    sellTotalSpan.textContent = `$${selectedStock.marketPrice.toFixed(2)}`;

                //attempt to sell was unsuccessful
                } else {
                    // Show error message
                    alert(result.message);
                }
            }
        });
    }


    //TODO: finish working on this function
    populateHoldingsTable(userProfile) {
        const tableBody = document.getElementById("holdings-table-body");
        tableBody.innerHTML = ""; // Clear existing rows

        const holdingsMap = user.portfolio.holdingsMap;

        if (!holdingsMap || holdingsMap.size === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td colspan="3" class="py-4 text-center text-gray-500">
                No stocks in portfolio
            </td>`;
            tableBody.appendChild(row);
            return;
        }

        holdingsMap.forEach((holding, symbol) => {
            const currentPrice = holding.marketPrice;
            const value = currentPrice * holding.quantity;
            const profitLoss = currentPrice - holding.avgPrice;
            const profitLossClass = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 hover:bg-gray-50';
            row.innerHTML = `
            <td class="py-2">
                <div>${symbol}</div>
                <div class="text-xs text-gray-500">${holding.quantity} shares @ $${holding.marketPrice.toFixed(2)}</div>
            </td>
            <td class="py-2 text-right">${holding.quantity}</td>
            <td class="py-2 text-right">
                <div>$${value.toFixed(2)}</div>
                <div class="text-xs ${profitLossClass}">${profitLoss >= 0 ? '+' : ''}${((profitLoss / holding.avgPrice) * 100).toFixed(2)}%</div>
            </td>
        `;
            tableBody.appendChild(row);
        });
    }

    updatePortfolioDisplay(userPortfolio){
        // Update portfolio value
        const portfolioValueDisplay = document.getElementById('portfolio-value');
        portfolioValueDisplay.textContent = `$${userPortfolio.totalAssetsValue.toFixed(2)}`;
    }



    // Update holdings table
    updateHoldingsTable(userPortfolio) {
        const tableBody = document.getElementById('tableHoldings');
        tableBody.innerHTML = '';


        if (holdings.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML =
                '<td colspan="3" class="py-4 text-center text-gray-500">No stocks in portfolio</td>';
            tableBody.appendChild(row);
            return;
        }

        //TODO: work on this bit:
        Object.values(userPortfolio.holdingsMap).forEach(holding => {
            const currentPrice = holding.marketPrice;
            const value = currentPrice * holding.quantity;
            const profit = currentPrice - holding.purchasePrice;
            const profitLossClass = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 hover:bg-gray-50';
            row.innerHTML = `
            <td class="py-2">
                <div>${holding.stock.symbol}</div>
                <div class="text-xs text-gray-500">${holding.quantity} shares @ $${holding.avgPrice.toFixed(2)}</div>
            </td>
            <td class="py-2 text-right">${holding.quantity}</td>
            <td class="py-2 text-right">
                <div>$${value.toFixed(2)}</div>
                <div class="text-xs ${profitLossClass}">
                    ${profitLoss >= 0 ? '+' : ''}${(profitLoss * 100 / holding.avgPrice).toFixed(2)}%
                </div>
            </td>`;
            tableBody.appendChild(row);
        });
    }
}