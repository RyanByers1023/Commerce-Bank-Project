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
    constructor(initialBalance = 500.0) {
        //give the user 500 dollars (or a provided value) to start investing with:
        this.initialBalance = initialBalance;

        //stores the amount of cash the user has
        this.balance = initialBalance;

        //Map of Stock objects to quantity owned
        this.holdingsMap = new Map();

        //int, number of stocks the user owns
        this.totalStocksOwned = 0;

        // Record of all transactions, see createTransaction() for info regarding what a transaction is
        this.transactionHistory = [];

        this.earnings = 0.0;
    }

    //returns transaction, associated attributes detailed below:
    createTransaction(stock, type, quantity) {
        return {
            transactionType: type, //string, "BUY" or "SELL"
            symbol: stock.symbol, //string
            companyName: stock.companyName, //string
            quantity: quantity, //int
            pricePaid: stock.marketPrice, //float
            totalTransactionValue: stock.pricePaid * quantity, //float
            timestamp: new Date()
        };
    }

    //returns a bool, true if purchase was successful, false otherwise
    buyStock(stock, quantity) {
        //quantity must be a number between 0 and 10, and stock must be initialized:
        if (isNaN(quantity)
            || quantity <= 0
            || quantity > 10
            || !stock)
        {
            //buy unsuccessful
            return false;
        }

        //calculate and store the total cost of this transaction:
        let totalCost = quantity * stock.marketPrice;

        // Check if user has enough cash:
        if (totalCost > this.balance){
            //buy unsuccessful
            return false;
        }

        //negative value provided bc we are subtracting this value from the user's balance
        this.updateBalance(-totalCost)

        this.addStockToPortfolio(stock, quantity);

        //initialize a transaction object based on this transaction
        let newTransaction = this.createTransaction(stock, "BUY", quantity)

        //store the transaction in transactionHistory array
        this.transactionHistory.push(newTransaction);

        //buy successful
        return true;
    }

    //returns a bool, true if purchase was successful, false otherwise
    sellStock(stock, quantity) {
        //quantity must be a number between 0 and the amount of this stock the user owns + stock must be initialized:
        if (isNaN(quantity)
            || quantity <= 0
            || quantity > this.holdingsMap[stock]
            || !stock)
        {
            //sell unsuccessful
            return false;
        }

        //calculate and store the total cost of this transaction:
        let totalValue = quantity * stock.marketPrice;

        //negative value provided bc we are subtracting this value from the user's balance
        this.updateBalance(-totalValue)

        this.addStockToPortfolio(stock, quantity);

        //initialize a transaction object based on this transaction
        let newTransaction = this.createTransaction(stock, "BUY", quantity)

        //store the transaction in transactionHistory array
        this.transactionHistory.push(newTransaction);

        //sell successful
        return true;
    }

    //void, removes 'quantity' 'stock's from this.holdingsMap
    addStockToPortfolio(stock, quantity) {
        const currentQty = this.holdingsMap.get(stock) || 0;
        this.holdingsMap.set(stock, currentQty + quantity);
    }

    //void, removes 'quantity' stocks from this.holdingsMap
    removeStockFromPortfolio(stock, quantity) {
        if (this.holdingsMap.has(stock)) {
            const currentQty = this.holdingsMap.get(stock) - quantity;
            if (currentQty <= 0) {
                this.holdingsMap.delete(stock);
            } else {
                this.holdingsMap.set(stock, currentQty);
            }
        }
    }

    getAverageMoneySpentOnStock(stock){
        let totalMoneySpent = this.calculateTotalMoneySpentOnStock(stock);
        return totalMoneySpent / this.holdingsMap.getQuantity(stock);
    }

    //returns float, helper function for getAverageStockPurchasePrice()
    calculateTotalMoneySpentOnStock(stock){
        let relevantTransactions = this.getAllBuyTransactionsForStock(stock)
        let totalMoneySpent = 0.0;

        if (relevantTransactions.length === 0) {
            return 0.0;
        }

        for(let i = 0; i < relevantTransactions.size(); ++i){
            totalMoneySpent += relevantTransactions[i].pricePaid;
        }

        return totalMoneySpent;
    }

    //returns float, helper function for calculateTotalMoneySpent()
    getAllBuyTransactionsForStock(stock){
        return this.transactionHistory.filter(transaction =>
            transaction.symbol === stock.symbol
            && transaction.type === "BUY"
        );
    }

    getAllSellTransactionsForStock(stock){
        return this.transactionHistory.filter(transaction => transaction.stockSymbol === stockSymbol);
    }

    //returns void, updates this.balance (is okay to provide a negative value to subtract from the user's balance)
    updateBalance(value){
        this.balance += value;
    }

    setPortfolioValue() {
        //reset portfolioValue:
        this.portfolioValue = 0;

        //iterate through this.holdings and add together all stocks' values
        //(with their current values, not the values the stocks were bought at initially)
        for (const symbol in this.holdingsMap) {
            if (this.holdingsMap[symbol]) {
                this.portfolioValue += this.holdingsMap[symbol].pricePaid * this.holdingsMap[symbol].quantity;
            }
        }
    }

    //returns float, returns the value of the user's available money + the value of their investments
    setTotalAssetsValue() {
        this.totalAssetsValue = this.balance + this.portfolioValue;
    }

    // returns float, returns the earnings/losings the user
    setEarnings() {
        this.earnings = this.totalAssetsValue - this.startingCash;
    }
}

export default Portfolio;