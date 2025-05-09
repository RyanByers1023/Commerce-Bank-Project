// src/client/js/services/index.js

// Export all services
export { default as DatabaseService } from '../DatabaseService.js';
export { default as AuthService, authService, getCurrentUser, isAuthenticated, requireAuth, redirectIfAuthenticated } from '../AuthService.js';
export { default as PortfolioService } from '../PortfolioService.js';
export { default as StockService, stockService } from '../StockService.js';
export { default as SimulationService, simulationService } from '../SimulationService.js';
export { default as UserProfileService, userProfileService } from '../UserProfileService.js';

// This allows easy importing like:
// import { authService, userProfileService } from './services';