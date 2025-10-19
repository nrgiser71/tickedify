/**
 * Migration 016: Create email_imports table
 * Run with: node run-migration-016.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection from environment or direct config
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://neondb_owner:npg_1BYw6ZPpGsnl@ep-cool-feather-a28nzhre-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('📊 Starting migration 016: Create email_imports table...');

        // Read migration SQL file
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migrations', '016-create-email-imports-table.sql'),
            'utf8'
        );

        // Execute migration
        await client.query('BEGIN');
        const result = await client.query(migrationSQL);
        await client.query('COMMIT');

        console.log('✅ Migration completed successfully!');
        console.log('📋 Results:', result);

        // Verify table exists
        const verification = await client.query(`
            SELECT
                table_name,
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'email_imports'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 Table structure:');
        console.table(verification.rows);

        // Check indexes
        const indexes = await client.query(`
            SELECT
                indexname,
                indexdef
            FROM pg_indexes
            WHERE tablename = 'email_imports'
        `);

        console.log('\n🔍 Indexes created:');
        console.table(indexes.rows);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n🎉 Migration 016 completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Migration failed:', error.message);
        process.exit(1);
    });
