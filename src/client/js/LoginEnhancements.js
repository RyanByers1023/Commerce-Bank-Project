// src/client/js/LoginEnhancements.js
document.addEventListener('DOMContentLoaded', function() {
    // Reference to the password inputs
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Password visibility toggle
    setupPasswordToggles();

    // Setup password strength meter
    if (passwordInput) {
        setupPasswordStrengthMeter();
    }

    // Setup password match validation
    if (passwordInput && confirmPasswordInput) {
        setupPasswordMatchValidation();
    }

    // Add form validation feedback
    setupFormValidation();
});

/**
 * Sets up toggles to show/hide password
 */
function setupPasswordToggles() {
    const passwordFields = [
        {
            input: document.getElementById('password'),
            toggle: document.createElement('button')
        },
        {
            input: document.getElementById('register-password'),
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

/**
 * Sets up password strength meter
 */
function setupPasswordStrengthMeter() {
    const passwordInput = document.getElementById('register-password');

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
    passwordInput.parentElement.parentElement.appendChild(meterContainer);

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
        const strength = calculatePasswordStrength(passwordInput.value);

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

/**
 * Sets up password match validation
 */
function setupPasswordMatchValidation() {
    const passwordInput = document.getElementById('register-password');
    const confirmInput = document.getElementById('confirm-password');

    // Create match indicator
    const matchIndicator = document.createElement('div');
    matchIndicator.className = 'text-xs mt-1 hidden';
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

/**
 * Sets up form validation feedback
 */
function setupFormValidation() {
    // Add form validation indicators to required fields
    const inputs = document.querySelectorAll('input[required]');

    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value.trim() === '') {
                input.classList.add('border-red-500');
                let helpText = document.createElement('div');
                helpText.className = 'text-xs text-red-400 mt-1';
                helpText.textContent = 'This field is required';

                // Remove any existing help text
                const existingHelp = input.parentElement.parentElement.querySelector('.text-red-400');
                if (existingHelp) {
                    existingHelp.remove();
                }

                // Add new help text
                input.parentElement.parentElement.appendChild(helpText);
            } else {
                input.classList.remove('border-red-500');
                const existingHelp = input.parentElement.parentElement.querySelector('.text-red-400');
                if (existingHelp) {
                    existingHelp.remove();
                }
            }
        });

        // Remove error styling on input
        input.addEventListener('input', () => {
            if (input.value.trim() !== '') {
                input.classList.remove('border-red-500');
                const existingHelp = input.parentElement.parentElement.querySelector('.text-red-400');
                if (existingHelp) {
                    existingHelp.remove();
                }
            }
        });
    });
}

/**
 * Calculate password strength
 * @param {string} password - Password to evaluate
 * @returns {Object} - Strength level and message
 */
function calculatePasswordStrength(password) {
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