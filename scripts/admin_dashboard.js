// Admin Dashboard JavaScript
const API_BASE = 'https://tmvbusinesssolutions.co.za/api';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadUsers();
});

// Check if user is authenticated as admin
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/employer/me`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.role === 'administrator') {
                document.getElementById('userName').textContent = `${data.user.firstName} ${data.user.lastName}`;
            } else {
                window.location.href = 'employer_portal.html';
            }
        } else {
            window.location.href = 'employer_portal.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'employer_portal.html';
    }
}

// Load all users
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
            updateStats(data.users);
        } else {
            showAlert('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Load users error:', error);
        showAlert('An error occurred while loading users', 'error');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const profile = user.EmployerProfile;
        if (!profile) {
            console.warn('User without profile:', user);
            return '';
        }
        
        const roleName = profile.role === 'administrator' ? 'Administrator' :
                        profile.role === 'management' ? 'Manager' :
                        'HR Personnel';
        const roleClass = profile.role === 'administrator' ? 'role-admin' :
                         profile.role === 'management' ? 'role-management' :
                         'role-hr';

        return `
            <tr>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge-table ${roleClass}">${roleName}</span></td>
                <td>${profile.department || '-'}</td>
                <td>Level ${profile.accessLevel}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;" onclick="showResetPasswordModal(${user.id}, '${user.first_name} ${user.last_name}')">Reset Password</button>
                    <button class="btn btn-danger" style="padding: 0.5rem 1rem;" onclick="deleteUser(${user.id}, '${user.first_name} ${user.last_name}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update statistics
function updateStats(users) {
    const validUsers = users.filter(u => u.EmployerProfile);
    document.getElementById('totalUsers').textContent = validUsers.length;
    document.getElementById('totalAdmins').textContent = validUsers.filter(u => u.EmployerProfile.role === 'administrator').length;
    document.getElementById('totalManagers').textContent = validUsers.filter(u => u.EmployerProfile.role === 'management').length;
    document.getElementById('totalHR').textContent = validUsers.filter(u => u.EmployerProfile.role === 'hr_recruitment').length;
}

// Show create user modal
function showCreateUserModal() {
    document.getElementById('createUserModal').classList.add('show');
    document.getElementById('createUserForm').reset();
    document.getElementById('roleDescription').style.display = 'none';
}

// Close create user modal
function closeCreateUserModal() {
    document.getElementById('createUserModal').classList.remove('show');
}

// Show role description
function showRoleDescription() {
    const role = document.getElementById('role').value;
    const descriptionDiv = document.getElementById('roleDescription');
    
    const descriptions = {
        administrator: {
            text: '✅ Full system access • Can create/delete users • Can reset passwords • Can manage all settings • Can view all analytics',
            color: '#dbeafe',
            textColor: '#1e3a8a'
        },
        management: {
            text: '✅ Can assign tasks to HR • Can approve job postings • Can view analytics • Can manage applications',
            color: '#d1fae5',
            textColor: '#065f46'
        },
        hr_recruitment: {
            text: '✅ Can post jobs • Can manage applications • Can view assigned jobs only',
            color: '#e9d5ff',
            textColor: '#6b21a8'
        }
    };
    
    if (role && descriptions[role]) {
        descriptionDiv.style.display = 'block';
        descriptionDiv.style.background = descriptions[role].color;
        descriptionDiv.style.color = descriptions[role].textColor;
        descriptionDiv.textContent = descriptions[role].text;
    } else {
        descriptionDiv.style.display = 'none';
    }
}

// Handle create user form submission
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const department = document.getElementById('department').value;
    const jobTitle = document.getElementById('jobTitle').value;
    const contactNumber = document.getElementById('contactNumber').value;

    try {
        const response = await fetch(`${API_BASE}/admin/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                email,
                password,
                firstName,
                lastName,
                role,
                department,
                jobTitle,
                contactNumber
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('User created successfully!', 'success');
            closeCreateUserModal();
            await loadUsers();
        } else {
            showAlert(data.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        console.error('Create user error:', error);
        showAlert('An error occurred while creating user', 'error');
    }
});

// Show reset password modal
function showResetPasswordModal(userId, userName) {
    document.getElementById('resetUserId').value = userId;
    document.getElementById('resetPasswordModal').classList.add('show');
    document.getElementById('resetPasswordForm').reset();
}

// Close reset password modal
function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').classList.remove('show');
}

// Handle reset password form submission
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match!', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/reset-password/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Password reset successfully!', 'success');
            closeResetPasswordModal();
        } else {
            showAlert(data.message || 'Failed to reset password', 'error');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showAlert('An error occurred while resetting password', 'error');
    }
});

// Delete user with confirmation modal
async function deleteUser(userId, userName) {
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.id = 'deleteUserModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 80px; height: 80px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #dc2626;"></i>
                </div>
                <h2 style="color: #1e293b; margin-bottom: 0.5rem; font-size: 1.5rem;">Delete User Account</h2>
                <p style="color: #64748b; font-size: 0.95rem;">This action cannot be undone!</p>
            </div>
            
            <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <p style="margin: 0.5rem 0; color: #1e293b; font-size: 1rem;"><strong>User:</strong> ${userName}</p>
                <p style="margin: 1rem 0 0 0; color: #991b1b; font-weight: 600; font-size: 0.95rem;">
                    <i class="fas fa-info-circle"></i> All user data, profile, and associated records will be permanently deleted.
                </p>
            </div>

            <div style="display: flex; gap: 1rem;">
                <button onclick="closeDeleteModal()" class="btn btn-secondary" style="flex: 1; padding: 1rem; font-size: 1rem; font-weight: 600; border-radius: 8px;">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button onclick="confirmDeleteUser(${userId})" class="btn btn-danger" style="flex: 1; padding: 1rem; font-size: 1rem; font-weight: 600; border-radius: 8px;">
                    <i class="fas fa-trash-alt"></i> Delete User
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteUserModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modal.remove(), 300);
    }
}

// Confirm and execute deletion
async function confirmDeleteUser(userId) {
    const modal = document.getElementById('deleteUserModal');
    const deleteBtn = modal.querySelector('.btn-danger');
    
    // Show loading state
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            closeDeleteModal();
            showAlert('✅ User deleted successfully!', 'success');
            await loadUsers();
        } else {
            // Show error in modal
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 2px solid #fca5a5; font-weight: 600;';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${data.message || 'Failed to delete user'}`;
            
            modal.querySelector('div > div').appendChild(errorDiv);
            
            // Re-enable button
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Try Again';
            deleteBtn.disabled = false;
        }
    } catch (error) {
        console.error('Delete user error:', error);
        
        // Show error in modal
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 2px solid #fca5a5; font-weight: 600;';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> An error occurred while deleting user`;
        
        modal.querySelector('div > div').appendChild(errorDiv);
        
        // Re-enable button
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Try Again';
        deleteBtn.disabled = false;
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_remember');
    window.location.href = 'employer_portal.html';
}

// Show alert message
function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type} show`;

    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 5000);
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}
