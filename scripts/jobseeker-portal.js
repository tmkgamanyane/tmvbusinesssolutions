// Jobseeker Portal JavaScript - Complete functionality
class JobseekerPortal {
    constructor() {
        this.API_BASE = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : 'https://tmv-backend.onrender.com/api';
        this.currentUser = null;
        this.jobs = [];
        this.wishlist = [];
        this.currentPage = 1;
        this.jobsPerPage = 10;
        
        this.init();
    }
    
    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.loadJobs();
        this.updateUI();
    }
    
    // Authentication Methods
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/profile`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateAuthUI(true);
                await this.loadWishlist();
            } else {
                this.updateAuthUI(false);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.updateAuthUI(false);
        }
    }
    
    updateAuthUI(isLoggedIn) {
        const authStatus = document.getElementById('jobseekerAuthStatus');
        const loginTab = document.querySelector('[data-tab="login"]');
        const registerTab = document.querySelector('[data-tab="register"]');
        const profileTab = document.querySelector('[data-tab="profile"]');
        
        if (isLoggedIn && this.currentUser) {
            // Show auth status
            if (authStatus) {
                authStatus.innerHTML = `
                    <span>Welcome, ${this.currentUser.firstName}!</span>
                    <button class="jobseeker-logout-btn" onclick="jobseekerPortal.logout()">Logout</button>
                `;
                authStatus.className = 'jobseeker-auth-status logged-in';
            }
            
            // Update navigation
            if (loginTab) loginTab.style.display = 'none';
            if (registerTab) registerTab.style.display = 'none';
            if (profileTab) profileTab.style.display = 'inline-block';
            
            // Enable job applications
            this.enableJobApplications();
        } else {
            // Hide auth status
            if (authStatus) {
                authStatus.className = 'jobseeker-auth-status';
            }
            
            // Update navigation
            if (loginTab) loginTab.style.display = 'inline-block';
            if (registerTab) registerTab.style.display = 'inline-block';
            if (profileTab) profileTab.style.display = 'none';
            
            // Disable job applications
            this.disableJobApplications();
        }
    }
    
    async login(email, password) {
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.updateAuthUI(true);
                this.showAlert('Login successful! Welcome back.', 'success');
                this.showTab('browse');
                await this.loadWishlist();
                return true;
            } else {
                this.showAlert(data.message || 'Login failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Network error. Please try again.', 'error');
            return false;
        }
    }
    
    async register(formData) {
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.updateAuthUI(true);
                this.showAlert('Registration successful! Welcome to our platform.', 'success');
                this.showTab('browse');
                return true;
            } else {
                this.showAlert(data.message || 'Registration failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('Network error. Please try again.', 'error');
            return false;
        }
    }
    
    async logout() {
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            this.currentUser = null;
            this.wishlist = [];
            this.updateAuthUI(false);
            this.showAlert('Logged out successfully', 'info');
            this.showTab('browse');
            this.updateJobCards();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Job Management Methods
    async loadJobs() {
        try {
            const response = await fetch(`${this.API_BASE}/jobs`);
            if (response.ok) {
                const data = await response.json();
                this.jobs = data.jobs || this.getDummyJobs();
            } else {
                this.jobs = this.getDummyJobs();
            }
            this.renderJobs();
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.jobs = this.getDummyJobs();
            this.renderJobs();
        }
    }
    
    getDummyJobs() {
        return [
            {
                id: 1,
                title: 'Senior Software Developer',
                company: 'TechCorp Solutions',
                location: 'Johannesburg, GP',
                type: 'Full-time',
                salary: 'R45,000 - R65,000',
                description: 'We are looking for an experienced software developer to join our dynamic team. You will be responsible for developing high-quality applications.',
                industry: 'IT',
                requirements: ['5+ years experience', 'JavaScript', 'React', 'Node.js'],
                posted: '2 days ago'
            },
            {
                id: 2,
                title: 'Digital Marketing Specialist',
                company: 'Marketing Masters',
                location: 'Cape Town, WC',
                type: 'Full-time',
                salary: 'R25,000 - R35,000',
                description: 'Join our creative marketing team and help drive digital campaigns for leading brands.',
                industry: 'Marketing',
                requirements: ['3+ years experience', 'Google Ads', 'Facebook Marketing', 'Analytics'],
                posted: '1 day ago'
            },
            {
                id: 3,
                title: 'Financial Analyst',
                company: 'FinanceFirst',
                location: 'Pretoria, GP',
                type: 'Full-time',
                salary: 'R35,000 - R45,000',
                description: 'Analyze financial data and provide insights to support business decisions.',
                industry: 'Finance',
                requirements: ['BCom Accounting/Finance', 'Excel Advanced', '2+ years experience'],
                posted: '3 days ago'
            },
            {
                id: 4,
                title: 'Registered Nurse',
                company: 'HealthCare Plus',
                location: 'Durban, KZN',
                type: 'Full-time',
                salary: 'R28,000 - R38,000',
                description: 'Provide quality healthcare services in our modern medical facility.',
                industry: 'Healthcare',
                requirements: ['Nursing Degree', 'SANC Registration', 'Patient Care Experience'],
                posted: '1 week ago'
            },
            {
                id: 5,
                title: 'Sales Representative',
                company: 'SalesForce Pro',
                location: 'Remote',
                type: 'Remote',
                salary: 'R20,000 - R30,000 + Commission',
                description: 'Drive sales growth through relationship building and customer engagement.',
                industry: 'Sales',
                requirements: ['Sales Experience', 'Communication Skills', 'Own Vehicle'],
                posted: '4 days ago'
            },
            {
                id: 6,
                title: 'Elementary School Teacher',
                company: 'Bright Future Academy',
                location: 'East London, EC',
                type: 'Full-time',
                salary: 'R22,000 - R32,000',
                description: 'Inspire young minds and contribute to quality education in our school.',
                industry: 'Education',
                requirements: ['Teaching Degree', 'SACE Registration', 'Classroom Management'],
                posted: '5 days ago'
            }
        ];
    }
    
    renderJobs() {
        const jobListings = document.getElementById('jobListings');
        if (!jobListings) return;
        
        const filteredJobs = this.getFilteredJobs();
        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = filteredJobs.slice(startIndex, endIndex);
        
        if (jobsToShow.length === 0) {
            jobListings.innerHTML = `
                <div class="jobseeker-empty-state">
                    <h3>No jobs found</h3>
                    <p>Try adjusting your search criteria or check back later for new opportunities.</p>
                </div>
            `;
            return;
        }
        
        jobListings.innerHTML = jobsToShow.map(job => this.createJobCard(job)).join('');
        this.updatePagination(filteredJobs.length);
    }
    
    createJobCard(job) {
        const isWishlisted = this.wishlist.includes(job.id);
        const canApply = this.currentUser ? '' : 'disabled';
        const applyText = this.currentUser ? 'Apply Now' : 'Login to Apply';
        
        return `
            <div class="jobseeker-job-card" data-job-id="${job.id}">
                <h3 class="jobseeker-job-title">${job.title}</h3>
                <div class="jobseeker-job-company">${job.company}</div>
                <div class="jobseeker-job-location">📍 ${job.location}</div>
                <span class="jobseeker-job-type">${job.type}</span>
                <div class="jobseeker-job-salary">💰 ${job.salary}</div>
                <div class="jobseeker-job-description">${job.description}</div>
                <div class="jobseeker-job-requirements">
                    <strong>Requirements:</strong> ${job.requirements.join(', ')}
                </div>
                <div class="jobseeker-job-posted">Posted: ${job.posted}</div>
                <div class="jobseeker-job-actions">
                    <button class="jobseeker-apply-btn" ${canApply} onclick="jobseekerPortal.applyForJob(${job.id})">
                        ${applyText}
                    </button>
                    <button class="jobseeker-wishlist-btn ${isWishlisted ? 'liked' : ''}" 
                            onclick="jobseekerPortal.toggleWishlist(${job.id})"
                            ${!this.currentUser ? 'disabled' : ''}>
                        <span class="heart">${isWishlisted ? '❤️' : '🤍'}</span>
                        ${isWishlisted ? 'Saved' : 'Save'}
                    </button>
                </div>
            </div>
        `;
    }
    
    getFilteredJobs() {
        const industryFilter = document.getElementById('jobIndustryFilter')?.value || '';
        const typeFilter = document.getElementById('jobTypeFilter')?.value || '';
        const searchTerm = document.getElementById('jobSearch')?.value.toLowerCase() || '';
        
        return this.jobs.filter(job => {
            const matchesIndustry = !industryFilter || job.industry === industryFilter;
            const matchesType = !typeFilter || job.type === typeFilter;
            const matchesSearch = !searchTerm || 
                job.title.toLowerCase().includes(searchTerm) ||
                job.company.toLowerCase().includes(searchTerm) ||
                job.description.toLowerCase().includes(searchTerm);
            
            return matchesIndustry && matchesType && matchesSearch;
        });
    }
    
    updatePagination(totalJobs) {
        const pagination = document.getElementById('jobPagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(totalJobs / this.jobsPerPage);
        let paginationHTML = '';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="jobseeker-page-btn" onclick="jobseekerPortal.goToPage(${this.currentPage - 1})">← Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="jobseeker-page-btn active">${i}</button>`;
            } else if (i <= 3 || i > totalPages - 3 || Math.abs(i - this.currentPage) <= 1) {
                paginationHTML += `<button class="jobseeker-page-btn" onclick="jobseekerPortal.goToPage(${i})">${i}</button>`;
            } else if (i === 4 || i === totalPages - 3) {
                paginationHTML += `<span class="jobseeker-page-btn">...</span>`;
            }
        }
        
        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="jobseeker-page-btn" onclick="jobseekerPortal.goToPage(${this.currentPage + 1})">Next →</button>`;
        }
        
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderJobs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Job Application Methods
    async applyForJob(jobId) {
        if (!this.currentUser) {
            this.showAlert('Please login to apply for jobs', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ jobId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showAlert('Application submitted successfully!', 'success');
                this.updateJobCardAfterApplication(jobId);
            } else {
                this.showAlert(data.message || 'Application failed', 'error');
            }
        } catch (error) {
            console.error('Application error:', error);
            this.showAlert('Network error. Please try again.', 'error');
        }
    }
    
    updateJobCardAfterApplication(jobId) {
        const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
        if (jobCard) {
            const applyBtn = jobCard.querySelector('.jobseeker-apply-btn');
            if (applyBtn) {
                applyBtn.textContent = 'Applied ✓';
                applyBtn.disabled = true;
                applyBtn.style.background = '#27ae60';
            }
        }
    }
    
    // Wishlist Methods
    async loadWishlist() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/wishlist`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.wishlist = data.wishlist || [];
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }
    
    async toggleWishlist(jobId) {
        if (!this.currentUser) {
            this.showAlert('Please login to save jobs', 'error');
            return;
        }
        
        try {
            const isWishlisted = this.wishlist.includes(jobId);
            const method = isWishlisted ? 'DELETE' : 'POST';
            
            const response = await fetch(`${this.API_BASE}/jobseeker/wishlist`, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ jobId })
            });
            
            if (response.ok) {
                if (isWishlisted) {
                    this.wishlist = this.wishlist.filter(id => id !== jobId);
                    this.showAlert('Job removed from wishlist', 'info');
                } else {
                    this.wishlist.push(jobId);
                    this.showAlert('Job saved to wishlist', 'success');
                }
                this.updateJobCards();
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            this.showAlert('Error updating wishlist', 'error');
        }
    }
    
    updateJobCards() {
        const jobCards = document.querySelectorAll('.jobseeker-job-card');
        jobCards.forEach(card => {
            const jobId = parseInt(card.getAttribute('data-job-id'));
            const wishlistBtn = card.querySelector('.jobseeker-wishlist-btn');
            const applyBtn = card.querySelector('.jobseeker-apply-btn');
            
            if (wishlistBtn) {
                const isWishlisted = this.wishlist.includes(jobId);
                wishlistBtn.className = `jobseeker-wishlist-btn ${isWishlisted ? 'liked' : ''}`;
                wishlistBtn.innerHTML = `
                    <span class="heart">${isWishlisted ? '❤️' : '🤍'}</span>
                    ${isWishlisted ? 'Saved' : 'Save'}
                `;
                wishlistBtn.disabled = !this.currentUser;
            }
            
            if (applyBtn) {
                if (this.currentUser) {
                    applyBtn.disabled = false;
                    applyBtn.textContent = 'Apply Now';
                } else {
                    applyBtn.disabled = true;
                    applyBtn.textContent = 'Login to Apply';
                }
            }
        });
    }
    
    enableJobApplications() {
        const applyButtons = document.querySelectorAll('.jobseeker-apply-btn');
        applyButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = 'Apply Now';
        });
        
        const wishlistButtons = document.querySelectorAll('.jobseeker-wishlist-btn');
        wishlistButtons.forEach(btn => {
            btn.disabled = false;
        });
    }
    
    disableJobApplications() {
        const applyButtons = document.querySelectorAll('.jobseeker-apply-btn');
        applyButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Login to Apply';
        });
        
        const wishlistButtons = document.querySelectorAll('.jobseeker-wishlist-btn');
        wishlistButtons.forEach(btn => {
            btn.disabled = true;
        });
    }
    
    // UI Helper Methods
    showTab(tabName) {
        // Hide all content sections
        const contents = document.querySelectorAll('.jobseeker-content');
        contents.forEach(content => content.classList.remove('active'));
        
        // Remove active class from all nav buttons
        const navButtons = document.querySelectorAll('.jobseeker-nav-button');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show selected content and activate button
        const selectedContent = document.getElementById(tabName);
        const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (selectedContent) selectedContent.classList.add('active');
        if (selectedButton) selectedButton.classList.add('active');
    }
    
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('jobseekerAlert');
        if (!alertContainer) {
            // Create alert container if it doesn't exist
            const alert = document.createElement('div');
            alert.id = 'jobseekerAlert';
            alert.className = `jobseeker-alert ${type}`;
            alert.textContent = message;
            
            const container = document.querySelector('.jobseeker-portal-container');
            if (container) {
                container.insertBefore(alert, container.firstChild);
            }
        } else {
            alertContainer.className = `jobseeker-alert ${type}`;
            alertContainer.textContent = message;
            alertContainer.style.display = 'block';
        }
        
        // Auto-hide alert after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById('jobseekerAlert');
            if (alert) {
                alert.style.display = 'none';
            }
        }, 5000);
    }
    
    setupEventListeners() {
        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.jobseeker-nav-button')) {
                const tab = e.target.getAttribute('data-tab');
                if (tab) {
                    this.showTab(tab);
                }
            }
        });
        
        // Login form
        const loginForm = document.getElementById('jobseekerLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('jobseekerEmail').value;
                const password = document.getElementById('jobseekerPassword').value;
                await this.login(email, password);
            });
        }
        
        // Register form
        const registerForm = document.getElementById('jobseekerRegisterForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = this.getRegistrationFormData();
                if (this.validateRegistrationForm(formData)) {
                    await this.register(formData);
                }
            });
        }
        
        // Search and filter listeners
        const searchInput = document.getElementById('jobSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.currentPage = 1;
                this.renderJobs();
            });
        }
        
        const industryFilter = document.getElementById('jobIndustryFilter');
        if (industryFilter) {
            industryFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.renderJobs();
            });
        }
        
        const typeFilter = document.getElementById('jobTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.renderJobs();
            });
        }
    }
    
    getRegistrationFormData() {
        return {
            title: document.getElementById('jsTitle')?.value || '',
            firstName: document.getElementById('jsFirstName')?.value || '',
            lastName: document.getElementById('jsLastName')?.value || '',
            email: document.getElementById('jsEmail')?.value || '',
            password: document.getElementById('jsPassword')?.value || '',
            confirmPassword: document.getElementById('jsConfirmPassword')?.value || '',
            phone: document.getElementById('jsPhone')?.value || '',
            idNumber: document.getElementById('jsIdNumber')?.value || '',
            industry: document.getElementById('jsIndustry')?.value || '',
            agreeTerms: document.getElementById('jsAgreeTerms')?.checked || false,
            jobUpdates: document.getElementById('jsJobUpdates')?.checked || false
        };
    }
    
    validateRegistrationForm(data) {
        if (!data.title || !data.firstName || !data.lastName || !data.email || !data.password) {
            this.showAlert('Please fill in all required fields', 'error');
            return false;
        }
        
        if (data.password !== data.confirmPassword) {
            this.showAlert('Passwords do not match', 'error');
            return false;
        }
        
        if (data.password.length < 6) {
            this.showAlert('Password must be at least 6 characters', 'error');
            return false;
        }
        
        if (!data.agreeTerms) {
            this.showAlert('You must agree to the terms and conditions', 'error');
            return false;
        }
        
        return true;
    }
    
    updateUI() {
        // Update statistics
        this.updateStatistics();
    }
    
    updateStatistics() {
        const jobCount = document.querySelector('.jobseeker-stat-number');
        if (jobCount) {
            jobCount.textContent = this.jobs.length.toLocaleString();
        }
    }
}

// Initialize the jobseeker portal when DOM is loaded
let jobseekerPortal;

document.addEventListener('DOMContentLoaded', function() {
    jobseekerPortal = new JobseekerPortal();
});

// Global functions for onclick handlers
function toggleJobseekerPassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    
    if (field.type === 'password') {
        field.type = 'text';
        button.textContent = '👁‍🗨';
    } else {
        field.type = 'password';
        button.textContent = '👁';
    }
}