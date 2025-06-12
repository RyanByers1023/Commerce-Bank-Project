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
        const [sessions] = await db.query(
            'SELECT id, expires_at FROM session WHERE user_id = ? AND expires_at > NOW()',
            [req.session.userId]
        );

        if (sessions.length === 0) {
            // Session expired or not found
            req.session.destroy();
            return res.status(401).json({ error: 'Session expired' });
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

        // FIXED: Add user info to request with consistent naming for route files
        req.user = {
            userId: users[0].id,        // FIXED: Use userId instead of id
            id: users[0].id,           // Keep id for backward compatibility
            username: users[0].username,
            email: users[0].email,
            isAdmin: Boolean(users[0].is_admin),
            isDemoAccount: Boolean(users[0].is_demo_account)
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

    // FIXED: Convert user_id to integer and compare properly
    const requestedUserId = parseInt(user_id);

    if (isNaN(requestedUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Allow access if user is accessing their own data OR is an admin
    if (req.user.userId !== requestedUserId && !req.user.isAdmin) {
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
        if (req.session && req.session.userId) {
            // Extend session expiration in database
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 1); // Extend by 24 hours

            await db.query(
                'UPDATE session SET expires_at = ? WHERE user_id = ? AND expires_at > NOW()',
                [expiresAt, req.session.userId]
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

/**
 * Additional middleware to check ownership of resources
 * Useful for routes that need to verify user owns a specific resource
 */
exports.checkResourceOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Skip ownership check for admins
            if (req.user.isAdmin) {
                return next();
            }

            const userId = req.user.userId;
            let query, params, resourceId;

            switch (resourceType) {
                case 'portfolio':
                    resourceId = req.params.portfolio_id;
                    query = 'SELECT user_id FROM portfolio WHERE id = ?';
                    params = [resourceId];
                    break;

                case 'stock':
                    const symbol = req.params.symbol;
                    const user_id = req.params.user_id || userId;
                    query = 'SELECT user_id FROM stock WHERE symbol = ? AND user_id = ?';
                    params = [symbol, user_id];
                    break;

                default:
                    return res.status(400).json({ error: 'Invalid resource type' });
            }

            const [results] = await db.query(query, params);

            if (results.length === 0) {
                return res.status(404).json({ error: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found` });
            }

            if (results[0].user_id !== userId) {
                return res.status(403).json({ error: 'Unauthorized access to resource' });
            }

            next();
        } catch (error) {
            console.error(`Resource ownership check error for ${resourceType}:`, error);
            res.status(500).json({ error: 'Failed to verify resource ownership' });
        }
    };
};