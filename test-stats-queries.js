// Test the EXACT queries from server.js after fixes
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testTasksEndpoint() {
    console.log('\n========== TASKS ENDPOINT ==========');

    try {
        // Total taken count
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM taken');
        console.log('✅ Total tasks:', totalResult.rows[0].count);

        // Completion rate (afgewerkt is TIMESTAMP, check IS NOT NULL)
        const completionResult = await pool.query(`
            SELECT
                (COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) * 100.0 / COUNT(*))::DECIMAL(5,2) as completion_rate
            FROM taken
        `);
        console.log('✅ Completion rate:', completionResult.rows[0].completion_rate + '%');

        // Tasks created today (met "aangemaakt")
        const todayResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM taken
            WHERE DATE(aangemaakt) = CURRENT_DATE
        `);
        console.log('✅ Created today:', todayResult.rows[0].count);

        console.log('✅ Tasks endpoint: ALL QUERIES WORK');

    } catch (error) {
        console.log('❌ Tasks endpoint FAILED:');
        console.log('   Error:', error.message);
        console.log('   Code:', error.code);
    }
}

async function testDatabaseEndpoint() {
    console.log('\n========== DATABASE ENDPOINT ==========');

    try {
        const sizeResult = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                   pg_database_size(current_database()) as size_bytes
        `);
        console.log('✅ Database size:', sizeResult.rows[0].size);

        const tablesResult = await pool.query(`
            SELECT
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY size_bytes DESC
            LIMIT 5
        `);
        console.log('✅ Top 5 tables:', tablesResult.rows.map(r => `${r.tablename} (${r.size})`).join(', '));

        console.log('✅ Database endpoint: ALL QUERIES WORK');

    } catch (error) {
        console.log('❌ Database endpoint FAILED:');
        console.log('   Error:', error.message);
        console.log('   Code:', error.code);
    }
}

async function testRevenueEndpoint() {
    console.log('\n========== REVENUE ENDPOINT ==========');

    try {
        const activeSubsResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE subscription_status = 'active'
        `);
        console.log('✅ Active subscriptions:', activeSubsResult.rows[0].count);

        const mrrResult = await pool.query(`
            SELECT
                SUM(CASE
                    WHEN subscription_tier = 'premium' THEN 15.00
                    WHEN subscription_tier = 'enterprise' THEN 30.00
                    ELSE 0
                END) as mrr
            FROM users
            WHERE subscription_status = 'active'
        `);
        console.log('✅ MRR: €', mrrResult.rows[0].mrr || 0);

        console.log('✅ Revenue endpoint: ALL QUERIES WORK');

    } catch (error) {
        console.log('❌ Revenue endpoint FAILED:');
        console.log('   Error:', error.message);
        console.log('   Code:', error.code);
    }
}

async function run() {
    console.log('🧪 Testing Statistics Endpoints Queries (Post-Fix)\n');

    await testTasksEndpoint();
    await testDatabaseEndpoint();
    await testRevenueEndpoint();

    await pool.end();
    console.log('\n✅ Test complete');
}

run();
