// src/client/js/PasswordResetHandler.js
class PasswordResetHandler {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.initializeEventListeners();
        this.errorMessageElement = null;
        this.successMessageElement = null;
        this.resetErrorMessageElement = null;
        this.resetSuccessMessageElement = null;
    }

    initializeEventListeners() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Get the request reset form
            const requestResetForm = document.getElementById('request-reset-form');
            if (requestResetForm) {
                requestResetForm.addEventListener('submit', (e) => this.handleRequestReset(e));
            }

            // Get the reset password form
            const resetPasswordForm = document.getElementById('reset-password-form');
            if (resetPasswordForm) {
                resetPasswordForm.addEventListener('submit', (e) => this.handleResetPassword(e));
            }

            // Setup password match validation
            this.setupPasswordMatchValidation();

            // Setup password strength meter
            this.setupPasswordStrengthMeter();

            // Setup password toggle visibility
            this.setupPasswordToggles();

            // Save message elements for later use
            this.errorMessageElement = document.getElementById('error-message');
            this.successMessageElement = document.getElementById('success-message');
            this.resetErrorMessageElement = document.getElementById('reset-error-message');
            this.resetSuccessMessageElement = document.getElementById('reset-success-message');

            // Check URL parameters for token
            this.checkUrlParameters();
        });
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            // Show reset password view
            this.showResetPasswordForm(token);

            // Clean up the URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    async handleRequestReset(e) {
        e.preventDefault();
        this.hideMessages();

        const email = document.getElementById('email').value;

        try {
            // Basic validation
            if (!email) {
                this.showError('Email is required');
                return;
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showError('Please enter a valid email address');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                this.showError(data.error || 'Failed to send reset instructions');
                return;
            }

            // Success
            this.showSuccess('Reset instructions have been sent to your email');

            // In a real application, we would stop here
            // For demo purposes, if the response includes a token, redirect to reset page
            if (data.token) {
                setTimeout(() => {
                    // Handle token - in a real app, this would come via email link
                    this.showResetPasswordForm(data.token);
                }, 2000);
            }
        } catch (error) {
            console.error('Request reset error:', error);
            this.showError('A network error occurred. Please try again.');
        }
    }

    async handleResetPassword(e) {
        e.preventDefault();
        this.hideResetMessages();

        const token = document.getElementById('reset-token').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        try {
            // Basic validation
            if (!password || !confirmPassword) {
                this.showResetError('Both password fields are required');
                return;
            }

            // Password match validation
            if (password !== confirmPassword) {
                this.showResetError('Passwords do not match');
                return;
            }

            // Password strength validation
            if (!this.validatePassword(password)) {
                return; // Error message displayed by validatePassword
            }

            const response = await fetch(`${this.apiBaseUrl}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                this.showResetError(data.error || 'Failed to reset password');
                return;
            }

            // Success
            this.showResetSuccess('Your password has been reset successfully');

            // Redirect to login page after successful reset
            setTimeout(() => {
                window.location.href = 'login.html?success=' + encodeURIComponent('Your password has been reset. Please login with your new password.');
            }, 2000);
        } catch (error) {
            console.error('Reset password error:', error);
            this.showResetError('A network error occurred. Please try again.');
        }
    }

    showResetPasswordForm(token) {
        const requestResetContainer = document.getElementById('request-reset-container');
        const resetPasswordContainer = document.getElementById('reset-password-container');

        if (requestResetContainer && resetPasswordContainer) {
            requestResetContainer.classList.add('hidden');
            resetPasswordContainer.classList.remove('hidden');

            // Set token in hidden input
            document.getElementById('reset-token').value = token;
        }
    }

    validatePassword(password) {
        // Minimum length
        if (password.length < 8) {
            this.showResetError('Password must be at least 8 characters long');
            return false;
        }

        // Requires uppercase
        if (!/[A-Z]/.test(password)) {
            this.showResetError('Password must include at least one uppercase letter');
            return false;
        }

        // Requires lowercase
        if (!/[a-z]/.test(password)) {
            this.showResetError('Password must include at least one lowercase letter');
            return false;
        }

        // Requires number
        if (!/\d/.test(password)) {
            this.showResetError('Password must include at least one number');
            return false;
        }

        return true;
    }

    setupPasswordMatchValidation() {
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('confirm-password');

        if (!passwordInput || !confirmInput) return;

        // Create match indicator
        const matchIndicator = document.createElement('div');
        matchIndicator.className = 'text-xs mt-1 hidden';
        matchIndicator.id = 'password-match-indicator';
        confirmInput.parentElement.parentElement.appendChild(matchIndicator);

        // Check match on input
        confirmInput.addEventListener('input', () => {
            if (!confirmInput.value) {
                matchIndicator.className = 'text-xs mt-1 hidden';
                return;
            }

            if (passwordInput.value === confirmInput.value) {
                matchIndicator.textContent = 'Passwords match';
                matchIndicator.className = 'text-xs mt-1 text-green-400';
            } else {
                matchIndicator.textContent = 'Passwords do not match';
                matchIndicator.className = 'text-xs mt-1 text-red-400';
            }
        });

        // Also check when password is changed
        passwordInput.addEventListener('input', () => {
            if (!confirmInput.value) return;

            if (passwordInput.value === confirmInput.value) {
                matchIndicator.textContent = 'Passwords match';
                matchIndicator.className = 'text-xs mt-1 text-green-400';
            } else {
                matchIndicator.textContent = 'Passwords do not match';
                matchIndicator.className = 'text-xs mt-1 text-red-400';
            }
        });
    }

    setupPasswordStrengthMeter() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;

        // Create meter container
        const meterContainer = document.createElement('div');
        meterContainer.className = 'mt-2';

        // Create strength bar
        const strengthBar = document.createElement('div');
        strengthBar.className = 'h-1 rounded-full bg-gray-700 overflow-hidden';

        // Create progress indicator
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'h-full w-0 transition-all duration-300';
        strengthBar.appendChild(strengthIndicator);

        // Create strength text
        const strengthText = document.createElement('div');
        strengthText.className = 'text-xs mt-1 text-gray-400';
        strengthText.textContent = 'Password strength';

        // Assemble and insert meter
        meterContainer.appendChild(strengthBar);
        meterContainer.appendChild(strengthText);
        passwordInput.parentElement.parentElement.insertBefore(meterContainer, document.getElementById('password-match-indicator'));

        // Update strength on input
        passwordInput.addEventListener('input', () => {
            if (!passwordInput.value) {
                strengthIndicator.style.width = '0';
                strengthIndicator.className = 'h-full w-0 transition-all duration-300';
                strengthText.textContent = 'Password strength';
                strengthText.className = 'text-xs mt-1 text-gray-400';
                return;
            }

            // Calculate strength
            const strength = this.calculatePasswordStrength(passwordInput.value);

            // Update visuals based on strength
            switch(strength.level) {
                case 'weak':
                    strengthIndicator.style.width = '25%';
                    strengthIndicator.className = 'h-full bg-red-500 transition-all duration-300';
                    strengthText.textContent = 'Weak: ' + strength.message;
                    strengthText.className = 'text-xs mt-1 text-red-400';
                    break;
                case 'medium':
                    strengthIndicator.style.width = '50%';
                    strengthIndicator.className = 'h-full bg-yellow-500 transition-all duration-300';
                    strengthText.textContent = 'Medium: ' + strength.message;
                    strengthText.className = 'text-xs mt-1 text-yellow-400';
                    break;
                case 'strong':
                    strengthIndicator.style.width = '75%';
                    strengthIndicator.className = 'h-full bg-green-500 transition-all duration-300';
                    strengthText.textContent = 'Strong: ' + strength.message;
                    strengthText.className = 'text-xs mt-1 text-green-400';
                    break;
                case 'very-strong':
                    strengthIndicator.style.width = '100%';
                    strengthIndicator.className = 'h-full bg-primary-light transition-all duration-300';
                    strengthText.textContent = 'Very Strong: ' + strength.message;
                    strengthText.className = 'text-xs mt-1 text-primary-light';
                    break;
            }
        });
    }

    setupPasswordToggles() {
        const passwordFields = [
            {
                input: document.getElementById('password'),
                toggle: document.createElement('button')
            },
            {
                input: document.getElementById('confirm-password'),
                toggle: document.createElement('button')
            }
        ];

        passwordFields.forEach(field => {
            if (!field.input) return;

            // Create and style toggle button
            const toggle = field.toggle;
            toggle.type = 'button';
            toggle.className = 'absolute right-0 top-0 h-full px-3 text-gray-400 focus:outline-none';
            toggle.innerHTML = '<i class="fas fa-eye"></i>';

            // Insert toggle button
            field.input.parentElement.style.position = 'relative';
            field.input.parentElement.appendChild(toggle);

            // Adjust input padding to make room for the button
            field.input.style.paddingRight = '2.5rem';

            // Toggle visibility on click
            toggle.addEventListener('click', () => {
                if (field.input.type === 'password') {
                    field.input.type = 'text';
                    toggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    field.input.type = 'password';
                    toggle.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        });
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const result = { level: 'weak', message: 'Use longer password with numbers and symbols' };

        // Length check (up to 5 points)
        score += Math.min(5, Math.floor(password.length / 2));

        // Character variety contribution
        if (/[A-Z]/.test(password)) score += 1; // Uppercase
        if (/[a-z]/.test(password)) score += 1; // Lowercase
        if (/\d/.test(password)) score += 1;    // Numbers
        if (/[^A-Za-z0-9]/.test(password)) score += 2; // Special chars

        // Variety of characters
        const uniqueChars = new Set(password.split('')).size;
        score += Math.min(3, Math.floor(uniqueChars / 3));

        // Determine strength level and message
        if (score < 6) {
            result.level = 'weak';
            result.message = 'Use longer password with numbers and symbols';
        } else if (score < 9) {
            result.level = 'medium';
            result.message = 'Getting better, try adding special characters';
        } else if (score < 12) {
            result.level = 'strong';
            result.message = 'Good password!';
        } else {
            result.level = 'very-strong';
            result.message = 'Excellent password!';
        }

        return result;
    }

    showError(message) {
        if (this.errorMessageElement) {
            this.errorMessageElement.textContent = message;
            this.errorMessageElement.classList.remove('hidden');
        }
    }

    showSuccess(message) {
        if (this.successMessageElement) {
            this.successMessageElement.textContent = message;
            this.successMessageElement.classList.remove('hidden');
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

    showResetError(message) {
        if (this.resetErrorMessageElement) {
            this.resetErrorMessageElement.textContent = message;
            this.resetErrorMessageElement.classList.remove('hidden');
        }
    }

    showResetSuccess(message) {
        if (this.resetSuccessMessageElement) {
            this.resetSuccessMessageElement.textContent = message;
            this.resetSuccessMessageElement.classList.remove('hidden');
        }
    }

    hideResetMessages() {
        if (this.resetErrorMessageElement) {
            this.resetErrorMessageElement.classList.add('hidden');
        }
        if (this.resetSuccessMessageElement) {
            this.resetSuccessMessageElement.classList.add('hidden');
        }
    }
}

// Initialize the password reset handler
const passwordResetHandler = new PasswordResetHandler();