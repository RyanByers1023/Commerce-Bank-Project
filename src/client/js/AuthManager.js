export default class AuthManager {
  constructor() {
    this.apiEndpoint = '/api/auth';
    this.currentUser = null;
    this.authStateChangedCallbacks = [];

    // Check for existing session on initialization
    this.checkSession();
  }

  // Check if user is already logged in
  async checkSession() {
    try {
      const response = await fetch(`${this.apiEndpoint}/session`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        this.setCurrentUser(userData);
        return userData;
      } else {
        this.setCurrentUser(null);
        return null;
      }
    } catch (error) {
      console.error('Session check failed:', error);
      this.setCurrentUser(null);
      return null;
    }
  }

  // Register a new user
  async register(username, email, password) {
    try {
      const response = await fetch(`${this.apiEndpoint}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const userData = await response.json();
      this.setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Log in an existing user
  async login(username, password) {
    try {
      const response = await fetch(`${this.apiEndpoint}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await response.json();
      this.setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Log out the current user
  async logout() {
    try {
      await fetch(`${this.apiEndpoint}/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      this.setCurrentUser(null);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  // Get the current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Set the current user and notify listeners
  setCurrentUser(user) {
    this.currentUser = user;
    this.notifyAuthStateChanged();
  }

  // Add a listener for auth state changes
  onAuthStateChanged(callback) {
    this.authStateChangedCallbacks.push(callback);

    // Call immediately with current state
    if (callback) {
      callback(this.currentUser);
    }

    // Return unsubscribe function
    return () => {
      this.authStateChangedCallbacks = this.authStateChangedCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners of auth state change
  notifyAuthStateChanged() {
    this.authStateChangedCallbacks.forEach(callback => {
      if (callback) {
        callback(this.currentUser);
      }
    });
  }
}

// Create a singleton instance
const authManager = new AuthManager();
export { authManager };

// Helper functions for common auth operations
export function getCurrentUser() {
  return authManager.getCurrentUser();
}

export function isAuthenticated() {
  return !!authManager.getCurrentUser();
}

export function requireAuth(redirectUrl = '/login.html') {
  if (!isAuthenticated()) {
    window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }
  return true;
}

export function redirectIfAuthenticated(redirectUrl = '/dashboard.html') {
  if (isAuthenticated()) {
    window.location.href = redirectUrl;
    return true;
  }
  return false;
}
