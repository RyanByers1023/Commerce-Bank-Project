// src/client/js/Stock.js

/**
 * Represents a stock in the simulation
 */
class Stock {
    constructor(stockData) {
        // Initialize with data if provided, otherwise with defaults
        if (stockData) {
            Object.assign(this, stockData);
        } else {
            this.symbol = '';
            this.companyName = '';
            this.marketPrice = 0.00;
            this.priceHistory = [];
            this.sector = '';
            this.volatility = 0.015; // Default volatility
            this.currentSentiment = 0;
            this.previousClosePrice = 0.00;
            this.openPrice = 0.00;
            this.volume = 0;
        }
    }

    /**
     * Updates the stock price based on volatility and sentiment
     */
    updatePrice() {
        const volatilityFactor = this.volatility || 0.015;
        const sentimentFactor = this.currentSentiment || 0;

        // Random daily percentage change based on volatility
        const randomFactor = (Math.random() - 0.5) * 2 * volatilityFactor;
        const marketFactor = sentimentFactor * 0.01;

        // Calculate new price
        const combinedEffect = randomFactor + marketFactor;
        this.marketPrice *= (1 + combinedEffect);

        // Ensure price doesn't go negative
        this.marketPrice = Math.max(this.marketPrice, 0.01);

        // Update previous close periodically
        if (Math.random() < 0.1) { // 10% chance each update
            this.previousClosePrice = this.marketPrice * (1 - (Math.random() * 0.02 - 0.01)); // Within ±1%
        }

        // Add to price history
        this.priceHistory.push(this.marketPrice);
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }
    }

    /**
     * Generates price history for the stock
     * @param {number} days - Number of days to generate
     */
    setSimulatedPriceHistory(days = 30, startPrice = null) {
        // Use provided start price or current market price
        const initialPrice = startPrice || this.marketPrice || 100;

        // Reset price history
        this.priceHistory = [];

        // Create a trend bias (slight upward or downward trend)
        // This creates more realistic price movements than pure random walk
        const trendBias = (Math.random() * 0.006) - 0.003; // Between -0.3% and +0.3% daily bias

        // Get volatility
        const volatility = this.volatility || 0.015;

        // Simulate each previous day
        let price = initialPrice;

        for (let i = 0; i < days; i++) {
            // Add current price to history (at the beginning)
            this.priceHistory.unshift(price);

            // Random daily percentage change based on volatility
            // We're generating backward in time, so we divide instead of multiply
            const change = trendBias + (volatility * (Math.random() * 2 - 1));
            price = price / (1 + change);

            // Keep prices reasonable (no negative prices)
            price = Math.max(price, 0.01);
        }

        // Add current price to the end
        this.priceHistory.push(initialPrice);
    }

    /**
     * Get day change information
     * @returns {Object} Day change info
     */
    getDayChange() {
        const prevClose = this.previousClosePrice || (this.marketPrice * 0.99); // Fallback if no previous close

        return {
            value: this.marketPrice - prevClose,
            percent: ((this.marketPrice / prevClose) - 1) * 100
        };
    }

    /**
     * Get formatted price
     * @returns {string} Formatted price
     */
    getFormattedPrice() {
        return `$${this.marketPrice.toFixed(2)}`;
    }
}

// Export the class for use in modules
export default Stock;