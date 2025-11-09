require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log('🔄 Running page_help table migration...');
        console.log(`📦 Database: ${process.env.DATABASE_URL?.substring(0, 30)}...`);

        // Read migration file
        const sqlPath = path.join(__dirname, 'migrations', 'create-page-help-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Executing SQL from:', sqlPath);

        // Execute migration
        await pool.query(sql);

        console.log('✅ page_help table created successfully!');

        // Verify table exists
        const check = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'page_help'
            ORDER BY ordinal_position
        `);

        if (check.rows.length === 0) {
            throw new Error('Table verification failed - no columns found');
        }

        console.log('\n📋 Table structure:');
        check.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
        });

        // Check if any data exists
        const countResult = await pool.query('SELECT COUNT(*) as count FROM page_help');
        console.log(`\n📊 Current rows in table: ${countResult.rows[0].count}`);

        console.log('\n✅ Migration completed successfully!');
        console.log('💡 Next steps:');
        console.log('   1. Test via admin2: Update help content');
        console.log('   2. Verify via main app: Click help icon');
        console.log('   3. Check API: fetch(\'/api/page-help/dagelijkse-planning\')');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
