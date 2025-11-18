// Simple Authentication Check - Minimal Working Version
class TMVAuth {
    constructor() {
        this.baseURL = window.APP_CONFIG ? window.APP_CONFIG.getApiBase() : 'https://tmvbusinesssolutions.co.za/api';
        this.user = null;
    }

    // Check authentication status
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.baseURL}/auth/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isAuthenticated) {
                    this.user = {
                        id: data.id,
                        name: data.name,
                        email: data.email,
                        userType: data.userType,
                        role: data.role
                    };
                    this.updateUIForLoggedInUser(this.user);
                    return true;
                } else {
                    this.user = null;
                    this.updateUIForGuest();
                    return false;
                }
            } else {
                this.user = null;
                this.updateUIForGuest();
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.user = null;
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
                this.updateUIForLoggedInUser(data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Login failed' };
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
            this.updateUIForGuest();
            alert('You have been logged out successfully!');
            
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            this.user = null;
            this.updateUIForGuest();
            return { success: false, error: 'Logout failed' };
        }
    }

    // Update UI for logged in user
    updateUIForLoggedInUser(user) {
        const guestNameElements = document.querySelectorAll('.guestname, #welcomeMessage');
        const loginButtons = document.querySelectorAll('#loginButton');

        let userName = user.name || user.firstName || user.email || 'User';

        guestNameElements.forEach(element => {
            element.innerHTML = `Welcome, <strong style="color: #ffffff;">${userName}</strong>`;
        });

        loginButtons.forEach(button => {
            if (button) {
                button.textContent = 'Logout';
                button.style.background = '#dc3545';
                button.style.color = 'white';
                button.style.padding = '8px 15px';
                button.style.borderRadius = '5px';
                button.style.textDecoration = 'none';
                button.onclick = (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to logout?')) {
                        this.logout();
                    }
                    return false;
                };
                button.href = 'javascript:void(0)';
            }
        });
    }

    // Update UI for guest
    updateUIForGuest() {
        const guestNameElements = document.querySelectorAll('.guestname, #welcomeMessage');
        const loginButtons = document.querySelectorAll('#loginButton');

        guestNameElements.forEach(element => {
            element.innerHTML = 'Welcome, Guest';
        });

        loginButtons.forEach(button => {
            if (button) {
                button.textContent = 'Login/Register';
                button.style.background = '';
                button.style.color = '';
                button.style.padding = '';
                button.style.borderRadius = '';
                button.style.textDecoration = '';
                button.onclick = null;
                
                // Set correct path based on current location
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/')) {
                    button.href = 'client_login.html';
                } else {
                    button.href = 'pages/client_login.html';
                }
            }
        });
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.user;
    }
}

// Create global instance
const tmvAuth = new TMVAuth();
window.tmvAuth = tmvAuth;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authentication...');
    tmvAuth.checkAuthStatus();
});

// Also check immediately if DOM is already loaded
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, checking authentication...');
    setTimeout(() => tmvAuth.checkAuthStatus(), 100);
}