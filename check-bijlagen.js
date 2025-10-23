const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkBijlagen() {
    try {
        const userId = 'user_1760793164528_3klplu959';
        const email = 'jbs.jan.buskens+tickedify202510181@gmail.com';

        console.log('🔍 Checking bijlagen for user:', email);
        console.log('User ID:', userId);
        console.log('');

        // Get user's tasks
        const tasksResult = await pool.query(`
            SELECT id, tekst, lijst
            FROM taken
            WHERE user_id = $1 AND lijst = 'acties'
            ORDER BY aangemaakt DESC
        `, [userId]);

        console.log('📋 User tasks in acties lijst:', tasksResult.rows.length);
        tasksResult.rows.forEach(task => {
            console.log(`  - Task ${task.id}: ${task.tekst}`);
        });
        console.log('');

        // Get all bijlagen for this user
        const bijlagenResult = await pool.query(`
            SELECT
                b.id,
                b.taak_id,
                b.bestandsnaam,
                b.bestandsgrootte,
                b.mimetype,
                b.geupload,
                b.storage_path,
                t.tekst as taak_tekst
            FROM bijlagen b
            LEFT JOIN taken t ON b.taak_id = t.id
            WHERE t.user_id = $1
            ORDER BY b.geupload DESC
        `, [userId]);

        console.log('📎 Bijlagen found:', bijlagenResult.rows.length);
        if (bijlagenResult.rows.length > 0) {
            bijlagenResult.rows.forEach(bijlage => {
                console.log('');
                console.log(`  Bijlage ID: ${bijlage.id}`);
                console.log(`  Task ID: ${bijlage.taak_id}`);
                console.log(`  Task Text: ${bijlage.taak_tekst || 'N/A'}`);
                console.log(`  Filename: ${bijlage.bestandsnaam}`);
                console.log(`  Size: ${bijlage.bestandsgrootte} bytes`);
                console.log(`  Mimetype: ${bijlage.mimetype}`);
                console.log(`  Uploaded: ${bijlage.geupload}`);
                console.log(`  Storage Path: ${bijlage.storage_path}`);
            });
        } else {
            console.log('  ❌ No bijlagen found for this user');
        }

        // Check bijlagen per task
        console.log('');
        console.log('📊 Bijlagen per task:');
        for (const task of tasksResult.rows) {
            const taskBijlagen = await pool.query(`
                SELECT id, bestandsnaam, bestandsgrootte
                FROM bijlagen
                WHERE taak_id = $1
            `, [task.id]);
            console.log(`  Task ${task.id} (${task.tekst}): ${taskBijlagen.rows.length} bijlagen`);
            if (taskBijlagen.rows.length > 0) {
                taskBijlagen.rows.forEach(b => {
                    console.log(`    - ${b.bestandsnaam} (${b.bestandsgrootte} bytes)`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkBijlagen();
