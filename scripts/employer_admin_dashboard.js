// Administrator Dashboard JavaScript

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.analytics = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.setupNavigation();
        await this.loadAnalytics();
        await this.loadUsers();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/employer/me', {
                credentials: 'include'
            });

            if (!response.ok) {
                window.location.href = '/pages/employer_portal.html';
                return;
            }

            const data = await response.json();

            if (!data.user) {
                window.location.href = '/pages/employer_portal.html';
                return;
            }

            if (data.user.role !== 'administrator') {
                // Redirect to appropriate dashboard based on role
                this.redirectToDashboard(data.user.role);
                return;
            }

            this.currentUser = data.user;
            document.getElementById('userName').textContent = `${data.user.firstName} ${data.user.lastName}` || 'Admin';
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = '/pages/employer_portal.html';
        }
    }

    redirectToDashboard(role) {
        switch(role) {
            case 'management':
                window.location.href = '/pages/employer_management_dashboard.html';
                break;
            case 'hr_recruitment':
                window.location.href = '/pages/employer_dashboard.html';
                break;
            default:
                window.location.href = '/pages/employer_portal.html';
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Add User Modal
        document.getElementById('addUserBtn').addEventListener('click', () => this.openAddUserModal());
        document.getElementById('cancelAddUser').addEventListener('click', () => this.closeAddUserModal());
        document.getElementById('addUserForm').addEventListener('submit', (e) => this.handleAddUser(e));

        // Edit User Modal
        document.getElementById('cancelEditUser').addEventListener('click', () => this.closeEditUserModal());
        document.getElementById('editUserForm').addEventListener('submit', (e) => this.handleEditUser(e));

        // Reset Password Modal
        document.getElementById('cancelResetPassword').addEventListener('click', () => this.closeResetPasswordModal());
        document.getElementById('resetPasswordForm').addEventListener('submit', (e) => this.handleResetPassword(e));

        // Close modals when clicking X
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeAddUserModal();
                this.closeEditUserModal();
                this.closeResetPasswordModal();
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAddUserModal();
                this.closeEditUserModal();
                this.closeResetPasswordModal();
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
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/admin/analytics', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load analytics');
            }

            this.analytics = await response.json();
            this.displayAnalytics();
        } catch (error) {
            console.error('Load analytics error:', error);
            this.showToast('Failed to load analytics', 'error');
        }
    }

    displayAnalytics() {
        if (!this.analytics) return;

        // Update stats cards
        document.getElementById('totalUsers').textContent = this.analytics.users.total;
        document.getElementById('activeUsers').textContent = this.analytics.users.active;
        document.getElementById('totalJobs').textContent = this.analytics.jobs.total;
        document.getElementById('totalApplications').textContent = this.analytics.applications.total;

        // Update role breakdown
        document.getElementById('adminCount').textContent = this.analytics.users.byRole.administrators;
        document.getElementById('managementCount').textContent = this.analytics.users.byRole.management;
        document.getElementById('hrCount').textContent = this.analytics.users.byRole.hr;

        // Update job stats
        document.getElementById('activeJobs').textContent = this.analytics.jobs.active;
        document.getElementById('totalJobseekers').textContent = this.analytics.jobseekers.total;
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load users');
            }

            const data = await response.json();
            this.users = data.users;
            this.displayUsers();
        } catch (error) {
            console.error('Load users error:', error);
            this.showToast('Failed to load users', 'error');
        }
    }

    displayUsers() {
        const tbody = document.getElementById('usersTableBody');

        if (!this.users || this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No users found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge ${this.getRoleBadgeClass(user.employerRole)}">
                        ${this.formatRole(user.employerRole)}
                    </span>
                </td>
                <td>${user.department}</td>
                <td>
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="adminDashboard.openEditUserModal(${user.id})" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-reset" onclick="adminDashboard.openResetPasswordModal(${user.id}, '${user.name}')" title="Reset Password">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="adminDashboard.confirmDeleteUser(${user.id}, '${user.name}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeClass(role) {
        switch(role) {
            case 'administrator': return 'admin';
            case 'management': return 'management';
            case 'hr_recruitment': return 'hr';
            default: return 'hr';
        }
    }

    formatRole(role) {
        switch(role) {
            case 'administrator': return 'Administrator';
            case 'management': return 'Management';
            case 'hr_recruitment': return 'HR & Recruitment';
            default: return role;
        }
    }

    // Add User Modal
    openAddUserModal() {
        document.getElementById('addUserModal').classList.add('active');
        document.getElementById('addUserForm').reset();
    }

    closeAddUserModal() {
        document.getElementById('addUserModal').classList.remove('active');
    }

    async handleAddUser(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            department: formData.get('department'),
            jobTitle: formData.get('jobTitle'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create user');
            }

            this.showToast('User created successfully', 'success');
            this.closeAddUserModal();
            await this.loadUsers();
            await this.loadAnalytics();
        } catch (error) {
            console.error('Add user error:', error);
            this.showToast(error.message, 'error');
        }
    }

    // Edit User Modal
    openEditUserModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.name.split(' ')[0];
        document.getElementById('editLastName').value = user.name.split(' ').slice(1).join(' ');
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editRole').value = user.employerRole;
        document.getElementById('editDepartment').value = user.department || '';
        document.getElementById('editJobTitle').value = user.jobTitle || '';
        document.getElementById('editIsActive').value = user.isActive.toString();

        document.getElementById('editUserModal').classList.add('active');
    }

    closeEditUserModal() {
        document.getElementById('editUserModal').classList.remove('active');
    }

    async handleEditUser(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userId = formData.get('userId');
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            department: formData.get('department'),
            jobTitle: formData.get('jobTitle'),
            isActive: formData.get('isActive') === 'true'
        };

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update user');
            }

            this.showToast('User updated successfully', 'success');
            this.closeEditUserModal();
            await this.loadUsers();
            await this.loadAnalytics();
        } catch (error) {
            console.error('Edit user error:', error);
            this.showToast(error.message, 'error');
        }
    }

    // Reset Password Modal
    openResetPasswordModal(userId, userName) {
        document.getElementById('resetUserId').value = userId;
        document.getElementById('resetUserName').textContent = `Reset password for: ${userName}`;
        document.getElementById('newPassword').value = '';
        document.getElementById('resetPasswordModal').classList.add('active');
    }

    closeResetPasswordModal() {
        document.getElementById('resetPasswordModal').classList.remove('active');
    }

    async handleResetPassword(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const passwordData = {
            userId: parseInt(formData.get('userId')),
            newPassword: formData.get('newPassword')
        };

        try {
            const response = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(passwordData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            this.showToast('Password reset successfully', 'success');
            this.closeResetPasswordModal();
        } catch (error) {
            console.error('Reset password error:', error);
            this.showToast(error.message, 'error');
        }
    }

    // Delete User
    confirmDeleteUser(userId, userName) {
        if (confirm(`Are you sure you want to delete user: ${userName}?\n\nThis action cannot be undone.`)) {
            this.deleteUser(userId);
        }
    }

    async deleteUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete user');
            }

            this.showToast('User deleted successfully', 'success');
            await this.loadUsers();
            await this.loadAnalytics();
        } catch (error) {
            console.error('Delete user error:', error);
            this.showToast(error.message, 'error');
        }
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
}

// Initialize dashboard
const adminDashboard = new AdminDashboard();
