// js/authentication/authHandler.js
document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isRegistered = urlParams.get('registered') === 'true';
    const registeredEmail = urlParams.get('email');

    // Show success message if just registered
    if (isRegistered && registeredEmail) {
        const loginContainer = document.getElementById('login-container');
        const successMessage = document.createElement('div');
        successMessage.className = 'bg-green-100/90 border border-green-500 text-green-800 px-4 py-3 rounded-lg mb-4';
        successMessage.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-check-circle mt-0.5 mr-2"></i>
                <span>Registration successful! Please log in with your credentials.</span>
            </div>
        `;

        // Insert after the header div
        const headerDiv = loginContainer.querySelector('.text-center.mb-8');
        headerDiv.insertAdjacentElement('afterend', successMessage);

        // Pre-fill email
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = decodeURIComponent(registeredEmail);
        }

        // Focus on password field
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.focus();
        }
    }

    // Toggle between login and register views
    const toggleLinks = document.querySelectorAll('.toggle-view');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');

    toggleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            if (loginContainer.classList.contains('hidden')) {
                // Show login
                registerContainer.classList.add('hidden');
                loginContainer.classList.remove('hidden');
            } else {
                // Show register
                loginContainer.classList.add('hidden');
                registerContainer.classList.remove('hidden');
            }
        });
    });

    // Login form handling
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const rememberMe = formData.get('remember') === 'on';

            // Disable button and show loading
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        rememberMe
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Show success message
                    showMessage('success', 'Login successful! Redirecting...');

                    // Redirect after short delay
                    setTimeout(() => {
                        const redirectUrl = urlParams.get('redirect') || './dashboard.html';
                        window.location.href = decodeURIComponent(redirectUrl);
                    }, 1000);
                } else {
                    showMessage('error', data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('error', 'Network error. Please try again.');
            } finally {
                loginButton.disabled = false;
                loginButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
            }
        });
    }

    // Register form handling (on login page)
    const registerForm = document.getElementById('register-form');
    const registerButton = document.getElementById('register-button');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(registerForm);
            const username = formData.get('username');
            const email = formData.get('email');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm-password');

            // Validate passwords match
            if (password !== confirmPassword) {
                showMessage('error', 'Passwords do not match', 'register');
                return;
            }

            // Disable button and show loading
            registerButton.disabled = true;
            registerButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...';

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
                    showMessage('success', 'Registration successful! Redirecting...', 'register');

                    // Redirect to login view with success message
                    setTimeout(() => {
                        window.location.href = `./login.html?registered=true&email=${encodeURIComponent(email)}`;
                    }, 1500);
                } else {
                    showMessage('error', data.error || 'Registration failed', 'register');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('error', 'Network error. Please try again.', 'register');
            } finally {
                registerButton.disabled = false;
                registerButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create Account';
            }
        });
    }

    // Demo login handling
    const demoLoginBtn = document.getElementById('demo-login-btn');

    if (demoLoginBtn) {
        demoLoginBtn.addEventListener('click', async function() {
            demoLoginBtn.disabled = true;
            demoLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Setting up demo...';

            try {
                const response = await fetch('/api/auth/demo-login', {
                    method: 'POST'
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('success', 'Demo account ready! Redirecting...');
                    setTimeout(() => {
                        window.location.href = './simulator.html';
                    }, 1000);
                } else {
                    showMessage('error', data.error || 'Demo login failed');
                }
            } catch (error) {
                console.error('Demo login error:', error);
                showMessage('error', 'Network error. Please try again.');
            } finally {
                demoLoginBtn.disabled = false;
                demoLoginBtn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Or Try a Demo!';
            }
        });
    }

    // Helper function to show messages
    function showMessage(type, message, form = 'login') {
        const container = form === 'login' ? loginContainer : registerContainer;
        if (!container) return;

        // Remove existing messages
        const existingMessages = container.querySelectorAll('.message-alert');
        existingMessages.forEach(msg => msg.remove());

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
        }
    }
});