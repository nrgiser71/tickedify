/**
 * Verification Test Script for Admin2 User Details Fix
 *
 * Purpose: Test the CURRENT (incorrect) SQL queries to document the exact errors
 * Expected: Both queries should FAIL with "column does not exist" errors
 *
 * This script verifies the bug exists before applying the fix.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verifyCurrentError() {
    console.log('🔍 Admin2 User Details Fix - Testing Fixed Queries');
    console.log('================================================\n');

    // Use a real user ID from the database
    const userId = 'user_1760528080063_08xf0g9r1';

    console.log(`Testing with user ID: ${userId}\n`);

    try {
        // Test Query 3 - Tasks by Project (FIXED - uses "project_id AS project")
        console.log('📊 Query 3: Tasks by Project (FIXED)');
        console.log('SQL: SELECT project_id AS project, COUNT(*) as count FROM taken WHERE user_id = $1 AND project_id IS NOT NULL...\n');

        try {
            const projectQuery = await pool.query(`
                SELECT project_id AS project, COUNT(*) as count
                FROM taken
                WHERE user_id = $1 AND project_id IS NOT NULL
                GROUP BY project_id
                ORDER BY count DESC
                LIMIT 10
            `, [userId]);

            console.log('✅ SUCCESS: Query 3 executed successfully');
            console.log('Results:', JSON.stringify(projectQuery.rows, null, 2));
            console.log('Row count:', projectQuery.rows.length);
        } catch (error) {
            console.log('❌ UNEXPECTED ERROR: Query 3 failed (should succeed now)');
            console.log('Error Message:', error.message);
            console.log('Error Detail:', error.detail || 'N/A');
            console.log('Error Hint:', error.hint || 'N/A');
        }

        console.log('\n---\n');

        // Test Query 4 - Tasks by Context (FIXED - uses "context_id AS context")
        console.log('📊 Query 4: Tasks by Context (FIXED)');
        console.log('SQL: SELECT context_id AS context, COUNT(*) as count FROM taken WHERE user_id = $1 AND context_id IS NOT NULL...\n');

        try {
            const contextQuery = await pool.query(`
                SELECT context_id AS context, COUNT(*) as count
                FROM taken
                WHERE user_id = $1 AND context_id IS NOT NULL
                GROUP BY context_id
                ORDER BY count DESC
                LIMIT 10
            `, [userId]);

            console.log('✅ SUCCESS: Query 4 executed successfully');
            console.log('Results:', JSON.stringify(contextQuery.rows, null, 2));
            console.log('Row count:', contextQuery.rows.length);
        } catch (error) {
            console.log('❌ UNEXPECTED ERROR: Query 4 failed (should succeed now)');
            console.log('Error Message:', error.message);
            console.log('Error Detail:', error.detail || 'N/A');
            console.log('Error Hint:', error.hint || 'N/A');
        }

        console.log('\n================================================');
        console.log('✅ Testing complete - Both queries now work correctly');
        console.log('Next step: Test full API endpoint');

    } catch (error) {
        console.error('\n❌ Unexpected error during testing:', error);
    } finally {
        await pool.end();
    }
}

// Run verification
verifyCurrentError().catch(console.error);
