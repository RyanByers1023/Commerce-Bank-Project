
export default class Stock {
    //TODO: this is a potential vulnerability apparently (Passing apikey/host via constructor)
    constructor(stockSymbol, apiKey, apiHost) {
        //symbol associated w/stock e.g: 'AAPL'
        this.symbol = stockSymbol;

        // the current price of the stock
        this.marketPrice = 0.00;

        this.priceChange = 0;

        this.highestPrice = this.marketPrice;
        this.lowestPrice  = this.marketPrice;

        //Healthcare, Technology, etc.
        this.sector = "";

        this.companyName = "";

        this.volatility = 0.0;

        // the price the stock was at end of the last trading day
        this.previousClosePrice = 0.00;

        // float, the price the stock is at the end of the current trading day
        this.closePrice = 0.00;

        // float, price stock is at the beginning of the trading day
        this.openPrice = 0.00;

        this.fiftyTwoWeekLow = 0.0;

        this.fiftyTwoWeekHigh = 0.0;

        //int, how many shares have been traded during the current market day
        this.volume = 0;

        // int, influenced by news, ranges from -1 (very negative) to 1 (very positive)
        this.sentimentFactor = 0;

        // array[float] that tracks the price of the stock over time, max:
        this.priceHistory = [];

        this.currentSentiment = 0;

        // Case: passed a stock symbol
        if (typeof stockSymbol === 'string' && stockSymbol.length < 6) {
            this.initializeStock(apiKey, apiHost)
        }
        //something unexpected was passed, discard input
        else {
            throw new Error('Invalid constructor argument for Stock');
        }
    }

    // get stock info from Yahoo Finance's API
    async initializeStock(apiKey, apiHost) {
        try {
            await this.setStockInfoViaAPI(apiKey, apiHost);
            this.updatePriceHistory();
        }
        catch (error) { //stock info could not be obtained from the provided API
            console.error(`API error for ${this.symbol}:`, error, `\n\nCreating randomized attributes for ${this.symbol}...`);

            //continue the simulation, but with fake initial prices
            this.simulateStockInitialization();
        }

        // Calculate volatility based on the updated price history
        this.setVolatility();
        this.setPriceChange();
    }

    async setStockInfoViaAPI(apiKey, apiHost) {
        const url = `https://${apiHost}/api/v1/markets/quote?ticker=${this.symbol}&type=STOCKS`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': apiHost
            }
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching quote for ${this.symbol}`);
        }

        const data = await response.json();
        // --- Defensive checks start here ---
        if (typeof data !== 'object' || data === null) {
            throw new Error(`Invalid JSON response for ${this.symbol}`);
        }
        if (!data.body || typeof data.body !== 'object') {
            throw new Error(`Missing .body in API response for ${this.symbol}`);
        }
        const pd = data.body.primaryData;
        if (!pd || typeof pd !== 'object') {
            throw new Error(`Missing .primaryData in response for ${this.symbol}`);
        }
        if (typeof pd.lastSalePrice !== 'string') {
            throw new Error(`Expected lastSalePrice string for ${this.symbol}, got ${typeof pd.lastSalePrice}`);
        }
        // --- Defensive checks end here ---

        // Clean helper
        const clean = val => parseFloat(val.replace(/[$,]/g, '')) || 0;

        // Safe to parse now
        this.companyName = data.body.companyName || 'Unknown Company';
        this.marketPrice = clean(pd.lastSalePrice);

        // Day range → openPrice
        const dr = data.body.keyStats?.dayrange?.value;
        if (typeof dr === 'string') {
            const m = dr.match(/(\d+\.\d+)\s*-\s*(\d+\.\d+)/);
            if (m) this.openPrice = parseFloat(m[1]);
        }
        this.openPrice ||= this.marketPrice;

        // 52-week range
        const yr = data.body.keyStats?.fiftyTwoWeekHighLow?.value;
        if (typeof yr === 'string') {
            const m = yr.match(/(\d+\.\d+)\s*-\s*(\d+\.\d+)/);
            if (m) {
                this.fiftyTwoWeekLow  = parseFloat(m[1]);
                this.fiftyTwoWeekHigh = parseFloat(m[2]);
            }
        }

        // Net change → previousClosePrice
        const nc = pd.netChange;
        if (typeof nc === 'string') {
            const delta = clean(nc);
            this.previousClosePrice = this.marketPrice - delta;
        }
        this.priceChange ||= this.marketPrice;

        // Volume
        const vol = pd.volume;
        if (typeof vol === 'string') {
            this.volume = clean(vol);
        }

        //TODO: figure out a soln here:
        this.sector   = 'Unknown'; // no sector in this API
        this.setRandomSector();

        console.log(`Fetched data for ${this.symbol}: $${this.marketPrice.toFixed(2)}`);
    }

    //uses this.priceHistory to calculate an average volatility value:
    setVolatility() {
        // We need sufficient price history to calculate volatility
        if (this.priceHistory.length < 2) {
            console.log("Insufficient price history to calculate volatility");
            return 0;
        }

        // Calculate daily returns (percentage change)
        const returns = [];
        for (let i = 1; i < this.priceHistory.length; i++) {
            let ret = (this.priceHistory[i] - this.priceHistory[i-1]) / this.priceHistory[i-1];
            returns.push(ret);
        }

        // Calculate standard deviation of returns
        const avgReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
        const squaredDiffs = returns.map(value => Math.pow(value - avgReturn, 2));
        const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / returns.length;

        // Volatility is the standard deviation of returns
        this.volatility = Math.sqrt(variance);

        // Annualize the volatility (standard practice: multiply by sqrt of trading days in year)
        // Assuming 252 trading days in a year
        this.volatility = this.volatility * Math.sqrt(252);
    }

    //initialize a stock with a pre-initialized stock:
    copyStock(stock) {
        this.symbol = stock.symbol;
        this.marketPrice = stock.marketPrice;
        this.sector = stock.sector;
        this.companyName = stock.companyName;
        this.previousClosePrice = stock.previousClosePrice;
        this.closePrice = stock.closePrice;
        this.openPrice = stock.openPrice;
        this.highestPrice = stock.highestPrice;
        this.volume = stock.volume;
        this.priceHistory = stock.priceHistory;
        this.currentSentiment = stock.currentSentiment;
    }

    //in the off chance the API goes down, key stops working, etc.,
    //this function will allow for the sim to work offline
    simulateStockInitialization() {
        // Generate reasonable default values for a stock
        this.companyName = `*Simulated* ${this.symbol}`;

        // Generate a base price between $10 and $500
        const basePrice = 10 + Math.random() * 490;
        this.marketPrice = parseFloat(basePrice.toFixed(2));

        // Generate price history using the new simulation method
        this.setSimulatedPriceHistory(30, this.marketPrice);

        // Use the new sector assignment method
        this.setRandomSector();


        // Previous close slightly different from current price
        const prevCloseDiff = (Math.random() * 0.06) - 0.03; // Between -3% and +3%
        this.previousClosePrice = parseFloat((this.marketPrice * (1 + prevCloseDiff)).toFixed(2));

        // Open price between previous close and current price
        const openWeight = Math.random(); // Weighting factor between 0 and 1
        this.openPrice = parseFloat((this.previousClosePrice + (this.marketPrice - this.previousClosePrice) * openWeight).toFixed(2));

        // Volume between 100,000 and 10,000,000
        this.volume = Math.floor(100000 + Math.random() * 9900000);

        // Sentiment between -0.8 and 0.8
        this.currentSentiment = parseFloat((Math.random() * 1.6 - 0.8).toFixed(2));

        //TODO: implement this:
        /*
        // Select volatility based on sector
        // Different sectors typically have different volatility levels
        const sectorVolatility = this.setSectorVolatility(this.sector);
         */

        this.updatePriceHistory();

        console.log(`Initialized simulated data for ${this.symbol} (${this.sector}: ${this.industry}) at $${this.marketPrice}`);
    }


    // Update the stock pribased on market conditions and sentiment
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

    setSimulatedPriceHistory(days = 30, startPrice = null, dailyVolatility = 0.015) {
        // Use provided start price or current market price
        let marketPrice = startPrice || this.marketPrice || 100;

        // If we still don't have a price, use a reasonable default
        if (!marketPrice || marketPrice <= 0) {
            console.warn(`Invalid initial price for ${this.symbol}, using default of 100`);
            marketPrice = 100;
        }

        // Create a trend bias (slight upward or downward trend)
        // This creates more realistic price movements than pure random walk
        const trendBias = (Math.random() * 0.006) - 0.003; // Between -0.3% and +0.3% daily bias

        // Simulate each previous day
        for (let i = 1; i < days; i++) {
            // Random daily percentage change based on volatility
            // Normally distributed around the trend bias
            const change = trendBias + (dailyVolatility * (Math.random() + Math.random() + Math.random() - 1.5));

            // Calculate new price (moving backward in time)
            // When simulating backward, we divide by (1+change) instead of multiply
            marketPrice = marketPrice / (1 + change);

            // Keep prices reasonable (no negative prices)
            marketPrice = Math.max(marketPrice, 0.01);

            // Add to the beginning of the array (oldest first)
            this.priceHistory.unshift(marketPrice);
            //unshift again to get the most recent item to the top of the list
            this.priceHistory.unshift(marketPrice);
        }

        // guarantee the *current* price is the last entry
        this.priceHistory.push(this.marketPrice);
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

    setPriceChange(marketTrend = 0){
        // Base random movement
        let randomFactor = (Math.random() - 0.5) * this.volatility;

        //float, dampens the impact marketTrend has on marketFactor
        let MARKET_FACTOR_DAMPENER = 0.15;

        // Influence from market trend (overall market direction)
        let marketFactor = marketTrend * MARKET_FACTOR_DAMPENER;

        // Calculate percentage change
        this.priceChange = randomFactor + marketFactor;
    }

    // Assign a random sector to the stock
    setRandomSector() {
        const sectors = [
            "Technology", "Healthcare", "Financial Services",
            "Consumer Goods", "Energy", "Telecommunications",
            "Real Estate", "Utilities", "Materials", "Industrials"
        ];
        this.sector = sectors[Math.floor(Math.random() * sectors.length)];
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