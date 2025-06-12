// Import services (adjust paths as needed)
import { authService, redirectIfAuthenticated } from './services/authService.js';

/**
 * Authentication handler for login/register page
 */
class AuthHandler {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.elements = this.getElements();
        this.validators = new FormValidators();
        this.ui = new UIManager();

        // Check if user is already authenticated
        this.checkExistingAuth();
    }

    /**
     * Get all DOM elements
     */
    getElements() {
        return {
            loginContainer: document.getElementById('login-container'),
            registerContainer: document.getElementById('register-container'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            loginButton: document.getElementById('login-button'),
            registerButton: document.getElementById('register-button'),
            demoLoginBtn: document.getElementById('demo-login-btn'),
            toggleLinks: document.querySelectorAll('.toggle-view'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password')
        };
    }

    /**
     * Check if user is already authenticated and redirect if needed
     */
    async checkExistingAuth() {
        try {
            const isAuthenticated = await authService.checkAuthStatus();
            if (isAuthenticated) {
                redirectIfAuthenticated();
                return;
            }
        } catch (error) {
            console.log('Not authenticated, proceeding with login page');
        }
    }

    /**
     * Initialize the auth handler
     */
    init() {
        this.handleRegistrationSuccess();
        this.setupEventListeners();
        this.setupFormValidation();
    }

    /**
     * Handle successful registration redirect
     */
    handleRegistrationSuccess() {
        const isRegistered = this.urlParams.get('registered') === 'true';
        const registeredEmail = this.urlParams.get('email');

        if (isRegistered && registeredEmail && this.elements.loginContainer) {
            this.ui.showSuccessMessage(
                'Registration successful! Please log in with your credentials.',
                this.elements.loginContainer
            );

            // Pre-fill email and focus password
            if (this.elements.emailInput) {
                this.elements.emailInput.value = decodeURIComponent(registeredEmail);
            }
            if (this.elements.passwordInput) {
                this.elements.passwordInput.focus();
            }
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // View toggle listeners
        this.setupViewToggle();

        // Form submission listeners
        this.setupLoginForm();
        this.setupRegisterForm();

        // Demo login listener
        this.setupDemoLogin();
    }

    /**
     * Setup view toggle between login and register
     */
    setupViewToggle() {
        this.elements.toggleLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleView();
            });
        });
    }

    /**
     * Toggle between login and register views
     */
    toggleView() {
        const { loginContainer, registerContainer } = this.elements;

        if (loginContainer.classList.contains('hidden')) {
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        } else {
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
        }

        // Clear any existing messages
        this.ui.clearMessages();
    }

    /**
     * Setup login form handling
     */
    setupLoginForm() {
        if (!this.elements.loginForm) return;

        this.elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const formData = new FormData(this.elements.loginForm);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password'),
            rememberMe: formData.get('remember') === 'on'
        };

        // Validate form
        const validation = this.validators.validateLogin(loginData);
        if (!validation.isValid) {
            this.ui.showErrorMessage(validation.message, this.elements.loginContainer);
            return;
        }

        // Set loading state
        this.ui.setButtonLoading(this.elements.loginButton, 'Signing in...');

        try {
            // Use authService instead of direct API call
            const result = await authService.login(
                loginData.email,
                loginData.password,
                loginData.rememberMe
            );

            this.ui.showSuccessMessage('Login successful! Redirecting...', this.elements.loginContainer);

            // Redirect after short delay
            setTimeout(() => {
                const redirectUrl = this.urlParams.get('redirect') || './dashboard.html';
                window.location.href = decodeURIComponent(redirectUrl);
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            this.ui.showErrorMessage(
                error.message || 'Login failed. Please check your credentials.',
                this.elements.loginContainer
            );
        } finally {
            this.ui.resetButtonState(this.elements.loginButton, 'Sign In', 'fa-sign-in-alt');
        }
    }

    /**
     * Setup register form handling
     */
    setupRegisterForm() {
        if (!this.elements.registerForm) return;

        this.elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
    }

    /**
     * Handle register form submission
     */
    async handleRegister() {
        const formData = new FormData(this.elements.registerForm);
        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirm-password')
        };

        // Validate form
        const validation = this.validators.validateRegistration(registerData);
        if (!validation.isValid) {
            this.ui.showErrorMessage(validation.message, this.elements.registerContainer);
            return;
        }

        // Set loading state
        this.ui.setButtonLoading(this.elements.registerButton, 'Creating account...');

        try {
            // Use authService instead of direct API call
            const result = await authService.register(
                registerData.username,
                registerData.email,
                registerData.password
            );

            this.ui.showSuccessMessage('Registration successful! Redirecting...', this.elements.registerContainer);

            // Redirect to login with success message
            setTimeout(() => {
                window.location.href = `./login.html?registered=true&email=${encodeURIComponent(registerData.email)}`;
            }, 1500);

        } catch (error) {
            console.error('Registration error:', error);
            this.ui.showErrorMessage(
                error.message || 'Registration failed. Please try again.',
                this.elements.registerContainer
            );
        } finally {
            this.ui.resetButtonState(this.elements.registerButton, 'Create Account', 'fa-user-plus');
        }
    }

    /**
     * Setup demo login handling
     */
    setupDemoLogin() {
        if (!this.elements.demoLoginBtn) return;

        this.elements.demoLoginBtn.addEventListener('click', async () => {
            await this.handleDemoLogin();
        });
    }

    /**
     * Handle demo login
     */
    async handleDemoLogin() {
        this.ui.setButtonLoading(this.elements.demoLoginBtn, 'Setting up demo...');

        try {
            // Use authService instead of direct API call
            const result = await authService.demoLogin();

            this.ui.showSuccessMessage('Demo account ready! Redirecting...', this.elements.loginContainer);

            setTimeout(() => {
                window.location.href = './dashboard.html'; // Changed to dashboard for consistency
            }, 1000);

        } catch (error) {
            console.error('Demo login error:', error);
            this.ui.showErrorMessage(
                error.message || 'Demo login failed. Please try again.',
                this.elements.loginContainer
            );
        } finally {
            this.ui.resetButtonState(this.elements.demoLoginBtn, 'Or Try a Demo!', 'fa-rocket');
        }
    }

    /**
     * Setup real-time form validation
     */
    setupFormValidation() {
        // Add input event listeners for real-time validation
        const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');

        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                // Clear error state on input
                this.clearFieldError(input);
            });
        });
    }

    /**
     * Validate individual field
     */
    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let message = '';

        switch (input.type) {
            case 'email':
                if (!this.validators.isValidEmail(value)) {
                    isValid = false;
                    message = 'Please enter a valid email address';
                }
                break;
            case 'password':
                if (input.name === 'password' && value.length < 8) {
                    isValid = false;
                    message = 'Password must be at least 8 characters long';
                }
                break;
            case 'text':
                if (input.name === 'username' && value.length < 3) {
                    isValid = false;
                    message = 'Username must be at least 3 characters long';
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(input, message);
        } else {
            this.clearFieldError(input);
        }

        return isValid;
    }

    /**
     * Show field-specific error
     */
    showFieldError(input, message) {
        input.classList.add('border-red-500');

        // Remove existing error message
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-600 text-sm mt-1';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    clearFieldError(input) {
        input.classList.remove('border-red-500');
        const errorDiv = input.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

/**
 * Form validation utilities
 */
class FormValidators {
    /**
     * Validate login form data
     */
    validateLogin(data) {
        if (!data.email || !data.password) {
            return { isValid: false, message: 'Email and password are required' };
        }

        if (!this.isValidEmail(data.email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        return { isValid: true };
    }

    /**
     * Validate registration form data
     */
    validateRegistration(data) {
        if (!data.username || !data.email || !data.password || !data.confirmPassword) {
            return { isValid: false, message: 'All fields are required' };
        }

        if (data.username.length < 3) {
            return { isValid: false, message: 'Username must be at least 3 characters long' };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
            return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }

        if (!this.isValidEmail(data.email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        if (data.password.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters long' };
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
        }

        if (data.password !== data.confirmPassword) {
            return { isValid: false, message: 'Passwords do not match' };
        }

        return { isValid: true };
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

/**
 * UI management utilities
 */
class UIManager {
    /**
     * Show success message
     */
    showSuccessMessage(message, container) {
        this.showMessage('success', message, container);
    }

    /**
     * Show error message
     */
    showErrorMessage(message, container) {
        this.showMessage('error', message, container);
    }

    /**
     * Show message in container
     */
    showMessage(type, message, container) {
        if (!container) return;

        // Remove existing messages
        this.clearMessages(container);

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-alert ${
            type === 'success'
                ? 'bg-green-100/90 border-green-500 text-green-800'
                : 'bg-red-100/90 border-red-500 text-red-800'
        } border px-4 py-3 rounded-lg mb-4`;

        messageDiv.innerHTML = `
            <div class="flex items-start">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mt-0.5 mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        // Insert after header
        const header = container.querySelector('.text-center.mb-8');
        if (header) {
            header.insertAdjacentElement('afterend', messageDiv);
        } else {
            container.insertBefore(messageDiv, container.firstChild);
        }
    }

    /**
     * Clear all messages
     */
    clearMessages(container = document) {
        const messages = container.querySelectorAll('.message-alert');
        messages.forEach(msg => msg.remove());
    }

    /**
     * Set button to loading state
     */
    setButtonLoading(button, text) {
        if (!button) return;

        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${text}`;
    }

    /**
     * Reset button to normal state
     */
    resetButtonState(button, text, iconClass) {
        if (!button) return;

        button.disabled = false;
        button.innerHTML = `<i class="fas ${iconClass} mr-2"></i>${text}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const authHandler = new AuthHandler();
    authHandler.init();
});