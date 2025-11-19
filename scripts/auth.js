// scripts/auth.js - Unified Authentication Service
class TMVAuth {
    constructor() {
        this.baseURL = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : 'https://tmv-backend.onrender.com/api';
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkAuthStatus();
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
                    this.currentUser = data.user;
                    this.updateUIForLoggedInUser(data.user);
                    return true;
                } else {
                    this.updateUIForGuest();
                    return false;
                }
            } else {
                this.updateUIForGuest();
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.updateUIForGuest();
            return false;
        }
    }

    // Login function
    async login(email, password, userType = 'client') {
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
                this.currentUser = data.user;
                this.updateUIForLoggedInUser(data.user);
                return { success: true, user: data.user, message: data.message };
            } else {
                return { success: false, error: data.message, errors: data.errors };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: 'Network error. Please try again.' };
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
                this.currentUser = data.user;
                this.updateUIForLoggedInUser(data.user);
                return { success: true, user: data.user, message: data.message };
            } else {
                return { success: false, error: data.message, errors: data.errors };
            }
        } catch (error) {
            console.error('Registration failed:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    // Logout function
    async logout() {
        try {
            const response = await fetch(`${this.baseURL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                this.updateUIForGuest();
                return { success: true };
            } else {
                return { success: false, error: 'Logout failed' };
            }
        } catch (error) {
            console.error('Logout failed:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Update UI for logged in user
    updateUIForLoggedInUser(user) {
        const guestNameElement = document.querySelector('.guestname');
        if (guestNameElement) {
            guestNameElement.innerHTML = `<span>Welcome, ${user.name}</span>`;
        }

        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'Logout';
            loginButton.href = '#';
            loginButton.onclick = (e) => {
                e.preventDefault();
                this.handleLogout();
            };
        }
    }

    // Update UI for guest user
    updateUIForGuest() {
        const guestNameElement = document.querySelector('.guestname');
        if (guestNameElement) {
            guestNameElement.innerHTML = '<span>Welcome, Guest</span>';
        }

        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'Login/Register';
            
            // Use correct path based on current location
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/')) {
                loginButton.href = 'client_login.html';  // Already in pages folder
            } else {
                loginButton.href = 'pages/client_login.html';  // From root
            }
            
            loginButton.onclick = null;
        }
    }

    // Handle logout
    async handleLogout() {
        const result = await this.logout();
        if (result.success) {
            // Use correct path based on current location
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/')) {
                window.location.href = '../index.html';  // Go up from pages folder
            } else {
                window.location.href = 'index.html';  // Already at root
            }
        } else {
            alert('Logout failed. Please try again.');
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Create global instance
window.tmvAuth = new TMVAuth();

