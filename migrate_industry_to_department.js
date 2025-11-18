// Migration script to change industry column to department
const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize('tmvbusinesssolutions', 'tmvbusinesssolutions', 'Moses@1985', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log
});

async function migrateIndustryToDepartment() {
    try {
        console.log('🔄 Starting migration: industry → department');
        console.log('');

        // Step 1: Add new department column
        console.log('📋 Step 1: Adding department column...');
        await sequelize.query(`
            ALTER TABLE jobs 
            ADD COLUMN department ENUM(
                'Admin',
                'Architecture',
                'Consulting',
                'Finance & Accounts',
                'Information Technology (IT)',
                'Innovation & Design',
                'Marketing & Branding',
                'Security & Automation'
            ) NULL AFTER city
        `);
        console.log('✅ Department column added successfully');
        console.log('');

        // Step 2: Migrate existing industry data to department
        console.log('📋 Step 2: Migrating existing data...');
        
        // Map old industry values to new department values
        const migrations = [
            { old: 'IT', new: 'Information Technology (IT)' },
            { old: 'Information Technology', new: 'Information Technology (IT)' },
            { old: 'Technology', new: 'Information Technology (IT)' },
            { old: 'Finance', new: 'Finance & Accounts' },
            { old: 'Finance & Banking', new: 'Finance & Accounts' },
            { old: 'Banking', new: 'Finance & Accounts' },
            { old: 'Accounts', new: 'Finance & Accounts' },
            { old: 'Consulting', new: 'Consulting' },
            { old: 'Management Consulting', new: 'Consulting' },
            { old: 'Admin', new: 'Admin' },
            { old: 'Administration', new: 'Admin' },
            { old: 'Administrative', new: 'Admin' },
            { old: 'Architecture', new: 'Architecture' },
            { old: 'Architectural Design', new: 'Architecture' },
            { old: 'Marketing', new: 'Marketing & Branding' },
            { old: 'Marketing & Branding', new: 'Marketing & Branding' },
            { old: 'Branding', new: 'Marketing & Branding' },
            { old: 'Security', new: 'Security & Automation' },
            { old: 'Automation', new: 'Security & Automation' },
            { old: 'Design', new: 'Innovation & Design' },
            { old: 'Innovation', new: 'Innovation & Design' }
        ];

        for (const map of migrations) {
            const [results] = await sequelize.query(`
                UPDATE jobs 
                SET department = '${map.new}' 
                WHERE industry = '${map.old}'
            `);
            if (results.affectedRows > 0) {
                console.log(`  ✓ Migrated ${results.affectedRows} jobs from "${map.old}" → "${map.new}"`);
            }
        }

        // Set any remaining NULL departments to a default
        const [defaultResults] = await sequelize.query(`
            UPDATE jobs 
            SET department = 'Admin' 
            WHERE department IS NULL AND industry IS NOT NULL
        `);
        if (defaultResults.affectedRows > 0) {
            console.log(`  ✓ Set ${defaultResults.affectedRows} unmapped jobs to default "Admin"`);
        }

        console.log('✅ Data migration completed');
        console.log('');

        // Step 3: Check results
        console.log('📋 Step 3: Verifying migration...');
        const [jobs] = await sequelize.query(`
            SELECT 
                id, 
                title, 
                industry, 
                department,
                status,
                createdAt
            FROM jobs 
            ORDER BY createdAt DESC 
            LIMIT 10
        `);

        console.log(`✅ Found ${jobs.length} jobs`);
        console.log('');
        console.log('Recent jobs:');
        jobs.forEach(job => {
            console.log(`  ID: ${job.id} | Title: ${job.title}`);
            console.log(`    Old Industry: ${job.industry || 'NULL'}`);
            console.log(`    New Department: ${job.department || 'NULL'}`);
            console.log(`    Status: ${job.status}`);
            console.log('');
        });

        // Step 4: Drop old industry column
        console.log('📋 Step 4: Dropping old industry column...');
        console.log('⚠️  WARNING: This will permanently remove the industry column!');
        console.log('');
        
        // Uncomment the line below to actually drop the column
        // await sequelize.query(`ALTER TABLE jobs DROP COLUMN industry`);
        console.log('⏸️  Column NOT dropped yet. Uncomment the line in the script to drop it.');
        console.log('   Run this migration again after verifying the data is correct.');
        console.log('');

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Review the data above');
        console.log('   2. If correct, uncomment the DROP COLUMN line and run again');
        console.log('   3. Restart your server');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run migration
migrateIndustryToDepartment()
    .then(() => {
        console.log('✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
