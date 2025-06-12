import { databaseService } from './databaseService.js';
import { getCurrentUser, getCurrentUserId, isDemoAccount } from './authService.js';

/**
 * Service for managing stocks and market data
 */
export default class StockService {
    constructor() {
        this.dbService = databaseService;
        this.stocks = [];
        this.stockCache = new Map(); // Cache for detailed stock data
        this.lastUpdateTime = 0;
        this.cacheExpiryTime = 60000; // 1 minute cache
    }

    /**
     * Load all available stocks for the current user
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Array>} List of stocks
     */
    async loadStocks(forceRefresh = false) {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            // Check if we need to update
            const now = Date.now();
            if (!forceRefresh && this.stocks.length > 0 && now - this.lastUpdateTime < this.cacheExpiryTime) {
                return this.stocks;
            }

            // FIXED: Use user ID instead of username
            const stocks = await this.dbService.getStocks(userId);
            this.stocks = stocks || [];
            this.lastUpdateTime = now;

            return this.stocks;
        } catch (error) {
            console.error('Failed to load stocks:', error);
            throw error;
        }
    }

    /**
     * Get detailed information for a specific stock
     * @param {string} symbol - Stock symbol
     * @param {boolean} useCache - Whether to use cached data
     * @returns {Promise<Object>} Stock data
     */
    async getStock(symbol, useCache = true) {
        try {
            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Valid stock symbol is required');
            }

            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            const symbolUpper = symbol.trim().toUpperCase();

            // Check cache first
            if (useCache && this.stockCache.has(symbolUpper)) {
                const cacheEntry = this.stockCache.get(symbolUpper);
                const now = Date.now();
                if (now - cacheEntry.timestamp < this.cacheExpiryTime) {
                    return cacheEntry.data;
                }
            }

            // FIXED: Use user ID instead of username, correct parameter order
            const stock = await this.dbService.getStock(symbolUpper, userId);

            // Update cache
            this.stockCache.set(symbolUpper, {
                data: stock,
                timestamp: Date.now()
            });

            return stock;
        } catch (error) {
            console.error(`Failed to get stock ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Add a custom stock
     * @param {object} stockData - Stock data (symbol, companyName, sector, initialPrice)
     * @returns {Promise<Object>} Created stock
     */
    async addCustomStock(stockData) {
        try {
            // Check if demo account
            if (isDemoAccount()) {
                throw new Error('Demo accounts cannot add custom stocks');
            }

            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            // Validate required fields
            const requiredFields = ['symbol', 'companyName', 'initialPrice'];
            for (const field of requiredFields) {
                if (!stockData[field]) {
                    throw new Error(`${field} is required`);
                }
            }

            // Validate and normalize symbol (1-6 uppercase letters to match schema)
            const symbol = stockData.symbol.trim().toUpperCase();
            if (!/^[A-Z]{1,6}$/.test(symbol)) {
                throw new Error('Symbol must be 1-6 uppercase letters');
            }

            // Validate price
            if (typeof stockData.initialPrice !== 'number' || stockData.initialPrice <= 0) {
                throw new Error('Initial price must be a positive number');
            }

            // Validate company name
            if (typeof stockData.companyName !== 'string' || stockData.companyName.trim().length === 0) {
                throw new Error('Company name is required');
            }

            // Prepare stock data
            const normalizedStockData = {
                symbol: symbol,
                companyName: stockData.companyName.trim(),
                sector: stockData.sector?.trim() || 'Custom',
                initialPrice: stockData.initialPrice
            };

            // FIXED: Use user ID instead of username, correct parameter order
            const newStock = await this.dbService.addCustomStock(normalizedStockData, userId);

            // Add to local stocks list
            this.stocks.push(newStock);

            // Update cache
            this.stockCache.set(symbol, {
                data: newStock,
                timestamp: Date.now()
            });

            // Clear stocks cache to force refresh on next load
            this.lastUpdateTime = 0;

            return newStock;
        } catch (error) {
            console.error('Failed to add custom stock:', error);
            throw error;
        }
    }

    /**
     * Delete a custom stock
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Delete result
     */
    async deleteCustomStock(symbol) {
        try {
            // Check if demo account
            if (isDemoAccount()) {
                throw new Error('Demo accounts cannot delete custom stocks');
            }

            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Valid stock symbol is required');
            }

            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('Not authenticated');
            }

            const symbolUpper = symbol.trim().toUpperCase();

            // FIXED: Use user ID instead of username, correct parameter order
            const result = await this.dbService.deleteCustomStock(symbolUpper, userId);

            // Remove from local stocks list
            this.stocks = this.stocks.filter(s => s.symbol !== symbolUpper);

            // Remove from cache
            this.stockCache.delete(symbolUpper);

            // Clear stocks cache to force refresh on next load
            this.lastUpdateTime = 0;

            return result;
        } catch (error) {
            console.error(`Failed to delete custom stock ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get stocks by sector
     * @param {string} sector - Sector name
     * @returns {Promise<Array>} Filtered stocks
     */
    async getStocksBySector(sector) {
        try {
            if (!sector || typeof sector !== 'string') {
                throw new Error('Valid sector name is required');
            }

            // Load all stocks if not already loaded
            if (this.stocks.length === 0) {
                await this.loadStocks();
            }

            // Filter by sector (case-insensitive)
            const normalizedSector = sector.trim().toLowerCase();
            return this.stocks.filter(stock =>
                stock.sector && stock.sector.toLowerCase() === normalizedSector
            );
        } catch (error) {
            console.error(`Failed to get stocks for sector ${sector}:`, error);
            throw error;
        }
    }

    /**
     * Search stocks by symbol or company name
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching stocks
     */
    async searchStocks(query) {
        try {
            if (!query || typeof query !== 'string') {
                return [];
            }

            // Load all stocks if not already loaded
            if (this.stocks.length === 0) {
                await this.loadStocks();
            }

            // Normalize query
            const normalizedQuery = query.trim().toLowerCase();

            if (normalizedQuery.length === 0) {
                return [];
            }

            // Filter by symbol or company name (case-insensitive partial match)
            return this.stocks.filter(stock => {
                const symbolMatch = stock.symbol && stock.symbol.toLowerCase().includes(normalizedQuery);
                const nameMatch = stock.companyName && stock.companyName.toLowerCase().includes(normalizedQuery);
                return symbolMatch || nameMatch;
            });
        } catch (error) {
            console.error(`Failed to search stocks for "${query}":`, error);
            throw error;
        }
    }

    /**
     * Get all unique sectors
     * @returns {Promise<Array>} List of sectors
     */
    async getSectors() {
        try {
            // Load all stocks if not already loaded
            if (this.stocks.length === 0) {
                await this.loadStocks();
            }

            // Get unique sectors
            const sectors = [...new Set(this.stocks
                .map(stock => stock.sector)
                .filter(sector => sector && sector.trim().length > 0)
            )];

            return sectors.sort();
        } catch (error) {
            console.error('Failed to get sectors:', error);
            throw error;
        }
    }

    /**
     * Get price history for a stock
     * @param {string} symbol - Stock symbol
     * @param {number} days - Number of days of history to fetch
     * @returns {Promise<Array>} Price history
     */
    async getPriceHistory(symbol, days = 30) {
        try {
            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Valid stock symbol is required');
            }

            if (!Number.isInteger(days) || days <= 0) {
                throw new Error('Days must be a positive integer');
            }

            // Get detailed stock data which includes price history
            const stock = await this.getStock(symbol);

            // Return the appropriate number of days
            if (stock.priceHistory && Array.isArray(stock.priceHistory)) {
                return stock.priceHistory.slice(-days);
            }

            // If no price history, return array with current price
            return stock.value || stock.marketPrice ? [stock.value || stock.marketPrice] : [];
        } catch (error) {
            console.error(`Failed to get price history for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Calculate performance metrics for a stock
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Performance metrics
     */
    async calculatePerformanceMetrics(symbol) {
        try {
            if (!symbol || typeof symbol !== 'string') {
                throw new Error('Valid stock symbol is required');
            }

            const stock = await this.getStock(symbol);

            if (!stock) {
                throw new Error('Stock not found');
            }

            // Get current price
            const currentPrice = stock.value || stock.marketPrice || 0;

            if (currentPrice <= 0) {
                throw new Error('Invalid stock price data');
            }

            // Initialize metrics
            const metrics = {
                symbol: stock.symbol,
                companyName: stock.company_name || stock.companyName,
                sector: stock.sector,
                currentPrice,
                dailyChange: 0,
                dailyChangePercent: 0,
                weeklyChange: 0,
                weeklyChangePercent: 0,
                monthlyChange: 0,
                monthlyChangePercent: 0,
                high52Week: currentPrice,
                low52Week: currentPrice,
                volatility: stock.volatility || 0
            };

            // If we have price history, calculate metrics
            const history = stock.priceHistory;
            if (Array.isArray(history) && history.length > 1) {
                // Calculate daily change
                const previousClose = stock.previousClosePrice || history[history.length - 2];
                if (previousClose && previousClose > 0) {
                    metrics.dailyChange = currentPrice - previousClose;
                    metrics.dailyChangePercent = (metrics.dailyChange / previousClose) * 100;
                }

                // Calculate weekly change (5 trading days)
                if (history.length >= 5) {
                    const weekAgoPrice = history[history.length - 5];
                    if (weekAgoPrice && weekAgoPrice > 0) {
                        metrics.weeklyChange = currentPrice - weekAgoPrice;
                        metrics.weeklyChangePercent = (metrics.weeklyChange / weekAgoPrice) * 100;
                    }
                }

                // Calculate monthly change (20 trading days)
                if (history.length >= 20) {
                    const monthAgoPrice = history[history.length - 20];
                    if (monthAgoPrice && monthAgoPrice > 0) {
                        metrics.monthlyChange = currentPrice - monthAgoPrice;
                        metrics.monthlyChangePercent = (metrics.monthlyChange / monthAgoPrice) * 100;
                    }
                }

                // Calculate highs and lows
                const validPrices = history.filter(price => price && price > 0);
                if (validPrices.length > 0) {
                    metrics.high52Week = Math.max(...validPrices, currentPrice);
                    metrics.low52Week = Math.min(...validPrices, currentPrice);
                }
            }

            return metrics;
        } catch (error) {
            console.error(`Failed to calculate performance metrics for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get top performing stocks
     * @param {number} limit - Number of stocks to return
     * @returns {Promise<Array>} Top performing stocks
     */
    async getTopPerformers(limit = 10) {
        try {
            // Load all stocks if not already loaded
            if (this.stocks.length === 0) {
                await this.loadStocks();
            }

            const performances = [];

            // Calculate performance for each stock
            for (const stock of this.stocks) {
                try {
                    const metrics = await this.calculatePerformanceMetrics(stock.symbol);
                    performances.push(metrics);
                } catch (error) {
                    // Skip stocks with calculation errors
                    console.warn(`Skipping performance calculation for ${stock.symbol}:`, error.message);
                }
            }

            // Sort by daily change percent (descending)
            performances.sort((a, b) => b.dailyChangePercent - a.dailyChangePercent);

            return performances.slice(0, limit);
        } catch (error) {
            console.error('Failed to get top performers:', error);
            throw error;
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.stocks = [];
        this.stockCache.clear();
        this.lastUpdateTime = 0;
    }

    /**
     * Get cached stocks (without API call)
     * @returns {Array} Cached stocks
     */
    getCachedStocks() {
        return this.stocks;
    }

    /**
     * Check if stocks are loaded
     * @returns {boolean} Whether stocks are loaded
     */
    isLoaded() {
        return this.stocks.length > 0;
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            stocksCount: this.stocks.length,
            cacheSize: this.stockCache.size,
            lastUpdate: this.lastUpdateTime ? new Date(this.lastUpdateTime).toISOString() : null,
            cacheAge: this.lastUpdateTime ? Date.now() - this.lastUpdateTime : null
        };
    }
}

// Create singleton instance
const stockService = new StockService();
export { stockService };