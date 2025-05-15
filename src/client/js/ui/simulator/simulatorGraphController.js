export default class SimulatorGraphController {
    constructor(userProfile) {
        // Validate userProfile input
        if (!userProfile || !Array.isArray(userProfile.stocksAddedToSim) || userProfile.stocksAddedToSim.length === 0) {
            console.error('[SimulatorGraphController] Invalid userProfile or empty stocksAddedToSim array');
            // Set defaults that won't crash the app
            this.userProfile = { stocksAddedToSim: [] };
            this.focusedStock = null;
        } else {
            this.userProfile = userProfile;
            this.focusedStock = userProfile.stocksAddedToSim[0];
        }

        // Graph constants
        this.CANVAS_WIDTH = 800;
        this.CANVAS_HEIGHT = 600;
        this.GRAPH_PADDING = 60;
        this.GRID_LINES = 5;
        this.NUM_POINTS = 50;

        // TimeFrame settings
        this.TIME_FRAMES = {
            "1D": { interval: 500, label: "Today" },    // in milliseconds
            "1W": { interval: 3500, label: "This Week" },
            "1M": { interval: 7000, label: "This Month" }
        };

        // Default timeframe to 1 day
        this.timeframe = "1D";
        
        // DOM elements
        this.canvas = null;
        this.ctx = null;
        
        // State tracking
        this.updateInterval = null;
        this.isInitialized = false;
        
        // Initialize after DOM is loaded
        this.initWhenReady();
    }

    initWhenReady() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.instantiateCanvas());
            } else {
                // DOM already loaded, initialize immediately
                this.instantiateCanvas();
            }
        } catch (error) {
            console.error('[SimulatorGraphController] Error in initWhenReady:', error);
        }
    }

    instantiateCanvas() {
        try {
            this.canvas = document.getElementById("stockCanvas");

            if (!this.canvas) {
                console.error("[SimulatorGraphController] Canvas element not found");
                return;
            }

            // Get 2D context
            try {
                this.ctx = this.canvas.getContext("2d");
                if (!this.ctx) {
                    console.error("[SimulatorGraphController] Failed to get 2D context from canvas");
                    return;
                }
            } catch (error) {
                console.error("[SimulatorGraphController] Error getting 2D context:", error);
                return;
            }

            // Set actual dimensions from the DOM element
            this.CANVAS_WIDTH = this.canvas.width;
            this.CANVAS_HEIGHT = this.canvas.height;

            // Set up the UI components if we have valid stock data
            if (this.userProfile.stocksAddedToSim.length > 0) {
                this.populateStockDropdown(this.userProfile.stocksAddedToSim);
                this.updateCurrentStockDisplay();
                this.setupEventListeners();
                this.resetUpdateInterval();

                // Draw initial graph
                this.drawGraph();
                this.isInitialized = true;
            } else {
                console.warn("[SimulatorGraphController] No stocks available for graph initialization");
                // Display a message on the canvas
                this.displayNoStocksMessage();
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in instantiateCanvas:", error);
        }
    }

    displayNoStocksMessage() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        this.ctx.fillStyle = "#6B7280"; // Gray-500
        this.ctx.font = "16px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            "No stocks available for display", 
            this.CANVAS_WIDTH / 2, 
            this.CANVAS_HEIGHT / 2
        );
    }

    setupEventListeners() {
        try {
            // Set up stock selection change listener
            const selectStock = document.getElementById("selectStock");
            if (selectStock) {
                selectStock.addEventListener('change', (e) => {
                    this.setFocusedStock(e.target.value);
                });
            } else {
                console.warn("[SimulatorGraphController] Stock selection dropdown not found");
            }

            // Set up timeframe buttons
            const timeframeButtons = document.querySelectorAll('[data-timeframe]');
            if (timeframeButtons.length > 0) {
                timeframeButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        const tf = e.target.dataset.timeframe;
                        this.setTimeframe(tf);
                        
                        // Optional: update button styling to show active state
                        timeframeButtons.forEach(btn => btn.classList.remove('bg-blue-600'));
                        e.target.classList.add('bg-blue-600');
                    });
                });
            } else {
                console.warn("[SimulatorGraphController] Timeframe buttons not found");
            }

            // Set up quantity input listeners for buy/sell
            const buyQuantityInput = document.getElementById('inputStockBuyQuantity');
            if (buyQuantityInput) {
                buyQuantityInput.addEventListener('input', () => this.updateBuySellInterface());
            }

            const sellQuantityInput = document.getElementById('inputStockSellQuantity');
            if (sellQuantityInput) {
                sellQuantityInput.addEventListener('input', () => this.updateBuySellInterface());
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in setupEventListeners:", error);
        }
    }

    setFocusedStock(stockSymbol) {
        try {
            if (!stockSymbol) {
                console.warn("[SimulatorGraphController] Invalid stock symbol provided");
                return;
            }
            
            // Find the stock in the user's portfolio
            const stock = this.getStock(stockSymbol);
            if (stock) {
                this.focusedStock = stock;
                this.updateCurrentStockDisplay();
                this.drawGraph();
            } else {
                console.warn(`[SimulatorGraphController] Stock with symbol ${stockSymbol} not found`);
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in setFocusedStock:", error);
        }
    }

    getStock(selectedStockSymbol) {
        if (!selectedStockSymbol || !this.userProfile || !Array.isArray(this.userProfile.stocksAddedToSim)) {
            return null;
        }
        
        return this.userProfile.stocksAddedToSim.find(stock => 
            stock && stock.symbol === selectedStockSymbol
        );
    }

    resetUpdateInterval() {
        try {
            // Clear existing interval
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }

            // Validate timeframe
            const intervalConfig = this.TIME_FRAMES[this.timeframe];
            if (!intervalConfig) {
                console.error(`[SimulatorGraphController] Invalid timeframe: ${this.timeframe}`);
                return;
            }

            // Set new interval based on selected timeframe
            this.updateInterval = setInterval(() => {
                this.updateAllStockPrices();
            }, intervalConfig.interval);

            // Trigger immediate update
            this.updateAllStockPrices();
        } catch (error) {
            console.error("[SimulatorGraphController] Error in resetUpdateInterval:", error);
        }
    }

    // Update all stocks at once
    updateAllStockPrices() {
        try {
            if (!this.userProfile || !Array.isArray(this.userProfile.stocksAddedToSim) || 
                this.userProfile.stocksAddedToSim.length === 0) {
                return;
            }

            // Update prices for all stocks in the simulation
            this.userProfile.stocksAddedToSim.forEach(stock => {
                if (stock && typeof stock.updatePrice === 'function') {
                    stock.updatePrice();
                }
            });

            // Update displays only if a stock is currently focused
            if (this.focusedStock) {
                this.updateCurrentStockDisplay();
                this.updateBuySellInterface();
                this.drawGraph();
            }

            // Update portfolio value
            this.updatePortfolioValue();
        } catch (error) {
            console.error("[SimulatorGraphController] Error in updateAllStockPrices:", error);
        }
    }

    updatePortfolioValue() {
        try {
            // Check if portfolio methods exist and call them
            if (this.userProfile && this.userProfile.portfolio && 
                typeof this.userProfile.portfolio.setPortfolioValue === 'function' &&
                typeof this.userProfile.portfolio.setTotalAssetsValue === 'function') {
                
                this.userProfile.portfolio.setPortfolioValue();
                this.userProfile.portfolio.setTotalAssetsValue();
                
                // Update the UI displays
                this.updatePortfolioDisplay();
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in updatePortfolioValue:", error);
        }
    }

    updatePortfolioDisplay() {
        try {
            const portfolioValueDisplay = document.getElementById('spanPortfolioValue');
            const totalAssetsDisplay = document.getElementById('spanPortfolioTotalAssets');
            
            if (!this.userProfile || !this.userProfile.portfolio) return;
            
            const portfolioValue = this.userProfile.portfolio.portfolioValue || 0;
            const totalAssetsValue = this.userProfile.portfolio.totalAssetsValue || 0;

            if (portfolioValueDisplay) {
                portfolioValueDisplay.textContent = `$${portfolioValue.toFixed(2)}`;
            }

            if (totalAssetsDisplay) {
                totalAssetsDisplay.textContent = `$${totalAssetsValue.toFixed(2)}`;
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in updatePortfolioDisplay:", error);
        }
    }

    updateCurrentStockDisplay() {
        try {
            if (!this.focusedStock) return;
            
            // Validate required stock properties
            const { marketPrice = 0, companyName = '', symbol = '', previousClosePrice = 0 } = this.focusedStock;
            
            // Update stock price display
            const priceElement = document.getElementById("spanStockPrice");
            if (priceElement) {
                priceElement.textContent = `$${marketPrice.toFixed(2)}`;
            }

            // Update stock name/symbol display
            const nameElement = document.getElementById("spanStockName");
            if (nameElement) {
                nameElement.textContent = `${companyName} (${symbol})`;
            }

            // Update price change - protect against division by zero
            const changeElement = document.getElementById("spanStockPriceChange");
            if (changeElement) {
                const change = marketPrice - previousClosePrice;
                let changePercent = 0;
                
                if (previousClosePrice !== 0) {
                    changePercent = (change / previousClosePrice) * 100;
                }

                changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
                changeElement.className = `text-sm font-medium px-2 py-1 rounded ${change >= 0 ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100'}`;
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in updateCurrentStockDisplay:", error);
        }
    }

    setTimeframe(tf) {
        try {
            if (!this.TIME_FRAMES[tf]) {
                console.warn(`[SimulatorGraphController] Invalid timeframe: ${tf}`);
                return;
            }
            
            this.timeframe = tf;
            this.resetUpdateInterval(); // Reset update interval when timeframe changes
        } catch (error) {
            console.error("[SimulatorGraphController] Error in setTimeframe:", error);
        }
    }

    updateBuySellInterface() {
        try {
            if (!this.focusedStock) return;
            
            const marketPrice = this.focusedStock.marketPrice || 0;
            
            // Update buy price
            const buyPriceElement = document.getElementById("spanStockBuyPrice");
            if (buyPriceElement) {
                buyPriceElement.textContent = `$${marketPrice.toFixed(2)}`;
            }

            // Update sell price
            const sellPriceElement = document.getElementById("spanStockSellPrice");
            if (sellPriceElement) {
                sellPriceElement.textContent = `$${marketPrice.toFixed(2)}`;
            }

            // Safely get quantity values from inputs
            let buyQuantity = 0;
            const buyQuantityInput = document.getElementById("inputStockBuyQuantity");
            if (buyQuantityInput) {
                buyQuantity = parseInt(buyQuantityInput.value) || 0;
            }
            
            let sellQuantity = 0;
            const sellQuantityInput = document.getElementById("inputStockSellQuantity");
            if (sellQuantityInput) {
                sellQuantity = parseInt(sellQuantityInput.value) || 0;
            }

            // Update totals
            const buyTotalElement = document.getElementById("spanStockBuyPriceTotal");
            if (buyTotalElement) {
                buyTotalElement.textContent = `Total: $${(marketPrice * buyQuantity).toFixed(2)}`;
            }

            const sellTotalElement = document.getElementById("spanStockSellPriceTotal");
            if (sellTotalElement) {
                sellTotalElement.textContent = `Total: $${(marketPrice * sellQuantity).toFixed(2)}`;
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in updateBuySellInterface:", error);
        }
    }

    drawGraph() {
        try {
            if (!this.ctx || !this.focusedStock) return;
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

            // Get price history
            const priceHistory = this.focusedStock.priceHistory;
            if (!Array.isArray(priceHistory) || priceHistory.length === 0) {
                this.displayNoDataMessage();
                return;
            }

            // Filter out any non-numeric values
            const validPrices = priceHistory.filter(price => typeof price === 'number' && !isNaN(price));
            if (validPrices.length === 0) {
                this.displayNoDataMessage();
                return;
            }

            // Determine price range for y-axis
            let minPrice = Math.min(...validPrices);
            let maxPrice = Math.max(...validPrices);

            // Handle the case where min and max are the same (flat line)
            if (minPrice === maxPrice) {
                minPrice = minPrice * 0.95;
                maxPrice = maxPrice * 1.05;
            }

            // Add some padding to the range
            const pricePadding = (maxPrice - minPrice) * 0.1;
            minPrice = Math.max(0, minPrice - pricePadding);
            maxPrice = maxPrice + pricePadding;

            // Draw grid lines and labels
            this.drawGrid(minPrice, maxPrice);

            // Draw stock price line
            this.drawPriceLine(validPrices, minPrice, maxPrice);

            // Draw time frame label
            this.drawTimeframeLabel();
        } catch (error) {
            console.error("[SimulatorGraphController] Error in drawGraph:", error);
            this.displayErrorMessage();
        }
    }

    displayNoDataMessage() {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = "#6B7280"; // Gray-500
        this.ctx.font = "16px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            "No price data available", 
            this.CANVAS_WIDTH / 2, 
            this.CANVAS_HEIGHT / 2
        );
    }

    displayErrorMessage() {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = "#EF4444"; // Red-500
        this.ctx.font = "16px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            "Error drawing graph", 
            this.CANVAS_WIDTH / 2, 
            this.CANVAS_HEIGHT / 2
        );
    }

    drawGrid(minPrice, maxPrice) {
        try {
            if (!this.ctx) return;
            
            this.ctx.strokeStyle = "#E5E7EB"; // Gray-200
            this.ctx.lineWidth = 1;

            // Draw horizontal grid lines
            for (let i = 0; i <= this.GRID_LINES; i++) {
                const y = this.GRAPH_PADDING + (i * (this.CANVAS_HEIGHT - 2 * this.GRAPH_PADDING) / this.GRID_LINES);

                // Draw grid line
                this.ctx.beginPath();
                this.ctx.moveTo(this.GRAPH_PADDING, y);
                this.ctx.lineTo(this.CANVAS_WIDTH - this.GRAPH_PADDING, y);
                this.ctx.stroke();

                // Draw price label
                const marketPrice = maxPrice - ((maxPrice - minPrice) * i / this.GRID_LINES);
                this.ctx.fillStyle = "#6B7280"; // Gray-500
                this.ctx.font = "12px Arial";
                this.ctx.textAlign = "right";
                this.ctx.fillText(`$${marketPrice.toFixed(2)}`, this.GRAPH_PADDING - 8, y + 4);
            }

            // Draw vertical grid lines (time)
            const numVerticalLines = 4; // Including start and end
            for (let i = 0; i <= numVerticalLines; i++) {
                const x = this.GRAPH_PADDING + (i * (this.CANVAS_WIDTH - 2 * this.GRAPH_PADDING) / numVerticalLines);

                // Draw grid line
                this.ctx.beginPath();
                this.ctx.moveTo(x, this.GRAPH_PADDING);
                this.ctx.lineTo(x, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
                this.ctx.stroke();
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in drawGrid:", error);
        }
    }

    drawPriceLine(priceHistory, minPrice, maxPrice) {
        try {
            if (!this.ctx) return;
            if (priceHistory.length < 2) return;

            // Calculate starting point for graph
            const dataLength = priceHistory.length;
            const startIndex = Math.max(0, dataLength - this.NUM_POINTS);
            const visiblePrices = priceHistory.slice(startIndex);

            // Draw price line
            this.ctx.strokeStyle = "#2563EB"; // Blue-600
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();

            for (let i = 0; i < visiblePrices.length; i++) {
                const pointsToUse = Math.max(1, visiblePrices.length - 1);
                const x = this.GRAPH_PADDING + (i * (this.CANVAS_WIDTH - 2 * this.GRAPH_PADDING) / pointsToUse);
                
                // Safely calculate y position
                let y;
                if (maxPrice === minPrice) {
                    // Handle flat line case
                    y = this.CANVAS_HEIGHT / 2;
                } else {
                    y = this.CANVAS_HEIGHT - this.GRAPH_PADDING -
                        ((visiblePrices[i] - minPrice) / (maxPrice - minPrice) *
                        (this.CANVAS_HEIGHT - 2 * this.GRAPH_PADDING));
                }

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();

            // Add gradient fill underneath the line
            const gradient = this.ctx.createLinearGradient(0, this.GRAPH_PADDING, 0, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
            gradient.addColorStop(0, "rgba(37, 99, 235, 0.2)");  // Blue-600 with transparency
            gradient.addColorStop(1, "rgba(37, 99, 235, 0)");    // Transparent at bottom

            this.ctx.fillStyle = gradient;
            this.ctx.lineTo(this.CANVAS_WIDTH - this.GRAPH_PADDING, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
            this.ctx.lineTo(this.GRAPH_PADDING, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
            this.ctx.closePath();
            this.ctx.fill();
        } catch (error) {
            console.error("[SimulatorGraphController] Error in drawPriceLine:", error);
        }
    }

    drawTimeframeLabel() {
        try {
            if (!this.ctx) return;
            
            const timeframeConfig = this.TIME_FRAMES[this.timeframe];
            if (!timeframeConfig) return;
            
            this.ctx.fillStyle = "#6B7280"; // Gray-500
            this.ctx.font = "14px Arial";
            this.ctx.textAlign = "left";
            this.ctx.fillText(timeframeConfig.label, this.GRAPH_PADDING, this.GRAPH_PADDING - 15);
        } catch (error) {
            console.error("[SimulatorGraphController] Error in drawTimeframeLabel:", error);
        }
    }

    populateStockDropdown(stockList) {
        try {
            if (!Array.isArray(stockList) || stockList.length === 0) {
                console.warn("[SimulatorGraphController] No stocks available for dropdown");
                return;
            }
            
            // Get the select element
            const selectElement = document.getElementById("selectStock");
            if (!selectElement) {
                console.error("[SimulatorGraphController] Select element not found");
                return;
            }

            selectElement.innerHTML = ""; // Clear existing options

            // Populate the dropdown menu
            stockList.forEach(stock => {
                if (!stock || !stock.symbol || !stock.companyName) return;
                
                const option = document.createElement("option");
                option.value = stock.symbol;
                option.textContent = `${stock.companyName} (${stock.symbol})`;
                selectElement.appendChild(option);
            });
            
            // Set initial selection if we have a focused stock
            if (this.focusedStock && this.focusedStock.symbol) {
                selectElement.value = this.focusedStock.symbol;
            }
        } catch (error) {
            console.error("[SimulatorGraphController] Error in populateStockDropdown:", error);
        }
    }

    // Call this method to stop updates when the component is no longer needed
    // (for example, when navigating away from the page)
    cleanup() {
        try {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            // Additional cleanup
            this.canvas = null;
            this.ctx = null;
            this.focusedStock = null;
            this.userProfile = null;
            this.isInitialized = false;
            
            console.log("[SimulatorGraphController] Cleanup complete");
        } catch (error) {
            console.error("[SimulatorGraphController] Error in cleanup:", error);
        }
    }
}