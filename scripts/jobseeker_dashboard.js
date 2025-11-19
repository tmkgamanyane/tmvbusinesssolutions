// Jobseeker Dashboard JavaScript
class JobseekerDashboard {
    constructor() {
        this.API_BASE = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : 'https://tmv-backend.onrender.com/api';
        this.currentUser = null;
        this.profileData = {};
        this.documents = [];
        this.qualifications = [];
        this.isEditing = true;
        this.allJobs = [];
        this.likedJobs = [];
        
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.setupEventListeners();
        // Always load jobs in public section
        this.loadPublicJobs();
    }
    
    // Check if user is already logged in
    checkAuth() {
        const savedUser = localStorage.getItem('jobseeker_user');
        const rememberMe = localStorage.getItem('jobseeker_remember');
        
        if (savedUser && rememberMe === 'true') {
            this.currentUser = JSON.parse(savedUser);
            this.showDashboard();
            this.loadProfile();
        } else {
            // Show public jobs section for non-logged-in users
            this.showPublicJobs();
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Form toggles
        document.getElementById('showRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });
        
        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });
        
        // Form submissions
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('registerFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Profile actions
        document.getElementById('saveProfile')?.addEventListener('click', () => {
            this.saveProfile();
        });
        
        document.getElementById('editProfile')?.addEventListener('click', () => {
            this.enableEditing();
        });
        
        document.getElementById('deleteProfile')?.addEventListener('click', () => {
            this.deleteProfile();
        });
        
        // Edit Profile Button (from profile view)
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.showEditProfile();
        });
        
        // Qualifications
        document.getElementById('addQualification')?.addEventListener('click', () => {
            this.addQualification();
        });
        
        // Experience
        document.getElementById('addExperience')?.addEventListener('click', () => {
            this.addExperience();
        });
        
        // Skills - add button instead of Enter key
        document.getElementById('addSkillBtn')?.addEventListener('click', () => {
            const input = document.getElementById('skillsInput');
            const skill = input.value.trim();
            if (skill) {
                this.addSkillBadge(skill);
                input.value = '';
            }
        });
        
        // Also allow Enter key for skills
        document.getElementById('skillsInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target;
                const skill = input.value.trim();
                if (skill) {
                    this.addSkillBadge(skill);
                    input.value = '';
                }
            }
        });
        
        // File uploads
        document.getElementById('fullPicture')?.addEventListener('change', (e) => {
            this.handleImagePreview(e, 'fullPicturePreview');
        });
        
        document.getElementById('halfPicture')?.addEventListener('change', (e) => {
            this.handleImagePreview(e, 'halfPicturePreview');
        });
        
        document.getElementById('cvUpload')?.addEventListener('change', (e) => {
            this.handleDocumentUpload(e, 'CV');
        });
        
        document.getElementById('coverLetterUpload')?.addEventListener('change', (e) => {
            this.handleDocumentUpload(e, 'Cover Letter');
        });
        
        document.getElementById('idCopyUpload')?.addEventListener('change', (e) => {
            this.handleDocumentUpload(e, 'ID Copy');
        });
        
        document.getElementById('qualificationDocsUpload')?.addEventListener('change', (e) => {
            this.handleDocumentUpload(e, 'Qualification Document');
        });
        
        // Browse Jobs
        document.getElementById('browseJobsBtn')?.addEventListener('click', () => {
            this.showBrowseJobs();
        });
        
        document.getElementById('backToDashboard')?.addEventListener('click', () => {
            this.hideBrowseJobs();
        });
        
        // Job Filters
        document.getElementById('jobSearchInput')?.addEventListener('input', () => {
            this.filterJobs();
        });
        
        document.getElementById('jobIndustryFilter')?.addEventListener('change', () => {
            this.filterJobs();
        });
        
        document.getElementById('jobTypeFilter')?.addEventListener('change', () => {
            this.filterJobs();
        });

        // Search Jobs Button
        document.getElementById('searchJobsBtn')?.addEventListener('click', () => {
            this.filterJobs();
        });

        // Clear Filters Button
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Modal close
        document.getElementById('alertClose')?.addEventListener('click', () => {
            this.hideModal();
        });
    }
    
    // Show/Hide views
    showPublicJobs() {
        // Show public jobs section, hide auth forms and dashboard
        const publicSection = document.getElementById('browseJobsPublic');
        const mainContainer = document.getElementById('mainContainer');
        const headerUserInfo = document.getElementById('headerUserInfo');
        const guestActions = document.getElementById('guestActionsTop');
        
        if (publicSection) publicSection.style.display = 'block';
        if (mainContainer) mainContainer.style.display = 'none';
        
        // If user is logged in, keep header info visible
        if (this.currentUser) {
            if (headerUserInfo) headerUserInfo.style.display = 'flex';
            if (guestActions) guestActions.style.display = 'none';
        } else {
            if (headerUserInfo) headerUserInfo.style.display = 'none';
            if (guestActions) guestActions.style.display = 'flex';
        }
        
        // Reload jobs to get latest
        this.loadPublicJobs();
    }
    
    showJobBrowsing() {
        // Show jobs for non-logged-in users
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('browseJobsSection').style.display = 'block';
        document.getElementById('headerUserInfo').style.display = 'none';
        
        // Add login/register buttons in header
        const header = document.querySelector('.jobseeker-dashboard-header');
        if (header && !document.getElementById('guestActions')) {
            const guestActions = document.createElement('div');
            guestActions.id = 'guestActions';
            guestActions.style.cssText = 'display: flex; gap: 10px;';
            guestActions.innerHTML = `
                <button class="jobseeker-dashboard-btn jobseeker-dashboard-btn-secondary" onclick="jobseekerDashboard.showLogin()">Login</button>
                <button class="jobseeker-dashboard-btn jobseeker-dashboard-btn-primary" onclick="jobseekerDashboard.showRegister()">Register</button>
            `;
            header.appendChild(guestActions);
        }
    }
    
    showLogin() {
        const publicSection = document.getElementById('browseJobsPublic');
        const mainContainer = document.getElementById('mainContainer');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const dashboard = document.getElementById('dashboard');
        
        if (publicSection) publicSection.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (dashboard) dashboard.style.display = 'none';
        
        const headerUserInfo = document.getElementById('headerUserInfo');
        if (headerUserInfo) headerUserInfo.style.display = 'none';
        
        const guestActions = document.getElementById('guestActionsTop');
        if (guestActions) guestActions.style.display = 'none';
    }
    
    showRegister() {
        const publicSection = document.getElementById('browseJobsPublic');
        const mainContainer = document.getElementById('mainContainer');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const dashboard = document.getElementById('dashboard');
        
        if (publicSection) publicSection.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (dashboard) dashboard.style.display = 'none';
        
        const headerUserInfo = document.getElementById('headerUserInfo');
        if (headerUserInfo) headerUserInfo.style.display = 'none';
        
        const guestActions = document.getElementById('guestActionsTop');
        if (guestActions) guestActions.style.display = 'none';
    }
    
    showDashboard() {
        const publicSection = document.getElementById('browseJobsPublic');
        const mainContainer = document.getElementById('mainContainer');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const dashboard = document.getElementById('dashboard');
        
        if (publicSection) publicSection.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        
        const headerUserInfo = document.getElementById('headerUserInfo');
        if (headerUserInfo) headerUserInfo.style.display = 'flex';
        
        const guestActions = document.getElementById('guestActionsTop');
        if (guestActions) guestActions.style.display = 'none';
        
        if (this.currentUser) {
            const displayName = this.currentUser.name || 
                                `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim();
            document.getElementById('userWelcome').textContent = 
                `Welcome, ${displayName || 'Jobseeker'}`;
            this.loadWishlist(); // Load saved jobs
        }
    }
    
    // Handle login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
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
                
                if (rememberMe) {
                    localStorage.setItem('jobseeker_user', JSON.stringify(this.currentUser));
                    localStorage.setItem('jobseeker_remember', 'true');
                }
                
                this.showAlert('Success', 'Login successful! Welcome back.');
                this.showDashboard();
                this.loadProfile();
                
                // Check if there was a pending job application
                const pendingApp = localStorage.getItem('pendingJobApplication');
                if (pendingApp) {
                    const { jobId, jobTitle, company } = JSON.parse(pendingApp);
                    localStorage.removeItem('pendingJobApplication');
                    setTimeout(() => {
                        if (confirm(`Would you like to continue applying for "${jobTitle}" at ${company}?`)) {
                            this.applyForJob(jobId, jobTitle, company);
                        }
                    }, 500);
                }
            } else {
                this.showAlert('Error', data.message || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }
    
    // Handle registration
    async handleRegister() {
        const name = document.getElementById('regName').value;
        const surname = document.getElementById('regSurname').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showAlert('Error', 'Passwords do not match!');
            return;
        }
        
        // Validate password strength
        if (password.length < 8) {
            this.showAlert('Error', 'Password must be at least 8 characters long!');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    firstName: name,
                    lastName: surname,
                    email,
                    password,
                    confirmPassword
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.showAlert('Success', 'Registration successful! Please complete your profile.');
                this.showDashboard();
                this.initializeProfile();
                this.showFormSections(); // Explicitly show form for new users
            } else {
                this.showAlert('Error', data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('Error', 'An error occurred. Please try again.');
        }
    }
    
    // Handle logout
    handleLogout() {
        localStorage.removeItem('jobseeker_user');
        localStorage.removeItem('jobseeker_remember');
        this.currentUser = null;
        this.profileData = {};
        this.documents = [];
        this.qualifications = [];
        
        fetch(`${this.API_BASE}/jobseeker/logout`, {
            method: 'POST',
            credentials: 'include'
        }).catch(console.error);
        
        this.showLogin();
        document.getElementById('loginFormElement').reset();
    }
    
    // Initialize profile with user data
    initializeProfile() {
        if (this.currentUser) {
            document.getElementById('fullName').value = 
                `${this.currentUser.name} ${this.currentUser.surname}`;
            document.getElementById('email').value = this.currentUser.email;
        }
        this.addQualification(); // Add first qualification row
    }
    
    // Load profile from server
    async loadProfile() {
        try {
            console.log('🔍 Loading jobseeker profile...');
            const response = await fetch(`${this.API_BASE}/jobseeker/profile`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Profile data received:', data);
                console.log('📊 Profile object:', data.profile);
                console.log('📊 Profile has ID?', data.profile?.id);
                console.log('📊 Profile idNumber:', data.profile?.idNumber);
                console.log('📊 Profile cellNumber:', data.profile?.cellNumber);
                
                // Check if profile exists in database (not null)
                if (data.profile && data.profile.id) {
                    // Profile exists in database - user has saved before
                    this.profileData = data.profile;
                    console.log('✅ Profile data stored in this.profileData:', this.profileData);
                    console.log('📊 ID Number:', this.profileData.idNumber);
                    console.log('📊 Cell Number:', this.profileData.cellNumber);
                    this.populateProfile();
                    
                    console.log('✅ Existing profile found - showing profile view');
                    // Returning user with saved profile - show read-only profile view
                    this.hideFormSections();
                    this.displayProfileView(); // Show the new profile tab
                    this.loadMyApplications();
                    this.showBrowseJobs();
                } else {
                    // No profile in database yet - first time user
                    console.log('📝 No profile found - showing form for first-time setup');
                    this.profileData = {};
                    this.initializeProfile();
                    this.showFormSections();
                }
            } else {
                // Error response, show form sections
                console.log('⚠️ Error loading profile - showing form');
                this.initializeProfile();
                this.showFormSections();
            }
        } catch (error) {
            console.error('❌ Load profile error:', error);
            this.initializeProfile();
            this.showFormSections();
        }
    }
    
    // Populate profile fields
    populateProfile() {
        if (this.currentUser) {
            document.getElementById('fullName').value = 
                `${this.currentUser.name} ${this.currentUser.surname}`;
            document.getElementById('email').value = this.currentUser.email;
        }
        
        if (this.profileData) {
            document.getElementById('gender').value = this.profileData.gender || '';
            document.getElementById('idNumber').value = this.profileData.idNumber || '';
            document.getElementById('cellNumber').value = this.profileData.cellNumber || '';
            document.getElementById('province').value = this.profileData.province || '';
            document.getElementById('town').value = this.profileData.town || '';
            document.getElementById('suburb').value = this.profileData.suburb || '';
            
            // Populate new fields
            document.getElementById('race').value = this.profileData.race || '';
            document.getElementById('language').value = this.profileData.language || '';
            document.getElementById('driversLicense').value = this.profileData.driversLicense || '';
            document.getElementById('transport').value = this.profileData.transport || '';
            
            // Populate skills
            const skillsContainer = document.getElementById('skillsContainer');
            skillsContainer.innerHTML = '';
            if (this.profileData.skills && this.profileData.skills.length > 0) {
                this.profileData.skills.forEach(skill => {
                    this.addSkillBadge(skill);
                });
            }
            
            // Populate experiences
            if (this.profileData.experiences && this.profileData.experiences.length > 0) {
                this.renderExperiences(this.profileData.experiences);
            } else {
                this.addExperience(); // Add one empty experience form
            }
            
            // Load qualifications
            if (this.profileData.qualifications && this.profileData.qualifications.length > 0) {
                this.qualifications = this.profileData.qualifications;
                this.renderQualifications();
            } else {
                this.addQualification();
            }
            
            // Load documents
            if (this.profileData.documents && this.profileData.documents.length > 0) {
                this.documents = this.profileData.documents;
                this.renderDocuments();
            }
        }
        
        this.disableEditing();
    }
    
    // Save profile
    async saveProfile() {
        // Get the base64 images from preview divs
        const fullPicturePreview = document.getElementById('fullPicturePreview');
        const halfPicturePreview = document.getElementById('halfPicturePreview');
        
        const fullPictureImg = fullPicturePreview.querySelector('img');
        const halfPictureImg = halfPicturePreview.querySelector('img');
        
        const gender = document.getElementById('gender').value;
        
        // Collect skills array
        const skillsArray = Array.from(document.getElementById('skillsContainer').children)
            .map(badge => badge.textContent.replace('×', '').trim())
            .filter(Boolean);
        
        // Collect experiences array
        const experiencesArray = this.collectExperiences();
        
        const profileData = {
            gender: gender || null,
            idNumber: document.getElementById('idNumber').value || null,
            cellNumber: document.getElementById('cellNumber').value || null,
            province: document.getElementById('province').value || null,
            town: document.getElementById('town').value || null,
            suburb: document.getElementById('suburb').value || null,
            fullPicture: fullPictureImg ? fullPictureImg.src : null,
            halfPicture: halfPictureImg ? halfPictureImg.src : null,
            qualifications: this.collectQualifications(),
            documents: this.documents,
            // New fields
            skills: skillsArray,
            race: document.getElementById('race').value || null,
            language: document.getElementById('language').value || null,
            transport: document.getElementById('transport').value || null,
            driversLicense: document.getElementById('driversLicense').value || null,
            // Store experiences as JSON
            experiences: experiencesArray
        };
        
        console.log('Saving profile data:', profileData); // Debug log
        
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            console.log('Server response:', data); // Debug log
            
            if (response.ok) {
                this.showAlert('Success', 'Profile saved successfully!');
                this.disableEditing();
                this.profileData = data.profile; // Save to local state
                console.log('✅ Profile data updated in this.profileData:', this.profileData);
                
                // Hide all form sections and show profile view
                this.hideFormSections();
                this.displayProfileView(); // Show the profile tab instead
                this.loadMyApplications();
                this.showBrowseJobs();
            } else {
                console.error('Server error:', data); // Debug log
                this.showAlert('Error', data.message || 'Failed to save profile.');
            }
        } catch (error) {
            console.error('Save profile error:', error);
            this.showAlert('Error', 'An error occurred while saving: ' + error.message);
        }
    }

    // Hide all form sections (called after save)
    hideFormSections() {
        // Hide all profile editing sections
        const sectionsToHide = [
            'Personal Details',
            'Profile Pictures',
            'Contact Details',
            'Qualifications',
            'Documentation',
            'Demographics',
            'My Skills',
            'Language',
            'Transport',
            'Experience'
        ];

        // Hide sections by finding their titles
        const allSections = document.querySelectorAll('.jobseeker-dashboard-section');
        allSections.forEach(section => {
            const title = section.querySelector('.jobseeker-dashboard-section-title');
            if (title && sectionsToHide.some(hideTitle => title.textContent.includes(hideTitle))) {
                section.style.display = 'none';
            }
        });

        // Hide action buttons
        const actionsDiv = document.querySelector('.jobseeker-dashboard-actions');
        if (actionsDiv) {
            actionsDiv.style.display = 'none';
        }
    }

    // Show form sections (called when edit is clicked)
    showFormSections() {
        // Show all profile editing sections
        const allSections = document.querySelectorAll('.jobseeker-dashboard-section');
        allSections.forEach(section => {
            const title = section.querySelector('.jobseeker-dashboard-section-title');
            // Show all sections except summary, applications, and browse jobs
            if (title && 
                !title.textContent.includes('Your Profile Summary') && 
                !title.textContent.includes('My Job Applications') &&
                !title.textContent.includes('Browse Available Jobs')) {
                section.style.display = 'block';
            }
        });

        // Show action buttons
        const actionsDiv = document.querySelector('.jobseeker-dashboard-actions');
        if (actionsDiv) {
            actionsDiv.style.display = 'flex';
        }

        // Hide summary, applications, and jobs sections
        const profileSummary = document.getElementById('profileSummary');
        const myApplicationsSection = document.getElementById('myApplicationsSection');
        const browseJobsSection = document.getElementById('browseJobsSection');
        
        if (profileSummary) profileSummary.style.display = 'none';
        if (myApplicationsSection) myApplicationsSection.style.display = 'none';
        if (browseJobsSection) browseJobsSection.style.display = 'none';
    }
    
    // Enable editing
    enableEditing() {
        this.isEditing = true;
        
        // Show all form sections again
        this.showFormSections();
        
        // Enable all input fields
        const inputs = document.querySelectorAll('.jobseeker-dashboard-input:not([readonly])');
        inputs.forEach(input => {
            input.disabled = false;
        });
        
        this.showAlert('Info', 'Edit mode enabled. Make your changes and click Save.');
    }
    
    // Disable editing
    disableEditing() {
        this.isEditing = false;
        const inputs = document.querySelectorAll('.jobseeker-dashboard-input:not([readonly])');
        inputs.forEach(input => {
            if (input.id !== 'fullName' && input.id !== 'email') {
                input.disabled = false; // Keep fields editable
            }
        });
    }
    
    // Delete profile
    async deleteProfile() {
        if (!confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/profile`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showAlert('Success', 'Profile deleted successfully.');
                setTimeout(() => {
                    this.handleLogout();
                }, 2000);
            } else {
                const data = await response.json();
                this.showAlert('Error', data.message || 'Failed to delete profile.');
            }
        } catch (error) {
            console.error('Delete profile error:', error);
            this.showAlert('Error', 'An error occurred while deleting.');
        }
    }
    
    // Qualifications management
    addQualification() {
        const container = document.querySelector('.jobseeker-dashboard-qualifications-container');
        const template = document.getElementById('qualificationTemplate');
        const clone = template.cloneNode(true);
        clone.id = '';
        clone.style.display = 'block';
        
        // Add remove handler
        const removeBtn = clone.querySelector('.jobseeker-dashboard-remove-qualification');
        removeBtn.addEventListener('click', () => {
            clone.remove();
        });
        
        container.appendChild(clone);
    }
    
    collectQualifications() {
        const qualifications = [];
        const items = document.querySelectorAll('.jobseeker-dashboard-qualification-item:not(#qualificationTemplate)');
        
        items.forEach(item => {
            const level = item.querySelector('.qualification-level').value;
            const institute = item.querySelector('.qualification-institute').value;
            const date = item.querySelector('.qualification-date').value;
            
            if (level && institute) {
                qualifications.push({ level, institute, dateCompleted: date });
            }
        });
        
        return qualifications;
    }
    
    renderQualifications() {
        const container = document.querySelector('.jobseeker-dashboard-qualifications-container');
        
        // Remove all qualification items EXCEPT the template
        const items = container.querySelectorAll('.jobseeker-dashboard-qualification-item:not(#qualificationTemplate)');
        items.forEach(item => item.remove());
        
        this.qualifications.forEach(qual => {
            const template = document.getElementById('qualificationTemplate');
            const clone = template.cloneNode(true);
            clone.id = '';
            clone.style.display = 'block';
            
            clone.querySelector('.qualification-level').value = qual.level;
            clone.querySelector('.qualification-institute').value = qual.institute;
            clone.querySelector('.qualification-date').value = qual.dateCompleted;
            
            const removeBtn = clone.querySelector('.jobseeker-dashboard-remove-qualification');
            removeBtn.addEventListener('click', () => {
                clone.remove();
            });
            
            container.appendChild(clone);
        });
    }
    
    // Experience management
    addExperience() {
        const container = document.querySelector('.jobseeker-dashboard-experiences-container');
        const template = document.getElementById('experienceTemplate');
        const clone = template.cloneNode(true);
        clone.id = '';
        clone.style.display = 'block';
        
        // Add remove handler
        const removeBtn = clone.querySelector('.jobseeker-dashboard-remove-experience');
        removeBtn.addEventListener('click', () => {
            clone.remove();
        });
        
        container.appendChild(clone);
    }
    
    collectExperiences() {
        const experiences = [];
        const items = document.querySelectorAll('.jobseeker-dashboard-experience-item:not(#experienceTemplate)');
        
        items.forEach(item => {
            const jobTitle = item.querySelector('.experience-jobtitle').value;
            const company = item.querySelector('.experience-company').value;
            const startDate = item.querySelector('.experience-startdate').value;
            const endDate = item.querySelector('.experience-enddate').value;
            
            if (jobTitle && company) {
                experiences.push({
                    jobTitle,
                    company,
                    startDate,
                    endDate: endDate || 'Current'
                });
            }
        });
        
        return experiences;
    }
    
    renderExperiences(experiences) {
        const container = document.querySelector('.jobseeker-dashboard-experiences-container');
        
        // Remove all experience items EXCEPT the template
        const items = container.querySelectorAll('.jobseeker-dashboard-experience-item:not(#experienceTemplate)');
        items.forEach(item => item.remove());
        
        if (!experiences || experiences.length === 0) {
            this.addExperience(); // Add one empty experience form
            return;
        }
        
        experiences.forEach(exp => {
            const template = document.getElementById('experienceTemplate');
            const clone = template.cloneNode(true);
            clone.id = '';
            clone.style.display = 'block';
            
            clone.querySelector('.experience-jobtitle').value = exp.jobTitle || '';
            clone.querySelector('.experience-company').value = exp.company || '';
            clone.querySelector('.experience-startdate').value = exp.startDate || '';
            clone.querySelector('.experience-enddate').value = (exp.endDate && exp.endDate !== 'Current') ? exp.endDate : '';
            
            const removeBtn = clone.querySelector('.jobseeker-dashboard-remove-experience');
            removeBtn.addEventListener('click', () => {
                clone.remove();
            });
            
            container.appendChild(clone);
        });
    }
    
    // Skills management
    addSkillBadge(skill) {
        const container = document.getElementById('skillsContainer');
        const badge = document.createElement('span');
        badge.style.cssText = 'background: #e3f2fd; color: #1976d2; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; border: 1px solid #90caf9; display: inline-flex; align-items: center; gap: 8px; cursor: default;';
        badge.innerHTML = `
            ${skill}
            <span onclick="this.parentElement.remove()" style="cursor: pointer; font-weight: bold; color: #1565c0;">×</span>
        `;
        container.appendChild(badge);
    }
    
    // Image preview
    handleImagePreview(event, previewId) {
        const file = event.target.files[0];
        const preview = document.getElementById(previewId);
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Document upload
    async handleDocumentUpload(event, docType) {
        const files = event.target.files;
        
        if (!files || files.length === 0) return;
        
        // Convert file to base64
        for (const file of Array.from(files)) {
            try {
                const base64 = await this.fileToBase64(file);
                const doc = {
                    id: Date.now() + Math.random(),
                    type: docType,
                    fileName: file.name,
                    uploadDate: new Date().toLocaleDateString(),
                    data: base64  // Store base64 data instead of file object
                };
                
                this.documents.push(doc);
            } catch (error) {
                console.error('Error reading file:', error);
                this.showAlert('Error', `Failed to upload ${file.name}`);
            }
        }
        
        this.renderDocuments();
        event.target.value = ''; // Clear input
    }
    
    // Helper to convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // Render documents table
    renderDocuments() {
        const tbody = document.getElementById('documentsTableBody');
        
        if (this.documents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="jobseeker-dashboard-no-data">No documents uploaded yet</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.documents.forEach(doc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.type}</td>
                <td>${doc.fileName}</td>
                <td>${doc.uploadDate}</td>
                <td>
                    <button class="jobseeker-dashboard-btn jobseeker-dashboard-btn-danger jobseeker-dashboard-table-btn" 
                            onclick="jobseekerDashboard.deleteDocument(${doc.id})">
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Delete document
    deleteDocument(docId) {
        if (confirm('Are you sure you want to delete this document?')) {
            this.documents = this.documents.filter(doc => doc.id !== docId);
            this.renderDocuments();
        }
    }
    
    // Alert modal
    showAlert(title, message) {
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        document.getElementById('alertModal').style.display = 'flex';
    }
    
    hideModal() {
        document.getElementById('alertModal').style.display = 'none';
    }
    
    // === PUBLIC JOBS FUNCTIONALITY ===
    
    async loadPublicJobs() {
        try {
            console.log('🔍 Loading public jobs from API...');
            console.log('API URL:', `${this.API_BASE}/jobs`);
            
            const response = await fetch(`${this.API_BASE}/jobs`);
            console.log('Response status:', response.status);
            
            const data = await response.json();
            console.log('📊 Jobs data received:', data);
            
            // Handle both {jobs: []} and direct array responses
            this.allJobs = data.jobs || data || [];
            console.log(`✅ Total jobs loaded: ${this.allJobs.length}`);
            
            if (this.allJobs.length === 0) {
                console.warn('⚠️ No jobs found in database. Jobs must have status="Active" to appear.');
                console.warn('💡 Tip: Create a job via employer dashboard and ensure status is set to "Active"');
            }
            
            this.renderPublicJobs(this.allJobs);
        } catch (error) {
            console.error('❌ Error loading public jobs:', error);
            const container = document.getElementById('jobsContainerPublic');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        <h3>⚠️ Error Loading Jobs</h3>
                        <p>Failed to load jobs. Please try refreshing the page.</p>
                        <p style="font-size: 12px; color: #999;">${error.message}</p>
                        <button onclick="jobseekerDashboard.loadPublicJobs()" class="jobseeker-dashboard-btn jobseeker-dashboard-btn-primary" style="margin-top: 15px;">
                            🔄 Retry
                        </button>
                    </div>
                `;
            }
        }
    }
    
    filterJobsPublic() {
        const searchTerm = document.getElementById('jobSearchInputPublic').value.toLowerCase();
        const industryFilter = document.getElementById('jobIndustryFilterPublic').value;
        const typeFilter = document.getElementById('jobTypeFilterPublic').value;

        let filtered = this.allJobs;

        if (searchTerm) {
            filtered = filtered.filter(job => 
                (job.title && job.title.toLowerCase().includes(searchTerm)) ||
                (job.company && job.company.toLowerCase().includes(searchTerm)) ||
                (job.location && job.location.toLowerCase().includes(searchTerm))
            );
        }

        if (industryFilter) {
            filtered = filtered.filter(job => job.industry === industryFilter);
        }

        if (typeFilter) {
            filtered = filtered.filter(job => job.type === typeFilter);
        }

        this.renderPublicJobs(filtered);
    }

    clearFiltersPublic() {
        document.getElementById('jobSearchInputPublic').value = '';
        document.getElementById('jobIndustryFilterPublic').value = '';
        document.getElementById('jobTypeFilterPublic').value = '';
        this.renderPublicJobs(this.allJobs);
    }

    renderPublicJobs(jobs) {
        const container = document.getElementById('jobsContainerPublic');
        
        if (!container) {
            console.error('Public jobs container not found!');
            return;
        }
        
        if (jobs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="color: #666; margin-bottom: 10px;">📭 No Jobs Found</h3>
                    <p style="color: #999;">No job postings match your criteria. Try adjusting your filters or check back later.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = jobs.map(job => `
            <div class="jobseeker-job-card" data-job-id="${job.id}" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 20px;">${job.title || 'Untitled Position'}</h3>
                        <p style="margin: 0; color: #7f8c8d; font-size: 16px;">${job.company || 'Company Name'}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="background: #3498db; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">${job.type || 'Full-time'}</span>
                        ${job.industry ? `<span style="background: #9b59b6; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">${job.industry}</span>` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span style="color: #555; font-size: 14px;">📍 ${job.location || 'Location not specified'}</span>
                    <span style="color: #555; font-size: 14px;">💰 ${job.salary || 'Competitive'}</span>
                    ${job.experience ? `<span style="color: #555; font-size: 14px;">📊 ${job.experience}</span>` : ''}
                </div>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">${job.description ? (job.description.length > 200 ? job.description.substring(0, 200) + '...' : job.description) : 'No description available.'}</p>
                
                ${job.requirements && job.requirements.length > 0 ? `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: #34495e; font-size: 14px;">Requirements:</h4>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${job.requirements.slice(0, 3).map(req => `
                            <span style="background: #ecf0f1; color: #555; padding: 4px 10px; border-radius: 4px; font-size: 12px;">${req}</span>
                        `).join('')}
                        ${job.requirements.length > 3 ? `<span style="background: #ecf0f1; color: #555; padding: 4px 10px; border-radius: 4px; font-size: 12px;">+${job.requirements.length - 3} more</span>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ecf0f1; padding-top: 15px;">
                    <span style="color: #95a5a6; font-size: 13px;">Posted ${job.posted || 'recently'}</span>
                    <div style="display: flex; gap: 10px;">
                        <button class="jobseeker-dashboard-btn jobseeker-dashboard-btn-primary" 
                                onclick="jobseekerDashboard.applyForJobPublic(${job.id}, '${(job.title || '').replace(/'/g, "\\'")}', '${(job.company || '').replace(/'/g, "\\'")}')">
                            📝 Apply Now
                        </button>
                        <button class="jobseeker-dashboard-btn jobseeker-dashboard-btn-secondary ${this.isJobLiked(job.id) ? 'liked' : ''}" 
                                onclick="jobseekerDashboard.toggleWishlistPublic(${job.id})"
                                style="min-width: 100px;">
                            ${this.isJobLiked(job.id) ? '❤️ Saved' : '🤍 Save'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    applyForJobPublic(jobId, jobTitle, company) {
        if (!this.currentUser) {
            if (confirm(`To apply for "${jobTitle}" at ${company}, you need to log in.\n\nWould you like to log in now?`)) {
                // Store the job they wanted to apply for
                localStorage.setItem('pendingJobApplication', JSON.stringify({ jobId, jobTitle, company }));
                this.showLogin();
            }
            return;
        }
        
        // User is logged in, proceed with application
        // First check if they have completed their profile
        this.applyForJob(jobId, jobTitle, company);
    }
    
    toggleWishlistPublic(jobId) {
        if (!this.currentUser) {
            if (confirm('You need to log in to save jobs.\n\nWould you like to log in now?')) {
                this.showLogin();
            }
            return;
        }
        
        // User is logged in, toggle wishlist
        this.toggleWishlist(jobId);
    }

    // Browse Jobs Section
    async showBrowseJobs() {
        // Show browse jobs section within dashboard (integrated view)
        const browseJobsSection = document.getElementById('browseJobsSection');
        if (browseJobsSection) {
            browseJobsSection.style.display = 'block';
            await this.loadJobs();
        }
    }

    hideBrowseJobs() {
        const browseJobsSection = document.getElementById('browseJobsSection');
        if (browseJobsSection) {
            browseJobsSection.style.display = 'none';
        }
    }

    async loadJobs() {
        try {
            const response = await fetch(`${this.API_BASE}/jobs`);
            const data = await response.json();
            
            // Handle both {jobs: []} and direct array responses
            this.allJobs = data.jobs || data || [];
            this.renderJobs(this.allJobs);
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showAlert('Error', 'Failed to load jobs. Please try again.');
        }
    }

    filterJobs() {
        const searchTerm = document.getElementById('jobSearchInput').value.toLowerCase();
        const industryFilter = document.getElementById('jobIndustryFilter').value;
        const typeFilter = document.getElementById('jobTypeFilter').value;

        let filtered = this.allJobs;

        if (searchTerm) {
            filtered = filtered.filter(job => 
                job.title.toLowerCase().includes(searchTerm) ||
                job.company.toLowerCase().includes(searchTerm) ||
                job.location.toLowerCase().includes(searchTerm)
            );
        }

        if (industryFilter) {
            filtered = filtered.filter(job => job.industry === industryFilter);
        }

        if (typeFilter) {
            filtered = filtered.filter(job => job.type === typeFilter);
        }

        this.renderJobs(filtered);
    }

    clearFilters() {
        // Clear all filter inputs
        document.getElementById('jobSearchInput').value = '';
        document.getElementById('jobIndustryFilter').value = '';
        document.getElementById('jobTypeFilter').value = '';

        // Show all jobs
        this.renderJobs(this.allJobs);
    }

    renderJobs(jobs) {
        const container = document.getElementById('jobsContainer');
        
        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="jobseeker-no-jobs">
                    <h3>No jobs found</h3>
                    <p>Try adjusting your filters or check back later for new opportunities.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = jobs.map(job => `
            <div class="jobseeker-job-card" data-job-id="${job.id}">
                <div class="jobseeker-job-header">
                    <div>
                        <h3 class="jobseeker-job-title">${job.title}</h3>
                        <p class="jobseeker-job-company">${job.company}</p>
                    </div>
                    <div class="jobseeker-job-badges">
                        <span class="jobseeker-job-badge jobseeker-job-badge-type">${job.type}</span>
                    </div>
                </div>
                
                <div class="jobseeker-job-badges">
                    <span class="jobseeker-job-badge jobseeker-job-badge-location">📍 ${job.location}</span>
                    <span class="jobseeker-job-badge jobseeker-job-badge-salary">💰 ${job.salary}</span>
                </div>
                
                <p class="jobseeker-job-description">${job.description}</p>
                
                <div class="jobseeker-job-requirements">
                    <h4>Requirements:</h4>
                    <div class="jobseeker-job-requirements-list">
                        ${job.requirements.map(req => `
                            <span class="jobseeker-job-requirement-tag">${req}</span>
                        `).join('')}
                    </div>
                </div>
                
                <div class="jobseeker-job-footer">
                    <span class="jobseeker-job-posted">Posted ${job.posted}</span>
                    <div class="jobseeker-job-actions">
                        <button class="jobseeker-job-btn jobseeker-job-btn-apply" onclick="jobseekerDashboard.applyForJob(${job.id}, '${job.title}', '${job.company}')">
                            Apply Now
                        </button>
                        <button class="jobseeker-job-btn jobseeker-job-btn-like ${this.isJobLiked(job.id) ? 'liked' : ''}" 
                                onclick="jobseekerDashboard.toggleWishlist(${job.id})">
                            ${this.isJobLiked(job.id) ? '❤️ Liked' : '🤍 Like'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async applyForJob(jobId, jobTitle, company) {
        if (!this.currentUser) {
            if (confirm('You need to log in to apply for jobs. Would you like to log in now?')) {
                this.showLogin();
            }
            return;
        }

        // Debug: Log profile data to see what we have
        console.log('🔍 Checking profile before applying...');
        console.log('Profile Data:', this.profileData);
        console.log('Has ID Number:', !!this.profileData?.idNumber);
        console.log('Has Cell Number:', !!this.profileData?.cellNumber);

        // Check if profile is complete
        if (!this.profileData || !this.profileData.idNumber || !this.profileData.cellNumber) {
            console.warn('❌ Profile incomplete - missing required fields');
            this.showAlert('Profile Incomplete', 
                'Please complete your profile before applying for jobs.\n\n' +
                'Missing: ' + 
                (!this.profileData?.idNumber ? 'ID Number ' : '') +
                (!this.profileData?.cellNumber ? 'Cell Number' : '')
            );
            
            // Show the edit profile form
            this.showFormSections();
            const actionsDiv = document.querySelector('.jobseeker-dashboard-actions');
            if (actionsDiv) {
                actionsDiv.style.display = 'flex';
            }
            
            // Scroll to profile section
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (confirm(`Apply for ${jobTitle} at ${company}?\n\nYour application will be sent to careers@tmvbusinesssolutions.co.za`)) {
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
                    this.showAlert('Success', 'Application submitted successfully! The employer will contact you if you match their requirements.');
                    
                    // Reload applications to show the new one
                    await this.loadMyApplications();
                    
                    // Disable the apply button for this job
                    const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
                    if (jobCard) {
                        const applyBtn = jobCard.querySelector('.jobseeker-job-btn-apply');
                        if (applyBtn) {
                            applyBtn.disabled = true;
                            applyBtn.textContent = 'Applied ✓';
                            applyBtn.style.backgroundColor = '#10b981';
                        }
                    }
                } else {
                    this.showAlert('Error', data.message || 'Failed to submit application.');
                }
            } catch (error) {
                console.error('Application error:', error);
                this.showAlert('Error', 'An error occurred while submitting your application.');
            }
        }
    }

    async toggleWishlist(jobId) {
        if (!this.currentUser) {
            if (confirm('You need to log in to save jobs. Would you like to log in now?')) {
                this.showLogin();
            }
            return;
        }

        try {
            const isLiked = this.isJobLiked(jobId);
            
            if (isLiked) {
                // Remove from wishlist
                const response = await fetch(`${this.API_BASE}/jobseeker/wishlist`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ jobId })
                });

                if (response.ok) {
                    this.likedJobs = this.likedJobs.filter(id => id !== jobId);
                    this.updateLikeButton(jobId, false);
                    this.showAlert('Success', 'Job removed from your wishlist!');
                } else {
                    const errorData = await response.json();
                    this.showAlert('Error', errorData.message || 'Failed to remove from wishlist');
                }
            } else {
                // Add to wishlist
                const response = await fetch(`${this.API_BASE}/jobseeker/wishlist`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ jobId })
                });

                if (response.ok) {
                    this.likedJobs.push(jobId);
                    this.updateLikeButton(jobId, true);
                    this.showAlert('Success', 'Job added to your wishlist!');
                } else {
                    const errorData = await response.json();
                    this.showAlert('Error', errorData.message || 'Failed to add to wishlist');
                }
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            this.showAlert('Error', 'Failed to update wishlist. Please check your connection.');
        }
    }

    isJobLiked(jobId) {
        return this.likedJobs && this.likedJobs.includes(jobId);
    }

    updateLikeButton(jobId, isLiked) {
        const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
        if (jobCard) {
            const likeBtn = jobCard.querySelector('.jobseeker-job-btn-like');
            if (isLiked) {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = '❤️ Liked';
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = '🤍 Like';
            }
        }
    }

    async loadWishlist() {
        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/wishlist`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.likedJobs = data.wishlist.map(item => item.jobId);
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }

    // Display Profile Summary
    displayProfileSummary() {
        const profileSummary = document.getElementById('profileSummary');
        if (!profileSummary) return;

        profileSummary.style.display = 'block';

        // Update full name
        const fullName = document.getElementById('fullName')?.value || 
                        (this.currentUser ? `${this.currentUser.name} ${this.currentUser.surname}` : '-');
        const summaryFullName = document.getElementById('summaryFullName');
        if (summaryFullName) {
            summaryFullName.textContent = fullName;
        }

        // Update images
        const fullPicture = document.getElementById('summaryFullPicture');
        const halfPicture = document.getElementById('summaryHalfPicture');
        const noFullPicture = document.getElementById('noFullPicture');
        const noHalfPicture = document.getElementById('noHalfPicture');

        if (this.profileData.fullPicture) {
            fullPicture.src = this.profileData.fullPicture;
            fullPicture.style.display = 'block';
            noFullPicture.style.display = 'none';
        } else {
            fullPicture.style.display = 'none';
            noFullPicture.style.display = 'block';
        }

        if (this.profileData.halfPicture) {
            halfPicture.src = this.profileData.halfPicture;
            halfPicture.style.display = 'block';
            noHalfPicture.style.display = 'none';
        } else {
            halfPicture.style.display = 'none';
            noHalfPicture.style.display = 'block';
        }

        // Update details
        document.getElementById('summaryGender').textContent = this.profileData.gender || '-';
        document.getElementById('summaryIdNumber').textContent = this.profileData.idNumber || '-';
        document.getElementById('summaryCellNumber').textContent = this.profileData.cellNumber || '-';
        
        const location = [this.profileData.suburb, this.profileData.town, this.profileData.province]
            .filter(Boolean).join(', ') || '-';
        document.getElementById('summaryLocation').textContent = location;

        // Update qualifications
        const quals = this.profileData.qualifications || [];
        const qualsText = quals.map(q => `${q.level} (${q.institute})`).join(', ') || '-';
        document.getElementById('summaryQualifications').textContent = qualsText;
    }

    // Display Profile View (Read-only version for saved profiles)
    displayProfileView() {
        console.log('📋 Displaying profile view with data:', this.profileData);
        
        const profileSection = document.getElementById('myProfileSection');
        if (!profileSection) {
            console.error('❌ Profile section not found');
            return;
        }

        // Show the profile section
        profileSection.style.display = 'block';

        // Personal Information - Header
        const fullName = this.currentUser ? `${this.currentUser.name} ${this.currentUser.surname}` : '-';
        document.getElementById('profileViewFullName').textContent = fullName;
        document.getElementById('profileViewEmail').textContent = this.currentUser?.email || '-';

        // Personal Information Banner
        document.getElementById('profileViewCellNumber').textContent = this.profileData.cellNumber || '-';
        document.getElementById('profileViewIdNumber').textContent = this.profileData.idNumber || '-';
        document.getElementById('profileViewLanguage').textContent = this.profileData.language || '-';
        
        // Location
        const location = [this.profileData.town, this.profileData.province].filter(Boolean).join(', ') || '-';
        document.getElementById('profileViewLocation').textContent = location;
        
        // Transport
        document.getElementById('profileViewTransport').textContent = this.profileData.transport || '-';
        
        // Driver's License
        document.getElementById('profileViewDriversLicense').textContent = this.profileData.driversLicense || '-';
        
        // Race
        document.getElementById('profileViewRace').textContent = this.profileData.race || '-';

        // Skills
        const skillsContainer = document.getElementById('profileViewSkills');
        if (this.profileData.skills && this.profileData.skills.length > 0) {
            skillsContainer.innerHTML = this.profileData.skills.map(skill => `
                <span style="background: #e3f2fd; color: #1976d2; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; border: 1px solid #90caf9;">
                    ${skill}
                </span>
            `).join('');
        } else {
            skillsContainer.innerHTML = '<p style="color: #95a5a6; font-style: italic;">No skills added yet</p>';
        }

        // Experience - Multiple Experiences
        const experienceDiv = document.getElementById('profileViewExperience');
        if (this.profileData.experiences && this.profileData.experiences.length > 0) {
            experienceDiv.innerHTML = this.profileData.experiences.map((exp, index) => `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
                    <div style="display: flex; align-items: start; gap: 15px;">
                        <div style="background: #3498db; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
                            💼
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 18px;">${exp.jobTitle || '-'}</h4>
                            <p style="margin: 0 0 8px 0; color: #7f8c8d; font-size: 15px;">${exp.company || '-'}</p>
                            <p style="margin: 0; color: #95a5a6; font-size: 14px;">
                                ${exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '-'} 
                                - 
                                ${exp.endDate && exp.endDate !== 'Current' ? new Date(exp.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Current'}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            experienceDiv.innerHTML = '<p style="color: #95a5a6; font-style: italic;">No experience added yet</p>';
        }

        // Qualifications
        const qualsContainer = document.getElementById('profileViewQualifications');
        if (this.profileData.qualifications && this.profileData.qualifications.length > 0) {
            qualsContainer.innerHTML = this.profileData.qualifications.map((qual, index) => `
                <div style="background: #f8f9fa; padding: 18px; border-left: 4px solid #3498db; border-radius: 8px; display: flex; align-items: start; gap: 15px;">
                    <div style="background: #3498db; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0;">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <strong style="color: #2c3e50; font-size: 16px; display: block; margin-bottom: 5px;">${qual.level}</strong>
                        <p style="margin: 0; color: #7f8c8d; font-size: 14px;">${qual.institute}</p>
                        ${qual.dateCompleted ? `<p style="margin: 5px 0 0 0; color: #95a5a6; font-size: 13px;">Completed: ${new Date(qual.dateCompleted).toLocaleDateString()}</p>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            qualsContainer.innerHTML = '<p style="color: #95a5a6; font-style: italic;">No qualifications added yet</p>';
        }

        // Profile Pictures
        const fullPictureImg = document.getElementById('profileViewFullPicture');
        const halfPictureImg = document.getElementById('profileViewHalfPicture');
        const noFullPicture = document.getElementById('profileViewNoFullPicture');
        const noHalfPicture = document.getElementById('profileViewNoHalfPicture');

        if (this.profileData.fullPicture) {
            fullPictureImg.src = this.profileData.fullPicture;
            fullPictureImg.style.display = 'block';
            noFullPicture.style.display = 'none';
        } else {
            fullPictureImg.style.display = 'none';
            noFullPicture.style.display = 'block';
        }

        if (this.profileData.halfPicture) {
            halfPictureImg.src = this.profileData.halfPicture;
            halfPictureImg.style.display = 'block';
            noHalfPicture.style.display = 'none';
        } else {
            halfPictureImg.style.display = 'none';
            noHalfPicture.style.display = 'block';
        }

        // Documents Section (NEW)
        console.log('📄 Documents data:', this.profileData.documents);
        if (this.profileData.documents && this.profileData.documents.length > 0) {
            // Add documents section after pictures
            const documentsHTML = `
                <div style="margin-top: 30px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 20px; font-weight: 600; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                        📎 UPLOADED DOCUMENTS
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                        ${this.profileData.documents.map(doc => `
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <span style="font-size: 24px;">📄</span>
                                    <strong style="color: #2c3e50;">${doc.type}</strong>
                                </div>
                                <p style="margin: 0; color: #7f8c8d; font-size: 13px; word-break: break-word;">${doc.fileName}</p>
                                <p style="margin: 5px 0 0 0; color: #95a5a6; font-size: 12px;">Uploaded: ${doc.uploadDate}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            // Insert after pictures section
            const picturesSection = noHalfPicture.parentElement.parentElement;
            picturesSection.insertAdjacentHTML('afterend', documentsHTML);
        }

        console.log('✅ Profile view displayed successfully');
    }

    // Show Edit Profile Mode
    showEditProfile() {
        console.log('✏️ Switching to edit profile mode');
        
        // Hide profile view
        const profileSection = document.getElementById('myProfileSection');
        if (profileSection) {
            profileSection.style.display = 'none';
        }

        // Hide applications and jobs sections
        const myApplicationsSection = document.getElementById('myApplicationsSection');
        const browseJobsSection = document.getElementById('browseJobsSection');
        if (myApplicationsSection) myApplicationsSection.style.display = 'none';
        if (browseJobsSection) browseJobsSection.style.display = 'none';

        // Show form sections
        this.showFormSections();

        // Populate with existing data
        this.populateProfile();

        console.log('✅ Edit mode enabled - form sections displayed');
    }

    // Load My Applications
    async loadMyApplications() {
        const myApplicationsSection = document.getElementById('myApplicationsSection');
        const tableBody = document.getElementById('applicationsTableBody');
        
        if (!myApplicationsSection || !tableBody) return;

        try {
            console.log('📋 Loading my job applications...');
            const response = await fetch(`${this.API_BASE}/jobseeker/applications`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const applications = data.applications || [];
                
                console.log(`✅ Loaded ${applications.length} applications`);

                myApplicationsSection.style.display = 'block';
                tableBody.innerHTML = '';

                if (applications.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="jobseeker-dashboard-no-data" style="text-align: center; padding: 40px; color: #6b7280;">
                                <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
                                <div style="font-size: 16px; font-weight: 500;">No applications yet</div>
                                <div style="font-size: 14px; margin-top: 5px;">Start browsing jobs and apply to get started!</div>
                            </td>
                        </tr>`;
                } else {
                    applications.forEach(app => {
                        const row = document.createElement('tr');
                        const statusBadge = this.getStatusBadge(app.applicationStatus);
                        const jobStatusBadge = app.jobStatus === 'Active' ? 
                            '<span style="padding: 0.25rem 0.5rem; background: #d1fae5; color: #065f46; border-radius: 6px; font-size: 0.75rem;">Active</span>' :
                            '<span style="padding: 0.25rem 0.5rem; background: #fee2e2; color: #991b1b; border-radius: 6px; font-size: 0.75rem;">Closed</span>';
                        
                        row.innerHTML = `
                            <td style="font-weight: 500; color: #111827;">${app.jobTitle}</td>
                            <td>${app.company}</td>
                            <td style="font-size: 0.875rem; color: #6b7280;">${app.location || 'N/A'}</td>
                            <td>${app.appliedDate}</td>
                            <td>${statusBadge}</td>
                            <td style="text-align: center;">${jobStatusBadge}</td>
                            <td style="text-align: center;">
                                <button onclick="jobseekerDashboard.viewApplicationDetails(${app.applicationId})" 
                                    style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;">
                                    👁️ View
                                </button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                    
                    console.log('📊 Applications table updated');
                }
            } else {
                console.warn('⚠️ Failed to load applications:', response.status);
            }
        } catch (error) {
            console.error('❌ Error loading applications:', error);
            myApplicationsSection.style.display = 'none';
        }
    }

    getStatusBadge(status) {
        const badges = {
            'pending': '<span style="padding: 0.35rem 0.75rem; background: #fef3c7; color: #92400e; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">⏳ Pending</span>',
            'reviewed': '<span style="padding: 0.35rem 0.75rem; background: #dbeafe; color: #1e40af; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">👁️ Reviewed</span>',
            'shortlisted': '<span style="padding: 0.35rem 0.75rem; background: #e0e7ff; color: #4338ca; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">⭐ Shortlisted</span>',
            'invited': '<span style="padding: 0.35rem 0.75rem; background: #ddd6fe; color: #5b21b6; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">📧 Invited</span>',
            'accepted': '<span style="padding: 0.35rem 0.75rem; background: #d1fae5; color: #065f46; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">✅ Accepted</span>',
            'rejected': '<span style="padding: 0.35rem 0.75rem; background: #fee2e2; color: #991b1b; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">❌ Rejected</span>'
        };
        return badges[status] || `<span style="padding: 0.35rem 0.75rem; background: #f3f4f6; color: #374151; border-radius: 12px; font-size: 0.875rem;">${status}</span>`;
    }

    async viewApplicationDetails(applicationId) {
        const modal = document.getElementById('applicationDetailsModal');
        const content = document.getElementById('applicationDetailsContent');
        
        // Show modal with loading state
        modal.style.display = 'flex';
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
                <div>Loading application details...</div>
            </div>
        `;

        try {
            console.log(`📄 Fetching application details for ID: ${applicationId}`);
            const response = await fetch(`${this.API_BASE}/jobseeker/applications/${applicationId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const app = await response.json();
                console.log('✅ Application details loaded:', app);

                const statusBadge = this.getStatusBadge(app.applicationStatus);
                const jobStatusBadge = app.jobStatus === 'Active' ? 
                    '<span style="padding: 0.35rem 0.75rem; background: #d1fae5; color: #065f46; border-radius: 12px; font-size: 0.875rem;">✅ Active</span>' :
                    '<span style="padding: 0.35rem 0.75rem; background: #fee2e2; color: #991b1b; border-radius: 12px; font-size: 0.875rem;">❌ Closed</span>';

                content.innerHTML = `
                    <div style="display: grid; gap: 1.5rem;">
                        <!-- Job Information -->
                        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <h3 style="margin: 0 0 1rem 0; color: #111827; font-size: 1.25rem;">📋 Job Details</h3>
                            <div style="display: grid; gap: 0.75rem;">
                                <div>
                                    <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Job Title</label>
                                    <div style="font-size: 1rem; color: #111827; font-weight: 600; margin-top: 0.25rem;">${app.jobTitle}</div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                    <div>
                                        <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Company</label>
                                        <div style="font-size: 0.95rem; color: #111827; margin-top: 0.25rem;">${app.company}</div>
                                    </div>
                                    <div>
                                        <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Location</label>
                                        <div style="font-size: 0.95rem; color: #111827; margin-top: 0.25rem;">${app.location || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                    <div>
                                        <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Job Type</label>
                                        <div style="font-size: 0.95rem; color: #111827; margin-top: 0.25rem;">${app.jobType || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Industry</label>
                                        <div style="font-size: 0.95rem; color: #111827; margin-top: 0.25rem;">${app.industry || 'N/A'}</div>
                                    </div>
                                </div>
                                ${app.salary ? `
                                    <div>
                                        <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Salary Range</label>
                                        <div style="font-size: 0.95rem; color: #111827; margin-top: 0.25rem;">${app.salary}</div>
                                    </div>
                                ` : ''}
                                <div>
                                    <label style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Job Status</label>
                                    <div style="margin-top: 0.25rem;">${jobStatusBadge}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Application Information -->
                        <div style="background: #eff6ff; padding: 1.5rem; border-radius: 8px; border: 1px solid #bfdbfe;">
                            <h3 style="margin: 0 0 1rem 0; color: #111827; font-size: 1.25rem;">📝 Application Information</h3>
                            <div style="display: grid; gap: 0.75rem;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                    <div>
                                        <label style="font-size: 0.875rem; color: #1e40af; font-weight: 500;">Applied Date</label>
                                        <div style="font-size: 0.95rem; color: #111827; margin-top: 0.25rem;">${app.appliedDate}</div>
                                    </div>
                                    <div>
                                        <label style="font-size: 0.875rem; color: #1e40af; font-weight: 500;">Application Status</label>
                                        <div style="margin-top: 0.25rem;">${statusBadge}</div>
                                    </div>
                                </div>
                                ${app.coverLetter ? `
                                    <div>
                                        <label style="font-size: 0.875rem; color: #1e40af; font-weight: 500;">Cover Letter</label>
                                        <div style="font-size: 0.95rem; color: #374151; margin-top: 0.5rem; padding: 1rem; background: white; border-radius: 6px; white-space: pre-wrap; line-height: 1.6;">${app.coverLetter}</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Status Timeline -->
                        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <h3 style="margin: 0 0 1rem 0; color: #111827; font-size: 1.25rem;">📊 Application Progress</h3>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${this.getStatusTimeline(app.applicationStatus)}
                            </div>
                            ${app.applicationStatus === 'pending' ? `
                                <div style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-radius: 6px; border: 1px solid #fde68a;">
                                    <div style="font-size: 0.875rem; color: #92400e; line-height: 1.6;">
                                        <strong>⏳ Your application is under review</strong><br>
                                        The employer will review your application and update the status accordingly. You'll be notified of any changes.
                                    </div>
                                </div>
                            ` : ''}
                            ${app.applicationStatus === 'shortlisted' ? `
                                <div style="margin-top: 1rem; padding: 1rem; background: #e0e7ff; border-radius: 6px; border: 1px solid #c7d2fe;">
                                    <div style="font-size: 0.875rem; color: #4338ca; line-height: 1.6;">
                                        <strong>⭐ Congratulations! You've been shortlisted</strong><br>
                                        The employer is interested in your profile. You may receive an interview invitation soon.
                                    </div>
                                </div>
                            ` : ''}
                            ${app.applicationStatus === 'invited' ? `
                                <div style="margin-top: 1rem; padding: 1rem; background: #ddd6fe; border-radius: 6px; border: 1px solid #c4b5fd;">
                                    <div style="font-size: 0.875rem; color: #5b21b6; line-height: 1.6;">
                                        <strong>📧 You've been invited for an interview!</strong><br>
                                        Please check your email for interview details and prepare accordingly.
                                    </div>
                                </div>
                            ` : ''}
                            ${app.applicationStatus === 'rejected' ? `
                                <div style="margin-top: 1rem; padding: 1rem; background: #fee2e2; border-radius: 6px; border: 1px solid #fecaca;">
                                    <div style="font-size: 0.875rem; color: #991b1b; line-height: 1.6;">
                                        <strong>Thank you for your interest</strong><br>
                                        Unfortunately, the employer has decided to move forward with other candidates. Keep applying to other opportunities!
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Job Description -->
                        ${app.description ? `
                            <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #e5e7eb;">
                                <h3 style="margin: 0 0 1rem 0; color: #111827; font-size: 1.25rem;">📄 Job Description</h3>
                                <div style="font-size: 0.95rem; color: #374151; line-height: 1.8; white-space: pre-wrap;">${app.description}</div>
                            </div>
                        ` : ''}

                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 0.5rem;">
                            <button onclick="jobseekerDashboard.viewFullJob(${app.jobId})" 
                                style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                                📋 View Full Job Post
                            </button>
                            ${app.applicationStatus === 'pending' || app.applicationStatus === 'reviewed' ? `
                                <button onclick="jobseekerDashboard.editApplication(${app.applicationId})" 
                                    style="padding: 0.75rem 1.5rem; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                                    ✏️ Edit Application
                                </button>
                            ` : ''}
                            ${app.applicationStatus !== 'rejected' && app.applicationStatus !== 'accepted' ? `
                                <button onclick="jobseekerDashboard.confirmRetractApplication(${app.applicationId})" 
                                    style="padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                                    🗑️ Retract Application
                                </button>
                            ` : ''}
                            <button onclick="jobseekerDashboard.closeApplicationModal()" 
                                style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500;">
                                Close
                            </button>
                        </div>
                    </div>
                `;
            } else {
                console.error('❌ Failed to load application details:', response.status);
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #dc2626;">
                        <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                        <div style="font-size: 16px; font-weight: 500;">Failed to load application details</div>
                        <button onclick="jobseekerDashboard.closeApplicationModal()" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error loading application details:', error);
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #dc2626;">
                    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                    <div style="font-size: 16px; font-weight: 500;">Error loading application details</div>
                    <div style="font-size: 14px; margin-top: 0.5rem; color: #6b7280;">${error.message}</div>
                    <button onclick="jobseekerDashboard.closeApplicationModal()" 
                        style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
        }
    }

    getStatusTimeline(status) {
        const statuses = ['pending', 'reviewed', 'shortlisted', 'invited'];
        const currentIndex = statuses.indexOf(status);
        
        if (status === 'rejected') {
            return `
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: white; border-radius: 6px;">
                    <div style="width: 24px; height: 24px; background: #fee2e2; border: 2px solid #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="color: #dc2626; font-size: 12px;">❌</span>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; font-weight: 500; color: #dc2626;">Application Rejected</div>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.125rem;">The employer has moved forward with other candidates</div>
                    </div>
                </div>
            `;
        }

        return statuses.map((s, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            const icons = {
                'pending': '⏳',
                'reviewed': '👁️',
                'shortlisted': '⭐',
                'invited': '📧'
            };

            const labels = {
                'pending': 'Application Submitted',
                'reviewed': 'Under Review',
                'shortlisted': 'Shortlisted',
                'invited': 'Interview Invitation'
            };

            return `
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: white; border-radius: 6px; opacity: ${isCompleted ? '1' : '0.4'};">
                    <div style="width: 24px; height: 24px; background: ${isCompleted ? '#3b82f6' : '#e5e7eb'}; border: 2px solid ${isCompleted ? '#2563eb' : '#d1d5db'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        ${isCompleted ? '<span style="color: white; font-size: 12px;">✓</span>' : '<span style="color: #9ca3af; font-size: 12px;">' + (index + 1) + '</span>'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 0.875rem; font-weight: ${isCurrent ? '600' : '500'}; color: ${isCompleted ? '#111827' : '#6b7280'};">${icons[s]} ${labels[s]}</div>
                        ${isCurrent ? '<div style="font-size: 0.75rem; color: #3b82f6; margin-top: 0.125rem;">Current Status</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // View full job post
    async viewFullJob(jobId) {
        try {
            console.log(`📋 Loading full job details for job ID: ${jobId}`);
            this.closeApplicationModal();
            
            // Fetch job details
            const response = await fetch(`${this.API_BASE}/jobs/${jobId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const job = await response.json();
                this.showJobDetails(job);
            } else {
                showAlert('Error', 'Failed to load job details');
            }
        } catch (error) {
            console.error('❌ Error loading job:', error);
            showAlert('Error', 'Failed to load job details');
        }
    }

    // Edit application
    async editApplication(applicationId) {
        try {
            console.log(`✏️ Editing application ID: ${applicationId}`);
            
            // Fetch current application data
            const response = await fetch(`${this.API_BASE}/jobseeker/applications/${applicationId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const app = await response.json();
                this.closeApplicationModal();
                
                // Show edit modal
                this.showEditApplicationModal(app);
            } else {
                showAlert('Error', 'Failed to load application for editing');
            }
        } catch (error) {
            console.error('❌ Error loading application for edit:', error);
            showAlert('Error', 'Failed to load application for editing');
        }
    }

    showEditApplicationModal(app) {
        const modal = document.createElement('div');
        modal.id = 'editApplicationModal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001; align-items: center; justify-content: center;';
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h2 style="margin: 0 0 1.5rem 0; color: #111827; font-size: 1.5rem;">✏️ Edit Application</h2>
                
                <div style="margin-bottom: 1rem;">
                    <strong style="color: #111827;">${app.jobTitle}</strong>
                    <div style="color: #6b7280; font-size: 0.875rem;">${app.company}</div>
                </div>

                <form id="editApplicationForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151;">
                            Cover Letter <span style="color: #ef4444;">*</span>
                        </label>
                        <textarea id="editCoverLetter" rows="10" required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; font-family: inherit; resize: vertical;"
                            placeholder="Update your cover letter...">${app.coverLetter || ''}</textarea>
                    </div>

                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem;">
                        <button type="button" onclick="document.getElementById('editApplicationModal').remove()" 
                            style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500;">
                            Cancel
                        </button>
                        <button type="submit" 
                            style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500;">
                            💾 Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('editApplicationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveApplicationEdit(app.applicationId);
        });
    }

    async saveApplicationEdit(applicationId) {
        const coverLetter = document.getElementById('editCoverLetter').value.trim();

        if (!coverLetter) {
            showAlert('Error', 'Please enter a cover letter');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/jobseeker/applications/${applicationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ coverLetter })
            });

            if (response.ok) {
                showAlert('Success', 'Application updated successfully!');
                document.getElementById('editApplicationModal').remove();
                this.loadMyApplications(); // Reload the list
            } else {
                const error = await response.json();
                showAlert('Error', error.message || 'Failed to update application');
            }
        } catch (error) {
            console.error('❌ Error updating application:', error);
            showAlert('Error', 'Failed to update application');
        }
    }

    // Confirm retract application
    confirmRetractApplication(applicationId) {
        const modal = document.createElement('div');
        modal.id = 'confirmRetractModal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001; align-items: center; justify-content: center;';
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
                <h2 style="margin: 0 0 1rem 0; color: #111827; font-size: 1.5rem;">Retract Application?</h2>
                <p style="color: #6b7280; margin-bottom: 2rem; line-height: 1.6;">
                    Are you sure you want to retract this application? This action cannot be undone. 
                    You will need to apply again if you change your mind.
                </p>

                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="document.getElementById('confirmRetractModal').remove()" 
                        style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500;">
                        Cancel
                    </button>
                    <button onclick="jobseekerDashboard.retractApplication(${applicationId})" 
                        style="padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 500;">
                        🗑️ Yes, Retract
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async retractApplication(applicationId) {
        try {
            document.getElementById('confirmRetractModal')?.remove();
            
            const response = await fetch(`${this.API_BASE}/jobseeker/applications/${applicationId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                showAlert('Success', 'Application retracted successfully');
                this.closeApplicationModal();
                this.loadMyApplications(); // Reload the list
            } else {
                const error = await response.json();
                showAlert('Error', error.message || 'Failed to retract application');
            }
        } catch (error) {
            console.error('❌ Error retracting application:', error);
            showAlert('Error', 'Failed to retract application');
        }
    }

    closeApplicationModal() {
        const modal = document.getElementById('applicationDetailsModal');
        if (modal) modal.style.display = 'none';
    }
}

// Initialize dashboard when DOM is loaded
let jobseekerDashboard;
document.addEventListener('DOMContentLoaded', () => {
    jobseekerDashboard = new JobseekerDashboard();
});
