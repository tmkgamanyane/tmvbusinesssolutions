// API endpoint configuration - Automatically detect domain (works with www and non-www)
const API_BASE_URL = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.protocol}//${window.location.hostname}/api`;

// Utility function for making API calls
async function apiCall(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('auth_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                
                // Use correct path based on current location
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/')) {
                    window.location.href = 'client_login.html';  // Already in pages folder
                } else {
                    window.location.href = 'pages/client_login.html';  // From root
                }
            }
            throw new Error(data.message || 'API call failed');
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// Authentication functions
const auth = {
    // Client authentication

    async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed');
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    async login(credentials) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');
            if (data.token) this.setToken(data.token);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    logout() {
        this.clearToken();
        
        // Use correct path based on current location
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) {
            window.location.href = 'client_login.html';  // Already in pages folder
        } else {
            window.location.href = 'pages/client_login.html';  // From root
        }
    }
};

// Cart management
const cart = {
    async getCart() {
        try {
            const response = await fetch(`${API_BASE_URL}/cart`, {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch cart');
            return data;
        } catch (error) {
            console.error('Cart fetch error:', error);
            throw error;
        }
    },

    async addItem(item) {
        try {
            const response = await fetch(`${API_BASE_URL}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify(item)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add item');
            return data;
        } catch (error) {
            console.error('Add to cart error:', error);
            throw error;
        }
    },

    async removeItem(productId) {
        try {
            const response = await fetch(`${API_BASE_URL}/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to remove item');
            return data;
        } catch (error) {
            console.error('Remove from cart error:', error);
            throw error;
        }
    },

    async clearCart() {
        try {
            const response = await fetch(`${API_BASE_URL}/cart/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to clear cart');
            return data;
        } catch (error) {
            console.error('Clear cart error:', error);
            throw error;
        }
    }
};

// Payment processing
const payment = {
    async initializePayment(amount, items) {
        try {
            const response = await fetch(`${API_BASE_URL}/payments/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    amount, 
                    currency: 'ZAR',
                    description: 'Service Payment',
                    metadata: {
                        paymentType: 'service_payment',
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Payment initialization failed');
            }
            
            return { 
                checkoutUrl: data.checkout.redirectUrl,
                checkoutId: data.checkout.id,
                payment: data.payment
            };
        } catch (error) {
            console.error('Payment initialization error:', error);
            throw error;
        }
    },

    async checkStatus(transactionId) {
        try {
            const response = await fetch(`${API_BASE_URL}/payments/status/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to check payment status');
            return data;
        } catch (error) {
            console.error('Payment status check error:', error);
            throw error;
        }
    }
};

// Update cart count in the header
async function updateCartCount() {
    try {
        const cartData = await cart.getCart();
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = cartData.items.length.toString();
        }
    } catch (error) {
        console.error('Failed to update cart count:', error);
    }
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    
    if (token) {
        if (loginButton) loginButton.style.display = 'none';
        if (registerButton) registerButton.style.display = 'none';
        updateCartCount();
    } else {
        if (loginButton) loginButton.style.display = 'inline-block';
        if (registerButton) registerButton.style.display = 'inline-block';
    }
});