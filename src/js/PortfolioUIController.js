
export default class PortfolioUIController{
    constructor(userPortfolio){
        //references the value stored in 'stockBuyQuantity' (simulator.html)
        this.stockBuyQuantity = 0;

        //references the value stored in 'stockSellQuantity' (simulator.html)
        this.stockSellQuantity = 0;

        this.initializeUIListeners();
    }

    initializeUIListeners(userPortfolio){
        document.addEventListener('DOMContentLoaded', function() {

            this.setStockBuyQuantityListener();
            this.setStockSellQuantityListener();
        
            this.handleStockBuyButtonClick();
            this.handleStockSellButtonClick();
        
            //set up all of the UI elements pertaining to the user portfolio
            this.updateCashDisplay(userPortfolio);
            this.updatePortfolioDisplay(userPortfolio);
            this.updateAssetsDisplay(userPortfolio);
            this.updateHoldingsTable(userPortfolio);
            this.updateBuySellPriceDisplay(userPortfolio);
        });
    }

    setStockBuyQuantityListener(){
        //get the field from the html document:
        const stockBuyQuantity = document.getElementById('stockBuyQuantity');

        //add a listener of type input to the field referenced within stockBuyQuantity
        //when input is detected in the 'stockBuyQuantity' field, it gets parsed as in int and stored in this.stockBuyQuantity
        stockBuyQuantity.addEventListener('input', function() {
            this.stockBuyQuantity = parseInt(stockBuyQuantity.value) || 0; //if the input is invalid, quantity = 0
        });
    }

    setStockSellQuantityListener(){
        //get the field from the html document:
        const stockSellQuantity = document.getElementById('stockSellQuantity');

        //add a listener of type input to the field referenced within sellQuantityInput
        //when input is detected in the 'stockSellQuantity' field, it gets stored in this.stockSellQuantity
        stockSellQuantity.addEventListener('input', function() {
            this.stockSellQuantity = parseInt(stockSellQuantity.value) || 0; //if the input is invalid, quantity = 0
        });
    }

    setBuyTotalSpan(selectedStock){
        //calculate the total cost of the transaction (#stocks * their market price)
        let totalValue = this.getTotalValue(selectedStock, quantity);

        //set the field with the id: 'buyTotalSpan' to totalValue (cut down to only 2 decimal places)
        document.getElementById('buyTotalSpan').textContent = `$${totalValue.toFixed(2)}`;
    }

    setSellTotalSpan(){
        //get the stock selected from the drop down menu
        const selectedStock = this.getSelectedStock();

        //calculate the total cost of the transaction (#stocks * their market price)
        let totalValue = this.getTotalValue(selectedStock, quantity);

        //set the field with the id: 'buyTotalSpan' to totalValue (cut down to only 2 decimal places)
        document.getElementById('buyTotalSpan').textContent = `$${totalValue.toFixed(2)}`;
    }

    getTotalValue(selectedStock, quantity){
        let totalValue;

        if (selectedStock) {
            totalValue = selectedStock.marketPrice * quantity;
        }

        return totalValue;
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

    updateBuyTotalDisplay(selectedStock, quantity){
        document.getElementById('buy-total').textContent = `$${(selectedStock.marketPrice * quantity).toFixed(2)}`;
    }

    updateSellTotalDisplay(selectedStock, quantity){
        document.getElementById('sell-total').textContent = `$${(selectedStock.marketPrice * quantity).toFixed(2)}`;
    }

    // Update buy/sell price displays
    updateBuySellPriceDisplay(){
        const selectedStock = getSelectedStock();

        let sellQuantity = getInputSellQuantity(selectedStock);
        document.getElementById('sell-total').textContent = `$${(selectedStock.marketPrice * sellQuantity).toFixed(2)}`;
    }

    getInputSellQuantity(selectedStock){
        let sellQuantity;

        if(selectedStock){
            sellQuantity = parseInt(document.getElementById('sell-quantity').value) || 0;
        }

        return sellQuantity;
    }
    

    updateTotalAssetsDisplay(userPortfolio){
        // Update total assets
        const totalAssetsDisplay = document.getElementById('total-assets');
        totalAssetsDisplay.textContent = `$${(userPortfolio.cash + portfolioValue).toFixed(2)}`;
    }

    updatePortfolioDisplay(userPortfolio){
        // Update portfolio value
        const portfolioValueDisplay = document.getElementById('portfolio-value');
        portfolioValueDisplay.textContent = `$${userPortfolio.totalAssetsValue.toFixed(2)}`;
    }

    updateCashDisplay(userPortfolio){
        // Update cash display
        const cashDisplay = document.getElementById('available-cash');
        cashDisplay.textContent = `$${userPortfolio.balance.toFixed(2)}`;
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
            const currentPrice = holding.stock.marketPrice;
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