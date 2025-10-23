// Geef jan@buskens.be admin rechten
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixAdminAccount() {
    try {
        // Check current status
        const check = await pool.query(
            'SELECT id, email, account_type FROM users WHERE email = $1',
            ['jan@buskens.be']
        );

        console.log('Current status:', check.rows[0]);

        // Update to admin
        const update = await pool.query(
            "UPDATE users SET account_type = 'admin' WHERE email = $1 RETURNING id, email, account_type",
            ['jan@buskens.be']
        );

        console.log('Updated to:', update.rows[0]);
        console.log('✅ jan@buskens.be is now admin');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixAdminAccount();
