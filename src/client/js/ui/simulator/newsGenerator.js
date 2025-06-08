class NewsGenerator {
    constructor(userProfile) {
        this.userProfile  = userProfile;                      
        this.newsContainer = document.getElementById('table-container-news');
        this.newsInterval  = null;

        /* topics and text snippets used ONLY when we fall back to client-side stories */
        this.fallbackTopics = [
            'earnings report', 'new product launch', 'partnership',
            'management change', 'analyst rating', 'market trend',
            'regulatory news', 'competition', 'industry outlook'
        ];
    }

    start(intervalMs = 90_000) {
        if (this.newsInterval) clearInterval(this.newsInterval);
        this.publishNews();
        this.newsInterval = setInterval(() => this.publishNews(), intervalMs);
    }

    stop() {
        if (this.newsInterval) clearInterval(this.newsInterval);
        this.newsInterval = null;
    }

    async publishNews() {
        try {
            const newsItem = await this.fetchNewsFromAPI();
            this.applyImpact(newsItem);
            this.displayNews(newsItem);
        } catch (err) {
            console.warn('News API failed, falling back to local story →', err);
            const fallbackItem = this.createLocalNewsItem();
            this.applyImpact(fallbackItem);
            this.displayNews(fallbackItem);
        }
    }

    async fetchNewsFromAPI() {
        const res = await fetch('/api/news/generate', { method: 'POST' });
        if (!res.ok) throw new Error(`status ${res.status}`);

        const { story, company, weight } = await res.json();     // { story, company, weight }
        const stock = this.lookupStock(company);

        return {
            headline  : story,
            content   : '',                                        // one-line API response is the headline
            stock,
            timestamp : new Date(),
            sentiment : weight                                     // already in –1 → +1 range
        };
    }

    lookupStock(ticker) {
        const { stocksAddedToSim } = this.userProfile;
        const hit = stocksAddedToSim.find(s => s.symbol === ticker);
        if (hit) return hit;

        // If the news is for a company the user doesn’t hold yet, create a stub so UI can still show it.
        return { symbol: ticker, companyName: ticker, sector: '', currentSentiment: 0 };
    }

    createLocalNewsItem() {
        const stocks = this.userProfile.stocksAddedToSim;
        if (!stocks.length) throw new Error('No stocks in sim for fallback news');

        const stock = stocks[Math.floor(Math.random() * stocks.length)];
        const topic = this.fallbackTopics[Math.floor(Math.random() * this.fallbackTopics.length)];

        const roll = Math.random();
        let headline, content, sentiment;

        if (roll > 0.6) {                   // positive 40 %
            sentiment = +0.02;
            switch (topic) {
                case 'earnings report':
                    headline = `${stock.companyName} (${stock.symbol}) Beats Earnings Expectations`;
                    content  = `${stock.companyName} reported quarterly earnings above analyst expectations, with revenue up ${(Math.random()*20+5).toFixed(1)} %.`;
                    break;
                case 'new product launch':
                    headline = `${stock.companyName} Unveils Innovative New Product`;
                    content  = `${stock.companyName} introduced a groundbreaking product analysts believe will lift market share.`;
                    break;
                default:
                    headline = `${stock.companyName} Wins Industry Accolades`;
                    content  = `${stock.companyName} has been recognised for excellence in the ${stock.sector} sector.`;
            }
        } else if (roll > 0.3) {            // neutral 30 %
            sentiment = 0;
            headline  = `${stock.companyName} (${stock.symbol}) Announces Strategic Changes`;
            content   = `${stock.companyName} is restructuring to adapt to evolving market conditions. Analysts are split on the impact.`;
        } else {                            // negative 30 %
            sentiment = -0.02;
            switch (topic) {
                case 'earnings report':
                    headline = `${stock.companyName} (${stock.symbol}) Misses Earnings Targets`;
                    content  = `${stock.companyName} posted weaker-than-expected quarterly results, disappointing investors.`;
                    break;
                case 'competition':
                    headline = `${stock.companyName} Faces New Competitive Pressure`;
                    content  = `Fresh entrants are chipping away at ${stock.companyName}’s market share, raising concerns about growth.`;
                    break;
                default:
                    headline = `${stock.companyName} Faces Industry Headwinds`;
                    content  = `Developments in the ${stock.sector} sector could hamper ${stock.companyName}’s expansion plans.`;
            }
        }

        return { stock, headline, content, timestamp: new Date(), sentiment };
    }

    applyImpact({ stock, sentiment }) {
        if (!stock) return;
        stock.currentSentiment = (stock.currentSentiment || 0) + sentiment;
    }

    displayNews({ stock, headline, content, timestamp, sentiment }) {
        if (!this.newsContainer) return;

        const el = document.createElement('div');
        el.className = `news-item ${
            sentiment >  0.01 ? 'positive' :
                sentiment < -0.01 ? 'negative' : 'neutral'
        }`;

        el.innerHTML = `
      <div class="news-header flex justify-between">
        <span class="news-ticker font-bold">${stock.symbol}</span>
        <span class="news-time text-xs text-gray-400">${timestamp.toLocaleTimeString()}</span>
      </div>
      <h3 class="font-medium">${headline}</h3>
      ${content ? `<p class="text-sm">${content}</p>` : ''}
    `;

        this.newsContainer.prepend(el);

        // keep only the 10 newest
        while (this.newsContainer.children.length > 10) {
            this.newsContainer.lastChild.remove();
        }
    }
}

export default NewsGenerator;