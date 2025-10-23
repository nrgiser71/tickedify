const { Pool } = require('pg');
require('dotenv').config();

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('Users table schema:');
    result.rows.forEach(row => {
      console.log('  ' + row.column_name + ': ' + row.data_type + 
                  (row.character_maximum_length ? '(' + row.character_maximum_length + ')' : ''));
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
