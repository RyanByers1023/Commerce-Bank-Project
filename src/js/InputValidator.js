class InputValidator {
    /**
     * Validates and parses quantity input.
     * @param {any} quantity - The input value (usually a string from user input).
     * @returns {{ valid: boolean, message?: string, value?: number }}
     */
    static isValidQuantity(quantity) {
        const parsed = parseInt(quantity, 10);
        if (isNaN(parsed) || parsed <= 0) {
            return { valid: false, message: "Quantity must be a positive number." };
        }
        return { valid: true, value: parsed };
    }

    /**
     * Validates stock symbols (e.g., AAPL, TSLA).
     * @param {any} symbol - The input value for the stock symbol.
     * @returns {{ valid: boolean, message?: string, value?: string }}
     */
    static isValidSymbol(symbol) {
        if (typeof symbol !== "string" || symbol.trim() === "") {
            return { valid: false, message: "Stock symbol cannot be empty." };
        }
        return { valid: true, value: symbol.trim().toUpperCase() };
    }

    /**
     * Validates a price or numeric input.
     * @param {any} price
     * @returns {{ valid: boolean, message?: string, value?: number }}
     */
    static isValidPrice(price) {
        const parsed = parseFloat(price);
        if (isNaN(parsed) || parsed < 0) {
            return { valid: false, message: "Price must be a non-negative number." };
        }
        return { valid: true, value: parsed };
    }

    /**
     * General-purpose required field check.
     * @param {any} value
     * @param {string} fieldName
     * @returns {{ valid: boolean, message?: string }}
     */
    static isRequired(value, fieldName = "This field") {
        if (value === undefined || value === null || value.toString().trim() === "") {
            return { valid: false, message: `${fieldName} is required.` };
        }
        return { valid: true };
    }
}