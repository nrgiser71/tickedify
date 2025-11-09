require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    try {
        const result = await pool.query('SELECT page_id, LEFT(content, 100) as content_preview, modified_at, modified_by FROM page_help ORDER BY page_id');

        console.log('\n📋 Current page_help rows:');
        console.log('='.repeat(80));
        result.rows.forEach(row => {
            console.log(`\nPage ID: ${row.page_id}`);
            console.log(`Content preview: ${row.content_preview}...`);
            console.log(`Modified: ${row.modified_at}`);
            console.log(`By: ${row.modified_by}`);
            console.log('-'.repeat(80));
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkData();
