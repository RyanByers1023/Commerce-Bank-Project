import Stock from 'src/client/js/Stock';

export default class StockDataService {
    constructor() {
        // Default options
        this.url = 'https://yahoo-finance15.p.rapidapi.com/api/v1/markets/quote?ticker=AAPL&type=STOCKS';
        this.options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': '43c4bdb7a0mshac6db6fb0a5241ep1a044bjsn071e9eadf8a3',
                'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com'
            }
        }

        // Stock data cache
        this.stockCache = new Map();

        // Sample stock definitions for demo mode
        this.sampleStockData = [
            { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 187.30 },
            { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', price: 340.17 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', price: 134.99 },
            { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Services', price: 165.82 },
            { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Technology', price: 431.15 },
            { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotive', price: 178.18 },
            { symbol: 'NFLX', name: 'Netflix, Inc.', sector: 'Entertainment', price: 588.70 },
            { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', price: 877.22 },
            { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', price: 186.89 },
            { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Entertainment', price: 111.67 }
        ];
    }

    /**
     * Configure the service
     * @param {Object} options - Configuration options
     */
    configure(options) {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get stock data for a specific symbol
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} - Stock object
     */
    async getStock(symbol) {
        // Check cache first
        if (this.stockCache.has(symbol)) {
            const cachedStock = this.stockCache.get(symbol);
            const now = Date.now();

            // Return cached data if not expired
            if ((now - cachedStock.timestamp) / 1000 < this.options.cacheExpiration) {
                return cachedStock.data;
            }
        }

        // Create new stock
        let stock;

        if (this.options.useRealApi) {
            // Use real API with keys
            stock = new Stock(symbol, this.options.apiKey, this.options.apiHost);
            await this._initializeRealStock(stock);
        } else {
            // Use demo data
            stock = this._createDemoStock(symbol);
        }

        // Cache the stock
        this.stockCache.set(symbol, {
            data: stock,
            timestamp: Date.now()
        });

        return stock;
    }

    /**
     * Get multiple stocks at once
     * @param {Array<string>} symbols - Array of stock symbols
     * @returns {Promise<Array<Object>>} - Array of stock objects
     */
    async getStocks(symbols) {
        return Promise.all(symbols.map(symbol => this.getStock(symbol)));
    }

    /**
     * Get a list of sample stocks for demo
     * @returns {Promise<Array<Object>>} - Array of stock objects
     */
    async getSampleStocks() {
        return Promise.all(this.sampleStockData.map(data => {
            return this._createDemoStock(data.symbol, data);
        }));
    }

    /**
     * Initialize a stock with real API data
     * @param {Object} stock - Stock object
     * @returns {Promise<Object>} - Initialized stock
     * @private
     */
    async _initializeRealStock(stock) {
        try {
            // This would call a real API in a production environment
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
            return stock;
        } catch (error) {
            console.error(`API error for ${stock.symbol}:`, error);

            // Fallback to demo data if API fails
            const demoStock = this._createDemoStock(stock.symbol);
            Object.assign(stock, demoStock);

            return stock;
        }
    }

    /**
     * Create a demo stock with simulated data
     * @param {string} symbol - Stock symbol
     * @param {Object} [presetData] - Optional preset data
     * @returns {Object} - Stock object with simulated data
     * @private
     */
    _createDemoStock(symbol, presetData = null) {
        // Find preset data for this symbol or use default values
        const preset = presetData || this.sampleStockData.find(s => s.symbol === symbol) || {
            symbol: symbol,
            name: `${symbol} Corporation`,
            sector: this._getRandomSector(),
            price: 50 + Math.random() * 450
        };

        // Create a new stock object
        const stock = {
            symbol: preset.symbol,
            companyName: preset.name,
            sector: preset.sector,
            marketPrice: preset.price,
            previousClosePrice: preset.price * (0.98 + Math.random() * 0.04), // ±2%
            openPrice: preset.price * (0.99 + Math.random() * 0.02), // ±1%
            highestPrice: preset.price * 1.02,
            lowestPrice: preset.price * 0.98,
            volume: Math.floor(100000 + Math.random() * 9900000),
            currentSentiment: (Math.random() * 2 - 1) * 0.5, // -0.5 to 0.5
            volatility: 0.01 + Math.random() * 0.03, // 1-4% volatility

            // Generate price history
            priceHistory: this._generatePriceHistory(preset.price, 50),

            // Update price method
            updatePrice: function() {
                // Calculate price change
                const volatilityFactor = this.volatility || 0.015;
                const sentimentFactor = this.currentSentiment || 0;

                // Combine random movement, volatility, and sentiment
                const randomChange = (Math.random() * 2 - 1) * volatilityFactor;
                const sentimentChange = sentimentFactor * 0.005; // Sentiment has smaller effect

                // Calculate percentage change
                const percentChange = randomChange + sentimentChange;
                const priceChange = this.marketPrice * percentChange;

                // Update price
                this.marketPrice += priceChange;

                // Ensure price doesn't go negative
                this.marketPrice = Math.max(this.marketPrice, 0.01);

                // Decay sentiment slightly each update
                this.currentSentiment *= 0.95;

                // Update price history
                this.priceHistory.push(this.marketPrice);
                if (this.priceHistory.length > 100) {
                    this.priceHistory.shift();
                }

                // Update high/low
                this.highestPrice = Math.max(this.highestPrice, this.marketPrice);
                this.lowestPrice = Math.min(this.lowestPrice, this.marketPrice);
            },

            // Get day change
            getDayChange: function() {
                return {
                    value: this.marketPrice - this.openPrice,
                    percent: ((this.marketPrice / this.openPrice) - 1) * 100
                };
            },

            // Get formatted price
            getFormattedPrice: function() {
                return `$${this.marketPrice.toFixed(2)}`;
            }
        };

        return stock;
    }

    /**
     * Generate simulated price history
     * @param {number} currentPrice - Current stock price
     * @param {number} days - Number of days of history to generate
     * @returns {Array<number>} - Array of historical prices
     * @private
     */
    _generatePriceHistory(currentPrice, days = 50) {
        const history = [];
        let price = currentPrice;

        // Work backwards to create price history
        for (let i = 0; i < days; i++) {
            // Add small random change
            const change = price * (Math.random() * 0.04 - 0.02); // ±2%
            price = price - change; // Go backwards in time

            // Ensure price doesn't go negative
            price = Math.max(price, 0.01);

            // Add to beginning of array (oldest first)
            history.unshift(price);
        }

        // Add current price at the end
        history.push(currentPrice);

        return history;
    }

    /**
     * Get a random sector for a stock
     * @returns {string} - Sector name
     * @private
     */
    _getRandomSector() {
        const sectors = [
            "Technology", "Healthcare", "Financial Services",
            "Consumer Goods", "Energy", "Telecommunications",
            "Real Estate", "Utilities", "Materials", "Industrials"
        ];
        return sectors[Math.floor(Math.random() * sectors.length)];
    }

    /**
     * Get market news data (mock implementation)
     * @returns {Array<Object>} - Array of news items
     */
    getMarketNews() {
        // Sample news items
        const newsItems = [
            { headline: "Markets Rally on Economic News", type: "positive", impact: 0.02 },
            { headline: "Fed Signals Interest Rate Changes", type: "neutral", impact: 0.00 },
            { headline: "Tech Sector Boosted by New Regulations", type: "positive", impact: 0.03 },
            { headline: "Energy Stocks Fall on Supply Concerns", type: "negative", impact: -0.02 },
            { headline: "Consumer Confidence Index Rises", type: "positive", impact: 0.01 },
            { headline: "Healthcare Stocks React to Policy Changes", type: "neutral", impact: 0.00 }
        ];

        // Return a random subset of news
        return newsItems.sort(() => 0.5 - Math.random()).slice(0, 3).map(item => {
            return {
                ...item,
                timestamp: new Date()
            };
        });
    }
}