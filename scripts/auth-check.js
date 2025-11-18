// Authentication check for all pages
class TMVAuth {
    constructor() {
        this.baseURL = window.APP_CONFIG ? window.APP_CONFIG.getApiBase() : 'https://tmvbusinesssolutions.co.za/api';
        this.user = JSON.parse(localStorage.getItem('tmv_user') || 'null');
        console.log('🔐 TMVAuth initialized with user:', this.user);
    }

    // Check authentication status
    async checkAuthStatus() {
        try {
            console.log('Checking auth status...');
            
            // First check localStorage for existing user data
            const storedUser = localStorage.getItem('tmv_user');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    console.log('Found stored user data:', userData);
                    // Don't trust localStorage completely, verify with server
                } catch (e) {
                    console.error('Invalid stored user data, clearing:', e);
                    localStorage.removeItem('tmv_user');
                }
            }
            
            const response = await fetch(`${this.baseURL}/auth/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Auth response data:', data);
                if (data.isAuthenticated) {
                    // Create user object from response
                    const user = {
                        id: data.id,
                        name: data.name,
                        email: data.email,
                        userType: data.userType,
                        role: data.role
                    };
                    this.user = user;
                    localStorage.setItem('tmv_user', JSON.stringify(user));
                    console.log('User authenticated, updating UI...');
                    this.updateUIForLoggedInUser(user);
                    return true;
                } else {
                    console.log('User not authenticated, showing guest UI...');
                    this.user = null;
                    localStorage.removeItem('tmv_user');
                    this.updateUIForGuest();
                    return false;
                }
            } else {
                console.log('Auth check failed, showing guest UI...');
                this.user = null;
                localStorage.removeItem('tmv_user');
                this.updateUIForGuest();
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.user = null;
            localStorage.removeItem('tmv_user');
            this.updateUIForGuest();
            return false;
        }
    }

    // Login function
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.user = data.user;
                localStorage.setItem('tmv_user', JSON.stringify(data.user));
                this.updateUIForLoggedInUser(data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Login failed' };
        }
    }

    // Register function
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.user = data.user;
                localStorage.setItem('tmv_user', JSON.stringify(data.user));
                this.updateUIForLoggedInUser(data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Registration failed' };
        }
    }

    // Logout function
    async logout() {
        try {
            const response = await fetch(`${this.baseURL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            this.user = null;
            localStorage.removeItem('tmv_user');
            
            // Update UI immediately
            this.updateUIForGuest();
            
            // Show success message
            alert('You have been logged out successfully!');
            
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            
            // Still clear local data and update UI even if server call fails
            this.user = null;
            localStorage.removeItem('tmv_user');
            this.updateUIForGuest();
            
            return { success: false, error: 'Logout failed' };
        }
    }

    // Update UI for logged in user
    updateUIForLoggedInUser(user) {
        console.log('Updating UI for logged in user:', user);
        
        // Find all welcome message elements
        const guestNameElements = document.querySelectorAll('.guestname, #welcomeMessage');
        const loginButtons = document.querySelectorAll('#loginButton, a[href*="client_login"]');

        // Create the user's display name
        let userName = user.name || user.firstName || user.email || 'User';
        console.log('Displaying username:', userName);

        // Update welcome messages
        guestNameElements.forEach((element, index) => {
            console.log(`Updating welcome element ${index}:`, element);
            element.innerHTML = `Welcome, <strong style="color: #ffffff;">${userName}</strong>`;
        });

        // Update login buttons
        loginButtons.forEach((button, index) => {
            if (button) {
                console.log(`Updating login button ${index}:`, button);
                button.textContent = 'Logout';
                button.style.background = '#dc3545';
                button.style.color = 'white';
                button.style.padding = '8px 15px';
                button.style.borderRadius = '5px';
                button.style.textDecoration = 'none';
                button.style.border = 'none';
                
                // Remove any existing onclick handlers
                button.onclick = null;
                button.removeEventListener('click', this.handleLogoutClick);
                
                // Add new logout handler
                const logoutHandler = (e) => {
                    e.preventDefault();
                    console.log('Logout button clicked');
                    if (confirm('Are you sure you want to logout?')) {
                        this.logout();
                    }
                    return false;
                };
                
                button.addEventListener('click', logoutHandler);
                button.onclick = logoutHandler;
                button.href = 'javascript:void(0)';
            }
        });

        console.log('UI update completed for logged in user');
    }

    // Update UI for guest
    updateUIForGuest() {
        console.log('Updating UI for guest');
        
        const guestNameElements = document.querySelectorAll('.guestname, #welcomeMessage');
        const loginButtons = document.querySelectorAll('#loginButton, a[href*="client_login"]');

        guestNameElements.forEach((element, index) => {
            console.log(`Resetting welcome element ${index} to guest`);
            element.innerHTML = 'Welcome, Guest';
        });

        loginButtons.forEach((button, index) => {
            if (button) {
                console.log(`Resetting login button ${index}`);
                button.textContent = 'Login/Register';
                button.style.background = '';
                button.style.color = '';
                button.style.padding = '';
                button.style.borderRadius = '';
                button.style.textDecoration = '';
                button.style.border = '';
                button.onclick = null;
                
                // Remove logout event listeners
                button.removeEventListener('click', this.handleLogoutClick);
                
                // Use navigation utility for correct path
                if (window.NavigationUtils) {
                    button.href = window.NavigationUtils.getPagePath('client_login.html');
                } else {
                    // Fallback if utility not loaded
                    const currentPath = window.location.pathname;
                    button.href = currentPath.includes('/pages/') ? 'client_login.html' : 'pages/client_login.html';
                }
            }
        });

        console.log('UI reset to guest state completed');
    }    // Check if user is authenticated
    isAuthenticated() {
        return !!this.user;
    }

    // Require authentication for protected pages
    requireAuth() {
        if (!this.isAuthenticated()) {
            alert('Please login to access this page.');
            
            // Use navigation utility for correct path
            if (window.NavigationUtils) {
                window.NavigationUtils.goToLogin();
            } else {
                // Fallback if utility not loaded
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/')) {
                    window.location.href = 'client_login.html';
                } else {
                    window.location.href = 'pages/client_login.html';
                }
            }
            return false;
        }
        return true;
    }
}

// Create global instance
const tmvAuth = new TMVAuth();

// Export for use in other scripts
window.tmvAuth = tmvAuth;

// Function to initialize authentication
function initializeAuth() {
    console.log('🚀 Initializing authentication...');
    
    // Wait for DOM elements to be available
    const checkAndInit = (attempt = 1) => {
        const loginButtons = document.querySelectorAll('#loginButton, a[href*="client_login"]');
        const welcomeElements = document.querySelectorAll('.guestname, #welcomeMessage');
        
        console.log(`🔍 Attempt ${attempt} - Found login buttons: ${loginButtons.length}, welcome elements: ${welcomeElements.length}`);
        
        if (loginButtons.length > 0 || welcomeElements.length > 0) {
            console.log('✅ DOM elements found, checking auth status...');
            if (window.tmvAuth) {
                // Add a small delay to ensure cookies are ready
                setTimeout(() => {
                    window.tmvAuth.checkAuthStatus().then((result) => {
                        console.log('✅ Authentication check completed:', result);
                        
                        // If auth failed, try again once more after a longer delay
                        if (!result && attempt === 1) {
                            console.log('🔄 Auth failed on first try, retrying in 2 seconds...');
                            setTimeout(() => {
                                window.tmvAuth.checkAuthStatus().then((retryResult) => {
                                    console.log('🔄 Retry authentication result:', retryResult);
                                });
                            }, 2000);
                        }
                    }).catch((error) => {
                        console.error('❌ Authentication check failed:', error);
                    });
                }, 200); // Small delay for cookies to be ready
            } else {
                console.error('❌ tmvAuth not available');
            }
        } else if (attempt < 10) {
            console.log(`⏳ DOM elements not ready yet, retrying in 100ms... (attempt ${attempt})`);
            setTimeout(() => checkAndInit(attempt + 1), 100);
        } else {
            console.warn('⚠️ Gave up waiting for DOM elements after 10 attempts');
        }
    };
    
    checkAndInit();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing authentication...');
    initializeAuth();
});

// Also check immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // Document still loading, wait for DOMContentLoaded
    console.log('Document still loading, waiting for DOMContentLoaded...');
} else {
    // Document already loaded
    console.log('Document already loaded, initializing auth immediately...');
    setTimeout(initializeAuth, 100); // Small delay to ensure DOM elements are available
}