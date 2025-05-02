//  NewsGenerator.js  –  crash-free, still simple
export default class NewsGenerator {
    constructor(userProfile, onUpdate = null) {
        this.userProfile  = userProfile;          // we need access to stocks
        this.onUpdate     = onUpdate;             // optional UI callback
        this.newsHistory  = [];
        this.newsTypes    = this.initTemplates();
    }

    /* ---------- public API ---------- */

    start(intervalMs = 30_000) {
        // initial burst
        this.generateNews(5);
        // repeat
        this.timer = setInterval(() => this.generateNews(1), intervalMs);
    }
    stop() { clearInterval(this.timer); }

    /* ---------- core generation ---------- */

    generateNews(count = 1) {
        for (let i = 0; i < count; i++) {
            const item = this.createRandomItem();
            this.newsHistory.unshift(item);               // newest first
            if (this.newsHistory.length > 50) this.newsHistory.pop();
        }
        this.render();                                    // update DOM
        if (this.onUpdate) this.onUpdate();               // e.g. redraw graph
    }

    getRandomSector(stocksAddedToSim) {
        // 1. collect non-empty sector strings
        const sectors = [...new Set(
            stocksAddedToSim
                .map(s => s.sector?.trim())
                .filter(s => s && s.length > 0)
        )];

        // 2. fall back if the list is empty
        if (sectors.length === 0) {
            console.warn('[NewsGenerator] No valid sectors found — using "Unknown"');
            return 'Unknown';
        }

        // 3. return a random sector
        const idx = Math.floor(Math.random() * sectors.length);
        return sectors[idx];
    }

    createRandomItem() {
        const roll = Math.random();
        if (roll < 0.6)  return this.companyStory();
        if (roll < 0.9)  return this.sectorStory();
        return              this.marketStory();
    }

    /* ---------- story builders ---------- */

    companyStory() {
        const stocks   = this.userProfile.stocksAddedToSim;
        const stock    = stocks[Math.floor(Math.random() * stocks.length)];
        const posNeg   = Math.random() < 0.5 ? 'positive' : 'negative';
        const template = this.randomTemplate(posNeg);

        stock.currentSentiment += template.impact;        // nudge price model

        return {
            headline : template.text.replace('{company}', stock.companyName),
            type     : posNeg,
            target   : { type: 'company', symbol: stock.symbol },
            impact   : template.impact,
            timestamp: new Date()
        };
    }

    sectorStory() {
        const stocks   = this.userProfile.stocksAddedToSim;
        const sector   = this.getRandomSector(stocks);
        const posNeg   = Math.random() < 0.5 ? 'sectorPositive'
            : 'sectorNegative';
        const template = this.randomTemplate(posNeg);

        stocks.forEach(s => {
            if (s.sector === sector) s.currentSentiment += template.impact;
        });

        return {
            headline : template.text.replace('{sector}', sector),
            type     : posNeg,
            target   : { type: 'sector', name: sector },
            impact   : template.impact,
            timestamp: new Date()
        };
    }

    marketStory() {
        const stocks   = this.userProfile.stocksAddedToSim;
        const template = this.randomTemplate('marketWide');

        stocks.forEach(s => { s.currentSentiment += template.impact * 0.7; });

        return {
            headline : template.text,                     // already generic
            type     : 'marketWide',
            target   : { type: 'market' },
            impact   : template.impact,
            timestamp: new Date()
        };
    }

    /* ---------- helpers ---------- */

    randomTemplate(kind) {
        const list = this.newsTypes[kind];
        return list[Math.floor(Math.random() * list.length)];
    }

    /* ---------- DOM render ---------- */

    render() {
        const box = document.getElementById('news-container');
        if (!box) return;

        box.innerHTML = '';
        this.newsHistory.slice(0,10).forEach(n => {
            const cls = (n.type.includes('positive') ? 'text-green-600'
                : n.type.includes('negative') ? 'text-red-600'
                    : 'text-blue-600');
            const time = n.timestamp.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
            box.insertAdjacentHTML('beforeend', `
                <div class="py-3 border-b border-gray-200">
                  <h3 class="font-medium ${cls}">${n.headline}</h3>
                  <div class="flex justify-between mt-1">
                      <span class="text-xs text-gray-500">${time}</span>
                      <span class="text-xs ${cls} font-medium">
                           ${n.impact>0?'+':''}${(n.impact*100).toFixed(1)}%
                      </span>
                  </div>
                </div>`);
        });
    }

    /* ---------- static templates ---------- */

    initTemplates() {
        return {
            positive: [
                { text: "{company} Reports Strong Quarterly Earnings", impact: 0.08 },
                { text: "{company} Announces New Product Line",        impact: 0.06 },
                { text: "Analysts Upgrade {company} to 'Buy'",         impact: 0.05 }
            ],
            negative: [
                { text: "{company} Misses Earnings Expectations",      impact: -0.07 },
                { text: "{company} CEO Steps Down Unexpectedly",       impact: -0.08 },
                { text: "Regulatory Probe into {company}",             impact: -0.06 }
            ],
            sectorPositive: [
                { text: "{sector} Sector Boosted by New Regulations",  impact: 0.04 }
            ],
            sectorNegative: [
                { text: "Supply Chain Issues Hit {sector} Industry",   impact: -0.04 }
            ],
            marketWide: [
                { text: "Markets Rally on Economic News",              impact: 0.03 },
                { text: "Fed Signals Policy Change",                   impact: -0.02 }
            ]
        };
    }
}