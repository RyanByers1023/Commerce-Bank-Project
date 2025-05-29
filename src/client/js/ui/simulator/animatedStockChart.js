class AnimatedStockChart {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.focusedStock = userProfile.stocksAddedToSim[0];

        // Animation settings
        this.TIME_FRAMES = {
            "1D": { interval: 1000, label: "Today" },
            "1W": { interval: 3500, label: "This Week" },
            "1M": { interval: 7000, label: "This Month" }
        };

        // Default timeframe
        this.timeframe = "1D";

        // Animation state
        this.animationTimer = null;
        this.marketTrendRef = 0;
        this.timeCounterRef = 0;

        // Initialize
        this.initializeChart();
    }

    initializeChart() {
        // Wait for DOM to be loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupChart());
        } else {
            this.setupChart();
        }
    }

    setupChart() {
        // Set up event listeners for timeframe buttons
        const timeframeButtons = document.querySelectorAll('[data-timeframe]');
        if (timeframeButtons.length > 0) {
            timeframeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const tf = e.target.dataset.timeframe;
                    this.setTimeframe(tf);

                    // Update button styling
                    timeframeButtons.forEach(btn => btn.classList.remove('bg-blue-600'));
                    e.target.classList.add('bg-blue-600');
                });
            });
        }

        // Set up stock selection change listener
        const selectStock = document.getElementById("select-stock");
        if (selectStock) {
            selectStock.addEventListener('change', (e) => {
                this.setFocusedStock(e.target.value);
            });
        }

        // Start animation
        this.startAnimation();
    }

    startAnimation() {
        // Clear any existing timer
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
        }

        // Set random initial market trend
        this.marketTrendRef = (Math.random() * 2 - 1) * 0.005;

        // Get current time frame settings
        const intervalConfig = this.TIME_FRAMES[this.timeframe];
        if (!intervalConfig) return;

        // Start new animation timer
        this.animationTimer = setInterval(() => {
            this.updateAllStocks();
        }, intervalConfig.interval);

        // Initial update
        this.updateAllStocks();
    }

    setTimeframe(tf) {
        if (!this.TIME_FRAMES[tf]) return;

        this.timeframe = tf;
        this.startAnimation(); // Restart animation with new timeframe
    }

    updateAllStocks() {
        // Skip if no stocks available
        if (!this.userProfile || !Array.isArray(this.userProfile.stocksAddedToSim)) return;

        this.timeCounterRef += 1;

        // Update prices for all stocks
        this.userProfile.stocksAddedToSim.forEach(stock => {
            if (!stock) return;

            // Calculate price change based on stock volatility and market trend
            const volatility = stock.volatility || 0.015;
            const randomFactor = (Math.random() - 0.5) * 0.01;
            const marketEffect = this.marketTrendRef;
            const sentimentEffect = (stock.currentSentiment || 0) * 0.001;

            const combinedEffect = randomFactor + marketEffect + sentimentEffect;
            let newPrice = stock.marketPrice * (1 + combinedEffect);

            // Ensure price doesn't go negative
            newPrice = Math.max(newPrice, 0.01);

            // Update price and history
            stock.marketPrice = newPrice;
            if (Array.isArray(stock.priceHistory)) {
                stock.priceHistory.push(newPrice);

                // Limit history length
                if (stock.priceHistory.length > 100) {
                    stock.priceHistory.shift();
                }
            }
        });

        // 10% chance to change market trend
        if (Math.random() < 0.1) {
            this.marketTrendRef = (Math.random() * 2 - 1) * 0.005;
        }

        // Update UI
        this.updateUI();
    }

    setFocusedStock(stockSymbol) {
        const stock = this.userProfile.stocksAddedToSim.find(s => s.symbol === stockSymbol);
        if (stock) {
            this.focusedStock = stock;
            this.updateUI();
        }
    }

    updateUI() {
        if (!this.focusedStock) return;

        // Update stock price display
        const priceElement = document.getElementById("span-stock-market-price");
        if (priceElement) {
            priceElement.textContent = `$${this.focusedStock.marketPrice.toFixed(2)}`;
        }

        // Update buy/sell prices
        const buyPriceElement = document.getElementById("span-buy-market-price");
        if (buyPriceElement) {
            buyPriceElement.textContent = `$${this.focusedStock.marketPrice.toFixed(2)}`;
        }

        const sellPriceElement = document.getElementById("span-sell-market-price");
        if (sellPriceElement) {
            sellPriceElement.textContent = `$${this.focusedStock.marketPrice.toFixed(2)}`;
        }

        // Update price change display
        this.updatePriceChangeDisplay();

        // Redraw graph
        this.drawPriceGraph();

        // Update buy/sell totals
        this.updateTransactionTotals();

        // Update portfolio value
        this.updatePortfolioValue();
    }

    updatePriceChangeDisplay() {
        const changeElement = document.getElementById("span-stock-price-change");
        if (!changeElement || !this.focusedStock) return;

        // Calculate change
        const history = this.focusedStock.priceHistory;
        if (!Array.isArray(history) || history.length < 2) return;

        const startPrice = history[Math.max(0, history.length - Math.min(history.length, 20))];
        const currentPrice = this.focusedStock.marketPrice;
        const change = currentPrice - startPrice;
        const percentChange = (change / startPrice) * 100;

        // Update element
        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${percentChange.toFixed(2)}%)`;
        changeElement.className = `text-sm font-medium px-2 py-1 rounded ${
            change >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
        }`;
    }

    drawPriceGraph() {
        const canvas = document.getElementById("graph-stock");
        if (!canvas || !this.focusedStock) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get price history
        const priceHistory = this.focusedStock.priceHistory;
        if (!Array.isArray(priceHistory) || priceHistory.length < 2) return;

        // Calculate visible portion of price history based on timeframe
        let visiblePoints = 20;
        if (this.timeframe === "1W") visiblePoints = 30;
        if (this.timeframe === "1M") visiblePoints = 50;

        const startIndex = Math.max(0, priceHistory.length - visiblePoints);
        const visiblePrices = priceHistory.slice(startIndex);

        // Find min and max prices for y-axis scaling
        let minPrice = Math.min(...visiblePrices) * 0.995;
        let maxPrice = Math.max(...visiblePrices) * 1.005;

        // Draw grid
        this.drawGrid(ctx, canvas.width, canvas.height, minPrice, maxPrice);

        // Draw price line
        this.drawPriceLine(ctx, canvas.width, canvas.height, visiblePrices, minPrice, maxPrice);
    }

    drawGrid(ctx, width, height, minPrice, maxPrice) {
        const padding = 40;
        const gridLines = 5;

        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;

        // Draw horizontal grid lines and price labels
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (i * (height - 2 * padding) / gridLines);

            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();

            const price = maxPrice - ((maxPrice - minPrice) * i / gridLines);
            ctx.fillStyle = "#888";
            ctx.font = "12px Arial";
            ctx.textAlign = "right";
            ctx.fillText(`$${price.toFixed(2)}`, padding - 5, y + 4);
        }

        // Draw time label
        ctx.textAlign = "left";
        ctx.fillText(this.TIME_FRAMES[this.timeframe].label, padding, padding - 15);
    }

    drawPriceLine(ctx, width, height, prices, minPrice, maxPrice) {
        const padding = 40;

        // Draw price line
        ctx.strokeStyle = "#3B82F6"; // blue-500
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < prices.length; i++) {
            const x = padding + (i * (width - 2 * padding) / (prices.length - 1));
            const y = height - padding - ((prices[i] - minPrice) / (maxPrice - minPrice) * (height - 2 * padding));

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // Add gradient fill
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0)");

        ctx.fillStyle = gradient;

        // Complete the fill path
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fill();
    }

    updateTransactionTotals() {
        if (!this.focusedStock) return;

        // Update buy total
        const buyQuantityInput = document.getElementById("input-buy-quantity");
        const buyTotalElement = document.getElementById("span-buy-total-price");

        if (buyQuantityInput && buyTotalElement) {
            const quantity = parseInt(buyQuantityInput.value) || 0;
            buyTotalElement.textContent = `Total: $${(this.focusedStock.marketPrice * quantity).toFixed(2)}`;
        }

        // Update sell total
        const sellQuantityInput = document.getElementById("input-sell-quantity");
        const sellTotalElement = document.getElementById("span-sell-total-price");

        if (sellQuantityInput && sellTotalElement) {
            const quantity = parseInt(sellQuantityInput.value) || 0;
            sellTotalElement.textContent = `Total: $${(this.focusedStock.marketPrice * quantity).toFixed(2)}`;
        }
    }

    updatePortfolioValue() {
        if (!this.userProfile || !this.userProfile.portfolio) return;

        // Recalculate portfolio value
        let portfolioValue = 0;
        const holdings = this.userProfile.portfolio.holdingsMap;

        for (const symbol in holdings) {
            const holding = holdings[symbol];
            const stock = this.userProfile.stocksAddedToSim.find(s => s.symbol === symbol);

            if (stock && holding) {
                portfolioValue += stock.marketPrice * holding.quantity;
            }
        }

        // Update portfolio value
        this.userProfile.portfolio.portfolioValue = portfolioValue;

        // Update total assets value
        this.userProfile.portfolio.totalAssetsValue = portfolioValue + this.userProfile.portfolio.balance;

        // Update UI
        const portfolioValueElement = document.getElementById("span-portfolio-value");
        if (portfolioValueElement) {
            portfolioValueElement.textContent = `$${portfolioValue.toFixed(2)}`;
        }

        const totalAssetsElement = document.getElementById("span-total-assets-value");
        if (totalAssetsElement) {
            totalAssetsElement.textContent = `$${this.userProfile.portfolio.totalAssetsValue.toFixed(2)}`;
        }
    }

    // Clean up when component is no longer needed
    destroy() {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
    }
}

export default AnimatedStockChart;