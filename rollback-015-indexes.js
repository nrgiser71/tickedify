/**
 * Migration Rollback: 015-admin2-performance-indexes
 *
 * Purpose: Drop performance indexes voor Admin Dashboard v2
 * Feature: T026 - Database performance optimization rollback
 *
 * Usage: node rollback-015-indexes.js
 *
 * WARNING: Only use this if you need to rollback the migration.
 *          Dropping indexes will significantly degrade Admin Dashboard performance.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function rollbackMigration() {
    console.log('⚠️  WARNING: Rolling back Migration 015 - Admin Dashboard v2 Performance Indexes');
    console.log('');
    console.log('This will DROP the following indexes:');
    console.log('  • idx_users_created_at');
    console.log('  • idx_users_laatste_login');
    console.log('  • idx_users_account_type');
    console.log('  • idx_users_email_lower');
    console.log('  • idx_users_naam_lower');
    console.log('  • idx_taken_user_id');
    console.log('  • idx_taken_afgewerkt');
    console.log('  • idx_taken_aangemaakt');
    console.log('  • idx_taken_project_id');
    console.log('  • idx_taken_context_id');
    console.log('  • idx_taken_user_id_afgewerkt');
    console.log('  • idx_taken_prioriteit');
    console.log('  • idx_taken_top_prioriteit');
    console.log('  • idx_dagelijkse_planning_user_id');
    console.log('  • idx_dagelijkse_planning_datum');
    console.log('  • idx_dagelijkse_planning_user_datum');
    console.log('  • idx_dagelijkse_planning_actie_id');
    console.log('  • idx_session_expire');
    console.log('  • idx_projecten_user_id');
    console.log('  • idx_projecten_aangemaakt');
    console.log('  • idx_contexten_user_id');
    console.log('  • idx_contexten_aangemaakt');
    console.log('  • idx_bijlagen_user_id');
    console.log('  • idx_bijlagen_bestandsgrootte');
    console.log('  • idx_bijlagen_geupload');
    console.log('  • idx_feedback_user_id');
    console.log('  • idx_feedback_aangemaakt');
    console.log('  • idx_feedback_status');
    console.log('  • idx_forensic_logs_user_id');
    console.log('  • idx_forensic_logs_timestamp');
    console.log('  • idx_forensic_logs_action');
    console.log('  • idx_forensic_logs_category');
    console.log('  • idx_user_storage_usage_user_id');
    console.log('  • idx_subscription_history_user_id');
    console.log('  • idx_subscription_history_created_at');
    console.log('');
    console.log('⏱  Waiting 5 seconds... Press Ctrl+C to cancel');

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        console.log('');
        console.log('🗑️  Dropping indexes...');

        const dropQueries = [
            // Users table indexes
            'DROP INDEX IF EXISTS idx_users_created_at',
            'DROP INDEX IF EXISTS idx_users_laatste_login',
            'DROP INDEX IF EXISTS idx_users_account_type',
            'DROP INDEX IF EXISTS idx_users_email_lower',
            'DROP INDEX IF EXISTS idx_users_naam_lower',

            // Taken table indexes
            'DROP INDEX IF EXISTS idx_taken_user_id',
            'DROP INDEX IF EXISTS idx_taken_afgewerkt',
            'DROP INDEX IF EXISTS idx_taken_aangemaakt',
            'DROP INDEX IF EXISTS idx_taken_project_id',
            'DROP INDEX IF EXISTS idx_taken_context_id',
            'DROP INDEX IF EXISTS idx_taken_user_id_afgewerkt',
            'DROP INDEX IF EXISTS idx_taken_prioriteit',
            'DROP INDEX IF EXISTS idx_taken_top_prioriteit',

            // Dagelijkse planning indexes
            'DROP INDEX IF EXISTS idx_dagelijkse_planning_user_id',
            'DROP INDEX IF EXISTS idx_dagelijkse_planning_datum',
            'DROP INDEX IF EXISTS idx_dagelijkse_planning_user_datum',
            'DROP INDEX IF EXISTS idx_dagelijkse_planning_actie_id',

            // Session indexes
            'DROP INDEX IF EXISTS idx_session_expire',

            // Related tables indexes
            'DROP INDEX IF EXISTS idx_projecten_user_id',
            'DROP INDEX IF EXISTS idx_projecten_aangemaakt',
            'DROP INDEX IF EXISTS idx_contexten_user_id',
            'DROP INDEX IF EXISTS idx_contexten_aangemaakt',
            'DROP INDEX IF EXISTS idx_bijlagen_user_id',
            'DROP INDEX IF EXISTS idx_bijlagen_bestandsgrootte',
            'DROP INDEX IF EXISTS idx_bijlagen_geupload',
            'DROP INDEX IF EXISTS idx_feedback_user_id',
            'DROP INDEX IF EXISTS idx_feedback_aangemaakt',
            'DROP INDEX IF EXISTS idx_feedback_status',
            'DROP INDEX IF EXISTS idx_forensic_logs_user_id',
            'DROP INDEX IF EXISTS idx_forensic_logs_timestamp',
            'DROP INDEX IF EXISTS idx_forensic_logs_action',
            'DROP INDEX IF EXISTS idx_forensic_logs_category',
            'DROP INDEX IF EXISTS idx_user_storage_usage_user_id',
            'DROP INDEX IF EXISTS idx_subscription_history_user_id',
            'DROP INDEX IF EXISTS idx_subscription_history_created_at'
        ];

        let droppedCount = 0;
        for (const query of dropQueries) {
            const indexName = query.match(/idx_\w+/)[0];
            try {
                await pool.query(query);
                console.log(`  ✓ Dropped ${indexName}`);
                droppedCount++;
            } catch (err) {
                console.log(`  ⊘ ${indexName} (already dropped or doesn't exist)`);
            }
        }

        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total indexes dropped: ${droppedCount}`);
        console.log('');
        console.log('✅ Rollback completed successfully');
        console.log('');
        console.log('⚠️  Note: Admin Dashboard v2 performance will be significantly degraded.');
        console.log('   Run "node run-migration-015.js" to restore performance indexes.');

    } catch (error) {
        console.error('');
        console.error('❌ Rollback failed:', error.message);
        console.error('');
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Execute rollback
rollbackMigration()
    .then(() => {
        console.log('');
        pool.end();
        process.exit(0);
    })
    .catch(err => {
        console.error('');
        console.error('💥 Rollback process failed');
        pool.end();
        process.exit(1);
    });
