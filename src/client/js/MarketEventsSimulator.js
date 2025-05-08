export default class MarketEventsSimulator {
    constructor(userProfile, newsGenerator) {
        this.userProfile = userProfile;
        this.newsGenerator = newsGenerator;
        this.eventProbability = 0.05; // 5% chance of an event per check
        this.lastEventTime = Date.now();
        this.eventCooldown = 30000; // Minimum time between events (30 seconds)
        this.eventsEnabled = true;
    }

    // Initialize the market events system
    initialize() {
        this.eventInterval = setInterval(() => this.checkForEvent(), 10000);
        console.log('Market events simulator initialized');
    }

    // Stop the market events system
    stop() {
        if (this.eventInterval) {
            clearInterval(this.eventInterval);
            this.eventInterval = null;
        }
    }

    // Toggle events on/off
    toggleEvents(enabled) {
        this.eventsEnabled = enabled;
        console.log(`Market events ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Check if a market event should occur
    checkForEvent() {
        if (!this.eventsEnabled) return;

        // Check cooldown
        const now = Date.now();
        if (now - this.lastEventTime < this.eventCooldown) return;

        // Random chance check
        if (Math.random() > this.eventProbability) return;

        // Generate an event
        this.generateEvent();
        this.lastEventTime = now;
    }

    // Generate a market event
    generateEvent() {
        const eventTypes = [
            'companyEvent',     // Affects a single company
            'sectorEvent',      // Affects a whole sector
            'marketEvent'       // Affects the entire market
        ];

        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        switch (eventType) {
            case 'companyEvent':
                this.generateCompanyEvent();
                break;
            case 'sectorEvent':
                this.generateSectorEvent();
                break;
            case 'marketEvent':
                this.generateMarketEvent();
                break;
        }
    }

    // Generate an event affecting a single company
    generateCompanyEvent() {
        // Get random stock
        const stocks = this.userProfile.stocksAddedToSim;
        if (!stocks || stocks.length === 0) return;

        const stock = stocks[Math.floor(Math.random() * stocks.length)];

        // Generate impact (more significant than regular news)
        const isPositive = Math.random() > 0.5;
        const impactFactor = (Math.random() * 0.15 + 0.05) * (isPositive ? 1 : -1);

        // Apply impact to stock sentiment
        stock.currentSentiment += impactFactor;

        // Create news item for the event
        const events = isPositive ? this.getPositiveCompanyEvents() : this.getNegativeCompanyEvents();
        const event = events[Math.floor(Math.random() * events.length)];

        const newsItem = {
            headline: event.text.replace('{company}', stock.companyName),
            type: isPositive ? 'positive' : 'negative',
            target: { type: 'company', symbol: stock.symbol },
            impact: impactFactor,
            timestamp: new Date(),
            isEvent: true
        };

        // Add to news feed
        this.newsGenerator.newsHistory.unshift(newsItem);
        this.newsGenerator.render();

        // Trigger any UI updates
        if (this.newsGenerator.onUpdate) {
            this.newsGenerator.onUpdate();
        }

        console.log(`Company event generated for ${stock.symbol}: ${impactFactor > 0 ? '+' : ''}${(impactFactor*100).toFixed(1)}%`);
    }

    // Generate an event affecting a sector
    generateSectorEvent() {
        // Get random sector
        const stocks = this.userProfile.stocksAddedToSim;
        if (!stocks || stocks.length === 0) return;

        const sectors = [...new Set(stocks.map(s => s.sector))];
        if (sectors.length === 0) return;

        const sector = sectors[Math.floor(Math.random() * sectors.length)];

        // Generate impact
        const isPositive = Math.random() > 0.5;
        const impactFactor = (Math.random() * 0.1 + 0.03) * (isPositive ? 1 : -1);

        // Apply impact to all stocks in the sector
        stocks.forEach(stock => {
            if (stock.sector === sector) {
                stock.currentSentiment += impactFactor;
            }
        });

        // Create news item for the event
        const events = isPositive ? this.getPositiveSectorEvents() : this.getNegativeSectorEvents();
        const event = events[Math.floor(Math.random() * events.length)];

        const newsItem = {
            headline: event.text.replace('{sector}', sector),
            type: isPositive ? 'sectorPositive' : 'sectorNegative',
            target: { type: 'sector', name: sector },
            impact: impactFactor,
            timestamp: new Date(),
            isEvent: true
        };

        // Add to news feed
        this.newsGenerator.newsHistory.unshift(newsItem);
        this.newsGenerator.render();

        // Trigger any UI updates
        if (this.newsGenerator.onUpdate) {
            this.newsGenerator.onUpdate();
        }

        console.log(`Sector event generated for ${sector}: ${impactFactor > 0 ? '+' : ''}${(impactFactor*100).toFixed(1)}%`);
    }

    // Generate an event affecting the entire market
    generateMarketEvent() {
        // Generate impact
        const isPositive = Math.random() > 0.5;
        const impactFactor = (Math.random() * 0.08 + 0.02) * (isPositive ? 1 : -1);

        // Apply impact to all stocks
        this.userProfile.stocksAddedToSim.forEach(stock => {
            stock.currentSentiment += impactFactor * 0.8; // Slightly dampened for market-wide events
        });

        // Create news item for the event
        const events = isPositive ? this.getPositiveMarketEvents() : this.getNegativeMarketEvents();
        const event = events[Math.floor(Math.random() * events.length)];

        const newsItem = {
            headline: event.text,
            type: 'marketWide',
            target: { type: 'market' },
            impact: impactFactor,
            timestamp: new Date(),
            isEvent: true
        };

        // Add to news feed
        this.newsGenerator.newsHistory.unshift(newsItem);
        this.newsGenerator.render();

        // Trigger any UI updates
        if (this.newsGenerator.onUpdate) {
            this.newsGenerator.onUpdate();
        }

        console.log(`Market event generated: ${impactFactor > 0 ? '+' : ''}${(impactFactor*100).toFixed(1)}%`);
    }

    // Event templates
    getPositiveCompanyEvents() {
        return [
            { text: "{company} Secures Major Government Contract", impact: 0.15 },
            { text: "{company} Announces Revolutionary Product", impact: 0.18 },
            { text: "{company} Exceeds Earnings Expectations by 30%", impact: 0.12 },
            { text: "{company} Patent Approved for Breakthrough Technology", impact: 0.14 },
            { text: "Activist Investor Takes Large Stake in {company}", impact: 0.13 }
        ];
    }

    getNegativeCompanyEvents() {
        return [
            { text: "{company} Products Recalled Due to Safety Concerns", impact: -0.16 },
            { text: "{company} Loses Major Lawsuit", impact: -0.14 },
            { text: "{company} Earnings Fall Short of Expectations", impact: -0.12 },
            { text: "{company} Announces Major Restructuring", impact: -0.13 },
            { text: "CEO of {company} Resigns Amid Controversy", impact: -0.15 }
        ];
    }

    getPositiveSectorEvents() {
        return [
            { text: "New Legislation Expected to Boost {sector} Sector", impact: 0.09 },
            { text: "International Agreement Benefits {sector} Companies", impact: 0.08 },
            { text: "Consumer Demand Surges for {sector} Products", impact: 0.07 },
            { text: "Research Breakthrough for {sector} Industry", impact: 0.08 },
            { text: "Favorable Tax Changes for {sector} Businesses", impact: 0.07 }
        ];
    }

    getNegativeSectorEvents() {
        return [
            { text: "New Regulations Impact {sector} Companies", impact: -0.09 },
            { text: "Supply Chain Disruptions Hit {sector} Industry", impact: -0.08 },
            { text: "Labor Disputes Spread Across {sector} Sector", impact: -0.07 },
            { text: "Declining Consumer Interest in {sector} Products", impact: -0.08 },
            { text: "Rising Costs Squeeze Margins in {sector} Industry", impact: -0.07 }
        ];
    }

    getPositiveMarketEvents() {
        return [
            { text: "Federal Reserve Signals Interest Rate Cut", impact: 0.06 },
            { text: "Unemployment Numbers Drop to Record Low", impact: 0.05 },
            { text: "Major Trade Deal Announced Between Nations", impact: 0.07 },
            { text: "Consumer Confidence Index Reaches 10-Year High", impact: 0.06 },
            { text: "Inflation Data Shows Economy Stabilizing", impact: 0.05 }
        ];
    }

    getNegativeMarketEvents() {
        return [
            { text: "Federal Reserve Signals Interest Rate Hike", impact: -0.06 },
            { text: "Unemployment Numbers Rise Unexpectedly", impact: -0.05 },
            { text: "Trade Tensions Escalate Between Major Economies", impact: -0.07 },
            { text: "Consumer Confidence Index Falls Sharply", impact: -0.06 },
            { text: "Inflation Data Raises Economic Concerns", impact: -0.05 }
        ];
    }
}