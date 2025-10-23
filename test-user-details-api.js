// Test user details API endpoint directly
require('dotenv').config();
const { Pool } = require('pg');

async function testUserDetailsAPI() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const userId = 'user_1760531416053_qwljhrwxp'; // Recent test user
        console.log(`🔍 Testing user details API for user: ${userId}\n`);

        // 1. Get user details
        console.log('1️⃣ Fetching user details...');
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
        `, [userId]);

        if (userQuery.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        console.log('✅ User found:', userQuery.rows[0].email);

        // 2. Get task summary (FIXED: afgewerkt instead of voltooid)
        console.log('\n2️⃣ Fetching task summary...');
        const taskSummaryQuery = await pool.query(`
            SELECT
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE afgewerkt = true) as completed_tasks,
                COUNT(*) FILTER (WHERE afgewerkt = false) as active_tasks,
                COUNT(*) FILTER (WHERE herhaling_actief = true) as recurring_tasks
            FROM taken
            WHERE user_id = $1
        `, [userId]);
        console.log('✅ Tasks:', taskSummaryQuery.rows[0]);

        // 3. Get email summary
        console.log('\n3️⃣ Fetching email summary...');
        const emailSummaryQuery = await pool.query(`
            SELECT
                COUNT(*) as total_imports,
                COUNT(*) FILTER (WHERE processed = true) as processed_imports
            FROM email_imports
            WHERE user_id = $1
        `, [userId]);
        console.log('✅ Emails:', emailSummaryQuery.rows[0]);

        // 4. Get subscription details with payment configuration
        console.log('\n4️⃣ Fetching subscription details...');
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
        console.log('✅ Subscription:', subscriptionQuery.rows[0]);

        console.log('\n✅ ALL QUERIES SUCCESSFUL - API should work!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

testUserDetailsAPI();
