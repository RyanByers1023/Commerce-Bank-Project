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
//type: (either "SELL" or "BUY")


//STOCK (stock prices are generated on the fly after being obtained via API, so these will be unique for each user)
//stockSymbol: primary key, uniquely identifies a stock
//companyName: the name of the company associated with the stock
//sector: the industry this stock is in
//previousClosePrice: the price of the stock at the end of the last trading day
//openPrice: price stock is at the beginning of the trading day
//volume: how many shares have been traded during the current market day
//sentimentValue: influenced by news, ranges from -1 (very negative) to 1 (very positive)
//priceHistory: an array, stores the previous prices of the stock as float values, make sure to cap the size of the array

import Stock from "./Stock";

class Portfolio {
    //change the value passed to this constructor to change user starting money
    constructor(initialCash = 500.0) {
        //user begins with value stored in initialCash
        this.balance = initialCash;

        //Map of stock symbols to quantity owned
        //e.g. 'AAPL': 2 means a user has two shares of Apple stock
        this.holdingsMap = {};

        //int, number of stocks the user owns
        this.totalStocksOwned = 0;

        // Record of all transactions, see createTransaction() for info regarding what a transaction is
        this.transactionHistory = [];

        // For calculating total profits/losses, this is not the user's balance
        this.startingCash = initialCash;


        this.earnings = 0.0;
    }

    //returns transaction, associated attributes detailed below:
    createTransaction(stock, type, quantity) {
        return {
            transactionType: type,
            stockSymbol: stock.symbol,
            stockCompanyName: stock.companyName,
            stockQuantity: quantity,
            stockPrice: stock.marketPrice,
            totalTransactionCost: stock.marketPrice * quantity,
            timestamp: new Date()
        };
    }

    //function assumes stock is initialized correctly
    //returns a bool, true if purchase was successful, false otherwise
    buyStock(stock, quantity) {
        //quantity must a number greater than 0:
        if (isNaN(quantity) || quantity <= 0) {
            return false;
        }

        //quantity will initially be a string e.g: "6", not 6, so this needs to be converted to an int:
        quantity = parseInt(quantity);

        //calculate and store the total cost of this transaction:
        let totalCost = quantity * stock.marketPrice;

        // Check if user has enough cash:
        if (totalCost > this.balance){
            //immediately break out of this function if they don't have the cash for the transaction:
            return false;
        }

        //negative value provided bc we are subtracting this value from the user's balance
        this.updateBalance(-totalCost)

        //add the stock to user's holdings
        this.addToHoldings(stock);

        //initialize a transaction object based on this transaction
        let newTransaction = this.createTransaction(stock, "BUY", quantity)

        //store the transaction in transactionHistory array
        this.transactionHistory.push(newTransaction);

        return true;
    }

    //function assumes stock is initialized correctly
    //returns a bool, true if sell was successful, false otherwise
    performTransaction(stock, quantity, type) {
        //quantity must be a number greater than 0:
        if (isNaN(quantity) || quantity <= 0) {
            return false;
        }

        if(type !== "SELL" || type !== "BUY"){
            return false;
        }

        quantity = parseInt(quantity);

        if (!this.holdingsMap[stock.symbol] // Check if user owns the stock (is it in holdingsMap?)
            || this.holdingsMap[stock.symbol].quantity < quantity) { // Check if user owns enough shares
            return false;
        }

        // Calculate total value
        const totalValue = stock.marketPrice * quantity;

        //handle adding/removing this holding from the user
        //and handle updating the user's balance
        if(type === "BUY"){
            this.addToHoldings(stock, quantity);
            this.updateBalance(totalValue);
        }
        else if (type === "SELL"){
            this.takeFromHoldings(stock, quantity);
            this.updateBalance(-totalValue);
        }

        //initialize a transaction object based on this transaction
        let newTransaction = this.createTransaction(stock, "SELL", quantity)

        //add the transaction to transactionHistory
        this.transactionHistory.push(newTransaction);

        return true;
    }

    //void, creates a holding object to be contained within this.holdingsMap
    addToHoldings(stock, quantity) {
        if (this.holdingsMap[stock.symbol]) { //does the user already own one of these stocks?
            this.updateHolding(stock, quantity);
        } else { //the user does not have a stock from this company, so a new holding needs to be created:
            this.createHolding(stock, quantity);
        }
    }

    //void, helper function for addToHoldings(), updates an existing (function assumes this was checked) holding within this.holdingMap
    updateHolding(stock, quantity){
        // Existing holding: update quantity and average market price
        this.holdingsMap[stock.symbol].quantity += quantity;

        //recalculate the average price the user has paid for this stock:
        this.holdingsMap[stock.symbol].avgPricePaid = this.calculateAverageStockPurchasePrice(stock)
    }

    createHolding(stock, quantity){
        // New holding: create a new entry
        this.holdingsMap[stock.symbol] = {
            symbol: stock.symbol,
            companyName: stock.companyName,
            quantity: quantity,
            pricePaid: stock.marketPrice,
            avgPricePaid: this.calculateAverageStockPurchasePrice(stock),
        };
    }

    takeFromHoldings(stock, quantity){
        // Update holdings
        this.holdingsMap[stock.symbol].quantity -= quantity;
    }

    //returns float if stock has been purchased before and null if there exists no transactions for provided stock
    calculateAverageStockPurchasePrice(stock){
        let relevantTransactions = this.getAllTransactionsForStock(stock)

        if (relevantTransactions.length === 0) {
            console.log(`No transactions found for ${stock.symbol}`);
            return null;
        }

        let totalMoneySpent = 0;

        //add up the money the user has spent so far on this stock
        for(let i = 0; i < relevantTransactions.size(); ++i){
            totalMoneySpent += relevantTransactions[i].pricePaid;
        }

        return totalMoneySpent / this.holdingsMap
    }

    //returns float, returns all transactions relevant to the provided stock (stock was involved in transaction)
    getAllTransactionsForStock(stock){
        return this.transactionHistory.filter(transaction => transaction.stockSymbol === stock.symbol);
    }

    //returns void, updates this.balance (is okay to provide a negative value to subtract from the user's balance)
    updateBalance(value){
        this.balance += value;
    }

    // returns float: total portfolio value
    getPortfolioValue() {
        //stores the total portfolio value
        let total = 0;

        //iterate through this.holdings and add together all stocks' values
        //(with their current values, not the values the stocks were bought at initially)
        for (const symbol in this.holdingsMap) {
            if (this.holdingsMap[symbol]) {
                total += this.holdingsMap[symbol].pricePaid * this.holdingsMap[symbol].quantity;
            }
        }

        return total;
    }

    //returns float, returns the value of the user's available money + the value of their investments
    getTotalAssetsValue(stockMap) {
        return this.balance + this.getPortfolioValue(stockMap);
    }

    // returns float, returns the earnings/losings the user
    getEarnings() {
        return this.getTotalAssetsValue() - this.startingCash;
    }

    setEarnings(){
        this.earnings = this.getEarnings();
    }
}

export default Portfolio;