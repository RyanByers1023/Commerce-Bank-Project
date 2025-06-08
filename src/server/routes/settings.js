// server/routes/settings.js
const express = require('express');
const router = express.Router();

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
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Get settings
        const [settings] = await db.query(
            'SELECT * FROM simulation_settings WHERE user_id = ?',
            [userId]
        );

        // If no settings found, return defaults
        if (settings.length === 0) {
            return res.json({
                sim_speed: 1,
                market_volatility: 'medium',
                event_frequency: 'medium',
                initial_balance: 500.00,
                updated_at: new Date()
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
        const { sim_speed, market_volatility, event_frequency, initial_balance } = req.body;

        // Verify user is updating their own settings
        if (req.user.username !== username) {
            return res.status(403).json({ error: 'Unauthorized access to update settings' });
        }

        // Validate inputs
        if (sim_speed !== undefined && (!Number.isInteger(sim_speed) || sim_speed < 1 || sim_speed > 40)) {
            return res.status(400).json({ error: 'Simulation speed must be an integer between 1 and 40' });
        }

        if (market_volatility !== undefined && !['low', 'medium', 'high'].includes(market_volatility)) {
            return res.status(400).json({ error: 'Market volatility must be "low", "medium", or "high"' });
        }

        if (event_frequency !== undefined && !['none', 'low', 'medium', 'high'].includes(event_frequency)) {
            return res.status(400).json({ error: 'Event frequency must be "none", "low", "medium", or "high"' });
        }

        if (initial_balance !== undefined && (typeof initial_balance !== 'number' || initial_balance < 100 || initial_balance > 10000)) {
            return res.status(400).json({ error: 'Initial balance must be a number between 100 and 10000' });
        }

        // Get user ID
        const [users] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Check if settings exist
        const [settings] = await db.query(
            'SELECT id FROM simulation_settings WHERE user_id = ?',
            [userId]
        );

        // Build update object
        const updates = {};
        if (sim_speed !== undefined) updates.sim_speed = sim_speed;
        if (market_volatility !== undefined) updates.market_volatility = market_volatility;
        if (event_frequency !== undefined) updates.event_frequency = event_frequency;
        if (initial_balance !== undefined) updates.initial_balance = initial_balance;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid update fields provided' });
        }

        if (settings.length > 0) {
            // Update existing settings
            const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const updateValues = [...Object.values(updates), userId];

            await db.query(
                `UPDATE simulation_settings SET ${updateFields}, updated_at = NOW() WHERE user_id = ?`,
                updateValues
            );
        } else {
            // Create new settings
            const settingsObj = {
                sim_speed: updates.sim_speed || 1,
                market_volatility: updates.market_volatility || 'medium',
                event_frequency: updates.event_frequency || 'medium',
                initial_balance: updates.initial_balance || 500.00,
                user_id: userId
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
            'SELECT * FROM simulation_settings WHERE user_id = ?',
            [userId]
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
            'SELECT id FROM user WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Default settings
        const defaultSettings = {
            sim_speed: 1,
            market_volatility: 'medium',
            event_frequency: 'medium',
            initial_balance: 500.00
        };

        // Check if settings exist
        const [settings] = await db.query(
            'SELECT id FROM simulation_settings WHERE user_id = ?',
            [userId]
        );

        if (settings.length > 0) {
            // Update to defaults
            await db.query(
                `UPDATE simulation_settings 
                 SET sim_speed = ?, market_volatility = ?, event_frequency = ?, 
                     initial_balance = ?, updated_at = NOW()
                 WHERE user_id = ?`,
                [
                    defaultSettings.sim_speed,
                    defaultSettings.market_volatility,
                    defaultSettings.event_frequency,
                    defaultSettings.initial_balance,
                    userId
                ]
            );
        } else {
            // Create with defaults
            await db.query(
                `INSERT INTO simulation_settings 
                 (sim_speed, market_volatility, event_frequency, initial_balance, user_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    defaultSettings.sim_speed,
                    defaultSettings.market_volatility,
                    defaultSettings.event_frequency,
                    defaultSettings.initial_balance,
                    userId
                ]
            );
        }

        // Get updated settings
        const [updatedSettings] = await db.query(
            'SELECT * FROM settings WHERE user_id = ?',
            [userId]
        );

        res.json(updatedSettings[0]);
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