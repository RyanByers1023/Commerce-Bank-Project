class Stock {
    constructor(symbol, name, price, volume) {
        this.symbol = symbol; // AAPL, META, etc.
        this.name = name; // Apple Corporation, Meta Corporation, etc.
        this.price = price; // current price of the stock
        this.volume = volume; // how much of the stock is currently being traded in the market (for the day)

        // Additional attributes for tracking performance
        this.openPrice = price; // price of stock at market open time
        this.highestPrice = price; // greatest price stock achieved (over the course of the day)
        this.lowestPrice = price; // lowest price stock achieved (over the course of the day)
        this.previousClosePrice = price * (1 - (Math.random() * 0.04 - 0.02)); // simulated previous close
        this.priceHistory = [price]; // array that tracks the price of the stock over time

        // Additional attributes for market sentiment
        this.volatility = Math.random() * 0.05 + 0.01; // how much the stock price fluctuates
        this.sentimentFactor = 0; // influenced by news, ranges from -1 (very negative) to 1 (very positive)
        this.sector = this.assignSector(); // e.g., "Technology", "Healthcare", etc.
    }

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
        // Base random movement
        let randomFactor = (Math.random() - 0.5) * this.volatility;

        // Influence from market trend (overall market direction)
        let marketFactor = marketTrend * 0.2;

        // Influence from sentiment (news)
        let sentimentImpact = this.sentimentFactor * 0.3;

        // Calculate percentage change
        let percentChange = randomFactor + marketFactor + sentimentImpact;

        // Apply change to price
        let oldPrice = this.price;
        this.price = Math.max(0.01, this.price * (1 + percentChange));

        // Update tracking values
        if (this.price > this.highestPrice) {
            this.highestPrice = this.price;
        }
        if (this.price < this.lowestPrice || this.lowestPrice === 0) {
            this.lowestPrice = this.price;
        }

        // Add to price history
        this.priceHistory.push(this.price);

        // Limit history size to prevent memory issues
        if (this.priceHistory.length > 1000) {
            this.priceHistory.shift();
        }

        return {
            oldPrice: oldPrice,
            newPrice: this.price,
            percentChange: percentChange
        };
    }

    // Apply sentiment change from news
    applySentimentChange(change) {
        this.sentimentFactor = Math.max(-1, Math.min(1, this.sentimentFactor + change));
        return this.sentimentFactor;
    }

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