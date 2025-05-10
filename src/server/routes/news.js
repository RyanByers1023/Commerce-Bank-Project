// src/server/routes/news.js
const express = require('express');
const OpenAI  = require('openai');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TICKERS   = ['AAPL', 'MSFT', 'AMZN', 'TSLA', 'GOOGL'];
const CATEGORIES = [
    { tag: 'positive real',  weightSign: '+', min:  0.05, max:  0.30 }, // 40 %
    { tag: 'neutral',        weightSign:  '', min: -0.02, max:  0.02 }, // 20 %
    { tag: 'negative real',  weightSign: '-', min: -0.30, max: -0.05 }  // 40 %
];

// simple helper
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

router.post('/generate', async (_req, res) => {
    /* 1 ▸ decide ticker & category up-front */
    const ticker    = pick(TICKERS);
    const category  = pick(
        Math.random() < 0.4 ? [CATEGORIES[0]] :      // 40 %
            Math.random() < 0.5 ? [CATEGORIES[1]] :      // next 20 %
                [CATEGORIES[2]] );     // remaining 40 %

    const weightVal = +(Math.random() * (category.max - category.min) + category.min)
        .toFixed(3);                      // keep 3 decimals
    const signed    = `${category.weightSign}${Math.abs(weightVal).toFixed(3)}`;

    /* 2 ▸ build a *single-headline* prompt */
    const PROMPT = `
Write one headline only—no commentary, no second story.

Respond in exactly three lines in this order.
⚠️ Each line MUST start with the label below:
story: "headline"
company: TICKER
weight: [+|-]0.123

• Ticker: **${ticker}**
• Category: **${category.tag}**
• Weight (impact on sentiment): **${signed}**

Respond in exactly three lines:

story: "Your headline here."
company: ${ticker}
weight: ${signed}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: PROMPT }],
            temperature: 0.4,              // lower temp = less drift
            top_p: 0.9
        });

        const raw = completion.choices[0].message.content.trim();

        /* ---- your robust field-extraction block from last fix ---- */
        const fields = {};
        raw.split(/\r?\n/).forEach(l => {
            const m = l.match(/^\s*(story|company|weight)\s*:\s*(.+)$/i);
            if (m) fields[m[1].toLowerCase()] = m[2].trim();
        });
        if (!fields.story || !fields.company || !fields.weight) {
            console.error('Malformed payload:\n', raw);
            return res.status(500).json({ error: 'Malformed news payload' });
        }
        const weight = parseFloat(fields.weight.replace(/[^0-9+.\-]/g, ''));
        return res.json({
            story  : fields.story.replace(/^"|"$/g, ''),
            company: fields.company,
            weight
        });
    } catch (err) {
        console.error('News-gen error', err);
        res.status(500).json({ error: 'News generation failed' });
    }
});

module.exports = router;