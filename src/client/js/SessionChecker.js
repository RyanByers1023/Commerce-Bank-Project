// src/client/js/SessionChecker.js
class SessionChecker {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.onLoginPage = window.location.pathname.includes('login.html');

        // Check session on initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.checkSession());
        } else {
            this.checkSession();
        }
    }

    async checkSession() {
        try {
            // Don't check if not on login page
            if (!this.onLoginPage) {
                return;
            }

            // Check if user is already authenticated
            const response = await fetch(`${this.apiBaseUrl}/check`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies for session
            });

            if (!response.ok) {
                console.error('Session check failed:', response.status);
                return;
            }

            const data = await response.json();

            // If authenticated and on login page, redirect to dashboard
            if (data.authenticated && this.onLoginPage) {
                // Show a flash message before redirecting
                const message = document.createElement('div');
                message.className = 'fixed top-0 left-0 right-0 bg-primary text-white text-center py-3 px-4 shadow-lg z-50';
                message.innerHTML = `
                    <p class="flex items-center justify-center">
                        <i class="fas fa-check-circle mr-2"></i>
                        You are already logged in. Redirecting to dashboard...
                    </p>
                `;
                document.body.prepend(message);

                // Redirect after brief delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Session check error:', error);
            // Silently fail - no need to bother user with session check errors
        }
    }
}

// Initialize the session checker
const sessionChecker = new SessionChecker();