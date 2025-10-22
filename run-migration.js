// Run database migration to add price_monthly column
require('dotenv').config();
const { Pool } = require('pg');

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Starting migration: Add price_monthly column...');

        // Add column
        await pool.query(`
            ALTER TABLE payment_configurations
            ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2)
        `);
        console.log('✅ Column price_monthly added (or already exists)');

        // Update existing rows
        const updates = [
            { plan_id: 'monthly_7', price: 7.00 },
            { plan_id: 'yearly_70', price: 5.83 },
            { plan_id: 'monthly_8', price: 8.00 },
            { plan_id: 'yearly_80', price: 6.67 }
        ];

        for (const { plan_id, price } of updates) {
            const result = await pool.query(`
                UPDATE payment_configurations
                SET price_monthly = $1
                WHERE plan_id = $2 AND price_monthly IS NULL
                RETURNING plan_id, price_monthly
            `, [price, plan_id]);

            if (result.rowCount > 0) {
                console.log(`✅ Updated ${plan_id}: €${price}`);
            } else {
                console.log(`⏭️  Skipped ${plan_id} (already has value or doesn't exist)`);
            }
        }

        // Verify results
        console.log('\n📊 Current payment_configurations:');
        const verify = await pool.query(`
            SELECT plan_id, plan_name, price_monthly, is_active
            FROM payment_configurations
            ORDER BY plan_id
        `);
        console.table(verify.rows);

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
