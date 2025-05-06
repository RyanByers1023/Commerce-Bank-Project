// server/routes/settings.js
const express = require('express');
const router = express.Router();

//get middleware:
const db = require('../middleware/db');
const auth = require('../middleware/auth');
// Get simulation settings for a user
router.get('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is accessing their own data
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to settings data' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Get settings
        const [settings] = await db.query(
            'SELECT * FROM simulation_settings WHERE userID = ?',
            [userID]
        );

        // If no settings found, return defaults
        if (settings.length === 0) {
            return res.json({
                simulationSpeed: 1,
                marketVolatility: 'medium',
                eventFrequency: 'medium',
                startingCash: 500.00,
                updatedAt: new Date()
            });
        }

        res.json(settings[0]);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get simulation settings' });
    }
});

// Save simulation settings
router.put('/:username', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { simulationSpeed, marketVolatility, eventFrequency, startingCash } = req.body;

        // Verify user is updating their own settings
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to update settings' });
        }

        // Validate inputs
        if (simulationSpeed !== undefined && (!Number.isInteger(simulationSpeed) || simulationSpeed < 1 || simulationSpeed > 40)) {
            return res.status(400).json({ error: 'Simulation speed must be an integer between 1 and 40' });
        }

        if (marketVolatility !== undefined && !['low', 'medium', 'high'].includes(marketVolatility)) {
            return res.status(400).json({ error: 'Market volatility must be "low", "medium", or "high"' });
        }

        if (eventFrequency !== undefined && !['none', 'low', 'medium', 'high'].includes(eventFrequency)) {
            return res.status(400).json({ error: 'Event frequency must be "none", "low", "medium", or "high"' });
        }

        if (startingCash !== undefined && (typeof startingCash !== 'number' || startingCash < 100 || startingCash > 10000)) {
            return res.status(400).json({ error: 'Starting cash must be a number between 100 and 10000' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Check if settings exist
        const [settings] = await db.query(
            'SELECT settingsID FROM simulation_settings WHERE userID = ?',
            [userID]
        );

        // Build update object
        const updates = {};
        if (simulationSpeed !== undefined) updates.simulationSpeed = simulationSpeed;
        if (marketVolatility !== undefined) updates.marketVolatility = marketVolatility;
        if (eventFrequency !== undefined) updates.eventFrequency = eventFrequency;
        if (startingCash !== undefined) updates.startingCash = startingCash;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid update fields provided' });
        }

        if (settings.length > 0) {
            // Update existing settings
            const updateFields = Object.entries(updates).map(([key, _]) => `${key} = ?`).join(', ');
            const updateValues = [...Object.values(updates), userID];

            await db.query(
                `UPDATE simulation_settings SET ${updateFields}, updatedAt = NOW() WHERE userID = ?`,
                updateValues
            );
        } else {
            // Create new settings
            const settingsObj = {
                simulationSpeed: updates.simulationSpeed || 1,
                marketVolatility: updates.marketVolatility || 'medium',
                eventFrequency: updates.eventFrequency || 'medium',
                startingCash: updates.startingCash || 500.00,
                userID
            };

            const fields = Object.keys(settingsObj).join(', ');
            const placeholders = Object.keys(settingsObj).map(() => '?').join(', ');
            const values = Object.values(settingsObj);

            await db.query(
                `INSERT INTO simulation_settings (${fields}) VALUES (${placeholders})`,
                values
            );
        }

        // Get updated settings
        const [updatedSettings] = await db.query(
            'SELECT * FROM simulation_settings WHERE userID = ?',
            [userID]
        );

        res.json(updatedSettings[0]);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update simulation settings' });
    }
});

// Reset all settings to defaults
router.post('/:username/reset', auth.verifyToken, async (req, res) => {
    try {
        const { username } = req.params;

        // Verify user is resetting their own settings
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to reset settings' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT userID FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userID = users[0].userID;

        // Default settings
        const defaultSettings = {
            simulationSpeed: 1,
            marketVolatility: 'medium',
            eventFrequency: 'medium',
            startingCash: 500.00,
            userID
        };

        // Check if settings exist
        const [settings] = await db.query(
            'SELECT settingsID FROM simulation_settings WHERE userID = ?',
            [userID]
        );

        if (settings.length > 0) {
            // Update to defaults
            await db.query(
                `UPDATE simulation_settings 
         SET simulationSpeed = ?, marketVolatility = ?, eventFrequency = ?, 
             startingCash = ?, updatedAt = NOW()
         WHERE userID = ?`,
                [
                    defaultSettings.simulationSpeed,
                    defaultSettings.marketVolatility,
                    defaultSettings.eventFrequency,
                    defaultSettings.startingCash,
                    userID
                ]
            );
        } else {
            // Create with defaults
            await db.query(
                `INSERT INTO simulation_settings 
         (simulationSpeed, marketVolatility, eventFrequency, startingCash, userID)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    defaultSettings.simulationSpeed,
                    defaultSettings.marketVolatility,
                    defaultSettings.eventFrequency,
                    defaultSettings.startingCash,
                    userID
                ]
            );
        }

        // Return default settings
        defaultSettings.updatedAt = new Date();
        res.json(defaultSettings);
    } catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({ error: 'Failed to reset simulation settings' });
    }
});

// Get available market volatility levels
router.get('/options/volatility', (req, res) => {
    const volatilityOptions = [
        { value: 'low', label: 'Low', description: 'Lower price fluctuations', factor: 0.6 },
        { value: 'medium', label: 'Medium', description: 'Moderate price fluctuations', factor: 1.0 },
        { value: 'high', label: 'High', description: 'Higher price fluctuations', factor: 1.6 }
    ];

    res.json(volatilityOptions);
});

// Get available event frequency levels
router.get('/options/event-frequency', (req, res) => {
    const frequencyOptions = [
        { value: 'none', label: 'None', description: 'No market events', probability: 0 },
        { value: 'low', label: 'Low', description: 'Occasional market events', probability: 0.02 },
        { value: 'medium', label: 'Medium', description: 'Regular market events', probability: 0.05 },
        { value: 'high', label: 'High', description: 'Frequent market events', probability: 0.1 }
    ];

    res.json(frequencyOptions);
});

// Get available simulation speed options
router.get('/options/simulation-speed', (req, res) => {
    const speedOptions = [
        { value: 1, label: '1x', description: 'Real-time simulation' },
        { value: 5, label: '5x', description: '5x faster than real-time' },
        { value: 10, label: '10x', description: '10x faster than real-time' },
        { value: 20, label: '20x', description: '20x faster than real-time' },
        { value: 40, label: '40x', description: '40x faster than real-time' }
    ];

    res.json(speedOptions);
});

module.exports = router;