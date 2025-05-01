// Updated simulator graph controller
// This handles the stock chart visualization and interactions

//TODO: rename variables pertaining to simulator.html elements to match variable names within simulator.html (i renamed some of them)

export default class SimulatorGraphController{
    SimulatorGraphController(userProfile){
        this.canvas = null;
        this.ctx = null;

        // Graph constants
        this.CANVAS_WIDTH = this.canvas?.width || 800;
        this.CANVAS_HEIGHT = this.canvas?.height || 600;
        this.GRAPH_PADDING = 60;
        this.GRID_LINES = 5;
        this.NUM_POINTS = 50;

        // TimeFrame settings
        this.TIME_FRAMES = {
            "1D": { interval: 500, label: "Today" },    // in milliseconds
            "1W": { interval: 3500, label: "This Week" },
            "1M": { interval: 7000, label: "This Month" }
        };

        //preset timeframe to 1 day:
        this.timeframe = "1D";

        //get the first stock in the stocksAddedToSim list and display this stock on the graph
        this.focusedStock = userProfile.stocksAddedToSim[0];
        this.updateInterval = null;

        updateCurrentStockDisplay(userProfile);

        this.instantiateCanvas(userProfile);
    }

    instantiateCanvas(userProfile){
        document.addEventListener('DOMContentLoaded', () => {
            this.canvas = document.getElementById("stockCanvas");

            if (this.canvas) {
                this.ctx = this.canvas.getContext("2d");
                window.ctx = this.ctx;
            } else {
                console.error("Canvas element not found");
            }

            this.populateStockDropdown(userProfile.stocksAddedToSim);
            this.updateCurrentStockDisplay();
            this.resetUpdateInterval();

            const buyQuantityInput = document.getElementById('buy-quantity');

            this.updateBuySellInterface(buyQuantityInput);
            this.setFocusedStock(userProfile);
        });
    }

    setFocusedStock(userProfile) {
        //get the user selected stock from the selectStock select element (drop-down menu)
        let selectedStock = document.getElementById("selectStock");

        // Update current stock display
        updateCurrentStockDisplay(selectedStock);
    }

    getStock(selectedStockSymbol, userProfile) {
        return userProfile.stocksAddedToSim.find(stock => stock.symbol === selectedStockSymbol);
    }

    resetUpdateInterval(){
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(updateInterval);
        }

        // Set new interval
        this.updateInterval = setInterval(() => {
            updateStockPrice();
        }, this.TIME_FRAMES[timeframe].interval);

        // Trigger immediate update
        this.updateStockPrice();
    }

    updateStockPrice() {
        if (!this.selectedStock) return;

        // Update price
        stock.updatePrice();

        // Update UI
        updateCurrentStockDisplay();

        // Redraw graph
        drawGraph();
    }

    updateCurrentStockDisplay() {
        const stock = getCurrentStock();
        if (!stock) return;

        // Update stock price display
        const priceElement = document.getElementById("stockPrice");
        if (priceElement) {
            priceElement.textContent = `$${stock.marketPrice.toFixed(2)}`;
        }

        // Update stock name/symbol display
        const nameElement = document.getElementById("stockName");
        if (nameElement) {
            nameElement.textContent = `${stock.companyName} (${stock.symbol})`;
        }

        // Update price change
        const changeElement = document.getElementById("priceChange");
        if (changeElement) {
            const change = stock.marketPrice - stock.previousClosePrice;
            const changePercent = (change / stock.previousClosePrice) * 100;

            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
            changeElement.className = change >= 0 ? 'text-green-500' : 'text-red-500';
        }
    }

    setTimeframe(tf) {
        this.timeframe = tf;
    }


    updateBuySellInterface() {
        const stock = getCurrentStock();
        if (!stock) return;

        // Update buy price
        const buyPriceElement = document.getElementById("buy-price");
        if (buyPriceElement) {
            buyPriceElement.textContent = `$${stock.marketPrice.toFixed(2)}`;
        }

        // Update sell price
        const sellPriceElement = document.getElementById("sell-price");
        if (sellPriceElement) {
            sellPriceElement.textContent = `$${stock.marketPrice.toFixed(2)}`;
        }

        // Update totals
        const buyQuantity = parseInt(document.getElementById("buy-quantity").value) || 0;
        const buyTotalElement = document.getElementById("buy-total");
        if (buyTotalElement) {
            buyTotalElement.textContent = `$${(stock.marketPrice * buyQuantity).toFixed(2)}`;
        }

        const sellQuantity = parseInt(document.getElementById("sell-quantity").value) || 0;
        const sellTotalElement = document.getElementById("sell-total");
        if (sellTotalElement) {
            sellTotalElement.textContent = `$${(stock.marketPrice * sellQuantity).toFixed(2)}`;
        }
    }

    drawGraph() {
        const stock = getCurrentStock();
        if (!stock || !ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Get price history
        const priceHistory = stock.priceHistory;

        // Determine price range for y-axis
        let minPrice = Math.min(...priceHistory);
        let maxPrice = Math.max(...priceHistory);

        // Add some padding to the range
        const pricePadding = (maxPrice - minPrice) * 0.1;
        minPrice = Math.max(0, minPrice - pricePadding);
        maxPrice = maxPrice + pricePadding;

        // Draw grid lines and labels
        drawGrid(minPrice, maxPrice);

        // Draw stock price line
        drawPriceLine(priceHistory, minPrice, maxPrice);

        // Draw time frame label
        drawTimeframeLabel();
    }

    drawGrid(minPrice, maxPrice) {
        ctx.strokeStyle = "#E5E7EB"; // Gray-200
        ctx.lineWidth = 1;

        // Draw horizontal grid lines
        for (let i = 0; i <= GRID_LINES; i++) {
            const y = GRAPH_PADDING + (i * (CANVAS_HEIGHT - 2 * GRAPH_PADDING) / GRID_LINES);

            // Draw grid line
            ctx.beginPath();
            ctx.moveTo(GRAPH_PADDING, y);
            ctx.lineTo(CANVAS_WIDTH - GRAPH_PADDING, y);
            ctx.stroke();

            // Draw price label
            const marketPrice = maxPrice - ((maxPrice - minPrice) * i / GRID_LINES);
            ctx.fillStyle = "#6B7280"; // Gray-500
            ctx.font = "12px Arial";
            ctx.textAlign = "right";
            ctx.fillText(`$${marketPrice.toFixed(2)}`, GRAPH_PADDING - 8, y + 4);
        }

        // Draw vertical grid lines (time)
        const numVerticalLines = 4; // Including start and end
        for (let i = 0; i <= numVerticalLines; i++) {
            const x = GRAPH_PADDING + (i * (CANVAS_WIDTH - 2 * GRAPH_PADDING) / numVerticalLines);

            // Draw grid line
            ctx.beginPath();
            ctx.moveTo(x, GRAPH_PADDING);
            ctx.lineTo(x, CANVAS_HEIGHT - GRAPH_PADDING);
            ctx.stroke();
        }
    }

    drawPriceLine(priceHistory, minPrice, maxPrice) {
        if (priceHistory.length < 2) return;

        // Calculate starting point for graph
        const dataLength = priceHistory.length;
        const startIndex = Math.max(0, dataLength - NUM_POINTS);
        const visiblePrices = priceHistory.slice(startIndex);

        // Draw price line
        ctx.strokeStyle = "#2563EB"; // Blue-600
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < visiblePrices.length; i++) {
            const pointsToUse = Math.max(1, visiblePrices.length - 1);
            const x = GRAPH_PADDING + (i * (CANVAS_WIDTH - 2 * GRAPH_PADDING) / pointsToUse);
            const y = CANVAS_HEIGHT - GRAPH_PADDING -
                ((visiblePrices[i] - minPrice) / (maxPrice - minPrice) *
                    (CANVAS_HEIGHT - 2 * GRAPH_PADDING));

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    drawTimeframeLabel() {
        ctx.fillStyle = "#6B7280"; // Gray-500
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.fillText(TIME_FRAMES[timeframe].label, GRAPH_PADDING, GRAPH_PADDING - 15);
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
}