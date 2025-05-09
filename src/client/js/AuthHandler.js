// src/client/js/AuthHandler.js
class AuthHandler {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.errorMessageElement = null;
        this.successMessageElement = null;

        // Initialize handlers once DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeEventListeners());
        } else {
            this.initializeEventListeners();
        }
    }

    initializeEventListeners() {
        // Create message elements
        this.createMessageElements();

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

        // Check URL parameters for any actions or messages
        this.checkUrlParameters();
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
            this.toggleView({ preventDefault: () => {} }, 'register');
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

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember')?.checked || false;

            // Basic validation
            if (!email || !password) {
                return this.showError('Email and password are required');
            }

            // Email format validation
            if (!this.validateEmail(email)) {
                return this.showError('Please enter a valid email address');
            }

            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Signing in...';

            try {
                // First, check server connectivity
                const testResponse = await fetch('/api/test', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    // Use a short timeout to quickly detect server issues
                    signal: AbortSignal.timeout(3000)
                });

                if (!testResponse.ok) {
                    throw new Error('Server not responding properly');
                }
            } catch (connError) {
                console.error('Server connection test failed:', connError);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Cannot connect to server. Please check if the server is running.');
            }

            // Now proceed with login request
            let response;
            try {
                // Send login request to server
                response = await fetch(`${this.apiBaseUrl}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, rememberMe }),
                    credentials: 'include' // Important: include cookies for session
                });
            } catch (fetchError) {
                console.error('Fetch error during login:', fetchError);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Network error when connecting to the server. Please try again later.');
            }

            // Handle server errors
            if (response.status >= 500) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Server error. This might be due to database connectivity issues.');
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Received an invalid response from the server.');
            }

            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            // Handle authentication errors
            if (!response.ok) {
                const errorMessage = data.error || 'Login failed';

                // Special handling for common errors
                if (response.status === 401) {
                    return this.showError('Invalid email or password. Please try again.');
                } else if (response.status === 404) {
                    return this.showError('User not found. Please check your email or register.');
                } else {
                    return this.showError(errorMessage);
                }
            }

            // Login successful
            this.showSuccess('Login successful! Redirecting...');

            // Get redirect URL from session storage or default to dashboard
            const redirectUrl = sessionStorage.getItem('authRedirect') || 'dashboard.html';
            sessionStorage.removeItem('authRedirect'); // Clear after use

            // Redirect after successful login
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
        } catch (error) {
            console.error('Login error:', error);
            // Reset any loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
            }
            this.showError('An unexpected error occurred. Please try again.');
        }
    }

    async handleRegistration(e) {
        e.preventDefault();
        this.hideMessages();

        try {
            const username = document.getElementById('username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Basic validation
            if (!username || !email || !password || !confirmPassword) {
                return this.showError('All fields are required');
            }

            // Username validation
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                return this.showError('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
            }

            // Email validation
            if (!this.validateEmail(email)) {
                return this.showError('Please enter a valid email address');
            }

            // Password validation
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
                return this.showError('Password must be at least 8 characters and include uppercase, lowercase, and a number');
            }

            // Password confirmation
            if (password !== confirmPassword) {
                return this.showError('Passwords do not match');
            }

            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Creating account...';

            // First, check server connectivity
            try {
                const testResponse = await fetch('/api/test', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    // Use a short timeout to quickly detect server issues
                    signal: AbortSignal.timeout(3000)
                });

                if (!testResponse.ok) {
                    throw new Error('Server not responding properly');
                }
            } catch (connError) {
                console.error('Server connection test failed:', connError);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Cannot connect to server. Please check if the server is running.');
            }

            // Now proceed with registration request
            let response;
            try {
                // Send registration request to server
                response = await fetch(`${this.apiBaseUrl}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password }),
                    credentials: 'include' // Important: include cookies for session
                });
            } catch (fetchError) {
                console.error('Fetch error during registration:', fetchError);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Network error when connecting to the server. Please try again later.');
            }

            // Handle server errors
            if (response.status >= 500) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Server error. This might be due to database connectivity issues.');
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return this.showError('Received an invalid response from the server.');
            }

            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            // Handle registration errors
            if (!response.ok) {
                const errorMessage = data.error || 'Registration failed';

                // Special handling for common errors
                if (response.status === 409) {
                    if (errorMessage.includes('Username already exists')) {
                        return this.showError('This username is already taken. Please choose another one.');
                    } else if (errorMessage.includes('Email already exists')) {
                        return this.showError('This email is already registered. Please use another email or try to log in.');
                    }
                }

                return this.showError(errorMessage);
            }

            // Registration successful
            this.showSuccess('Registration successful! Redirecting to dashboard...');

            // Get redirect URL from session storage or default to dashboard
            const redirectUrl = sessionStorage.getItem('authRedirect') || 'dashboard.html';
            sessionStorage.removeItem('authRedirect'); // Clear after use

            // Redirect after successful registration
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
        } catch (error) {
            console.error('Registration error:', error);

            // Reset any loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create Account';
            }

            this.showError('An unexpected error occurred. Please try again.');
        }
    }

    async handleDemoLogin(e) {
        e.preventDefault();
        this.hideMessages();

        try {
            // Show loading state
            const button = e.target;
            const originalButtonText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Loading demo...';

            // First, check server connectivity
            try {
                const testResponse = await fetch('/api/test', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    // Use a short timeout to quickly detect server issues
                    signal: AbortSignal.timeout(3000)
                });

                if (!testResponse.ok) {
                    throw new Error('Server not responding properly');
                }
            } catch (connError) {
                console.error('Server connection test failed:', connError);
                button.disabled = false;
                button.innerHTML = originalButtonText;
                return this.showError('Cannot connect to server. Please check if the server is running.');
            }

            // Now proceed with demo login request
            let response;
            try {
                // Send demo login request to server
                response = await fetch(`${this.apiBaseUrl}/demo-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include' // Important: include cookies for session
                });
            } catch (fetchError) {
                console.error('Fetch error during demo login:', fetchError);
                button.disabled = false;
                button.innerHTML = originalButtonText;
                return this.showError('Network error when connecting to the server. Please try again later.');
            }

            // Handle server errors
            if (response.status >= 500) {
                button.disabled = false;
                button.innerHTML = originalButtonText;
                return this.showError('Server error. This might be due to database connectivity issues.');
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                button.disabled = false;
                button.innerHTML = originalButtonText;
                return this.showError('Received an invalid response from the server.');
            }

            // Reset button state
            button.disabled = false;
            button.innerHTML = originalButtonText;

            if (!response.ok) {
                return this.showError(data.error || 'Demo login failed');
            }

            // Demo login successful
            this.showSuccess('Demo login successful! Redirecting to dashboard...');

            // Redirect to dashboard after successful login
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            console.error('Demo login error:', error);

            // Reset any loading state
            const button = e.target;
            if (button) {
                button.disabled = false;
                button.innerHTML = originalButtonText || '<i class="fas fa-rocket mr-2"></i>Or Try a Demo!';
            }

            this.showError('An unexpected error occurred. Please try again.');
        }
    }

    toggleView(e, forcedView = null) {
        e.preventDefault();
        this.hideMessages();

        const loginContainer = document.getElementById('login-container');
        const registerContainer = document.getElementById('register-container');

        if (loginContainer && registerContainer) {
            if (forcedView === 'register' || (forcedView === null && loginContainer.classList.contains('hidden') === false)) {
                // Switch to register view
                loginContainer.classList.add('hidden');
                registerContainer.classList.remove('hidden');
            } else {
                // Switch to login view
                loginContainer.classList.remove('hidden');
                registerContainer.classList.add('hidden');
            }
        }
    }

    validateEmail(email) {
        // Regular expression for email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showSuccess(message) {
        if (this.successMessageElement) {
            this.successMessageElement.textContent = message;
            this.successMessageElement.classList.remove('hidden');
            // Scroll to message
            this.successMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showError(message) {
        if (this.errorMessageElement) {
            this.errorMessageElement.textContent = message;
            this.errorMessageElement.classList.remove('hidden');
            // Scroll to message
            this.errorMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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