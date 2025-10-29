// Script to create archive tables in Neon database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createArchiveTables() {
    console.log('🚀 Starting archive tables creation...\n');

    try {
        // Create taken_archief table
        console.log('📦 Creating taken_archief table...');
        await pool.query(`
            CREATE TABLE taken_archief (
                id VARCHAR(50) PRIMARY KEY,
                naam TEXT NOT NULL,
                lijst VARCHAR(50),
                status VARCHAR(20),
                datum VARCHAR(10),
                verschijndatum VARCHAR(10),
                project_id VARCHAR(50) REFERENCES projecten(id),
                context_id VARCHAR(50) REFERENCES contexten(id),
                duur INTEGER,
                opmerkingen TEXT,
                top_prioriteit INTEGER,
                prioriteit_datum VARCHAR(10),
                herhaling_type VARCHAR(50),
                herhaling_waarde INTEGER,
                herhaling_actief BOOLEAN DEFAULT FALSE,
                user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ taken_archief table created\n');

        // Create indexes for taken_archief
        console.log('📇 Creating indexes for taken_archief...');
        await pool.query('CREATE INDEX idx_taken_archief_user_datum ON taken_archief(user_id, datum DESC)');
        console.log('  ✓ idx_taken_archief_user_datum');

        await pool.query('CREATE INDEX idx_taken_archief_user_project ON taken_archief(user_id, project_id)');
        console.log('  ✓ idx_taken_archief_user_project');

        await pool.query('CREATE INDEX idx_taken_archief_user_context ON taken_archief(user_id, context_id)');
        console.log('  ✓ idx_taken_archief_user_context');

        await pool.query('CREATE INDEX idx_taken_archief_archived_at ON taken_archief(archived_at DESC)');
        console.log('  ✓ idx_taken_archief_archived_at\n');

        // Create subtaken_archief table
        console.log('📦 Creating subtaken_archief table...');
        await pool.query(`
            CREATE TABLE subtaken_archief (
                id SERIAL PRIMARY KEY,
                parent_taak_id VARCHAR(50) NOT NULL,
                titel VARCHAR(500) NOT NULL,
                voltooid BOOLEAN DEFAULT TRUE,
                volgorde INTEGER DEFAULT 0,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ subtaken_archief table created\n');

        // Create indexes for subtaken_archief
        console.log('📇 Creating indexes for subtaken_archief...');
        await pool.query('CREATE INDEX idx_subtaken_archief_parent ON subtaken_archief(parent_taak_id)');
        console.log('  ✓ idx_subtaken_archief_parent');

        await pool.query('CREATE INDEX idx_subtaken_archief_archived_at ON subtaken_archief(archived_at DESC)');
        console.log('  ✓ idx_subtaken_archief_archived_at\n');

        // Add foreign key constraint
        console.log('🔗 Adding foreign key constraint...');
        await pool.query(`
            ALTER TABLE subtaken_archief
            ADD CONSTRAINT fk_subtaken_archief_parent
            FOREIGN KEY (parent_taak_id)
            REFERENCES taken_archief(id)
            ON DELETE CASCADE
        `);
        console.log('✅ Foreign key constraint added\n');

        // Verify tables exist
        console.log('🔍 Verifying tables...');
        const takenArchief = await pool.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'taken_archief'
        `);
        console.log(`  ✓ taken_archief exists: ${takenArchief.rows.length > 0}`);

        const subtakenArchief = await pool.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'subtaken_archief'
        `);
        console.log(`  ✓ subtaken_archief exists: ${subtakenArchief.rows.length > 0}\n`);

        // Count indexes
        const indexes = await pool.query(`
            SELECT indexname FROM pg_indexes
            WHERE tablename IN ('taken_archief', 'subtaken_archief')
        `);
        console.log(`  ✓ Total indexes created: ${indexes.rows.length}\n`);

        console.log('🎉 Archive tables successfully created!');
        console.log('\n📋 Next steps:');
        console.log('  1. Deploy code to production (git push)');
        console.log('  2. Run POST /api/admin/copy-to-archive');
        console.log('  3. Test afgewerkt lijst in UI');
        console.log('  4. Run POST /api/admin/cleanup-archived');

    } catch (error) {
        console.error('❌ Error creating archive tables:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n⚠️  Tables already exist. Skipping creation.');
            console.log('Use DROP TABLE if you need to recreate them.\n');
        } else {
            throw error;
        }
    } finally {
        await pool.end();
    }
}

// Run the script
createArchiveTables().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
