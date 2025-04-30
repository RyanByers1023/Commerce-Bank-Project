import fetch from 'node-fetch';

class Stock {
    constructor(arg) {
        this.apiKey = '43c4bdb7a0mshac6db6fb0a5241ep1a044bjsn071e9eadf8a3';

        this.apiHost = 'yh-finance.p.rapidapi.com';

        if (typeof arg === 'string') {
            // Case: passed a stock symbol
            this.symbol = arg;
            this.initializeNewStock();
        } else if (arg instanceof Stock) { //has a stock object been passed?
            // Case: passed another Stock-like object
            this.copyStock(arg);
        } else {
            throw new Error('Invalid constructor argument for Stock');
        }
    }

    initializeNewStock() {
        // the current price of the stock
        this.marketPrice = null;

        //Healthcare, Technology, etc.
        this.sector = null;

        this.symbol = null;

        this.companyName = null;

        // the price the stock was at end of the last trading day
        this.previousClosePrice = null;

        // float, the price the stock is at at the end of the current trading day
        this.closePrice = null;

        // float, price stock is at the beginning of the trading day
        this.openPrice = null;

        //int, how many shares have been traded during the current market day
        this.volume = null;

        // int, influenced by news, ranges from -1 (very negative) to 1 (very positive)
        this.sentimentFactor = 0;

        // array[float] that tracks the price of the stock over time, max:
        this.priceHistory = [null];

        this.currentSentiment = 0;

        this.initializeStock();
    }

    //initialize a stock with a pre-initialized stock: (would be obtained via Portfolio->holdingsMap[symbol])
    copyStock(stock) {
        this.symbol = stock.symbol;
        this.marketPrice = stock.marketPrice;
        this.sector = stock.sector;
        this.companyName = stock.companyName;
        this.previousClosePrice = stock.previousClosePrice;
        this.closePrice = stock.closePrice;
        this.openPrice = stock.openPrice;
        this.volume = null;
        this.priceHistory = stock.priceHistory;
        this.currentSentiment = stock.currentSentiment;
    }

    // get stock info from Yahoo Finance's API
    async initializeStock() {
        try {
            await this.setStockInfoViaAPI();
        }
        catch (error) { //stock info could not be obtained from the provided API
            console.error(`API error for ${this.symbol}:`, error, `\n\nCreating randomized attributes for ${this.symbol}...`);

            //continue the simulation, but with fake initial prices
            this.simulateStockInitialization();
        }
    }

    //in the off chance the API goes down, key stops working, etc.,
    //this function will allow for the sim to work offline
    simulateStockInitialization(marketPrice = 100) {
        this.marketPrice = marketPrice;

        this.previousClosePrice = this.marketPrice;
        this.openPrice = this.marketPrice;
        this.priceHistory = [this.openPrice];
        this.volatility = Math.random() * 0.05 + 0.01;

        //this might make some goofy stock->sector relationships
        //TODO: maybe a pre-initialized stock list would be good instead
        this.assignRandomSector();

        // simulate a previous close price:
        this.previousClosePrice = this.marketPrice * (1 - (Math.random() * 0.04 - 0.02));

        //debug message, indicate success:
        console.log(`\n\nCreated some random attributes for ${this.symbol}`);
    }

    async setStockInfoViaAPI() {
        const url = `https://${this.apiHost}/stock/v2/get-summary?symbol=${this.symbol}`;

        const APIParameters = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': this.apiKey,
                'X-RapidAPI-Host': this.apiHost
            }
        };

        const response = await fetch(url, APIParameters);

        if (!response.ok) {
            throw new Error(`HTTP error. status: ${response.status}`);
        }

        const data = await response.json();

        //use contents of data to assign real initial attributes for this stock.
        this.previousClosePrice = data.summaryDetail?.previousClose?.raw ?? null;
        this.marketPrice = data.price?.regularMarketPrice?.raw ?? null;
        this.openPrice = data.summaryDetail?.open?.raw ?? null;
        this.priceHistory = [this.openPrice];
        this.sector = data.summaryProfile?.sector ?? 'Unknown';
        this.companyName = data.price?.longName ?? data.price?.shortName ?? 'Unknown';
        this.volume = data.price?.regularMarketVolume?.raw ?? null;

        //debug message, indicate success:
        console.log(`\n\nFetched up to date attributes from API for ${this.symbol}`);
    }

    // Update the stock price based on market conditions and sentiment
    updatePrice() {
        // Calculate a market price based on volatility and sentiment
        const change = this.marketPrice * this.volatility * (Math.random() * 2 - 1 + this.sentimentFactor);
        this.marketPrice += change;

        // Ensure price doesn't go negative
        this.marketPrice = Math.max(this.marketPrice, 0.01);

        this.updatePriceHistory();
    }

    updatePriceHistory(){
        // Add to price history
        this.priceHistory.push(this.marketPrice);

        // Keep price history limited to a reasonable size
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }
    }


    //for debugging purposes,
    printAllAttributesToConsole() {
        console.log(`\n\nSymbol: ${this.symbol}`);
        console.log(`\nMarket Price: ${this.marketPrice}`);
        console.log(`\nPrevious Close Price: ${this.previousClosePrice}`);
        console.log(`\nToday's Close Price: ${this.closePrice}`);
        console.log(`\nOpen Price: ${this.openPrice}`);
        console.log(`\nCompany Name: ${this.companyName}`);
        console.log(`\nSector: ${this.sector}`);
        console.log(`\nVolume: ${this.volume}`);
    }

    //for debugging purposes,
    printPriceHistory(){
        for(let i = 0; i < this.priceHistory.size(); ++i){
            console.log(`
            priceHistory[${i}] = ${this.priceHistory[i]}`)
        }
    }

    calculatePriceChange(marketTrend = 0){
        // Base random movement
        let randomFactor = (Math.random() - 0.5) * this.volatility;

        //float, dampens the impact marketTrend has on marketFactor
        const MARKET_FACTOR_DAMPENER = 0.15;

        // Influence from market trend (overall market direction)
        let marketFactor = marketTrend * MARKET_FACTOR_DAMPENER;

        // Calculate percentage change
        return randomFactor + marketFactor;
    }

    //void, retrieve impact (float) from newsItem.impact
    updateCurrentSentiment(impact){
        this.currentSentiment += impact
    }

    updatePriceMetadata(){
        // Update tracking values
        if (this.marketPrice > this.highestPrice) {
            this.highestPrice = this.marketPrice;
        }
        if (this.marketPrice < this.lowestPrice || this.lowestPrice === 0) {
            this.lowestPrice = this.marketPrice;
        }

        // Limit history size to 1000 float values to prevent memory issues
        if (this.priceHistory.length > 1000) {
            this.priceHistory.shift();
        }

        // track price history:
        this.priceHistory.push(this.marketPrice);
    }

    // Assign a random sector to the stock
    assignRandomSector() {
        const sectors = [
            "Technology", "Healthcare", "Financial Services",
            "Consumer Goods", "Energy", "Telecommunications",
            "Real Estate", "Utilities", "Materials", "Industrials"
        ];
        return sectors[Math.floor(Math.random() * sectors.length)];
    }

    //getters:

    // Calculate current day's change
    getDayChange() {
        return {
            value: this.marketPrice - this.openPrice,
            percent: ((this.marketPrice / this.openPrice) - 1) * 100
        };
    }

    // Get formatted price
    getFormattedPrice() {
        return `$${this.marketPrice.toFixed(2)}`;
    }
}

export default Stock;