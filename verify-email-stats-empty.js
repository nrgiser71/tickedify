/**
 * Verify email_imports statistics after cleanup
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://neondb_owner:npg_1BYw6ZPpGsnl@ep-cool-feather-a28nzhre-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function verifyStats() {
    try {
        console.log('📊 Verifying email import statistics...\n');

        // Total emails imported
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM email_imports');
        const totalImports = parseInt(totalResult.rows[0].count);

        // Emails imported today
        const todayResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_imports
            WHERE DATE(imported_at) = CURRENT_DATE
        `);
        const importedToday = parseInt(todayResult.rows[0].count);

        // Emails imported this week
        const weekResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_imports
            WHERE imported_at >= DATE_TRUNC('week', NOW())
        `);
        const importedWeek = parseInt(weekResult.rows[0].count);

        // Emails imported this month
        const monthResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_imports
            WHERE imported_at >= DATE_TRUNC('month', NOW())
        `);
        const importedMonth = parseInt(monthResult.rows[0].count);

        // Users with email imports
        const usersWithImportResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM email_imports
        `);
        const usersWithImportCount = parseInt(usersWithImportResult.rows[0].count);

        // Total users
        const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        const usersWithImportPercentage = totalUsers > 0
            ? parseFloat(((usersWithImportCount / totalUsers) * 100).toFixed(2))
            : 0;

        console.log('📈 Email Import Statistics:');
        console.log('────────────────────────────────');
        console.log(`Total Imports:        ${totalImports}`);
        console.log(`Imported Today:       ${importedToday}`);
        console.log(`Imported This Week:   ${importedWeek}`);
        console.log(`Imported This Month:  ${importedMonth}`);
        console.log(`Users with Imports:   ${usersWithImportCount}`);
        console.log(`Total Users:          ${totalUsers}`);
        console.log(`Adoption Rate:        ${usersWithImportPercentage}%`);
        console.log('────────────────────────────────');

        if (totalImports === 0) {
            console.log('\n✅ Correct! Email analytics should now show 0 everywhere.');
            console.log('   Next email import will be tracked and increment these stats.');
        } else {
            console.log('\n⚠️  Warning: Still have data in email_imports table!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

verifyStats();
