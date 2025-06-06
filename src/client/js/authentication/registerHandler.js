// js/authentication/registerHandler.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const registerButton = document.getElementById('register-button');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const successMessage = document.getElementById('success-message');
    const successText = document.getElementById('success-text');

    // Password visibility toggles
    const togglePassword = document.getElementById('toggle-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');

    // Password requirement checks
    const lengthCheck = document.getElementById('length-check');
    const uppercaseCheck = document.getElementById('uppercase-check');
    const lowercaseCheck = document.getElementById('lowercase-check');
    const numberCheck = document.getElementById('number-check');
    const passwordMatch = document.getElementById('password-match');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Real-time password validation
    passwordInput.addEventListener('input', function() {
        const password = this.value;

        // Check length
        updateCheck(lengthCheck, password.length >= 8);

        // Check uppercase
        updateCheck(uppercaseCheck, /[A-Z]/.test(password));

        // Check lowercase
        updateCheck(lowercaseCheck, /[a-z]/.test(password));

        // Check number
        updateCheck(numberCheck, /\d/.test(password));

        // Check password match if confirm password has value
        if (confirmPasswordInput.value) {
            checkPasswordMatch();
        }
    });

    // Check password match
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    function checkPasswordMatch() {
        const match = passwordInput.value === confirmPasswordInput.value;
        if (confirmPasswordInput.value) {
            passwordMatch.classList.toggle('hidden', match);
            passwordMatch.classList.toggle('text-red-500', !match);
            passwordMatch.classList.toggle('text-green-500', match);

            if (match) {
                passwordMatch.innerHTML = '<i class="fas fa-check-circle mr-1"></i><span>Passwords match</span>';
            } else {
                passwordMatch.innerHTML = '<i class="fas fa-times-circle mr-1"></i><span>Passwords do not match</span>';
            }
        } else {
            passwordMatch.classList.add('hidden');
        }
    }

    function updateCheck(element, isValid) {
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

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Clear previous messages
        hideMessages();

        // Get form data
        const formData = new FormData(form);
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validate passwords match
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        // Validate password requirements
        if (!validatePassword(password)) {
            showError('Password does not meet all requirements');
            return;
        }

        // Disable button and show loading
        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess('Registration successful! Redirecting to login...');

                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = './login.html?registered=true&email=' + encodeURIComponent(email);
                }, 2000);
            } else {
                showError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    });

    function validatePassword(password) {
        return password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /\d/.test(password);
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showSuccess(message) {
        successText.textContent = message;
        successMessage.classList.remove('hidden');
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideMessages() {
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
    }

    function setLoading(isLoading) {
        registerButton.disabled = isLoading;
        if (isLoading) {
            registerButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...';
        } else {
            registerButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create Account';
        }
    }

    // Check if coming from demo link
    if (window.location.hash === '#demo') {
        // Could show a message about trying demo first
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
});