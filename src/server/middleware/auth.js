const db = require('./db');

/**
 * Middleware to verify user authentication token
 * This uses Express session authentication
 */
exports.verifyToken = async (req, res, next) => {
    try {
        // Check if session exists
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Check if session is still valid in database
        if (req.session.id) {
            const [sessions] = await db.query(
                'SELECT * FROM session WHERE id = ? AND expires_at > NOW()',
                [req.session.id]
            );

            if (sessions.length === 0) {
                // Session expired or not found
                req.session.destroy();
                return res.status(401).json({ error: 'Session expired' });
            }
        }

        // Get user information
        const [users] = await db.query(
            'SELECT id, username, email, is_admin, is_demo_account FROM user WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            // User not found
            req.session.destroy();
            return res.status(401).json({ error: 'User not found' });
        }

        // Add user info to request - FIX: Consistent naming
        req.user = {
            id: users[0].id,
            username: users[0].username,
            email: users[0].email,
            isAdmin: users[0].is_admin,
            isDemoAccount: users[0].is_demo_account
        };

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Failed to authenticate user' });
    }
};

/**
 * Middleware to check if user is an admin
 * Must be used after verifyToken middleware
 */
exports.isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Requires admin privileges' });
    }

    next();
};

/**
 * Middleware to check if user is accessing their own data
 * or is an admin
 */
exports.isUserOrAdmin = (req, res, next) => {
    const { user_id } = req.params;

    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // FIX: Compare with user ID, allow admin access
    if (req.user.id !== user_id && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    next();
};

/**
 * Middleware to extend session expiration time
 * This keeps the session active during user activity
 */
exports.extendSession = async (req, res, next) => {
    try {
        if (req.session && req.session.sessionID) {
            // Extend session expiration in database
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 1); // Extend by 24 hours

            await db.query(
                'UPDATE session SET expires_at = ? WHERE id = ?',
                [expiresAt, req.session.sessionID]
            );
        }

        next();
    } catch (error) {
        console.error('Session extension error:', error);
        // Continue to next middleware even if extension fails
        next();
    }
};

/**
 * Middleware to check if a request is from a demo account
 * Restricts certain actions for demo accounts
 */
exports.checkDemoAccount = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        // Check if user is a demo account
        if (req.user.isDemoAccount) {
            // Set demo flag on request
            req.isDemo = true;

            // Check for restricted actions
            const restrictedActions = [
                { method: 'DELETE', path: /^\/api\/users\// },     // Delete account
                { method: 'POST', path: /^\/api\/stocks\// },      // Add custom stock
                { method: 'DELETE', path: /^\/api\/stocks\// }     // Delete custom stock
            ];

            for (const action of restrictedActions) {
                if (req.method === action.method && action.path.test(req.path)) {
                    return res.status(403).json({
                        error: 'This action is not available for demo accounts',
                        isDemo: true
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('Demo account check error:', error);
        next();
    }
};