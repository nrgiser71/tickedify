/**
 * Test email imports query fix - verify processed column fix works
 */
require('dotenv').config();
const { Pool } = require('pg');

async function testEmailImportsFix() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const userId = 'user_1760531416053_qwljhrwxp'; // Recent test user
        console.log(`🔍 Testing email imports query fix for user: ${userId}\n`);

        // OLD QUERY - Should FAIL
        console.log('❌ Testing OLD query (should fail)...');
        try {
            const oldQuery = await pool.query(`
                SELECT
                    COUNT(*) as total_imports,
                    COUNT(*) FILTER (WHERE processed = true) as processed_imports
                FROM email_imports
                WHERE user_id = $1
            `, [userId]);
            console.log('   Result:', oldQuery.rows[0]);
            console.log('   ⚠️  WARNING: Old query should have failed but succeeded!');
        } catch (error) {
            console.log('   ✅ Old query failed as expected:', error.message);
        }

        // NEW QUERY - Should SUCCEED
        console.log('\n✅ Testing NEW query (should succeed)...');
        const newQuery = await pool.query(`
            SELECT
                COUNT(*) as total_imports,
                COUNT(*) FILTER (WHERE task_id IS NOT NULL) as processed_imports,
                MIN(imported_at) as first_import,
                MAX(imported_at) as last_import
            FROM email_imports
            WHERE user_id = $1
        `, [userId]);
        console.log('   ✅ Query succeeded!');
        console.log('   Result:', newQuery.rows[0]);

        // Test admin2 stats query
        console.log('\n✅ Testing admin2 stats query...');
        const statsQuery = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE imported_at >= NOW() - INTERVAL '30 days') as recent_30d,
                MIN(imported_at) as oldest_import,
                MAX(imported_at) as newest_import,
                COUNT(*) FILTER (WHERE task_id IS NOT NULL) as processed,
                COUNT(*) FILTER (WHERE task_id IS NOT NULL) as converted_to_task
            FROM email_imports
            WHERE user_id = $1
        `, [userId]);
        console.log('   ✅ Stats query succeeded!');
        console.log('   Result:', statsQuery.rows[0]);

        // Test recent emails query
        console.log('\n✅ Testing recent emails query...');
        const recentQuery = await pool.query(`
            SELECT
                email_from,
                email_subject,
                imported_at,
                CASE WHEN task_id IS NOT NULL THEN true ELSE false END as processed,
                task_id
            FROM email_imports
            WHERE user_id = $1
            ORDER BY imported_at DESC
            LIMIT 10
        `, [userId]);
        console.log('   ✅ Recent emails query succeeded!');
        console.log(`   Found ${recentQuery.rows.length} emails`);

        console.log('\n🎉 ALL FIXED QUERIES SUCCESSFUL!');
        console.log('\n📋 SUMMARY:');
        console.log('   - Total imports:', newQuery.rows[0].total_imports);
        console.log('   - Processed (has task):', newQuery.rows[0].processed_imports);
        console.log('   - First import:', newQuery.rows[0].first_import);
        console.log('   - Last import:', newQuery.rows[0].last_import);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

testEmailImportsFix();
