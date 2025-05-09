// NewsGenerator.js
// This is a replacement for your current NewsGenerator.js file
// It uses the browser's built-in fetch API instead of node-fetch

export default class NewsGenerator {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.newsContainer = document.getElementById('newsContainer');
        this.newsInterval = null;
        this.newsTopics = [
            'earnings report', 'new product launch', 'partnership',
            'management change', 'analyst rating', 'market trend',
            'regulatory news', 'competition', 'industry outlook'
        ];
    }

    start(interval = 5000) {
        // Clear any existing interval
        if (this.newsInterval) {
            clearInterval(this.newsInterval);
        }

        // Generate initial news
        this.generateNews();

        // Set interval for news generation
        this.newsInterval = setInterval(() => {
            this.generateNews();
        }, interval);
    }

    stop() {
        if (this.newsInterval) {
            clearInterval(this.newsInterval);
            this.newsInterval = null;
        }
    }

    async generateNews() {
        try {
            // Get a random stock from the user's portfolio
            const stocks = this.userProfile.stocksAddedToSim;
            if (!stocks || stocks.length === 0) return;

            const randomStock = stocks[Math.floor(Math.random() * stocks.length)];

            // Generate news content
            const newsItem = this.createNewsItem(randomStock);

            // Update stock sentiment based on news
            this.updateStockSentiment(randomStock, newsItem.sentiment);

            // Display news
            this.displayNews(newsItem);

        } catch (error) {
            console.error('Error generating news:', error);
        }
    }

    createNewsItem(stock) {
        // Select a random news topic
        const topic = this.newsTopics[Math.floor(Math.random() * this.newsTopics.length)];

        // Determine if news is positive, negative, or neutral
        const sentimentValue = Math.random();
        let sentiment, headline, content;

        if (sentimentValue > 0.6) {
            // Positive news (40% chance)
            sentiment = 'positive';

            switch(topic) {
                case 'earnings report':
                    headline = `${stock.companyName} (${stock.symbol}) Beats Earnings Expectations`;
                    content = `${stock.companyName} reported quarterly earnings above analyst expectations, with revenue growth of ${(Math.random() * 20 + 5).toFixed(1)}% year-over-year.`;
                    break;
                case 'new product launch':
                    headline = `${stock.companyName} Announces Innovative New Product`;
                    content = `${stock.companyName} unveiled a groundbreaking new product that analysts expect will significantly boost market share in the coming quarters.`;
                    break;
                default:
                    headline = `${stock.companyName} Receives Positive Industry Recognition`;
                    content = `${stock.companyName} has been recognized for excellence in the ${stock.sector} sector, boosting investor confidence.`;
            }

        } else if (sentimentValue > 0.3) {
            // Neutral news (30% chance)
            sentiment = 'neutral';

            headline = `${stock.companyName} (${stock.symbol}) Announces Strategic Changes`;
            content = `${stock.companyName} is implementing organizational changes to adapt to current market conditions. Analysts remain divided on the potential impact.`;

        } else {
            // Negative news (30% chance)
            sentiment = 'negative';

            switch(topic) {
                case 'earnings report':
                    headline = `${stock.companyName} (${stock.symbol}) Misses Earnings Targets`;
                    content = `${stock.companyName} reported disappointing quarterly results, with earnings per share below analyst expectations.`;
                    break;
                case 'competition':
                    headline = `${stock.companyName} Faces New Competitive Pressure`;
                    content = `New market entrants are challenging ${stock.companyName}'s position in key markets, potentially impacting future revenue.`;
                    break;
                default:
                    headline = `${stock.companyName} Faces Industry Headwinds`;
                    content = `Recent developments in the ${stock.sector} sector may pose challenges for ${stock.companyName}'s growth strategy.`;
            }
        }

        return {
            stock: stock,
            headline: headline,
            content: content,
            timestamp: new Date(),
            sentiment: sentiment === 'positive' ? 0.02 : sentiment === 'negative' ? -0.02 : 0
        };
    }

    updateStockSentiment(stock, sentimentChange) {
        // Update the stock's sentiment which will affect price in the simulation
        if (stock) {
            stock.currentSentiment = (stock.currentSentiment || 0) + sentimentChange;
        }
    }

    displayNews(newsItem) {
        if (!this.newsContainer) return;

        // Create news element
        const newsElement = document.createElement('div');
        newsElement.className = `news-item ${newsItem.sentiment}`;

        // Format timestamp
        const timeString = newsItem.timestamp.toLocaleTimeString();

        // Add content to news element
        newsElement.innerHTML = `
            <div class="news-header">
                <span class="news-ticker">${newsItem.stock.symbol}</span>
                <span class="news-time">${timeString}</span>
            </div>
            <h3>${newsItem.headline}</h3>
            <p>${newsItem.content}</p>
        `;

        // Add to news container (at the top)
        this.newsContainer.insertBefore(newsElement, this.newsContainer.firstChild);

        // Limit number of news items (keep the 10 most recent)
        while (this.newsContainer.children.length > 10) {
            this.newsContainer.removeChild(this.newsContainer.lastChild);
        }
    }
}