// src/client/js/simulator.js
// Main controller for the simulator page

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Simulator initializing...');

    // Import necessary classes
    try {
        // Create demo user profile since we may not have authentication set up yet
        const userProfile = await createDemoUserProfile();

        // Initialize the simulator components
        initializeSimulator(userProfile);

        console.log('Simulator initialization complete');
    } catch (error) {
        console.error('Error initializing simulator:', error);
        displayErrorMessage('Failed to initialize simulator. Please try again.');
    }
});

// Create a demo user profile for testing
async function createDemoUserProfile() {
    console.log('Creating demo user profile...');

    // Create a basic user object
    const userProfile = {
        username: 'demo_user',
        email: 'demo@example.com',
        stocksAddedToSim: [],
        portfolio: {
            balance: 10000.00,
            initialBalance: 10000.00,
            holdingsMap: {},
            portfolioValue: 0.00,
            totalAssetsValue: 10000.00
        }
    };

    // Add some demo stocks
    const demoStocks = [
        { symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology', marketPrice: 178.72, volatility: 0.018, priceHistory: [] },
        { symbol: 'MSFT', companyName: 'Microsoft Corp.', sector: 'Technology', marketPrice: 397.58, volatility: 0.016, priceHistory: [] },
        { symbol: 'AMZN', companyName: 'Amazon.com Inc.', sector: 'Consumer Cyclical', marketPrice: 145.92, volatility: 0.022, priceHistory: [] },
        { symbol: 'TSLA', companyName: 'Tesla Inc.', sector: 'Automotive', marketPrice: 235.45, volatility: 0.035, priceHistory: [] },
        { symbol: 'GOOGL', companyName: 'Alphabet Inc.', sector: 'Communication', marketPrice: 157.73, volatility: 0.015, priceHistory: [] }
    ];

    // Generate price history for each stock
    demoStocks.forEach(stock => {
        generatePriceHistory(stock, 50);

        // Add some additional properties needed for the simulator
        stock.previousClosePrice = stock.marketPrice * (0.99 + Math.random() * 0.02);
        stock.openPrice = stock.marketPrice * (0.99 + Math.random() * 0.02);
        stock.volume = Math.floor(100000 + Math.random() * 9900000);
        stock.currentSentiment = 0;

        // Add the updatePrice method
        stock.updatePrice = function() {
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

            // Add to price history
            this.priceHistory.push(this.marketPrice);
            if (this.priceHistory.length > 100) {
                this.priceHistory.shift();
            }
        };
    });

    // Add stocks to user profile
    userProfile.stocksAddedToSim = demoStocks;

    // Add portfolio methods for buying and selling
    userProfile.portfolio.buyStock = function(stock, quantity) {
        // Validate inputs
        if (!stock || isNaN(quantity) || quantity <= 0 || quantity > 100) {
            return {
                success: false,
                message: 'Invalid quantity or stock'
            };
        }

        const totalCost = stock.marketPrice * quantity;

        // Check if user has enough cash
        if (totalCost > this.balance) {
            return {
                success: false,
                message: 'Insufficient funds for purchase'
            };
        }

        // Deduct cost from balance
        this.balance -= totalCost;

        // Add to holdings
        if (this.holdingsMap[stock.symbol]) {
            // Update existing holding
            const holding = this.holdingsMap[stock.symbol];
            const oldCost = holding.avgPrice * holding.quantity;
            const newCost = stock.marketPrice * quantity;
            holding.quantity += quantity;
            holding.avgPrice = (oldCost + newCost) / holding.quantity;
            holding.currentPrice = stock.marketPrice;
        } else {
            // Create new holding
            this.holdingsMap[stock.symbol] = {
                stock: stock,
                quantity: quantity,
                avgPrice: stock.marketPrice,
                currentPrice: stock.marketPrice
            };
        }

        // Update portfolio value
        updatePortfolioValue(this);

        return {
            success: true,
            message: `Successfully purchased ${quantity} shares of ${stock.symbol} for $${totalCost.toFixed(2)}`
        };
    };

    userProfile.portfolio.sellStock = function(stock, quantity) {
        // Validate inputs
        if (!stock || isNaN(quantity) || quantity <= 0) {
            return {
                success: false,
                message: 'Invalid quantity or stock'
            };
        }

        // Check if user owns the stock
        const holding = this.holdingsMap[stock.symbol];
        if (!holding || holding.quantity < quantity) {
            return {
                success: false,
                message: 'Insufficient shares for sale'
            };
        }

        const totalValue = stock.marketPrice * quantity;

        // Add value to balance
        this.balance += totalValue;

        // Remove from holdings
        holding.quantity -= quantity;
        if (holding.quantity <= 0) {
            delete this.holdingsMap[stock.symbol];
        }

        // Update portfolio value
        updatePortfolioValue(this);

        return {
            success: true,
            message: `Successfully sold ${quantity} shares of ${stock.symbol} for $${totalValue.toFixed(2)}`
        };
    };

    // Return the fully initialized user profile
    return userProfile;
}

// Generate realistic price history for a stock
function generatePriceHistory(stock, days) {
    const initialPrice = stock.marketPrice;
    const volatility = stock.volatility || 0.015;
    stock.priceHistory = [];

    // Create a slight trend bias
    const trendBias = (Math.random() * 0.006) - 0.003; // Between -0.3% and +0.3% daily bias

    // Generate price points going backward from current price
    let price = initialPrice;

    for (let i = 0; i < days; i++) {
        // Add current price to history
        stock.priceHistory.unshift(price);

        // Calculate new price for previous day
        const change = trendBias + (volatility * (Math.random() * 2 - 1));
        price = price / (1 + change); // Going backward in time

        // Keep prices reasonable
        price = Math.max(price, 0.01);
    }

    // Add current price to make sure it's in the history
    stock.priceHistory.push(initialPrice);
}

// Update portfolio value calculations
function updatePortfolioValue(portfolio) {
    // Calculate portfolio value
    let portfolioValue = 0;
    const holdings = portfolio.holdingsMap;

    for (const symbol in holdings) {
        const holding = holdings[symbol];
        portfolioValue += holding.quantity * holding.stock.marketPrice;
    }

    portfolio.portfolioValue = portfolioValue;
    portfolio.totalAssetsValue = portfolioValue + portfolio.balance;

    // Update UI displays
    updatePortfolioDisplays(portfolio);
}

// Initialize simulator components
function initializeSimulator(userProfile) {
    console.log('Initializing simulator components...');

    // Initialize the chart controller
    const graphController = new SimulatorGraphController(userProfile);
    window.graphController = graphController;

    // Initialize the portfolio UI controller
    const portfolioController = new PortfolioUIController(userProfile);
    window.portfolioController = portfolioController;

    // Initialize the news generator
    const newsGenerator = new NewsGenerator(userProfile);
    newsGenerator.start();
    window.newsGenerator = newsGenerator;

    // Populate stock dropdown
    populateStockDropdown(userProfile.stocksAddedToSim);

    // Set up event handlers
    setupEventHandlers(userProfile);

    // Initial UI update
    updateAllDisplays(userProfile);
}

// Populate the stock dropdown
function populateStockDropdown(stocks) {
    const dropdown = document.getElementById('stockSelect');
    if (!dropdown) return;

    // Clear existing options
    dropdown.innerHTML = '';

    // Add each stock as an option
    stocks.forEach(stock => {
        const option = document.createElement('option');
        option.value = stock.symbol;
        option.textContent = `${stock.symbol} - ${stock.companyName}`;
        dropdown.appendChild(option);
    });
}

// Set up event handlers for UI elements
function setupEventHandlers(userProfile) {
    // Stock selection change
    const stockSelect = document.getElementById('stockSelect');
    if (stockSelect) {
        stockSelect.addEventListener('change', function() {
            changeFocusedStock(this.value);
        });
    }

    // Timeframe buttons
    const timeframeButtons = document.querySelectorAll('[onclick^="setTimeframe"]');
    timeframeButtons.forEach(button => {
        // Replace the inline onclick with proper event listener
        const timeframe = button.getAttribute('onclick').replace('setTimeframe(\'', '').replace('\')', '');
        button.removeAttribute('onclick');
        button.addEventListener('click', function() {
            setTimeframe(timeframe);
        });
    });

    // Buy button
    const buyButton = document.getElementById('buy-button');
    if (buyButton) {
        buyButton.addEventListener('click', function() {
            executeBuy(userProfile);
        });
    }

    // Sell button
    const sellButton = document.getElementById('sell-button');
    if (sellButton) {
        sellButton.addEventListener('click', function() {
            executeSell(userProfile);
        });
    }

    // Buy quantity input
    const buyQuantity = document.getElementById('buy-quantity');
    if (buyQuantity) {
        buyQuantity.addEventListener('input', function() {
            updateBuyTotal();
        });
    }

    // Sell quantity input
    const sellQuantity = document.getElementById('sell-quantity');
    if (sellQuantity) {
        sellQuantity.addEventListener('input', function() {
            updateSellTotal();
        });
    }
}

// Change the focused stock
function changeFocusedStock(symbol) {
    if (window.graphController) {
        window.graphController.setFocusedStock(symbol);
        updateStockDisplays();
    }
}

// Set timeframe for chart
function setTimeframe(timeframe) {
    if (window.graphController) {
        window.graphController.setTimeframe(timeframe);

        // Update button styling
        const buttons = document.querySelectorAll('[onclick^="setTimeframe"]');
        buttons.forEach(button => {
            if (button.textContent.trim() === timeframe) {
                button.classList.add('bg-primary');
                button.classList.remove('bg-background/70');
            } else {
                button.classList.remove('bg-primary');
                button.classList.add('bg-background/70');
            }
        });
    }
}

// Execute buy operation
function executeBuy(userProfile) {
    const stockSelect = document.getElementById('stockSelect');
    const buyQuantity = document.getElementById('buy-quantity');

    if (!stockSelect || !buyQuantity) return;

    const symbol = stockSelect.value;
    const quantity = parseInt(buyQuantity.value);

    // Find the stock
    const stock = userProfile.stocksAddedToSim.find(s => s.symbol === symbol);
    if (!stock) {
        displayErrorMessage('Stock not found');
        return;
    }

    // Execute buy
    const result = userProfile.portfolio.buyStock(stock, quantity);

    // Show result notification
    if (result.success) {
        displaySuccessMessage(result.message);
        updateAllDisplays(userProfile);
        buyQuantity.value = 1;
        updateBuyTotal();
    } else {
        displayErrorMessage(result.message);
    }
}

// Execute sell operation
function executeSell(userProfile) {
    const stockSelect = document.getElementById('stockSelect');
    const sellQuantity = document.getElementById('sell-quantity');

    if (!stockSelect || !sellQuantity) return;

    const symbol = stockSelect.value;
    const quantity = parseInt(sellQuantity.value);

    // Find the stock
    const stock = userProfile.stocksAddedToSim.find(s => s.symbol === symbol);
    if (!stock) {
        displayErrorMessage('Stock not found');
        return;
    }

    // Execute sell
    const result = userProfile.portfolio.sellStock(stock, quantity);

    // Show result notification
    if (result.success) {
        displaySuccessMessage(result.message);
        updateAllDisplays(userProfile);
        sellQuantity.value = 1;
        updateSellTotal();
    } else {
        displayErrorMessage(result.message);
    }
}

// Update buy total display
function updateBuyTotal() {
    const buyQuantity = document.getElementById('buy-quantity');
    const buyTotal = document.getElementById('buy-total');
    const stockSelect = document.getElementById('stockSelect');

    if (!buyQuantity || !buyTotal || !stockSelect || !window.graphController) return;

    const quantity = parseInt(buyQuantity.value) || 0;
    const symbol = stockSelect.value;

    // Find the stock
    const stock = window.graphController.userProfile.stocksAddedToSim.find(s => s.symbol === symbol);
    if (!stock) return;

    // Calculate and display total
    const total = stock.marketPrice * quantity;
    buyTotal.textContent = `$${total.toFixed(2)}`;
}

// Update sell total display
function updateSellTotal() {
    const sellQuantity = document.getElementById('sell-quantity');
    const sellTotal = document.getElementById('sell-total');
    const stockSelect = document.getElementById('stockSelect');

    if (!sellQuantity || !sellTotal || !stockSelect || !window.graphController) return;

    const quantity = parseInt(sellQuantity.value) || 0;
    const symbol = stockSelect.value;

    // Find the stock
    const stock = window.graphController.userProfile.stocksAddedToSim.find(s => s.symbol === symbol);
    if (!stock) return;

    // Calculate and display total
    const total = stock.marketPrice * quantity;
    sellTotal.textContent = `$${total.toFixed(2)}`;
}

// Update all UI displays
function updateAllDisplays(userProfile) {
    updateStockDisplays();
    updatePortfolioDisplays(userProfile.portfolio);
    updateHoldingsTable(userProfile.portfolio);
}

// Update stock-related displays
function updateStockDisplays() {
    if (!window.graphController || !window.graphController.focusedStock) return;

    const stock = window.graphController.focusedStock;

    // Update current price display
    const currentPrice = document.getElementById('currentPrice');
    if (currentPrice) {
        currentPrice.textContent = `$${stock.marketPrice.toFixed(2)}`;
    }

    // Update price change display
    const priceChange = document.getElementById('priceChange');
    if (priceChange) {
        const previousClose = stock.previousClosePrice || stock.marketPrice * 0.99;
        const change = stock.marketPrice - previousClose;
        const percentChange = (change / previousClose) * 100;

        priceChange.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${percentChange.toFixed(2)}%)`;
        priceChange.className = `ml-2 text-sm font-medium px-3 py-1 rounded-full ${change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
    }

    // Update buy price
    const buyPrice = document.getElementById('buy-price');
    if (buyPrice) {
        buyPrice.textContent = `$${stock.marketPrice.toFixed(2)}`;
    }

    // Update sell price
    const sellPrice = document.getElementById('sell-price');
    if (sellPrice) {
        sellPrice.textContent = `$${stock.marketPrice.toFixed(2)}`;
    }

    // Update buy/sell totals
    updateBuyTotal();
    updateSellTotal();
}

// Update portfolio value displays
function updatePortfolioDisplays(portfolio) {
    // Update available cash
    const availableCash = document.getElementById('available-cash');
    if (availableCash) {
        availableCash.textContent = `$${portfolio.balance.toFixed(2)}`;
    }

    // Update portfolio value
    const portfolioValue = document.getElementById('portfolio-value');
    if (portfolioValue) {
        portfolioValue.textContent = `$${portfolio.portfolioValue.toFixed(2)}`;
    }

    // Update total assets
    const totalAssets = document.getElementById('total-assets');
    if (totalAssets) {
        totalAssets.textContent = `$${portfolio.totalAssetsValue.toFixed(2)}`;
    }
}

// Update holdings table
function updateHoldingsTable(portfolio) {
    const tableBody = document.getElementById('holdings-table-body');
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';

    const holdings = portfolio.holdingsMap;
    const holdingsArray = Object.values(holdings);

    if (holdingsArray.length === 0) {
        // No holdings message
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="3" class="py-6 text-center text-gray-400">
                <div class="flex flex-col items-center">
                    <i class="fas fa-folder-open text-2xl mb-2 text-gray-500"></i>
                    No stocks in portfolio
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    // Add row for each holding
    holdingsArray.forEach(holding => {
        const stock = holding.stock;
        const value = holding.quantity * stock.marketPrice;
        const profitLoss = value - (holding.avgPrice * holding.quantity);
        const percentChange = (stock.marketPrice / holding.avgPrice - 1) * 100;

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-5 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${stock.symbol}</div>
                        <div class="text-xs text-gray-500">${stock.companyName}</div>
                    </div>
                </div>
            </td>
            <td class="px-5 py-4 whitespace-nowrap text-sm text-right">${holding.quantity}</td>
            <td class="px-5 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-medium text-gray-900">$${value.toFixed(2)}</div>
                <div class="text-xs ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${profitLoss >= 0 ? '+' : ''}${percentChange.toFixed(2)}%
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Display success message
function displaySuccessMessage(message) {
    // Simple alert for now, could be replaced with a more elegant notification
    alert(message);
}

// Display error message
function displayErrorMessage(message) {
    // Simple alert for now, could be replaced with a more elegant notification
    alert('Error: ' + message);
}

// Stock class (minimal implementation for backward compatibility)
class Stock {
    constructor(data) {
        Object.assign(this, data);
    }

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

        // Add to price history
        this.priceHistory.push(this.marketPrice);
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }
    }
}

/* ────────────────────────────────────────────────────────────────
   NewsGenerator  v2
   — calls  POST /api/news/generate  for a GPT headline
   — falls back to your older random-headline logic on failure
   — bumps each stock’s currentSentiment by the “weight” returned
────────────────────────────────────────────────────────────────── */
class NewsGenerator {
    constructor(userProfile) {
        this.userProfile   = userProfile;
        this.newsContainer = document.getElementById('news-container');
        this.interval      = null;

        /* cache AI headlines for 60 s so you don’t hammer your quota */
        this.cache          = { items: [], ts: 0 };
        this.cacheDuration  = 60_000;
    }

    /* public ----------------------------------------------------- */
    start(interval = 90_000) {
        this.stop();
        this.publishNews();                       // first headline immediately
        this.interval = setInterval(() => this.publishNews(), interval);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    /* core ------------------------------------------------------- */
    async publishNews() {
        try {
            const item = await this.getAIHeadline();
            this.applyImpact(item);           // nudge the stock’s sentiment
            this.render(item);
        } catch (err) {
            console.warn('AI news failed, fallback headline →', err);
            const fallback = this.createLegacyHeadline();
            this.applyImpact(fallback);
            this.render(fallback);
        }
    }

    /* ── SERVER CALL ───────────────────────────────────────────── */
    async getAIHeadline() {
        /* use cached response if < 60 s old */
        const now = Date.now();
        if (now - this.cache.ts < this.cacheDuration && this.cache.items.length) {
            return this.cache.items.shift();          // reuse cached headline
        }

        const res = await fetch('/api/news/generate', { method: 'POST' });
        if (!res.ok) throw new Error(`API status ${res.status}`);

        const { story, company, weight } = await res.json();
        const item = {
            headline : story,
            company,
            weight,
            timestamp: new Date()
        };

        /* store in cache in case UI asks again within 60 s */
        this.cache = { items: [item], ts: now };
        return item;
    }

    /* ── FALLBACK ──────────────────────────────────────────────── */
    createLegacyHeadline() {
        const stocks = this.userProfile.stocksAddedToSim;
        const stock  = stocks[Math.floor(Math.random() * stocks.length)];

        const positive = Math.random() > 0.5;
        const list = positive
            ? [`${stock.companyName} Reports Strong Quarterly Results`,
                `Analysts Upgrade ${stock.companyName}`,
                `${stock.companyName} Announces New Product Line`,
                `${stock.companyName} Exceeds Market Expectations`]
            : [`${stock.companyName} Faces Challenges in Quarterly Report`,
                `Analysts Downgrade ${stock.companyName}`,
                `${stock.companyName} Dealing with Supply-Chain Issues`,
                `${stock.companyName} Stock Under Pressure After Announcement`];

        return {
            headline : list[Math.floor(Math.random() * list.length)],
            company  : stock.symbol,
            weight   : positive ? 0.05 : -0.05,
            timestamp: new Date()
        };
    }

    /* ── SIDE-EFFECTS ──────────────────────────────────────────── */
    applyImpact({ company, weight }) {
        const stock = this.userProfile.stocksAddedToSim
            .find(s => s.symbol === company);
        if (stock) {
            stock.currentSentiment += weight;
            stock.currentSentiment = Math.max(-1, Math.min(1, stock.currentSentiment));
        }
    }

    /* ── UI RENDERING ──────────────────────────────────────────── */
    render({ headline, weight, timestamp }) {
        if (!this.newsContainer) return;

        const isPositive = weight > 0.001;
        const isNegative = weight < -0.001;

        const newsItem = document.createElement('div');
        newsItem.className = 'py-2 border-b border-tertiary/30 pb-4';
        newsItem.innerHTML = `
      <div class="flex items-start">
        <div class="p-2 rounded-lg ${
            isPositive ? 'bg-green-100 text-green-800'
                : isNegative ? 'bg-red-100 text-red-800'
                    : 'bg-background/40 text-primary-light'
        } mr-3">
          <i class="fas fa-newspaper"></i>
        </div>
        <div>
          <span class="text-xs text-gray-400 block mb-1">
            ${timestamp.toLocaleTimeString()}
          </span>
          <p class="text-sm">${headline}</p>
        </div>
      </div>`;

        this.newsContainer.prepend(newsItem);

        /* keep only the five newest items */
        while (this.newsContainer.children.length > 5) {
            this.newsContainer.lastChild.remove();
        }
    }
}
/* ────────────────────────────────────────────────────────────── */

// PortfolioUIController class (minimal implementation for backward compatibility)
class PortfolioUIController {
    constructor(userProfile) {
        this.userProfile = userProfile;
    }

    updateCashDisplay() {
        updatePortfolioDisplays(this.userProfile.portfolio);
    }

    updatePortfolioDisplay() {
        updatePortfolioDisplays(this.userProfile.portfolio);
    }

    updateHoldingsTable() {
        updateHoldingsTable(this.userProfile.portfolio);
    }
}

// SimulatorGraphController class (minimal implementation for backward compatibility)
class SimulatorGraphController {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.focusedStock = userProfile.stocksAddedToSim[0];
        this.timeframe = "1D";
        this.canvas = document.getElementById('stockCanvas');
        this.ctx = this.canvas?.getContext('2d');

        // Set up animation interval
        this.updateInterval = setInterval(() => this.updateAllStockPrices(), 1000);

        // Draw initial chart
        this.drawGraph();
    }

    setFocusedStock(stockSymbol) {
        const stock = this.userProfile.stocksAddedToSim.find(s => s.symbol === stockSymbol);
        if (stock) {
            this.focusedStock = stock;
            this.drawGraph();
            updateStockDisplays();
        }
    }

    setTimeframe(tf) {
        this.timeframe = tf;
        this.drawGraph();
    }

    updateAllStockPrices() {
        // Update all stock prices
        this.userProfile.stocksAddedToSim.forEach(stock => {
            if (typeof stock.updatePrice === 'function') {
                stock.updatePrice();
            }
        });

        // Update UI
        this.drawGraph();
        updateStockDisplays();
        updatePortfolioDisplays(this.userProfile.portfolio);
    }

    drawGraph() {
        if (!this.ctx || !this.focusedStock || !this.focusedStock.priceHistory) return;

        const ctx = this.ctx;
        const canvas = this.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get price history
        const priceHistory = this.focusedStock.priceHistory;
        if (priceHistory.length < 2) return;

        // Determine visible portion of price history based on timeframe
        let visiblePoints = 20;
        if (this.timeframe === "1W") visiblePoints = 30;
        if (this.timeframe === "1M") visiblePoints = 50;

        const startIndex = Math.max(0, priceHistory.length - visiblePoints);
        const visiblePrices = priceHistory.slice(startIndex);

        // Calculate price range
        const minPrice = Math.min(...visiblePrices) * 0.99;
        const maxPrice = Math.max(...visiblePrices) * 1.01;
        const range = maxPrice - minPrice;

        // Draw grid
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;

        // Draw horizontal grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = 30 + (i * (height - 60) / gridLines);
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();

            // Draw price labels
            const price = maxPrice - (range * i / gridLines);
            ctx.fillStyle = "#9ca3af";
            ctx.font = "12px Arial";
            ctx.textAlign = "right";
            ctx.fillText(`$${price.toFixed(2)}`, 45, y + 4);
        }

        // Draw price line
        ctx.strokeStyle = "#3b82f6"; // blue-500
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Plot price line
        for (let i = 0; i < visiblePrices.length; i++) {
            const x = 50 + (i * (width - 70) / (visiblePrices.length - 1));
            const y = height - 30 - ((visiblePrices[i] - minPrice) / range * (height - 60));

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // Add gradient fill under the line
        const lastX = 50 + ((visiblePrices.length - 1) * (width - 70) / (visiblePrices.length - 1));
        const lastY = height - 30 - ((visiblePrices[visiblePrices.length - 1] - minPrice) / range * (height - 60));

        ctx.lineTo(lastX, height - 30);
        ctx.lineTo(50, height - 30);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 30, 0, height - 30);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0)");

        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw time frame label
        ctx.fillStyle = "#6b7280";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.fillText(this.timeframe, 50, 20);
    }

    // Clean up resources when no longer needed
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}