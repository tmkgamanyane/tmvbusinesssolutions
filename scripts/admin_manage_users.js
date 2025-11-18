// Admin Manage Users Script
let currentEditingUser = null;
let allUsers = [];

// Load all users on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});

// Load all employer users
async function loadUsers() {
    try {
        const response = await fetch('/api/employer/users', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const data = await response.json();
        allUsers = data.users || [];
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersContainer').innerHTML = `
            <div style="background: #ffebee; padding: 20px; border-radius: 8px; color: #c62828;">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }
}

// Display users in cards
function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <p>No users found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = users.map(user => {
        const roleClass = `role-${user.role}`;
        const roleName = user.role === 'administrator' ? 'Administrator' :
                        user.role === 'management' ? 'Management' :
                        'HR & Recruitment';
        
        return `
            <div class="user-card">
                <div class="user-info">
                    <h3>
                        ${user.firstName} ${user.lastName}
                        <span class="role-badge ${roleClass}">${roleName}</span>
                    </h3>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
                    <p><strong>Job Title:</strong> ${user.jobTitle || 'N/A'}</p>
                    <p style="color: ${user.isActive ? '#4caf50' : '#f44336'};">
                        <strong>Status:</strong> ${user.isActive ? 'Active' : 'Inactive'}
                    </p>
                </div>
                <div>
                    <button class="edit-btn" onclick="openPermissionsModal(${user.userId})">
                        Edit Access
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Open permissions modal for a user
function openPermissionsModal(userId) {
    const user = allUsers.find(u => u.userId === userId);
    if (!user) {
        alert('User not found');
        return;
    }

    currentEditingUser = user;

    // Set user info
    document.getElementById('modalUserName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('modalUserEmail').textContent = user.email;
    document.getElementById('modalUserRole').textContent = 
        user.role === 'administrator' ? 'Administrator' :
        user.role === 'management' ? 'Management' :
        'HR & Recruitment';

    // Set all permission checkboxes
    const permissions = user.permissions || {};
    
    // Job Posting
    setCheckbox('canCreatePost', permissions.canCreatePost);
    setCheckbox('canWritePost', permissions.canWritePost);
    setCheckbox('canEditPost', permissions.canEditPost);
    setCheckbox('canDeletePost', permissions.canDeletePost);
    setCheckbox('canAssignPost', permissions.canAssignPost);
    setCheckbox('canTransferPost', permissions.canTransferPost);
    setCheckbox('canWithdrawPost', permissions.canWithdrawPost);

    // Applications
    setCheckbox('canViewApplications', permissions.canViewApplications);
    setCheckbox('canReviewApplications', permissions.canReviewApplications);
    setCheckbox('canShortlistCandidates', permissions.canShortlistCandidates);
    setCheckbox('canRejectCandidates', permissions.canRejectCandidates);
    setCheckbox('canScheduleInterviews', permissions.canScheduleInterviews);

    // Reporting
    setCheckbox('canPullReportApplied', permissions.canPullReportApplied);
    setCheckbox('canPullReportShortlisted', permissions.canPullReportShortlisted);
    setCheckbox('canPullReportRejected', permissions.canPullReportRejected);
    setCheckbox('canPullReportFull', permissions.canPullReportFull);
    setCheckbox('canExportReports', permissions.canExportReports);

    // Admin
    setCheckbox('canAddUsers', permissions.canAddUsers);
    setCheckbox('canDeleteUsers', permissions.canDeleteUsers);
    setCheckbox('canResetPasswords', permissions.canResetPasswords);
    setCheckbox('canManageSettings', permissions.canManageSettings);
    setCheckbox('canManagePermissions', permissions.canManagePermissions);

    // Analytics
    setCheckbox('canViewAnalytics', permissions.canViewAnalytics);
    setCheckbox('canViewAllJobs', permissions.canViewAllJobs);
    setCheckbox('canMonitorPerformance', permissions.canMonitorPerformance);

    // Management
    setCheckbox('canAssignTasks', permissions.canAssignTasks);
    setCheckbox('canApproveJobs', permissions.canApproveJobs);
    setCheckbox('canManageTeam', permissions.canManageTeam);

    // Show modal
    document.getElementById('permissionsModal').classList.add('active');
}

// Helper function to set checkbox value
function setCheckbox(permId, value) {
    const checkbox = document.getElementById(`perm_${permId}`);
    if (checkbox) {
        checkbox.checked = !!value;
    }
}

// Helper function to get checkbox value
function getCheckbox(permId) {
    const checkbox = document.getElementById(`perm_${permId}`);
    return checkbox ? checkbox.checked : false;
}

// Close modal
function closeModal() {
    document.getElementById('permissionsModal').classList.remove('active');
    currentEditingUser = null;
}

// Save permissions
async function savePermissions() {
    if (!currentEditingUser) {
        alert('No user selected');
        return;
    }

    // Gather all permissions
    const permissions = {
        // Job Posting
        canCreatePost: getCheckbox('canCreatePost'),
        canWritePost: getCheckbox('canWritePost'),
        canEditPost: getCheckbox('canEditPost'),
        canDeletePost: getCheckbox('canDeletePost'),
        canAssignPost: getCheckbox('canAssignPost'),
        canTransferPost: getCheckbox('canTransferPost'),
        canWithdrawPost: getCheckbox('canWithdrawPost'),

        // Applications
        canViewApplications: getCheckbox('canViewApplications'),
        canReviewApplications: getCheckbox('canReviewApplications'),
        canShortlistCandidates: getCheckbox('canShortlistCandidates'),
        canRejectCandidates: getCheckbox('canRejectCandidates'),
        canScheduleInterviews: getCheckbox('canScheduleInterviews'),

        // Reporting
        canPullReportApplied: getCheckbox('canPullReportApplied'),
        canPullReportShortlisted: getCheckbox('canPullReportShortlisted'),
        canPullReportRejected: getCheckbox('canPullReportRejected'),
        canPullReportFull: getCheckbox('canPullReportFull'),
        canExportReports: getCheckbox('canExportReports'),

        // Admin
        canAddUsers: getCheckbox('canAddUsers'),
        canDeleteUsers: getCheckbox('canDeleteUsers'),
        canResetPasswords: getCheckbox('canResetPasswords'),
        canManageSettings: getCheckbox('canManageSettings'),
        canManagePermissions: getCheckbox('canManagePermissions'),

        // Analytics
        canViewAnalytics: getCheckbox('canViewAnalytics'),
        canViewAllJobs: getCheckbox('canViewAllJobs'),
        canMonitorPerformance: getCheckbox('canMonitorPerformance'),

        // Management
        canAssignTasks: getCheckbox('canAssignTasks'),
        canApproveJobs: getCheckbox('canApproveJobs'),
        canManageTeam: getCheckbox('canManageTeam')
    };

    try {
        const response = await fetch(`/api/auth/employer/permissions/${currentEditingUser.userId}`, {
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

        const result = await response.json();
        
        alert('✅ Permissions updated successfully!');
        closeModal();
        loadUsers(); // Reload the users list
    } catch (error) {
        console.error('Error saving permissions:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Close modal when clicking outside
document.getElementById('permissionsModal').addEventListener('click', (e) => {
    if (e.target.id === 'permissionsModal') {
        closeModal();
    }
});
