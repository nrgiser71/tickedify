const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Haal recente berichten op
    const result = await pool.query(`
      SELECT
        m.id,
        m.title,
        m.message,
        m.target_type,
        m.target_users,
        m.active,
        m.publish_at,
        m.created_at,
        m.trigger_type
      FROM admin_messages m
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    console.log('=== Laatste 5 Admin Berichten ===\n');

    result.rows.forEach(msg => {
      console.log('📧 Bericht ID:', msg.id);
      console.log('   Title:', msg.title);
      console.log('   Target Type:', msg.target_type);
      console.log('   Target Users Array:', JSON.stringify(msg.target_users));
      console.log('   Active:', msg.active);
      console.log('   Trigger Type:', msg.trigger_type);
      console.log('   Created:', msg.created_at);

      if (msg.target_type === 'specific_users') {
        const isEmpty = !msg.target_users || msg.target_users.length === 0;
        if (isEmpty) {
          console.log('   ⚠️  WARNING: Empty target_users array!');
        } else {
          console.log('   ✅ Has', msg.target_users.length, 'target user(s)');
        }
      }
      console.log('---\n');
    });

    // Zoek naar baasoverjetijd en buskens gebruikers
    console.log('\n=== Zoek gebruikers (baasoverjetijd / buskens) ===\n');
    const userSearch = await pool.query(`
      SELECT id, email, naam, created_at
      FROM users
      WHERE email ILIKE '%baasoverjetijd%' OR email ILIKE '%buskens%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (userSearch.rows.length === 0) {
      console.log('❌ Geen gebruikers gevonden');
    } else {
      console.log('✅ Gevonden gebruikers:');
      userSearch.rows.forEach(user => {
        console.log('   -', user.email, '(ID:', user.id + ', Naam:', (user.naam || 'N/A') + ')');
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
