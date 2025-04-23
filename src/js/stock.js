import fetch from 'node-fetch';

class Stock {
    constructor(symbol) {
        // stock symbol: AAPL, DIS, MSFT, etc.
        this.symbol = symbol;

        //Healthcare, Technology, etc.
        this.sector = null;

        this.companyName = null;

        // this is the key you use to access the API
        this.apiKey = '43c4bdb7a0mshac6db6fb0a5241ep1a044bjsn071e9eadf8a3';

        // this is Yahoo Finance's API
        this.apiHost = 'yh-finance.p.rapidapi.com';

        // the price the stock was at end of the last trading day
        this.previousClosePrice = null;

        // the current price of the stock
        this.marketPrice = null;

        // price stock is at the beginning of the trading day
        this.openPrice = null;

        // used in calculation of volatility attribute below, obtained via API
        this.beta = null;

        // how much the stock price fluctuates
        this.volatility = null;

        //how many shares have been traded during the current market day
        this.volume = null;

        // influenced by news, ranges from -1 (very negative) to 1 (very positive)
        this.sentimentFactor = 0;
        this.sector = null;
        this.priceHistory = [null]; // array that tracks the price of the stock over time

        // set all the above stock values using real values via Yahoo Finance's API
        this.getIntialStockValues();
    }

    // get stock info from Yahoo Finance's API
    async getIntialStockValues() {
        try {
            await this.obtainStockInfoAPI();
        } catch (error) { //stock info could not be obtained from the provided API for some reason
            console.error(`API error for ${this.symbol}:`, error);
            //continue the simulation, but with fake initial prices, generated the same way they were before.
            this.simulatePreviousClose();
        }
    }

    async obtainStockInfoAPI() {
        const url = `https://${this.apiHost}/stock/v2/get-summary?symbol=${this.symbol}`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': this.apiKey,
                'X-RapidAPI-Host': this.apiHost
            }
        };

        this.previousClosePrice = data.summaryDetail?.previousClose?.raw ?? null;
        this.marketPrice = data.price?.regularMarketPrice?.raw ?? null;
        this.openPrice = data.summaryDetail?.open?.raw ?? null;
        this.priceHistory = [this.openPrice];
        this.beta = data.summaryDetail?.beta?.raw ?? null;
        this.volatility = this.beta ? this.beta * 0.02 : (Math.random() * 0.05 + 0.01);
        this.sector = data.summaryProfile?.sector ?? 'Unknown';
        this.companyName = data.price?.longName ?? data.price?.shortName ?? 'Unknown';
        this.volume = data.price?.regularMarketVolume?.raw ?? null;
        this.sector = data.summaryProfile?.sector ?? 'Unknown';

        console.log(`Fetched data for ${this.symbol}`);
    }

    //in the off chance the API goes down, key stops working, etc.,
    //this function will allow for the sim to work offline
    simulatePreviousClose() {
        if (this.marketPrice == null) {
            this.marketPrice = 100; // Default fallback market price
        }

        this.previousClosePrice = this.marketPrice;
        this.openPrice = this.marketPrice;
        this.priceHistory = [this.openPrice];
        this.beta = null;
        this.volatility = Math.random() * 0.05 + 0.01;
        this.assignRandomSector();

        this.previousClosePrice = this.marketPrice * (1 - (Math.random() * 0.04 - 0.02)); // simulated previous close
        console.warn(`Simulated previous close: $${this.previousClosePrice.toFixed(2)}`);
    }

    // Update the stock price based on market conditions and sentiment
    updatePrice(marketTrend = 0) {
        let percentChange = this.calculatePriceChange(marketTrend);

        // Apply change to price
        let oldPrice = this.marketPrice;
        this.marketPrice = Math.max(0.01, this.marketPrice * (1 + percentChange));

        this.updatePriceMetadata();

        return {
            oldPrice: oldPrice,
            newPrice: this.marketPrice,
            percentChange: percentChange
        };
    }

    changeStock(input){
        this.symbol = this.sanitizeStockSearchInput(input);
        this.getIntialStockValues();
    }

    sanitizeStockSearchInput(input) {
        // Return empty string if input is null or undefined
        if (input == null) {
            return "";
        }

        // Convert to string if not already
        let stockSymbol = String(input);

        // Trim whitespace
        stockSymbol = stockSymbol.trim();

        // Convert to uppercase (standard for stock symbols)
        stockSymbol = stockSymbol.toUpperCase();

        // Remove any non-alphanumeric characters (stock symbols typically only contain letters and sometimes numbers)
        stockSymbol = stockSymbol.replace(/[^A-Z0-9]/g, "");

        // Optional: Limit length to reasonable stock symbol length (typically 1-5 characters)
        stockSymbol = stockSymbol.substring(0, 5);

        return stockSymbol;
    }


    //for debugging purposes, outputs various attributes to the console
    logInfo() {
        console.log(`Symbol: ${this.symbol}`);
        console.log(`Previous Close: $${this.previousClosePrice}`);
        console.log(`Market Price: $${this.marketPrice}`);
        console.log(`Open Price: $${this.openPrice}`);
    }

    calculatePriceChange(marketTrend = 0){
        // Base random movement
        let randomFactor = (Math.random() - 0.5) * this.volatility;

        // Influence from market trend (overall market direction)
        let marketFactor = marketTrend * 0.2;

        //TODO: add more influence from sector movement?
        //let sectorFactor = sectorTrend * 0.3

        // Influence from sentiment (news)
        let sentimentImpact = this.sentimentFactor * 0.3;

        // Calculate percentage change
        return randomFactor + marketFactor + sentimentImpact;
    }

    updatePriceMetadata(){
        // Update tracking values
        if (this.marketPrice > this.highestPrice) {
            this.highestPrice = this.marketPrice;
        }
        if (this.marketPrice < this.lowestPrice || this.lowestPrice === 0) {
            this.lowestPrice = this.marketPrice;
        }

        // Limit history size to prevent memory issues
        if (this.priceHistory.length > 1000) {
            this.priceHistory.shift();
        }

        // track price history,
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

    // Apply sentiment change from news
    applySentimentChange(change) {
        this.sentimentFactor = Math.max(-1, Math.min(1, this.sentimentFactor + change));
        return this.sentimentFactor;
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

    // Get stock information as an object
    getInfo() {
        return {
            symbol: this.symbol,
            name: this.companyName,
            price: this.marketPrice,
            openPrice: this.openPrice,
            highestPrice: this.highestPrice,
            lowestPrice: this.lowestPrice,
            previousClose: this.previousClosePrice,
            dayChange: this.getDayChange(),
            volume: this.volume,
            sector: this.sector
        };
    }

    // Get string representation for debugging
    toString() {
        return `Stock: ${this.companyName} (${this.symbol}) | Price: $${this.marketPrice.toFixed(2)} | Change: ${this.getDayChange().percent.toFixed(2)}% | Sector: ${this.sector}`;
    }
}

export default Stock;


//---old stock object:---//

/*class Stock {
    constructor(symbol, name, price, volume) {
        this.symbol = symbol; // AAPL, META, etc.
        this.name = name; // Apple Corporation, Meta Corporation, etc.
        this.price = price; // current price of the stock
        this.volume = volume; // how much of the stock is currently being traded in the market (for the day)

        // Additional attributes for tracking performance
        this.openPrice = price; // price of stock at market open time
        this.highestPrice = price; // greatest price stock achieved (over the course of the day)
        this.lowestPrice = price; // lowest price stock achieved (over the course of the day)

        //TODO: obtain previousClosePrice via API instead of simulating a price
        this.previousClosePrice = price * (1 - (Math.random() * 0.04 - 0.02)); // simulated previous close
        this.priceHistory = [price]; // array that tracks the price of the stock over time

        // Additional attributes for market sentiment
        this.volatility = Math.random() * 0.05 + 0.01; // how much the stock price fluctuates
        this.sentimentFactor = 0; // influenced by news, ranges from -1 (very negative) to 1 (very positive)
        this.sector = this.assignSector(); // e.g., "Technology", "Healthcare", etc.
    }

    //setters

    // TODO: assign sectors dynamically based on selected stock. eg AAPL = Technology, 
    // Assign a random sector to the stock
    assignSector() {
        const sectors = [
            "Technology", "Healthcare", "Financial Services",
            "Consumer Goods", "Energy", "Telecommunications",
            "Real Estate", "Utilities", "Materials", "Industrials"
        ];
        return sectors[Math.floor(Math.random() * sectors.length)];
    }

    // Update the stock price based on market conditions and sentiment
    updatePrice(marketTrend = 0) {
        let percentChange = this.calculatePriceChange(marketTrend);

        // Apply change to price
        let oldPrice = this.price;
        this.price = Math.max(0.01, this.price * (1 + percentChange));

        this.updatePriceMetadata();

        return {
            oldPrice: oldPrice,
            newPrice: this.price,
            percentChange: percentChange
        };
    }

    calculatePriceChange(marketTrend = 0){
        // Base random movement
        let randomFactor = (Math.random() - 0.5) * this.volatility;

        // Influence from market trend (overall market direction)
        let marketFactor = marketTrend * 0.2;

        //TODO: add more influence from sector movement?
        //let sectorFactor = sectorTrend * 0.3

        // Influence from sentiment (news)
        let sentimentImpact = this.sentimentFactor * 0.3;

        // Calculate percentage change
        return randomFactor + marketFactor + sentimentImpact;
    }

    updatePriceMetadata(){
        // Update tracking values
        if (this.price > this.highestPrice) {
            this.highestPrice = this.price;
        }
        if (this.price < this.lowestPrice || this.lowestPrice === 0) {
            this.lowestPrice = this.price;
        }

        // Limit history size to prevent memory issues
        if (this.priceHistory.length > 1000) {
            this.priceHistory.shift();
        }
        
        // track price history, 
        this.priceHistory.push(this.price);
    }

    // Apply sentiment change from news
    applySentimentChange(change) {
        this.sentimentFactor = Math.max(-1, Math.min(1, this.sentimentFactor + change));
        return this.sentimentFactor;
    }

    //getters:

    // Calculate current day's change
    getDayChange() {
        return {
            value: this.price - this.openPrice,
            percent: ((this.price / this.openPrice) - 1) * 100
        };
    }

    // Get formatted price
    getFormattedPrice() {
        return `$${this.price.toFixed(2)}`;
    }

    // Get stock information as an object
    getInfo() {
        return {
            symbol: this.symbol,
            name: this.name,
            price: this.price,
            openPrice: this.openPrice,
            highestPrice: this.highestPrice,
            lowestPrice: this.lowestPrice,
            previousClose: this.previousClosePrice,
            dayChange: this.getDayChange(),
            volume: this.volume,
            sector: this.sector
        };
    }

    // Get string representation for debugging
    toString() {
        return `Stock: ${this.name} (${this.symbol}) | Price: $${this.price.toFixed(2)} | Change: ${this.getDayChange().percent.toFixed(2)}% | Sector: ${this.sector}`;
    }
}
*/