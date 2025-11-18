// ============================================
// FIX MANAGEMENT ACCOUNT ROLE
// ============================================
// This script updates mphoselala@gmail.com to be a management account
// and ensures the employer_profile has the correct role

const { Sequelize } = require('sequelize');

// Database configuration - MATCHES server.js
const sequelize = new Sequelize('tmvbusinesssolutions', 'tmvbusinesssolutions', 'Moses@1985', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

async function fixManagementAccount() {
    try {
        console.log('🔧 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const email = 'mphoselala@gmail.com';

        // Step 1: Update user role to 'management'
        console.log(`\n📝 Step 1: Updating user role for ${email}...`);
        const [userUpdateResult] = await sequelize.query(`
            UPDATE users 
            SET role = 'management' 
            WHERE email = ?
        `, {
            replacements: [email]
        });

        if (userUpdateResult.affectedRows > 0) {
            console.log('✅ User role updated to "management"');
        } else {
            console.log('⚠️ No user found with that email');
            process.exit(1);
        }

        // Step 2: Get the user ID
        const [users] = await sequelize.query(`
            SELECT id FROM users WHERE email = ?
        `, {
            replacements: [email]
        });

        if (users.length === 0) {
            console.log('❌ User not found');
            process.exit(1);
        }

        const userId = users[0].id;
        console.log(`📋 User ID: ${userId}`);

        // Step 3: Update employer_profile role to 'management'
        console.log(`\n📝 Step 2: Updating employer_profile role...`);
        const [profileUpdateResult] = await sequelize.query(`
            UPDATE employer_profiles 
            SET role = 'management' 
            WHERE userId = ?
        `, {
            replacements: [userId]
        });

        if (profileUpdateResult.affectedRows > 0) {
            console.log('✅ Employer profile role updated to "management"');
        } else {
            console.log('⚠️ No employer profile found for this user');
        }

        // Step 4: Grant all management permissions
        console.log(`\n📝 Step 3: Granting all management permissions...`);
        const [permissionUpdateResult] = await sequelize.query(`
            UPDATE employer_profiles 
            SET 
                canCreatePost = 1, canWritePost = 1, canEditPost = 1, canDeletePost = 1,
                canAssignPost = 1, canTransferPost = 1, canWithdrawPost = 1,
                canViewApplications = 1, canReviewApplications = 1, canShortlistCandidates = 1,
                canRejectCandidates = 1, canScheduleInterviews = 1,
                canPullReportApplied = 1, canPullReportShortlisted = 1, canPullReportRejected = 1,
                canPullReportFull = 1, canExportReports = 1,
                canViewAnalytics = 1, canViewAllJobs = 1, canMonitorPerformance = 1,
                canAssignTasks = 1, canApproveJobs = 1, canManageTeam = 1
            WHERE userId = ?
        `, {
            replacements: [userId]
        });

        console.log('✅ All management permissions granted');

        // Step 5: Verify the changes
        console.log(`\n📋 Step 4: Verifying changes...`);
        const [verifyResult] = await sequelize.query(`
            SELECT 
                u.id, u.email, u.role as userRole,
                e.role as profileRole, e.companyName,
                e.canCreatePost, e.canWritePost, e.canApproveJobs
            FROM users u
            LEFT JOIN employer_profiles e ON u.id = e.userId
            WHERE u.email = ?
        `, {
            replacements: [email]
        });

        console.log('\n✅ VERIFICATION RESULTS:');
        console.log('========================');
        console.log('User ID:', verifyResult[0].id);
        console.log('Email:', verifyResult[0].email);
        console.log('User Role:', verifyResult[0].userRole);
        console.log('Profile Role:', verifyResult[0].profileRole);
        console.log('Company:', verifyResult[0].companyName);
        console.log('Can Create Post:', verifyResult[0].canCreatePost ? '✅' : '❌');
        console.log('Can Write Post:', verifyResult[0].canWritePost ? '✅' : '❌');
        console.log('Can Approve Jobs:', verifyResult[0].canApproveJobs ? '✅' : '❌');
        console.log('========================\n');

        if (verifyResult[0].userRole === 'management' && verifyResult[0].profileRole === 'management') {
            console.log('🎉 SUCCESS! Account is now a fully configured management account!');
            console.log('\n📝 Next steps:');
            console.log('1. Logout from the management dashboard');
            console.log('2. Login again with: mphoselala@gmail.com');
            console.log('3. Navigate to Management Dashboard');
            console.log('4. Try creating a job post');
        } else {
            console.log('⚠️ WARNING: Something went wrong. Please check the verification results above.');
        }

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await sequelize.close();
        process.exit(1);
    }
}

// Run the fix
console.log('============================================');
console.log('   MANAGEMENT ACCOUNT FIX UTILITY');
console.log('============================================');
console.log('Email: mphoselala@gmail.com');
console.log('Target Role: management');
console.log('============================================\n');

fixManagementAccount();
