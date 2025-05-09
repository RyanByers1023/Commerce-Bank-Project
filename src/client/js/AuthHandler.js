// src/client/js/AuthHandler.js
class AuthHandler {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.initializeEventListeners();
        this.errorMessageElement = null;
        this.successMessageElement = null;
    }

    initializeEventListeners() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Get the login form
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            }

            // Get the registration form
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.addEventListener('submit', (e) => this.handleRegistration(e));
            }

            // Toggle between login and registration views
            const toggleViewLinks = document.querySelectorAll('.toggle-view');
            toggleViewLinks.forEach(link => {
                link.addEventListener('click', (e) => this.toggleView(e));
            });

            // Set up demo login button
            const demoLoginButton = document.getElementById('demo-login-btn');
            if (demoLoginButton) {
                demoLoginButton.addEventListener('click', (e) => this.handleDemoLogin(e));
            }

            // Create message elements
            this.createMessageElements();

            // Check URL parameters for any actions or messages
            this.checkUrlParameters();
        });
    }

    /**
     * Handle demo login functionality
     * @param {Event} e - Click event
     */
    async handleDemoLogin(e) {
        e.preventDefault();
        this.hideMessages();

        try {
            const response = await fetch(`${this.apiBaseUrl}/demo-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Important: include cookies for session
            });

            const data = await response.json();

            if (!response.ok) {
                this.showError(data.error || 'Demo login failed');
                return;
            }

            // Demo login successful
            this.showSuccess('Demo login successful! Redirecting to dashboard...');

            // Redirect to dashboard after successful login
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Demo login error:', error);
            this.showError('A network error occurred. Please try again.');
        }
    }

    createMessageElements() {
        // Create error message element if it doesn't exist
        if (!document.getElementById('error-message')) {
            this.errorMessageElement = document.createElement('div');
            this.errorMessageElement.id = 'error-message';
            this.errorMessageElement.className = 'bg-red-100 border border-red-500 text-red-800 px-4 py-3 rounded relative mb-4 hidden';
            this.errorMessageElement.role = 'alert';
        } else {
            this.errorMessageElement = document.getElementById('error-message');
        }

        // Create success message element if it doesn't exist
        if (!document.getElementById('success-message')) {
            this.successMessageElement = document.createElement('div');
            this.successMessageElement.id = 'success-message';
            this.successMessageElement.className = 'bg-green-100 border border-green-500 text-green-800 px-4 py-3 rounded relative mb-4 hidden';
            this.successMessageElement.role = 'alert';
        } else {
            this.successMessageElement = document.getElementById('success-message');
        }

        // Insert message elements before the forms
        const container = document.querySelector('#login-container, #register-container');
        if (container) {
            const formContainer = container.querySelector('.p-8');
            if (formContainer) {
                formContainer.insertBefore(this.errorMessageElement, formContainer.firstChild);
                formContainer.insertBefore(this.successMessageElement, formContainer.firstChild);
            }
        }
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Check for redirect parameter (where to go after login)
        const redirect = urlParams.get('redirect');
        if (redirect) {
            // Store the redirect URL in session storage to use after login
            sessionStorage.setItem('authRedirect', redirect);
        }

        // Check for action parameter (register vs login)
        const action = urlParams.get('action');
        if (action === 'register') {
            // Show registration form
            this.toggleView({ preventDefault: () => {} });
        }

        // Check for error messages
        const error = urlParams.get('error');
        if (error) {
            this.showError(decodeURIComponent(error));
        }

        // Check for success messages
        const success = urlParams.get('success');
        if (success) {
            this.showSuccess(decodeURIComponent(success));
        }

        // Clean up the URL
        if (error || success || action) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.hideMessages();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember').checked;

        try {
            // Basic validation
            if (!email || !password) {
                this.showError('Email and password are required');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, rememberMe }),
                credentials: 'include' // Important: include cookies for session
            });

            const data = await response.json();

            if (!response.ok) {
                this.showError(data.error || 'Login failed');
                return;
            }

            // Login successful
            this.showSuccess('Login successful! Redirecting...');

            // Get redirect URL from session storage or default to dashboard
            const redirectUrl = sessionStorage.getItem('authRedirect') || 'dashboard.html';
            sessionStorage.removeItem('authRedirect'); // Clear after use

            // Redirect after successful login
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } catch (error) {
            console.error('Login error:', error);
            this.showError('A network error occurred. Please try again.');
        }
    }

    async handleRegistration(e) {
        e.preventDefault();
        this.hideMessages();

        const username = document.getElementById('username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        try {
            // Basic validation
            if (!username || !email || !password || !confirmPassword) {
                this.showError('All fields are required');
                return;
            }

            // Username validation (3-20 alphanumeric characters, underscores allowed)
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                this.showError('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
                return;
            }

            // Email validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.showError('Please enter a valid email address');
                return;
            }

            // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
                this.showError('Password must be at least 8 characters and include uppercase, lowercase, and a number');
                return;
            }

            // Password confirmation
            if (password !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password }),
                credentials: 'include' // Important: include cookies for session
            });

            const data = await response.json();

            if (!response.ok) {
                this.showError(data.error || 'Registration failed');
                return;
            }

            // Registration successful
            this.showSuccess('Registration successful! Redirecting to dashboard...');

            // Get redirect URL from session storage or default to dashboard
            const redirectUrl = sessionStorage.getItem('authRedirect') || 'dashboard.html';
            sessionStorage.removeItem('authRedirect'); // Clear after use

            // Redirect after successful registration
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('A network error occurred. Please try again.');
        }
    }

    toggleView(e) {
        e.preventDefault();
        this.hideMessages();

        const loginContainer = document.getElementById('login-container');
        const registerContainer = document.getElementById('register-container');

        if (loginContainer && registerContainer) {
            loginContainer.classList.toggle('hidden');
            registerContainer.classList.toggle('hidden');
        }
    }

    // Add this to the AuthHandler.js file after the toggleView method

    /**
     * Handle demo login functionality
     * @param {Event} e - Click event
     */

    showSuccess(message) {
        if (this.successMessageElement) {
            this.successMessageElement.textContent = message;
            this.successMessageElement.classList.remove('hidden');
        }
    }

    showError(message) {
        if (this.errorMessageElement) {
            this.errorMessageElement.textContent = message;
            this.errorMessageElement.classList.remove('hidden');
        }
    }

    hideMessages() {
        if (this.errorMessageElement) {
            this.errorMessageElement.classList.add('hidden');
        }
        if (this.successMessageElement) {
            this.successMessageElement.classList.add('hidden');
        }
    }
}

// Initialize the auth handler
const authHandler = new AuthHandler();