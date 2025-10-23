/**
 * Debug script voor Admin2 User Details 500 Error
 *
 * Test de exacte database query die wordt gebruikt in /api/admin2/users/:id
 * om te bepalen welke query faalt en waarom.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testUserDetailsQueries() {
    try {
        console.log('🔍 Testing Admin2 User Details Queries...\n');

        // Test user ID (from error report)
        const userId = 'user_1760528080063_08xf0g9r1';

        console.log(`Testing with user ID: ${userId}\n`);

        // Query 1: User details met subscriptions en payment_configurations
        console.log('📊 Query 1: User Details with Subscription Tier');
        try {
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
                    u.laatste_login,
                    u.onboarding_video_seen,
                    u.onboarding_video_seen_at
                FROM users u
                LEFT JOIN subscriptions s ON s.user_id = u.id
                WHERE u.id = $1
            `, [userId]);

            if (userQuery.rows.length === 0) {
                console.log(`❌ User ${userId} not found in database`);
                process.exit(1);
            }

            console.log(`✅ User found: ${userQuery.rows[0].email}`);
            console.log(`   Subscription tier: ${userQuery.rows[0].subscription_tier}`);
            console.log(`   Subscription status: ${userQuery.rows[0].subscription_status || 'NULL'}\n`);
        } catch (error) {
            console.log(`❌ Query 1 FAILED:`, error.message);
            console.log(`   Stack:`, error.stack);
            process.exit(1);
        }

        // Query 2: Task summary
        console.log('📊 Query 2: Task Summary');
        try {
            const taskSummaryQuery = await pool.query(`
                SELECT
                    COUNT(*) as total_tasks,
                    COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as completed_tasks,
                    COUNT(*) FILTER (WHERE afgewerkt IS NULL) as active_tasks,
                    COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring_tasks
                FROM taken
                WHERE user_id = $1
            `, [userId]);

            const summary = taskSummaryQuery.rows[0];
            console.log(`✅ Tasks: ${summary.total_tasks} total, ${summary.completed_tasks} completed, ${summary.active_tasks} active, ${summary.recurring_tasks} recurring\n`);
        } catch (error) {
            console.log(`❌ Query 2 FAILED:`, error.message);
            process.exit(1);
        }

        // Query 3: Tasks by project
        console.log('📊 Query 3: Tasks by Project');
        try {
            const tasksByProjectQuery = await pool.query(`
                SELECT project, COUNT(*) as count
                FROM taken
                WHERE user_id = $1 AND project IS NOT NULL
                GROUP BY project
                ORDER BY count DESC
                LIMIT 10
            `, [userId]);

            console.log(`✅ Projects: ${tasksByProjectQuery.rows.length} unique projects\n`);
        } catch (error) {
            console.log(`❌ Query 3 FAILED:`, error.message);
            process.exit(1);
        }

        // Query 4: Tasks by context
        console.log('📊 Query 4: Tasks by Context');
        try {
            const tasksByContextQuery = await pool.query(`
                SELECT context, COUNT(*) as count
                FROM taken
                WHERE user_id = $1 AND context IS NOT NULL
                GROUP BY context
                ORDER BY count DESC
                LIMIT 10
            `, [userId]);

            console.log(`✅ Contexts: ${tasksByContextQuery.rows.length} unique contexts\n`);
        } catch (error) {
            console.log(`❌ Query 4 FAILED:`, error.message);
            process.exit(1);
        }

        // Query 5: Email import summary
        console.log('📊 Query 5: Email Import Summary');
        try {
            const emailSummaryQuery = await pool.query(`
                SELECT
                    COUNT(*) as total_imports,
                    COUNT(*) FILTER (WHERE processed = true) as processed_imports,
                    MIN(imported_at) as first_import,
                    MAX(imported_at) as last_import
                FROM email_imports
                WHERE user_id = $1
            `, [userId]);

            const email = emailSummaryQuery.rows[0];
            console.log(`✅ Emails: ${email.total_imports} total imports, ${email.processed_imports} processed\n`);
        } catch (error) {
            console.log(`❌ Query 5 FAILED:`, error.message);
            process.exit(1);
        }

        // Query 6: Recent email imports
        console.log('📊 Query 6: Recent Email Imports');
        try {
            const recentEmailsQuery = await pool.query(`
                SELECT email_from, email_subject, imported_at
                FROM email_imports
                WHERE user_id = $1
                ORDER BY imported_at DESC
                LIMIT 10
            `, [userId]);

            console.log(`✅ Recent emails: ${recentEmailsQuery.rows.length} recent imports\n`);
        } catch (error) {
            console.log(`❌ Query 6 FAILED:`, error.message);
            process.exit(1);
        }

        // Query 7: Subscription details met payment configuration (KRITIEKE QUERY)
        console.log('📊 Query 7: Subscription Details with Payment Configuration (CRITICAL)');
        try {
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
            `, [userId]);

            const sub = subscriptionQuery.rows[0];
            console.log(`✅ Subscription details retrieved:`);
            console.log(`   Status: ${sub.subscription_status || 'NULL'}`);
            console.log(`   Tier: ${sub.subscription_tier}`);
            console.log(`   Plan name: ${sub.plan_name || 'NULL'}`);
            console.log(`   Price monthly: ${sub.price_monthly || 'NULL'}`);
            console.log(`   Checkout URL: ${sub.checkout_url ? 'SET' : 'NULL'}\n`);
        } catch (error) {
            console.log(`❌ Query 7 FAILED (THIS IS THE SUSPECTED CULPRIT):`, error.message);
            console.log(`   Error code:`, error.code);
            console.log(`   Stack:`, error.stack);
            process.exit(1);
        }

        console.log('\n✅ ALL QUERIES PASSED - No errors detected!');
        console.log('   If the endpoint is still failing, the issue is in response formatting or middleware.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    } finally {
        await pool.end();
    }
}

testUserDetailsQueries();
