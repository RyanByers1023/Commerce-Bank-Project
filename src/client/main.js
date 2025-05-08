// src/client/main.js
import PortfolioUIController from './js/PortfolioUIController.js';
import SimulatorGraphController from './js/SimulatorGraphController.js';
import NewsGenerator from './js/NewsGenerator.js';
import AnimatedStockChart from './js/AnimatedStockChart.js';

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Initializing Stock Market Simulator...");

    try {
        // Check if this is the simulator page
        if (!document.getElementById('stockCanvas')) {
            console.log("Not on simulator page. Skipping simulator initialization.");
            return;
        }

        // Create demo user profile with stocks
        const userProfile = await initializeDemoUserProfile();

        // Decide which chart implementation to use based on URL params
        const useAnimatedChart = new URLSearchParams(window.location.search).get('animated') === 'true';

        // Initialize UI components
        const portfolioUI = new PortfolioUIController(userProfile);

        // Initialize news generator
        const newsGenerator = new NewsGenerator(userProfile);
        newsGenerator.start(10000); // Generate news every 10 seconds

        // Initialize either the animated or standard chart
        if (useAnimatedChart) {
            console.log("Initializing animated chart...");
            window.animatedChart = new AnimatedStockChart(userProfile); // Store reference for debugging
        } else {
            console.log("Initializing standard chart...");
            window.graphController = new SimulatorGraphController(userProfile); // Store reference for debugging
        }

        // Store user profile in window for debugging
        window.userProfile = userProfile;

        console.log("Simulator initialization complete!");
    } catch (error) {
        console.error("Error initializing simulator:", error);
    }
});

// Create a demo user profile with stocks
async function initializeDemoUserProfile() {
    // Import necessary classes
    const Stock = (await import('./js/Stock.js')).default;
    const Portfolio = (await import('./js/Portfolio.js')).default;

    // Create user profile with demo data
    const userProfile = {
        username: "demo_user",
        stocksAddedToSim: [],
        portfolio: new Portfolio(500.00, "demo_user")
    };

    // Add dummy stocks
    const demoStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 178.72, volatility: 0.018 },
        { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', price: 397.58, volatility: 0.016 },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', price: 145.92, volatility: 0.022 },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', price: 235.45, volatility: 0.035 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication', price: 157.73, volatility: 0.015 }
    ];

    // Create stock objects
    for (const stockData of demoStocks) {
        const stock = createDemoStock(stockData);
        userProfile.stocksAddedToSim.push(stock);
    }

    // Add buy/sell methods to user profile
    userProfile.buyStock = function(stock, quantity) {
        const success = this.portfolio.buyStock(stock, quantity);
        if (success) {
            return {
                success: true,
                message: `Successfully bought ${quantity} shares of ${stock.symbol} for $${(stock.marketPrice * quantity).toFixed(2)}`
            };
        } else {
            return {
                success: false,
                message: `Failed to buy ${quantity} shares of ${stock.symbol}`
            };
        }
    };

    userProfile.sellStock = function(stock, quantity) {
        const success = this.portfolio.sellStock(stock, quantity);
        if (success) {
            return {
                success: true,
                message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${(stock.marketPrice * quantity).toFixed(2)}`
            };
        } else {
            return {
                success: false,
                message: `Failed to sell ${quantity} shares of ${stock.symbol}`
            };
        }
    };

    return userProfile;
}

// Create a demo stock with price history
function createDemoStock(data) {
    const stock = {
        symbol: data.symbol,
        companyName: data.name,
        sector: data.sector,
        marketPrice: data.price,
        priceHistory: [],
        volatility: data.volatility || 0.015,
        currentSentiment: 0,
        previousClosePrice: data.price * (0.99 + Math.random() * 0.02),
        openPrice: data.price * (0.99 + Math.random() * 0.02),
        volume: Math.floor(100000 + Math.random() * 9900000)
    };

    // Generate price history
    generatePriceHistory(stock, 50);

    return stock;
}

// Generate realistic price history
function generatePriceHistory(stock, days) {
    let currentPrice = stock.marketPrice;

    // Add current price
    stock.priceHistory.push(currentPrice);

    // Generate historical prices (going backward)
    for (let i = 1; i < days; i++) {
        // Random daily percentage change based on volatility
        const change = (Math.random() - 0.5) * 2 * stock.volatility;

        // Calculate previous day's price
        currentPrice = currentPrice / (1 + change);

        // Add to the beginning of the array (oldest first)
        stock.priceHistory.unshift(currentPrice);
    }
}