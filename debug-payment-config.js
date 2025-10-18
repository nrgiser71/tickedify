// Debug script to check payment_configurations in database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkPaymentConfig() {
    try {
        console.log('🔍 Checking payment_configurations table...\n');

        const result = await pool.query(`
            SELECT
                plan_id,
                checkout_url,
                is_active,
                created_at,
                updated_at
            FROM payment_configurations
            ORDER BY created_at DESC
        `);

        if (result.rows.length === 0) {
            console.log('❌ NO payment configurations found in database!');
            console.log('\nThis explains why users cannot proceed to payment page.');
            console.log('The /api/subscription/select endpoint returns error when no config is found.\n');
        } else {
            console.log(`✅ Found ${result.rows.length} payment configuration(s):\n`);
            result.rows.forEach((config, i) => {
                console.log(`[${i + 1}] Plan ID: ${config.plan_id}`);
                console.log(`    Checkout URL: ${config.checkout_url || '❌ NULL'}`);
                console.log(`    Is Active: ${config.is_active ? '✅ TRUE' : '❌ FALSE'}`);
                console.log(`    Created: ${config.created_at}`);
                console.log(`    Updated: ${config.updated_at || 'never'}`);
                console.log('');
            });
        }

        // Check for specific plans user might select
        console.log('\n🔍 Checking specific plans user can select:\n');
        const plans = ['monthly_7', 'yearly_70', 'monthly_8', 'yearly_80'];

        for (const planId of plans) {
            const planResult = await pool.query(
                'SELECT plan_id, checkout_url, is_active FROM payment_configurations WHERE plan_id = $1',
                [planId]
            );

            if (planResult.rows.length === 0) {
                console.log(`❌ ${planId}: NOT CONFIGURED`);
            } else {
                const config = planResult.rows[0];
                const status = config.is_active && config.checkout_url ? '✅' : '❌';
                console.log(`${status} ${planId}: ${config.is_active ? 'Active' : 'Inactive'}, URL: ${config.checkout_url ? 'Set' : 'NULL'}`);
            }
        }

    } catch (error) {
        console.error('❌ Error checking payment config:', error.message);
    } finally {
        await pool.end();
    }
}

checkPaymentConfig();
