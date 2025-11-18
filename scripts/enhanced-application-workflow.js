// Enhanced Job Application Workflow
class EnhancedApplicationWorkflow {
    constructor() {
        this.API_BASE = window.APP_CONFIG ? window.APP_CONFIG.getApiBase() : 'https://tmvbusinesssolutions.co.za/api';
        this.currentApplication = null;
        this.savedDrafts = [];
        this.applicationProgress = {
            profileComplete: false,
            documentsUploaded: false,
            applicationSubmitted: false
        };
        this.init();
    }

    init() {
        this.loadSavedDrafts();
        this.setupApplicationValidation();
        this.setupProgressTracking();
        this.setupAutosave();
    }

    // Progress Tracking System
    setupProgressTracking() {
        this.checkProfileCompleteness();
        this.updateProgressBar();
    }

    checkProfileCompleteness() {
        const requiredFields = [
            'fullName', 'email', 'cellNumber', 'idNumber', 
            'address', 'dateOfBirth', 'gender'
        ];
        
        const profile = this.getProfileData();
        const missingFields = requiredFields.filter(field => !profile[field]);
        
        this.applicationProgress.profileComplete = missingFields.length === 0;
        this.displayProfileCompletionStatus(missingFields);
        return this.applicationProgress.profileComplete;
    }

    displayProfileCompletionStatus(missingFields) {
        const statusContainer = document.createElement('div');
        statusContainer.className = 'profile-completion-status';
        
        if (missingFields.length === 0) {
            statusContainer.innerHTML = `
                <div class="status-complete">
                    ✅ <strong>Profile Complete</strong> - Ready to apply for jobs!
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="status-incomplete">
                    ⚠️ <strong>Profile Incomplete</strong>
                    <p>Please complete these required fields:</p>
                    <ul>
                        ${missingFields.map(field => `<li>${this.formatFieldName(field)}</li>`).join('')}
                    </ul>
                    <button class="btn-complete-profile" onclick="enhancedWorkflow.goToProfileSection()">
                        Complete Profile
                    </button>
                </div>
            `;
        }
        
        // Insert at the top of the dashboard
        const dashboard = document.querySelector('.jobseeker-dashboard-content');
        if (dashboard) {
            dashboard.insertBefore(statusContainer, dashboard.firstChild);
        }
    }

    formatFieldName(field) {
        const fieldNames = {
            'fullName': 'Full Name',
            'email': 'Email Address',
            'cellNumber': 'Cell Number',
            'idNumber': 'ID Number',
            'address': 'Physical Address',
            'dateOfBirth': 'Date of Birth',
            'gender': 'Gender'
        };
        return fieldNames[field] || field;
    }

    // Smart Application Form with Pre-filling
    createSmartApplicationForm(jobId, jobDetails) {
        const profile = this.getProfileData();
        
        return `
            <div class="smart-application-form">
                <div class="application-header">
                    <h3>Apply for: ${jobDetails.title}</h3>
                    <p class="company-name">${jobDetails.company}</p>
                </div>
                
                <div class="application-progress-bar">
                    <div class="progress-step ${this.applicationProgress.profileComplete ? 'complete' : 'current'}">
                        <span class="step-number">1</span>
                        <span class="step-label">Profile</span>
                    </div>
                    <div class="progress-step">
                        <span class="step-number">2</span>
                        <span class="step-label">Documents</span>
                    </div>
                    <div class="progress-step">
                        <span class="step-number">3</span>
                        <span class="step-label">Review</span>
                    </div>
                    <div class="progress-step">
                        <span class="step-number">4</span>
                        <span class="step-label">Submit</span>
                    </div>
                </div>

                <form id="smartApplicationForm">
                    <!-- Pre-filled Personal Information -->
                    <div class="form-section">
                        <h4>Personal Information <span class="auto-filled">✅ Auto-filled from profile</span></h4>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" name="fullName" value="${profile.fullName || ''}" readonly>
                            </div>
                            
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" name="email" value="${profile.email || ''}" readonly>
                            </div>
                            
                            <div class="form-group">
                                <label>Cell Number</label>
                                <input type="tel" name="cellNumber" value="${profile.cellNumber || ''}" readonly>
                            </div>
                            
                            <div class="form-group">
                                <label>ID Number</label>
                                <input type="text" name="idNumber" value="${profile.idNumber || ''}" readonly>
                            </div>
                        </div>
                    </div>

                    <!-- Job-Specific Questions -->
                    <div class="form-section">
                        <h4>Application Specific</h4>
                        
                        <div class="form-group">
                            <label>Why are you interested in this position?</label>
                            <textarea name="motivation" rows="4" placeholder="Tell us what interests you about this role and our company..." required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>How do your skills match this position?</label>
                            <textarea name="skillsMatch" rows="4" placeholder="Describe how your experience and skills align with the job requirements..." required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Salary Expectation (Optional)</label>
                            <input type="text" name="salaryExpectation" placeholder="e.g., R25,000 - R30,000 per month">
                        </div>
                        
                        <div class="form-group">
                            <label>Availability</label>
                            <select name="availability" required>
                                <option value="">Select availability</option>
                                <option value="immediate">Immediate</option>
                                <option value="1-week">1 week notice</option>
                                <option value="2-weeks">2 weeks notice</option>
                                <option value="1-month">1 month notice</option>
                                <option value="other">Other (please specify in cover letter)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Document Attachments -->
                    <div class="form-section">
                        <h4>Required Documents</h4>
                        <div class="document-checklist">
                            <div class="document-item">
                                <input type="checkbox" id="cvRequired" ${profile.cvUploaded ? 'checked' : ''}>
                                <label for="cvRequired">CV/Resume ${profile.cvUploaded ? '✅' : '❌'}</label>
                                ${!profile.cvUploaded ? '<button type="button" class="btn-upload-doc" onclick="enhancedWorkflow.promptDocumentUpload(\'cv\')">Upload CV</button>' : ''}
                            </div>
                            
                            <div class="document-item">
                                <input type="checkbox" id="coverLetterRequired">
                                <label for="coverLetterRequired">Cover Letter (Optional)</label>
                                <button type="button" class="btn-upload-doc" onclick="enhancedWorkflow.promptDocumentUpload('coverLetter')">Upload Cover Letter</button>
                            </div>
                            
                            <div class="document-item">
                                <input type="checkbox" id="certificatesRequired">
                                <label for="certificatesRequired">Qualification Certificates</label>
                                <button type="button" class="btn-upload-doc" onclick="enhancedWorkflow.promptDocumentUpload('certificates')">Upload Certificates</button>
                            </div>
                        </div>
                    </div>

                    <!-- Draft Save Actions -->
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="enhancedWorkflow.saveDraft(${jobId})">
                            💾 Save as Draft
                        </button>
                        <button type="button" class="btn-secondary" onclick="enhancedWorkflow.previewApplication()">
                            👁️ Preview Application
                        </button>
                        <button type="submit" class="btn-primary">
                            📋 Submit Application
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // Draft Management System
    saveDraft(jobId) {
        const formData = new FormData(document.getElementById('smartApplicationForm'));
        const draftData = {
            jobId: jobId,
            timestamp: new Date().toISOString(),
            formData: Object.fromEntries(formData.entries()),
            status: 'draft'
        };
        
        // Save to localStorage
        let drafts = JSON.parse(localStorage.getItem('application_drafts') || '[]');
        
        // Remove existing draft for this job
        drafts = drafts.filter(draft => draft.jobId !== jobId);
        
        // Add new draft
        drafts.push(draftData);
        localStorage.setItem('application_drafts', JSON.stringify(drafts));
        
        this.showNotification('Draft saved successfully! ✅', 'success');
    }

    loadSavedDrafts() {
        this.savedDrafts = JSON.parse(localStorage.getItem('application_drafts') || '[]');
        this.displayDraftsSection();
    }

    displayDraftsSection() {
        if (this.savedDrafts.length === 0) return;
        
        const draftsContainer = document.createElement('div');
        draftsContainer.className = 'saved-drafts-section';
        draftsContainer.innerHTML = `
            <h3>📝 Saved Application Drafts</h3>
            <div class="drafts-list">
                ${this.savedDrafts.map(draft => `
                    <div class="draft-item">
                        <div class="draft-info">
                            <h4>Job ID: ${draft.jobId}</h4>
                            <p>Saved: ${new Date(draft.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div class="draft-actions">
                            <button onclick="enhancedWorkflow.continueDraft(${draft.jobId})" class="btn-primary">
                                Continue Application
                            </button>
                            <button onclick="enhancedWorkflow.deleteDraft(${draft.jobId})" class="btn-danger">
                                Delete Draft
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Insert into dashboard
        const dashboard = document.querySelector('.jobseeker-dashboard-content');
        if (dashboard) {
            dashboard.appendChild(draftsContainer);
        }
    }

    // Application Preview System
    previewApplication() {
        const formData = new FormData(document.getElementById('smartApplicationForm'));
        const data = Object.fromEntries(formData.entries());
        
        const previewModal = document.createElement('div');
        previewModal.className = 'application-preview-modal';
        previewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Application Preview</h3>
                    <button class="modal-close" onclick="this.closest('.application-preview-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="preview-section">
                        <h4>Personal Information</h4>
                        <p><strong>Name:</strong> ${data.fullName}</p>
                        <p><strong>Email:</strong> ${data.email}</p>
                        <p><strong>Phone:</strong> ${data.cellNumber}</p>
                    </div>
                    
                    <div class="preview-section">
                        <h4>Application Details</h4>
                        <p><strong>Motivation:</strong></p>
                        <p>${data.motivation}</p>
                        <p><strong>Skills Match:</strong></p>
                        <p>${data.skillsMatch}</p>
                        <p><strong>Availability:</strong> ${data.availability}</p>
                        ${data.salaryExpectation ? `<p><strong>Salary Expectation:</strong> ${data.salaryExpectation}</p>` : ''}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.application-preview-modal').remove()">
                        Edit Application
                    </button>
                    <button class="btn-primary" onclick="enhancedWorkflow.submitApplication()">
                        Submit Application
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(previewModal);
    }

    // Auto-save functionality
    setupAutosave() {
        let autosaveTimer;
        
        document.addEventListener('input', (e) => {
            if (e.target.closest('#smartApplicationForm')) {
                clearTimeout(autosaveTimer);
                autosaveTimer = setTimeout(() => {
                    const jobId = this.currentApplication?.jobId;
                    if (jobId) {
                        this.saveDraft(jobId);
                        this.showNotification('Auto-saved 💾', 'info', 2000);
                    }
                }, 5000); // Auto-save after 5 seconds of inactivity
            }
        });
    }

    // Application Tracking
    createApplicationTracker() {
        return `
            <div class="application-tracker">
                <h3>📊 My Applications</h3>
                
                <div class="filter-tabs">
                    <button class="tab-btn active" data-status="all">All Applications</button>
                    <button class="tab-btn" data-status="pending">Pending</button>
                    <button class="tab-btn" data-status="reviewed">Under Review</button>
                    <button class="tab-btn" data-status="shortlisted">Shortlisted</button>
                    <button class="tab-btn" data-status="rejected">Rejected</button>
                </div>
                
                <div class="applications-timeline" id="applicationsTimeline">
                    <!-- Applications will be loaded here -->
                </div>
            </div>
        `;
    }

    loadApplications(status = 'all') {
        fetch(`${this.API_BASE}/jobseeker/applications?status=${status}`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.displayApplications(data.applications);
            }
        })
        .catch(error => {
            console.error('Error loading applications:', error);
        });
    }

    displayApplications(applications) {
        const timeline = document.getElementById('applicationsTimeline');
        if (!timeline) return;
        
        if (applications.length === 0) {
            timeline.innerHTML = `
                <div class="no-applications">
                    <p>No applications found for this status.</p>
                    <button onclick="jobseekerDashboard.showBrowseJobs()" class="btn-primary">
                        Browse Available Jobs
                    </button>
                </div>
            `;
            return;
        }
        
        timeline.innerHTML = applications.map(app => `
            <div class="application-item ${app.status}">
                <div class="application-icon">
                    ${this.getStatusIcon(app.status)}
                </div>
                <div class="application-details">
                    <h4>${app.jobTitle}</h4>
                    <p class="company">${app.companyName}</p>
                    <p class="status">Status: <span class="status-badge status-${app.status}">${app.status}</span></p>
                    <p class="date">Applied: ${new Date(app.appliedAt).toLocaleDateString()}</p>
                    ${app.lastUpdated ? `<p class="date">Last Updated: ${new Date(app.lastUpdated).toLocaleDateString()}</p>` : ''}
                </div>
                <div class="application-actions">
                    <button onclick="enhancedWorkflow.viewApplicationDetails(${app.id})" class="btn-secondary">
                        View Details
                    </button>
                    ${app.status === 'pending' ? `
                        <button onclick="enhancedWorkflow.withdrawApplication(${app.id})" class="btn-warning">
                            Withdraw
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    getStatusIcon(status) {
        const icons = {
            'pending': '⏳',
            'reviewed': '👀',
            'shortlisted': '⭐',
            'rejected': '❌',
            'interview': '🤝',
            'hired': '🎉'
        };
        return icons[status] || '📋';
    }

    // Utility functions
    getProfileData() {
        // Get profile data from current dashboard or API
        return JSON.parse(localStorage.getItem('jobseeker_profile') || '{}');
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    goToProfileSection() {
        // Navigate to profile completion
        if (typeof jobseekerDashboard !== 'undefined') {
            jobseekerDashboard.showEditProfile();
        }
    }
}

// Initialize enhanced workflow
const enhancedWorkflow = new EnhancedApplicationWorkflow();