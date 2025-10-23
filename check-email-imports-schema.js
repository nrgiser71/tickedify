/**
 * Check email_imports table schema to verify 'processed' column exists
 */

const { pool } = require('./database.js');

async function checkSchema() {
    try {
        console.log('📊 Checking email_imports table schema...\n');

        // Check column information
        const result = await pool.query(`
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'email_imports'
            ORDER BY ordinal_position
        `);

        console.log('Columns found:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });

        // Check if processed column exists
        const hasProcessed = result.rows.some(col => col.column_name === 'processed');
        console.log(`\n✓ Has 'processed' column: ${hasProcessed}`);

        if (!hasProcessed) {
            console.log('\n❌ PROBLEEM: Column "processed" bestaat NIET in de database!');
            console.log('   → Migratie 016 is mogelijk niet uitgevoerd');
            console.log('   → Of kolom is verwijderd in een latere migratie');
        } else {
            console.log('\n✅ Column "processed" bestaat wel in de database');
        }

        await pool.end();

    } catch (error) {
        console.error('❌ Error checking schema:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

checkSchema();
