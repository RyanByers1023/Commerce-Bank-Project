import fetch from 'node-fetch';

class Stock {
    constructor(symbol) {
        // stock symbol: AAPL, DIS, MSFT, etc.
        this.symbol = symbol;

        //Healthcare, Technology, etc.
        this.sector = null;

        this.companyName = null;

        // this is the key you use to access the API to retrieve real stock prices
        this.apiKey = '43c4bdb7a0mshac6db6fb0a5241ep1a044bjsn071e9eadf8a3';

        // this is Yahoo Finance's API for retrieving stock prices
        this.apiHost = 'yh-finance.p.rapidapi.com';

        // the price the stock was at end of the last trading day
        this.previousClosePrice = null;

        // the current price of the stock
        this.marketPrice = null;

        // price stock is at the beginning of the trading day
        this.openPrice = null;

        //how many shares have been traded during the current market day
        this.volume = null;

        // influenced by news, ranges from -1 (very negative) to 1 (very positive)
        this.sentimentFactor = 0;
        this.sector = null;
        this.priceHistory = [null]; // array that tracks the price of the stock over time

        // set all the above stock values using real values via Yahoo Finance's API
        this.getIntialStockValues()
    }

    static async createStock(symbol) {
        const stock = new Stock(symbol);
        await stock.getIntialStockValues();
        return stock;
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
        try {
            const url = `https://${this.apiHost}/stock/v2/get-summary?symbol=${this.symbol}`;
            const options = {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': this.apiHost
                }
            };

            const response = await fetch(url, options);
            const data = await response.json();

            //use contents of data to assign real initial attributes for this stock.
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

        } catch (error) {
            console.error(`Error fetching ${this.symbol} data:`, error);
            this.simulatePreviousClose();
        }
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
    updatePrice() {
        // Calculate new price based on volatility and sentiment
        const change = this.marketPrice * this.volatility * (Math.random() * 2 - 1 + this.sentimentFactor);
        this.marketPrice += change;

        // Ensure price doesn't go negative
        this.marketPrice = Math.max(this.marketPrice, 0.01);

        // Add to price history
        this.priceHistory.push(this.marketPrice);

        // Keep price history limited to a reasonable size
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }

        return this.marketPrice;
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