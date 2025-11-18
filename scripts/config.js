// Global configuration for API endpoints
// This file centralizes all API URL configuration for production/development

const APP_CONFIG = {
    // Automatically detect environment
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Dynamically determine base URLs based on current location
    _getBaseUrl: function() {
        if (this.isDevelopment) {
            return 'http://localhost:3000';
        }
        return `${window.location.protocol}//${window.location.hostname}`;
    },
    
    // Base URLs for different environments
    development: {
        get apiBase() { return `${APP_CONFIG._getBaseUrl()}/api`; },
        get clientUrl() { return APP_CONFIG._getBaseUrl(); },
        get baseUrl() { return APP_CONFIG._getBaseUrl(); }
    },
    
    production: {
        get apiBase() { return `${APP_CONFIG._getBaseUrl()}/api`; },
        get clientUrl() { return APP_CONFIG._getBaseUrl(); },
        get baseUrl() { return APP_CONFIG._getBaseUrl(); }
    },
    
    // Get current environment config
    getConfig: function() {
        return this.isDevelopment ? this.development : this.production;
    },
    
    // Get API base URL for current environment
    getApiBase: function() {
        return this.getConfig().apiBase;
    },
    
    // Get client base URL for current environment
    getClientUrl: function() {
        return this.getConfig().clientUrl;
    },
    
    // Get full URL for a specific page
    getPageUrl: function(page) {
        return `${this.getClientUrl()}/pages/${page}`;
    }
};

// Make it globally available
window.APP_CONFIG = APP_CONFIG;

console.log('🌐 Environment detected:', APP_CONFIG.isDevelopment ? 'Development' : 'Production');
console.log('🔗 API Base URL:', APP_CONFIG.getApiBase());