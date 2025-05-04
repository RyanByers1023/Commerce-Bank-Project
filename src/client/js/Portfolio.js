import DatabaseManager from '/js/DatabaseManager.js';

class Portfolio {
    //change the value passed to this constructor to change user starting money
    constructor(initialBalance = 500.0) {
        //give the user 500 dollars (or a provided value) to start investing with:
        this.initialBalance = initialBalance;

        //stores the amount of cash the user has
        this.balance = initialBalance;

        this.holdingsMap = {}; // stock.symbol => quantity owned

        //int, number of stocks the user owns
        this.totalStocksOwned = 0;

        this.portfolioValue = 0.00;

        this.totalAssetsValue = 0.00;

        // Record of all transactions, see createTransaction() for info regarding what a transaction is
        this.transactionHistory = [];

        this.earnings = 0.0;

        this.dbManager = new DatabaseManager();
    }

    //returns transaction, associated attributes detailed below:
    createTransaction(stock, type, quantity) {
        return {
            //This gives something like: txn-1714526102005-g8kzq -- a unique transaction ID -- can be used as primary key in DB
            transactionID: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            transactionType: type, //string, "BUY" or "SELL"
            symbol: stock.symbol, //string
            companyName: stock.companyName, //string
            quantity: quantity, //int
            pricePaid: stock.marketPrice, //float
            totalTransactionValue: stock.pricePaid * quantity, //float
            timestamp: new Date()
        };
    }

    async buyStock(stock, quantity) {
        // Run existing buyStock method
        const success = this.buyStock(stock, quantity);

        if (success) {
            // Get the last transaction (which was just created)
            const transaction = this.transactionHistory[this.transactionHistory.length - 1];

            // Record in database
            try {
                await this.dbManager.recordTransaction(transaction);
                await this.dbManager.updateHoldings(this.username, this.holdingsMap);
                await this.dbManager.saveUserProfile(this.userProfile);
            } catch (error) {
                console.error('Failed to record transaction:', error);
                //TODO: Consider how to handle database failures
            }
        }

        return success;
    }

    //returns a bool, true if purchase was successful, false otherwise
    _buyStock(stock, quantity) {
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
        this.addToBalance(-totalCost)

        //initialize a transaction object based on this transaction
        let newTransaction = this.createTransaction(stock, "BUY", quantity)

        this.addStockToPortfolio(stock, quantity);

        //store the transaction in transactionHistory array
        this.transactionHistory.push(newTransaction);

        //buy successful
        return true;
    }

    //TODO: refactor code -- lots of duplicate code
    async _sellStock(stock, quantity) {
        // Run existing buyStock method
        const success = this.sellStock(stock, quantity);

        if (success) {
            // Get the last transaction (which was just created)
            const transaction = this.transactionHistory[this.transactionHistory.length - 1];

            // Record in database
            try {
                await this.dbManager.recordTransaction(transaction);
                await this.dbManager.updateHoldings(this.username, this.holdingsMap);
                await this.dbManager.saveUserProfile(this.userProfile);
            } catch (error) {
                console.error('Failed to record transaction:', error);
                //TODO: Consider how to handle database failures
            }
        }

        return success;
    }

    //returns a bool, true if purchase was successful, false otherwise
    sellStock(stock, quantity) {
        //quantity must be a number between 0 and the amount of this stock the user owns
        if (isNaN(quantity)
            || quantity <= 0
            || quantity > this.holdingsMap[stock.symbol].quantity)
        {
            //sell unsuccessful
            return false;
        }

        //calculate and store the total cost of this transaction:
        let totalValue = quantity * stock.marketPrice;

        //negative value provided bc we are subtracting this value from the user's balance
        this.addToBalance(-totalValue)

        this.addStockToPortfolio(stock.symbol, quantity);

        //initialize a transaction object based on this transaction
        let newTransaction = this.createTransaction(stock, "BUY", quantity)

        //store the transaction in transactionHistory array
        this.transactionHistory.push(newTransaction);

        //sell successful
        return true;
    }

    //void, removes 'quantity' 'stock's from this.holdingsMap
    addStockToPortfolio(stock, quantity) {
        const holding = this.holdingsMap[stock.symbol];

        if (holding) {
            // weighted-average purchase price
            const oldCost = holding.avgPrice * holding.quantity;
            const newCost = stock.marketPrice * quantity;
            holding.quantity += quantity;
            holding.avgPrice  = (oldCost + newCost) / holding.quantity;
        } else {
            this.holdingsMap[stock.symbol] = {
                stock: stock,
                quantity: quantity,
                avgPrice: stock.marketPrice     // first purchase price
            };
        }
    }

    //void, removes 'quantity' stocks from this.holdingsMap
    removeStockFromPortfolio(stock, quantity) {
        //reference to the user's holding
        const holding = this.holdingsMap[stock.symbol];

        //user has at least one of these stocks already:
        if (holding) {
            holding.quantity -= quantity;
            if (holding.quantity <= 0) {
                delete this.holdingsMap[stock.symbol];
            }
        }
    }

    getAverageMoneySpentOnStock(stockSymbol){
        let totalMoneySpent = this.calculateTotalMoneySpentOnStock(stockSymbol);
        return totalMoneySpent / this.holdingsMap[stockSymbol].quantity;
    }

    //returns float, helper function for getAverageStockPurchasePrice()
    calculateTotalMoneySpentOnStock(stockSymbol){
        let relevantTransactions = this.getAllBuyTransactionsForStock(stockSymbol)
        let totalMoneySpent = 0.0;

        if (relevantTransactions.length === 0) {
            return 0.0;
        }

        for(let i = 0; i < relevantTransactions.size(); ++i){
            totalMoneySpent += relevantTransactions[i].pricePaid;
        }

        return totalMoneySpent;
    }

    //returns a list of buy transactions for a particular stock, identified uniquely by its symbol
    getAllBuyTransactionsForStock(stockSymbol){
        return this.transactionHistory.filter(transaction =>
            transaction.symbol === stockSymbol
            && transaction.type === "BUY"
        );
    }

    //returns a list of sell transactions for a particular stock, identified uniquely by its symbol
    getAllSellTransactionsForStock(stockSymbol){
        return this.transactionHistory.filter(transaction =>
            transaction.symbol === stockSymbol
            && transaction.type === "SELL");
    }

    //returns a list of ALL transactions for a particular stock, identified uniquely by its symbol
    getAllTransactionsForStock(stockSymbol){
        return this.transactionHistory.filter(transaction =>
            transaction.symbol === stockSymbol);
    }

    //returns void, updates this.balance (is okay to provide a negative value to subtract from the user's balance)
    addToBalance(value){
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