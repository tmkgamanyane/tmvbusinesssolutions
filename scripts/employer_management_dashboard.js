// Management Dashboard JavaScript

class ManagementDashboard {
    constructor() {
        this.currentUser = null;
        this.tasks = [];
        this.pendingJobs = [];
        this.team = [];
        this.currentFilter = 'all';
        this.currentJobId = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.setupNavigation();
        await this.loadDashboardData();
        
        // Initialize action card handlers if extended features are loaded
        if (this.initializeActionCards && typeof this.initializeActionCards === 'function') {
            this.initializeActionCards();
        }
        
        // Load team with statistics on initial load
        if (this.loadTeamWithStats && typeof this.loadTeamWithStats === 'function') {
            await this.loadTeamWithStats();
        }
        
        // Load job postings on initial load
        if (this.loadJobPostings && typeof this.loadJobPostings === 'function') {
            await this.loadJobPostings();
        }
        
        // Load applications on initial load
        if (this.loadApplications && typeof this.loadApplications === 'function') {
            await this.loadApplications();
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/employer/me', {
                credentials: 'include'
            });

            if (!response.ok) {
                // User not authenticated, redirect to login
                window.location.href = '/pages/employer_portal.html';
                return;
            }

            const data = await response.json();

            if (!data.user) {
                window.location.href = '/pages/employer_portal.html';
                return;
            }

            // Check if user has management role
            if (data.user.role !== 'management') {
                // Redirect to appropriate dashboard based on role
                this.redirectToDashboard(data.user.role);
                return;
            }

            this.currentUser = data.user;
            console.log('👤 Current User:', this.currentUser);
            console.log('🔐 User Permissions:', this.currentUser.permissions);
            console.log('✅ canApproveJobs:', this.currentUser.permissions?.canApproveJobs);
            
            document.getElementById('userName').textContent = `${data.user.firstName} ${data.user.lastName}` || 'Manager';
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = '/pages/employer_portal.html';
        }
    }

    redirectToDashboard(role) {
        switch(role) {
            case 'administrator':
                window.location.href = '/pages/admin_dashboard.html';
                break;
            case 'hr_recruitment':
                window.location.href = '/pages/employer_dashboard.html';
                break;
            default:
                window.location.href = '/pages/employer_portal.html';
        }
    }

    // Utility function to escape HTML and prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Assign Task
        const assignBtn = document.getElementById('assignTaskBtn');
        if (assignBtn) {
            console.log('✅ Assign Task button found, attaching listener');
            assignBtn.addEventListener('click', () => {
                console.log('🖱️ Assign Task button clicked!');
                this.openAssignTaskModal();
            });
        } else {
            console.error('❌ assignTaskBtn not found in DOM!');
        }
        
        document.getElementById('cancelAssignTask').addEventListener('click', () => this.closeAssignTaskModal());
        document.getElementById('assignTaskForm').addEventListener('submit', (e) => this.handleAssignTask(e));

        // Create Job Button
        const createJobBtn = document.getElementById('createJobBtn');
        if (createJobBtn) {
            console.log('✅ Create Job button found, attaching listener');
            createJobBtn.addEventListener('click', () => {
                console.log('🖱️ Create Job button clicked!');
                this.showCreateJobModal();
            });
        }

        // Job Review
        document.getElementById('cancelJobReview').addEventListener('click', () => this.closeJobDetailsModal());
        document.getElementById('approveJobBtn').addEventListener('click', () => this.approveJob());
        document.getElementById('rejectJobBtn').addEventListener('click', () => this.rejectJob());

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.displayTasks();
            });
        });

        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeAssignTaskModal();
                this.closeJobDetailsModal();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAssignTaskModal();
                this.closeJobDetailsModal();
            }
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });
    }

    showSection(sectionId) {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });

        // Update sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });

        // Load section data if needed
        if (sectionId === 'team') {
            this.loadTeam();
        } else if (sectionId === 'permissions') {
            this.loadPermissionsUsers();
        } else if (sectionId === 'job-posting') {
            this.loadJobPostings();
        } else if (sectionId === 'review-jobs') {
            this.loadReviewHistory();
        } else if (sectionId === 'applications') {
            this.loadApplications();
        } else if (sectionId === 'reporting') {
            this.loadReports();
        } else if (sectionId === 'analytics') {
            this.loadAnalyticsData();
        } else if (sectionId === 'management') {
            this.loadManagementData();
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadTasks(),
            this.loadPendingJobs(),
            this.loadTeam(), // Load team members for display and dropdowns
            this.loadAnalytics()
        ]);
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/management/tasks', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to load tasks');

            const data = await response.json();
            this.tasks = data.tasks;
            this.displayTasks();
            this.updateTaskStats();
        } catch (error) {
            console.error('Load tasks error:', error);
            document.getElementById('tasksContainer').innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-circle"></i> Failed to load tasks
                </div>
            `;
        }
    }

    displayTasks() {
        const container = document.getElementById('tasksContainer');
        let filteredTasks = this.tasks;

        if (this.currentFilter !== 'all') {
            filteredTasks = this.tasks.filter(task => task.status === this.currentFilter);
        }

        if (!filteredTasks || filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-tasks"></i> No tasks found
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTasks.map(task => `
            <div class="task-card priority-${task.priority}">
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <span class="task-priority priority-${task.priority}">${task.priority}</span>
                </div>
                <div class="task-meta">
                    ${task.description ? `<p>${task.description}</p>` : ''}
                    <div><i class="fas fa-user"></i> ${task.assignedTo?.name || 'Unassigned'}</div>
                    ${task.dueDate ? `<div><i class="fas fa-calendar"></i> Due: ${new Date(task.dueDate).toLocaleDateString()}</div>` : ''}
                    <div><i class="fas fa-info-circle"></i> <span class="task-status status-${task.status}">${this.formatStatus(task.status)}</span></div>
                </div>
            </div>
        `).join('');
    }

    updateTaskStats() {
        const activeTasks = this.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;

        document.getElementById('activeTasks').textContent = activeTasks;
        document.getElementById('completedTasks').textContent = completed;
    }

    async loadPendingJobs() {
        try {
            const response = await fetch('/api/management/jobs/pending', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to load pending jobs');

            const data = await response.json();
            this.pendingJobs = data.jobs;
            this.displayPendingJobs();
            document.getElementById('pendingJobs').textContent = this.pendingJobs.length;
        } catch (error) {
            console.error('Load pending jobs error:', error);
            document.getElementById('pendingJobsContainer').innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-circle"></i> Failed to load pending jobs
                </div>
            `;
        }
    }

    displayPendingJobs() {
        const container = document.getElementById('pendingJobsContainer');

        if (!this.pendingJobs || this.pendingJobs.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-check-circle"></i> No pending job approvals
                </div>
            `;
            return;
        }

        container.innerHTML = this.pendingJobs.map(job => `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <div class="job-title">${job.title}</div>
                        <p>${job.companyName}</p>
                    </div>
                </div>
                <div class="job-meta">
                    <div><i class="fas fa-map-marker-alt"></i> ${job.location}</div>
                    <div><i class="fas fa-briefcase"></i> ${job.jobType}</div>
                    <div><i class="fas fa-user"></i> Posted by: ${job.createdBy?.name || 'Unknown'}</div>
                    <div><i class="fas fa-calendar"></i> ${new Date(job.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="job-actions">
                    <button class="btn-secondary" onclick="managementDashboard.viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadTeam() {
        try {
            console.log('📋 Loading team members...');
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to load team');

            const data = await response.json();
            console.log('✅ Received user data:', data);
            console.log('👥 Total users from API:', data.users?.length || 0);
            
            // Store ALL employer users (the API already returns only employer users)
            this.team = data.users || [];
            console.log('📊 Team members loaded:', this.team.length);
            console.log('👤 Sample user structure:', this.team[0]);
            
            this.displayTeam();
            document.getElementById('teamSize').textContent = this.team.length;
        } catch (error) {
            console.error('Load team error:', error);
            document.getElementById('teamContainer').innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-circle"></i> Failed to load team
                </div>
            `;
        }
    }

    displayTeam() {
        const container = document.getElementById('teamContainer');

        if (!this.team || this.team.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-users"></i> No team members found
                </div>
            `;
            return;
        }

        // Count users by role
        const roleCounts = {
            administrator: 0,
            management: 0,
            hr_recruitment: 0
        };
        
        this.team.forEach(member => {
            if (roleCounts.hasOwnProperty(member.employerRole)) {
                roleCounts[member.employerRole]++;
            }
        });

        // Add role count summary at the top
        const summaryHtml = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); grid-column: 1 / -1;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.2rem;">
                    <i class="fas fa-users"></i> User Management
                </h3>
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">Total Users:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${this.team.length}</span>
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">Administrators:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${roleCounts.administrator}</span>
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">Management:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${roleCounts.management}</span>
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">HR & Recruitment:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${roleCounts.hr_recruitment}</span>
                    </div>
                </div>
            </div>
        `;

        const membersHtml = this.team.map(member => {
            // Get role display name and styling
            let roleDisplay = 'Employee';
            let roleClass = 'hr_recruitment';
            let roleColor = '#6366f1';
            
            if (member.employerRole === 'administrator') {
                roleDisplay = 'Administrator';
                roleClass = 'administrator';
                roleColor = '#dc2626';
            } else if (member.employerRole === 'management') {
                roleDisplay = 'Management';
                roleClass = 'management';
                roleColor = '#f59e0b';
            } else if (member.employerRole === 'hr_recruitment') {
                roleDisplay = 'HR & Recruitment';
                roleClass = 'hr_recruitment';
                roleColor = '#6366f1';
            }

            const fullName = `${member.firstName} ${member.lastName}`;

            return `
                <div class="team-card" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; transition: all 0.3s;">
                    <div class="team-avatar" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, ${roleColor}, ${roleColor}dd); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 1rem;">
                        ${this.getInitials(fullName)}
                    </div>
                    <div class="team-name" style="font-weight: 600; font-size: 1.1rem; color: #1e293b; text-align: center; margin-bottom: 0.5rem;">
                        ${fullName}
                    </div>
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span class="role-badge ${roleClass}" style="background: ${roleColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; display: inline-block;">${roleDisplay}</span>
                    </div>
                    <div style="color: #64748b; font-size: 0.9rem; text-align: center; margin-bottom: 1rem;">
                        <p style="margin: 0.25rem 0;"><strong>Email:</strong> ${member.email}</p>
                        <p style="margin: 0.25rem 0;"><strong>Department:</strong> ${member.department || 'N/A'}</p>
                        <p style="margin: 0.25rem 0;"><strong>Job Title:</strong> ${member.jobTitle || 'N/A'}</p>
                    </div>
                    <div class="team-stats" style="display: flex; justify-content: space-around; padding-top: 1rem; border-top: 2px solid #e2e8f0; margin-bottom: 1rem;">
                        <div class="team-stat" style="text-align: center;">
                            <div class="team-stat-value" style="font-size: 1.5rem; font-weight: bold; color: ${roleColor};">${this.getTaskCount(member.userId)}</div>
                            <div class="team-stat-label" style="font-size: 0.75rem; color: #64748b;">Tasks</div>
                        </div>
                        <div class="team-stat" style="text-align: center;">
                            <div class="team-stat-value" style="font-size: 1.5rem; font-weight: bold; color: ${member.isActive ? '#10b981' : '#ef4444'};">${member.isActive ? '✓' : '✗'}</div>
                            <div class="team-stat-label" style="font-size: 0.75rem; color: #64748b;">Active</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button onclick="managementDashboard.editUserPermissions(${member.userId})" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.3s;">
                            <i class="fas fa-user-shield"></i> Edit
                        </button>
                        <button onclick="managementDashboard.confirmDeleteUser(${member.userId}, '${fullName.replace(/'/g, "\\'")}', '${member.email}')" style="background: #ef4444; color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.3s;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = summaryHtml + membersHtml;
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    getTaskCount(userId) {
        return this.tasks.filter(t => t.assignedTo?.id === userId && t.status !== 'completed').length;
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/admin/analytics', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.updateAnalytics(data);
            }
        } catch (error) {
            console.error('Load analytics error:', error);
        }
    }

    updateAnalytics(data) {
        // Update overview stats
        if (data.tasks) {
            const activeTasks = data.tasks.pending + data.tasks.inProgress;
            document.getElementById('activeTasks').textContent = activeTasks;
            document.getElementById('completedTasks').textContent = data.tasks.completedThisWeek || 0;
        }

        if (data.jobs) {
            document.getElementById('pendingJobs').textContent = data.jobs.pendingApproval || 0;
        }

        // Update Team Overview H section stats
        if (document.getElementById('totalTeamMembers')) {
            document.getElementById('totalTeamMembers').textContent = data.users?.total || 0;
        }
        if (document.getElementById('totalTasksAssigned')) {
            document.getElementById('totalTasksAssigned').textContent = data.tasks?.total || 0;
        }
        if (document.getElementById('totalJobsManaged')) {
            document.getElementById('totalJobsManaged').textContent = data.jobs?.total || 0;
        }
        if (document.getElementById('totalApplicationsHandled')) {
            document.getElementById('totalApplicationsHandled').textContent = data.applications?.total || 0;
        }

        // Update analytics section if elements exist
        if (document.getElementById('completionRate')) {
            document.getElementById('completionRate').textContent = `${data.tasks?.completionRate || 0}%`;
        }
        
        if (document.getElementById('totalJobsPosted')) {
            document.getElementById('totalJobsPosted').textContent = data.jobs?.total || 0;
        }
        
        if (document.getElementById('approvedJobsCount')) {
            document.getElementById('approvedJobsCount').textContent = data.jobs?.approved || 0;
        }
        
        if (document.getElementById('rejectedJobsCount')) {
            document.getElementById('rejectedJobsCount').textContent = data.jobs?.rejected || 0;
        }
        
        if (document.getElementById('totalApplicationsReceived')) {
            document.getElementById('totalApplicationsReceived').textContent = data.applications?.total || 0;
        }
        
        if (document.getElementById('shortlistedCount')) {
            document.getElementById('shortlistedCount').textContent = data.applications?.shortlisted || 0;
        }
        
        if (document.getElementById('rejectedApplicationsCount')) {
            document.getElementById('rejectedApplicationsCount').textContent = data.applications?.rejected || 0;
        }
    }

    // Modal functions
    async openAssignTaskModal() {
        console.log('🎯 Opening Assign Task Modal...');
        
        // Always load fresh team data when opening the modal to ensure it's up-to-date
        console.log('🔄 Loading fresh team data...');
        const select = document.getElementById('assignTo');
        
        try {
            // Show loading state
            select.innerHTML = '<option value="">Loading team members...</option>';
            select.disabled = true;

            // Load team members directly from API
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to load team: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Received API response:', data);
            
            const teamMembers = data.users || [];
            console.log('👥 Total users from API:', teamMembers.length);
            
            // Update the team array for other uses
            this.team = teamMembers;

            // Filter team members - show ALL employer users since any can be assigned tasks
            // Check both employerRole and EmployerProfile.role fields
            const assignableMembers = teamMembers.filter(member => {
                const role = member.employerRole || member.EmployerProfile?.role || '';
                const userRole = member.role || '';
                console.log(`🔍 Checking member: ${member.name || member.email}, employerRole: ${role}, userRole: ${userRole}`);
                
                // Accept anyone with an employer profile (they're part of the team)
                // OR specific roles: administrator, management, hr_recruitment
                return member.EmployerProfile || 
                       role === 'management' || role === 'hr_recruitment' || role === 'administrator' ||
                       userRole === 'management' || userRole === 'hr_recruitment' || userRole === 'administrator' ||
                       userRole === 'employer';
            });

            console.log('✅ Assignable members after filter:', assignableMembers.length);
            console.log('📋 Assignable members:', assignableMembers.map(m => ({ name: m.name, role: m.employerRole, id: m.id })));
            
            // Re-enable the select
            select.disabled = false;

            if (assignableMembers.length === 0) {
                console.warn('⚠️ No assignable members found!');
                select.innerHTML = '<option value="">No team members available</option>';
                this.showToast('No team members found. Please add users with Management, HR, or Admin roles.', 'warning');
            } else {
                // Group members by role for better organization
                const administrators = assignableMembers.filter(m => {
                    const role = m.employerRole || m.EmployerProfile?.role || m.role || '';
                    return role === 'administrator';
                });
                const management = assignableMembers.filter(m => {
                    const role = m.employerRole || m.EmployerProfile?.role || m.role || '';
                    return role === 'management';
                });
                const hr = assignableMembers.filter(m => {
                    const role = m.employerRole || m.EmployerProfile?.role || m.role || '';
                    return role === 'hr_recruitment';
                });
                const employers = assignableMembers.filter(m => {
                    const role = m.employerRole || m.EmployerProfile?.role || m.role || '';
                    return role === 'employer' && role !== 'administrator' && role !== 'management' && role !== 'hr_recruitment';
                });
                
                console.log(`📊 Role breakdown - Admins: ${administrators.length}, Management: ${management.length}, HR: ${hr.length}, Employers: ${employers.length}`);
                
                let optionsHTML = '<option value="">Select Team Member</option>';
                
                if (administrators.length > 0) {
                    optionsHTML += '<optgroup label="👑 Administrators">';
                    optionsHTML += administrators.map(member => 
                        `<option value="${member.id}">${member.name || member.email}${member.jobTitle ? ` - ${member.jobTitle}` : ''}${member.department ? ` (${member.department})` : ''}</option>`
                    ).join('');
                    optionsHTML += '</optgroup>';
                }
                
                if (management.length > 0) {
                    optionsHTML += '<optgroup label="👔 Management">';
                    optionsHTML += management.map(member => 
                        `<option value="${member.id}">${member.name || member.email}${member.jobTitle ? ` - ${member.jobTitle}` : ''}${member.department ? ` (${member.department})` : ''}</option>`
                    ).join('');
                    optionsHTML += '</optgroup>';
                }
                
                if (hr.length > 0) {
                    optionsHTML += '<optgroup label="👥 HR & Recruitment">';
                    optionsHTML += hr.map(member => 
                        `<option value="${member.id}">${member.name || member.email}${member.jobTitle ? ` - ${member.jobTitle}` : ''}${member.department ? ` (${member.department})` : ''}</option>`
                    ).join('');
                    optionsHTML += '</optgroup>';
                }
                
                if (employers.length > 0) {
                    optionsHTML += '<optgroup label="👨‍💼 Team Members">';
                    optionsHTML += employers.map(member => 
                        `<option value="${member.id}">${member.name || member.email}${member.jobTitle ? ` - ${member.jobTitle}` : ''}${member.department ? ` (${member.department})` : ''}</option>`
                    ).join('');
                    optionsHTML += '</optgroup>';
                }
                
                select.innerHTML = optionsHTML;
                console.log('✅ Dropdown populated successfully with', assignableMembers.length, 'members');
            }
        } catch (error) {
            console.error('❌ Error loading team for assignment:', error);
            select.disabled = false;
            select.innerHTML = '<option value="">Error loading team members</option>';
            this.showToast('Failed to load team members. Please try again.', 'error');
        }

        document.getElementById('assignTaskModal').classList.add('active');
        document.getElementById('assignTaskForm').reset();
    }

    closeAssignTaskModal() {
        document.getElementById('assignTaskModal').classList.remove('active');
    }

    async handleAssignTask(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Get and validate form data
        const title = formData.get('title')?.trim();
        const assignedToId = parseInt(formData.get('assignedToId'));
        
        if (!title) {
            this.showToast('❌ Task title is required', 'error');
            return;
        }
        
        if (!assignedToId || assignedToId === 0 || isNaN(assignedToId)) {
            this.showToast('❌ Please select a team member', 'error');
            return;
        }
        
        const taskData = {
            title: title,
            description: formData.get('description')?.trim() || '',
            assignedToId: assignedToId,
            priority: formData.get('priority') || 'medium',
            dueDate: formData.get('dueDate') || null
        };

        console.log('📤 Submitting task:', taskData);

        try {
            const response = await fetch('/api/management/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(taskData)
            });

            const data = await response.json();
            console.log('📨 Server response:', { status: response.status, data });

            if (!response.ok) {
                const errorMsg = data.message || 'Failed to assign task';
                console.error('❌ Task assignment failed:', { status: response.status, message: errorMsg, hint: data.hint });
                throw new Error(errorMsg);
            }

            console.log('✅ Task assigned successfully:', data);
            this.showToast('✅ Task assigned successfully!', 'success');
            this.closeAssignTaskModal();
            
            // Reload tasks to show the new assignment
            await this.loadTasks();
            
            // Update overview stats if we have the function
            if (this.loadOverviewStats && typeof this.loadOverviewStats === 'function') {
                await this.loadOverviewStats();
            }
        } catch (error) {
            console.error('❌ Assign task error:', error);
            this.showToast('❌ ' + error.message, 'error');
        }
    }

    viewJobDetails(jobId) {
        const job = this.pendingJobs.find(j => j.id === jobId);
        if (!job) return;

        this.currentJobId = jobId;

        const content = document.getElementById('jobDetailsContent');
        content.innerHTML = `
            <h3>${job.title}</h3>
            <p><strong>Company:</strong> ${job.companyName}</p>
            <p><strong>Location:</strong> ${job.location}</p>
            <p><strong>Job Type:</strong> ${job.jobType}</p>
            <p><strong>Posted by:</strong> ${job.createdBy?.name || 'Unknown'}</p>
            <p><strong>Department:</strong> ${job.createdBy?.department || 'N/A'}</p>
            <div style="margin-top: 1rem;">
                <h4>Description:</h4>
                <p>${job.description}</p>
            </div>
        `;

        document.getElementById('jobDetailsModal').classList.add('active');
    }

    closeJobDetailsModal() {
        document.getElementById('jobDetailsModal').classList.remove('active');
        this.currentJobId = null;
    }

    async approveJob() {
        if (!this.currentJobId) return;

        try {
            const response = await fetch(`/api/management/jobs/${this.currentJobId}/approve`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to approve job');

            this.showToast('Job approved successfully', 'success');
            this.closeJobDetailsModal();
            await this.loadPendingJobs();
        } catch (error) {
            console.error('Approve job error:', error);
            this.showToast(error.message, 'error');
        }
    }

    async rejectJob() {
        if (!this.currentJobId) return;

        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const response = await fetch(`/api/management/jobs/${this.currentJobId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to reject job');

            this.showToast('Job rejected', 'success');
            this.closeJobDetailsModal();
            await this.loadPendingJobs();
        } catch (error) {
            console.error('Reject job error:', error);
            this.showToast(error.message, 'error');
        }
    }

    formatStatus(status) {
        return status.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    async logout() {
        try {
            await fetch('/api/employer/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/pages/employer_portal.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/pages/employer_portal.html';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ==================== USER PERMISSIONS MANAGEMENT ====================
    
    currentEditingUser = null;
    allPermissionUsers = [];

    async loadPermissionsUsers() {
        try {
            const response = await fetch('/api/employer/users', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load users');
            }

            const data = await response.json();
            // Show ALL employer users (including administrators and management)
            this.allPermissionUsers = data.users.filter(u => u.role === 'employer');
            this.displayPermissionsUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            document.getElementById('permissionsUsersContainer').innerHTML = `
                <div style="background: #fee2e2; padding: 1.5rem; border-radius: 8px; color: #991b1b;">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
    }

    displayPermissionsUsers() {
        const container = document.getElementById('permissionsUsersContainer');
        
        if (this.allPermissionUsers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No team members found</p>
                    <p style="font-size: 0.9rem;">Employees will appear here once admin creates them</p>
                </div>
            `;
            return;
        }

        // Count users by role
        const roleCounts = {
            administrator: 0,
            management: 0,
            hr_recruitment: 0
        };
        
        this.allPermissionUsers.forEach(user => {
            if (roleCounts.hasOwnProperty(user.employerRole)) {
                roleCounts[user.employerRole]++;
            }
        });

        // Add role count summary at the top
        const summaryHtml = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.2rem;">
                    <i class="fas fa-users"></i> User Management
                </h3>
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">Total Users:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${this.allPermissionUsers.length}</span>
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">Administrators:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${roleCounts.administrator}</span>
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">Management:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${roleCounts.management}</span>
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem; opacity: 0.9;">HR & Recruitment:</strong>
                        <span style="font-size: 1.8rem; font-weight: bold; display: block;">${roleCounts.hr_recruitment}</span>
                    </div>
                </div>
            </div>
        `;

        const usersHtml = this.allPermissionUsers.map(user => {
            // Get role display name and styling
            let roleDisplay = 'Employee';
            let roleClass = 'hr_recruitment';
            let roleColor = '#6366f1';
            
            if (user.employerRole === 'administrator') {
                roleDisplay = 'Administrator';
                roleClass = 'administrator';
                roleColor = '#dc2626';
            } else if (user.employerRole === 'management') {
                roleDisplay = 'Management';
                roleClass = 'management';
                roleColor = '#f59e0b';
            } else if (user.employerRole === 'hr_recruitment') {
                roleDisplay = 'HR & Recruitment';
                roleClass = 'hr_recruitment';
                roleColor = '#6366f1';
            }
            
            return `
                <div class="user-card">
                    <div class="user-card-info">
                        <h3>
                            ${user.firstName} ${user.lastName}
                            <span class="role-badge ${roleClass}" style="background: ${roleColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">${roleDisplay}</span>
                        </h3>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
                        <p><strong>Job Title:</strong> ${user.jobTitle || 'N/A'}</p>
                        <p style="color: ${user.isActive ? '#10b981' : '#ef4444'};">
                            <strong>Status:</strong> ${user.isActive ? 'Active' : 'Inactive'}
                        </p>
                    </div>
                    <button class="btn-edit-permissions" onclick="managementDashboard.openPermissionsModal(${user.userId})">
                        <i class="fas fa-user-shield"></i> Edit Access
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = summaryHtml + usersHtml;
    }

    openPermissionsModal(userId) {
        const user = this.allPermissionUsers.find(u => u.userId === userId);
        if (!user) {
            alert('User not found');
            return;
        }

        this.currentEditingUser = user;

        // Determine role display with all three roles
        let roleDisplay = 'Employee';
        let roleClass = 'hr_recruitment';
        let roleColor = '#6366f1';
        
        if (user.employerRole === 'administrator') {
            roleDisplay = 'Administrator';
            roleClass = 'administrator';
            roleColor = '#dc2626';
        } else if (user.employerRole === 'management') {
            roleDisplay = 'Management';
            roleClass = 'management';
            roleColor = '#f59e0b';
        } else if (user.employerRole === 'hr_recruitment') {
            roleDisplay = 'HR & Recruitment';
            roleClass = 'hr_recruitment';
            roleColor = '#6366f1';
        }

        // Set user info
        document.getElementById('modalUserName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('modalUserEmail').textContent = user.email;
        document.getElementById('modalUserRole').textContent = roleDisplay;
        document.getElementById('modalUserRole').className = `role-badge ${roleClass}`;

        // Set all permission checkboxes
        const permissions = user.permissions || {};
        
        // Job Posting
        this.setPermCheckbox('canCreatePost', permissions.canCreatePost);
        this.setPermCheckbox('canWritePost', permissions.canWritePost);
        this.setPermCheckbox('canEditPost', permissions.canEditPost);
        this.setPermCheckbox('canDeletePost', permissions.canDeletePost);
        this.setPermCheckbox('canAssignPost', permissions.canAssignPost);
        this.setPermCheckbox('canTransferPost', permissions.canTransferPost);
        this.setPermCheckbox('canWithdrawPost', permissions.canWithdrawPost);

        // Applications
        this.setPermCheckbox('canViewApplications', permissions.canViewApplications);
        this.setPermCheckbox('canReviewApplications', permissions.canReviewApplications);
        this.setPermCheckbox('canShortlistCandidates', permissions.canShortlistCandidates);
        this.setPermCheckbox('canRejectCandidates', permissions.canRejectCandidates);
        this.setPermCheckbox('canScheduleInterviews', permissions.canScheduleInterviews);

        // Reporting
        this.setPermCheckbox('canPullReportApplied', permissions.canPullReportApplied);
        this.setPermCheckbox('canPullReportShortlisted', permissions.canPullReportShortlisted);
        this.setPermCheckbox('canPullReportRejected', permissions.canPullReportRejected);
        this.setPermCheckbox('canPullReportFull', permissions.canPullReportFull);
        this.setPermCheckbox('canExportReports', permissions.canExportReports);

        // Analytics
        this.setPermCheckbox('canViewAnalytics', permissions.canViewAnalytics);
        this.setPermCheckbox('canViewAllJobs', permissions.canViewAllJobs);
        this.setPermCheckbox('canMonitorPerformance', permissions.canMonitorPerformance);

        // Management
        this.setPermCheckbox('canAssignTasks', permissions.canAssignTasks);
        this.setPermCheckbox('canApproveJobs', permissions.canApproveJobs);
        this.setPermCheckbox('canManageTeam', permissions.canManageTeam);

        // Show modal
        document.getElementById('permissionsModal').classList.add('show');

        // Setup modal close handlers
        if (!this.permissionsModalSetup) {
            document.querySelector('.close-permissions').addEventListener('click', () => this.closePermissionsModal());
            document.getElementById('cancelPermissions').addEventListener('click', () => this.closePermissionsModal());
            document.getElementById('savePermissions').addEventListener('click', () => this.saveUserPermissions());
            
            // Close on outside click
            document.getElementById('permissionsModal').addEventListener('click', (e) => {
                if (e.target.id === 'permissionsModal') {
                    this.closePermissionsModal();
                }
            });

            this.permissionsModalSetup = true;
        }
    }

    setPermCheckbox(permId, value) {
        const checkbox = document.getElementById(`perm_${permId}`);
        if (checkbox) {
            checkbox.checked = !!value;
        }
    }

    getPermCheckbox(permId) {
        const checkbox = document.getElementById(`perm_${permId}`);
        return checkbox ? checkbox.checked : false;
    }

    closePermissionsModal() {
        document.getElementById('permissionsModal').classList.remove('show');
        this.currentEditingUser = null;
    }

    async saveUserPermissions() {
        if (!this.currentEditingUser) {
            alert('No user selected');
            return;
        }

        // Gather all permissions
        const permissions = {
            canCreatePost: this.getPermCheckbox('canCreatePost'),
            canWritePost: this.getPermCheckbox('canWritePost'),
            canEditPost: this.getPermCheckbox('canEditPost'),
            canDeletePost: this.getPermCheckbox('canDeletePost'),
            canAssignPost: this.getPermCheckbox('canAssignPost'),
            canTransferPost: this.getPermCheckbox('canTransferPost'),
            canWithdrawPost: this.getPermCheckbox('canWithdrawPost'),
            canViewApplications: this.getPermCheckbox('canViewApplications'),
            canReviewApplications: this.getPermCheckbox('canReviewApplications'),
            canShortlistCandidates: this.getPermCheckbox('canShortlistCandidates'),
            canRejectCandidates: this.getPermCheckbox('canRejectCandidates'),
            canScheduleInterviews: this.getPermCheckbox('canScheduleInterviews'),
            canPullReportApplied: this.getPermCheckbox('canPullReportApplied'),
            canPullReportShortlisted: this.getPermCheckbox('canPullReportShortlisted'),
            canPullReportRejected: this.getPermCheckbox('canPullReportRejected'),
            canPullReportFull: this.getPermCheckbox('canPullReportFull'),
            canExportReports: this.getPermCheckbox('canExportReports'),
            canViewAnalytics: this.getPermCheckbox('canViewAnalytics'),
            canViewAllJobs: this.getPermCheckbox('canViewAllJobs'),
            canMonitorPerformance: this.getPermCheckbox('canMonitorPerformance'),
            canAssignTasks: this.getPermCheckbox('canAssignTasks'),
            canApproveJobs: this.getPermCheckbox('canApproveJobs'),
            canManageTeam: this.getPermCheckbox('canManageTeam')
        };

        try {
            const response = await fetch(`/api/auth/employer/permissions/${this.currentEditingUser.userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ permissions })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update permissions');
            }

            this.showToast('✅ Permissions updated successfully!', 'success');
            this.closePermissionsModal();
            await this.loadPermissionsUsers(); // Reload the list
        } catch (error) {
            console.error('Error saving permissions:', error);
            alert('❌ Error: ' + error.message);
        }
    }

    // User Deletion Methods
    confirmDeleteUser(userId, userName, userEmail) {
        // Create modal HTML
        const modalHtml = `
            <div id="deleteUserModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <div style="width: 80px; height: 80px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #dc2626;"></i>
                        </div>
                        <h2 style="color: #1e293b; margin-bottom: 0.5rem;">Delete User Account</h2>
                        <p style="color: #64748b; font-size: 0.95rem;">This action cannot be undone!</p>
                    </div>
                    
                    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <p style="margin: 0.5rem 0; color: #1e293b;"><strong>Name:</strong> ${userName}</p>
                        <p style="margin: 0.5rem 0; color: #1e293b;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin: 1rem 0 0 0; color: #991b1b; font-weight: 600;">
                            <i class="fas fa-info-circle"></i> All user data, profile, and job postings will be permanently deleted.
                        </p>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button onclick="managementDashboard.closeDeleteModal()" style="flex: 1; background: #e2e8f0; color: #475569; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s;">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button onclick="managementDashboard.deleteUser(${userId})" style="flex: 1; background: #dc2626; color: white; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s;">
                            <i class="fas fa-trash-alt"></i> Delete User
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteUserModal');
        if (modal) {
            modal.remove();
        }
    }

    async deleteUser(userId) {
        try {
            // Show loading state
            const modal = document.getElementById('deleteUserModal');
            if (modal) {
                modal.querySelector('button[onclick*="deleteUser"]').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                modal.querySelector('button[onclick*="deleteUser"]').disabled = true;
            }

            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete user');
            }

            const result = await response.json();

            // Close modal
            this.closeDeleteModal();

            // Show success message
            this.showToast('✅ User deleted successfully!', 'success');

            // Reload the team list
            await this.loadTeam();

        } catch (error) {
            console.error('Delete user error:', error);
            
            // Show error in modal
            const modal = document.getElementById('deleteUserModal');
            if (modal) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 2px solid #fca5a5;';
                errorDiv.innerHTML = `<strong><i class="fas fa-exclamation-circle"></i> Error:</strong> ${error.message}`;
                
                const container = modal.querySelector('div > div');
                container.appendChild(errorDiv);

                // Re-enable delete button
                modal.querySelector('button[onclick*="deleteUser"]').innerHTML = '<i class="fas fa-trash-alt"></i> Try Again';
                modal.querySelector('button[onclick*="deleteUser"]').disabled = false;
            }
        }
    }

    editUserPermissions(userId) {
        // Navigate to permissions editing (if available) or show message
        this.showToast('Edit permissions feature coming soon!', 'info');
    }

    // ============================================
    // JOB POSTING MANAGEMENT
    // ============================================

    async loadJobPostings(tab = 'pending') {
        try {
            console.log('📋 Loading job postings for tab:', tab);
            console.log('🔍 Function called at:', new Date().toLocaleTimeString());
            
            let jobs = [];
            
            if (tab === 'pending') {
                // Load pending approval jobs from dedicated endpoint
                console.log('🌐 Fetching from: /api/management/jobs/pending');
                const response = await fetch('/api/management/jobs/pending', {
                    credentials: 'include'
                });
                
                console.log('📡 Response status:', response.status);
                if (!response.ok) throw new Error('Failed to load pending jobs');
                
                const data = await response.json();
                jobs = data.jobs || [];
                console.log('✅ Loaded', jobs.length, 'pending jobs');
                console.log('📦 Jobs data:', jobs);
            } else {
                // Load all company jobs
                const response = await fetch('/api/employer/jobs', {
                    credentials: 'include'
                });
                
                if (!response.ok) throw new Error('Failed to load jobs');
                
                const data = await response.json();
                const allJobs = data.jobs || data.categorized?.all || [];
                
                // Filter based on tab
                switch(tab) {
                    case 'active':
                        jobs = allJobs.filter(j => j.approvalStatus === 'approved' && j.status === 'Active');
                        break;
                    case 'drafts':
                        jobs = allJobs.filter(j => j.status === 'Draft' || j.status === 'Closed');
                        break;
                    case 'team':
                        jobs = allJobs;
                        break;
                    default:
                        jobs = allJobs;
                }
                
                console.log('✅ Loaded', jobs.length, 'jobs for tab:', tab);
            }
            
            this.displayJobPostings(jobs, tab);
        } catch (error) {
            console.error('Load job postings error:', error);
            const container = document.getElementById('jobPostingsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-exclamation-circle"></i> Failed to load jobs
                    </div>
                `;
            }
        }
    }

    displayJobPostings(jobs, tab) {
        console.log('🎨 displayJobPostings called with', jobs?.length, 'jobs for tab:', tab);
        const container = document.getElementById('jobPostingsContainer');
        if (!container) {
            console.error('❌ jobPostingsContainer not found in DOM');
            return;
        }

        if (!jobs || jobs.length === 0) {
            console.log('⚠️ No jobs to display');
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-check-circle"></i> No ${tab} jobs found
                </div>
            `;
            return;
        }

        console.log('✅ Rendering', jobs.length, 'job cards');
        container.innerHTML = jobs.map(job => {
            const isPending = job.approvalStatus === 'pending';
            const isRejected = job.approvalStatus === 'rejected';
            console.log(`  - Job: ${job.title}, Status: ${job.approvalStatus}, Pending: ${isPending}`);
            const creator = job.employer_user ? 
                `${job.employer_user.first_name || ''} ${job.employer_user.last_name || ''}` : 
                'Unknown';
            const creatorRole = job.employer_user?.EmployerProfile?.role || 'unknown';
            
            return `
                <div class="job-card" style="border-left: 4px solid ${isPending ? '#ff9800' : isRejected ? '#f44336' : '#4caf50'};">
                    <div class="job-header">
                        <div>
                            <div class="job-title">${job.title}</div>
                            <p style="color: #666; font-size: 0.875rem; margin: 0.25rem 0;">
                                Created by: <strong>${creator}</strong> 
                                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 0.5rem;">
                                    ${creatorRole === 'hr_recruitment' ? '👔 HR' : creatorRole === 'management' ? '👔 Manager' : '👔 Admin'}
                                </span>
                            </p>
                        </div>
                        <span class="job-badge ${job.approvalStatus || job.status}">
                            ${isPending ? '⏳ Pending' : isRejected ? '❌ Rejected' : job.status}
                        </span>
                    </div>
                    <div class="job-meta">
                        <div><i class="fas fa-map-marker-alt"></i> ${job.city || 'Location'}, ${job.province || 'N/A'}</div>
                        <div><i class="fas fa-briefcase"></i> ${job.jobType || 'Full-time'}</div>
                        <div><i class="fas fa-building"></i> ${job.department || 'General'}</div>
                        <div><i class="fas fa-calendar"></i> ${new Date(job.createdAt).toLocaleDateString()}</div>
                    </div>
                    ${isRejected && job.rejectionReason ? `
                        <div style="background: #fff3cd; border-left: 4px solid #f44336; padding: 12px; margin: 12px 0; border-radius: 4px;">
                            <strong style="color: #d32f2f;">Rejection Reason:</strong>
                            <p style="margin: 0.5rem 0 0 0; color: #444;">${job.rejectionReason}</p>
                        </div>
                    ` : ''}
                    <div class="job-actions">
                        <button class="btn-secondary" onclick="managementDashboard.viewJobDetails(${job.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${isPending ? `
                            <button class="btn-success" onclick="managementDashboard.quickApproveJob(${job.id}, '${job.title.replace(/'/g, "\\'")}')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn-danger" onclick="managementDashboard.quickRejectJob(${job.id}, '${job.title.replace(/'/g, "\\'")}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                            <button class="btn-secondary" onclick="managementDashboard.editJob(${job.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                        ${tab === 'active' && !isPending ? `
                            <button class="btn-warning" onclick="managementDashboard.withdrawJob(${job.id}, '${job.title.replace(/'/g, "\\'")}')">
                                <i class="fas fa-archive"></i> Withdraw
                            </button>
                        ` : ''}
                        ${tab === 'drafts' || isRejected ? `
                            <button class="btn-primary" onclick="managementDashboard.editJob(${job.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-danger" onclick="managementDashboard.deleteJob(${job.id}, '${job.title.replace(/'/g, "\\'")}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    switchJobTab(tab) {
        console.log('🔄 Switching to tab:', tab);
        
        // Update active tab styling
        document.querySelectorAll('.job-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Load jobs for selected tab
        this.loadJobPostings(tab);
    }

    async quickApproveJob(jobId, jobTitle) {
        if (!confirm(`Approve job: "${jobTitle}"?\n\nThis will make it visible to jobseekers immediately.`)) {
            return;
        }

        try {
            console.log('🔄 Approving job:', jobId);
            const response = await fetch(`/api/management/jobs/${jobId}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok) {
                console.error('❌ Approval failed:', data);
                throw new Error(data.message || 'Failed to approve job');
            }

            this.showToast('✅ Job approved successfully!', 'success');
            
            // Reload pending jobs and update stats
            await this.loadJobPostings('pending');
            await this.loadPendingJobs(); // Update stats
            
            // Also reload review history if on that section
            if (document.getElementById('review-jobs')?.classList.contains('active')) {
                await this.loadReviewHistory();
            }
        } catch (error) {
            console.error('Approve job error:', error);
            this.showToast('❌ ' + error.message, 'error');
        }
    }

    async quickRejectJob(jobId, jobTitle) {
        const reason = prompt(`Reject job: "${jobTitle}"\n\nPlease provide a reason for rejection (will be sent to the job creator):`);
        
        if (!reason || reason.trim() === '') {
            alert('Rejection reason is required');
            return;
        }

        try {
            console.log('🔄 Rejecting job:', jobId, 'Reason:', reason);
            const response = await fetch(`/api/management/jobs/${jobId}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: reason.trim() })
            });

            console.log('📡 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok) {
                console.error('❌ Rejection failed:', data);
                throw new Error(data.message || 'Failed to reject job');
            }

            this.showToast('Job rejected. HR notified to make corrections.', 'success');
            
            // Reload pending jobs and update stats
            await this.loadJobPostings('pending');
            await this.loadPendingJobs(); // Update stats
            
            // Also reload review history if on that section
            if (document.getElementById('review-jobs')?.classList.contains('active')) {
                await this.loadReviewHistory();
            }
        } catch (error) {
            console.error('Reject job error:', error);
            this.showToast('❌ ' + error.message, 'error');
        }
    }

    async editJob(jobId) {
        try {
            console.log('🔍 Loading job for editing:', jobId);
            
            // Fetch job details
            const response = await fetch(`/api/employer/jobs/${jobId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load job details');
            
            const data = await response.json();
            const job = data.job || data;
            
            console.log('📝 Job loaded for editing:', job);
            
            // Populate the create/edit job form
            const form = document.getElementById('createJobForm');
            const modal = document.getElementById('createJobModal');
            
            if (!form || !modal) {
                console.error('❌ Job form or modal not found');
                return;
            }
            
            // Set form values
            document.getElementById('job-id').value = job.id;
            document.getElementById('jobTitle').value = job.title || '';
            document.getElementById('jobType').value = job.jobType || '';
            
            // Find and set other fields
            const descField = document.getElementById('jobDescription') || document.querySelector('[name="description"]');
            if (descField) descField.value = job.description || '';
            
            const reqField = document.getElementById('jobRequirements') || document.querySelector('[name="requirements"]');
            if (reqField) reqField.value = job.requirements || '';
            
            const respField = document.getElementById('jobResponsibilities') || document.querySelector('[name="responsibilities"]');
            if (respField) respField.value = job.responsibilities || '';
            
            const locField = document.getElementById('jobLocation') || document.querySelector('[name="location"]');
            if (locField) locField.value = job.location || job.city || '';
            
            const deptField = document.getElementById('jobDepartment') || document.querySelector('[name="department"]');
            if (deptField) deptField.value = job.department || '';
            
            const salaryField = document.getElementById('jobSalary') || document.querySelector('[name="salaryRange"]');
            if (salaryField) salaryField.value = job.salaryRange || '';
            
            const expField = document.getElementById('jobExperience') || document.querySelector('[name="experienceLevel"]');
            if (expField) expField.value = job.experienceLevel || '';
            
            const companyField = document.getElementById('jobCompany') || document.querySelector('[name="companyName"]');
            if (companyField) companyField.value = job.companyName || '';
            
            // Show modal
            modal.classList.add('active');
            
            // Change button text to "Update Job"
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Job';
            }
            
            this.showToast('Job loaded for editing', 'info');
        } catch (error) {
            console.error('Edit job error:', error);
            this.showToast('❌ Failed to load job for editing', 'error');
        }
    }

    async withdrawJob(jobId, jobTitle) {
        if (!confirm(`Withdraw job: "${jobTitle}"?\n\nThis will move the job to Draft status and hide it from jobseekers. You can edit and re-post it later.`)) {
            return;
        }
        
        try {
            console.log('🔄 Withdrawing job:', jobId);
            
            const response = await fetch(`/api/management/jobs/${jobId}/withdraw`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to withdraw job');
            }
            
            this.showToast('✅ Job withdrawn to drafts successfully', 'success');
            
            // Reload current tab
            const activeTab = document.querySelector('.job-tab.active');
            const currentTab = activeTab ? activeTab.dataset.tab : 'active';
            await this.loadJobPostings(currentTab);
            
        } catch (error) {
            console.error('Withdraw job error:', error);
            this.showToast('❌ ' + error.message, 'error');
        }
    }

    async deleteJob(jobId, jobTitle) {
        if (!confirm(`⚠️ DELETE job: "${jobTitle}"?\n\nThis action cannot be undone. The job and all its applications will be permanently deleted.`)) {
            return;
        }
        
        const confirmText = prompt('Type "DELETE" to confirm permanent deletion:');
        if (confirmText !== 'DELETE') {
            this.showToast('Deletion cancelled', 'info');
            return;
        }
        
        try {
            console.log('🗑️ Deleting job:', jobId);
            
            const response = await fetch(`/api/employer/jobs/${jobId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete job');
            }
            
            this.showToast('✅ Job deleted permanently', 'success');
            
            // Reload current tab
            const activeTab = document.querySelector('.job-tab.active');
            const currentTab = activeTab ? activeTab.dataset.tab : 'drafts';
            await this.loadJobPostings(currentTab);
            
        } catch (error) {
            console.error('Delete job error:', error);
            this.showToast('❌ ' + error.message, 'error');
        }
    }

    // ============================================
    // REVIEW JOBS HISTORY
    // ============================================

    async loadReviewHistory(filter = 'all') {
        try {
            console.log('📋 Loading review history, filter:', filter);
            
            const response = await fetch('/api/management/jobs/review-history', {
                credentials: 'include'
            });
            
            console.log('📡 Review history response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Review history error:', errorData);
                throw new Error(errorData.message || `Failed to load review history (${response.status})`);
            }
            
            const data = await response.json();
            let jobs = data.jobs || [];
            
            console.log('✅ Loaded', jobs.length, 'reviewed jobs');
            
            // Filter jobs based on selected tab
            if (filter === 'approved') {
                jobs = jobs.filter(j => j.approvalStatus === 'approved');
            } else if (filter === 'rejected') {
                jobs = jobs.filter(j => j.approvalStatus === 'rejected');
            }
            
            // Update stats
            const approved = data.jobs.filter(j => j.approvalStatus === 'approved').length;
            const rejected = data.jobs.filter(j => j.approvalStatus === 'rejected').length;
            
            const approvedCountEl = document.getElementById('reviewApprovedCount');
            const rejectedCountEl = document.getElementById('reviewRejectedCount');
            const pendingCountEl = document.getElementById('reviewPendingCount');
            
            if (approvedCountEl) approvedCountEl.textContent = approved;
            if (rejectedCountEl) rejectedCountEl.textContent = rejected;
            if (pendingCountEl) pendingCountEl.textContent = this.pendingJobs.length || 0;
            
            this.displayReviewHistory(jobs, filter);
        } catch (error) {
            console.error('Load review history error:', error);
            const container = document.getElementById('reviewJobsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-exclamation-circle"></i> Failed to load review history
                    </div>
                `;
            }
        }
    }

    displayReviewHistory(jobs, filter) {
        console.log('🎨 displayReviewHistory called with', jobs?.length, 'jobs for filter:', filter);
        const container = document.getElementById('reviewJobsContainer');
        if (!container) {
            console.error('❌ reviewJobsContainer not found in DOM');
            return;
        }

        if (!jobs || jobs.length === 0) {
            console.log('⚠️ No reviewed jobs to display');
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-check-circle"></i> No ${filter} jobs found
                </div>
            `;
            return;
        }

        console.log('✅ Rendering', jobs.length, 'review cards');
        container.innerHTML = jobs.map(job => {
            const isApproved = job.approvalStatus === 'approved';
            const isRejected = job.approvalStatus === 'rejected';
            const creator = job.employer_user ? 
                `${job.employer_user.first_name || ''} ${job.employer_user.last_name || ''}` : 
                'Unknown';
            const creatorRole = job.employer_user?.EmployerProfile?.role || 'unknown';
            
            // Get reviewer info
            let reviewerName = 'Unknown';
            let reviewDate = job.updatedAt;
            
            if (isApproved && job.approver) {
                reviewerName = `${job.approver.first_name} ${job.approver.last_name}`;
                reviewDate = job.approvedAt || job.updatedAt;
            } else if (isRejected && job.rejector) {
                reviewerName = `${job.rejector.first_name} ${job.rejector.last_name}`;
                reviewDate = job.rejectedAt || job.updatedAt;
            }
            
            return `
                <div class="job-card" style="border-left: 4px solid ${isApproved ? '#4caf50' : '#f44336'};">
                    <div class="job-header">
                        <div>
                            <div class="job-title">${job.title}</div>
                            <p style="color: #666; font-size: 0.875rem; margin: 0.25rem 0;">
                                Created by: <strong>${creator}</strong> 
                                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 0.5rem;">
                                    ${creatorRole === 'hr_recruitment' ? '👔 HR' : creatorRole === 'management' ? '👔 Manager' : '👔 Admin'}
                                </span>
                            </p>
                        </div>
                        <span class="job-badge ${job.approvalStatus}">
                            ${isApproved ? '✅ Approved' : '❌ Declined'}
                        </span>
                    </div>
                    <div class="job-meta">
                        <div><i class="fas fa-map-marker-alt"></i> ${job.city || 'Location'}, ${job.province || 'N/A'}</div>
                        <div><i class="fas fa-briefcase"></i> ${job.jobType || 'Full-time'}</div>
                        <div><i class="fas fa-building"></i> ${job.department || 'General'}</div>
                        <div><i class="fas fa-calendar"></i> ${new Date(job.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style="background: ${isApproved ? '#d1fae5' : '#fee2e2'}; padding: 12px; margin: 12px 0; border-radius: 8px; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong style="color: ${isApproved ? '#065f46' : '#991b1b'};">
                                ${isApproved ? '✓ Approved by:' : '✗ Declined by:'}
                            </strong>
                            <span style="color: #666; font-size: 0.875rem;">
                                ${new Date(reviewDate).toLocaleDateString()} at ${new Date(reviewDate).toLocaleTimeString()}
                            </span>
                        </div>
                        <p style="margin: 0.5rem 0 0 0; color: #444; font-weight: 600;">
                            ${reviewerName}
                        </p>
                    </div>
                    ${isRejected && job.rejectionReason ? `
                        <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 12px; margin: 12px 0; border-radius: 4px;">
                            <strong style="color: #d97706;">Decline Reason:</strong>
                            <p style="margin: 0.5rem 0 0 0; color: #444;">${job.rejectionReason}</p>
                        </div>
                    ` : ''}
                    <div class="job-actions">
                        <button class="btn-secondary" onclick="managementDashboard.viewJobDetails(${job.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${isApproved ? `
                            <span style="color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-check-circle"></i> Currently Published
                            </span>
                        ` : ''}
                        ${isRejected ? `
                            <span style="color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-arrow-left"></i> Sent back to creator
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    switchReviewTab(filter) {
        console.log('🔄 Switching to review tab:', filter);
        
        // Update active tab styling
        document.querySelectorAll('[data-review-tab]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.reviewTab === filter) {
                btn.classList.add('active');
            }
        });
        
        // Load reviews for selected filter
        this.loadReviewHistory(filter);
    }

    showToast(message, type = 'info') {
        const colors = {
            success: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
            error: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
            info: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' }
        };

        const color = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${color.bg};
            color: ${color.text};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 2px solid ${color.border};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10001;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        toast.innerHTML = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==================== JOB POSTING FUNCTIONS ====================

    async showWritePostModal() {
        // Load team members if not loaded
        if (this.team.length === 0) {
            await this.loadTeam();
        }

        // Populate the recipient dropdown with team members
        const select = document.getElementById('messageRecipient');
        
        // Start with default options
        let optionsHTML = '<option value="all">All Team Members</option>';
        optionsHTML += '<option value="" disabled>--- Individual Members ---</option>';
        
        // Group team members by role
        const administrators = this.team.filter(m => (m.employerRole || m.EmployerProfile?.role) === 'administrator');
        const management = this.team.filter(m => (m.employerRole || m.EmployerProfile?.role) === 'management');
        const hr = this.team.filter(m => (m.employerRole || m.EmployerProfile?.role) === 'hr_recruitment');
        
        if (administrators.length > 0) {
            optionsHTML += '<optgroup label="Administrators">';
            optionsHTML += administrators.map(member => 
                `<option value="${member.id}">${member.name} - ${member.jobTitle || 'Administrator'}</option>`
            ).join('');
            optionsHTML += '</optgroup>';
        }
        
        if (management.length > 0) {
            optionsHTML += '<optgroup label="Management">';
            optionsHTML += management.map(member => 
                `<option value="${member.id}">${member.name} - ${member.jobTitle || 'Manager'}</option>`
            ).join('');
            optionsHTML += '</optgroup>';
        }
        
        if (hr.length > 0) {
            optionsHTML += '<optgroup label="HR & Recruitment">';
            optionsHTML += hr.map(member => 
                `<option value="${member.id}">${member.name} - ${member.jobTitle || 'HR Personnel'}</option>`
            ).join('');
            optionsHTML += '</optgroup>';
        }
        
        select.innerHTML = optionsHTML;
        
        // Show the modal
        document.getElementById('writePostModal').classList.add('active');
        document.getElementById('writePostForm').reset();

        // Setup form submission if not already done
        const form = document.getElementById('writePostForm');
        if (!form.dataset.listenerAttached) {
            form.addEventListener('submit', (e) => this.handleWritePost(e));
            form.dataset.listenerAttached = 'true';
        }
    }

    closeWritePostModal() {
        document.getElementById('writePostModal').classList.remove('active');
    }

    async handleWritePost(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const messageData = {
            type: formData.get('messageType'),
            priority: formData.get('priority'),
            recipientId: formData.get('recipientId') === 'all' ? null : parseInt(formData.get('recipientId')),
            sendToAll: formData.get('recipientId') === 'all',
            subject: formData.get('subject'),
            content: formData.get('content'),
            dueDate: formData.get('dueDate') || null
        };

        try {
            const response = await fetch('/api/management/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(messageData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to send message');

            this.showToast('Message sent successfully', 'success');
            this.closeWritePostModal();
        } catch (error) {
            console.error('Send message error:', error);
            this.showToast(error.message, 'error');
        }
    }

    showManagePosts() {
        this.showSection('job-posting');
        this.switchJobTab('team'); // Show all team jobs for management
    }

    showWithdrawOptions() {
        this.showSection('job-posting');
        this.switchJobTab('active'); // Show active jobs that can be withdrawn
        this.showToast('Select an active job to withdraw to drafts', 'info');
    }

    showCreateJobModal() {
        document.getElementById('createJobModal').classList.add('active');
        document.getElementById('createJobForm').reset();
        
        // Setup form submission if not already done
        const form = document.getElementById('createJobForm');
        if (!form.dataset.listenerAttached) {
            form.addEventListener('submit', (e) => this.handleCreateJob(e));
            form.dataset.listenerAttached = 'true';
        }
    }

    closeCreateJobModal() {
        document.getElementById('createJobModal').classList.remove('active');
    }

    async handleCreateJob(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const jobData = {
            title: formData.get('title'),
            description: formData.get('description'),
            requirements: formData.get('requirements'),
            responsibilities: formData.get('responsibilities'),
            location: formData.get('location'),
            jobType: formData.get('jobType'),
            department: formData.get('department'),
            salaryRange: formData.get('salaryRange'),
            experienceLevel: formData.get('experienceLevel'),
            companyName: formData.get('companyName'),
            status: 'Active', // Managers can post directly
            approvalStatus: 'approved' // Auto-approve for managers
        };

        try {
            const response = await fetch('/api/employer/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(jobData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to create job');

            this.showToast('Job posted successfully', 'success');
            this.closeCreateJobModal();
            await this.loadJobPostings(); // Reload job listings
        } catch (error) {
            console.error('Create job error:', error);
            this.showToast(error.message, 'error');
        }
    }
}

// Initialize dashboard
const managementDashboard = new ManagementDashboard();

