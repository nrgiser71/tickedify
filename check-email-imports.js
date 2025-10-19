/**
 * Check email_imports table data
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://neondb_owner:npg_1BYw6ZPpGsnl@ep-cool-feather-a28nzhre-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkData() {
    try {
        // Count rows
        const countResult = await pool.query('SELECT COUNT(*) as count FROM email_imports');
        console.log('📊 Total rows:', countResult.rows[0].count);

        // Get sample data
        const sampleResult = await pool.query('SELECT * FROM email_imports LIMIT 5');
        console.log('\n📋 Sample data:');
        console.table(sampleResult.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkData();
