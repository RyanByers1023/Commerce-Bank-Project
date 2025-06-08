(function() {
    // Check if user is already logged in
    async function checkSession() {
        try {
            const response = await fetch('/api/auth/check');
            const data = await response.json();

            if (data.authenticated) {
                // User is already logged in
                const currentPath = window.location.pathname;
                const publicPaths = ['/index.html', '/about.html', '/login.html', '/register.html', '/resetPassword.html', '/'];

                // If on login/register page and already authenticated, redirect to dashboard
                if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
                    // Check if there's a redirect parameter
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirectUrl = urlParams.get('redirect');

                    if (redirectUrl) {
                        window.location.href = decodeURIComponent(redirectUrl);
                    } else {
                        window.location.href = './dashboard.html';
                    }
                }
            } else {
                // User is not authenticated
                const currentPath = window.location.pathname;
                const protectedPaths = ['/dashboard.html', '/simulator.html', '/profile.html', '/settings.html'];

                // If trying to access protected page, redirect to login
                if (protectedPaths.some(path => currentPath.includes(path))) {
                    window.location.href = `./login.html?redirect=${encodeURIComponent(currentPath)}`;
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            // In case of error, don't redirect to avoid loops
        }
    }

    // Run session check when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkSession);
    } else {
        checkSession();
    }
})();