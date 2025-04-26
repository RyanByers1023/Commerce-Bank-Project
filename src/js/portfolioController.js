// Portfolio Controller - Manages user portfolio, cash, and transactions

//*DB* there should be a table called Portfolio within the DB
//stores information relevant to the state of the User's portfolio, and its history

//TODO: all input validation should be handled using a centralized file
//so, all output from something like InputValidator.js would be clean, trustable text
//i think this would be easier to maintain, but im open to other ideas -- ryan
class Portfolio {
    //change the value passed to this constructor to change user starting money
    constructor(initialCash = 10000) {
        //user begins with value stored in initialCash
        this.balance = initialCash;

        //Map of stock symbols to quantity owned
        //eg. 'AAPL': 2 means a user has two shares of Apple stock
        //tip for DB: use stock.symbol as Primary Key {PK} to identify any given stock, as there cannot be duplicates
        this.holdings = {};

         // Record of all transactions *DB*
        this.transactionHistory = [];

        // For calculating total profits/losses
        this.startingCash = initialCash; 
    }

    // Buy a stock
    buyStock(stock, quantity) {

        //TODO: sanitize this input (quantity)
        if (isNaN(quantity) || quantity <= 0) {
            return { success: false, message: "Please enter a valid quantity" };
        }

        quantity = parseInt(quantity);

        // Check if user has enough cash
        if (totalCost > this.balance){
            //immediately break out of the function if they don't have the cash for the transaction
            return { success: false, message: "Not enough cash available for this purchase" };
        }

        //negative value provided bc we are subtracting this value from the user's balance
        this.updateBalance(-totalCost)

        // create transaction *DB*
        const transaction = {
            //enum: "BUY" or "SELL"
            transactionType: "BUY",

            stockSymbol: stock.symbol,

            stockCompanyName: stock.companyName,

            //expected int from user input field
            stockQuantity: quantity,

            //int: obtained from stock Object
            stockPrice: stock.marketPrice,
            
            totalTransactionCost: stock.marketPrice * quantity,

            //Date() formatted as: (YYYY-MM-DD)
            timestamp: new Date()
        };

        //add the stock to user's holdings
        this.updateHoldings(stock);

        this.createTransaction(stock, "BUY", quantity)

        return {
            //flag returned to the calling code to indicate the transaction process has completed correctly
            success: true,

            //print a message to browser. TODO: this looks kind of like a debug message, best to improve/remove before project end
            message: `Successfully bought ${quantity} shares of ${stock.symbol} for $${totalCost.toFixed(2)}`,

            //the transaction itself is also returned
            transaction: transaction
        };
    }

    
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

        //add the stock to user's holdings
        this.takeFromHoldings(stock, "SELL");

        this.createTransaction(stock, "SELL", quantity)

        return {
            success: true,
            message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${totalValue.toFixed(2)}`,
            transaction: transaction
        };
    }

    createTransaction(stock, type, quantity) {
        newTransaction = {
            transactionType: type,
            stockSymbol: stock.symbol,
            stockCompanyName: stock.companyName,
            stockQuantity: quantity,
            stockPrice: pricePerShare,
            totalTransactionCost: stock.marketPrice * quantity,
            timestamp: new Date()
        };

        //store the transaction
        this.transactionHistory.push(newTransaction);

        return this.newTransaction;
    }

    // Helper function for buyStock(), modifies this.holdings
    addToHoldings(stock, quantity) {
        if(!stockValid(stock) || quantityValid(quantity)){
            return
        }

        //get the symbol (just for reading the next bit a little easier)
        const symbol = stock.symbol;

        if (this.holdings[symbol]) {
            // Existing holding: update quantity and average market price
            this.holdings[symbol].quantity += quantity;
            this.setAverageMarketPrice(stock, quantity);
        } else {
            // New holding: create a new entry
            this.holdings[symbol] = {
                symbol: symbol,
                name: stock.companyName,
                quantity: quantity,
                pricePayed: stock.marketPrice,
                avgPricePayed: this.calculateAverageStockPurchasePrice(stock),
            };
        }
    }

    //returns the average price payed for the stock involved in the passed transaction
    //this requires the transaction history list instead of the stock because 
    //the values required for the avg are all historical data with respect to the stock's price
    calculateAverageStockPurchasePrice(transaction){
        const relevantTransactions = this.getAllTransactionsForStock(transaction)

        //add up all of the money the user has spent so far on this stock
        for(i = 0; i < this.relevantTransactions.size(); ++i){
            
            if (relevantTransactions.length === 0) {
                console.log(`No transactions found for ${stockSymbol}`);
                return -1;
            }
        }

        return totalMoneySpend / this.holdings.size();

    }

    //returns all transactions that pertain to the same stock, helpful for avg calculation
    getAllTransactionsForStock(transaction){
        return this.transactions.filter(tx => tx.stockSymbol === stockSymbol);
    }


    //returns NULL: sets
    setAverageMarketPrice(stock, quantity) {
        if(!stockValid(stock) || !quantityValid(quantity)){
            return;
        }
    
        //get the stock, store in holding for easy access
        const holding = this.holdings[stock.symbol];
    
        const existingQuantity = holding.quantity - quantity;
        const existingCost = holding.avgPrice * existingQuantity;
        const newCost = stock.marketPrice * quantity;
        const totalQuantity = holding.quantity;
    
        holding.avgmarketPrice = (existingCost + newCost) / totalQuantity;
    }

    //returns a boolean: false if there is a problem with any stock attributes
    stockValid(stock){
        if (!stock //stock itself NULL?
            || !stock.symbol //stock.symbol NULL?
            || typeof stock.marketPrice !== 'number') { //is stock.marketPrice a number?
            console.error("Invalid stock object.");
            return false;
        }

        return true;
    }

    quantityValid(quantity){
        if (typeof quantity !== 'number' || quantity <= 0) {
            console.error("Quantity must be a positive number.");
            return true;
        }

        return false;
    }

    updateBalance(totalCost){
        this.balance += totalCost;
    }

    // returns float: total portfolio value
    getPortfolioValue(stockMap) {
        //stores the total portfolio value
        let total = 0;

        //iterate through this.holdings and add together all stocks' values
        //(with their current values, not the values the stocks were bought at initially)
        for (const symbol in this.holdings) {
            if (stockMap[symbol]) {
                total += stockMap[symbol].marketPrice * this.holdings[symbol].quantity;
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

// Helper to get current stock
function getCurrentStock() {
    return userStocks.find(stock => stock.symbol === currentStock);
}


//-------------------------------------------Portfolio UI Elements---------------------------------------------//

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
    updatePortfolioUI();
});

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
        document.getElementById('buy-price').textContent = `$${currentStock.marketPrice.toFixed(2)}`;
        document.getElementById('sell-price').textContent = `$${currentStock.marketPrice.toFixed(2)}`;

        // Update buy/sell totals
        const buyQuantity = parseInt(document.getElementById('buy-quantity').value) || 0;
        document.getElementById('buy-total').textContent = `$${(currentStock.marketPrice * buyQuantity).toFixed(2)}`;

        const sellQuantity = parseInt(document.getElementById('sell-quantity').value) || 0;
        document.getElementById('sell-total').textContent = `$${(currentStock.marketPrice * sellQuantity).toFixed(2)}`;
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