import { databaseService } from './databaseService.js';
import { getCurrentUser } from './authService.js';

/**
 * Service for managing stocks and market data
 */
export default class StockService {
    constructor() {
        this.dbService = databaseService;
        this.stocks = [];
        this.stockCache = new Map(); // Cache for detailed stock data
        this.lastUpdateTime = 0;
    }

    /**
     * Load all available stocks for the current user
     * @returns {Promise<Array>} List of stocks
     */
    async loadStocks() {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Check if we need to update (every 60 seconds)
            const now = Date.now();
            if (this.stocks.length > 0 && now - this.lastUpdateTime < 60000) {
                return this.stocks;
            }

            const stocks = await this.dbService.getStocks(user.username);
            this.stocks = stocks;
            this.lastUpdateTime = now;

            return stocks;
        } catch (error) {
            console.error('Failed to load stocks:', error);
            throw error;
        }
    }

    /**
     * Get detailed information for a specific stock
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Stock data
     */
    async getStock(symbol) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Check cache first (expires after 60 seconds)
            const now = Date.now();
            if (this.stockCache.has(symbol)) {
                const cacheEntry = this.stockCache.get(symbol);
                if (now - cacheEntry.timestamp < 60000) {
                    return cacheEntry.data;
                }
            }

            // Fetch from server
            const stock = await this.dbService.getStock(user.username, symbol);

            // Update cache
            this.stockCache.set(symbol, {
                data: stock,
                timestamp: now
            });

            return stock;
        } catch (error) {
            console.error(`Failed to get stock ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Add a custom stock
     * @param {object} stockData - Stock data (symbol, companyName, sector, initialPrice, volatility)
     * @returns {Promise<Object>} Created stock
     */
    async addCustomStock(stockData) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Validate required fields
            const requiredFields = ['symbol', 'companyName', 'initialPrice'];
            for (const field of requiredFields) {
                if (!stockData[field]) {
                    throw new Error(`${field} is required`);
                }
            }

            // Validate symbol format (1-5 uppercase letters)
            if (!/^[A-Z]{1,5}$/.test(stockData.symbol)) {
                throw new Error('Symbol must be 1-5 uppercase letters');
            }

            // Validate price
            if (typeof stockData.initialPrice !== 'number' || stockData.initialPrice <= 0) {
                throw new Error('Initial price must be a positive number');
            }

            // Create the stock
            const newStock = await this.dbService.addCustomStock(user.username, stockData);

            // Add to local stocks list
            this.stocks.push(newStock);

            // Update cache
            this.stockCache.set(newStock.symbol, {
                data: newStock,
                timestamp: Date.now()
            });

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
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const result = await this.dbService.deleteCustomStock(user.username, symbol);

            // Remove from local stocks list
            this.stocks = this.stocks.filter(s => s.symbol !== symbol);

            // Remove from cache
            this.stockCache.delete(symbol);

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
            // Load all stocks if not already loaded
            if (this.stocks.length === 0) {
                await this.loadStocks();
            }

            // Filter by sector
            return this.stocks.filter(stock => stock.sector === sector);
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
            // Load all stocks if not already loaded
            if (this.stocks.length === 0) {
                await this.loadStocks();
            }

            // Normalize query
            const normalizedQuery = query.trim().toUpperCase();

            // Filter by symbol or company name
            return this.stocks.filter(stock =>
                stock.symbol.includes(normalizedQuery) ||
                stock.companyName.toUpperCase().includes(normalizedQuery)
            );
        } catch (error) {
            console.error(`Failed to search stocks for "${query}":`, error);
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
            // Get detailed stock data which includes price history
            const stock = await this.getStock(symbol);

            // Return the appropriate number of days
            if (stock.priceHistory && Array.isArray(stock.priceHistory)) {
                return stock.priceHistory.slice(-days);
            }

            return [];
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
            const stock = await this.getStock(symbol);

            if (!stock || !Array.isArray(stock.priceHistory) || stock.priceHistory.length < 2) {
                throw new Error('Insufficient price data');
            }

            // Get current price and history
            const currentPrice = stock.marketPrice;
            const history = stock.priceHistory;

            // Calculate daily change
            const previousClose = stock.previousClosePrice || history[history.length - 2];
            const dailyChange = currentPrice - previousClose;
            const dailyChangePercent = (dailyChange / previousClose) * 100;

            // Calculate weekly change (5 trading days)
            let weeklyChange = 0;
            let weeklyChangePercent = 0;

            if (history.length >= 5) {
                const weekAgoPrice = history[history.length - 5];
                weeklyChange = currentPrice - weekAgoPrice;
                weeklyChangePercent = (weeklyChange / weekAgoPrice) * 100;
            }

            // Calculate monthly change (20 trading days)
            let monthlyChange = 0;
            let monthlyChangePercent = 0;

            if (history.length >= 20) {
                const monthAgoPrice = history[history.length - 20];
                monthlyChange = currentPrice - monthAgoPrice;
                monthlyChangePercent = (monthlyChange / monthAgoPrice) * 100;
            }

            // Calculate highs and lows
            const high52Week = stock.fiftyTwoWeekHigh || Math.max(...history);
            const low52Week = stock.fiftyTwoWeekLow || Math.min(...history);

            return {
                symbol: stock.symbol,
                companyName: stock.companyName,
                currentPrice,
                previousClose,
                dailyChange,
                dailyChangePercent,
                weeklyChange,
                weeklyChangePercent,
                monthlyChange,
                monthlyChangePercent,
                high52Week,
                low52Week,
                volatility: stock.volatility || 0
            };
        } catch (error) {
            console.error(`Failed to calculate performance metrics for ${symbol}:`, error);
            throw error;
        }
    }
}

// Create singleton instance
const stockService = new StockService();
export { stockService };