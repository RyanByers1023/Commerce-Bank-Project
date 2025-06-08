export default class ErrorHandler {
    constructor(notificationSystem) {
        this.notificationSystem = notificationSystem;
        this.setupGlobalErrorHandling();
    }

    // Set up global error handlers
    setupGlobalErrorHandling() {
        // Handle uncaught exceptions
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message));
            event.preventDefault();
        });

        // Handle promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || new Error('Unhandled Promise rejection'));
            event.preventDefault();
        });
    }

    // Handle specific transaction errors
    handleTransactionError(error, transactionType) {
        let message;

        // Common transaction errors
        if (error === 'insufficient_funds') {
            message = 'You don\'t have enough cash for this transaction.';
        } else if (error === 'insufficient_shares') {
            message = 'You don\'t have enough shares to sell.';
        } else if (error === 'invalid_quantity') {
            message = 'Please enter a valid quantity between 1 and 10.';
        } else if (error === 'max_transaction') {
            message = 'Maximum transaction limit reached (10 shares per transaction).';
        } else if (error === 'db_error') {
            message = 'Unable to complete transaction. Database error occurred.';
        } else {
            // Generic error message
            message = `Unable to ${transactionType.toLowerCase()} stock. Please try again.`;
        }

        // Display notification
        this.notificationSystem.error(message);
        return message;
    }

    // Handle API/database errors
    handleAPIError(error, operation) {
        console.error(`API Error during ${operation}:`, error);

        let message;
        if (error.status === 401 || error.status === 403) {
            message = 'Session expired. Please log in again.';
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else if (error.status === 404) {
            message = 'The requested resource was not found.';
        } else if (error.status >= 500) {
            message = 'Server error. Please try again later.';
        } else {
            message = `Error ${operation}. Please try again.`;
        }

        this.notificationSystem.error(message);
        return message;
    }

    // Handle general errors
    handleError(error, context = '') {
        console.error(`Error${context ? ' in ' + context : ''}:`, error);

        // Determine if we should show the error to the user
        // (don't show for minor or non-user-actionable errors)
        if (this.shouldShowToUser(error)) {
            const message = this.getErrorMessage(error);
            this.notificationSystem.error(message);
        }

        // Optional: log to server for monitoring
        this.logErrorToServer(error, context);

        return error;
    }

    // Determine if an error should be shown to the user
    shouldShowToUser(error) {
        // Always show transaction and API errors
        if (error.isTransactionError || error.isAPIError) {
            return true;
        }

        // Don't show certain errors that are handled internally
        if (error.name === 'AbortError' || error.message.includes('Script error')) {
            return false;
        }

        // Show most other errors
        return true;
    }

    // Get a user-friendly error message
    getErrorMessage(error) {
        // If there's a user-friendly message, use it
        if (error.userMessage) {
            return error.userMessage;
        }

        // Handle common error types
        switch (error.name) {
            case 'SyntaxError':
                return 'There was a problem with the data format.';
            case 'TypeError':
                return 'An unexpected error occurred. Please try again.';
            case 'NetworkError':
            case 'FetchError':
                return 'Network connection issue. Please check your internet connection.';
            default:
                // Generic message for other errors
                return 'An error occurred. Please try again or refresh the page.';
        }
    }

    // Log errors to server for monitoring (optional)
    logErrorToServer(error, context) {
        // Create error data object
        const errorData = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Send to server if enabled
        if (window.appConfig && window.appConfig.errorLogging) {
            fetch('/api/error-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData),
                // Use keepalive to ensure the request completes even if page unloads
                keepalive: true
            }).catch(e => console.error('Failed to log error:', e));
        }
    }
}