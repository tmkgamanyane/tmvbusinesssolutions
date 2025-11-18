class EmployerAuth {
    constructor() {
        this.API_BASE = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : `${window.location.protocol}//${window.location.hostname}/api`;
        this.currentLoginType = 'admin';
        this.initializeEventListeners();
        this.setupTabSwitching();
    }

    setupTabSwitching() {
        const tabs = document.querySelectorAll('.login-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => {
                    content.style.display = 'none';
                    content.classList.remove('active');
                });
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const activeContent = document.querySelector(`[data-content="${tabType}"]`);
                if (activeContent) {
                    activeContent.style.display = 'block';
                    activeContent.classList.add('active');
                }
                
                // Update current login type
                this.currentLoginType = tabType;
            });
        });
    }

    initializeEventListeners() {
        // Admin login
        document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Manager login
        document.getElementById('managerLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleManagerLogin();
        });

        // HR login
        document.getElementById('hrLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleHRLogin();
        });

        // Check if already logged in
        this.checkExistingSession();
    }

    async checkExistingSession() {
        try {
            const response = await fetch(`${this.API_BASE}/auth/employer/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    // Redirect based on role
                    const role = data.user.role;
                    
                    if (role === 'administrator') {
                        window.location.href = 'admin_dashboard.html';
                    } else if (role === 'management') {
                        window.location.href = 'employer_management_dashboard.html';
                    } else if (role === 'hr_recruitment') {
                        window.location.href = 'employer_dashboard.html';
                    }
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    async handleAdminLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const rememberMe = document.getElementById('adminRememberMe').checked;

        if (!email || !password) {
            this.showAlert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/auth/employer/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, requiredRole: 'administrator' })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user.role === 'administrator') {
                    if (rememberMe) {
                        localStorage.setItem('admin_user', JSON.stringify(data.user));
                        localStorage.setItem('admin_remember', 'true');
                    }
                    
                    this.showAlert('Success', 'Login successful! Redirecting...', () => {
                        window.location.href = 'admin_dashboard.html';
                    });
                } else {
                    this.showAlert('Error', 'Access denied. Administrator privileges required.');
                }
            } else {
                this.showAlert('Error', data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }

    async handleManagerLogin() {
        const email = document.getElementById('managerEmail').value;
        const password = document.getElementById('managerPassword').value;
        const rememberMe = document.getElementById('managerRememberMe').checked;

        if (!email || !password) {
            this.showAlert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/auth/employer/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, requiredRole: 'management' })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user.role === 'management') {
                    if (rememberMe) {
                        localStorage.setItem('manager_user', JSON.stringify(data.user));
                        localStorage.setItem('manager_remember', 'true');
                    }
                    
                    this.showAlert('Success', 'Login successful! Redirecting...', () => {
                        window.location.href = 'employer_management_dashboard.html';
                    });
                } else {
                    this.showAlert('Error', 'Access denied. Management privileges required.');
                }
            } else {
                this.showAlert('Error', data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Manager login error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }

    async handleHRLogin() {
        const email = document.getElementById('hrEmail').value;
        const password = document.getElementById('hrPassword').value;
        const rememberMe = document.getElementById('hrRememberMe').checked;

        if (!email || !password) {
            this.showAlert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/auth/employer/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, requiredRole: 'hr_recruitment' })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user.role === 'hr_recruitment') {
                    if (rememberMe) {
                        localStorage.setItem('hr_user', JSON.stringify(data.user));
                        localStorage.setItem('hr_remember', 'true');
                    }
                    
                    this.showAlert('Success', 'Login successful! Redirecting...', () => {
                        window.location.href = 'employer_dashboard.html';
                    });
                } else {
                    this.showAlert('Error', 'Access denied. HR & Recruitment privileges required.');
                }
            } else {
                this.showAlert('Error', data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('HR login error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showAlert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/employer/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Determine dashboard based on role
                let dashboardUrl = '../pages/employer_dashboard.html'; // Default (HR)
                
                if (data.user && data.user.EmployerProfile) {
                    const role = data.user.EmployerProfile.role;
                    
                    if (role === 'administrator') {
                        dashboardUrl = '../pages/employer_admin_dashboard.html';
                    } else if (role === 'management') {
                        dashboardUrl = '../pages/employer_management_dashboard.html';
                    } else if (role === 'hr_recruitment') {
                        dashboardUrl = '../pages/employer_dashboard.html';
                    }
                }
                
                this.showAlert('Success', 'Login successful! Redirecting...', () => {
                    window.location.href = dashboardUrl;
                });
            } else {
                this.showAlert('Error', data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }

    async handleRegister() {
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const contactNumber = document.getElementById('registerContactNumber').value;
        const department = document.getElementById('registerDepartment').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const agreeTerms = document.getElementById('registerAgreeTerms').checked;

        // Validation
        if (!firstName || !lastName || !email || !contactNumber || !password || !confirmPassword) {
            this.showAlert('Error', 'Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (!agreeTerms) {
            this.showAlert('Error', 'Please agree to the Terms & Conditions');
            return;
        }

        const registrationData = {
            firstName,
            lastName,
            email,
            password,
            contactNumber,
            department
        };

        try {
            const response = await fetch(`${this.API_BASE}/employer/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (response.ok) {
                // Determine dashboard based on role
                let dashboardUrl = '../pages/employer_dashboard.html'; // Default (HR)
                
                if (data.user && data.user.EmployerProfile) {
                    const role = data.user.EmployerProfile.role;
                    
                    if (role === 'administrator') {
                        dashboardUrl = '../pages/employer_admin_dashboard.html';
                    } else if (role === 'management') {
                        dashboardUrl = '../pages/employer_management_dashboard.html';
                    } else if (role === 'hr_recruitment') {
                        dashboardUrl = '../pages/employer_dashboard.html';
                    }
                }
                
                this.showAlert('Success', 'Registration successful! Redirecting to dashboard...', () => {
                    window.location.href = dashboardUrl;
                });
            } else {
                this.showAlert('Error', data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }

    showAlert(title, message, callback) {
        const modal = document.getElementById('alertModal');
        const titleElement = document.getElementById('alertTitle');
        const messageElement = document.getElementById('alertMessage');

        titleElement.textContent = title;
        messageElement.textContent = message;
        modal.classList.add('show');

        if (callback) {
            window.alertCallback = callback;
        }
    }
}

function closeAlert() {
    const modal = document.getElementById('alertModal');
    modal.classList.remove('show');
    
    if (window.alertCallback) {
        window.alertCallback();
        window.alertCallback = null;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new EmployerAuth();
});
