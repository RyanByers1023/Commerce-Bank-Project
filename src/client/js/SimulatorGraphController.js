export default class SimulatorGraphController{
    constructor(userProfile) {
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

        //preset timeframe to 1 day
        this.timeframe = "1D";
        this.userProfile = userProfile;
        this.canvas = null;
        this.ctx = null;
        this.updateInterval = null;

        //get the first stock in the stocksAddedToSim list and display this stock on the graph
        this.focusedStock = userProfile.stocksAddedToSim[0];

        // Initialize after DOM is loaded
        this.initWhenReady();
    }

    initWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.instantiateCanvas());
        } else {
            // DOM already loaded, initialize immediately
            this.instantiateCanvas();
        }
    }

    instantiateCanvas() {
        this.canvas = document.getElementById("stockCanvas");

        if (this.canvas) {
            this.ctx = this.canvas.getContext("2d");
            // Set actual dimensions from the DOM element
            this.CANVAS_WIDTH = this.canvas.width;
            this.CANVAS_HEIGHT = this.canvas.height;

            // Set up real-time updates
            this.populateStockDropdown(this.userProfile.stocksAddedToSim);
            this.updateCurrentStockDisplay();
            this.setupEventListeners();
            this.resetUpdateInterval();

            // Draw initial graph
            this.drawGraph();
        } else {
            console.error("Canvas element not found");
        }
    }

    setupEventListeners() {
        // Set up stock selection change listener
        const stockSelect = document.getElementById("selectStock");
        if (stockSelect) {
            stockSelect.addEventListener('change', (e) => {
                this.setFocusedStock(e.target.value);
            });
        }

        // Set up timeframe buttons
        const timeframeButtons = document.querySelectorAll('[data-timeframe]');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tf = e.target.dataset.timeframe;
                this.setTimeframe(tf);
            });
        });

        // Set up quantity input listeners for buy/sell
        const buyQuantityInput = document.getElementById('inputStockBuyQuantity');
        if (buyQuantityInput) {
            buyQuantityInput.addEventListener('input', () => this.updateBuySellInterface());
        }

        const sellQuantityInput = document.getElementById('inputStockSellQuantity');
        if (sellQuantityInput) {
            sellQuantityInput.addEventListener('input', () => this.updateBuySellInterface());
        }
    }

    setFocusedStock(stockSymbol) {
        // Find the stock in the user's portfolio
        const stock = this.getStock(stockSymbol, this.userProfile);
        if (stock) {
            this.focusedStock = stock;
            this.updateCurrentStockDisplay();
            this.resetUpdateInterval(); // Reset timer when stock changes
        }
    }

    getStock(selectedStockSymbol, userProfile) {
        return this.userProfile.stocksAddedToSim.find(stock => stock.symbol === selectedStockSymbol);
    }

    resetUpdateInterval() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Set new interval based on selected timeframe
        this.updateInterval = setInterval(() => {
            this.updateAllStockPrices();
        }, this.TIME_FRAMES[this.timeframe].interval);

        // Trigger immediate update
        this.updateAllStockPrices();
    }

    // New method to update all stocks at once
    updateAllStockPrices() {
        if (!this.userProfile || !this.userProfile.stocksAddedToSim) return;

        // Update prices for all stocks in the simulation
        this.userProfile.stocksAddedToSim.forEach(stock => {
            stock.updatePrice();
        });

        // Update displays only if a stock is currently focused
        if (this.focusedStock) {
            this.updateCurrentStockDisplay();
            this.updateBuySellInterface();
            this.drawGraph();
        }

        // Update portfolio value and other global displays

        /* TODO: implement these two functions
        this.updatePortfolioValue();
        this.updateWatchlistDisplay();
        */
    }

    updateCurrentStockDisplay() {
        // Update stock price display
        const priceElement = document.getElementById("spanStockPrice");
        if (priceElement) {
            priceElement.textContent = `$${this.focusedStock.marketPrice.toFixed(2)}`;
        }

        // Update stock name/symbol display
        const nameElement = document.getElementById("spanStockName");
        if (nameElement) {
            nameElement.textContent = `${this.focusedStock.companyName} (${this.focusedStock.symbol})`;
        }

        // Update price change
        const changeElement = document.getElementById("spanStockPriceChange");
        if (changeElement) {
            const change = this.focusedStock.marketPrice - this.focusedStock.previousClosePrice;
            const changePercent = (change / this.focusedStock.previousClosePrice) * 100;

            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
            changeElement.className = change >= 0 ? 'text-green-500' : 'text-red-500';
        }
    }

    setTimeframe(tf) {
        if (this.TIME_FRAMES[tf]) {
            this.timeframe = tf;
            this.resetUpdateInterval(); // Reset update interval when timeframe changes
        }
    }

    updateBuySellInterface() {
        // Update buy price
        const buyPriceElement = document.getElementById("spanStockBuyPrice");
        if (buyPriceElement) {
            buyPriceElement.textContent = `$${this.focusedStock.marketPrice.toFixed(2)}`;
        }

        // Update sell price
        const sellPriceElement = document.getElementById("spanStockSellPrice");
        if (sellPriceElement) {
            sellPriceElement.textContent = `$${this.focusedStock.marketPrice.toFixed(2)}`;
        }

        // Update totals
        const buyQuantity = parseInt(document.getElementById("inputStockBuyQuantity").value) || 0;
        const buyTotalElement = document.getElementById("spanStockBuyPriceTotal");
        if (buyTotalElement) {
            buyTotalElement.textContent = `$${(this.focusedStock.marketPrice * buyQuantity).toFixed(2)}`;
        }

        const sellQuantity = parseInt(document.getElementById("inputStockSellQuantity").value) || 0;
        const sellTotalElement = document.getElementById("spanStockSellPriceTotal");
        if (sellTotalElement) {
            sellTotalElement.textContent = `$${(this.focusedStock.marketPrice * sellQuantity).toFixed(2)}`;
        }
    }

    drawGraph() {
        if (!this.ctx || !this.focusedStock) return;
        // Clear canvas
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

        // Get price history
        const priceHistory = this.focusedStock.priceHistory;
        if (!priceHistory || priceHistory.length === 0) return;

        // Determine price range for y-axis
        let minPrice = Math.min(...priceHistory);
        let maxPrice = Math.max(...priceHistory);

        // Add some padding to the range
        const pricePadding = (maxPrice - minPrice) * 0.1;
        minPrice = Math.max(0, minPrice - pricePadding);
        maxPrice = maxPrice + pricePadding;

        // Draw grid lines and labels
        this.drawGrid(minPrice, maxPrice);

        // Draw stock price line
        this.drawPriceLine(priceHistory, minPrice, maxPrice);

        // Draw time frame label
        this.drawTimeframeLabel();
    }

    drawGrid(minPrice, maxPrice) {
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
    }

    drawPriceLine(priceHistory, minPrice, maxPrice) {
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
            const y = this.CANVAS_HEIGHT - this.GRAPH_PADDING -
                ((visiblePrices[i] - minPrice) / (maxPrice - minPrice) *
                    (this.CANVAS_HEIGHT - 2 * this.GRAPH_PADDING));

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // gradient fill underneath the line:
        const gradient = this.ctx.createLinearGradient(0, this.GRAPH_PADDING, 0, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
        gradient.addColorStop(0, "rgba(37, 99, 235, 0.2)");  // Blue-600 with transparency
        gradient.addColorStop(1, "rgba(37, 99, 235, 0)");    // Transparent at bottom

        this.ctx.fillStyle = gradient;
        this.ctx.lineTo(this.CANVAS_WIDTH - this.GRAPH_PADDING, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
        this.ctx.lineTo(this.GRAPH_PADDING, this.CANVAS_HEIGHT - this.GRAPH_PADDING);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawTimeframeLabel() {
        this.ctx.fillStyle = "#6B7280"; // Gray-500
        this.ctx.font = "14px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(this.TIME_FRAMES[this.timeframe].label, this.GRAPH_PADDING, this.GRAPH_PADDING - 15);
    }


    populateStockDropdown(stockList) {
        //get the selected stock from the simulator.html:
        const stockSelect = document.getElementById("stockSelect");

        if (!stockSelect){
            return;
        }

        stockSelect.innerHTML = ""; // Clear existing options

        //populate the drop down menu:
        stockList.forEach(stock => {
            const option = document.createElement("option");
            option.value = stock.symbol;
            option.textContent = `${stock.companyName} (${stock.symbol})`;
            stockSelect.appendChild(option);
        });
    }

    // Call this method to stop updates when the component is no longer needed
    // (for example, when navigating away from the page)
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}