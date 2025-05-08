export default class CustomStockManager {
  constructor(userProfile) {
    this.userProfile = userProfile;
    this.dbManager = new window.DatabaseManager();
  }

  // Add a custom stock to the simulation
  async addCustomStock(stockData) {
    try {
      // Validate stock data
      this.validateStockData(stockData);

      // Check if stock already exists
      const existingStock = this.userProfile.stocksAddedToSim.find(s => s.symbol === stockData.symbol);
      if (existingStock) {
        throw new Error(`Stock ${stockData.symbol} already exists in simulation`);
      }

      // Create a new stock object
      const newStock = {
        symbol: stockData.symbol.toUpperCase(),
        companyName: stockData.companyName,
        marketPrice: stockData.initialPrice,
        previousClosePrice: stockData.initialPrice * (1 - (Math.random() * 0.04 - 0.02)), // Random previous close
        openPrice: stockData.initialPrice * (1 - (Math.random() * 0.02 - 0.01)), // Random open price
        sector: stockData.sector || 'Custom',
        volume: Math.floor(10000 + Math.random() * 990000), // Random volume
        currentSentiment: 0,
        volatility: stockData.volatility || 0.015, // Default volatility if not provided
        priceHistory: [],
        isCustom: true, // Mark as custom stock
        createdAt: new Date().toISOString()
      };

      // Generate initial price history
      this.generatePriceHistory(newStock);

      // Save to database
      await this.dbManager.sendRequest(`stocks/${this.userProfile.username}`, 'POST', newStock);

      // Add to user's stocks
      this.userProfile.addStockToSim(newStock);

      return newStock;
    } catch (error) {
      console.error('Failed to add custom stock:', error);
      throw error;
    }
  }

  // Validate stock data
  validateStockData(stockData) {
    // Required fields
    if (!stockData.symbol || !stockData.companyName || !stockData.initialPrice) {
      throw new Error('Symbol, company name, and initial price are required');
    }

    // Symbol format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(stockData.symbol.toUpperCase())) {
      throw new Error('Symbol must be 1-5 uppercase letters');
    }

    // Price must be positive
    if (typeof stockData.initialPrice !== 'number' || stockData.initialPrice <= 0) {
      throw new Error('Initial price must be a positive number');
    }

    // Volatility must be positive if provided
    if (stockData.volatility !== undefined && (typeof stockData.volatility !== 'number' || stockData.volatility <= 0)) {
      throw new Error('Volatility must be a positive number');
    }

    return true;
  }

  // Generate price history for a new stock
  generatePriceHistory(stock, days = 30) {
    const initialPrice = stock.marketPrice;
    const volatility = stock.volatility || 0.015;

    // Create a slight trend bias
    const trendBias = (Math.random() * 0.006) - 0.003; // Between -0.3% and +0.3% daily bias

    // Generate price points going backward from current price
    stock.priceHistory = [];
    let price = initialPrice;

    for (let i = 0; i < days; i++) {
      // Add current price to history
      stock.priceHistory.unshift(price);

      // Calculate new price for previous day
      const change = trendBias + (volatility * (Math.random() + Math.random() + Math.random() - 1.5));
      price = price / (1 + change); // Going backward in time

      // Keep prices reasonable
      price = Math.max(price, 0.01);
    }

    // Add current price
    stock.priceHistory.push(initialPrice);
  }

  // Remove a custom stock
  async removeCustomStock(symbol) {
    try {
      // Find the stock
      const stockIndex = this.userProfile.stocksAddedToSim.findIndex(s => s.symbol === symbol);

      if (stockIndex === -1) {
        throw new Error(`Stock ${symbol} not found`);
      }

      const stock = this.userProfile.stocksAddedToSim[stockIndex];

      // Check if it's a custom stock
      if (!stock.isCustom) {
        throw new Error(`Stock ${symbol} is not a custom stock and cannot be removed`);
      }

      // Check if user owns any shares
      const holding = this.userProfile.portfolio.holdingsMap[symbol];
      if (holding && holding.quantity > 0) {
        throw new Error(`Cannot remove stock ${symbol} while you own shares`);
      }

      // Remove from database
      await this.dbManager.sendRequest(`stocks/${this.userProfile.username}/${symbol}`, 'DELETE');

      // Remove from local list
      this.userProfile.stocksAddedToSim.splice(stockIndex, 1);

      return true;
    } catch (error) {
      console.error('Failed to remove custom stock:', error);
      throw error;
    }
  }

  // Get all custom stocks
  getCustomStocks() {
    return this.userProfile.stocksAddedToSim.filter(stock => stock.isCustom);
  }
}