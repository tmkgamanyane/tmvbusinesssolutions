const { pool } = require('../config/database');
const fs = require('fs').promises;

async function runMigrations() {
    try {
        console.log('Starting database migrations...');

        // Read and execute the all_tables.sql file
        const sqlFile = await fs.readFile('./all_tables.sql', 'utf8');
        const statements = sqlFile.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await pool.execute(statement);
                console.log('Executed:', statement.substring(0, 100) + '...');
            }
        }

        console.log('✅ All migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();