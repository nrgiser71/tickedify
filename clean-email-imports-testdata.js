/**
 * Clean test data from email_imports table
 * Removes all 30 test records created during testing
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://neondb_owner:npg_1BYw6ZPpGsnl@ep-cool-feather-a28nzhre-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function cleanTestData() {
    try {
        // Check current count
        console.log('📊 Checking current email_imports data...');
        const beforeResult = await pool.query('SELECT COUNT(*) as count FROM email_imports');
        const beforeCount = parseInt(beforeResult.rows[0].count);
        console.log(`   Current records: ${beforeCount}`);

        // Show sample data
        const sampleResult = await pool.query('SELECT id, email_from, email_subject FROM email_imports LIMIT 5');
        console.log('\n📋 Sample records to be deleted:');
        console.table(sampleResult.rows);

        // Delete all test data
        console.log('\n🗑️  Deleting all test records...');
        const deleteResult = await pool.query('DELETE FROM email_imports');
        console.log(`   Deleted: ${deleteResult.rowCount} records`);

        // Verify cleanup
        const afterResult = await pool.query('SELECT COUNT(*) as count FROM email_imports');
        const afterCount = parseInt(afterResult.rows[0].count);
        console.log(`\n✅ Cleanup complete!`);
        console.log(`   Records before: ${beforeCount}`);
        console.log(`   Records after: ${afterCount}`);

        if (afterCount === 0) {
            console.log('\n🎉 email_imports tabel is nu leeg en klaar voor echte data!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

cleanTestData()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('💥 Failed:', error.message);
        process.exit(1);
    });
