//DB Schema: (WIP, make changes as you please)

//USER:
//userID: primary key, uniquely identifies users
//username: the user's chosen username
//password: make sure to hash this before storing it
//email: the user's email address
//dateCreated: the date and time the account was created (optional)
//portfolioID: foreign key, links to PORTFOLIO

//PORTFOLIO:
//portfolioID: primary key, uniquely identifies a portfolio
//balance: amount of cash the user has that is not in the market
//initialBalance: the cash the user started with
//holdings: list of stocks the user owns
//transactionHistory: list of transactionIDs, foreign keys, that link to TRANSACTION

//TRANSACTION:
//transactionID: primary key, uniquely identifies a transaction
//status: complete, incomplete, failed
//(see createTransaction() for additional attributes to include)

//STOCK
//stockSymbol: primary key, uniquely identifies a stock
//(see Stock.js for additional attributes to include)



//to create another user, instantiate another object of this class:
class Portfolio {
    //change the value passed to this constructor to change user starting money
    constructor(initialCash = 500) {
        //user begins with value stored in initialCash
        this.balance = initialCash;

        //Map of stock symbols to quantity owned
        //eg. 'AAPL': 2 means a user has two shares of Apple stock
        //tip for DB: use stock.symbol as Primary Key {PK} to identify any given stock, as there cannot be duplicates
        //because this is how it is identified within the stock market
        this.holdings = {};

         // Record of all transactions *DB*
        this.transactionHistory = [];

        // For calculating total profits/losses, this is not the user's balance
        this.startingCash = initialCash; 
    }

    //returns transaction, associated attributes detailed below:
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

        //store the transaction in transactionHistory array
        this.transactionHistory.push(newTransaction);

        return this.newTransaction;
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

        //add the stock to user's holdings
        this.updateHoldings(stock);

        this.createTransaction(stock, "BUY", quantity)

        return {
            //flag returned to the calling code to indicate the transaction process has completed correctly
            success: true,

            //print a message to browser. TODO: this looks kind of like a debug message, best to improve/remove before project end
            message: `You bought ${quantity} shares of ${stock.symbol} for $${totalCost.toFixed(2)}`,

            //the transaction itself is also returned
            transaction: transaction
        };
    }

    
    sellStock(stock, quantity) {
        //TODO: sanitize this input
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

        // Update balance
        this.balance += totalValue;

        // Update holdings
        this.holdings[stock.symbol].quantity -= quantity;

        //add the stock to user's holdings
        //TODO: implement takeFromHoldings
        this.takeFromHoldings(stock, quantity);

        //add the transaction to transactionHistory
        this.createTransaction(stock, "SELL", quantity)

        return {
            success: true,
            message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${totalValue.toFixed(2)}`,
            transaction: transaction
        };
    }

    //void, Helper function for buyStock(), modifies this.holdings
    addToHoldings(stock, quantity) {
        if(!stockValid(stock) || quantityValid(quantity)){
            return
        }

        if (this.holdings[stock.symbol]) {
            // Existing holding: update quantity and average market price
            this.holdings[stock.symbol].quantity += quantity;
            this.setAverageMarketPrice(stock, quantity);
        } else {
            // New holding: create a new entry
            this.holdings[stock.symbol] = {
                symbol: stock.symbol,
                name: stock.companyName,
                quantity: quantity,
                pricePayed: stock.marketPrice,
                avgPricePayed: this.calculateAverageStockPurchasePrice(stock),
            };
        }
    }

    //returns float: the average price payed for the stock involved in the transaction passed via parameter
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
    
    //TODO: verify this function works,
    getAllTransactionsForStock(transaction){
        return this.transactionHistory.filter(transaction => transaction.stockSymbol === stockSymbol);
    }


    //void
    setAverageMarketPrice(stock, quantity) {
        if(!stockValid(stock) || !quantityValid(quantity)){
            return;
        }
    
        //get the stock, store in holding for easy access
        const selectedStock = this.holdings[stock.symbol];
    
        const existingQuantity = holding.quantity - quantity;
        const existingCost = holding.avgPrice * existingQuantity;
        const newCost = stock.marketPrice * quantity;
        const totalQuantity = holding.quantity;
    
        holding.avgmarketPrice = (existingCost + newCost) / totalQuantity;
    }

    //returns a boolean: false if there is a problem with any stock attributes, true otherwise
    stockValid(stock){
        if (!stock //stock itself NULL?
            || !stock.symbol //stock.symbol NULL?
            || typeof stock.marketPrice !== 'number') { //is stock.marketPrice a number?
            console.error("Invalid stock object.");
            return false;
        }

        return true;
    }

    //returns a boolean: false if there is a problem with the quantity value, true otherwise
    quantityValid(quantity){
        if (typeof quantity !== 'number' || quantity <= 0) {
            console.error("Quantity must be a positive number.");
            return true;
        }

        return false;
    }

    //void, updates this.balance
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

    //returns float, this.cash
    getTotalAssetsValue(stockMap) {
        return this.cash + this.getPortfolioValue(stockMap);
    }

    // Get profit/loss
    getProfitLoss(stockMap) {
        return this.getTotalAssetsValue(stockMap) - this.startingCash;
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