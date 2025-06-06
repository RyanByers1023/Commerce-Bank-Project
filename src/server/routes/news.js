// server/routes/news.js
const express = require('express');
const router = express.Router();

// Simple news generation endpoint
router.post('/generate', (req, res) => {
    try {
        // Array of company tickers that could appear in news
        const companies = ['AAPL', 'MSFT', 'AMZN', 'TSLA', 'GOOGL'];

        // Array of possible news templates
        const positiveNews = [
            "{company} announces record quarterly earnings, beating analyst expectations",
            "{company} unveils new product line, stock surges in after-hours trading",
            "{company} secures major partnership deal, expanding market reach",
            "Analysts upgrade {company} to 'Buy' rating citing strong fundamentals"
        ];

        const negativeNews = [
            "{company} faces regulatory scrutiny, shares decline in pre-market",
            "{company} reports supply chain disruptions, revises guidance downward",
            "Competitive pressure mounts for {company} as rivals gain market share",
            "{company} announces executive departures amid restructuring efforts"
        ];

        const neutralNews = [
            "{company} explores strategic alternatives for business unit",
            "{company} announces share buyback program",
            "Industry analysts await {company}'s upcoming earnings report",
            "{company} maintains steady performance amid market volatility"
        ];

        // Randomly select company and news type
        const company = companies[Math.floor(Math.random() * companies.length)];
        const newsType = Math.random();

        let story, weight;

        if (newsType < 0.4) {
            // Positive news (40%)
            story = positiveNews[Math.floor(Math.random() * positiveNews.length)];
            weight = 0.1 + Math.random() * 0.2; // 0.1 to 0.3
        } else if (newsType < 0.7) {
            // Negative news (30%)
            story = negativeNews[Math.floor(Math.random() * negativeNews.length)];
            weight = -0.3 + Math.random() * 0.2; // -0.3 to -0.1
        } else {
            // Neutral news (30%)
            story = neutralNews[Math.floor(Math.random() * neutralNews.length)];
            weight = -0.05 + Math.random() * 0.1; // -0.05 to 0.05
        }

        // Replace placeholder with company
        story = story.replace('{company}', company);

        res.json({
            story,
            company,
            weight
        });
    } catch (error) {
        console.error('News generation error:', error);
        res.status(500).json({ error: 'Failed to generate news' });
    }
});

module.exports = router;