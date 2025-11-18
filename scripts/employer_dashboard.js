class EmployerDashboard {
    constructor() {
        this.BASE_API = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : `${window.location.protocol}//${window.location.hostname}/api`;
        this.API_BASE = `${this.BASE_API}/employer`;
        this.currentUser = null;
        this.currentJobs = [];
        this.currentApplications = [];
        this.statsRefreshInterval = null;
        this.init();
    }

    async init() {
        // Check if user is logged in
        const userData = await this.checkSession();
        if (!userData) {
            window.location.href = 'employer_portal.html';
            return;
        }

        this.currentUser = userData;
        
        // Check role - redirect if not HR
        if (this.currentUser.role) {
            const role = this.currentUser.role;
            if (role === 'administrator') {
                window.location.href = 'admin_dashboard.html';
                return;
            } else if (role === 'management') {
                window.location.href = 'employer_management_dashboard.html';
                return;
            }
        }
        
        this.loadDashboard();
        this.setupEventListeners();
        this.startStatsAutoRefresh();
    }

    async checkSession() {
        try {
            const response = await fetch('/api/auth/employer/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data.user || null;
            }
            return null;
        } catch (error) {
            console.error('Session check failed:', error);
            return null;
        }
    }

    setupEventListeners() {
        // Job form submission
        document.getElementById('job-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitJobForm();
        });

        // Profile form submission
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitProfileForm();
        });
    }

    async loadDashboard() {
        // Update header with user info
        document.getElementById('userName').textContent = 
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        
        // Update role badge based on user's role
        const roleBadge = document.getElementById('roleBadge');
        if (roleBadge && this.currentUser.EmployerProfile) {
            const role = this.currentUser.EmployerProfile.role;
            
            // Remove existing role classes
            roleBadge.classList.remove('admin', 'management', 'hr');
            
            // Set role-specific styling and text
            switch(role) {
                case 'administrator':
                    roleBadge.classList.add('admin');
                    roleBadge.textContent = 'ADMINISTRATOR';
                    break;
                case 'management':
                    roleBadge.classList.add('management');
                    roleBadge.textContent = 'MANAGEMENT';
                    break;
                case 'hr_recruitment':
                default:
                    roleBadge.classList.add('hr');
                    roleBadge.textContent = 'HR & RECRUITMENT';
                    break;
            }
        }

        // Show "Manage Users" button if user has permission
        if (this.currentUser.EmployerProfile && this.currentUser.EmployerProfile.canManageUsers) {
            document.getElementById('nav-users').style.display = 'block';
        }

        // Show "My Tasks" button for HR role
        if (this.currentUser.EmployerProfile && this.currentUser.EmployerProfile.role === 'hr_recruitment') {
            document.getElementById('nav-tasks').style.display = 'block';
        }

        // Load dashboard data
        await this.loadStats();
        await this.loadJobs();
        await this.loadApplications();
        await this.loadTasks();
        await this.loadProfile();
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.API_BASE}/stats`, {
                credentials: 'include'
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('stat-active-jobs').textContent = stats.activeJobs || 0;
                document.getElementById('stat-total-applications').textContent = stats.totalApplications || 0;
                document.getElementById('stat-pending-applications').textContent = stats.pendingApplications || 0;
                document.getElementById('stat-total-jobseekers').textContent = stats.totalJobseekers || 0;
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async loadJobseekers() {
        try {
            console.log('🔍 Frontend: Loading jobseekers from API...');
            console.log('🔍 API URL:', `${this.API_BASE}/jobseekers`);
            
            const response = await fetch(`${this.API_BASE}/jobseekers`, {
                credentials: 'include'
            });

            console.log('🔍 Response status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Frontend: Received data:', data);
                console.log('✅ Jobseekers count:', data.jobseekers?.length || 0);
                console.log('✅ Total:', data.total);
                this.displayJobseekers(data.jobseekers, data.total);
            } else {
                const errorText = await response.text();
                console.error('❌ Frontend: API error:', response.status, errorText);
                document.getElementById('jobseekers-list').innerHTML = 
                    '<p class="no-data">Failed to load jobseekers</p>';
            }
        } catch (error) {
            console.error('❌ Frontend: Exception loading jobseekers:', error);
            document.getElementById('jobseekers-list').innerHTML = 
                '<p class="no-data">Error loading jobseekers</p>';
        }
    }

    displayJobseekers(jobseekers, total) {
        console.log('🎨 Frontend: displayJobseekers called');
        console.log('🎨 Jobseekers array:', jobseekers);
        console.log('🎨 Total:', total);
        
        const container = document.getElementById('jobseekers-list');
        const statsDiv = document.getElementById('jobseekers-stats');
        
        console.log('🎨 Container element:', container ? 'found' : 'NOT FOUND');
        console.log('🎨 Stats div element:', statsDiv ? 'found' : 'NOT FOUND');
        
        if (!jobseekers || jobseekers.length === 0) {
            console.log('⚠️ No jobseekers to display');
            container.innerHTML = '<p class="no-data">No jobseekers registered yet</p>';
            if (statsDiv) statsDiv.style.display = 'none';
            return;
        }

        console.log(`✅ Displaying ${jobseekers.length} jobseekers`);

        // Update stats
        const withProfile = jobseekers.filter(js => js.hasProfile).length;
        const withoutProfile = total - withProfile;
        document.getElementById('jobseekers-count').textContent = total;
        document.getElementById('jobseekers-with-profile').textContent = withProfile;
        document.getElementById('jobseekers-without-profile').textContent = withoutProfile;
        if (statsDiv) statsDiv.style.display = 'block';

        // Create table
        const table = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Title</th>
                        <th>Industry</th>
                        <th>Profile Status</th>
                        <th>Registered</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${jobseekers.map(js => `
                        <tr>
                            <td><strong>${js.name}</strong></td>
                            <td>${js.email}</td>
                            <td>${js.phone}</td>
                            <td>${js.title}</td>
                            <td>${js.industry}</td>
                            <td>
                                <span class="badge ${js.hasProfile ? 'badge-success' : 'badge-warning'}">
                                    ${js.hasProfile ? '✓ Complete' : '⚠ Incomplete'}
                                </span>
                            </td>
                            <td>${new Date(js.registeredAt).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="employerDashboard.viewJobseekerProfile(${js.id})" ${!js.hasProfile ? 'disabled' : ''}>
                                    📄 View Profile
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    }

    startStatsAutoRefresh() {
        // Auto-refresh stats every 30 seconds to show new jobseekers and applications
        this.statsRefreshInterval = setInterval(() => {
            this.loadStats();
        }, 30000); // 30 seconds
    }

    stopStatsAutoRefresh() {
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
        }
    }

    async loadJobs() {
        try {
            console.log('🔄 EMPLOYER DASHBOARD: Loading jobs from /api/employer/jobs');
            console.log('🔑 Session userId:', this.currentUser?.id || 'unknown');
            
            const response = await fetch(`${this.API_BASE}/jobs`, {
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ EMPLOYER DASHBOARD: Received data from API:', data);
                
                // Backend now returns { jobs: [...], categorized: {...}, summary: {...} }
                // Extract the jobs array
                this.currentJobs = data.jobs || data.categorized?.all || data;
                
                console.log('📊 Total jobs count:', this.currentJobs.length);
                
                // Log each job's details
                if (Array.isArray(this.currentJobs)) {
                    this.currentJobs.forEach((job, index) => {
                        console.log(`📋 Job ${index + 1}:`, {
                            id: job.id,
                            title: job.title,
                            employerId: job.employerId,
                            status: job.status,
                            createdBy: job.employer_user?.role || 'unknown',
                            approvalStatus: job.approvalStatus
                        });
                    });
                } else {
                    console.error('❌ currentJobs is not an array:', this.currentJobs);
                    this.currentJobs = [];
                }
                
                this.displayJobs();
                this.updateJobFilters();
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to fetch jobs:', response.status, errorText);
                showAlert('Error', 'Failed to load jobs');
            }
        } catch (error) {
            console.error('❌ Exception in loadJobs():', error);
            showAlert('Error', 'Failed to load jobs');
        }
    }

    displayJobs() {
        console.log('🎨 EMPLOYER DASHBOARD: displayJobs() called');
        console.log('🎨 Jobs to display:', this.currentJobs.length);
        
        const jobsList = document.getElementById('jobs-list');
        
        if (!jobsList) {
            console.error('❌ Element #jobs-list not found in DOM!');
            return;
        }
        
        if (this.currentJobs.length === 0) {
            console.log('⚠️ No jobs to display - showing empty state');
            jobsList.innerHTML = '<p class="no-data">No jobs posted yet</p>';
            return;
        }

        console.log('✅ Rendering', this.currentJobs.length, 'job cards...');

        jobsList.innerHTML = this.currentJobs.map((job, index) => {
            // Determine approval status badge
            let approvalBadge = '';
            let statusBadge = '';
            let actionButtons = '';
            
            if (job.approvalStatus === 'pending') {
                approvalBadge = '<span style="background:#ff9800;color:white;font-size:0.75rem;padding:4px 10px;border-radius:12px;margin-left:8px;">⏳ Awaiting Approval</span>';
                statusBadge = 'pending';
                actionButtons = `
                    <button onclick="employerDashboard.editJob(${job.id})" class="btn-primary">
                        Edit
                    </button>
                    <button onclick="employerDashboard.deleteJob(${job.id})" class="btn-danger">
                        Delete
                    </button>
                `;
            } else if (job.approvalStatus === 'rejected') {
                approvalBadge = '<span style="background:#f44336;color:white;font-size:0.75rem;padding:4px 10px;border-radius:12px;margin-left:8px;">❌ Needs Revision</span>';
                statusBadge = 'rejected';
                actionButtons = `
                    <button onclick="employerDashboard.viewRejectionReason(${job.id}, '${(job.rejectionReason || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" class="btn-secondary" style="background:#ff5722;">
                        View Feedback
                    </button>
                    <button onclick="employerDashboard.editJob(${job.id})" class="btn-primary">
                        Fix & Resubmit
                    </button>
                `;
            } else if (job.approvalStatus === 'approved') {
                approvalBadge = '<span style="background:#4caf50;color:white;font-size:0.75rem;padding:4px 10px;border-radius:12px;margin-left:8px;">✅ Published</span>';
                statusBadge = job.status.toLowerCase();
                actionButtons = `
                    <button onclick="employerDashboard.editJob(${job.id})" class="btn-primary">
                        Edit
                    </button>
                    <button onclick="employerDashboard.viewJob(${job.id})" class="btn-secondary">
                        View
                    </button>
                    <button onclick="employerDashboard.deleteJob(${job.id})" class="btn-danger">
                        Delete
                    </button>
                `;
            }
            
            console.log(`🎨 Rendering job ${index + 1}: "${job.title}" (status: ${job.approvalStatus})`);
            
            return `
            <div class="job-card ${statusBadge}">
                <div class="job-card-header">
                    <div>
                        <h4 class="job-card-title">
                            ${job.title}
                            ${approvalBadge}
                        </h4>
                        <p style="color: var(--text-light); font-size: 0.875rem;">${job.jobType}</p>
                    </div>
                </div>
                
                <div class="job-card-info">
                    <div>📍 ${job.city ? job.city + ', ' : ''}${job.province || 'Location TBD'}</div>
                    ${job.salaryMin && job.salaryMax ? 
                        `<div>💰 R${job.salaryMin.toLocaleString()} - R${job.salaryMax.toLocaleString()} ${job.salaryPeriod || 'per month'}</div>` 
                        : ''}
                    ${job.closingDate ? 
                        `<div>📅 Closes: ${new Date(job.closingDate).toLocaleDateString()}</div>` 
                        : ''}
                </div>
                
                <div class="job-card-stats">
                    <span>👁️ ${job.viewCount || 0} views</span>
                    <span>📨 ${job.applicationCount || 0} applications</span>
                </div>
                
                ${job.approvalStatus === 'rejected' && job.rejectionReason ? `
                <div class="rejection-notice" style="background:#fff3cd;border-left:4px solid #f44336;padding:12px;margin:12px 0;border-radius:4px;">
                    <strong style="color:#d32f2f;display:block;margin-bottom:8px;">📝 Manager Feedback:</strong>
                    <p style="color:#444;margin:0;white-space:pre-wrap;">${job.rejectionReason}</p>
                </div>
                ` : ''}
                
                <div class="job-card-actions">
                    ${actionButtons}
                    ${job.approvalStatus === 'approved' ? `
                        <button onclick="employerDashboard.viewJobApplications(${job.id})" class="btn-success">
                            View Applications
                        </button>
                        ${job.status === 'Active' ? 
                            `<button onclick="employerDashboard.closeJob(${job.id})" class="btn-warning">Close</button>` 
                            : ''}
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
        
        console.log('✅ Job cards rendered to DOM');
    }

    filterJobs() {
        const statusFilter = document.getElementById('jobs-status-filter').value;
        
        const filteredJobs = statusFilter ? 
            this.currentJobs.filter(job => job.status === statusFilter) : 
            this.currentJobs;
        
        const jobsList = document.getElementById('jobs-list');
        
        if (filteredJobs.length === 0) {
            jobsList.innerHTML = '<p class="no-data">No jobs match the filter</p>';
            return;
        }

        // Re-display with filtered jobs
        const temp = this.currentJobs;
        this.currentJobs = filteredJobs;
        this.displayJobs();
        this.currentJobs = temp;
    }

    async submitJobForm() {
        const jobId = document.getElementById('job-id').value;
        
        // Check if this is a resubmission of a rejected job
        const isResubmission = jobId && this.currentJobs.some(j => 
            j.id == jobId && j.approvalStatus === 'rejected'
        );
        
        const jobData = {
            title: document.getElementById('job-title').value,
            jobType: document.getElementById('job-type').value,
            department: document.getElementById('job-department').value,
            province: document.getElementById('job-province').value,
            city: document.getElementById('job-city').value,
            description: document.getElementById('job-description').value,
            requirements: document.getElementById('job-requirements').value,
            responsibilities: document.getElementById('job-responsibilities').value,
            salaryMin: parseFloat(document.getElementById('job-salary-min').value) || null,
            salaryMax: parseFloat(document.getElementById('job-salary-max').value) || null,
            salaryPeriod: document.getElementById('job-salary-period').value,
            experience: document.getElementById('job-experience').value,
            education: document.getElementById('job-education').value,
            closingDate: document.getElementById('job-closing-date').value || null,
            status: document.getElementById('job-status').value,
            resubmit: isResubmission // Flag for backend to handle resubmission
        };

        try {
            const url = jobId ? `${this.API_BASE}/jobs/${jobId}` : `${this.API_BASE}/jobs`;
            const method = jobId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(jobData)
            });

            if (response.ok) {
                const result = await response.json();
                
                // Different messages based on action
                if (isResubmission) {
                    showAlert('Success', 
                        '🔄 Job resubmitted successfully!\n\n⏳ Your updated job is now awaiting manager approval.\n\nYou\'ll receive a notification once it\'s reviewed.'
                    );
                } else if (result.requiresApproval) {
                    showAlert('Success', 
                        jobId ? 'Job updated successfully!' : 
                        '✅ Job created successfully!\n\n⏳ Your job is awaiting manager approval before it goes live.\n\nYou can view it in your "My Jobs" section.'
                    );
                } else {
                    showAlert('Success', 
                        jobId ? 'Job updated successfully!' : 
                        '✅ Job posted and published successfully!'
                    );
                }
                
                this.cancelJobForm();
                await this.loadJobs();
                await this.loadStats();
                this.showSection('jobs');
            } else {
                const error = await response.json();
                showAlert('Error', error.message || 'Failed to save job');
            }
        } catch (error) {
            console.error('Job submission error:', error);
            showAlert('Error', 'Failed to save job. Please try again.');
        }
    }

    viewRejectionReason(jobId, reason) {
        const formattedReason = reason.replace(/\\n/g, '\n').replace(/\\'/g, "'");
        alert(`Manager Feedback:\n\n${formattedReason}\n\nClick OK to dismiss, then use "Fix & Resubmit" to make changes.`);
    }

    async editJob(jobId) {
        const job = this.currentJobs.find(j => j.id === jobId);
        if (!job) return;

        // Show rejection feedback if job was rejected
        if (job.approvalStatus === 'rejected' && job.rejectionReason) {
            const feedbackBanner = document.createElement('div');
            feedbackBanner.id = 'rejection-feedback-banner';
            feedbackBanner.style.cssText = 'background:#fff3cd;border-left:4px solid #f44336;padding:16px;margin-bottom:20px;border-radius:4px;';
            feedbackBanner.innerHTML = `
                <strong style="color:#d32f2f;display:block;margin-bottom:8px;">📝 Manager Feedback - Please address before resubmitting:</strong>
                <p style="color:#444;margin:0;white-space:pre-wrap;">${job.rejectionReason}</p>
            `;
            
            const form = document.getElementById('job-form');
            if (form) {
                // Remove existing banner if any
                const existing = document.getElementById('rejection-feedback-banner');
                if (existing) existing.remove();
                
                form.insertBefore(feedbackBanner, form.firstChild);
            }
        }

        // Populate form with job data
        document.getElementById('job-id').value = job.id;
        document.getElementById('job-title').value = job.title;
        document.getElementById('job-type').value = job.jobType;
        document.getElementById('job-department').value = job.department || '';
        document.getElementById('job-province').value = job.province || '';
        document.getElementById('job-city').value = job.city || '';
        document.getElementById('job-description').value = job.description;
        document.getElementById('job-requirements').value = job.requirements || '';
        document.getElementById('job-responsibilities').value = job.responsibilities || '';
        document.getElementById('job-salary-min').value = job.salaryMin || '';
        document.getElementById('job-salary-max').value = job.salaryMax || '';
        document.getElementById('job-salary-period').value = job.salaryPeriod || 'month';
        document.getElementById('job-experience').value = job.experience || '';
        document.getElementById('job-education').value = job.education || '';
        document.getElementById('job-closing-date').value = job.closingDate ? 
            job.closingDate.split('T')[0] : '';
        document.getElementById('job-status').value = job.status;

        // Update button text based on approval status
        if (job.approvalStatus === 'rejected') {
            document.getElementById('job-form-title').textContent = 'Fix & Resubmit Job';
            document.getElementById('btn-submit-text').textContent = 'Resubmit for Approval';
        } else {
            document.getElementById('job-form-title').textContent = 'Edit Job';
            document.getElementById('btn-submit-text').textContent = 'Update Job';
        }
        
        this.showSection('post-job');
    }

    async closeJob(jobId) {
        if (!confirm('Are you sure you want to close this job posting?')) return;

        try {
            const response = await fetch(`${this.API_BASE}/jobs/${jobId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ status: 'Closed' })
            });

            if (response.ok) {
                showAlert('Success', 'Job closed successfully');
                await this.loadJobs();
                await this.loadStats();
            } else {
                showAlert('Error', 'Failed to close job');
            }
        } catch (error) {
            console.error('Close job error:', error);
            showAlert('Error', 'Failed to close job');
        }
    }

    async deleteJob(jobId) {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;

        try {
            const response = await fetch(`${this.API_BASE}/jobs/${jobId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                showAlert('Success', 'Job deleted successfully');
                await this.loadJobs();
                await this.loadStats();
            } else {
                showAlert('Error', 'Failed to delete job');
            }
        } catch (error) {
            console.error('Delete job error:', error);
            showAlert('Error', 'Failed to delete job');
        }
    }

    cancelJobForm() {
        document.getElementById('job-form').reset();
        document.getElementById('job-id').value = '';
        document.getElementById('job-form-title').textContent = 'Post New Job';
        document.getElementById('btn-submit-text').textContent = 'Post Job';
    }

    async loadApplications() {
        try {
            console.log('📋 Frontend: Loading applications from API...');
            console.log('📋 API URL:', `${this.API_BASE}/applications`);
            
            const response = await fetch(`${this.API_BASE}/applications`, {
                credentials: 'include'
            });

            console.log('📋 Response status:', response.status, response.statusText);

            if (response.ok) {
                this.currentApplications = await response.json();
                console.log('✅ Frontend: Received applications:', this.currentApplications);
                console.log('✅ Applications count:', this.currentApplications.length);
                
                if (this.currentApplications.length > 0) {
                    console.log('📄 Sample application:', this.currentApplications[0]);
                }
                
                this.displayApplications();
                this.loadRecentApplications();
            }
        } catch (error) {
            console.error('Failed to load applications:', error);
        }
    }

    loadRecentApplications() {
        const recentDiv = document.getElementById('recent-applications');
        const recent = this.currentApplications.slice(0, 5);

        if (recent.length === 0) {
            recentDiv.innerHTML = '<p class="no-data">No recent applications</p>';
            return;
        }

        recentDiv.innerHTML = recent.map(app => `
            <div style="padding: 1rem; background: white; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <strong>${app.User?.firstName} ${app.User?.lastName}</strong>
                        <p style="color: var(--text-light); font-size: 0.875rem; margin: 0.25rem 0;">
                            Applied for: ${app.Job?.title}
                        </p>
                    </div>
                    <span class="status-badge ${app.status}">${app.status}</span>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    <button onclick="employerDashboard.viewCandidateDetails(${app.id})" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                        View Profile
                    </button>
                </div>
            </div>
        `).join('');
    }

    displayApplications() {
        console.log('🎨 Frontend: displayApplications called');
        console.log('🎨 currentApplications:', this.currentApplications);
        console.log('🎨 currentApplications.length:', this.currentApplications.length);
        
        const appsList = document.getElementById('applications-list');
        
        if (this.currentApplications.length === 0) {
            console.log('⚠️ No applications to display');
            appsList.innerHTML = '<p class="no-data">No applications yet</p>';
            return;
        }

        console.log(`✅ Displaying ${this.currentApplications.length} applications`);

        appsList.innerHTML = `
            <table class="applications-table">
                <thead>
                    <tr>
                        <th>Candidate</th>
                        <th>Job Title</th>
                        <th>Applied Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.currentApplications.map(app => `
                        <tr>
                            <td>
                                <strong>${app.User?.firstName} ${app.User?.lastName}</strong><br>
                                <small style="color: var(--text-light);">${app.User?.email}</small>
                            </td>
                            <td>${app.Job?.title || 'N/A'}</td>
                            <td>${new Date(app.createdAt).toLocaleDateString()}</td>
                            <td><span class="status-badge ${app.status}">${app.status}</span></td>
                            <td>
                                <div class="action-buttons">
                                    <button onclick="employerDashboard.viewCandidateDetails(${app.id})" class="btn-primary">
                                        View Profile
                                    </button>
                                    ${app.status === 'pending' || app.status === 'reviewed' ? 
                                        `<button onclick="employerDashboard.shortlistCandidate(${app.id})" class="btn-success">
                                            Shortlist
                                        </button>` : ''}
                                    ${app.status === 'shortlisted' ? 
                                        `<button onclick="employerDashboard.inviteCandidate(${app.id})" class="btn-success">
                                            Invite
                                        </button>` : ''}
                                    ${app.status !== 'rejected' && app.status !== 'accepted' ? 
                                        `<button onclick="employerDashboard.rejectCandidate(${app.id})" class="btn-danger">
                                            Reject
                                        </button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async viewCandidateDetails(applicationId) {
        try {
            console.log('🔍 Fetching candidate details for application:', applicationId);
            const response = await fetch(`${this.API_BASE}/applications/${applicationId}`, {
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const application = await response.json();
                console.log('✅ Loaded application:', application);
                this.showCandidateModal(application);
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to load candidate:', response.status, errorText);
                showAlert('Error', 'Failed to load candidate details: ' + errorText);
            }
        } catch (error) {
            console.error('❌ Failed to load candidate:', error);
            showAlert('Error', 'Failed to load candidate details: ' + error.message);
        }
    }

    showCandidateModal(application) {
        console.log('📋 Showing candidate modal for application:', application);
        
        const profile = application.User?.JobseekerProfile;
        if (!profile) {
            showAlert('Error', 'Candidate profile not found');
            return;
        }

        const job = application.Job;
        
        // Parse documents JSON (same as Talent Pool)
        let documentsArray = [];
        try {
            if (profile?.documents) {
                console.log('📄 Application - Documents type:', typeof profile.documents);
                
                // Check if already parsed (object/array) or needs parsing (string)
                const parsedDocs = typeof profile.documents === 'string' 
                    ? JSON.parse(profile.documents) 
                    : profile.documents;
                
                // Check if it's an array (new format) or object (old format)
                if (Array.isArray(parsedDocs)) {
                    documentsArray = parsedDocs;
                    console.log(`📄 Application - Found ${documentsArray.length} documents in array format`);
                } else if (typeof parsedDocs === 'object' && parsedDocs !== null) {
                    // Convert object format to array
                    documentsArray = Object.keys(parsedDocs).map(key => ({
                        type: key,
                        data: parsedDocs[key].data || parsedDocs[key],
                        fileName: parsedDocs[key].fileName || `${key}.pdf`,
                        uploadDate: parsedDocs[key].uploadDate || 'N/A'
                    }));
                    console.log(`📄 Application - Converted ${documentsArray.length} documents from object format`);
                }
                
                // Log each document for debugging
                documentsArray.forEach((doc, index) => {
                    console.log(`📄 Application Doc ${index + 1}:`, {
                        type: doc.type,
                        fileName: doc.fileName,
                        hasData: !!doc.data
                    });
                });
            }
        } catch (e) {
            console.error('❌ Application - Could not parse documents JSON:', e);
        }
        
        const candidateDetails = document.getElementById('candidateDetails');
        
        candidateDetails.innerHTML = `
            <!-- Job Information -->
            <div class="job-info-section" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Applied Position</h3>
                <div style="display: grid; gap: 0.5rem;">
                    <div><strong>Job Title:</strong> ${job?.title || 'N/A'}</div>
                    <div><strong>Job Type:</strong> ${job?.jobType || 'N/A'}</div>
                    <div><strong>Company:</strong> ${job?.companyName || 'N/A'}</div>
                    <div><strong>Location:</strong> ${job?.location || 'N/A'}</div>
                    <div><strong>Application Date:</strong> ${new Date(application.createdAt).toLocaleDateString()}</div>
                    <div><strong>Status:</strong> <span class="status-badge status-${application.status}">${application.status.toUpperCase()}</span></div>
                </div>
            </div>

            <!-- Candidate Personal Information -->
            <h3 style="margin: 1.5rem 0 1rem 0; color: #2c3e50;">Candidate Profile</h3>
            <div class="candidate-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Full Name</label>
                    <span>${application.User.firstName} ${application.User.lastName}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Email</label>
                    <span>${application.User.email}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Cell Number</label>
                    <span>${profile.cellNumber || 'Not provided'}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">ID Number</label>
                    <span>${profile.idNumber || 'Not provided'}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Gender</label>
                    <span>${profile.gender || 'Not specified'}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Location</label>
                    <span>${profile.town || ''}, ${profile.province || ''}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Postal Code</label>
                    <span>${profile.postalCode || 'Not provided'}</span>
                </div>
                <div class="candidate-info-item">
                    <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.25rem;">Address</label>
                    <span>${profile.addressLine1 || ''} ${profile.addressLine2 || ''}</span>
                </div>
            </div>

            <!-- Candidate Photos -->
            ${profile.fullPicture || profile.halfPicture ? `
                <div class="candidate-images" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
                    ${profile.fullPicture ? `
                        <div class="candidate-image" style="text-align: center;">
                            <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.5rem;">Full Picture</label>
                            <img src="${profile.fullPicture}" alt="Full Picture" style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #ddd;">
                        </div>
                    ` : ''}
                    ${profile.halfPicture ? `
                        <div class="candidate-image" style="text-align: center;">
                            <label style="font-weight: 600; color: #666; display: block; margin-bottom: 0.5rem;">Half Picture</label>
                            <img src="${profile.halfPicture}" alt="Half Picture" style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #ddd;">
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Cover Letter -->
            ${application.coverLetter ? `
                <div style="margin-top: 1.5rem;">
                    <h4 style="margin: 0 0 0.75rem 0; color: #2c3e50;">Cover Letter</h4>
                    <p style="white-space: pre-wrap; padding: 1rem; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007bff; line-height: 1.6;">
                        ${application.coverLetter}
                    </p>
                </div>
            ` : ''}

            <!-- Job Requirements Comparison -->
            ${job?.requirements ? `
                <div style="margin-top: 1.5rem; padding: 1rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h4 style="margin: 0 0 0.75rem 0; color: #856404;">📋 Job Requirements</h4>
                    <div style="white-space: pre-wrap; line-height: 1.6; color: #856404;">
                        ${job.requirements}
                    </div>
                    <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 6px;">
                        <strong style="color: #856404;">💡 Review Tip:</strong> 
                        <span style="color: #856404;">Compare candidate's CV and qualifications against these requirements before shortlisting.</span>
                    </div>
                </div>
            ` : ''}

            <!-- Documents & Downloads Section -->
            <div class="candidate-documents" style="margin-top: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: #2c3e50; display: flex; align-items: center; gap: 0.5rem;">
                    📎 Candidate Documents & Attachments
                    ${documentsArray.length > 0 ? `<span style="background: #007bff; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600;">${documentsArray.length} files</span>` : ''}
                </h4>
                
                ${documentsArray.length > 0 || profile.fullPicture || profile.halfPicture ? `
                    <div class="document-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.75rem;">
                        <!-- Profile Pictures -->
                        ${profile.fullPicture ? `
                            <div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                                <span style="font-weight: 500;">📷 Full Picture</span>
                                <button onclick="window.open('${profile.fullPicture}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                            </div>
                        ` : ''}
                        ${profile.halfPicture ? `
                            <div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                                <span style="font-weight: 500;">📷 Half Picture</span>
                                <button onclick="window.open('${profile.halfPicture}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                            </div>
                        ` : ''}
                        
                        <!-- Dynamic Documents from Array -->
                        ${documentsArray.map(doc => {
                            // Map document types to icons
                            const iconMap = {
                                'CV': '📄',
                                'Cover Letter': '📝',
                                'ID Copy': '🪪',
                                'Matric Certificate': '🎓',
                                'Qualification Document': '📜',
                                "Driver's License": '🚗',
                                'Proof of Address': '🏠'
                            };
                            const icon = iconMap[doc.type] || '📎';
                            const fileName = doc.fileName || `${doc.type.replace(/\s+/g, '_')}.pdf`;
                            
                            return `
                                <div class="document-item" style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-weight: 600; color: #2c3e50;">${icon} ${doc.type}</span>
                                        <button onclick="window.open('${doc.data}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                                    </div>
                                    ${doc.fileName ? `<span style="font-size: 0.8rem; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${doc.fileName}">${doc.fileName}</span>` : ''}
                                    ${doc.uploadDate ? `<span style="font-size: 0.75rem; color: #999;">Uploaded: ${doc.uploadDate}</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <div style="padding: 2rem; text-align: center; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                        <p style="color: #6c757d; margin: 0; font-size: 1rem;">📭 No documents uploaded yet</p>
                        <p style="color: #999; margin: 0.5rem 0 0 0; font-size: 0.875rem;">The candidate has not uploaded any documents to their profile.</p>
                    </div>
                `}
            </div>

            <!-- Old Format Documents (Backward Compatibility) -->
            ${(profile.idCopy || profile.cv || profile.matric || profile.qualifications || profile.license || profile.proofOfAddress) && documentsArray.length === 0 ? `
                <div class="candidate-documents" style="margin-top: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">📎 Submitted Documents (Legacy Format)</h4>
                    <div class="document-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
                        ${profile.idCopy ? `<div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">📄 ID Copy</span>
                            <button onclick="window.open('${profile.idCopy}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                        </div>` : ''}
                        ${profile.cv ? `<div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">📄 CV / Resume</span>
                            <button onclick="window.open('${profile.cv}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                        </div>` : ''}
                        ${profile.matric ? `<div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">🎓 Matric Certificate</span>
                            <button onclick="window.open('${profile.matric}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                        </div>` : ''}
                        ${profile.qualifications ? `<div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">🎓 Qualifications</span>
                            <button onclick="window.open('${profile.qualifications}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                        </div>` : ''}
                        ${profile.license ? `<div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">🚗 Driver's License</span>
                            <button onclick="window.open('${profile.license}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                        </div>` : ''}
                        ${profile.proofOfAddress ? `<div class="document-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">📮 Proof of Address</span>
                            <button onclick="window.open('${profile.proofOfAddress}', '_blank')" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">View</button>
                        </div>` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #dee2e6;">
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end;">
                    ${application.status === 'pending' || application.status === 'reviewed' ? 
                        `<button onclick="employerDashboard.shortlistCandidate(${application.id})" class="btn-success" style="padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;">
                            ✅ Shortlist Candidate
                        </button>` : ''}
                    ${application.status === 'shortlisted' ? 
                        `<button onclick="employerDashboard.inviteCandidate(${application.id})" class="btn-success" style="padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;">
                            📧 Send Interview Invitation
                        </button>` : ''}
                    ${application.status !== 'rejected' && application.status !== 'accepted' ? 
                        `<button onclick="employerDashboard.rejectCandidate(${application.id})" class="btn-danger" style="padding: 0.75rem 1.5rem; font-size: 1rem;">
                            ❌ Reject Application
                        </button>` : ''}
                    <button onclick="closeCandidateModal()" class="btn-secondary" style="padding: 0.75rem 1.5rem; font-size: 1rem;">Close</button>
                </div>
            </div>
        `;

        document.getElementById('candidateModal').classList.add('show');
    }

    async shortlistCandidate(applicationId) {
        if (!confirm('Are you sure you want to shortlist this candidate?\n\nThis means they meet the job requirements and should proceed to the next stage.')) return;

        try {
            console.log('🎯 Shortlisting candidate:', applicationId);
            const response = await fetch(`${this.API_BASE}/applications/${applicationId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ status: 'shortlisted' })
            });

            if (response.ok) {
                showAlert('Success', '✅ Candidate shortlisted successfully! They will be notified.');
                await this.loadApplications();
                await this.loadStats();
                closeCandidateModal();
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to shortlist:', response.status, errorText);
                showAlert('Error', 'Failed to shortlist candidate: ' + errorText);
            }
        } catch (error) {
            console.error('❌ Shortlist error:', error);
            showAlert('Error', 'Failed to shortlist candidate: ' + error.message);
        }
    }

    async inviteCandidate(applicationId) {
        const details = prompt('Enter interview details:\n(Example: Monday, Oct 20, 2025 at 10:00 AM, Office Location: 123 Main St)');
        if (!details) return;

        try {
            console.log('📧 Sending interview invitation:', applicationId);
            const response = await fetch(`${this.API_BASE}/applications/${applicationId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ invitationDetails: details })
            });

            if (response.ok) {
                showAlert('Success', '📧 Interview invitation sent successfully! Candidate will receive an email.');
                await this.loadApplications();
                await this.loadStats();
                closeCandidateModal();
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to send invitation:', response.status, errorText);
                showAlert('Error', 'Failed to send invitation: ' + errorText);
            }
        } catch (error) {
            console.error('❌ Invite error:', error);
            showAlert('Error', 'Failed to send invitation: ' + error.message);
        }
    }

    async rejectCandidate(applicationId) {
        const reason = prompt('Enter rejection reason (will be sent to candidate):\n(Example: Qualifications do not match requirements, Position filled, etc.)');
        if (!reason) return;

        if (!confirm('Are you sure you want to reject this candidate?\n\nThey will receive an email with the reason provided.')) return;

        try {
            console.log('❌ Rejecting candidate:', applicationId);
            const response = await fetch(`${this.API_BASE}/applications/${applicationId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ rejectionReason: reason })
            });

            if (response.ok) {
                showAlert('Success', 'Rejection email sent to candidate');
                await this.loadApplications();
                await this.loadStats();
                closeCandidateModal();
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to reject:', response.status, errorText);
                showAlert('Error', 'Failed to reject application: ' + errorText);
            }
        } catch (error) {
            console.error('❌ Reject error:', error);
            showAlert('Error', 'Failed to reject application: ' + error.message);
        }
    }

    // View jobseeker profile from Talent Pool
    async viewJobseekerProfile(userId) {
        try {
            console.log('👤 Loading jobseeker profile:', userId);
            const response = await fetch(`${this.API_BASE}/jobseekers/${userId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to load profile: ${response.statusText}`);
            }

            const jobseeker = await response.json();
            console.log('✅ Jobseeker profile loaded:', jobseeker);
            
            this.showJobseekerProfileModal(jobseeker);
        } catch (error) {
            console.error('❌ Error loading jobseeker profile:', error);
            showAlert('Error', 'Failed to load jobseeker profile: ' + error.message);
        }
    }

    showJobseekerProfileModal(jobseeker) {
        const profile = jobseeker.profile;
        
        // Parse documents JSON (keep as array to show ALL documents)
        let documentsArray = [];
        try {
            if (profile?.documents) {
                console.log('📄 Documents type:', typeof profile.documents);
                console.log('📄 Raw documents:', profile.documents);
                
                // Check if already parsed (object/array) or needs parsing (string)
                const parsedDocs = typeof profile.documents === 'string' 
                    ? JSON.parse(profile.documents) 
                    : profile.documents;
                    
                console.log('📄 Parsed documents:', parsedDocs);
                
                // Check if it's an array (new format) or object (old format)
                if (Array.isArray(parsedDocs)) {
                    // Keep as array to display all documents dynamically
                    documentsArray = parsedDocs;
                    console.log(`📄 Found ${documentsArray.length} documents in array format`);
                } else if (typeof parsedDocs === 'object' && parsedDocs !== null) {
                    // Convert object format to array
                    documentsArray = Object.keys(parsedDocs).map(key => ({
                        type: key,
                        data: parsedDocs[key].data || parsedDocs[key],
                        fileName: parsedDocs[key].fileName || `${key}.pdf`,
                        uploadDate: parsedDocs[key].uploadDate || 'N/A'
                    }));
                    console.log(`📄 Converted ${documentsArray.length} documents from object format`);
                }
                
                // Log each document for debugging
                documentsArray.forEach((doc, index) => {
                    console.log(`📄 Document ${index + 1}:`, {
                        type: doc.type,
                        fileName: doc.fileName,
                        hasData: !!doc.data,
                        dataPreview: doc.data ? doc.data.substring(0, 50) : 'No data'
                    });
                });
            }
        } catch (e) {
            console.error('❌ Could not parse documents JSON:', e);
        }

        // Parse qualifications JSON
        let qualifications = [];
        try {
            if (profile?.qualifications) {
                qualifications = typeof profile.qualifications === 'string' 
                    ? JSON.parse(profile.qualifications) 
                    : (Array.isArray(profile.qualifications) ? profile.qualifications : []);
            }
        } catch (e) {
            console.warn('Could not parse qualifications JSON:', e);
        }

        // Parse experiences JSON
        let experiences = [];
        try {
            if (profile?.experiences) {
                experiences = typeof profile.experiences === 'string' 
                    ? JSON.parse(profile.experiences) 
                    : (Array.isArray(profile.experiences) ? profile.experiences : []);
            }
        } catch (e) {
            console.warn('Could not parse experiences JSON:', e);
        }

        // Parse skills JSON
        let skills = [];
        try {
            if (profile?.skills) {
                skills = typeof profile.skills === 'string' 
                    ? JSON.parse(profile.skills) 
                    : (Array.isArray(profile.skills) ? profile.skills : []);
            }
        } catch (e) {
            console.warn('Could not parse skills JSON:', e);
        }

        const modalHTML = `
            <div class="modal-overlay" id="jobseekerProfileModal" onclick="if(event.target === this) this.remove()">
                <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>📄 Jobseeker Profile</h2>
                        <button class="modal-close" onclick="document.getElementById('jobseekerProfileModal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <!-- Personal Information -->
                        <section class="profile-section">
                            <h3>👤 Personal Information</h3>
                            <div class="profile-grid">
                                <div class="profile-item">
                                    <strong>Name:</strong> ${jobseeker.name}
                                </div>
                                <div class="profile-item">
                                    <strong>Email:</strong> ${jobseeker.email}
                                </div>
                                <div class="profile-item">
                                    <strong>Phone:</strong> ${jobseeker.phone || 'Not provided'}
                                </div>
                                <div class="profile-item">
                                    <strong>Cell:</strong> ${profile?.cellNumber || 'Not provided'}
                                </div>
                                <div class="profile-item">
                                    <strong>Gender:</strong> ${profile?.gender || 'Not specified'}
                                </div>
                                <div class="profile-item">
                                    <strong>Race:</strong> ${profile?.race || 'Not specified'}
                                </div>
                                <div class="profile-item">
                                    <strong>ID Number:</strong> ${profile?.idNumber || 'Not provided'}
                                </div>
                                <div class="profile-item">
                                    <strong>Language:</strong> ${profile?.language || 'Not specified'}
                                </div>
                            </div>
                        </section>

                        <!-- Location -->
                        <section class="profile-section">
                            <h3>📍 Location</h3>
                            <div class="profile-grid">
                                <div class="profile-item">
                                    <strong>Province:</strong> ${profile?.province || 'Not specified'}
                                </div>
                                <div class="profile-item">
                                    <strong>Town:</strong> ${profile?.town || 'Not specified'}
                                </div>
                                <div class="profile-item">
                                    <strong>Suburb:</strong> ${profile?.suburb || 'Not specified'}
                                </div>
                            </div>
                        </section>

                        <!-- Employment Details -->
                        <section class="profile-section">
                            <h3>💼 Employment Details</h3>
                            <div class="profile-grid">
                                <div class="profile-item">
                                    <strong>Title:</strong> ${jobseeker.title}
                                </div>
                                <div class="profile-item">
                                    <strong>Industry:</strong> ${jobseeker.industry}
                                </div>
                                <div class="profile-item">
                                    <strong>Transport:</strong> ${profile?.transport || 'Not specified'}
                                </div>
                                <div class="profile-item">
                                    <strong>Driver's License:</strong> ${profile?.driversLicense || 'No'}
                                </div>
                            </div>
                        </section>

                        <!-- Skills -->
                        ${skills.length > 0 ? `
                        <section class="profile-section">
                            <h3>🎯 Skills</h3>
                            <div class="skills-container">
                                ${skills.map(skill => `<span class="skill-badge">${skill}</span>`).join('')}
                            </div>
                        </section>
                        ` : ''}

                        <!-- Qualifications -->
                        ${qualifications.length > 0 ? `
                        <section class="profile-section">
                            <h3>🎓 Qualifications</h3>
                            ${qualifications.map(qual => `
                                <div class="qualification-item">
                                    <strong>${qual.qualification || qual.degree || 'Qualification'}</strong>
                                    ${qual.institution ? `<br><em>${qual.institution}</em>` : ''}
                                    ${qual.year ? `<br>Year: ${qual.year}` : ''}
                                </div>
                            `).join('')}
                        </section>
                        ` : ''}

                        <!-- Experience -->
                        ${experiences.length > 0 ? `
                        <section class="profile-section">
                            <h3>💼 Work Experience</h3>
                            ${experiences.map(exp => `
                                <div class="experience-item">
                                    <strong>${exp.position || exp.title || 'Position'}</strong>
                                    ${exp.company ? ` at ${exp.company}` : ''}
                                    ${exp.duration || exp.period ? `<br><em>${exp.duration || exp.period}</em>` : ''}
                                    ${exp.description ? `<br>${exp.description}` : ''}
                                </div>
                            `).join('')}
                        </section>
                        ` : ''}

                        <!-- Documents & Downloads -->
                        <section class="profile-section">
                            <h3>📎 Documents & Downloads</h3>
                            <div class="documents-grid">
                                ${profile?.fullPicture ? `
                                    <div class="document-item">
                                        <strong>📷 Full Picture:</strong>
                                        <a href="${profile.fullPicture}" download="full_picture_${jobseeker.id}.jpg" class="btn btn-sm btn-download">Download</a>
                                    </div>
                                ` : ''}
                                ${profile?.halfPicture ? `
                                    <div class="document-item">
                                        <strong>📷 Half Picture:</strong>
                                        <a href="${profile.halfPicture}" download="half_picture_${jobseeker.id}.jpg" class="btn btn-sm btn-download">Download</a>
                                    </div>
                                ` : ''}
                                ${documentsArray.length > 0 ? documentsArray.map(doc => {
                                    // Map document types to icons
                                    const iconMap = {
                                        'CV': '📄',
                                        'Cover Letter': '📝',
                                        'ID Copy': '🪪',
                                        'Matric Certificate': '🎓',
                                        'Qualification Document': '📜',
                                        "Driver's License": '🚗',
                                        'Proof of Address': '🏠'
                                    };
                                    const icon = iconMap[doc.type] || '�';
                                    const fileName = doc.fileName || `${doc.type.replace(/\s+/g, '_')}_${jobseeker.id}.pdf`;
                                    
                                    return `
                                        <div class="document-item">
                                            <strong>${icon} ${doc.type}:</strong>
                                            ${doc.fileName ? `<span class="doc-name">${doc.fileName}</span>` : ''}
                                            <a href="${doc.data}" download="${fileName}" class="btn btn-sm btn-download">Download</a>
                                        </div>
                                    `;
                                }).join('') : ''}
                            </div>
                            ${!profile?.fullPicture && !profile?.halfPicture && documentsArray.length === 0 ? 
                                '<p class="no-data">No documents uploaded yet</p>' : ''}
                        </section>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('jobseekerProfileModal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.getElementById('jobseekerProfileModal');
        if (existingModal) existingModal.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    filterApplications() {
        const jobFilter = document.getElementById('app-job-filter').value;
        const statusFilter = document.getElementById('app-status-filter').value;

        let filtered = this.currentApplications;

        if (jobFilter) {
            filtered = filtered.filter(app => app.jobId == jobFilter);
        }

        if (statusFilter) {
            filtered = filtered.filter(app => app.status === statusFilter);
        }

        const temp = this.currentApplications;
        this.currentApplications = filtered;
        this.displayApplications();
        this.currentApplications = temp;
    }

    updateJobFilters() {
        const appJobFilter = document.getElementById('app-job-filter');
        const currentValue = appJobFilter.value;
        
        appJobFilter.innerHTML = '<option value="">All Jobs</option>' +
            this.currentJobs.map(job => 
                `<option value="${job.id}">${job.title}</option>`
            ).join('');
        
        if (currentValue) {
            appJobFilter.value = currentValue;
        }
    }

    viewJobApplications(jobId) {
        // Filter applications for this job and show applications section
        document.getElementById('app-job-filter').value = jobId;
        this.filterApplications();
        this.showSection('applications');
    }

    // ============ TASK MANAGEMENT ============
    
    // ===== TASK MANAGEMENT METHODS =====
    
    async loadTasks() {
        console.log('Loading tasks for current user...');
        
        try {
            const response = await fetch(`${this.BASE_API}/tasks/my-tasks`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.allTasks = data.tasks || [];
                console.log(`Loaded ${this.allTasks.length} tasks`);
                this.currentTaskFilter = this.currentTaskFilter || 'pending';
                this.updateTaskCounts();
                this.displayTasksByStatus(this.currentTaskFilter);
            } else {
                console.error('Failed to load tasks:', response.status);
                this.allTasks = [];
                this.displayTasksByStatus('pending');
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.allTasks = [];
            this.displayTasksByStatus('pending');
        }
    }

    updateTaskCounts() {
        const counts = {
            pending: 0,
            in_progress: 0,
            completed: 0,
            returned: 0
        };

        this.allTasks.forEach(task => {
            if (counts[task.status] !== undefined) {
                counts[task.status]++;
            }
        });

        // Update badge counts
        Object.keys(counts).forEach(status => {
            const badge = document.getElementById(`task-count-${status}`);
            if (badge) {
                badge.textContent = counts[status];
            }
        });
    }

    switchTaskTab(status) {
        console.log('Switching to tab:', status);
        this.currentTaskFilter = status;
        
        // Update active tab
        document.querySelectorAll('.task-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`).classList.add('active');
        
        this.displayTasksByStatus(status);
    }

    displayTasksByStatus(status) {
        const tasksList = document.getElementById('tasks-list');
        const filteredTasks = this.allTasks.filter(task => task.status === status);
        
        if (filteredTasks.length === 0) {
            const messages = {
                pending: 'No pending tasks',
                in_progress: 'No tasks in progress',
                completed: 'No completed tasks',
                returned: 'No returned tasks'
            };
            tasksList.innerHTML = `<p class="no-data">${messages[status]}</p>`;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const priorityClass = task.priority || 'medium';
        const statusClass = task.status || 'pending';
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
        const assignedBy = task.assignedBy ? 
            `${task.assignedBy.firstName} ${task.assignedBy.lastName}` : 'Management';
        
        // Check if overdue
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        const dueDateClass = isOverdue ? 'text-danger' : '';

        return `
            <div class="task-card priority-${priorityClass}">
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <div class="task-badges">
                        <span class="task-priority ${priorityClass}">${priorityClass.toUpperCase()}</span>
                        <span class="task-status-badge ${statusClass}">
                            ${statusClass.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <p class="task-description">${task.description || 'No description'}</p>
                
                <div class="task-meta">
                    <p><strong>Assigned by:</strong> ${assignedBy}</p>
                    <p class="${dueDateClass}">
                        <strong>Due:</strong> ${dueDate}
                        ${isOverdue ? ' ⚠️ <span style="color: #dc2626;">OVERDUE</span>' : ''}
                    </p>
                    ${task.relatedJobId ? `<p><strong>Related Job:</strong> #${task.relatedJobId}</p>` : ''}
                </div>

                ${task.returnReason ? `
                <div class="task-notes" style="background: #fee2e2; border-left-color: #dc2626;">
                    <strong>Return Reason:</strong> ${task.returnReason}
                </div>
                ` : ''}
                
                <div class="task-card-footer">
                    <button class="btn btn-sm btn-primary" onclick="employerDashboard.openTaskModal(${task.id})">
                        📋 View Details
                    </button>
                </div>
            </div>
        `;
    }

    openTaskModal(taskId) {
        const task = this.allTasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentTask = task;
        
        // Populate modal
        document.getElementById('task-modal-title').textContent = task.title;
        document.getElementById('task-modal-priority').className = `task-priority ${task.priority}`;
        document.getElementById('task-modal-priority').textContent = task.priority.toUpperCase();
        document.getElementById('task-modal-status').className = `task-status-badge ${task.status}`;
        document.getElementById('task-modal-status').textContent = task.status.replace('_', ' ').toUpperCase();
        
        const assignedBy = task.assignedBy ? 
            `${task.assignedBy.firstName} ${task.assignedBy.lastName}` : 'Management';
        document.getElementById('task-modal-assigned-by').textContent = assignedBy;
        
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
        document.getElementById('task-modal-due-date').textContent = dueDate;
        document.getElementById('task-modal-description').textContent = task.description || 'No description';
        
        // Load notes
        document.getElementById('task-notes').value = task.notes || '';
        
        // Load checklist
        this.displayChecklist(task.checklist || []);
        
        // Show modal
        document.getElementById('task-modal').style.display = 'flex';
    }

    closeTaskModal() {
        document.getElementById('task-modal').style.display = 'none';
        this.currentTask = null;
    }

    displayChecklist(checklist) {
        const container = document.getElementById('task-checklist');
        
        if (!checklist || checklist.length === 0) {
            container.innerHTML = '<p style="color: #6b7280; font-size: 0.875rem;">No checklist items yet</p>';
            return;
        }

        container.innerHTML = checklist.map((item, index) => `
            <div class="checklist-item ${item.completed ? 'completed' : ''}">
                <input type="checkbox" 
                       id="check-${index}" 
                       ${item.completed ? 'checked' : ''}
                       onchange="employerDashboard.toggleChecklistItem(${index})">
                <label for="check-${index}">${item.text}</label>
                <button onclick="employerDashboard.removeChecklistItem(${index})">Remove</button>
            </div>
        `).join('');
    }

    async addChecklistItem() {
        const input = document.getElementById('new-checklist-item');
        const text = input.value.trim();
        
        if (!text) {
            showAlert('Error', 'Please enter a checklist item');
            return;
        }

        const checklist = this.currentTask.checklist || [];
        checklist.push({
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        });

        await this.saveChecklist(checklist);
        input.value = '';
    }

    async toggleChecklistItem(index) {
        const checklist = [...(this.currentTask.checklist || [])];
        checklist[index].completed = !checklist[index].completed;
        await this.saveChecklist(checklist);
    }

    async removeChecklistItem(index) {
        const checklist = [...(this.currentTask.checklist || [])];
        checklist.splice(index, 1);
        await this.saveChecklist(checklist);
    }

    async saveChecklist(checklist) {
        try {
            const response = await fetch(`${this.BASE_API}/tasks/${this.currentTask.id}/checklist`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ checklist })
            });

            if (response.ok) {
                this.currentTask.checklist = checklist;
                this.displayChecklist(checklist);
                await this.loadTasks(); // Refresh task list
            } else {
                showAlert('Error', 'Failed to update checklist');
            }
        } catch (error) {
            console.error('Save checklist error:', error);
            showAlert('Error', 'Failed to update checklist');
        }
    }

    async saveTaskNotes() {
        const notes = document.getElementById('task-notes').value.trim();
        
        try {
            const response = await fetch(`${this.BASE_API}/tasks/${this.currentTask.id}/notes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notes })
            });

            if (response.ok) {
                this.currentTask.notes = notes;
                showAlert('Success', 'Notes saved successfully');
                await this.loadTasks();
            } else {
                showAlert('Error', 'Failed to save notes');
            }
        } catch (error) {
            console.error('Save notes error:', error);
            showAlert('Error', 'Failed to save notes');
        }
    }

    async updateTaskStatus(newStatus) {
        if (!this.currentTask) return;

        // Determine button context - if called from modal
        const currentStatus = this.currentTask.status;
        let targetStatus = newStatus;

        // Smart status transitions
        if (currentStatus === 'pending' && newStatus === 'in_progress') {
            targetStatus = 'in_progress';
        } else if (currentStatus === 'in_progress' && newStatus === 'completed') {
            targetStatus = 'completed';
        } else if (currentStatus === 'returned' && newStatus === 'in_progress') {
            targetStatus = 'in_progress';
        }

        try {
            const response = await fetch(`${this.BASE_API}/tasks/${this.currentTask.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: targetStatus })
            });

            if (response.ok) {
                const messages = {
                    in_progress: '🔄 Task started',
                    completed: '✅ Task completed',
                    pending: '⏳ Task moved to pending'
                };
                showAlert('Success', messages[targetStatus] || 'Task updated');
                this.closeTaskModal();
                await this.loadTasks();
            } else {
                const error = await response.json();
                showAlert('Error', error.error || 'Failed to update task');
            }
        } catch (error) {
            console.error('Update status error:', error);
            showAlert('Error', 'Failed to update task status');
        }
    }

    returnTask() {
        const reason = prompt('Please explain why you are returning this task to the manager:');
        
        if (!reason || reason.trim().length === 0) {
            showAlert('Error', 'Return reason is required');
            return;
        }

        this.submitReturnTask(reason.trim());
    }

    async submitReturnTask(returnReason) {
        try {
            const response = await fetch(`${this.BASE_API}/tasks/${this.currentTask.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    status: 'returned',
                    returnReason: returnReason
                })
            });

            if (response.ok) {
                showAlert('Success', '↩️ Task returned to manager');
                this.closeTaskModal();
                await this.loadTasks();
            } else {
                const error = await response.json();
                showAlert('Error', error.error || 'Failed to return task');
            }
        } catch (error) {
            console.error('Return task error:', error);
            showAlert('Error', 'Failed to return task');
        }
    }

    async loadProfile() {
        if (this.currentUser.EmployerProfile) {
            const profile = this.currentUser.EmployerProfile;
            document.getElementById('profile-department').value = profile.department || '';
            document.getElementById('profile-contact').value = profile.contactNumber || '';
            document.getElementById('profile-job-title').value = profile.jobTitle || '';
        }
    }

    async submitProfileForm() {
        const profileData = {
            department: document.getElementById('profile-department').value,
            contactNumber: document.getElementById('profile-contact').value,
            jobTitle: document.getElementById('profile-job-title').value
        };

        try {
            const response = await fetch(`${this.API_BASE}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                showAlert('Success', 'Profile updated successfully!');
                const session = await this.checkSession();
                if (session) {
                    this.currentUser = session.user;
                }
            } else {
                showAlert('Error', 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showAlert('Error', 'Failed to update profile');
        }
    }

    // User Management Functions
    async loadUsers() {
        try {
            const response = await fetch(`${this.API_BASE}/users`, {
                credentials: 'include'
            });

            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
            } else {
                showAlert('Error', 'Failed to load HR users');
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            showAlert('Error', 'Failed to load HR users');
        }
    }

    displayUsers(users) {
        const container = document.getElementById('users-list');
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-data">No HR users found</p>';
            return;
        }

        // Create table
        let tableHTML = `
            <table id="users-table" class="users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Permissions</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const profile = user.EmployerProfile || {};
            const permissions = [];
            if (profile.canPostJobs) permissions.push('📝 Post Jobs');
            if (profile.canManageApplications) permissions.push('📋 Manage Apps');
            if (profile.canManageUsers) permissions.push('👥 Manage Users');

            // Check if user has no permissions (pending approval)
            const isPending = !profile.canPostJobs && !profile.canManageApplications && !profile.canManageUsers;
            const permissionsDisplay = isPending 
                ? '<span class="pending-approval">⏳ Pending Approval</span>' 
                : (permissions.join(', ') || 'None');

            tableHTML += `
                <tr class="${isPending ? 'pending-user' : ''}">
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge role-${user.hrRole?.toLowerCase()}">${user.hrRole || 'Staff'}</span></td>
                    <td>${profile.department || 'N/A'}</td>
                    <td class="permissions-cell">${permissionsDisplay}</td>
                    <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td class="actions-cell">
                        <button class="btn-small btn-primary" onclick="employerDashboard.editUserPermissions(${user.id})" title="Edit permissions and role">
                            ${isPending ? '✅ Grant Access' : '✏️ Edit'}
                        </button>
                        <button class="btn-small ${user.isActive ? 'btn-danger' : 'btn-success'}" 
                                onclick="employerDashboard.toggleUserStatus(${user.id}, ${!user.isActive})"
                                title="${user.isActive ? 'Deactivate' : 'Activate'} user account">
                            ${user.isActive ? '🚫 Deactivate' : '✅ Activate'}
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    async editUserPermissions(userId) {
        try {
            const response = await fetch(`${this.API_BASE}/users`, {
                credentials: 'include'
            });

            if (response.ok) {
                const users = await response.json();
                const user = users.find(u => u.id === userId);
                
                if (user) {
                    document.getElementById('edit-user-id').value = user.id;
                    document.getElementById('edit-user-name').textContent = `${user.first_name} ${user.last_name}`;
                    document.getElementById('edit-user-email').textContent = user.email;
                    document.getElementById('edit-user-department').textContent = user.EmployerProfile?.department || 'N/A';
                    document.getElementById('edit-user-role').value = user.hrRole || 'Staff';
                    document.getElementById('edit-can-post-jobs').checked = user.EmployerProfile?.canPostJobs || false;
                    document.getElementById('edit-can-manage-applications').checked = user.EmployerProfile?.canManageApplications || false;
                    document.getElementById('edit-can-manage-users').checked = user.EmployerProfile?.canManageUsers || false;
                    
                    document.getElementById('permissionsModal').classList.add('show');
                }
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            showAlert('Error', 'Failed to load user details');
        }
    }

    // Permission preset functions
    applyPreset(presetType) {
        const postJobs = document.getElementById('edit-can-post-jobs');
        const manageApps = document.getElementById('edit-can-manage-applications');
        const manageUsers = document.getElementById('edit-can-manage-users');
        const roleSelect = document.getElementById('edit-user-role');

        switch(presetType) {
            case 'full':
                // Full Access - Administrator
                roleSelect.value = 'Administrator';
                postJobs.checked = true;
                manageApps.checked = true;
                manageUsers.checked = true;
                break;
            
            case 'recruitment':
                // Recruitment Staff - Can post jobs and manage applications
                roleSelect.value = 'Recruitment';
                postJobs.checked = true;
                manageApps.checked = true;
                manageUsers.checked = false;
                break;
            
            case 'hr':
                // HR Staff - Can manage applications only
                roleSelect.value = 'Human Resource';
                postJobs.checked = false;
                manageApps.checked = true;
                manageUsers.checked = false;
                break;
            
            case 'readonly':
                // View Only - No permissions
                postJobs.checked = false;
                manageApps.checked = false;
                manageUsers.checked = false;
                break;
        }

        // Visual feedback
        showAlert('Preset Applied', `${presetType.charAt(0).toUpperCase() + presetType.slice(1)} permissions have been set. Click "Save Changes" to apply.`);
    }

    async saveUserPermissions() {
        const userId = document.getElementById('edit-user-id').value;
        const permissionsData = {
            hrRole: document.getElementById('edit-user-role').value,
            canPostJobs: document.getElementById('edit-can-post-jobs').checked,
            canManageApplications: document.getElementById('edit-can-manage-applications').checked,
            canManageUsers: document.getElementById('edit-can-manage-users').checked
        };

        try {
            const response = await fetch(`${this.API_BASE}/users/${userId}/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(permissionsData)
            });

            if (response.ok) {
                showAlert('Success', 'User permissions updated successfully!');
                closePermissionsModal();
                this.loadUsers();
            } else {
                const error = await response.json();
                showAlert('Error', error.message || 'Failed to update permissions');
            }
        } catch (error) {
            console.error('Failed to update permissions:', error);
            showAlert('Error', 'Failed to update permissions');
        }
    }

    async toggleUserStatus(userId, newStatus) {
        const action = newStatus ? 'activate' : 'deactivate';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const response = await fetch(`${this.API_BASE}/users/${userId}/toggle-status`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                showAlert('Success', `User ${action}d successfully!`);
                this.loadUsers();
            } else {
                const error = await response.json();
                showAlert('Error', error.message || `Failed to ${action} user`);
            }
        } catch (error) {
            console.error(`Failed to ${action} user:`, error);
            showAlert('Error', `Failed to ${action} user`);
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Highlight active nav button
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(sectionName.replace('-', ' '))) {
                btn.classList.add('active');
            }
        });

        // Load data when showing specific sections
        if (sectionName === 'users') {
            this.loadUsers();
        }
        if (sectionName === 'jobseekers') {
            this.loadJobseekers();
        }
        if (sectionName === 'overview') {
            this.loadStats(); // Refresh stats when returning to overview
        }
        if (sectionName === 'tasks') {
            this.loadTasks(); // Load tasks when showing tasks section
        }
    }

    async logout() {
        if (!confirm('Are you sure you want to logout?')) return;

        try {
            const response = await fetch(`${this.API_BASE}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = 'employer_portal.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// Utility functions
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('show');
}

function closeAlert() {
    document.getElementById('alertModal').classList.remove('show');
}

function closeCandidateModal() {
    document.getElementById('candidateModal').classList.remove('show');
}

function closePermissionsModal() {
    document.getElementById('permissionsModal').classList.remove('show');
}

// Initialize dashboard and make it globally accessible
window.employerDashboard = null;
document.addEventListener('DOMContentLoaded', () => {
    window.employerDashboard = new EmployerDashboard();
    console.log('✅ Employer Dashboard initialized and globally accessible');
});
