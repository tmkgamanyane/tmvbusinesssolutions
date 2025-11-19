// scripts/jobseeker-auth.js
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))
        ? 'http://localhost:3000/api'
        : 'https://tmv-backend.onrender.com/api';
    
    // Handle jobseeker login form submission
    const loginForm = document.getElementById('jobseekerLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            // Basic validation
            if (!email || !password) {
                showLoginAlert('Please fill in all fields');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';

            try {
                console.log('Attempting jobseeker login...');
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (response.ok) {
                    // Check if user is a job seeker
                    if (data.user.userType !== 'job_seeker') {
                        showLoginAlert('This login is for job seekers only. Please use the client login page for other account types.');
                        return;
                    }
                    
                    showLoginAlert('Login successful! Welcome back!', 'success');
                    
                    // Store user data
                    localStorage.setItem('tmv_user', JSON.stringify(data.user));
                    
                    // Switch to profile tab after successful login
                    setTimeout(() => {
                        const profileTab = document.querySelector('.tab[data-tab="my-profile"]');
                        const profileTabContent = document.getElementById('my-profile-tab');
                        
                        // Remove active class from all tabs and contents
                        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        // Add active class to profile tab
                        profileTab.classList.add('active');
                        profileTabContent.classList.add('active');
                        
                        // Update profile UI
                        updateProfileUI(data.user);
                    }, 1500);
                } else {
                    showLoginAlert(data.message || 'Login failed');
                    if (data.errors) {
                        Object.keys(data.errors).forEach(field => {
                            if (data.errors[field]) {
                                const input = document.getElementById(`login${field.charAt(0).toUpperCase() + field.slice(1)}`);
                                if (input) {
                                    input.style.borderColor = 'red';
                                    input.addEventListener('focus', () => {
                                        input.style.borderColor = '';
                                    });
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                showLoginAlert('Network error. Please make sure the server is running on tmvbusinesssolutions.co.za');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    // Handle jobseeker registration form submission
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            // Basic validation
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                showAlert('Please fill in all required fields');
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
                console.log('Attempting jobseeker registration...');
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
                        userType: 'job_seeker'
                    }),
                    credentials: 'include'
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (response.ok) {
                    showAlert('Registration successful! Welcome to our job portal!', 'success');
                    
                    // Store user data
                    localStorage.setItem('tmv_user', JSON.stringify(data.user));
                    
                    // Show success message
                    document.getElementById('successMessage').style.display = 'block';
                    
                    // Switch to profile tab after successful registration
                    setTimeout(() => {
                        const profileTab = document.querySelector('.tab[data-tab="my-profile"]');
                        const profileTabContent = document.getElementById('my-profile-tab');
                        
                        // Remove active class from all tabs and contents
                        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        // Add active class to profile tab
                        profileTab.classList.add('active');
                        profileTabContent.classList.add('active');
                        
                        // Update profile UI
                        updateProfileUI(data.user);
                        
                        // Hide success message
                        document.getElementById('successMessage').style.display = 'none';
                    }, 3000);
                } else {
                    showAlert(data.message || 'Registration failed');
                    if (data.errors) {
                        Object.keys(data.errors).forEach(field => {
                            if (data.errors[field]) {
                                const input = document.getElementById(field);
                                if (input) {
                                    input.style.borderColor = 'red';
                                    input.addEventListener('focus', () => {
                                        input.style.borderColor = '';
                                    });
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Registration error:', error);
                showAlert('Network error. Please make sure the server is running on tmvbusinesssolutions.co.za');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Complete Registration';
            }
        });
    }

    // Show alert message for login
    function showLoginAlert(message, type = 'error') {
        const alertDiv = document.getElementById('loginAlert');
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.className = `alert ${type}`;
            alertDiv.style.display = 'block';
            alertDiv.style.padding = '10px';
            alertDiv.style.margin = '10px 0';
            alertDiv.style.borderRadius = '5px';
            
            if (type === 'success') {
                alertDiv.style.backgroundColor = '#d4edda';
                alertDiv.style.color = '#155724';
                alertDiv.style.border = '1px solid #c3e6cb';
            } else {
                alertDiv.style.backgroundColor = '#f8d7da';
                alertDiv.style.color = '#721c24';
                alertDiv.style.border = '1px solid #f5c6cb';
            }
            
            setTimeout(() => {
                alertDiv.style.display = 'none';
            }, 5000);
        }
    }

    // Show alert message for registration
    function showAlert(message, type = 'error') {
        // Create alert if it doesn't exist
        let alertDiv = document.getElementById('alert');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.id = 'alert';
            alertDiv.className = 'alert';
            const form = document.getElementById('registrationForm');
            form.parentNode.insertBefore(alertDiv, form);
        }
        
        alertDiv.textContent = message;
        alertDiv.className = `alert ${type}`;
        alertDiv.style.display = 'block';
        alertDiv.style.padding = '10px';
        alertDiv.style.margin = '10px 0';
        alertDiv.style.borderRadius = '5px';
        
        if (type === 'success') {
            alertDiv.style.backgroundColor = '#d4edda';
            alertDiv.style.color = '#155724';
            alertDiv.style.border = '1px solid #c3e6cb';
        } else {
            alertDiv.style.backgroundColor = '#f8d7da';
            alertDiv.style.color = '#721c24';
            alertDiv.style.border = '1px solid #f5c6cb';
        }
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }

    // Toggle password visibility
    window.togglePassword = function(fieldId) {
        const passwordField = document.getElementById(fieldId);
        const toggleButton = passwordField.nextElementSibling;
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            toggleButton.textContent = '🙈';
        } else {
            passwordField.type = 'password';
            toggleButton.textContent = '👁';
        }
    };

    // Show specific tab
    window.showTab = function(tabName) {
        const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(`${tabName}-tab`);
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab
        tab.classList.add('active');
        tabContent.classList.add('active');
    };

    // Check if user is already logged in
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isAuthenticated && data.user.userType === 'job_seeker') {
                    // User is logged in as job seeker, switch to profile tab
                    const profileTab = document.querySelector('.tab[data-tab="my-profile"]');
                    const profileTabContent = document.getElementById('my-profile-tab');
                    
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    
                    profileTab.classList.add('active');
                    profileTabContent.classList.add('active');
                    
                    // Update UI with user info
                    updateProfileUI(data.user);
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    // Update profile UI with user data
    function updateProfileUI(user) {
        // Update any profile information displays
        const profileSection = document.querySelector('#my-profile-tab .form-section h3');
        if (profileSection && profileSection.textContent === 'Profile Overview') {
            // Check if greeting already exists
            if (!document.getElementById('userGreeting')) {
                const userGreeting = document.createElement('p');
                userGreeting.id = 'userGreeting';
                userGreeting.textContent = `Welcome back, ${user.name}!`;
                userGreeting.style.marginBottom = '1rem';
                userGreeting.style.fontWeight = 'bold';
                userGreeting.style.color = '#007bff';
                profileSection.parentNode.insertBefore(userGreeting, profileSection.nextSibling);
            }
        }
    }

    // Check auth status on page load
    checkAuthStatus();
});