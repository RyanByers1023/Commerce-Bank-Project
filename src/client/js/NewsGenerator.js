export default class NewsGenerator {
    constructor(userProfile, onUpdate = null) {
        this.userProfile = userProfile;        // we need access to stocks
        this.onUpdate = onUpdate;              // optional UI callback
        this.newsHistory = [];
        this.newsTypes = this.initTemplates();
        this.newsContainer = null;             // Store DOM reference
        this.timer = null;                     // Store timer reference for cleanup
    }

    /* ---------- public API ---------- */

    start(intervalMs = 30_000) {
        // Stop any existing timer to prevent duplicates
        this.stop();
        
        // Initial burst
        this.generateNews(5);
        
        // Set new timer
        this.timer = setInterval(() => this.generateNews(1), intervalMs);
        
        return this; // For method chaining
    }
    
    stop() { 
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        return this; // For method chaining
    }

    /* ---------- core generation ---------- */

    generateNews(count = 1) {
        // Validate we have stocks to work with
        const stocks = this.userProfile?.stocksAddedToSim;
        if (!Array.isArray(stocks) || stocks.length === 0) {
            console.warn('[NewsGenerator] No stocks available for news generation');
            return;
        }

        for (let i = 0; i < count; i++) {
            const item = this.createRandomItem();
            if (item) {
                this.newsHistory.unshift(item);           // newest first
                
                // Use slice for efficient array management
                if (this.newsHistory.length > 50) {
                    this.newsHistory = this.newsHistory.slice(0, 50);
                }
            }
        }
        
        this.render();                                   // update DOM
        if (typeof this.onUpdate === 'function') {
            this.onUpdate();                             // e.g. redraw graph
        }
    }

    getRandomSector(stocksAddedToSim) {
        if (!Array.isArray(stocksAddedToSim) || stocksAddedToSim.length === 0) {
            return 'General'; // Fallback sector name
        }
        
        // 1. collect non-empty sector strings
        const sectors = [...new Set(
            stocksAddedToSim
                .map(s => typeof s.sector === 'string' ? s.sector.trim() : '')
                .filter(s => s && s.length > 0)
        )];

        // 2. fall back if the list is empty
        if (sectors.length === 0) {
            console.warn('[NewsGenerator] No valid sectors found — using "General"');
            return 'General';
        }

        // 3. return a random sector
        const idx = Math.floor(Math.random() * sectors.length);
        return sectors[idx];
    }

    createRandomItem() {
        try {
            const roll = Math.random();
            if (roll < 0.6)  return this.companyStory();
            if (roll < 0.9)  return this.sectorStory();
            return              this.marketStory();
        } catch (error) {
            console.error('[NewsGenerator] Error creating news item:', error);
            return null;
        }
    }

    /* ---------- story builders ---------- */

    companyStory() {
        const stocks = this.userProfile?.stocksAddedToSim || [];
        
        // Check if we have stocks to work with
        if (stocks.length === 0) {
            return this.fallbackStory('company');
        }
        
        const stockIndex = Math.floor(Math.random() * stocks.length);
        const stock = stocks[stockIndex];
        
        // Validate stock object has required properties
        if (!stock || typeof stock.companyName !== 'string' || !stock.symbol) {
            return this.fallbackStory('company');
        }
        
        const posNeg = Math.random() < 0.5 ? 'positive' : 'negative';
        const template = this.randomTemplate(posNeg);
        
        // Safe sentiment update
        if (typeof stock.currentSentiment === 'number') {
            stock.currentSentiment += template.impact;
        } else {
            stock.currentSentiment = template.impact;
        }

        // Safely escape special characters for replacement
        const escapedCompanyName = this.escapeRegExp(stock.companyName);
        
        return {
            headline: template.text.replace(/\{company\}/g, escapedCompanyName),
            type: posNeg,
            target: { type: 'company', symbol: stock.symbol },
            impact: template.impact,
            timestamp: new Date()
        };
    }

    sectorStory() {
        const stocks = this.userProfile?.stocksAddedToSim || [];
        
        // Check if we have stocks to work with
        if (stocks.length === 0) {
            return this.fallbackStory('sector');
        }
        
        const sector = this.getRandomSector(stocks);
        const posNeg = Math.random() < 0.5 ? 'sectorPositive' : 'sectorNegative';
        const template = this.randomTemplate(posNeg);

        // Update sentiment for stocks in this sector
        stocks.forEach(s => {
            if (s && s.sector === sector && typeof s.currentSentiment === 'number') {
                s.currentSentiment += template.impact;
            } else if (s && s.sector === sector) {
                s.currentSentiment = template.impact;
            }
        });

        // Safely escape special characters for replacement
        const escapedSector = this.escapeRegExp(sector);
        
        return {
            headline: template.text.replace(/\{sector\}/g, escapedSector),
            type: posNeg,
            target: { type: 'sector', name: sector },
            impact: template.impact,
            timestamp: new Date()
        };
    }

    marketStory() {
        const stocks = this.userProfile?.stocksAddedToSim || [];
        const template = this.randomTemplate('marketWide');

        // Update sentiment for all stocks
        stocks.forEach(s => {
            if (s && typeof s.currentSentiment === 'number') {
                s.currentSentiment += template.impact * 0.7;
            } else if (s) {
                s.currentSentiment = template.impact * 0.7;
            }
        });

        return {
            headline: template.text,                     // already generic
            type: 'marketWide',
            target: { type: 'market' },
            impact: template.impact,
            timestamp: new Date()
        };
    }
    
    // Fallback for when we can't generate a proper story
    fallbackStory(type) {
        const impact = (Math.random() > 0.5 ? 1 : -1) * (0.01 + Math.random() * 0.03);
        
        let headline;
        let storyType;
        
        if (type === 'company') {
            headline = "Company Announces Strategic Changes";
            storyType = impact > 0 ? 'positive' : 'negative';
        } else if (type === 'sector') {
            headline = "Industry Group Reports Changing Conditions";
            storyType = impact > 0 ? 'sectorPositive' : 'sectorNegative';
        } else {
            headline = "Markets Respond to Economic Indicators";
            storyType = 'marketWide';
        }
        
        return {
            headline,
            type: storyType,
            target: { type },
            impact,
            timestamp: new Date()
        };
    }

    /* ---------- helpers ---------- */

    randomTemplate(kind) {
        // Ensure we have templates for this kind
        const list = this.newsTypes[kind] || this.newsTypes.marketWide;
        return list[Math.floor(Math.random() * list.length)];
    }
    
    // Escape special characters in text for safe replacement
    escapeRegExp(string) {
        if (typeof string !== 'string') return '';
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* ---------- DOM render ---------- */

    render() {
        // Find and cache DOM container
        if (!this.newsContainer) {
            this.newsContainer = document.getElementById('news-container');
        }
        
        // Validate container exists and we have news to show
        if (!this.newsContainer || !Array.isArray(this.newsHistory) || this.newsHistory.length === 0) {
            return;
        }

        // Create document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        
        // Only process the first 10 items
        this.newsHistory.slice(0, 10).forEach(n => {
            if (!n) return; // Skip invalid items
            
            try {
                const cls = (n.type?.includes('positive') ? 'text-green-600'
                    : n.type?.includes('negative') ? 'text-red-600'
                    : 'text-blue-600');
                
                // Safely format timestamp
                let timeStr = '';
                try {
                    timeStr = n.timestamp instanceof Date 
                        ? n.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                        : '';
                } catch (e) {
                    timeStr = '';
                }
                
                // Create news item element
                const newsItem = document.createElement('div');
                newsItem.className = 'py-3 border-b border-gray-200';
                
                // Set safe HTML content
                newsItem.innerHTML = `
                    <h3 class="font-medium ${cls}">${this.safeText(n.headline)}</h3>
                    <div class="flex justify-between mt-1">
                        <span class="text-xs text-gray-500">${timeStr}</span>
                        <span class="text-xs ${cls} font-medium">
                            ${typeof n.impact === 'number' ? (n.impact > 0 ? '+' : '') + (n.impact * 100).toFixed(1) + '%' : ''}
                        </span>
                    </div>`;
                
                fragment.appendChild(newsItem);
            } catch (error) {
                console.error('[NewsGenerator] Error rendering news item:', error);
            }
        });
        
        // Clear and update container in a single operation
        this.newsContainer.innerHTML = '';
        this.newsContainer.appendChild(fragment);
    }
    
    // Prevent XSS (Cross-Site Scripting) by sanitizing text
    safeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ---------- static templates ---------- */

    initTemplates() {
        return {
            positive: [
                { text: "{company} Reports Strong Quarterly Earnings", impact: 0.08 },
                { text: "{company} Announces New Product Line", impact: 0.06 },
                { text: "Analysts Upgrade {company} to 'Buy'", impact: 0.05 }
            ],
            negative: [
                { text: "{company} Misses Earnings Expectations", impact: -0.07 },
                { text: "{company} CEO Steps Down Unexpectedly", impact: -0.08 },
                { text: "Regulatory Probe into {company}", impact: -0.06 }
            ],
            sectorPositive: [
                { text: "{sector} Sector Boosted by New Regulations", impact: 0.04 }
            ],
            sectorNegative: [
                { text: "Supply Chain Issues Hit {sector} Industry", impact: -0.04 }
            ],
            marketWide: [
                { text: "Markets Rally on Economic News", impact: 0.03 },
                { text: "Fed Signals Policy Change", impact: -0.02 }
            ]
        };
    }
    
    // Add cleanup method for proper resource management
    destroy() {
        this.stop();
        this.newsContainer = null;
        this.userProfile = null;
        this.onUpdate = null;
        this.newsHistory = [];
    }
}