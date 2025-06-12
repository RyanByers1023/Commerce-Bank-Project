import { stockService } from '../dbServices/stockService.js';
//import { marketDataService } from '../dbServices/marketDataService.js';

/**
 * Modern Stock model that integrates with service layer
 * Provides real-time price updates, market data, and event-driven architecture
 */
class Stock {
    constructor(stockData = null) {
        // Core stock properties
        this.symbol = stockData?.symbol || '';
        this.companyName = stockData?.companyName || stockData?.company_name || '';
        this.marketPrice = stockData?.marketPrice || stockData?.market_price || 0.00;
        this.previousClosePrice = stockData?.previousClosePrice || stockData?.previous_close || 0.00;
        this.openPrice = stockData?.openPrice || stockData?.open_price || 0.00;
        this.volume = stockData?.volume || 0;
        this.sector = stockData?.sector || '';

        // Market metrics
        this.volatility = stockData?.volatility || 0.015;
        this.currentSentiment = stockData?.currentSentiment || stockData?.sentiment || 0;
        this.marketCap = stockData?.marketCap || stockData?.market_cap || 0;
        this.peRatio = stockData?.peRatio || stockData?.pe_ratio || null;
        this.dividendYield = stockData?.dividendYield || stockData?.dividend_yield || 0;

        // Price data
        this.priceHistory = stockData?.priceHistory || [];
        this.dayHigh = stockData?.dayHigh || stockData?.day_high || 0;
        this.dayLow = stockData?.dayLow || stockData?.day_low || 0;
        this.fiftyTwoWeekHigh = stockData?.fiftyTwoWeekHigh || stockData?.week_52_high || 0;
        this.fiftyTwoWeekLow = stockData?.fiftyTwoWeekLow || stockData?.week_52_low || 0;

        // State management
        this.lastUpdated = stockData?.lastUpdated || null;
        this.isLoading = false;
        this.isSimulated = stockData?.isSimulated || false;
        this.updateInterval = null;

        // Caching
        this.newsCache = new Map();
        this.analysisCache = new Map();
        this.lastNewsUpdate = null;

        // Event listeners
        this.changeListeners = [];
        this.priceUpdateListeners = [];

        // Service references
        this.stockService = stockService;
        //this.marketDataService = marketDataService;

        // Auto-update configuration
        this.autoUpdateEnabled = false;
        this.updateFrequency = 30000; // 30 seconds default
    }

    /**
     * Load stock data from server
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Stock>} This stock instance
     */
    async load(forceRefresh = false) {
        if (!this.symbol) {
            throw new Error('Stock symbol is required to load data');
        }

        try {
            this.isLoading = true;
            this.notifyListeners('loadStarted');

            // Get stock data from service
            const stockData = await this.stockService.getStock(this.symbol, forceRefresh);

            if (stockData) {
                this.updateFromServerData(stockData);
                this.lastUpdated = Date.now();
                this.notifyListeners('loaded', stockData);
            }

            return this;
        } catch (error) {
            console.error(`Failed to load stock data for ${this.symbol}:`, error);
            this.notifyListeners('error', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Update local data from server response
     * @param {Object} stockData - Server stock data
     */
    updateFromServerData(stockData) {
        // Update all properties from server data
        const previousPrice = this.marketPrice;

        Object.keys(stockData).forEach(key => {
            if (stockData[key] !== undefined && stockData[key] !== null) {
                // Map server field names to local property names
                const mappedKey = this.mapServerFieldName(key);
                if (this.hasOwnProperty(mappedKey)) {
                    this[mappedKey] = stockData[key];
                }
            }
        });

        // Notify if price changed
        if (previousPrice !== this.marketPrice && previousPrice > 0) {
            this.notifyPriceListeners(previousPrice, this.marketPrice);
        }
    }

    /**
     * Map server field names to local property names
     * @param {string} serverField - Server field name
     * @returns {string} Local property name
     */
    mapServerFieldName(serverField) {
        const fieldMappings = {
            'company_name': 'companyName',
            'market_price': 'marketPrice',
            'previous_close': 'previousClosePrice',
            'open_price': 'openPrice',
            'market_cap': 'marketCap',
            'pe_ratio': 'peRatio',
            'dividend_yield': 'dividendYield',
            'day_high': 'dayHigh',
            'day_low': 'dayLow',
            'week_52_high': 'fiftyTwoWeekHigh',
            'week_52_low': 'fiftyTwoWeekLow'
        };

        return fieldMappings[serverField] || serverField;
    }

    /**
     * Start real-time price updates
     * @param {number} frequency - Update frequency in milliseconds
     * @returns {Stock} This stock instance
     */
    startAutoUpdate(frequency = null) {
        if (this.autoUpdateEnabled) {
            this.stopAutoUpdate();
        }

        this.updateFrequency = frequency || this.updateFrequency;
        this.autoUpdateEnabled = true;

        this.updateInterval = setInterval(async () => {
            try {
                await this.updatePrice();
            } catch (error) {
                console.error(`Auto-update failed for ${this.symbol}:`, error);
                this.notifyListeners('updateError', error);
            }
        }, this.updateFrequency);

        this.notifyListeners('autoUpdateStarted', { frequency: this.updateFrequency });
        return this;
    }

    /**
     * Stop real-time price updates
     * @returns {Stock} This stock instance
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.autoUpdateEnabled = false;
        this.notifyListeners('autoUpdateStopped');
        return this;
    }

    /**
     * Update stock price (either from server or simulation)
     * @param {boolean} useSimulation - Whether to use simulation for price update
     * @returns {Promise<number>} New market price
     */
    async updatePrice(useSimulation = null) {
        const previousPrice = this.marketPrice;

        try {
            if (useSimulation === true || (useSimulation === null && this.isSimulated)) {
                this.simulatePriceUpdate();
            } else {
                // Get real-time price from service
                const priceData = await this.stockService.getCurrentPrice(this.symbol);
                if (priceData) {
                    this.marketPrice = priceData.price || priceData.marketPrice;
                    this.volume = priceData.volume || this.volume;
                    this.dayHigh = Math.max(this.dayHigh, this.marketPrice);
                    this.dayLow = this.dayLow > 0 ? Math.min(this.dayLow, this.marketPrice) : this.marketPrice;
                }
            }

            // Update price history
            this.addToPriceHistory(this.marketPrice);
            this.lastUpdated = Date.now();

            // Notify listeners of price change
            if (previousPrice !== this.marketPrice) {
                this.notifyPriceListeners(previousPrice, this.marketPrice);
                this.notifyListeners('priceUpdated', {
                    previousPrice,
                    newPrice: this.marketPrice,
                    change: this.marketPrice - previousPrice,
                    changePercent: previousPrice > 0 ? ((this.marketPrice / previousPrice) - 1) * 100 : 0
                });
            }

            return this.marketPrice;
        } catch (error) {
            console.error(`Failed to update price for ${this.symbol}:`, error);
            this.notifyListeners('priceUpdateError', error);
            throw error;
        }
    }

    /**
     * Simulate price update using volatility and sentiment
     * @returns {number} New market price
     */
    simulatePriceUpdate() {
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

        // Update day high/low
        this.dayHigh = Math.max(this.dayHigh, this.marketPrice);
        this.dayLow = this.dayLow > 0 ? Math.min(this.dayLow, this.marketPrice) : this.marketPrice;

        return this.marketPrice;
    }

    /**
     * Add price to history with management
     * @param {number} price - Price to add
     * @param {number} maxHistory - Maximum history length
     */
    addToPriceHistory(price, maxHistory = 100) {
        this.priceHistory.push({
            price,
            timestamp: Date.now(),
            date: new Date()
        });

        // Keep history within limit
        if (this.priceHistory.length > maxHistory) {
            this.priceHistory.shift();
        }
    }

    /**
     * Generate simulated price history
     * @param {number} days - Number of days to simulate
     * @param {number} startPrice - Starting price (optional)
     * @returns {Array} Generated price history
     */
    setSimulatedPriceHistory(days = 30, startPrice = null) {
        // Use provided start price or current market price
        const initialPrice = startPrice || this.marketPrice || 100;

        // Reset price history
        this.priceHistory = [];

        // Create a trend bias (slight upward or downward trend)
        const trendBias = (Math.random() * 0.006) - 0.003; // Between -0.3% and +0.3% daily bias
        const volatility = this.volatility || 0.015;

        // Simulate each previous day
        let price = initialPrice;
        const now = Date.now();

        for (let i = days; i >= 0; i--) {
            const timestamp = now - (i * 24 * 60 * 60 * 1000); // Go back i days

            this.priceHistory.push({
                price: price,
                timestamp: timestamp,
                date: new Date(timestamp)
            });

            // Calculate next day's price (going forward in time)
            if (i > 0) {
                const change = trendBias + (volatility * (Math.random() * 2 - 1));
                price = price * (1 + change);
                price = Math.max(price, 0.01); // Keep prices reasonable
            }
        }

        // Set current price to the last generated price
        this.marketPrice = price;
        this.isSimulated = true;

        this.notifyListeners('historyGenerated', { days, startPrice: initialPrice, endPrice: price });

        return this.priceHistory;
    }

    /**
     * Get current day's price change
     * @returns {Object} Day change data
     */
    getDayChange() {
        const prevClose = this.previousClosePrice || (this.marketPrice * 0.99); // Fallback

        return {
            value: this.marketPrice - prevClose,
            percent: prevClose > 0 ? ((this.marketPrice / prevClose) - 1) * 100 : 0,
            isPositive: this.marketPrice >= prevClose,
            formatted: {
                value: this.formatCurrency(this.marketPrice - prevClose),
                percent: `${(prevClose > 0 ? ((this.marketPrice / prevClose) - 1) * 100 : 0).toFixed(2)}%`
            }
        };
    }

    /**
     * Get price performance over different periods
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const dayChange = this.getDayChange();

        return {
            current: this.marketPrice,
            dayChange: dayChange,
            dayHigh: this.dayHigh,
            dayLow: this.dayLow,
            fiftyTwoWeekHigh: this.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: this.fiftyTwoWeekLow,
            volume: this.volume,
            marketCap: this.marketCap,
            peRatio: this.peRatio,
            dividendYield: this.dividendYield,
            volatility: this.volatility
        };
    }

    /**
     * Get technical indicators
     * @param {number} period - Period for calculations
     * @returns {Object} Technical indicators
     */
    getTechnicalIndicators(period = 20) {
        if (this.priceHistory.length < period) {
            return null;
        }

        const recentPrices = this.priceHistory
            .slice(-period)
            .map(entry => typeof entry === 'number' ? entry : entry.price);

        // Simple Moving Average
        const sma = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;

        // Calculate volatility (standard deviation)
        const avgPrice = sma;
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / recentPrices.length;
        const stdDev = Math.sqrt(variance);

        // Bollinger Bands
        const upperBand = sma + (2 * stdDev);
        const lowerBand = sma - (2 * stdDev);

        // RSI calculation (simplified)
        let gains = 0, losses = 0;
        for (let i = 1; i < recentPrices.length; i++) {
            const change = recentPrices[i] - recentPrices[i - 1];
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }

        const avgGain = gains / (period - 1);
        const avgLoss = losses / (period - 1);
        const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
        const rsi = 100 - (100 / (1 + rs));

        return {
            sma: sma,
            bollinger: {
                upper: upperBand,
                middle: sma,
                lower: lowerBand
            },
            rsi: rsi,
            volatility: stdDev,
            period: period
        };
    }

    /**
     * Get stock news from cache or service
     * @param {boolean} forceRefresh - Force refresh from service
     * @returns {Promise<Array>} News articles
     */
    async getNews(forceRefresh = false) {
        const cacheKey = 'news';
        const cacheExpiry = 10 * 60 * 1000; // 10 minutes

        // Check cache first
        if (!forceRefresh && this.newsCache.has(cacheKey)) {
            const cached = this.newsCache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const news = await this.stockService.getStockNews(this.symbol);

            // Cache the results
            this.newsCache.set(cacheKey, {
                data: news,
                timestamp: Date.now()
            });

            this.lastNewsUpdate = Date.now();
            return news;
        } catch (error) {
            console.error(`Failed to get news for ${this.symbol}:`, error);
            // Return cached data if available, even if expired
            const cached = this.newsCache.get(cacheKey);
            return cached ? cached.data : [];
        }
    }

    /**
     * Get analyst recommendations
     * @param {boolean} useCache - Whether to use cached data
     * @returns {Promise<Object>} Analyst data
     */
    async getAnalystRecommendations(useCache = true) {
        const cacheKey = 'analyst';
        const cacheExpiry = 60 * 60 * 1000; // 1 hour

        if (useCache && this.analysisCache.has(cacheKey)) {
            const cached = this.analysisCache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const analysis = await this.stockService.getAnalystRecommendations(this.symbol);

            this.analysisCache.set(cacheKey, {
                data: analysis,
                timestamp: Date.now()
            });

            return analysis;
        } catch (error) {
            console.error(`Failed to get analyst recommendations for ${this.symbol}:`, error);
            const cached = this.analysisCache.get(cacheKey);
            return cached ? cached.data : null;
        }
    }

    /**
     * Get comprehensive stock summary
     * @returns {Promise<Object>} Stock summary
     */
    async getStockSummary() {
        try {
            const [news, analyst, technical] = await Promise.allSettled([
                this.getNews(),
                this.getAnalystRecommendations(),
                Promise.resolve(this.getTechnicalIndicators())
            ]);

            return {
                // Basic info
                symbol: this.symbol,
                companyName: this.companyName,
                sector: this.sector,

                // Price data
                currentPrice: this.marketPrice,
                formattedPrice: this.getFormattedPrice(),
                performance: this.getPerformanceMetrics(),
                dayChange: this.getDayChange(),

                // Technical analysis
                technical: technical.status === 'fulfilled' ? technical.value : null,

                // External data
                news: news.status === 'fulfilled' ? news.value : [],
                analyst: analyst.status === 'fulfilled' ? analyst.value : null,

                // Meta info
                lastUpdated: this.lastUpdated,
                isSimulated: this.isSimulated,
                autoUpdateEnabled: this.autoUpdateEnabled
            };
        } catch (error) {
            console.error(`Failed to get stock summary for ${this.symbol}:`, error);
            throw error;
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Format price as currency
     * @param {number} price - Price to format
     * @returns {string} Formatted price
     */
    formatCurrency(price = null) {
        const priceToFormat = price !== null ? price : this.marketPrice;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(priceToFormat);
    }

    /**
     * Get formatted price (legacy method for compatibility)
     * @returns {string} Formatted price
     */
    getFormattedPrice() {
        return this.formatCurrency();
    }

    /**
     * Format large numbers (for market cap, volume, etc.)
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatLargeNumber(num) {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    }

    /**
     * Check if stock price is within a target range
     * @param {number} min - Minimum price
     * @param {number} max - Maximum price
     * @returns {boolean} Whether price is in range
     */
    isPriceInRange(min, max) {
        return this.marketPrice >= min && this.marketPrice <= max;
    }

    /**
     * Get price trend over recent history
     * @param {number} periods - Number of periods to analyze
     * @returns {string} Trend direction: 'up', 'down', or 'sideways'
     */
    getPriceTrend(periods = 5) {
        if (this.priceHistory.length < periods) return 'insufficient-data';

        const recentPrices = this.priceHistory
            .slice(-periods)
            .map(entry => typeof entry === 'number' ? entry : entry.price);

        let upMoves = 0, downMoves = 0;

        for (let i = 1; i < recentPrices.length; i++) {
            if (recentPrices[i] > recentPrices[i - 1]) upMoves++;
            else if (recentPrices[i] < recentPrices[i - 1]) downMoves++;
        }

        if (upMoves > downMoves * 1.5) return 'up';
        if (downMoves > upMoves * 1.5) return 'down';
        return 'sideways';
    }

    /**
     * Calculate price volatility over a period
     * @param {number} periods - Number of periods
     * @returns {number} Volatility as standard deviation
     */
    calculateVolatility(periods = 20) {
        if (this.priceHistory.length < periods) return this.volatility;

        const recentPrices = this.priceHistory
            .slice(-periods)
            .map(entry => typeof entry === 'number' ? entry : entry.price);

        const returns = [];
        for (let i = 1; i < recentPrices.length; i++) {
            returns.push((recentPrices[i] / recentPrices[i - 1]) - 1);
        }

        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

        return Math.sqrt(variance);
    }

    // ===== EVENT SYSTEM =====

    /**
     * Add general event listener
     * @param {Function} listener - Event listener function
     * @returns {Function} Unsubscribe function
     */
    addChangeListener(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.changeListeners.push(listener);

        return () => {
            this.changeListeners = this.changeListeners.filter(l => l !== listener);
        };
    }

    /**
     * Add price-specific event listener
     * @param {Function} listener - Price listener function
     * @returns {Function} Unsubscribe function
     */
    addPriceListener(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.priceUpdateListeners.push(listener);

        return () => {
            this.priceUpdateListeners = this.priceUpdateListeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all general listeners
     * @param {string} event - Event type
     * @param {*} data - Event data
     */
    notifyListeners(event, data = null) {
        this.changeListeners.forEach(listener => {
            try {
                listener(event, data, this);
            } catch (error) {
                console.error('Error in stock change listener:', error);
            }
        });
    }

    /**
     * Notify price listeners
     * @param {number} previousPrice - Previous price
     * @param {number} newPrice - New price
     */
    notifyPriceListeners(previousPrice, newPrice) {
        const changeData = {
            previousPrice,
            newPrice,
            change: newPrice - previousPrice,
            changePercent: previousPrice > 0 ? ((newPrice / previousPrice) - 1) * 100 : 0,
            timestamp: Date.now()
        };

        this.priceUpdateListeners.forEach(listener => {
            try {
                listener(changeData, this);
            } catch (error) {
                console.error('Error in price listener:', error);
            }
        });
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.newsCache.clear();
        this.analysisCache.clear();
        this.lastNewsUpdate = null;
        this.lastUpdated = null;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAutoUpdate();
        this.changeListeners = [];
        this.priceUpdateListeners = [];
        this.clearCache();
    }

    /**
     * Convert stock to JSON representation
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            symbol: this.symbol,
            companyName: this.companyName,
            marketPrice: this.marketPrice,
            previousClosePrice: this.previousClosePrice,
            openPrice: this.openPrice,
            volume: this.volume,
            sector: this.sector,
            volatility: this.volatility,
            currentSentiment: this.currentSentiment,
            marketCap: this.marketCap,
            peRatio: this.peRatio,
            dividendYield: this.dividendYield,
            priceHistory: this.priceHistory,
            dayHigh: this.dayHigh,
            dayLow: this.dayLow,
            fiftyTwoWeekHigh: this.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: this.fiftyTwoWeekLow,
            lastUpdated: this.lastUpdated,
            isSimulated: this.isSimulated
        };
    }

    /**
     * Create Stock instance from JSON data
     * @param {Object} data - JSON data
     * @returns {Stock} Stock instance
     */
    static fromJSON(data) {
        return new Stock(data);
    }

    /**
     * Validate stock symbol format
     * @param {string} symbol - Symbol to validate
     * @returns {boolean} Whether symbol is valid
     */
    static isValidSymbol(symbol) {
        return typeof symbol === 'string' &&
            symbol.length >= 1 &&
            symbol.length <= 5 &&
            /^[A-Z]+$/.test(symbol);
    }

    /**
     * Create a simulated stock for testing
     * @param {string} symbol - Stock symbol
     * @param {Object} options - Simulation options
     * @returns {Stock} Simulated stock instance
     */
    static createSimulated(symbol, options = {}) {
        const stock = new Stock({
            symbol: symbol.toUpperCase(),
            companyName: options.companyName || `${symbol} Company`,
            marketPrice: options.startPrice || 100,
            sector: options.sector || 'Technology',
            volatility: options.volatility || 0.02,
            isSimulated: true
        });

        // Generate price history
        stock.setSimulatedPriceHistory(options.historyDays || 30, options.startPrice);

        return stock;
    }
}

export default Stock;