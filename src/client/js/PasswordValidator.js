// src/client/js/PasswordValidator.js

/**
 * Utility class for password validation with helpful error messages
 */
class PasswordValidator {
    /**
     * Validates a password against our security requirements
     * @param {string} password - The password to validate
     * @returns {Object} - Result object with isValid flag and error message if invalid
     */
    static validate(password) {
        // Initialize result object
        const result = {
            isValid: true,
            error: null
        };

        // Check for minimum length (8 characters)
        if (password.length < 8) {
            result.isValid = false;
            result.error = 'Password must be at least 8 characters long';
            return result;
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) {
            result.isValid = false;
            result.error = 'Password must include at least one uppercase letter';
            return result;
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) {
            result.isValid = false;
            result.error = 'Password must include at least one lowercase letter';
            return result;
        }

        // Check for number
        if (!/\d/.test(password)) {
            result.isValid = false;
            result.error = 'Password must include at least one number';
            return result;
        }

        // Optional: Check for special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            // Not making this a requirement, but we can add a warning
            result.warning = 'Consider adding a special character for stronger security';
        }

        // Return validation result
        return result;
    }

    /**
     * Estimates the strength of a password
     * @param {string} password - The password to evaluate
     * @returns {string} - Strength rating (weak, medium, strong, very strong)
     */
    static getStrength(password) {
        let score = 0;

        // Length contribution (up to 5 points)
        score += Math.min(5, Math.floor(password.length / 2));

        // Character variety contribution
        if (/[A-Z]/.test(password)) score += 1; // Uppercase
        if (/[a-z]/.test(password)) score += 1; // Lowercase
        if (/\d/.test(password)) score += 1;    // Numbers
        if (/[^A-Za-z0-9]/.test(password)) score += 2; // Special chars (worth more)

        // Variety of characters (penalize if all the same)
        const uniqueChars = new Set(password.split('')).size;
        score += Math.min(3, Math.floor(uniqueChars / 3));

        // Determine strength based on score
        if (score < 6) return 'weak';
        if (score < 9) return 'medium';
        if (score < 12) return 'strong';
        return 'very strong';
    }

    /**
     * Provides helpful feedback and suggestions for password improvement
     * @param {string} password - The password to analyze
     * @returns {Array<string>} - List of suggestions for improvement
     */
    static getSuggestions(password) {
        const suggestions = [];

        if (password.length < 10) {
            suggestions.push('Consider using a longer password (10+ characters)');
        }

        if (!/[A-Z]/.test(password)) {
            suggestions.push('Add uppercase letters');
        }

        if (!/[a-z]/.test(password)) {
            suggestions.push('Add lowercase letters');
        }

        if (!/\d/.test(password)) {
            suggestions.push('Add numbers');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            suggestions.push('Add special characters (!@#$%^&*...)');
        }

        if (/(.)\1{2,}/.test(password)) {
            suggestions.push('Avoid repeating characters (aaa, 111)');
        }

        if (/^(123456|password|qwerty|abc123)$/.test(password.toLowerCase())) {
            suggestions.push('Avoid commonly used passwords');
        }

        return suggestions;
    }
}

// Export for use in other modules
export default PasswordValidator;