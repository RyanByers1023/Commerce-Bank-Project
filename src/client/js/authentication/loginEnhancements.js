// Import services (adjust paths as needed)
import { authService } from './services/authService.js';

/**
 * Enhanced login/register form interactions and visual improvements
 */
class LoginEnhancements {
    constructor() {
        this.preferences = new UserPreferences();
        this.animations = new FormAnimations();
        this.validation = new EnhancedValidation();
        this.accessibility = new AccessibilityEnhancer();

        this.isInitialized = false;
    }

    /**
     * Initialize all enhancements
     */
    init() {
        if (this.isInitialized) return;

        try {
            this.setupInputEnhancements();
            this.setupRememberMe();
            this.setupFormTransitions();
            this.setupPasswordStrength();
            this.setupUsernameFormatting();
            this.setupKeyboardShortcuts();
            this.accessibility.enhance();

            this.isInitialized = true;
            console.log('Login enhancements initialized successfully');
        } catch (error) {
            console.error('Failed to initialize login enhancements:', error);
        }
    }

    /**
     * Setup enhanced input field interactions
     */
    setupInputEnhancements() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');

        inputs.forEach(input => {
            this.enhanceInput(input);
        });
    }

    /**
     * Enhance individual input field
     */
    enhanceInput(input) {
        // Add focus effects
        input.addEventListener('focus', () => {
            this.addFocusEffect(input);
        });

        input.addEventListener('blur', () => {
            this.removeFocusEffect(input);
        });

        // Add real-time validation with debouncing
        input.addEventListener('input', this.debounce(() => {
            this.validateInput(input);
        }, 300));

        // Add loading state support
        input.addEventListener('beforeinput', () => {
            this.clearLoadingState(input);
        });

        // Setup autocomplete enhancements
        this.setupAutocomplete(input);
    }

    /**
     * Add visual focus effects
     */
    addFocusEffect(input) {
        const container = input.closest('.input-container') || input.parentElement;
        container.classList.add('ring-2', 'ring-blue-500/50', 'ring-offset-2');

        // Add floating label effect if present
        const label = container.querySelector('label');
        if (label) {
            label.classList.add('text-blue-600', 'transform', '-translate-y-1', 'scale-95');
        }
    }

    /**
     * Remove visual focus effects
     */
    removeFocusEffect(input) {
        const container = input.closest('.input-container') || input.parentElement;
        container.classList.remove('ring-2', 'ring-blue-500/50', 'ring-offset-2');

        // Reset floating label if input is empty
        if (!input.value) {
            const label = container.querySelector('label');
            if (label) {
                label.classList.remove('text-blue-600', 'transform', '-translate-y-1', 'scale-95');
            }
        }
    }

    /**
     * Validate input with visual feedback
     */
    validateInput(input) {
        const isValid = this.validation.validateField(input);

        if (input.value.length === 0) {
            // Reset state for empty inputs
            input.classList.remove('border-green-500/50', 'border-red-500/50');
            this.clearFieldMessage(input);
        } else if (isValid.valid) {
            input.classList.add('border-green-500/50');
            input.classList.remove('border-red-500/50');
            this.showFieldMessage(input, isValid.message, 'success');
        } else {
            input.classList.add('border-red-500/50');
            input.classList.remove('border-green-500/50');
            this.showFieldMessage(input, isValid.message, 'error');
        }
    }

    /**
     * Show field-specific message
     */
    showFieldMessage(input, message, type) {
        this.clearFieldMessage(input);

        if (!message) return;

        const messageElement = document.createElement('div');
        messageElement.className = `field-message text-sm mt-1 ${
            type === 'success' ? 'text-green-600' : 'text-red-600'
        }`;
        messageElement.textContent = message;

        input.parentElement.appendChild(messageElement);
    }

    /**
     * Clear field message
     */
    clearFieldMessage(input) {
        const existingMessage = input.parentElement.querySelector('.field-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    /**
     * Clear loading state from input
     */
    clearLoadingState(input) {
        input.classList.remove('animate-pulse', 'bg-gray-100');
    }

    /**
     * Setup autocomplete enhancements
     */
    setupAutocomplete(input) {
        // Enhanced autocomplete attributes
        switch (input.type) {
            case 'email':
                input.setAttribute('autocomplete', 'email');
                input.setAttribute('inputmode', 'email');
                break;
            case 'password':
                if (input.name === 'password') {
                    input.setAttribute('autocomplete', 'current-password');
                } else if (input.name === 'confirm-password') {
                    input.setAttribute('autocomplete', 'new-password');
                }
                break;
            case 'text':
                if (input.name === 'username') {
                    input.setAttribute('autocomplete', 'username');
                }
                break;
        }
    }

    /**
     * Setup remember me functionality with user preferences
     */
    setupRememberMe() {
        const rememberCheckbox = document.getElementById('remember');
        const emailInput = document.getElementById('email');

        if (!rememberCheckbox || !emailInput) return;

        // Load saved preferences
        this.loadSavedCredentials(emailInput, rememberCheckbox);

        // Setup event listeners
        rememberCheckbox.addEventListener('change', () => {
            this.handleRememberMeChange(rememberCheckbox, emailInput);
        });

        emailInput.addEventListener('input', this.debounce(() => {
            this.updateSavedEmail(rememberCheckbox, emailInput);
        }, 500));
    }

    /**
     * Load saved credentials
     */
    loadSavedCredentials(emailInput, rememberCheckbox) {
        const savedData = this.preferences.getSavedCredentials();

        if (savedData.rememberMe && savedData.email) {
            emailInput.value = savedData.email;
            rememberCheckbox.checked = true;

            // Add visual indication
            emailInput.classList.add('bg-blue-50');
            this.showFieldMessage(emailInput, 'Using saved email', 'success');
        }
    }

    /**
     * Handle remember me checkbox changes
     */
    handleRememberMeChange(checkbox, emailInput) {
        if (checkbox.checked && emailInput.value) {
            this.preferences.saveCredentials(emailInput.value, true);
            this.showToast('Email will be remembered', 'success');
        } else {
            this.preferences.clearCredentials();
            emailInput.classList.remove('bg-blue-50');
            this.clearFieldMessage(emailInput);
            this.showToast('Email preference cleared', 'info');
        }
    }

    /**
     * Update saved email
     */
    updateSavedEmail(checkbox, emailInput) {
        if (checkbox.checked && emailInput.value) {
            this.preferences.saveCredentials(emailInput.value, true);
        }
    }

    /**
     * Setup smooth form transitions
     */
    setupFormTransitions() {
        const toggleViews = document.querySelectorAll('.toggle-view');

        toggleViews.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.animations.transitionForms();
            });
        });

        // Setup initial transition styles
        this.animations.setupTransitionStyles();
    }

    /**
     * Setup password strength indicator
     */
    setupPasswordStrength() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');

        passwordInputs.forEach(input => {
            if (input.name === 'password' &&
                (input.form?.id === 'register-form' || input.id === 'register-password')) {
                this.addPasswordStrengthIndicator(input);
            }
        });
    }

    /**
     * Add password strength indicator
     */
    addPasswordStrengthIndicator(input) {
        const container = this.createStrengthContainer();
        input.parentElement.appendChild(container);

        input.addEventListener('input', this.debounce(() => {
            this.updatePasswordStrength(input, container);
        }, 200));
    }

    /**
     * Create password strength container
     */
    createStrengthContainer() {
        const container = document.createElement('div');
        container.className = 'password-strength-container mt-2';
        container.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="text-sm text-gray-600">Password Strength</span>
                <span class="strength-label text-sm font-medium">Weak</span>
            </div>
            <div class="strength-bar-container h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="strength-bar h-full bg-red-500 transition-all duration-500 ease-out" style="width: 0%"></div>
            </div>
            <div class="strength-tips text-xs text-gray-500 mt-1 hidden">
                <div class="tip">Use a mix of letters, numbers, and symbols</div>
            </div>
        `;
        return container;
    }

    /**
     * Update password strength
     */
    updatePasswordStrength(input, container) {
        const password = input.value;
        const analysis = this.validation.analyzePasswordStrength(password);

        const bar = container.querySelector('.strength-bar');
        const label = container.querySelector('.strength-label');
        const tips = container.querySelector('.strength-tips');

        // Update bar
        bar.style.width = `${analysis.score}%`;
        bar.className = `strength-bar h-full transition-all duration-500 ease-out ${analysis.colorClass}`;

        // Update label
        label.textContent = analysis.level;
        label.className = `strength-label text-sm font-medium ${analysis.textColorClass}`;

        // Show/hide tips
        if (analysis.score < 70 && password.length > 0) {
            tips.classList.remove('hidden');
            tips.querySelector('.tip').textContent = analysis.suggestion;
        } else {
            tips.classList.add('hidden');
        }
    }

    /**
     * Setup username formatting
     */
    setupUsernameFormatting() {
        const usernameInputs = document.querySelectorAll('input[name="username"]');

        usernameInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.formatUsername(e.target);
            });

            input.addEventListener('paste', (e) => {
                setTimeout(() => this.formatUsername(e.target), 0);
            });
        });
    }

    /**
     * Format username input
     */
    formatUsername(input) {
        const cursorPosition = input.selectionStart;
        const originalValue = input.value;

        // Remove invalid characters
        const formattedValue = originalValue
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .substring(0, 20); // Max length

        if (formattedValue !== originalValue) {
            input.value = formattedValue;

            // Restore cursor position
            const newPosition = cursorPosition - (originalValue.length - formattedValue.length);
            input.setSelectionRange(newPosition, newPosition);

            // Show formatting message
            if (originalValue !== formattedValue) {
                this.showFieldMessage(input, 'Only lowercase letters, numbers, and underscores allowed', 'info');
            }
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to submit form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const activeForm = document.querySelector('form:not(.hidden)');
                if (activeForm) {
                    e.preventDefault();
                    activeForm.requestSubmit();
                }
            }

            // Escape to clear form
            if (e.key === 'Escape') {
                const activeForm = document.querySelector('form:not(.hidden)');
                if (activeForm && this.hasUserInput(activeForm)) {
                    if (confirm('Clear form data?')) {
                        activeForm.reset();
                        this.clearAllFieldMessages();
                    }
                }
            }
        });
    }

    /**
     * Check if form has user input
     */
    hasUserInput(form) {
        const inputs = form.querySelectorAll('input');
        return Array.from(inputs).some(input => input.value.trim() !== '');
    }

    /**
     * Clear all field messages
     */
    clearAllFieldMessages() {
        const messages = document.querySelectorAll('.field-message');
        messages.forEach(msg => msg.remove());
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Debounce utility
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
 * User preferences management
 */
class UserPreferences {
    constructor() {
        this.storageKey = 'auth_preferences';
    }

    /**
     * Get saved credentials
     */
    getSavedCredentials() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : { rememberMe: false, email: '' };
        } catch (error) {
            console.error('Error loading saved credentials:', error);
            return { rememberMe: false, email: '' };
        }
    }

    /**
     * Save credentials
     */
    saveCredentials(email, rememberMe) {
        try {
            const data = { email, rememberMe, timestamp: Date.now() };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    }

    /**
     * Clear saved credentials
     */
    clearCredentials() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing credentials:', error);
        }
    }
}

/**
 * Form animation utilities
 */
class FormAnimations {
    /**
     * Setup transition styles
     */
    setupTransitionStyles() {
        const containers = [
            document.getElementById('login-container'),
            document.getElementById('register-container')
        ];

        containers.forEach(container => {
            if (container) {
                container.style.transition = 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1)';
                container.style.opacity = container.classList.contains('hidden') ? '0' : '1';
            }
        });
    }

    /**
     * Transition between forms
     */
    transitionForms() {
        const loginContainer = document.getElementById('login-container');
        const registerContainer = document.getElementById('register-container');

        if (!loginContainer || !registerContainer) return;

        const isShowingLogin = !loginContainer.classList.contains('hidden');
        const fromContainer = isShowingLogin ? loginContainer : registerContainer;
        const toContainer = isShowingLogin ? registerContainer : loginContainer;

        // Animate out
        fromContainer.style.opacity = '0';
        fromContainer.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            fromContainer.classList.add('hidden');
            toContainer.classList.remove('hidden');
            toContainer.style.opacity = '0';
            toContainer.style.transform = 'translateY(20px)';

            // Animate in
            setTimeout(() => {
                toContainer.style.opacity = '1';
                toContainer.style.transform = 'translateY(0)';

                // Focus first input
                const firstInput = toContainer.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 50);
        }, 200);
    }
}

/**
 * Enhanced validation utilities
 */
class EnhancedValidation {
    /**
     * Validate field based on type and value
     */
    validateField(input) {
        const value = input.value.trim();
        const type = input.type;
        const name = input.name;

        switch (type) {
            case 'email':
                return this.validateEmail(value);
            case 'password':
                return this.validatePasswordField(value, name);
            case 'text':
                if (name === 'username') {
                    return this.validateUsername(value);
                }
                break;
        }

        return { valid: true, message: '' };
    }

    /**
     * Validate email
     */
    validateEmail(email) {
        if (!email) return { valid: true, message: '' };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        return { valid: true, message: 'Valid email format' };
    }

    /**
     * Validate username
     */
    validateUsername(username) {
        if (!username) return { valid: true, message: '' };

        if (username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters' };
        }

        if (username.length > 20) {
            return { valid: false, message: 'Username must be less than 20 characters' };
        }

        if (!/^[a-z0-9_]+$/.test(username)) {
            return { valid: false, message: 'Only lowercase letters, numbers, and underscores' };
        }

        return { valid: true, message: 'Username format is valid' };
    }

    /**
     * Validate password field
     */
    validatePasswordField(password, fieldName) {
        if (!password) return { valid: true, message: '' };

        if (fieldName === 'confirm-password') {
            return { valid: true, message: '' }; // Handle separately
        }

        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters' };
        }

        return { valid: true, message: '' };
    }

    /**
     * Analyze password strength
     */
    analyzePasswordStrength(password) {
        if (!password) {
            return {
                score: 0,
                level: 'Weak',
                colorClass: 'bg-red-500',
                textColorClass: 'text-red-600',
                suggestion: 'Enter a password'
            };
        }

        let score = 0;
        let suggestion = '';

        // Length scoring
        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 10;
        if (password.length >= 16) score += 10;

        // Character variety
        if (/[a-z]/.test(password)) score += 15;
        if (/[A-Z]/.test(password)) score += 15;
        if (/\d/.test(password)) score += 15;
        if (/[^a-zA-Z0-9]/.test(password)) score += 15;

        // Determine level and suggestion
        if (score < 30) {
            suggestion = 'Add uppercase letters, numbers, and symbols';
        } else if (score < 60) {
            suggestion = 'Add more character variety';
        } else if (score < 80) {
            suggestion = 'Consider making it longer';
        } else {
            suggestion = 'Strong password!';
        }

        return {
            score,
            level: this.getStrengthLevel(score),
            colorClass: this.getStrengthColor(score),
            textColorClass: this.getStrengthTextColor(score),
            suggestion
        };
    }

    getStrengthLevel(score) {
        if (score < 30) return 'Weak';
        if (score < 60) return 'Fair';
        if (score < 80) return 'Good';
        return 'Strong';
    }

    getStrengthColor(score) {
        if (score < 30) return 'bg-red-500';
        if (score < 60) return 'bg-yellow-500';
        if (score < 80) return 'bg-blue-500';
        return 'bg-green-500';
    }

    getStrengthTextColor(score) {
        if (score < 30) return 'text-red-600';
        if (score < 60) return 'text-yellow-600';
        if (score < 80) return 'text-blue-600';
        return 'text-green-600';
    }
}

/**
 * Accessibility enhancements
 */
class AccessibilityEnhancer {
    /**
     * Enhance accessibility features
     */
    enhance() {
        this.addAriaLabels();
        this.setupKeyboardNavigation();
        this.addScreenReaderSupport();
        this.enhanceErrorAnnouncements();
    }

    /**
     * Add ARIA labels and descriptions
     */
    addAriaLabels() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) {
                    input.setAttribute('aria-labelledby', label.id || `${input.id}-label`);
                }
            }
        });
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Add tab index management for better keyboard flow
        const focusableElements = document.querySelectorAll(
            'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach((element, index) => {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    // Custom tab handling if needed
                }
            });
        });
    }

    /**
     * Add screen reader support
     */
    addScreenReaderSupport() {
        // Add live region for dynamic announcements
        if (!document.getElementById('sr-announcements')) {
            const announcements = document.createElement('div');
            announcements.id = 'sr-announcements';
            announcements.setAttribute('aria-live', 'polite');
            announcements.setAttribute('aria-atomic', 'true');
            announcements.className = 'sr-only';
            document.body.appendChild(announcements);
        }
    }

    /**
     * Enhance error announcements
     */
    enhanceErrorAnnouncements() {
        // Announce form errors to screen readers
        const originalShowError = window.showError;
        window.showError = (message) => {
            if (originalShowError) originalShowError(message);
            this.announceToScreenReader(`Error: ${message}`);
        };
    }

    /**
     * Announce message to screen reader
     */
    announceToScreenReader(message) {
        const announcements = document.getElementById('sr-announcements');
        if (announcements) {
            announcements.textContent = message;
            setTimeout(() => {
                announcements.textContent = '';
            }, 1000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const loginEnhancements = new LoginEnhancements();
    loginEnhancements.init();

    // Make available globally for debugging
    window.loginEnhancements = loginEnhancements;
});

// Export for module use
export { LoginEnhancements };