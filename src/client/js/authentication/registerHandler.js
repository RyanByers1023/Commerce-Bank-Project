import { authService, redirectIfAuthenticated } from '../dbServices/authService.js';

/**
 * Registration handler for register page
 */
class RegisterHandler {
    constructor() {
        this.elements = this.getElements();
        this.passwordValidator = new PasswordValidator();
        this.ui = new UIManager();
        this.formValidator = new FormValidator();

        // Check if user is already authenticated
        this.checkExistingAuth();
    }

    /**
     * Get all DOM elements
     */
    getElements() {
        return {
            form: document.getElementById('register-form'),
            usernameInput: document.getElementById('username'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            confirmPasswordInput: document.getElementById('confirm-password'),
            registerButton: document.getElementById('register-button'),
            errorMessage: document.getElementById('error-message'),
            errorText: document.getElementById('error-text'),
            successMessage: document.getElementById('success-message'),
            successText: document.getElementById('success-text'),

            // Password visibility toggles
            togglePassword: document.getElementById('toggle-password'),
            toggleConfirmPassword: document.getElementById('toggle-confirm-password'),

            // Password requirement checks
            lengthCheck: document.getElementById('length-check'),
            uppercaseCheck: document.getElementById('uppercase-check'),
            lowercaseCheck: document.getElementById('lowercase-check'),
            numberCheck: document.getElementById('number-check'),
            specialCheck: document.getElementById('special-check'),
            passwordMatch: document.getElementById('password-match'),
            passwordStrength: document.getElementById('password-strength'),

            // Additional elements
            usernameAvailable: document.getElementById('username-available'),
            emailAvailable: document.getElementById('email-available')
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
            console.log('Not authenticated, proceeding with registration page');
        }
    }

    /**
     * Initialize the register handler
     */
    init() {
        this.setupEventListeners();
        this.setupPasswordValidation();
        this.setupRealTimeValidation();
        this.handleDemoMessage();
        this.setupAccessibility();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Form submission
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Password visibility toggles
        this.setupPasswordToggles();

        // Real-time validation
        this.setupInputValidation();
    }

    /**
     * Setup password visibility toggles
     */
    setupPasswordToggles() {
        if (this.elements.togglePassword) {
            this.elements.togglePassword.addEventListener('click', () => {
                this.ui.togglePasswordVisibility(this.elements.passwordInput, this.elements.togglePassword);
            });
        }

        if (this.elements.toggleConfirmPassword) {
            this.elements.toggleConfirmPassword.addEventListener('click', () => {
                this.ui.togglePasswordVisibility(this.elements.confirmPasswordInput, this.elements.toggleConfirmPassword);
            });
        }
    }

    /**
     * Setup real-time input validation
     */
    setupInputValidation() {
        // Username validation
        if (this.elements.usernameInput) {
            this.elements.usernameInput.addEventListener('input',
                this.debounce(() => this.validateUsername(), 500)
            );
            this.elements.usernameInput.addEventListener('blur', () => this.validateUsername());
        }

        // Email validation
        if (this.elements.emailInput) {
            this.elements.emailInput.addEventListener('input',
                this.debounce(() => this.validateEmail(), 500)
            );
            this.elements.emailInput.addEventListener('blur', () => this.validateEmail());
        }

        // Password validation
        if (this.elements.passwordInput) {
            this.elements.passwordInput.addEventListener('input', () => {
                this.validatePassword();
                this.checkPasswordMatch();
            });
        }

        // Confirm password validation
        if (this.elements.confirmPasswordInput) {
            this.elements.confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordMatch();
            });
        }
    }

    /**
     * Setup password validation indicators
     */
    setupPasswordValidation() {
        this.passwordValidator.init(this.elements);
    }

    /**
     * Setup real-time validation with debouncing
     */
    setupRealTimeValidation() {
        // Add visual feedback for form completion
        const inputs = [this.elements.usernameInput, this.elements.emailInput,
            this.elements.passwordInput, this.elements.confirmPasswordInput];

        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.updateFormProgress());
            }
        });
    }

    /**
     * Validate username
     */
    async validateUsername() {
        const username = this.elements.usernameInput?.value.trim();
        if (!username) return;

        const validation = this.formValidator.validateUsername(username);

        if (validation.isValid) {
            // Check availability (you could add this feature)
            this.ui.showFieldStatus(this.elements.usernameInput, 'valid', 'Username is valid');
        } else {
            this.ui.showFieldStatus(this.elements.usernameInput, 'invalid', validation.message);
        }
    }

    /**
     * Validate email
     */
    async validateEmail() {
        const email = this.elements.emailInput?.value.trim();
        if (!email) return;

        const validation = this.formValidator.validateEmail(email);

        if (validation.isValid) {
            // Check availability (you could add this feature)
            this.ui.showFieldStatus(this.elements.emailInput, 'valid', 'Email is valid');
        } else {
            this.ui.showFieldStatus(this.elements.emailInput, 'invalid', validation.message);
        }
    }

    /**
     * Validate password
     */
    validatePassword() {
        const password = this.elements.passwordInput?.value || '';
        this.passwordValidator.validatePassword(password);
    }

    /**
     * Check password match
     */
    checkPasswordMatch() {
        const password = this.elements.passwordInput?.value || '';
        const confirmPassword = this.elements.confirmPasswordInput?.value || '';

        this.passwordValidator.checkPasswordMatch(password, confirmPassword);
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Clear previous messages
        this.ui.hideMessages();

        // Get form data
        const formData = this.getFormData();

        // Validate form
        const validation = this.validateForm(formData);
        if (!validation.isValid) {
            this.ui.showError(validation.message);
            return;
        }

        // Set loading state
        this.ui.setButtonLoading(this.elements.registerButton, 'Creating account...');

        try {
            // Use authService instead of direct API call
            const result = await authService.register(
                formData.username,
                formData.email,
                formData.password
            );

            this.ui.showSuccess('Registration successful! Redirecting to login...');

            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = `./login.html?registered=true&email=${encodeURIComponent(formData.email)}`;
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            this.ui.showError(
                error.message || 'Registration failed. Please try again.'
            );
        } finally {
            this.ui.resetButtonState(this.elements.registerButton, 'Create Account', 'fa-user-plus');
        }
    }

    /**
     * Get form data
     */
    getFormData() {
        const formData = new FormData(this.elements.form);
        return {
            username: formData.get('username')?.trim() || '',
            email: formData.get('email')?.trim() || '',
            password: formData.get('password') || '',
            confirmPassword: formData.get('confirmPassword') || ''
        };
    }

    /**
     * Validate entire form
     */
    validateForm(data) {
        // Check required fields
        if (!data.username || !data.email || !data.password || !data.confirmPassword) {
            return { isValid: false, message: 'All fields are required' };
        }

        // Validate username
        const usernameValidation = this.formValidator.validateUsername(data.username);
        if (!usernameValidation.isValid) {
            return usernameValidation;
        }

        // Validate email
        const emailValidation = this.formValidator.validateEmail(data.email);
        if (!emailValidation.isValid) {
            return emailValidation;
        }

        // Validate password
        const passwordValidation = this.formValidator.validatePassword(data.password);
        if (!passwordValidation.isValid) {
            return passwordValidation;
        }

        // Check password match
        if (data.password !== data.confirmPassword) {
            return { isValid: false, message: 'Passwords do not match' };
        }

        return { isValid: true };
    }

    /**
     * Update form completion progress
     */
    updateFormProgress() {
        const formData = this.getFormData();
        const fields = [formData.username, formData.email, formData.password, formData.confirmPassword];
        const completedFields = fields.filter(field => field.length > 0).length;
        const progress = (completedFields / fields.length) * 100;

        // Update progress bar if it exists
        const progressBar = document.getElementById('form-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Enable/disable submit button based on completion
        if (this.elements.registerButton) {
            const isComplete = completedFields === fields.length;
            this.elements.registerButton.disabled = !isComplete;
        }
    }

    /**
     * Handle demo message display
     */
    handleDemoMessage() {
        if (window.location.hash === '#demo') {
            this.ui.showDemoMessage(this.elements.form);
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Add ARIA labels and descriptions
        const inputs = [
            this.elements.usernameInput,
            this.elements.emailInput,
            this.elements.passwordInput,
            this.elements.confirmPasswordInput
        ];

        inputs.forEach(input => {
            if (input) {
                input.setAttribute('aria-describedby', `${input.id}-help`);
            }
        });

        // Add keyboard navigation for password toggles
        [this.elements.togglePassword, this.elements.toggleConfirmPassword].forEach(toggle => {
            if (toggle) {
                toggle.setAttribute('tabindex', '0');
                toggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle.click();
                    }
                });
            }
        });
    }

    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

/**
 * Enhanced password validation with strength meter
 */
class PasswordValidator {
    constructor() {
        this.elements = null;
        this.requirements = {
            length: { test: (pwd) => pwd.length >= 8, message: 'At least 8 characters' },
            uppercase: { test: (pwd) => /[A-Z]/.test(pwd), message: 'One uppercase letter' },
            lowercase: { test: (pwd) => /[a-z]/.test(pwd), message: 'One lowercase letter' },
            number: { test: (pwd) => /\d/.test(pwd), message: 'One number' },
            special: { test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), message: 'One special character' }
        };
    }

    init(elements) {
        this.elements = elements;
    }

    validatePassword(password) {
        const results = {};
        let score = 0;

        // Check each requirement
        for (const [key, requirement] of Object.entries(this.requirements)) {
            const passed = requirement.test(password);
            results[key] = passed;
            if (passed) score++;

            // Update UI indicator
            const checkElement = this.elements[`${key}Check`];
            if (checkElement) {
                this.updateCheck(checkElement, passed);
            }
        }

        // Update strength meter
        this.updateStrengthMeter(score, Object.keys(this.requirements).length);

        return results;
    }

    checkPasswordMatch(password, confirmPassword) {
        if (!this.elements.passwordMatch) return;

        if (!confirmPassword) {
            this.elements.passwordMatch.classList.add('hidden');
            return;
        }

        const match = password === confirmPassword;
        this.elements.passwordMatch.classList.remove('hidden');

        if (match) {
            this.elements.passwordMatch.className = 'text-green-500 text-sm mt-1';
            this.elements.passwordMatch.innerHTML = '<i class="fas fa-check-circle mr-1"></i><span>Passwords match</span>';
        } else {
            this.elements.passwordMatch.className = 'text-red-500 text-sm mt-1';
            this.elements.passwordMatch.innerHTML = '<i class="fas fa-times-circle mr-1"></i><span>Passwords do not match</span>';
        }
    }

    updateCheck(element, isValid) {
        if (isValid) {
            element.classList.remove('text-gray-500');
            element.classList.add('text-green-500');
            element.querySelector('i').classList.remove('fa-circle');
            element.querySelector('i').classList.add('fa-check-circle');
        } else {
            element.classList.remove('text-green-500');
            element.classList.add('text-gray-500');
            element.querySelector('i').classList.remove('fa-check-circle');
            element.querySelector('i').classList.add('fa-circle');
        }
    }

    updateStrengthMeter(score, total) {
        if (!this.elements.passwordStrength) return;

        const percentage = (score / total) * 100;
        const strengthBar = this.elements.passwordStrength.querySelector('.strength-bar');
        const strengthText = this.elements.passwordStrength.querySelector('.strength-text');

        if (strengthBar) {
            strengthBar.style.width = `${percentage}%`;

            // Update color based on strength
            if (percentage < 40) {
                strengthBar.className = 'strength-bar bg-red-500 h-2 rounded transition-all duration-300';
            } else if (percentage < 80) {
                strengthBar.className = 'strength-bar bg-yellow-500 h-2 rounded transition-all duration-300';
            } else {
                strengthBar.className = 'strength-bar bg-green-500 h-2 rounded transition-all duration-300';
            }
        }

        if (strengthText) {
            const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
            const level = Math.floor((score / total) * strengthLevels.length);
            strengthText.textContent = strengthLevels[Math.min(level, strengthLevels.length - 1)];
        }
    }
}

/**
 * Form validation utilities
 */
class FormValidator {
    validateUsername(username) {
        if (username.length < 3) {
            return { isValid: false, message: 'Username must be at least 3 characters long' };
        }

        if (username.length > 20) {
            return { isValid: false, message: 'Username must be less than 20 characters' };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }

        // Check for reserved usernames
        const reserved = ['admin', 'administrator', 'root', 'demo', 'test', 'user'];
        if (reserved.includes(username.toLowerCase())) {
            return { isValid: false, message: 'This username is not available' };
        }

        return { isValid: true };
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        if (email.length > 100) {
            return { isValid: false, message: 'Email address is too long' };
        }

        return { isValid: true };
    }

    validatePassword(password) {
        if (password.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters long' };
        }

        if (password.length > 128) {
            return { isValid: false, message: 'Password is too long' };
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
        }

        // Check for common weak passwords
        const weakPasswords = ['password', '12345678', 'qwerty123', 'abc123456'];
        if (weakPasswords.includes(password.toLowerCase())) {
            return { isValid: false, message: 'This password is too common' };
        }

        return { isValid: true };
    }
}

/**
 * UI management utilities specific to registration
 */
class UIManager {
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    showSuccess(message) {
        const successMessage = document.getElementById('success-message');
        const successText = document.getElementById('success-text');

        if (successMessage && successText) {
            successText.textContent = message;
            successMessage.classList.remove('hidden');
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    hideMessages() {
        const errorMessage = document.getElementById('error-message');
        const successMessage = document.getElementById('success-message');

        if (errorMessage) errorMessage.classList.add('hidden');
        if (successMessage) successMessage.classList.add('hidden');
    }

    setButtonLoading(button, text) {
        if (!button) return;

        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${text}`;
    }

    resetButtonState(button, text, iconClass) {
        if (!button) return;

        button.disabled = false;
        button.innerHTML = `<i class="fas ${iconClass} mr-2"></i>${text}`;
    }

    togglePasswordVisibility(input, toggle) {
        if (!input || !toggle) return;

        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);

        const icon = toggle.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }

    showFieldStatus(input, status, message) {
        if (!input) return;

        // Remove existing status classes
        input.classList.remove('border-green-500', 'border-red-500');

        // Add new status class
        if (status === 'valid') {
            input.classList.add('border-green-500');
        } else if (status === 'invalid') {
            input.classList.add('border-red-500');
        }

        // Show/update status message
        let statusElement = input.parentNode.querySelector('.field-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'field-status text-sm mt-1';
            input.parentNode.appendChild(statusElement);
        }

        statusElement.textContent = message;
        statusElement.className = `field-status text-sm mt-1 ${
            status === 'valid' ? 'text-green-600' : 'text-red-600'
        }`;
    }

    showDemoMessage(form) {
        if (!form) return;

        const demoMessage = document.createElement('div');
        demoMessage.className = 'bg-blue-100/90 border border-blue-500 text-blue-800 px-4 py-3 rounded-lg mb-4';
        demoMessage.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-info-circle mt-0.5 mr-2"></i>
                <span>You can try the demo without registration, or create your own account for a personalized experience.</span>
            </div>
        `;
        form.parentNode.insertBefore(demoMessage, form);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const registerHandler = new RegisterHandler();
    registerHandler.init();
});