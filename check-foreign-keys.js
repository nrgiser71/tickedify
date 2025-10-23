const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkForeignKeys() {
    try {
        console.log('🔍 Checking foreign key constraints on bijlagen table:\n');
        
        const result = await pool.query(`
            SELECT
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule,
                rc.update_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'bijlagen'
        `);
        
        if (result.rows.length > 0) {
            console.log('Foreign keys found:');
            result.rows.forEach(row => {
                console.log(`\n  Column: ${row.column_name}`);
                console.log(`  References: ${row.foreign_table_name}(${row.foreign_column_name})`);
                console.log(`  ON DELETE: ${row.delete_rule}`);
                console.log(`  ON UPDATE: ${row.update_rule}`);
            });
        } else {
            console.log('❌ No foreign key constraints found on bijlagen table');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkForeignKeys();
