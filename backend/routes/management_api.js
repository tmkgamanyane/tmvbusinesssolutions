// ============================================
// MANAGEMENT DASHBOARD API ENDPOINTS
// ============================================
// Created: 2025-10-19
// Purpose: Manager-specific functionality for job posting, messaging, approvals, etc.

const express = require('express');
const { Op } = require('sequelize');
const { checkUserExists, requireManager } = require('../middleware/auth');

module.exports = function(app, sequelize) {
    // Get models from server.js
    const { Job, User, EmployerProfile, JobApplication, JobseekerProfile } = sequelize.models;

// ============================================
// JOB POSTING - MANAGER CREATE POST (B1)
// ============================================

// Manager creates job directly (auto-approved)
app.post('/api/management/jobs/create', checkUserExists, requireManager, async (req, res) => {
    try {
        console.log('📥 Received job creation request from manager:', req.managerId);
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        
        const {
            title, jobType, industry, province, city, location,
            description, requirements, responsibilities,
            salaryMin, salaryMax, salaryPeriod,
            experience, education, closingDate, status
        } = req.body;

        // Use provided location or build from city/province
        const jobLocation = location || (city && province ? `${city}, ${province}` : (city || province || ''));

        // Get company name from manager's profile
        const companyName = req.managerProfile?.companyName || 'TMV Business Solutions';
        console.log('🏢 Company name from profile:', companyName);

        // CRITICAL: Use manager's userId as employerId so job appears in company's "My Jobs"
        // This ensures the job is visible in employer_dashboard.html
        const jobData = {
            employerId: req.managerId, // This links the job to the manager's company account
            title,
            jobType,
            industry,
            location: jobLocation,
            city: city || '',
            province: province || '',
            description,
            requirements,
            responsibilities,
            salaryMin: salaryMin ? parseInt(salaryMin) : null,
            salaryMax: salaryMax ? parseInt(salaryMax) : null,
            salaryPeriod: salaryPeriod || 'month',
            experience,
            education,
            closingDate,
            companyName,
            status: status || 'Active',
            approvalStatus: 'approved', // Managers can auto-approve their own jobs
            approvedBy: req.managerId,
            approvedAt: new Date(),
            createdBy: req.managerId, // Track who created it
            viewCount: 0,
            applicationCount: 0
        };

        console.log('💾 Creating job with data:', JSON.stringify(jobData, null, 2));
        const job = await Job.create(jobData);

        console.log(`✅ Manager job created: ID=${job.id}, employerId=${job.employerId}, title="${job.title}"`);

        res.status(201).json({
            message: 'Job created successfully and will appear in My Jobs',
            job,
            autoApproved: true
        });
    } catch (error) {
        console.error('❌ Manager create job error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Failed to create job', error: error.message });
    }
});

// ============================================
// WRITE POST - MANAGER MESSAGES (B2)
// ============================================

// Send message/instruction to team
app.post('/api/management/messages/send', checkUserExists, requireManager, async (req, res) => {
    try {
        const { recipientId, messageType, priority, subject, content, dueDate } = req.body;

        // Get the manager_messages table (create model if needed)
        const [results] = await sequelize.query(`
            INSERT INTO manager_messages (senderId, recipientId, messageType, priority, subject, content, dueDate, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'unread')
        `, {
            replacements: [
                req.managerId,
                recipientId === 'all' ? null : recipientId,
                messageType,
                priority || 'normal',
                subject,
                content,
                dueDate || null
            ]
        });

        // If sending to all, create read receipts for all HR users
        if (!recipientId || recipientId === 'all') {
            const hrUsers = await User.findAll({
                where: { role: 'hr_recruitment' },
                attributes: ['id']
            });

            for (const user of hrUsers) {
                await sequelize.query(`
                    INSERT INTO message_receipts (messageId, userId, readAt)
                    VALUES (?, ?, NULL)
                `, {
                    replacements: [results, user.id]
                });
            }
        }

        res.status(201).json({
            message: 'Message sent successfully',
            messageId: results
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
});

// Get all messages for a user
app.get('/api/management/messages', checkUserExists, requireManager, async (req, res) => {
    try {
        const [messages] = await sequelize.query(`
            SELECT m.*, 
                   u.firstName as senderFirstName, 
                   u.lastName as senderLastName,
                   u.email as senderEmail,
                   (SELECT COUNT(*) FROM message_receipts WHERE messageId = m.id AND readAt IS NOT NULL) as readCount,
                   (SELECT COUNT(*) FROM message_receipts WHERE messageId = m.id) as totalRecipients
            FROM manager_messages m
            LEFT JOIN users u ON m.senderId = u.id
            WHERE m.senderId = ?
            ORDER BY m.createdAt DESC
        `, {
            replacements: [req.managerId]
        });

        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }
});

// Get unread messages for HR user
app.get('/api/hr/messages/unread', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const [messages] = await sequelize.query(`
            SELECT m.*, 
                   u.firstName as senderFirstName, 
                   u.lastName as senderLastName
            FROM manager_messages m
            LEFT JOIN users u ON m.senderId = u.id
            WHERE (m.recipientId = ? OR m.recipientId IS NULL)
            AND m.status = 'unread'
            AND NOT EXISTS (
                SELECT 1 FROM message_receipts 
                WHERE messageId = m.id AND userId = ? AND readAt IS NOT NULL
            )
            ORDER BY m.createdAt DESC
        `, {
            replacements: [req.session.userId, req.session.userId]
        });

        res.json({ messages, count: messages.length });
    } catch (error) {
        console.error('Get unread messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
});

// Mark message as read
app.put('/api/hr/messages/:id/read', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await sequelize.query(`
            UPDATE message_receipts 
            SET readAt = NOW()
            WHERE messageId = ? AND userId = ? AND readAt IS NULL
        `, {
            replacements: [req.params.id, req.session.userId]
        });

        res.json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Mark message read error:', error);
        res.status(500).json({ message: 'Failed to mark message as read' });
    }
});

// ============================================
// MANAGE POSTS - VIEW/EDIT/DELETE ALL (B3)
// ============================================

// Get all jobs from all team members
app.get('/api/management/jobs/all', checkUserExists, requireManager, async (req, res) => {
    try {
        const { tab } = req.query; // active, pending, drafts, team

        let whereClause = {};
        let includeDrafts = false;

        switch (tab) {
            case 'active':
                whereClause = { status: 'Active', approvalStatus: 'approved' };
                break;
            case 'pending':
                whereClause = { approvalStatus: 'pending' };
                break;
            case 'drafts':
                includeDrafts = true;
                break;
            case 'team':
            default:
                // All jobs
                break;
        }

        let jobs = [];
        
        if (includeDrafts) {
            // Get from job_drafts table
            const [draftJobs] = await sequelize.query(`
                SELECT d.*, 
                       u.firstName, u.lastName, u.email,
                       'draft' as sourceTable
                FROM job_drafts d
                LEFT JOIN users u ON d.userId = u.id
                ORDER BY d.createdAt DESC
            `);
            jobs = draftJobs;
        } else {
            // Get from jobs table
            jobs = await Job.findAll({
                where: whereClause,
                include: [{
                    model: User,
                    as: 'Employer',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'role']
                }],
                order: [['createdAt', 'DESC']]
            });
        }

        res.json({ jobs, count: jobs.length });
    } catch (error) {
        console.error('Get all jobs error:', error);
        res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
    }
});

// Update any job (manager override)
app.put('/api/management/jobs/:id/edit', checkUserExists, requireManager, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const job = await Job.findByPk(id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        await job.update(updateData);

        res.json({ message: 'Job updated successfully', job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ message: 'Failed to update job', error: error.message });
    }
});

// Delete any job (manager override)
app.delete('/api/management/jobs/:id/delete', checkUserExists, requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findByPk(id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        await job.destroy();

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ message: 'Failed to delete job', error: error.message });
    }
});

// ============================================
// WITHDRAW POST - MOVE TO DRAFTS (B5)
// ============================================

// Withdraw job to drafts
app.post('/api/management/jobs/:id/withdraw', checkUserExists, requireManager, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const job = await Job.findByPk(id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Create draft entry
        await sequelize.query(`
            INSERT INTO job_drafts (jobId, userId, title, jobType, location, salary, closingDate, companyName, description, requirements, responsibilities, status, withdrawnReason, withdrawnAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'withdrawn', ?, NOW())
        `, {
            replacements: [
                id, req.managerId, job.title, job.jobType, job.location, job.salary, job.closingDate, job.companyName, job.description, job.requirements, job.responsibilities, reason || 'Withdrawn by manager'
            ]
        });

        // Update job status to withdrawn
        await job.update({ status: 'Closed' });

        res.json({ message: 'Job withdrawn to drafts successfully' });
    } catch (error) {
        console.error('Withdraw job error:', error);
        res.status(500).json({ message: 'Failed to withdraw job', error: error.message });
    }
});

// Restore draft to active job
app.post('/api/management/drafts/:id/restore', checkUserExists, requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        const [drafts] = await sequelize.query(`
            SELECT * FROM job_drafts WHERE id = ?
        `, { replacements: [id] });

        if (drafts.length === 0) {
            return res.status(404).json({ message: 'Draft not found' });
        }

        const draft = drafts[0];

        // Create new job from draft
        const job = await Job.create({
            employerId: req.managerId,
            title: draft.title,
            jobType: draft.jobType,
            location: draft.location,
            salary: draft.salary,
            closingDate: draft.closingDate,
            companyName: draft.companyName,
            description: draft.description,
            requirements: draft.requirements,
            responsibilities: draft.responsibilities,
            status: 'Active',
            approvalStatus: 'approved',
            approvedBy: req.managerId,
            approvedAt: new Date(),
            viewCount: 0,
            applicationCount: 0
        });

        // Delete draft
        await sequelize.query(`DELETE FROM job_drafts WHERE id = ?`, { replacements: [id] });

        res.json({ message: 'Draft restored to active job', job });
    } catch (error) {
        console.error('Restore draft error:', error);
        res.status(500).json({ message: 'Failed to restore draft', error: error.message });
    }
});

// ============================================
// JOB APPROVAL WORKFLOW (F2)
// ============================================

// Get pending jobs for approval
app.get('/api/management/jobs/pending-approval', checkUserExists, requireManager, async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { approvalStatus: 'pending' },
            include: [{
                model: User,
                as: 'Employer',
                attributes: ['id', 'firstName', 'lastName', 'email', 'role']
            }],
            order: [['createdAt', 'ASC']]
        });

        res.json({ jobs, count: jobs.length });
    } catch (error) {
        console.error('Get pending jobs error:', error);
        res.status(500).json({ message: 'Failed to fetch pending jobs' });
    }
});

// Approve job
app.put('/api/management/jobs/:id/approve', checkUserExists, requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findByPk(id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        await job.update({
            approvalStatus: 'approved',
            approvedBy: req.managerId,
            approvedAt: new Date(),
            status: 'Active'
        });

        res.json({ message: 'Job approved successfully', job });
    } catch (error) {
        console.error('Approve job error:', error);
        res.status(500).json({ message: 'Failed to approve job' });
    }
});

// Reject job
app.put('/api/management/jobs/:id/reject', checkUserExists, requireManager, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const job = await Job.findByPk(id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        await job.update({
            approvalStatus: 'rejected',
            jobRejectionReason: reason || 'Rejected by manager',
            status: 'Closed'
        });

        res.json({ message: 'Job rejected', job });
    } catch (error) {
        console.error('Reject job error:', error);
        res.status(500).json({ message: 'Failed to reject job' });
    }
});

// ============================================
// GET HR TEAM MEMBERS (for message recipients)
// ============================================

app.get('/api/management/team/hr-users', checkUserExists, requireManager, async (req, res) => {
    try {
        const hrUsers = await User.findAll({
            where: { 
                role: { [Op.in]: ['hr_recruitment', 'hr_admin', 'employer'] }
            },
            attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'role'],
            order: [['firstName', 'ASC'], ['lastName', 'ASC']]
        });

        const formattedUsers = hrUsers.map(user => ({
            id: user.id,
            username: user.username || `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Get HR users error:', error);
        res.status(500).json({ message: 'Failed to fetch HR users' });
    }
});

// ============================================
// C.4 - INTERVIEW SCHEDULING
// ============================================

app.post('/api/management/interviews/schedule', checkUserExists, requireManager, async (req, res) => {
    try {
        const { applicationId, jobId, jobseekerId, interviewDate, location, notes } = req.body;

        // Import interview_schedules model
        const { sequelize } = require('../../server');
        
        // Create interview schedule
        await sequelize.query(
            `INSERT INTO interview_schedules 
            (applicationId, jobId, jobseekerId, scheduledBy, interviewDate, location, notes, status, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())`,
            {
                replacements: [applicationId, jobId, jobseekerId, req.managerId, interviewDate, location, notes],
                type: sequelize.QueryTypes.INSERT
            }
        );

        // Update application status
        await JobApplication.update(
            { 
                status: 'invited',
                invitedAt: new Date(),
                interviewDate: interviewDate
            },
            { where: { id: applicationId } }
        );

        res.json({ message: 'Interview scheduled successfully' });
    } catch (error) {
        console.error('Schedule interview error:', error);
        res.status(500).json({ message: 'Failed to schedule interview' });
    }
});

// ============================================
// F.3 - TEAM MANAGEMENT (Suspend/Freeze/Activate)
// ============================================

app.post('/api/management/team/:userId/suspend', checkUserExists, requireManager, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const { sequelize } = require('../../server');

        // Insert or update user_status
        await sequelize.query(
            `INSERT INTO user_status (userId, status, reason, changedBy, changedAt, createdAt) 
            VALUES (?, 'suspended', ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE status='suspended', reason=?, changedBy=?, changedAt=NOW()`,
            {
                replacements: [userId, reason, req.managerId, reason, req.managerId],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.json({ message: 'User suspended successfully' });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ message: 'Failed to suspend user' });
    }
});

app.post('/api/management/team/:userId/freeze', checkUserExists, requireManager, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const { sequelize } = require('../../server');

        await sequelize.query(
            `INSERT INTO user_status (userId, status, reason, changedBy, changedAt, createdAt) 
            VALUES (?, 'frozen', ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE status='frozen', reason=?, changedBy=?, changedAt=NOW()`,
            {
                replacements: [userId, reason, req.managerId, reason, req.managerId],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.json({ message: 'User frozen successfully' });
    } catch (error) {
        console.error('Freeze user error:', error);
        res.status(500).json({ message: 'Failed to freeze user' });
    }
});

app.post('/api/management/team/:userId/activate', checkUserExists, requireManager, async (req, res) => {
    try {
        const { userId } = req.params;

        const { sequelize } = require('../../server');

        await sequelize.query(
            `INSERT INTO user_status (userId, status, reason, changedBy, changedAt, createdAt) 
            VALUES (?, 'active', 'Activated by manager', ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE status='active', reason='Activated by manager', changedBy=?, changedAt=NOW()`,
            {
                replacements: [userId, req.managerId, req.managerId],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.json({ message: 'User activated successfully' });
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({ message: 'Failed to activate user' });
    }
});

// ============================================
// A. OVERVIEW STATS
// ============================================

app.get('/api/management/overview/stats', checkUserExists, requireManager, async (req, res) => {
    try {
        const { sequelize } = require('../../server');

        // Get active tasks count
        const activeTasks = 0; // Placeholder - would need tasks table

        // Get pending approvals
        const pendingJobs = await Job.count({
            where: { approvalStatus: 'pending' }
        });

        // Get team size
        const teamMembers = await User.count({
            where: { role: { [Op.in]: ['hr_recruitment', 'hr_admin', 'employer'] } }
        });

        // Get completed tasks this week (placeholder)
        const completedThisWeek = 0;

        res.json({
            activeTasks,
            pendingApprovals: pendingJobs,
            teamMembers,
            completedThisWeek
        });
    } catch (error) {
        console.error('Get overview stats error:', error);
        res.status(500).json({ message: 'Failed to fetch overview stats' });
    }
});

// ============================================
// TEMPORARY FIX ENDPOINT - UPDATE USER TO MANAGEMENT
// ============================================
app.post('/api/management/fix-account', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔧 Fix account request for:', email);

        // Find user by email and verify password
        const user = await User.findOne({ 
            where: { email },
            include: [{ model: EmployerProfile, as: 'EmployerProfile' }]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        console.log('✅ User verified, updating role to management...');

        // Update user role to 'management'
        user.role = 'management';
        await user.save();

        console.log('✅ User role updated');

        // Update employer profile role if exists
        if (user.EmployerProfile) {
            user.EmployerProfile.role = 'management';
            
            // Grant all management permissions
            user.EmployerProfile.canCreatePost = true;
            user.EmployerProfile.canWritePost = true;
            user.EmployerProfile.canEditPost = true;
            user.EmployerProfile.canDeletePost = true;
            user.EmployerProfile.canAssignPost = true;
            user.EmployerProfile.canTransferPost = true;
            user.EmployerProfile.canWithdrawPost = true;
            user.EmployerProfile.canViewApplications = true;
            user.EmployerProfile.canReviewApplications = true;
            user.EmployerProfile.canShortlistCandidates = true;
            user.EmployerProfile.canRejectCandidates = true;
            user.EmployerProfile.canScheduleInterviews = true;
            user.EmployerProfile.canPullReportApplied = true;
            user.EmployerProfile.canPullReportShortlisted = true;
            user.EmployerProfile.canPullReportRejected = true;
            user.EmployerProfile.canPullReportFull = true;
            user.EmployerProfile.canExportReports = true;
            user.EmployerProfile.canViewAnalytics = true;
            user.EmployerProfile.canViewAllJobs = true;
            user.EmployerProfile.canMonitorPerformance = true;
            user.EmployerProfile.canAssignTasks = true;
            user.EmployerProfile.canApproveJobs = true;
            user.EmployerProfile.canManageTeam = true;

            await user.EmployerProfile.save();
            console.log('✅ Employer profile updated with all management permissions');
        }

        res.json({
            success: true,
            message: 'Account successfully upgraded to Management role',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                profileRole: user.EmployerProfile?.role
            }
        });

    } catch (error) {
        console.error('❌ Fix account error:', error);
        res.status(500).json({ message: 'Failed to update account', error: error.message });
    }
});

console.log('✅ Management Dashboard API endpoints loaded (Complete A-H)');

}; // End of module.exports
