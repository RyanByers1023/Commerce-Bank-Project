// News Generator - Creates simulated news items that affect stock prices

class NewsGenerator {
    //retrieve holdingsMap via User.Portfolio.holdingsMap
    constructor(holdingsMap) {
        //maintain a history of previous stories, initialize with empty array:
        this.newsHistory = [];

        //stores Stock objects, maintain a list of all stocks the user is invested in
        this.stockList = [];

        this.newsTypes = this.initializeNewsTypes();
    }

    initializeNewsTypes(){
        return {
            positive: [
                { text: "{company} Reports Strong Quarterly Earnings", impact: 0.08 },
                { text: "{company} Announces New Product Line", impact: 0.06 },
                { text: "Analysts Upgrade {company} to 'Buy'", impact: 0.05 },
                { text: "{company} Secures Major Partnership Deal", impact: 0.07 },
                { text: "{company} Expands into New Markets", impact: 0.04 },
                { text: "Investors Bullish on {company}'s Future", impact: 0.03 },
                { text: "{company} Completes Successful Restructuring", impact: 0.05 },
                { text: "{company} Announces Stock Buyback Program", impact: 0.06 }
            ],
            negative: [
                { text: "{company} Misses Earnings Expectations", impact: -0.07 },
                { text: "Regulatory Investigation Launched into {company}", impact: -0.09 },
                { text: "Analysts Downgrade {company} to 'Sell'", impact: -0.05 },
                { text: "{company} CEO Steps Down Unexpectedly", impact: -0.08 },
                { text: "{company} Recalls Flagship Product", impact: -0.06 },
                { text: "{company} Faces New Competition in Core Market", impact: -0.04 },
                { text: "Labor Dispute Affects {company} Operations", impact: -0.05 },
                { text: "{company} Cuts Dividend Payments", impact: -0.06 }
            ],
            sectorPositive: [
                { text: "{sector} Sector Boosted by New Regulations", impact: 0.04 },
                { text: "Strong Growth Forecast for {sector} Industry", impact: 0.05 },
                { text: "Consumer Demand Surges in {sector} Market", impact: 0.03 },
                { text: "New Technology Revolutionizes {sector} Industry", impact: 0.04 }
            ],
            sectorNegative: [
                { text: "New Regulations May Hurt {sector} Companies", impact: -0.04 },
                { text: "Slowdown Expected in {sector} Sector", impact: -0.05 },
                { text: "Supply Chain Issues Affect {sector} Industry", impact: -0.03 },
                { text: "Market Uncertainty Impacts {sector} Stocks", impact: -0.04 }
            ],
            marketWide: [
                { text: "Markets Rally on Economic Data", impact: 0.03 },
                { text: "Fed Announces Interest Rate Decision", impact: -0.02 },
                { text: "Global Trade Tensions Affect Market Sentiment", impact: -0.03 },
                { text: "Economic Outlook Improves, Boosting Markets", impact: 0.02 }
            ]
        };
    }

    //returns void, call to updates the list of stocks the stories are made from
    updateStockList(userPortfolio){
        this.stockList = Array.from(userPortfolio.holdingsMap.values());
    }

    generateNewsItem() {
        // Decide news type
        const newsTypeRoll = Math.random();

        // generate company-specific news (40% chance)
        if (newsTypeRoll < 0.4) {
            return this.generateCompanyNews();
        }
        // generate sector-wide news (30% chance)
        else if (newsTypeRoll < 0.7) {
            //sector randomly chosen within generateSectorNews()
            return this.generateSectorNews();
        }
        // generate market-wide news (30% chance)
        else {
            return this.generateMarketNews()
        }
    }

    // returns newsItem (see createNewsItem()), generate company-specific news (40% chance)
    generateCompanyNews(){
        //type of news (positive or negative)
        //50/50 chance of positive or negative news
        let newsType = Math.random() < 0.5 ? 'POSITIVE' : 'NEGATIVE';

        //choose random Stock from stockList to write newsItem about, store in newsTarget
        let newsTarget = this.getRandomStoryTarget();

        //newsTemplate grabs a random story from either the positive or negative newsType map
        let newsTemplate = this.getNewsTemplate(newsType);

        let newsItem = this.createNewsItem(newsType, newsTarget, newsTemplate);

        // Apply impact to stock's current market sentiment with the impact value of this story
        newsTarget.updateCurrentSentiment(newsTemplate.impact);

        return newsItem;
    }

    // Sector-wide news (30% chance)
    generateSectorNews(){
        //type of news (positive or negative)
        //50/50 chance of positive or negative news
        const newsType = Math.random() < 0.5 ? 'POSITIVE' : 'NEGATIVE';

        const sectorTarget = this.getTargetSector();
        const newsTemplate = this.getNewsTemplate(newsType);

        // Create news item
        const newsItem = {
            headline: newsTemplate.text.replace('{sector}', selectedSector),
            type: newsType,
            target: {
                type: 'sector',
                name: sectorTarget
            },
            impact: newsTemplate.impact,
            timestamp: new Date()
        };

        // Apply impact to all stocks in this sector
        this.stocks.forEach(stock => {
            if (stock.sector === selectedSector) {
                stock.applySentimentChange(newsTemplate.impact);
            }
        });

        return newsItem;
    }

    //returns string, get random sector from current holdings
    getTargetSector(){
        return this.stockList[Math.floor(Math.random() * this.stockList.length)].sector;
    }


    createNewsItem(newsType, newsTarget, newsTemplate) {
        return {
            headline: newsTemplate.text.replace('{company}', newsTarget.companyName),
            type: newsType,
            target: {
                type: 'company',
                symbol: newsTarget.symbol,
                name: newsTarget.companyName
            },
            impact: newsTemplate.impact,
            timestamp: new Date()
        };
    }



    // return Stock object, returns a random stock object contained within stockList
    getRandomStoryTarget(){
        return this.stockList[Math.floor(Math.random() * this.stockList.length)];
    }

    getNewsTemplate(newsType){
        return this.newsTypes[newsType][Math.floor(Math.random() * this.newsTypes[newsType].length)];
    }

    // Market-wide news (30% chance)
    generateMarketNews(){
        const marketTemplateIndex = Math.floor(Math.random() * this.newsTypes.marketWide.length);
        let newsTemplate = this.newsTypes.marketWide[marketTemplateIndex];

        // Create news item
        const newsItem = {
            headline: newsTemplate.text,
            type: 'marketWide',
            target: {
                type: 'market',
                name: 'All Stocks'
            },
            impact: newsTemplate.impact,
            timestamp: new Date()
        };

        // Apply impact to all stocks
        this.stocks.forEach(stock => {
            stock.applySentimentChange(newsTemplate.impact * 0.7); // Reduced impact as it's spread across all stocks
        });

        return newsItem;

    // Generate multiple news items
    generateNews(count = 1) {
        const news = [];
        for (let i = 0; i < count; i++) {
            const newsItem = this.generateNewsItem();
            news.push(newsItem);
            this.newsHistory.push(newsItem);
        }

        // Keep history at a reasonable size
        if (this.newsHistory.length > 50) {
            this.newsHistory = this.newsHistory.slice(-50);
        }

        return news;
    }

    // Get color class based on news type
    getNewsTypeClass(type) {
        if (type === 'positive' || type === 'sectorPositive') {
            return 'text-green-600';
        } else if (type === 'negative' || type === 'sectorNegative') {
            return 'text-red-600';
        } else {
            return 'text-blue-600';
        }
    }

    // Update the news display in the UI
    updateNewsDisplay() {
        const newsContainer = document.getElementById('news-container');
        if (!newsContainer) return;

        newsContainer.innerHTML = '';

        // Sort news by most recent first
        const sortedNews = [...this.newsHistory].sort((a, b) => b.timestamp - a.timestamp);

        // Display up to 10 most recent news items
        sortedNews.slice(0, 10).forEach(news => {
            const newsElement = document.createElement('div');
            newsElement.className = 'py-3 border-b border-gray-200';

            // Format timestamp
            const timeString = news.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Get color class based on news type
            const colorClass = this.getNewsTypeClass(news.type);

            // Create news display
            newsElement.innerHTML = `
                <h3 class="font-medium ${colorClass}">${news.headline}</h3>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-xs text-gray-500">${timeString}</span>
                    <span class="text-xs ${colorClass} font-medium">${news.impact > 0 ? '+' : ''}${(news.impact * 100).toFixed(1)}%</span>
                </div>
            `;

            newsContainer.appendChild(newsElement);
        });
    }
}

// Initialize news generator when document is ready
let newsGenerator;
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with stock list
    newsGenerator = new NewsGenerator(userStocks);

    // Generate initial news (5 stories)
    newsGenerator.generateNews(5);
    newsGenerator.updateNewsDisplay();

    // Set up interval to generate news periodically (every 30 seconds)
    setInterval(() => {
        const news = newsGenerator.generateNews(1);
        newsGenerator.updateNewsDisplay();

        // Update stock prices after news
        updateAllStockPrices();

        // Update portfolio UI
        updatePortfolioUI();
    }, 30000);
});

// Function to update all stock prices (called after news generation)
function updateAllStockPrices() {
    // Calculate overall market trend (-0.02 to 0.02)
    const marketTrend = (Math.random() - 0.5) * 0.04;

    // Update each stock price
    userStocks.forEach(stock => {
        stock.updatePrice(marketTrend);
    });

    // If current stock is being viewed, update its display
    if (currentStock) {
        updateCurrentStockDisplay();
    }
}

// Update current stock display with latest price
function updateCurrentStockDisplay() {
    const stock = getCurrentStock();
    if (!stock) return;

    // Update price display
    const currentPriceElement = document.getElementById('currentPrice');
    if (currentPriceElement) {
        currentPriceElement.textContent = `$${stock.price.toFixed(2)}`;
    }

    // Update price change display
    const priceChangeElement = document.getElementById('priceChange');
    if (priceChangeElement) {
        const dayChange = stock.getDayChange();
        priceChangeElement.textContent = `${dayChange.value >= 0 ? '+' : ''}${dayChange.value.toFixed(2)} (${dayChange.percent.toFixed(2)}%)`;
        priceChangeElement.className = `text-sm font-medium px-2 py-1 rounded ${dayChange.value >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
    }

    // Redraw the graph if available
    if (typeof drawGraph === 'function') {
        drawGraph();
    }
}