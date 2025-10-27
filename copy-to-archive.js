// Script to copy completed tasks to archive tables (STAP 2)
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function copyToArchive() {
    console.log('📋 Starting copy-to-archive operation (STAP 2)...\n');

    try {
        const startTime = Date.now();

        // Start transaction
        await pool.query('BEGIN');
        console.log('🔄 Transaction started\n');

        // Copy completed tasks to archive (with ON CONFLICT to make idempotent)
        console.log('📦 Copying taken to taken_archief...');
        const takenResult = await pool.query(`
            INSERT INTO taken_archief (
                id, tekst, aangemaakt, lijst, project_id, verschijndatum,
                context_id, duur, type, afgewerkt,
                herhaling_type, herhaling_waarde, herhaling_actief,
                opmerkingen, user_id, top_prioriteit, prioriteit_datum, prioriteit,
                archived_at
            )
            SELECT
                id, tekst, aangemaakt, lijst, project_id, verschijndatum,
                context_id, duur, type, afgewerkt,
                herhaling_type, herhaling_waarde, herhaling_actief,
                opmerkingen, user_id, top_prioriteit, prioriteit_datum, prioriteit,
                CURRENT_TIMESTAMP
            FROM taken
            WHERE afgewerkt IS NOT NULL
            ON CONFLICT (id) DO NOTHING
        `);
        console.log(`  ✅ Copied ${takenResult.rowCount} taken to archive\n`);

        // Copy subtaken for completed tasks (with ON CONFLICT to make idempotent)
        console.log('📋 Copying subtaken to subtaken_archief...');
        const subtakenResult = await pool.query(`
            INSERT INTO subtaken_archief (
                id, parent_taak_id, titel, voltooid, volgorde, created_at, archived_at
            )
            SELECT
                s.id, s.parent_taak_id, s.titel, s.voltooid, s.volgorde, s.created_at, CURRENT_TIMESTAMP
            FROM subtaken s
            INNER JOIN taken t ON s.parent_taak_id = t.id
            WHERE t.afgewerkt IS NOT NULL
            ON CONFLICT (id) DO NOTHING
        `);
        console.log(`  ✅ Copied ${subtakenResult.rowCount} subtaken to archive\n`);

        // Commit transaction
        await pool.query('COMMIT');
        console.log('✅ Transaction committed successfully\n');

        const duration = Date.now() - startTime;

        // Verify copy was successful
        console.log('🔍 Verifying copy results...');
        const verifyTaken = await pool.query('SELECT COUNT(*) FROM taken_archief');
        const verifySubtaken = await pool.query('SELECT COUNT(*) FROM subtaken_archief');

        console.log(`  ✓ Total in taken_archief: ${verifyTaken.rows[0].count}`);
        console.log(`  ✓ Total in subtaken_archief: ${verifySubtaken.rows[0].count}\n`);

        // Show sample of copied tasks
        const sample = await pool.query(`
            SELECT id, tekst, archived_at, user_id
            FROM taken_archief
            ORDER BY archived_at DESC
            LIMIT 5
        `);

        if (sample.rows.length > 0) {
            console.log('📄 Sample of archived tasks:');
            sample.rows.forEach(task => {
                const displayName = task.tekst?.substring(0, 50) || 'Unnamed task';
                console.log(`  - ${displayName} (ID: ${task.id.substring(0, 15)}...)`);
            });
            console.log('');
        }

        // Final summary
        console.log('🎉 Copy operation completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`  • Tasks copied: ${takenResult.rowCount}`);
        console.log(`  • Subtasks copied: ${subtakenResult.rowCount}`);
        console.log(`  • Duration: ${duration}ms`);
        console.log(`  • Total in archive: ${verifyTaken.rows[0].count} tasks, ${verifySubtaken.rows[0].count} subtasks\n`);

        console.log('⚠️  IMPORTANT: Tasks are NOT deleted from active table yet!');
        console.log('   Data exists in BOTH tables until STAP 5 (cleanup).\n');

        console.log('📋 Next steps:');
        console.log('  STAP 3: Deploy code to production');
        console.log('  STAP 4: Test afgewerkt lijst in UI');
        console.log('  STAP 5: Run cleanup-archived.js to delete from active table');

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Copy-to-archive error:', error.message);
        console.error('\nFull error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the script
copyToArchive().catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    process.exit(1);
});
