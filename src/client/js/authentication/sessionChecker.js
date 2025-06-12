import { authService, requireAuth, redirectIfAuthenticated } from '../dbServices/authService.js';

/**
 * Session management and route protection service
 */
class SessionChecker {
    constructor() {
        this.currentPath = window.location.pathname;
        this.urlParams = new URLSearchParams(window.location.search);
        this.isInitialized = false;
        this.authUnsubscribe = null;

        // Route configuration
        this.routes = new RouteConfig();

        // Initialize
        this.init();
    }

    /**
     * Initialize session checker
     */
    async init() {
        try {
            // Set up auth state listener first
            this.setupAuthStateListener();

            // Perform initial auth check
            await this.performInitialAuthCheck();

            // Set up additional event listeners
            this.setupEventListeners();

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize session checker:', error);
            // Continue with app initialization even if session check fails
            this.isInitialized = true;
        }
    }

    /**
     * Set up auth state change listener
     */
    setupAuthStateListener() {
        this.authUnsubscribe = authService.onAuthStateChanged((user, isAuthenticated) => {
            this.handleAuthStateChange(user, isAuthenticated);
        });
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(user, isAuthenticated) {
        const currentRoute = this.routes.getCurrentRoute();

        if (isAuthenticated) {
            this.handleAuthenticatedUser(user, currentRoute);
        } else {
            this.handleUnauthenticatedUser(currentRoute);
        }
    }

    /**
     * Handle authenticated user routing
     */
    handleAuthenticatedUser(user, currentRoute) {
        // If on auth pages and authenticated, redirect appropriately
        if (currentRoute.type === 'auth') {
            const redirectUrl = this.urlParams.get('redirect');
            const targetUrl = redirectUrl ? decodeURIComponent(redirectUrl) : './dashboard.html';

            // Only redirect if not already on target page
            if (!window.location.pathname.includes(targetUrl.replace('./', ''))) {
                this.redirect(targetUrl, 'Already authenticated');
            }
        }

        // Update UI for authenticated state if needed
        this.updateUIForAuthenticatedUser(user);
    }

    /**
     * Handle unauthenticated user routing
     */
    handleUnauthenticatedUser(currentRoute) {
        // If trying to access protected page, redirect to login
        if (currentRoute.type === 'protected') {
            const loginUrl = `./login.html?redirect=${encodeURIComponent(this.currentPath)}`;
            this.redirect(loginUrl, 'Authentication required');
        }

        // Update UI for unauthenticated state
        this.updateUIForUnauthenticatedUser();
    }

    /**
     * Perform initial authentication check
     */
    async performInitialAuthCheck() {
        try {
            // Use auth service instead of direct API call
            const isAuthenticated = await authService.checkAuthStatus();
            const currentRoute = this.routes.getCurrentRoute();

            if (isAuthenticated) {
                const user = await authService.getCurrentUser();
                this.handleAuthenticatedUser(user, currentRoute);
            } else {
                this.handleUnauthenticatedUser(currentRoute);
            }
        } catch (error) {
            console.error('Initial auth check failed:', error);
            // Don't redirect on error to avoid infinite loops
        }
    }

    /**
     * Update UI elements for authenticated user
     */
    updateUIForAuthenticatedUser(user) {
        // Update user info in navigation if exists
        const userNameElements = document.querySelectorAll('[data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = user.username || 'User';
        });

        const userEmailElements = document.querySelectorAll('[data-user-email]');
        userEmailElements.forEach(el => {
            el.textContent = user.email || '';
        });

        // Show authenticated elements
        const authElements = document.querySelectorAll('[data-auth-show]');
        authElements.forEach(el => {
            el.classList.remove('hidden');
        });

        // Hide unauthenticated elements
        const unauthElements = document.querySelectorAll('[data-unauth-show]');
        unauthElements.forEach(el => {
            el.classList.add('hidden');
        });

        // Show/hide demo account specific elements
        if (user.isDemo) {
            const demoElements = document.querySelectorAll('[data-demo-show]');
            demoElements.forEach(el => {
                el.classList.remove('hidden');
            });
        }
    }

    /**
     * Update UI elements for unauthenticated user
     */
    updateUIForUnauthenticatedUser() {
        // Hide authenticated elements
        const authElements = document.querySelectorAll('[data-auth-show]');
        authElements.forEach(el => {
            el.classList.add('hidden');
        });

        // Show unauthenticated elements
        const unauthElements = document.querySelectorAll('[data-unauth-show]');
        unauthElements.forEach(el => {
            el.classList.remove('hidden');
        });

        // Hide demo elements
        const demoElements = document.querySelectorAll('[data-demo-show]');
        demoElements.forEach(el => {
            el.classList.add('hidden');
        });
    }

    /**
     * Set up additional event listeners
     */
    setupEventListeners() {
        // Listen for storage events (for multi-tab logout)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authStateChanged') {
                this.handleStorageAuthChange(e.newValue);
            }
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                this.refreshAuthState();
            }
        });

        // Listen for logout buttons
        const logoutButtons = document.querySelectorAll('[data-logout]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });
    }

    /**
     * Handle storage-based auth changes (multi-tab support)
     */
    async handleStorageAuthChange(newValue) {
        try {
            const authData = newValue ? JSON.parse(newValue) : null;

            if (authData && authData.action === 'logout') {
                // User logged out in another tab
                await authService.logout();
            } else if (authData && authData.action === 'login') {
                // User logged in in another tab
                await authService.checkAuthStatus();
            }
        } catch (error) {
            console.error('Error handling storage auth change:', error);
        }
    }

    /**
     * Refresh authentication state
     */
    async refreshAuthState() {
        try {
            await authService.checkAuthStatus();
        } catch (error) {
            console.error('Error refreshing auth state:', error);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await authService.logout();

            // Notify other tabs
            localStorage.setItem('authStateChanged', JSON.stringify({
                action: 'logout',
                timestamp: Date.now()
            }));

            // Redirect to home page
            this.redirect('./index.html', 'Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            // Still redirect even if logout API call fails
            this.redirect('./index.html', 'Logged out');
        }
    }

    /**
     * Redirect with optional message
     */
    redirect(url, message = null) {
        if (message) {
            console.log(`Redirecting: ${message}`);
        }

        // Avoid redirect loops
        const currentPage = window.location.pathname.split('/').pop();
        const targetPage = url.replace('./', '');

        if (currentPage !== targetPage) {
            window.location.href = url;
        }
    }

    /**
     * Cleanup session checker
     */
    cleanup() {
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
        }
    }
}

/**
 * Route configuration and management
 */
class RouteConfig {
    constructor() {
        this.routeConfig = {
            // Public routes (accessible without authentication)
            public: [
                'index.html',
                'about.html',
                'privacy.html',
                'terms.html',
                'contact.html'
            ],

            // Auth routes (login/register pages)
            auth: [
                'login.html',
                'register.html',
                'forgot-password.html',
                'reset-password.html'
            ],

            // Protected routes (require authentication)
            protected: [
                'dashboard.html',
                'simulator.html',
                'portfolio.html',
                'profile.html',
                'settings.html',
                'transactions.html',
                'stocks.html'
            ],

            // Admin routes (require admin privileges)
            admin: [
                'admin.html',
                'admin-users.html',
                'admin-settings.html'
            ]
        };
    }

    /**
     * Get current route information
     */
    getCurrentRoute() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';

        for (const [type, routes] of Object.entries(this.routeConfig)) {
            if (routes.some(route => currentPage.includes(route.replace('.html', '')))) {
                return {
                    type,
                    page: currentPage,
                    requiresAuth: type === 'protected' || type === 'admin',
                    requiresAdmin: type === 'admin'
                };
            }
        }

        // Default to public if not found
        return {
            type: 'public',
            page: currentPage,
            requiresAuth: false,
            requiresAdmin: false
        };
    }

    /**
     * Check if current route requires authentication
     */
    requiresAuthentication() {
        const route = this.getCurrentRoute();
        return route.requiresAuth;
    }

    /**
     * Check if current route requires admin privileges
     */
    requiresAdmin() {
        const route = this.getCurrentRoute();
        return route.requiresAdmin;
    }

    /**
     * Add route to configuration
     */
    addRoute(type, route) {
        if (this.routeConfig[type]) {
            this.routeConfig[type].push(route);
        }
    }

    /**
     * Remove route from configuration
     */
    removeRoute(type, route) {
        if (this.routeConfig[type]) {
            this.routeConfig[type] = this.routeConfig[type].filter(r => r !== route);
        }
    }
}

/**
 * Global session checker utilities
 */
window.SessionUtils = {
    /**
     * Check if user has required permissions for current page
     */
    async checkPermissions() {
        const routes = new RouteConfig();
        const currentRoute = routes.getCurrentRoute();

        if (currentRoute.requiresAdmin) {
            const user = await authService.getCurrentUser();
            if (!user || !user.isAdmin) {
                window.location.href = './dashboard.html?error=insufficient_permissions';
                return false;
            }
        }

        return true;
    },

    /**
     * Require authentication for current page
     */
    requireAuth() {
        return requireAuth();
    },

    /**
     * Redirect if already authenticated
     */
    redirectIfAuthenticated() {
        return redirectIfAuthenticated();
    }
};

// Auto-initialize when DOM is ready
function initializeSessionChecker() {
    if (window.sessionChecker) {
        window.sessionChecker.cleanup();
    }

    window.sessionChecker = new SessionChecker();
}

// Initialize based on document state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSessionChecker);
} else {
    initializeSessionChecker();
}

// Export for module use
export { SessionChecker, RouteConfig };