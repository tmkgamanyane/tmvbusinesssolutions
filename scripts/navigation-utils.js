// Navigation utilities for proper page routing
class NavigationUtils {
    // Get the correct path to a page based on current location
    static getPagePath(pageName) {
        const currentPath = window.location.pathname;
        
        // If we're already in the pages folder, don't add pages/ prefix
        if (currentPath.includes('/pages/')) {
            return pageName;
        }
        
        // If we're at root level, add pages/ prefix
        return `pages/${pageName}`;
    }
    
    // Get the correct path to the root index
    static getHomePath() {
        const currentPath = window.location.pathname;
        
        // If we're in the pages folder, go up one level
        if (currentPath.includes('/pages/')) {
            return '../index.html';
        }
        
        // If we're at root level
        return 'index.html';
    }
    
    // Navigate to login page
    static goToLogin() {
        window.location.href = this.getPagePath('client_login.html');
    }
    
    // Navigate to home page
    static goToHome() {
        window.location.href = this.getHomePath();
    }
    
    // Check if we're currently in the pages folder
    static isInPagesFolder() {
        return window.location.pathname.includes('/pages/');
    }
}

// Make it globally available
window.NavigationUtils = NavigationUtils;