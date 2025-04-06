// Updated simulator graph controller
// This handles the stock chart visualization and interactions
//FIXME: problem with graph line rendering in after my refactor, will fix

// Canvas graph setup
const canvas = document.getElementById("stockCanvas");
const ctx = canvas.getContext("2d");

// Graph constants
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const GRAPH_PADDING = 60;
const GRID_LINES = 5;
const GRID_LABEL_OFFSET = 10;
const NUM_POINTS = 50;

// TimeFrame settings
const TIME_FRAMES = {
    "1D": { interval: 500, label: "Today" },    // in milliseconds
    "1W": { interval: 3500, label: "This Week" },
    "1M": { interval: 7000, label: "This Month" }
};

// State variables
let timeframe = "1D";
let currentStock = "AAPL";
let updateInterval = null;

// Initialize more diverse stock list
const userStocks = [
    new Stock("AAPL", "Apple Inc.", 175.30, 5000000),
    new Stock("GOOGL", "Alphabet Inc.", 2800.50, 3000000),
    new Stock("TSLA", "Tesla Inc.", 850.75, 7000000),
    new Stock("AMZN", "Amazon.com Inc.", 3450.20, 4000000),
    new Stock("MSFT", "Microsoft Corporation", 305.20, 3500000),
    new Stock("META", "Meta Platforms Inc.", 320.70, 2800000),
    new Stock("NFLX", "Netflix Inc.", 580.90, 1500000),
    new Stock("NVDA", "NVIDIA Corporation", 480.50, 2200000),
    new Stock("PFE", "Pfizer Inc.", 48.30, 1800000),
    new Stock("DIS", "The Walt Disney Company", 155.40, 1600000)
];

/**
 * Changes the selected stock
 */
function changeFocusedStock() {
    const stockSelect = document.getElementById("stockSelect");
    currentStock = stockSelect.value;

    // Reset price history
    const selectedStock = getCurrentStock();

    // Update buy/sell interface
    updateBuySellInterface();

    // Start new interval with selected timeframe
    resetUpdateInterval();

    // Update current stock display
    updateCurrentStockDisplay();
}

/**
 * Sets the stock timeframe
 */
function setTimeframe(tf) {
    timeframe = tf;

    // Reset stock price movements based on new timeframe
    resetUpdateInterval();
}

/**
 * Resets the update interval based on current timeframe
 */
function resetUpdateInterval() {
    // Clear existing interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    // Set new interval
    updateInterval = setInterval(() => {
        updateStockPrice();
    }, TIME_FRAMES[timeframe].interval);

    // Trigger immediate update
    updateStockPrice();
}

/**
 * Updates the current stock price
 */
function updateStockPrice() {
    const stock = getCurrentStock();
    if (!stock) return;

    // Update price
    stock.updatePrice();

    // Update UI
    updateCurrentStockDisplay();

    // Redraw graph
    drawGraph();
}

/**
 * Updates the buy/sell interface with current stock price
 */
function updateBuySellInterface() {
    const stock = getCurrentStock();
    if (!stock) return;

    // Update buy price
    const buyPriceElement = document.getElementById("buy-price");
    if (buyPriceElement) {
        buyPriceElement.textContent = `$${stock.price.toFixed(2)}`;
    }

    // Update sell price
    const sellPriceElement = document.getElementById("sell-price");
    if (sellPriceElement) {
        sellPriceElement.textContent = `$${stock.price.toFixed(2)}`;
    }

    // Update totals
    const buyQuantity = parseInt(document.getElementById("buy-quantity").value) || 0;
    const buyTotalElement = document.getElementById("buy-total");
    if (buyTotalElement) {
        buyTotalElement.textContent = `$${(stock.price * buyQuantity).toFixed(2)}`;
    }

    const sellQuantity = parseInt(document.getElementById("sell-quantity").value) || 0;
    const sellTotalElement = document.getElementById("sell-total");
    if (sellTotalElement) {
        sellTotalElement.textContent = `$${(stock.price * sellQuantity).toFixed(2)}`;
    }
}

/**
 * Draws the stock graph
 */
function drawGraph() {
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

/**
 * Draws the grid lines and labels
 */
function drawGrid(minPrice, maxPrice) {
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
        const price = maxPrice - ((maxPrice - minPrice) * i / GRID_LINES);
        ctx.fillStyle = "#6B7280"; // Gray-500
        ctx.font = "12px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`$${price.toFixed(2)}`, GRAPH_PADDING - 8, y + 4);
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

/**
 * Draws the stock price line
 */
function drawPriceLine(priceHistory, minPrice, maxPrice) {
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
        const x = GRAPH_PADDING + (i * (CANVAS_WIDTH - 2 * GRAPH_PADDING) / (NUM_POINTS - 1));
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

    // Add gradient fill under the line
    const lastX = GRAPH_PADDING + ((visiblePrices.length - 1) * (CANVAS_WIDTH - 2 * GRAPH_PADDING) / (NUM_POINTS - 1));
    const lastY = CANVAS_HEIGHT - GRAPH_PADDING -
        ((visiblePrices[visiblePrices.length - 1] - minPrice) / (maxPrice - minPrice) *
            (CANVAS_HEIGHT - 2 * GRAPH_PADDING));

    ctx.lineTo(lastX, CANVAS_HEIGHT - GRAPH_PADDING);
    ctx.lineTo(GRAPH_PADDING, CANVAS_HEIGHT - GRAPH_PADDING);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, GRAPH_PADDING, 0, CANVAS_HEIGHT - GRAPH_PADDING);
    gradient.addColorStop(0, "rgba(37, 99, 235, 0.2)"); // Blue-600 with opacity
    gradient.addColorStop(1, "rgba(37, 99, 235, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw current price dot
    if (visiblePrices.length > 0) {
        const currentPrice = visiblePrices[visiblePrices.length - 1];
        const x = lastX;
        const y = lastY;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#2563EB"; // Blue-600
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

/**
 * Draws the timeframe label
 */
function drawTimeframeLabel() {
    ctx.fillStyle = "#6B7280"; // Gray-500
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(TIME_FRAMES[timeframe].label, GRAPH_PADDING, GRAPH_PADDING - 15);
}

/**
 * Populates the stock select dropdown
 */
function populateStockDropdown() {
    const stockSelect = document.getElementById("stockSelect");
    if (!stockSelect) return;

    stockSelect.innerHTML = ""; // Clear existing options

    userStocks.forEach(stock => {
        const option = document.createElement("option");
        option.value = stock.symbol;
        option.textContent = `${stock.name} (${stock.symbol})`;
        stockSelect.appendChild(option);
    });

    // Set initial selection
    stockSelect.value = currentStock;
}

/**
 * Helper function to get current stock object
 */
function getCurrentStock() {
    return userStocks.find(stock => stock.symbol === currentStock);
}

// Initialize everything when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Populate stock dropdown
    populateStockDropdown();

    // Set up initial display
    updateCurrentStockDisplay();

    // Start price updates
    resetUpdateInterval();

    // Set up buy/sell quantity change handlers
    const buyQuantityInput = document.getElementById('buy-quantity');
    if (buyQuantityInput) {
        buyQuantityInput.addEventListener('change', updateBuySellInterface);
    }

    const sellQuantityInput = document.getElementById('sell-quantity');
    if (sellQuantityInput) {
        sellQuantityInput.addEventListener('change', updateBuySellInterface);
    }
});