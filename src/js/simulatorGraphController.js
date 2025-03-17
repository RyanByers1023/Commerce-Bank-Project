// Canvas graph setup
const canvas = document.getElementById("stockCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const GRAPH_PADDING = 60;

// Stock data settings
const DEFAULT_TIMEFRAME = "1D";
const DEFAULT_STOCK = "AAPL";
const DEFAULT_PRICE = 100;
const NUM_POINTS = 50;

// Price constraints
const PRICE_MIN = 50;
const PRICE_MAX = 200;

// Stock simulation settings
const RANDOM_CHANGE_SCALE = 2.5;
const CRASH_BOOST_THRESHOLD = 40;
const CRASH_BOOST_PROBABILITY = 0.07;
const CRASH_BOOST_IMPACT = 18;
const RESET_SCALING_FACTOR = 0.3;

// Graph axis settings
const GRID_LINES = 5;
const GRID_LABEL_OFFSET = 10;
const PRICE_INTERVAL = 25;

// Time settings
const UPDATE_INTERVAL = 500; // in milliseconds

// State variables
let timeframe = DEFAULT_TIMEFRAME;
let currentStock = DEFAULT_STOCK;
let hypeFactor = 0;
let stockPrices = Array(NUM_POINTS).fill(DEFAULT_PRICE);
let timeSinceLastCrash = 0;
let timeSinceLastBoost = 0;

/**
 * Fetches stock data from the API
 */
async function fetchStockData() {
    try {
        const response = await fetch(`/api/stocks?symbol=${currentStock}&timeframe=${timeframe}`);
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        stockPrices = data.prices || stockPrices;
        hypeFactor = data.hypeFactor || 0;
        timeSinceLastCrash = data.timeSinceLastCrash || 0;
        timeSinceLastBoost = data.timeSinceLastBoost || 0;

        drawGraph();
    } catch (error) {
        console.error("Error fetching stock data:", error);
    }
}

/**
 * Updates stock price with smooth adjustments
 */
function smoothPriceUpdate() {
    let lastPrice = stockPrices[stockPrices.length - 1];

    // Random price change with hype factor
    let change = (Math.random() - 0.5) * RANDOM_CHANGE_SCALE + hypeFactor;

    // Increment time trackers
    timeSinceLastCrash++;
    timeSinceLastBoost++;

    // Possible crash event
    if (timeSinceLastCrash > CRASH_BOOST_THRESHOLD && Math.random() < CRASH_BOOST_PROBABILITY) {
        change -= Math.random() * CRASH_BOOST_IMPACT;
        timeSinceLastCrash = Math.floor(timeSinceLastCrash * RESET_SCALING_FACTOR);
    }

    // Possible boost event
    if (timeSinceLastBoost > CRASH_BOOST_THRESHOLD && Math.random() < CRASH_BOOST_PROBABILITY) {
        change += Math.random() * CRASH_BOOST_IMPACT;
        timeSinceLastBoost = Math.floor(timeSinceLastBoost * RESET_SCALING_FACTOR);
    }

    // Apply price bounds
    let newPrice = Math.max(PRICE_MIN, Math.min(PRICE_MAX, lastPrice + change));

    // Update stock price list
    stockPrices.shift();
    stockPrices.push(newPrice);

    // Update the graph
    drawGraph();
}

/**
 * Draws the stock graph
 */
function drawGraph() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines
    ctx.strokeStyle = "#6B7280";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    for (let i = 0; i <= GRID_LINES; i++) {
        let y = GRAPH_PADDING + (i * (CANVAS_HEIGHT - 2 * GRAPH_PADDING) / GRID_LINES);
        ctx.beginPath();
        ctx.moveTo(GRAPH_PADDING, y);
        ctx.lineTo(CANVAS_WIDTH - GRAPH_PADDING, y);
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = "#374151";
        ctx.globalAlpha = 1;
        ctx.fillText(`$${(150 - i * PRICE_INTERVAL).toFixed(0)}`, GRID_LABEL_OFFSET, y + 5);
    }

    // Draw stock price line
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1;
    ctx.beginPath();

    for (let i = 0; i < stockPrices.length; i++) {
        let x = GRAPH_PADDING + (i * (CANVAS_WIDTH - 2 * GRAPH_PADDING) / NUM_POINTS);
        let y = CANVAS_HEIGHT - GRAPH_PADDING - (stockPrices[i] - PRICE_MIN) * (CANVAS_HEIGHT - 2 * GRAPH_PADDING) / 100;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

/**
 * Sets the stock timeframe
 */
function setTimeframe(tf) {
    timeframe = tf;
    fetchStockData();
}

/**
 * Changes the selected stock
 */
function changeStock() {
    currentStock = document.getElementById("stockSelect").value;
    fetchStockData();
}

// Start price updates at a fixed interval
setInterval(smoothPriceUpdate, UPDATE_INTERVAL);
fetchStockData();
