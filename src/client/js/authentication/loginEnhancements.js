document.addEventListener('DOMContentLoaded', function() {
    // Add visual feedback to input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');

    inputs.forEach(input => {
        // Add focus effect
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('ring-2', 'ring-primary/50');
        });

        // Remove focus effect
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('ring-2', 'ring-primary/50');
        });

        // Add validation feedback
        input.addEventListener('input', function() {
            if (this.checkValidity() && this.value.length > 0) {
                this.classList.add('border-green-500/50');
                this.classList.remove('border-red-500/50');
            } else if (!this.checkValidity() && this.value.length > 0) {
                this.classList.add('border-red-500/50');
                this.classList.remove('border-green-500/50');
            } else {
                this.classList.remove('border-green-500/50', 'border-red-500/50');
            }
        });
    });

    // Remember me functionality
    const rememberCheckbox = document.getElementById('remember');
    const emailInput = document.getElementById('email');

    // Load saved email if remember me was checked
    if (localStorage.getItem('rememberMe') === 'true' && localStorage.getItem('savedEmail')) {
        if (emailInput) {
            emailInput.value = localStorage.getItem('savedEmail');
        }
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }

    // Save email when remember me is checked
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', function() {
            if (this.checked && emailInput && emailInput.value) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('savedEmail', emailInput.value);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('savedEmail');
            }
        });
    }

    // Update saved email on input change if remember me is checked
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            if (rememberCheckbox && rememberCheckbox.checked && this.value) {
                localStorage.setItem('savedEmail', this.value);
            }
        });
    }

    // Password strength indicator for registration
    const registerPasswordInput = document.getElementById('register-password');
    if (registerPasswordInput) {
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'mt-2 h-1 bg-gray-600 rounded-full overflow-hidden';
        strengthIndicator.innerHTML = '<div class="h-full bg-gradient-to-r from-red-500 to-red-500 transition-all duration-300" style="width: 0%"></div>';

        registerPasswordInput.parentElement.appendChild(strengthIndicator);

        registerPasswordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;

            // Length check
            if (password.length >= 8) strength += 25;
            if (password.length >= 12) strength += 10;

            // Character variety checks
            if (/[a-z]/.test(password)) strength += 20;
            if (/[A-Z]/.test(password)) strength += 20;
            if (/\d/.test(password)) strength += 20;
            if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

            // Update indicator
            const bar = strengthIndicator.querySelector('div');
            bar.style.width = strength + '%';

            // Update color based on strength
            if (strength < 40) {
                bar.className = 'h-full bg-gradient-to-r from-red-500 to-red-500 transition-all duration-300';
            } else if (strength < 70) {
                bar.className = 'h-full bg-gradient-to-r from-yellow-500 to-yellow-500 transition-all duration-300';
            } else {
                bar.className = 'h-full bg-gradient-to-r from-green-500 to-green-500 transition-all duration-300';
            }
        });
    }

    // Animate form transitions
    const toggleViews = document.querySelectorAll('.toggle-view');
    toggleViews.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const loginContainer = document.getElementById('login-container');
            const registerContainer = document.getElementById('register-container');

            if (loginContainer && registerContainer) {
                if (loginContainer.classList.contains('hidden')) {
                    // Switching to login
                    registerContainer.style.opacity = '0';
                    setTimeout(() => {
                        registerContainer.classList.add('hidden');
                        loginContainer.classList.remove('hidden');
                        setTimeout(() => {
                            loginContainer.style.opacity = '1';
                        }, 10);
                    }, 300);
                } else {
                    // Switching to register
                    loginContainer.style.opacity = '0';
                    setTimeout(() => {
                        loginContainer.classList.add('hidden');
                        registerContainer.classList.remove('hidden');
                        setTimeout(() => {
                            registerContainer.style.opacity = '1';
                        }, 10);
                    }, 300);
                }
            }
        });
    });

    // Add transition styles
    const containers = [document.getElementById('login-container'), document.getElementById('register-container')];
    containers.forEach(container => {
        if (container) {
            container.style.transition = 'opacity 300ms ease-in-out';
            container.style.opacity = container.classList.contains('hidden') ? '0' : '1';
        }
    });

    // Auto-capitalize username inputs
    const usernameInputs = document.querySelectorAll('input[name="username"]');
    usernameInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Remove spaces and special characters except underscore
            this.value = this.value.replace(/[^a-zA-Z0-9_]/g, '');
        });
    });
});