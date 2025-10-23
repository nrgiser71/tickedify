const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUserData() {
  try {
    // Query 1: Check alle 4 gebruikers
    console.log('=== GEBRUIKERS IN DATABASE ===');
    const users = await pool.query(`
      SELECT
        id,
        email,
        naam,
        aangemaakt::date as aangemaakt,
        laatste_login::timestamp as laatste_login
      FROM users
      WHERE email IN (
        'jan@buskens.be',
        'jbs.jan.buskens+testtickedifyfullflow2@gmail.com',
        'info@baasoverjetijd.be',
        'jbs.jan.buskens+testtickedifyfullflow@gmail.com'
      )
      ORDER BY aangemaakt
    `);

    console.table(users.rows);

    // Query 2: Check taken per gebruiker
    console.log('\n=== TAKEN PER GEBRUIKER ===');
    const taken = await pool.query(`
      SELECT
        u.email,
        u.id as user_id,
        t.lijst,
        COUNT(*) as aantal_taken,
        array_agg(t.tekst ORDER BY t.aangemaakt DESC) FILTER (WHERE t.tekst IS NOT NULL) as eerste_3_taken
      FROM users u
      LEFT JOIN taken t ON t.user_id = u.id AND t.afgewerkt IS NULL
      WHERE u.email IN (
        'jan@buskens.be',
        'jbs.jan.buskens+testtickedifyfullflow2@gmail.com'
      )
      GROUP BY u.email, u.id, t.lijst
      ORDER BY u.email, t.lijst
    `);

    taken.rows.forEach(row => {
      console.log(`\n${row.email} (${row.user_id})`);
      console.log(`  Lijst: ${row.lijst || 'NULL'}`);
      console.log(`  Aantal: ${row.aantal_taken}`);
      if (row.eerste_3_taken && row.eerste_3_taken.length > 0) {
        console.log(`  Voorbeelden: ${row.eerste_3_taken.slice(0, 3).join(', ')}`);
      }
    });

    // Query 3: Direct check - heeft nieuwe gebruiker EXACT dezelfde taken?
    console.log('\n=== DIRECTE VERGELIJKING ===');
    const newUserResult = await pool.query(`SELECT id FROM users WHERE email = 'jbs.jan.buskens+testtickedifyfullflow2@gmail.com'`);
    const janUserResult = await pool.query(`SELECT id FROM users WHERE email = 'jan@buskens.be'`);

    if (newUserResult.rows.length > 0 && janUserResult.rows.length > 0) {
      const newUserId = newUserResult.rows[0].id;
      const janUserId = janUserResult.rows[0].id;

      console.log(`\nNieuwe gebruiker ID: ${newUserId}`);
      console.log(`Jan's gebruiker ID: ${janUserId}`);

      const comparison = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM taken WHERE user_id = $1 AND afgewerkt IS NULL) as nieuwe_user_taken,
          (SELECT COUNT(*) FROM taken WHERE user_id = $2 AND afgewerkt IS NULL) as jan_taken,
          (SELECT COUNT(*) FROM taken WHERE user_id = $1 AND lijst = 'inbox' AND afgewerkt IS NULL) as nieuwe_user_inbox,
          (SELECT COUNT(*) FROM taken WHERE user_id = $2 AND lijst = 'inbox' AND afgewerkt IS NULL) as jan_inbox,
          (SELECT COUNT(*) FROM taken WHERE user_id = $1 AND lijst = 'acties' AND afgewerkt IS NULL) as nieuwe_user_acties,
          (SELECT COUNT(*) FROM taken WHERE user_id = $2 AND lijst = 'acties' AND afgewerkt IS NULL) as jan_acties
      `, [newUserId, janUserId]);

      console.log('\nTaken counts:');
      console.table(comparison.rows[0]);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkUserData();
