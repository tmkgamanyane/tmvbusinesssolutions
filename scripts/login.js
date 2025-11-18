// scripts/login.js
// Login form functionality
if (typeof window !== 'undefined') {
    // Dynamic API base URL - works with www, non-www, and localhost
    const API_BASE = (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))
        ? 'http://localhost:3000/api'
        : `${window.location.protocol}//${window.location.hostname}/api`;
    
    console.log('🔗 Login.js API_BASE:', API_BASE);

document.addEventListener('DOMContentLoaded', function() {
    
    // Form toggle functionality
    window.showLogin = function() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const toggleSlider = document.getElementById('toggleSlider');
        
        if (!loginForm || !registerForm) return;
        
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const firstToggle = document.querySelector('.toggle-btn:nth-child(1)');
        if (firstToggle) firstToggle.classList.add('active');
        if (toggleSlider) toggleSlider.style.transform = 'translateX(0)';
    };

    window.showRegister = function() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const toggleSlider = document.getElementById('toggleSlider');
        
        if (!loginForm || !registerForm) return;
        
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const secondToggle = document.querySelector('.toggle-btn:nth-child(2)');
        if (secondToggle) secondToggle.classList.add('active');
        if (toggleSlider) toggleSlider.style.transform = 'translateX(100%)';
    };

    // Password toggle functionality
    window.togglePassword = function(fieldId) {
        const passwordField = document.getElementById(fieldId);
        if (!passwordField) return;
        
        const toggleButton = passwordField.nextElementSibling;
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            if (toggleButton) toggleButton.textContent = '🙈';
        } else {
            passwordField.type = 'password';
            if (toggleButton) toggleButton.textContent = '👁';
        }
    };

    // Show alert message
    function showAlert(message, type = 'error') {
        const alertDiv = document.getElementById('alert');
        if (!alertDiv) {
            console.warn('Alert div not found. Message:', message);
            return;
        }
        
        alertDiv.textContent = message;
        alertDiv.className = `alert ${type}`;
        alertDiv.style.display = 'block';
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            const submitBtn = this.querySelector('.submit-btn');
            
            // Basic validation
            if (!email || !password) {
                showAlert('Please fill in all fields');
                return;
            }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';

        try {
            console.log('🔐 Attempting login...');
            console.log('📧 Email:', email);
            console.log('🔗 API URL:', `${API_BASE}/auth/login`);
            
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, rememberMe }),
                credentials: 'include'
            });

            console.log('✅ Response received - Status:', response.status);
            console.log('📋 Response OK:', response.ok);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            console.log('📄 Content-Type:', contentType);
            
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Server returned HTML or plain text instead of JSON
                const text = await response.text();
                console.error('❌ Server returned non-JSON response:', text.substring(0, 500));
                throw new Error('Server error: Expected JSON but received ' + contentType + '. Check server logs.');
            }
            console.log('📦 Response data:', data);

            if (response.ok) {
                showAlert(`Login successful! Redirecting...`, 'success');
                
                // Store token with appropriate expiry based on remember me
                if (data.token) {
                    if (rememberMe) {
                        localStorage.setItem('tmv_auth_token', data.token);
                        localStorage.setItem('tmv_remember_me', 'true');
                    } else {
                        sessionStorage.setItem('tmv_auth_token', data.token);
                        localStorage.removeItem('tmv_remember_me');
                    }
                }
                
                // Update the global auth state
                if (window.tmvAuth) {
                    window.tmvAuth.user = data.user;
                    localStorage.setItem('tmv_user', JSON.stringify(data.user));
                    window.tmvAuth.updateUIForLoggedInUser(data.user);
                }
                
                // Redirect immediately without delay
                window.location.href = '../index.html';
            } else {
                showAlert(data.message || 'Login failed');
                if (data.errors) {
                    Object.keys(data.errors).forEach(field => {
                        if (data.errors[field]) {
                            const input = document.getElementById(`login${field.charAt(0).toUpperCase() + field.slice(1)}`);
                            if (input) {
                                input.style.borderColor = 'red';
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error details:', error.stack);
            showAlert('Network error: ' + (error.message || 'Please make sure the server is running and accessible'));
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
        });
    }

    // Handle register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
        
        const fullName = document.getElementById('registerName').value.trim();
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = this.querySelector('.submit-btn');
        
        // Basic validation
        if (!fullName || !email || !password || !confirmPassword) {
            showAlert('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        try {
            console.log('📝 Attempting registration...');
            console.log('👤 Name:', `${firstName} ${lastName}`);
            console.log('📧 Email:', email);
            console.log('🔗 API URL:', `${API_BASE}/auth/register`);
            
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    firstName, 
                    lastName, 
                    email, 
                    password, 
                    confirmPassword,
                    userType: 'client'
                }),
                credentials: 'include'
            });

            console.log('✅ Response received - Status:', response.status);
            console.log('📋 Response OK:', response.ok);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            console.log('📄 Content-Type:', contentType);
            
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Server returned HTML or plain text instead of JSON
                const text = await response.text();
                console.error('❌ Server returned non-JSON response:', text.substring(0, 500));
                throw new Error('Server error: Expected JSON but received ' + contentType + '. Check server logs.');
            }
            console.log('📦 Response data:', data);

            if (response.ok) {
                showAlert('Registration successful! Welcome!', 'success');
                
                // Update the global auth state
                if (window.tmvAuth) {
                    window.tmvAuth.user = data.user;
                    localStorage.setItem('tmv_user', JSON.stringify(data.user));
                    window.tmvAuth.updateUIForLoggedInUser(data.user);
                }
                
                // Redirect immediately without delay
                window.location.href = '../index.html';
            } else {
                showAlert(data.message || 'Registration failed');
                if (data.errors) {
                    Object.keys(data.errors).forEach(field => {
                        if (data.errors[field]) {
                            const input = document.getElementById(`register${field.charAt(0).toUpperCase() + field.slice(1)}`);
                            if (input) {
                                input.style.borderColor = 'red';
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            console.error('Error details:', error.stack);
            showAlert('Network error: ' + (error.message || 'Please make sure the server is running and accessible'));
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
        });
    }

    // Check if user is already logged in on page load
    if (window.tmvAuth) {
        // tmvAuth will handle this automatically
        console.log('Using global tmvAuth for authentication check');
    }
});

}