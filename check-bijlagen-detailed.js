const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkBijlagenDetailed() {
    try {
        const userId = 'user_1760793164528_3klplu959';
        
        console.log('🔍 DETAILED BIJLAGEN CHECK\n');
        
        // 1. Check bijlagen table structure
        console.log('1️⃣ Checking bijlagen table structure:');
        const tableInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bijlagen'
            ORDER BY ordinal_position
        `);
        console.log('   Columns:', tableInfo.rows.map(r => r.column_name).join(', '));
        console.log('');
        
        // 2. Check ALL bijlagen in database (not filtered by user)
        console.log('2️⃣ Total bijlagen in database:');
        const totalBijlagen = await pool.query('SELECT COUNT(*) FROM bijlagen');
        console.log('   Total: ', totalBijlagen.rows[0].count);
        console.log('');
        
        // 3. Check user_storage_usage
        console.log('3️⃣ User storage usage:');
        const storageUsage = await pool.query(`
            SELECT * FROM user_storage_usage WHERE user_id = $1
        `, [userId]);
        if (storageUsage.rows.length > 0) {
            console.log('   Storage record found:');
            console.log('   ', JSON.stringify(storageUsage.rows[0], null, 2));
        } else {
            console.log('   ❌ No storage record found');
        }
        console.log('');
        
        // 4. Direct query bijlagen for this user (using user_id column if it exists)
        console.log('4️⃣ Bijlagen with user_id column (if exists):');
        try {
            const directBijlagen = await pool.query(`
                SELECT * FROM bijlagen WHERE user_id = $1
            `, [userId]);
            console.log('   Found:', directBijlagen.rows.length, 'bijlagen');
            if (directBijlagen.rows.length > 0) {
                directBijlagen.rows.forEach(b => {
                    console.log('   -', b.bestandsnaam, '(', b.bestandsgrootte, 'bytes)');
                });
            }
        } catch (e) {
            console.log('   ⚠️  user_id column does not exist in bijlagen table');
        }
        console.log('');
        
        // 5. Get user's tasks
        console.log('5️⃣ User tasks:');
        const tasks = await pool.query(`
            SELECT id, tekst FROM taken WHERE user_id = $1 AND lijst = 'acties'
        `, [userId]);
        console.log('   Tasks:', tasks.rows.length);
        tasks.rows.forEach(t => console.log('   -', t.id, ':', t.tekst));
        console.log('');
        
        // 6. Bijlagen per task (using task IDs)
        console.log('6️⃣ Bijlagen per task:');
        for (const task of tasks.rows) {
            const bijlagen = await pool.query(`
                SELECT * FROM bijlagen WHERE taak_id = $1
            `, [task.id]);
            console.log(`   Task ${task.id}:`, bijlagen.rows.length, 'bijlagen');
            if (bijlagen.rows.length > 0) {
                bijlagen.rows.forEach(b => {
                    console.log('     -', b.bestandsnaam, '(', b.bestandsgrootte, 'bytes)', '- ID:', b.id);
                });
            }
        }
        console.log('');
        
        // 7. Check if there are any bijlagen at all
        console.log('7️⃣ All bijlagen (first 10):');
        const allBijlagen = await pool.query(`
            SELECT id, taak_id, bestandsnaam, bestandsgrootte, geupload 
            FROM bijlagen 
            ORDER BY geupload DESC 
            LIMIT 10
        `);
        if (allBijlagen.rows.length > 0) {
            allBijlagen.rows.forEach(b => {
                console.log('   -', b.bestandsnaam, '- Task:', b.taak_id, '- Size:', b.bestandsgrootte);
            });
        } else {
            console.log('   ❌ No bijlagen found in entire database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

checkBijlagenDetailed();
