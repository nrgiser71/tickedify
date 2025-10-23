const { Pool } = require('pg');
require('dotenv').config();

async function testMessageCreation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🧪 Testing message creation...\n');

    // Insert test message
    const result = await pool.query(`
      INSERT INTO admin_messages (title, message, message_type, target_type, trigger_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, created_at
    `, [
      'Welcome to Tickedify Messaging!',
      'This is the first test message from the new messaging system. Click "Got it" to dismiss.',
      'information',
      'all',
      'immediate'
    ]);

    console.log('✅ Message created successfully!');
    console.log('   ID:', result.rows[0].id);
    console.log('   Title:', result.rows[0].title);
    console.log('   Created:', result.rows[0].created_at);

    // Verify it can be retrieved
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count FROM admin_messages WHERE active = true
    `);

    console.log('\n📊 Active messages count:', checkResult.rows[0].count);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testMessageCreation();
