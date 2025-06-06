// Reusable logout button component

function createLogoutButton(options = {}) {
    const {
        text = 'Logout',
        showIcon = true,
        classes = 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200',
        redirectUrl = './index.html'
    } = options;

    const button = document.createElement('button');
    button.className = classes;
    button.innerHTML = `
        ${showIcon ? '<i class="fas fa-sign-out-alt mr-2"></i>' : ''}
        ${text}
    `;

    button.addEventListener('click', async function() {
        // Disable button and show loading
        button.disabled = true;
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Logging out...
        `;

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });

            if (response.ok) {
                // Optional: Show success message
                button.innerHTML = `
                    <i class="fas fa-check mr-2"></i>
                    Logged out
                `;

                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 500);
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);

            // Show error and re-enable button
            button.disabled = false;
            button.innerHTML = `
                ${showIcon ? '<i class="fas fa-sign-out-alt mr-2"></i>' : ''}
                ${text}
            `;

            // Optional: Show error notification
            alert('Logout failed. Please try again.');
        }
    });

    return button;
}

// Auto-inject logout button if container exists
document.addEventListener('DOMContentLoaded', function() {
    // Look for logout button containers
    const logoutContainers = document.querySelectorAll('[data-logout-button]');

    logoutContainers.forEach(container => {
        const options = {
            text: container.dataset.logoutText || 'Logout',
            showIcon: container.dataset.logoutIcon !== 'false',
            classes: container.dataset.logoutClasses || undefined,
            redirectUrl: container.dataset.logoutRedirect || './index.html'
        };

        const button = createLogoutButton(options);
        container.appendChild(button);
    });
});

// Export for manual use
window.createLogoutButton = createLogoutButton;