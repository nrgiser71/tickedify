const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function simulateTrialEnd() {
    try {
        const email = 'jbs.jan.buskens+tickedify202510181@gmail.com';

        // Bereken datums
        const today = new Date();
        const fifteenDaysAgo = new Date(today);
        fifteenDaysAgo.setDate(today.getDate() - 15);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        console.log('🔧 Simuleer trial end voor:', email);
        console.log('📅 Registratie datum (created_at):', fifteenDaysAgo.toISOString());
        console.log('📅 Trial start:', fifteenDaysAgo.toISOString());
        console.log('📅 Trial end (gisteren):', yesterday.toISOString());

        // Update de gebruiker (gebruik aparte parameters voor elke datum)
        const result = await pool.query(`
            UPDATE users
            SET
                created_at = $1::timestamp,
                aangemaakt = $2::timestamp,
                trial_start_date = $3::date,
                trial_end_date = $4::date
            WHERE email = $5
            RETURNING id, email, created_at, trial_start_date, trial_end_date, subscription_status
        `, [
            fifteenDaysAgo.toISOString(),
            fifteenDaysAgo.toISOString(),
            fifteenDaysAgo.toISOString().split('T')[0],
            yesterday.toISOString().split('T')[0],
            email
        ]);

        if (result.rows.length === 0) {
            console.error('❌ Gebruiker niet gevonden');
            return;
        }

        const user = result.rows[0];
        console.log('\n✅ Gebruiker aangepast:');
        console.log(JSON.stringify(user, null, 2));

        // Verificatie
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log('\n✅ Verificatie - volledige gebruiker data:');
        console.log(JSON.stringify(check.rows[0], null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

simulateTrialEnd();
