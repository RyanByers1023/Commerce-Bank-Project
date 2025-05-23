// ===== PROPER COST BASIS HOLDINGS STRUCTURE =====

import DatabaseService from "../dbServices/databaseService";
import Transaction from "./transaction.js";

class Portfolio {
    constructor(initialBalance = 500.0) {
        this.initialBalance = initialBalance;
        this.balance = initialBalance;
        this.portfolioID = this.generatePortfolioID();

        // Holdings structure: symbol => { quantity, avgPricePaid, transactions: [] }
        this.holdingsMap = {};

        this.totalStocksOwned = 0;
        this.portfolioValue = 0.00;
        this.totalAssetsValue = 0.00;
        this.transactionHistory = [];
        this.earnings = 0.0;
        this.dbService = new DatabaseService();
    }

    generatePortfolioID() {
        return `port-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    createTransaction(stock, transactionType, quantity) {
        return new Transaction(stock, transactionType, quantity, this.portfolioID);
    }


    // ===== FIXED: Buy Stock with Cost Basis Tracking =====
    buyStock(stock, quantity) {
        // Validation
        if (!stock || !stock.symbol || !stock.marketPrice) {
            console.error('Invalid stock object');
            return false;
        }

        if (isNaN(quantity) || quantity <= 0 || quantity > 100) {
            console.error('Invalid quantity');
            return false;
        }

        const pricePaid = stock.marketPrice;  // Price at time of purchase
        const totalCost = quantity * pricePaid;

        if (totalCost > this.balance) {
            console.error('Insufficient funds');
            return false;
        }

        // Update balance
        this.addToBalance(-totalCost);

        // Add to holdings with cost basis
        this.addStockToPortfolio(stock.symbol, quantity, pricePaid);

        return true;
    }

    addStockToPortfolio(symbol, quantity, pricePaid) {
        const holding = this.holdingsMap[symbol];

        const newTransaction = this.createTransaction(stock, "BUY", quantity);

        if (holding) {
            // Update existing holding with weighted average
            const oldTotalCost = holding.totalCostBasis;
            const newCost = quantity * pricePaid;
            const newQuantity = holding.quantity + quantity;
            const newTotalCost = oldTotalCost + newCost;

            holding.quantity = newQuantity;
            holding.totalCostBasis = newTotalCost;
            holding.avgPricePaid = newTotalCost / newQuantity;
            holding.transactions.push(newTransaction);

            this.transactionHistory.push(newTransaction);

        } else {
            // Create new holding
            this.holdingsMap[symbol] = {
                quantity: quantity,
                avgPricePaid: pricePaid,
                totalCostBasis: quantity * pricePaid,
                transactions: [
                    newTransaction
                ]
            };
        }
    }

    // ===== FIXED: Sell Stock with Cost Basis =====
    sellStock(stock, quantity) {
        const holding = this.holdingsMap[stock.symbol];

        if (!holding) {
            console.error(`No holdings found for ${stock.symbol}`);
            return false;
        }

        if (isNaN(quantity) || quantity <= 0 || quantity > holding.quantity) {
            console.error('Invalid sell quantity');
            return false;
        }

        const salePrice = stock.marketPrice;  // Current market price
        const totalValue = quantity * salePrice;

        // ADD money to balance (we're getting cash from the sale)
        this.addToBalance(totalValue);

        // Remove from holdings (proportional cost basis)
        this.removeStockFromPortfolio(stock.symbol, quantity);

        // Record transaction
        let newTransaction = this.createTransaction(stock, "SELL", quantity);
        this.transactionHistory.push(newTransaction);

        return true;
    }

    // ===== PROPER: Remove Stock with Proportional Cost Basis =====
    removeStockFromPortfolio(symbol, quantity) {
        const holding = this.holdingsMap[symbol];
        if (!holding) return;

        // Calculate proportional cost reduction
        const proportionSold = quantity / holding.quantity;
        const costBasisReduction = holding.totalCostBasis * proportionSold;

        // Update holding
        holding.quantity -= quantity;
        holding.totalCostBasis -= costBasisReduction;

        // Recalculate average (should stay the same, but for precision)
        if (holding.quantity > 0) {
            holding.avgPricePaid = holding.totalCostBasis / holding.quantity;
        } else {
            // No shares left, remove holding
            delete this.holdingsMap[symbol];
        }
    }

    // ===== CALCULATE PORTFOLIO VALUE (needs current stock prices) =====
    calculatePortfolioValue(stocksArray) {
        this.portfolioValue = 0;

        for (const symbol in this.holdingsMap) {
            const holding = this.holdingsMap[symbol];

            // Find current stock price
            const currentStock = stocksArray.find(s => s.symbol === symbol);
            const currentPrice = currentStock ? currentStock.marketPrice : 0;

            // Calculate current market value
            const currentValue = holding.quantity * currentPrice;
            this.portfolioValue += currentValue;
        }

        return this.portfolioValue;
    }

    // ===== GET HOLDING WITH PROFIT/LOSS CALCULATION =====
    getHoldingDetails(symbol, currentStockPrice) {
        const holding = this.holdingsMap[symbol];
        if (!holding) return null;

        const currentValue = holding.quantity * currentStockPrice;
        const profitLoss = currentValue - holding.totalCostBasis;
        const percentChange = holding.totalCostBasis > 0 ?
            (profitLoss / holding.totalCostBasis) * 100 : 0;

        return {
            symbol: symbol,
            quantity: holding.quantity,
            avgPricePaid: holding.avgPricePaid,
            totalCostBasis: holding.totalCostBasis,
            currentPrice: currentStockPrice,
            currentValue: currentValue,
            profitLoss: profitLoss,
            percentChange: percentChange,
            unrealizedGainLoss: profitLoss
        };
    }

    getAllHoldingsWithCurrentPrices(stocksArray) {
        const holdings = [];

        for (const symbol in this.holdingsMap) {
            const currentStock = stocksArray.find(s => s.symbol === symbol);
            const currentPrice = currentStock ? currentStock.marketPrice : 0;

            const holdingDetails = this.getHoldingDetails(symbol, currentPrice);
            if (holdingDetails) {
                holdingDetails.companyName = currentStock ? currentStock.companyName : 'Unknown';
                holdingDetails.sector = currentStock ? currentStock.sector : 'Unknown';
                holdings.push(holdingDetails);
            }
        }

        return holdings;
    }

    setTotalStocksOwned() {
        this.totalStocksOwned = 0;
        for (const symbol in this.holdingsMap) {
            const holding = this.holdingsMap[symbol];
            if (holding && holding.quantity > 0) {
                this.totalStocksOwned += holding.quantity;
            }
        }
    }

    // ===== CALCULATE TOTAL ASSETS VALUE =====
    calculateTotalAssetsValue(stocksArray) {
        this.calculatePortfolioValue(stocksArray);
        this.totalAssetsValue = this.balance + this.portfolioValue;
        return this.totalAssetsValue;
    }

    // ===== CALCULATE EARNINGS =====
    calculateEarnings(stocksArray) {
        this.calculateTotalAssetsValue(stocksArray);
        this.earnings = this.totalAssetsValue - this.initialBalance;
        return this.earnings;
    }

    // ===== GET PORTFOLIO SUMMARY =====
    getPortfolioSummary(stocksArray) {
        this.setTotalStocksOwned();
        const totalAssets = this.calculateTotalAssetsValue(stocksArray);
        const earnings = this.calculateEarnings(stocksArray);

        // Calculate total cost basis
        let totalCostBasis = 0;
        for (const symbol in this.holdingsMap) {
            totalCostBasis += this.holdingsMap[symbol].totalCostBasis;
        }

        // Calculate total unrealized gains/losses
        const totalUnrealized = this.portfolioValue - totalCostBasis;

        return {
            balance: this.balance,
            portfolioValue: this.portfolioValue,
            totalAssetsValue: totalAssets,
            initialBalance: this.initialBalance,
            earnings: earnings,
            totalStocksOwned: this.totalStocksOwned,
            uniqueStocks: Object.keys(this.holdingsMap).length,
            profitLossPercent: this.initialBalance > 0 ? (earnings / this.initialBalance) * 100 : 0,

            // Cost basis tracking
            totalCostBasis: totalCostBasis,
            totalUnrealizedGainLoss: totalUnrealized,
            totalCashUsed: this.initialBalance - this.balance,

            // Performance metrics
            portfolioReturn: totalCostBasis > 0 ? (totalUnrealized / totalCostBasis) * 100 : 0
        };
    }

    // ===== UTILITY METHODS =====

    ownsStock(symbol) {
        return this.holdingsMap[symbol] && this.holdingsMap[symbol].quantity > 0;
    }

    getQuantityOwned(symbol) {
        const holding = this.holdingsMap[symbol];
        return holding ? holding.quantity : 0;
    }

    getCostBasis(symbol) {
        const holding = this.holdingsMap[symbol];
        return holding ? holding.totalCostBasis : 0;
    }

    getAvgPricePaid(symbol) {
        const holding = this.holdingsMap[symbol];
        return holding ? holding.avgPricePaid : 0;
    }

    addToBalance(value) {
        this.balance += value;
    }
}

export default Portfolio;