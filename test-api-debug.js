/**
 * Debug script to test the admin2 user details API endpoint
 * This will show us the exact error message from the server
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function testUserDetailsEndpoint() {
    console.log('🔍 Testing Admin2 User Details Endpoint Logic');
    console.log('==============================================\n');

    // Use the user ID from the screenshot search
    const userId = 'jan@buskens.be'; // This is what was searched

    console.log(`Searching for user with email/id: ${userId}\n`);

    try {
        // First, let's find the actual user ID for "jan"
        const searchQuery = await pool.query(`
            SELECT id, email, naam
            FROM users
            WHERE email ILIKE $1 OR naam ILIKE $1
            LIMIT 10
        `, [`%${userId}%`]);

        console.log('📊 Search Results:');
        console.log(JSON.stringify(searchQuery.rows, null, 2));
        console.log('');

        if (searchQuery.rows.length === 0) {
            console.log('❌ No users found matching "jan"');
            return;
        }

        // Test with the first user found
        const testUserId = searchQuery.rows[0].id;
        console.log(`\n🧪 Testing endpoint logic with user ID: ${testUserId}`);
        console.log('==============================================\n');

        // Now run all 7 queries from the endpoint
        console.log('Query 1: User Details...');
        const userQuery = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.naam,
                u.account_type,
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as subscription_tier,
                u.subscription_status,
                u.trial_end_date,
                u.actief,
                u.created_at,
                u.laatste_login
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.id = $1
        `, [testUserId]);
        console.log('✅ Query 1 SUCCESS');

        console.log('\nQuery 2: Task Summary...');
        const taskSummaryQuery = await pool.query(`
            SELECT
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as completed_tasks,
                COUNT(*) FILTER (WHERE afgewerkt IS NULL) as active_tasks,
                COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring_tasks
            FROM taken
            WHERE user_id = $1
        `, [testUserId]);
        console.log('✅ Query 2 SUCCESS');

        console.log('\nQuery 3: Tasks by Project (FIXED)...');
        const tasksByProjectQuery = await pool.query(`
            SELECT project_id AS project, COUNT(*) as count
            FROM taken
            WHERE user_id = $1 AND project_id IS NOT NULL
            GROUP BY project_id
            ORDER BY count DESC
            LIMIT 10
        `, [testUserId]);
        console.log('✅ Query 3 SUCCESS');
        console.log('Projects:', tasksByProjectQuery.rows);

        console.log('\nQuery 4: Tasks by Context (FIXED)...');
        const tasksByContextQuery = await pool.query(`
            SELECT context_id AS context, COUNT(*) as count
            FROM taken
            WHERE user_id = $1 AND context_id IS NOT NULL
            GROUP BY context_id
            ORDER BY count DESC
            LIMIT 10
        `, [testUserId]);
        console.log('✅ Query 4 SUCCESS');
        console.log('Contexts:', tasksByContextQuery.rows);

        console.log('\nQuery 5: Email Summary (FIXED)...');
        const emailSummaryQuery = await pool.query(`
            SELECT
                COUNT(*) as total_imports,
                COUNT(*) FILTER (WHERE task_id IS NOT NULL) as processed_imports,
                MIN(imported_at) as first_import,
                MAX(imported_at) as last_import
            FROM email_imports
            WHERE user_id = $1
        `, [testUserId]);
        console.log('✅ Query 5 SUCCESS');

        console.log('\nQuery 6: Recent Emails...');
        const recentEmailsQuery = await pool.query(`
            SELECT email_from, email_subject, imported_at
            FROM email_imports
            WHERE user_id = $1
            ORDER BY imported_at DESC
            LIMIT 10
        `, [testUserId]);
        console.log('✅ Query 6 SUCCESS');

        console.log('\nQuery 7: Subscription Details...');
        const subscriptionQuery = await pool.query(`
            SELECT
                u.subscription_status,
                CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END as subscription_tier,
                u.trial_end_date,
                pc.plan_name,
                pc.checkout_url,
                pc.price_monthly
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            LEFT JOIN payment_configurations pc
                ON pc.plan_id = CASE
                    WHEN s.id IS NULL THEN 'free'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' AND s.addon_storage = 'basic' THEN 'monthly_7'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' AND s.addon_storage = 'basic' THEN 'yearly_70'
                    WHEN s.status = 'active' AND s.plan_type = 'monthly' THEN 'monthly_8'
                    WHEN s.status = 'active' AND s.plan_type = 'yearly' THEN 'yearly_80'
                    WHEN s.status = 'trial' THEN 'trial'
                    ELSE 'free'
                END AND pc.is_active = true
            WHERE u.id = $1
        `, [testUserId]);
        console.log('✅ Query 7 SUCCESS');

        console.log('\n==============================================');
        console.log('✅ ALL 7 QUERIES SUCCESSFUL!');
        console.log('==============================================');
        console.log('\nThe endpoint logic should work correctly.');
        console.log('If the UI still shows an error, it might be:');
        console.log('1. Browser cache (try hard refresh: Cmd+Shift+R)');
        console.log('2. Session/authentication issue');
        console.log('3. Frontend JavaScript error');

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED:');
        console.error('Message:', error.message);
        console.error('Detail:', error.detail);
        console.error('Hint:', error.hint);
        console.error('\nFull error:', error);
    } finally {
        await pool.end();
    }
}

testUserDetailsEndpoint().catch(console.error);
