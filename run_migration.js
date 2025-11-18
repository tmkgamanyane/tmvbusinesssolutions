// run_migration.js - Script to add missing RBAC columns to employer_profiles table

const mysql = require('mysql2/promise');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'tmvbusinesssolutions',
        password: 'Moses@1985',
        database: 'tmvbusinesssolutions'
    });

    console.log('🔗 Connected to database...');

    try {
        // Add role column
        console.log('Adding role column...');
        await connection.execute(`
            ALTER TABLE employer_profiles 
            ADD COLUMN role ENUM('administrator', 'management', 'hr_recruitment') 
            DEFAULT 'hr_recruitment' 
            AFTER userId
        `).catch(err => {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ✓ role column already exists');
        });

        // Add accessLevel column
        console.log('Adding accessLevel column...');
        await connection.execute(`
            ALTER TABLE employer_profiles 
            ADD COLUMN accessLevel INT DEFAULT 3 
            AFTER role
        `).catch(err => {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ✓ accessLevel column already exists');
        });

        // Add permission columns
        const permissions = [
            'canAddUsers',
            'canDeleteUsers',
            'canResetPasswords',
            'canManageSettings',
            'canViewAnalytics',
            'canAssignTasks',
            'canApproveJobs',
            'canViewAllJobs'
        ];

        for (const perm of permissions) {
            console.log(`Adding ${perm} column...`);
            await connection.execute(`
                ALTER TABLE employer_profiles 
                ADD COLUMN ${perm} BOOLEAN DEFAULT FALSE 
                AFTER jobTitle
            `).catch(err => {
                if (err.code !== 'ER_DUP_FIELDNAME') throw err;
                console.log(`  ✓ ${perm} column already exists`);
            });
        }

        console.log('\n✅ All columns added successfully!');

        // Update first employer to be administrator
        console.log('\n👑 Setting first employer as Administrator...');
        const [result] = await connection.execute(`
            UPDATE employer_profiles ep
            JOIN users u ON ep.userId = u.id
            SET 
                ep.role = 'administrator',
                ep.accessLevel = 1,
                ep.canAddUsers = TRUE,
                ep.canDeleteUsers = TRUE,
                ep.canResetPasswords = TRUE,
                ep.canManageSettings = TRUE,
                ep.canViewAnalytics = TRUE,
                ep.canViewAllJobs = TRUE
            WHERE u.role = 'employer'
            ORDER BY u.id ASC
            LIMIT 1
        `);

        console.log(`  ✓ Updated ${result.affectedRows} user(s) to Administrator`);

        // Set defaults for other employers
        console.log('\n📝 Setting default HR permissions for other employers...');
        const [result2] = await connection.execute(`
            UPDATE employer_profiles ep
            JOIN users u ON ep.userId = u.id
            SET 
                ep.role = 'hr_recruitment',
                ep.accessLevel = 3,
                ep.canPostJobs = TRUE,
                ep.canManageApplications = TRUE
            WHERE u.role = 'employer'
            AND ep.userId NOT IN (
                SELECT userId FROM (
                    SELECT userId FROM employer_profiles 
                    WHERE role = 'administrator'
                ) AS admin_users
            )
        `);

        console.log(`  ✓ Updated ${result2.affectedRows} user(s) to HR role`);

        // Show results
        console.log('\n📊 Current employer users:');
        const [rows] = await connection.execute(`
            SELECT 
                u.id,
                u.email,
                u.role as user_role,
                ep.role as employer_role,
                ep.accessLevel,
                ep.canAddUsers,
                ep.canPostJobs
            FROM users u
            LEFT JOIN employer_profiles ep ON u.id = ep.userId
            WHERE u.role = 'employer'
            ORDER BY u.id
        `);

        console.table(rows);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n🚀 You can now restart the server and login.');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
