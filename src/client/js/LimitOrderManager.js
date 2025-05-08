export default class LimitOrderManager {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.limitOrders = [];
        this.dbManager = new window.DatabaseManager();

        // Load existing limit orders
        this.loadLimitOrders();

        // Set up interval to check orders
        this.checkInterval = setInterval(() => this.checkLimitOrders(), 5000);
    }

    // Load limit orders from database
    async loadLimitOrders() {
        try {
            if (!this.userProfile || !this.userProfile.username) {
                console.warn('Cannot load limit orders: No user profile');
                return;
            }

            const orders = await this.dbManager.sendRequest(`limit-orders/${this.userProfile.username}`);
            this.limitOrders = orders || [];
        } catch (error) {
            console.error('Failed to load limit orders:', error);
            this.limitOrders = [];
        }
    }

    // Save limit orders to database
    async saveLimitOrders() {
        try {
            if (!this.userProfile || !this.userProfile.username) {
                console.warn('Cannot save limit orders: No user profile');
                return false;
            }

            await this.dbManager.sendRequest(`limit-orders/${this.userProfile.username}`, 'PUT', this.limitOrders);
            return true;
        } catch (error) {
            console.error('Failed to save limit orders:', error);
            return false;
        }
    }

    // Add a new limit order
    async addLimitOrder(order) {
        // Validate order
        if (!this.validateOrder(order)) {
            throw new Error('Invalid limit order');
        }

        // Add unique ID and creation timestamp
        order.id = `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        order.createdAt = new Date().toISOString();
        order.status = 'active';

        // Add to list
        this.limitOrders.push(order);

        // Save to database
        await this.saveLimitOrders();

        return order;
    }

    // Validate a limit order
    validateOrder(order) {
        // Required fields
        if (!order.type || !order.symbol || !order.quantity || !order.targetPrice) {
            return false;
        }

        // Valid type (buy or sell)
        if (order.type !== 'buy' && order.type !== 'sell') {
            return false;
        }

        // Valid quantity (positive integer)
        if (!Number.isInteger(order.quantity) || order.quantity <= 0 || order.quantity > 100) {
            return false;
        }

        // Valid price (positive number)
        if (typeof order.targetPrice !== 'number' || order.targetPrice <= 0) {
            return false;
        }

        // For sell orders, check if user has enough shares
        if (order.type === 'sell') {
            const holding = this.userProfile.portfolio.holdingsMap[order.symbol];
            if (!holding || holding.quantity < order.quantity) {
                return false;
            }
        }

        // For buy orders, validate expiration (optional)
        if (order.expiration) {
            const expiration = new Date(order.expiration);
            if (isNaN(expiration.getTime())) {
                return false;
            }
        }

        return true;
    }

    // Cancel a limit order
    async cancelLimitOrder(orderId) {
        const orderIndex = this.limitOrders.findIndex(order => order.id === orderId);

        if (orderIndex === -1) {
            throw new Error('Order not found');
        }

        this.limitOrders[orderIndex].status = 'cancelled';
        this.limitOrders[orderIndex].cancelledAt = new Date().toISOString();

        // Save to database
        await this.saveLimitOrders();

        return this.limitOrders[orderIndex];
    }

    // Check all active limit orders
    async checkLimitOrders() {
        const now = new Date();
        let ordersChanged = false;

        for (const order of this.limitOrders) {
            // Skip non-active orders
            if (order.status !== 'active') {
                continue;
            }

            // Check expiration
            if (order.expiration && new Date(order.expiration) < now) {
                order.status = 'expired';
                order.expiredAt = now.toISOString();
                ordersChanged = true;
                continue;
            }

            // Find the stock
            const stock = this.userProfile.stocksAddedToSim.find(s => s.symbol === order.symbol);
            if (!stock) continue;

            // Check if price condition is met
            if (order.type === 'buy' && stock.marketPrice <= order.targetPrice) {
                // Execute buy order
                await this.executeBuyOrder(order, stock);
                ordersChanged = true;
            } else if (order.type === 'sell' && stock.marketPrice >= order.targetPrice) {
                // Execute sell order
                await this.executeSellOrder(order, stock);
                ordersChanged = true;
            }
        }

        // Save changes if any orders were updated
        if (ordersChanged) {
            await this.saveLimitOrders();
        }
    }

    // Execute a buy limit order
    async executeBuyOrder(order, stock) {
        try {
            // Calculate total cost
            const totalCost = stock.marketPrice * order.quantity;

            // Check if user has enough cash
            if (this.userProfile.portfolio.balance < totalCost) {
                order.status = 'failed';
                order.failedAt = new Date().toISOString();
                order.failReason = 'Insufficient funds';
                return false;
            }

            // Execute the trade
            const result = this.userProfile.buyStock(stock, order.quantity);

            if (result.success) {
                order.status = 'completed';
                order.completedAt = new Date().toISOString();
                order.executionPrice = stock.marketPrice;
                order.totalValue = totalCost;

                // Create notification
                if (window.notificationSystem) {
                    window.notificationSystem.success(`Limit Buy Order executed: ${order.quantity} shares of ${order.symbol} at $${stock.marketPrice.toFixed(2)}`);
                }

                return true;
            } else {
                order.status = 'failed';
                order.failedAt = new Date().toISOString();
                order.failReason = result.message || 'Transaction failed';
                return false;
            }
        } catch (error) {
            console.error('Error executing buy order:', error);
            order.status = 'failed';
            order.failedAt = new Date().toISOString();
            order.failReason = error.message || 'Unexpected error';
            return false;
        }
    }

    // Execute a sell limit order
    async executeSellOrder(order, stock) {
        try {
            // Check if user still has enough shares
            const holding = this.userProfile.portfolio.holdingsMap[order.symbol];
            if (!holding || holding.quantity < order.quantity) {
                order.status = 'failed';
                order.failedAt = new Date().toISOString();
                order.failReason = 'Insufficient shares';
                return false;
            }

            // Execute the trade
            const result = this.userProfile.sellStock(stock, order.quantity);

            if (result.success) {
                order.status = 'completed';
                order.completedAt = new Date().toISOString();
                order.executionPrice = stock.marketPrice;
                order.totalValue = stock.marketPrice * order.quantity;

                // Create notification
                if (window.notificationSystem) {
                    window.notificationSystem.success(`Limit Sell Order executed: ${order.quantity} shares of ${order.symbol} at $${stock.marketPrice.toFixed(2)}`);
                }

                return true;
            } else {
                order.status = 'failed';
                order.failedAt = new Date().toISOString();
                order.failReason = result.message || 'Transaction failed';
                return false;
            }
        } catch (error) {
            console.error('Error executing sell order:', error);
            order.status = 'failed';
            order.failedAt = new Date().toISOString();
            order.failReason = error.message || 'Unexpected error';
            return false;
        }
    }

    // Get all limit orders
    getAllOrders() {
        return [...this.limitOrders];
    }

    // Get active limit orders
    getActiveOrders() {
        return this.limitOrders.filter(order => order.status === 'active');
    }

    // Clean up resources
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}