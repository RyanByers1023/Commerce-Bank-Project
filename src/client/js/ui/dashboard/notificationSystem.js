export default class NotificationSystem {
    constructor(containerId = 'notification-container') {
        // Create notification container if it doesn't exist
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'fixed top-0 right-0 p-4 z-50 space-y-4';
            document.body.appendChild(container);
        }

        this.container = container;
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');

        // Set classes based on notification type
        let bgColor, textColor, borderColor;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-100';
                textColor = 'text-green-800';
                borderColor = 'border-green-500';
                break;
            case 'error':
                bgColor = 'bg-red-100';
                textColor = 'text-red-800';
                borderColor = 'border-red-500';
                break;
            case 'warning':
                bgColor = 'bg-yellow-100';
                textColor = 'text-yellow-800';
                borderColor = 'border-yellow-500';
                break;
            default: // info
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-800';
                borderColor = 'border-blue-500';
        }

        // Apply styling
        notification.className = `${bgColor} ${textColor} p-4 rounded-lg shadow-md border-l-4 ${borderColor} max-w-xs transform transition-transform duration-300 ease-in-out translate-x-full`;

        // Add message
        notification.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-grow">${message}</div>
        <button class="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none">
          &times;
        </button>
      </div>
    `;

        // Add to container
        this.container.appendChild(notification);

        // Add animation (slide in from right)
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 10);

        // Add close button functionality
        const closeButton = notification.querySelector('button');
        closeButton.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    removeNotification(notification) {
        // Add exit animation (slide out to right)
        notification.classList.add('translate-x-full', 'opacity-0');

        // Remove from DOM after animation completes
        setTimeout(() => {
            if (notification.parentNode === this.container) {
                this.container.removeChild(notification);
            }
        }, 300);
    }

    // Shorthand methods for different notification types
    success(message, duration = 5000) {
        return this.showNotification(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.showNotification(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.showNotification(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.showNotification(message, 'info', duration);
    }

    // Method to clear all notifications
    clearAll() {
        // Get all notifications
        const notifications = this.container.querySelectorAll('div');

        // Remove each notification
        notifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }

    // Method to update an existing notification
    updateNotification(notification, message, type) {
        if (!notification || notification.parentNode !== this.container) {
            return this.showNotification(message, type);
        }

        // Update message content
        const messageElement = notification.querySelector('.flex-grow');
        if (messageElement) {
            messageElement.textContent = message;
        }

        // Update type/colors if provided
        if (type) {
            // Remove existing color classes
            notification.classList.remove(
                'bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-blue-100',
                'text-green-800', 'text-red-800', 'text-yellow-800', 'text-blue-800',
                'border-green-500', 'border-red-500', 'border-yellow-500', 'border-blue-500'
            );

            // Add new color classes
            let bgColor, textColor, borderColor;
            switch (type) {
                case 'success':
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-800';
                    borderColor = 'border-green-500';
                    break;
                case 'error':
                    bgColor = 'bg-red-100';
                    textColor = 'text-red-800';
                    borderColor = 'border-red-500';
                    break;
                case 'warning':
                    bgColor = 'bg-yellow-100';
                    textColor = 'text-yellow-800';
                    borderColor = 'border-yellow-500';
                    break;
                default: // info
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-800';
                    borderColor = 'border-blue-500';
            }

            notification.classList.add(bgColor, textColor, borderColor);
        }

        return notification;
    }
}