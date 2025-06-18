const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Request logging (simplified)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Test endpoints first
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString(), version: '1.1' });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        env: {
            NODE_ENV: process.env.NODE_ENV || 'unknown',
            PORT: process.env.PORT || 'default',
            has_database_url: !!process.env.DATABASE_URL,
            has_postgres_url: !!process.env.POSTGRES_URL,
            has_postgres_prisma_url: !!process.env.POSTGRES_PRISMA_URL,
            has_postgres_url_non_pooling: !!process.env.POSTGRES_URL_NON_POOLING
        }
    });
});

// Try to import and initialize database
let db = null;
let pool = null;
let dbInitialized = false;

// Initialize database immediately
try {
    const dbModule = require('./database');
    db = dbModule.db;
    pool = dbModule.pool;
    console.log('Database module imported successfully');
    
    // Run database initialization
    dbModule.initDatabase().then(() => {
        dbInitialized = true;
        console.log('✅ Database initialization completed');
    }).catch(error => {
        console.error('❌ Database initialization failed:', error);
    });
} catch (error) {
    console.error('Failed to import database module:', error);
}

app.get('/api/db-test', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                status: 'database_module_not_loaded',
                timestamp: new Date().toISOString()
            });
        }
        
        // Test database connection
        const client = await pool.connect();
        client.release();
        
        res.json({ 
            status: 'database_connected',
            initialized: dbInitialized,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database test failed:', error);
        res.status(500).json({ 
            status: 'database_error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/admin/init-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        console.log('🔧 Manual database initialization requested...');
        const { initDatabase } = require('./database');
        await initDatabase();
        dbInitialized = true;
        
        console.log('✅ Manual database initialization completed');
        res.json({ 
            success: true, 
            message: 'Database initialized successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Manual database initialization failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Basic API endpoints
app.get('/api/lijsten', async (req, res) => {
    try {
        const lijsten = [
            'inbox', 'acties', 'opvolgen', 'afgewerkte-taken',
            'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 
            'uitgesteld-3maandelijks', 'uitgesteld-6maandelijks', 
            'uitgesteld-jaarlijks', 'projecten-lijst', 'contexten'
        ];
        res.json(lijsten);
    } catch (error) {
        console.error('Error in /api/lijsten:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tellingen', async (req, res) => {
    try {
        if (!db) {
            return res.json({}); // Return empty if database not available
        }
        
        const tellingen = await db.getCounts();
        res.json(tellingen);
    } catch (error) {
        console.error('Error getting counts:', error);
        res.json({});
    }
});

app.get('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const data = await db.getList(naam);
        res.json(data);
    } catch (error) {
        console.error(`Error getting list ${req.params.naam}:`, error);
        res.status(404).json({ error: 'Lijst niet gevonden' });
    }
});

app.post('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        
        // Temporary: Log the exact data being sent by UI to identify the issue
        if (naam === 'acties' && req.body.some(item => item.herhalingType)) {
            console.log('🚨 UI DEBUG: Data causing 500 error:', JSON.stringify(req.body, null, 2));
        }
        
        const success = await db.saveList(naam, req.body);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Fout bij opslaan' });
        }
    } catch (error) {
        console.error(`Error saving list ${req.params.naam}:`, error);
        res.status(500).json({ error: 'Fout bij opslaan' });
    }
});

app.put('/api/taak/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        console.log(`🔄 Server: Updating task ${id}:`, JSON.stringify(req.body, null, 2));
        
        const success = await db.updateTask(id, req.body);
        
        if (success) {
            console.log(`Task ${id} updated successfully`);
            res.json({ success: true });
        } else {
            console.log(`Task ${id} not found or update failed`);
            res.status(404).json({ error: 'Taak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error updating task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij updaten', details: error.message });
    }
});

// Debug endpoint to search for any task by ID
app.get('/api/debug/find-task/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM taken WHERE id = $1', [id]);
        
        if (result.rows.length > 0) {
            res.json({ found: true, task: result.rows[0] });
        } else {
            res.json({ found: false, id: id });
        }
    } catch (error) {
        console.error('Error searching for task:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test Dashboard Endpoints
const testModule = require('./test-runner');

// Version endpoint voor deployment tracking
app.get('/api/version', (req, res) => {
    const packageJson = require('./package.json');
    res.json({
        version: packageJson.version,
        commit_hash: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
        deployed_at: new Date().toISOString(),
        features: ['toast-notifications', 'recurring-tasks', 'test-dashboard'],
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve test dashboard (multiple routes for accessibility)
app.get('/admin/tests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/test-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/tests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

// Run full regression test suite
app.get('/api/test/run-regression', async (req, res) => {
    try {
        console.log('🚀 Starting full regression test suite...');
        const results = await testModule.runFullRegressionTests();
        
        console.log('✅ Regression tests completed:', {
            total: results.total_tests,
            passed: results.passed,
            failed: results.failed,
            duration: results.duration_ms
        });
        
        res.json(results);
    } catch (error) {
        console.error('❌ Fatal error in regression tests:', error);
        res.status(500).json({
            error: 'Fatal error in regression tests',
            details: error.message,
            total_tests: 0,
            passed: 0,
            failed: 1,
            duration_ms: 0,
            cleanup_successful: false
        });
    }
});

// Run specific test categories
app.get('/api/test/run-database', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runDatabaseIntegrityTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Database tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-api', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runApiEndpointTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ API tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-recurring', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runRecurringTaskTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Recurring tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-business', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runBusinessLogicTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Business logic tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Dagelijkse Planning API endpoints
app.get('/api/dagelijkse-planning/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params;
        const planning = await db.getDagelijksePlanning(datum);
        res.json(planning);
    } catch (error) {
        console.error('Error getting dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij ophalen dagelijkse planning' });
    }
});

app.post('/api/dagelijkse-planning', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const planningId = await db.addToDagelijksePlanning(req.body);
        res.json({ success: true, id: planningId });
    } catch (error) {
        console.error('Error adding to dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij toevoegen aan dagelijkse planning' });
    }
});

app.put('/api/dagelijkse-planning/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const success = await db.updateDagelijksePlanning(id, req.body);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error updating dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij updaten dagelijkse planning' });
    }
});

app.put('/api/dagelijkse-planning/:id/reorder', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const { targetUur, targetPosition } = req.body;
        const success = await db.reorderDagelijksePlanning(id, targetUur, targetPosition);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error reordering dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij herordenen dagelijkse planning' });
    }
});

app.delete('/api/dagelijkse-planning/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const success = await db.deleteDagelijksePlanning(id);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error deleting dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij verwijderen dagelijkse planning' });
    }
});

app.get('/api/ingeplande-acties/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params;
        const ingeplandeActies = await db.getIngeplandeActies(datum);
        res.json(ingeplandeActies);
    } catch (error) {
        console.error('Error getting ingeplande acties:', error);
        res.status(500).json({ error: 'Fout bij ophalen ingeplande acties' });
    }
});

// Emergency cleanup endpoint
app.post('/api/test/emergency-cleanup', async (req, res) => {
    try {
        console.log('🧹 Emergency cleanup initiated...');
        
        // Delete all test records (by ID pattern and by test names)
        const deletedTasks = await pool.query("DELETE FROM taken WHERE id LIKE 'test_%' OR tekst IN ('Completion test', 'Test taak', 'Database CRUD Test', 'Updated Test Task', 'Rollback Test', 'FK Test Task', 'Dagelijkse test taak', 'Completion workflow test', 'List management test', 'Project context test', 'Email versturen naar klanten', 'Vergadering voorbereiden', 'Factuur email versturen', 'Taak voor vandaag', 'Taak voor morgen') RETURNING id");
        const deletedProjects = await pool.query("DELETE FROM projecten WHERE id LIKE 'test_project_%' OR naam IN ('Test Project', 'FK Test Project') RETURNING id");
        const deletedContexts = await pool.query("DELETE FROM contexten WHERE id LIKE 'test_context_%' OR naam IN ('Test Context', 'FK Test Context') RETURNING id");
        
        const totalDeleted = deletedTasks.rows.length + deletedProjects.rows.length + deletedContexts.rows.length;
        
        console.log(`✅ Emergency cleanup completed - ${totalDeleted} records deleted`);
        res.json({ 
            success: true, 
            message: `Emergency cleanup completed successfully - ${totalDeleted} records deleted`,
            deleted: {
                tasks: deletedTasks.rows.length,
                projects: deletedProjects.rows.length, 
                contexts: deletedContexts.rows.length,
                total: totalDeleted
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint to add missing recurring columns (GET for easy access)
app.get('/api/admin/add-recurring-columns', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        console.log('🔧 Admin: Adding missing recurring columns...');
        
        // Add columns one by one to avoid conflicts
        const columns = [
            { name: 'herhaling_type', type: 'VARCHAR(30)' },
            { name: 'herhaling_waarde', type: 'INTEGER' },
            { name: 'herhaling_actief', type: 'BOOLEAN DEFAULT FALSE' }
        ];
        
        const results = [];
        
        for (const col of columns) {
            try {
                await pool.query(`ALTER TABLE taken ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column ${col.name}`);
                results.push({ column: col.name, status: 'added' });
            } catch (colError) {
                if (colError.message.includes('already exists')) {
                    console.log(`⚠️ Column ${col.name} already exists`);
                    results.push({ column: col.name, status: 'already_exists' });
                } else {
                    console.log(`❌ Failed to add column ${col.name}:`, colError.message);
                    results.push({ column: col.name, status: 'error', error: colError.message });
                }
            }
        }
        
        console.log('✅ Recurring columns setup complete');
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('❌ Failed to add recurring columns:', error);
        res.status(500).json({ error: 'Failed to add columns', details: error.message });
    }
});

// Debug endpoint to list all tasks in a specific list
app.get('/api/debug/lijst/:naam', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const result = await pool.query('SELECT * FROM taken WHERE lijst = $1 AND afgewerkt IS NULL ORDER BY aangemaakt DESC', [naam]);
        
        res.json({
            lijst: naam,
            count: result.rows.length,
            tasks: result.rows
        });
    } catch (error) {
        console.error(`Error getting debug list ${req.params.naam}:`, error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Debug endpoint to check task details
app.get('/api/taak/:id', async (req, res) => {
    try {
        if (!db) {
            console.log('🐛 DEBUG: Database not available for task lookup');
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        console.log('🐛 DEBUG: Looking up task with ID:', id);
        
        // Use same pool as database module to avoid connection issues
        const { pool: dbPool } = require('./database');
        const result = await dbPool.query('SELECT * FROM taken WHERE id = $1', [id]);
        console.log('🐛 DEBUG: Query result rows count:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('🐛 DEBUG: Found task:', result.rows[0]);
            res.json(result.rows[0]);
        } else {
            console.log('🐛 DEBUG: Task not found in database');
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error(`🐛 DEBUG: Error getting task ${req.params.id}:`, error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/taak/recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { originalTask, nextDate } = req.body;
        console.log('Creating recurring task:', { originalTask, nextDate });
        
        const taskId = await db.createRecurringTask(originalTask, nextDate);
        if (taskId) {
            // Debug: immediately check what's in acties list after creation
            setTimeout(async () => {
                try {
                    const actiesTasks = await db.getList('acties');
                    console.log('🔍 DEBUG: All tasks in acties after creation:', actiesTasks.length);
                    const newTask = actiesTasks.find(t => t.id === taskId);
                    if (newTask) {
                        console.log('✅ DEBUG: New task found in acties list:', newTask);
                    } else {
                        console.log('❌ DEBUG: New task NOT found in acties list');
                        console.log('🔍 DEBUG: All task IDs in acties:', actiesTasks.map(t => t.id));
                    }
                } catch (error) {
                    console.log('Debug check failed:', error);
                }
            }, 1000);
            
            res.json({ success: true, taskId });
        } else {
            res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
        }
    } catch (error) {
        console.error('Error creating recurring task:', error);
        res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
    }
});

// Debug endpoint to check all tasks for 16/06
app.get('/api/debug/june16', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt, aangemaakt
            FROM taken 
            WHERE verschijndatum::date = '2025-06-16'
            ORDER BY aangemaakt DESC
        `);
        
        // Also check recent tasks regardless of date
        const recentResult = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt, aangemaakt
            FROM taken 
            WHERE aangemaakt > NOW() - INTERVAL '1 hour'
            ORDER BY aangemaakt DESC
        `);
        
        console.log('🔍 DEBUG: All tasks for 2025-06-16:', result.rows);
        console.log('🔍 DEBUG: Recent tasks (last hour):', recentResult.rows);
        res.json({ 
            june16_count: result.rows.length, 
            june16_tasks: result.rows,
            recent_count: recentResult.rows.length,
            recent_tasks: recentResult.rows
        });
    } catch (error) {
        console.error('Debug june16 error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Temporary debug endpoint to check what's actually in acties
app.get('/api/debug/acties', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt 
            FROM taken 
            WHERE lijst = 'acties' AND afgewerkt IS NULL 
            ORDER BY verschijndatum DESC
        `);
        
        console.log('🔍 DEBUG: Raw acties from database:', result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Debug acties error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simple test endpoint to check if new endpoints work
app.get('/api/debug/test-simple', (req, res) => {
    res.json({ 
        message: 'Simple test endpoint works!', 
        timestamp: new Date().toISOString(),
        server: 'tickedify'
    });
});

// Direct working implementation test
app.get('/api/debug/test-second-wednesday', (req, res) => {
    // Test pattern: monthly-weekday-second-3-1
    // Base date: 2025-06-17
    // Expected: 2025-07-09 (second Wednesday of July)
    
    const baseDate = '2025-06-17';
    const date = new Date(baseDate);
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1); // July 2025
    nextMonth.setDate(1); // July 1st
    
    let wednesdayCount = 0;
    while (wednesdayCount < 2) {
        if (nextMonth.getDay() === 3) { // Wednesday
            wednesdayCount++;
            if (wednesdayCount === 2) {
                break; // Found second Wednesday
            }
        }
        nextMonth.setDate(nextMonth.getDate() + 1);
    }
    
    const result = nextMonth.toISOString().split('T')[0];
    
    res.json({
        baseDate,
        pattern: 'monthly-weekday-second-3-1',
        result,
        expected: '2025-07-09',
        matches: result === '2025-07-09',
        message: `Working implementation gives: ${result}`
    });
});

// Test Nederlandse werkdag patronen direct
app.get('/api/debug/test-dutch-workdays', (req, res) => {
    const baseDate = '2025-06-17'; // Tuesday
    const date = new Date(baseDate);
    
    // Test eerste-werkdag-maand (first workday of next month = July)
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1); // July 2025
    nextMonth.setDate(1); // July 1st
    while (nextMonth.getDay() === 0 || nextMonth.getDay() === 6) {
        nextMonth.setDate(nextMonth.getDate() + 1);
    }
    const eersteWerkdag = nextMonth.toISOString().split('T')[0];
    
    // Test laatste-werkdag-maand (last workday of next month = July)  
    const lastMonth = new Date(date);
    lastMonth.setMonth(date.getMonth() + 2); // August
    lastMonth.setDate(0); // Last day of July
    while (lastMonth.getDay() === 0 || lastMonth.getDay() === 6) {
        lastMonth.setDate(lastMonth.getDate() - 1);
    }
    const laatsteWerkdag = lastMonth.toISOString().split('T')[0];
    
    res.json({
        baseDate,
        tests: {
            'eerste-werkdag-maand': {
                result: eersteWerkdag,
                calculation: 'First workday of July 2025'
            },
            'laatste-werkdag-maand': {
                result: laatsteWerkdag,
                calculation: 'Last workday of July 2025'
            }
        }
    });
});

// Quick test for monthly-weekday pattern  
app.get('/api/debug/quick-monthly-test', (req, res) => {
    // Direct test - what are the Wednesdays in July 2025?
    const july2025 = [];
    for (let day = 1; day <= 31; day++) {
        const date = new Date(2025, 6, day); // July = month 6 (0-indexed)
        if (date.getDay() === 3) { // Wednesday
            july2025.push(date.toISOString().split('T')[0]);
        }
    }
    
    res.json({
        allWednesdaysInJuly2025: july2025,
        firstWednesday: july2025[0],
        secondWednesday: july2025[1],
        thirdWednesday: july2025[2],
        fourthWednesday: july2025[3],
        calculation: `Second Wednesday of July 2025 is ${july2025[1]}`
    });
});

// Debug endpoint to test saveList with recurring data
app.post('/api/debug/test-save-recurring', async (req, res) => {
    try {
        const testData = [{
            id: "debug-test-" + Date.now(),
            tekst: "Debug test recurring",
            aangemaakt: "2025-06-17T12:16:42.232Z",
            projectId: "ghhnv0pdlmbvaix7s",
            verschijndatum: "2025-06-17",
            contextId: "95dfadbz9mbvaj0nt",
            duur: 30,
            type: "actie",
            herhalingType: "monthly-weekday-first-workday-1",
            herhalingActief: true
        }];
        
        console.log('🔍 DEBUG ENDPOINT: Testing save with data:', testData);
        
        if (!db) {
            return res.json({ error: 'Database not available', success: false });
        }
        
        const success = await db.saveList('acties', testData);
        
        res.json({ 
            success, 
            message: success ? 'Save successful' : 'Save failed',
            testData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('🔍 DEBUG ENDPOINT ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Alternative: Add single action without loading existing list
app.post('/api/debug/add-single-action', async (req, res) => {
    try {
        if (!db) {
            return res.json({ error: 'Database not available', success: false });
        }
        
        const actionData = req.body;
        console.log('🔧 SINGLE ACTION: Adding action:', actionData);
        
        // First check if task already exists
        const existingCheck = await pool.query('SELECT * FROM taken WHERE id = $1', [actionData.id]);
        if (existingCheck.rows.length > 0) {
            console.log('🔧 SINGLE ACTION: Task already exists, updating instead');
            
            // Delete the existing task first
            await pool.query('DELETE FROM taken WHERE id = $1', [actionData.id]);
            console.log('🔧 SINGLE ACTION: Deleted existing task');
        }
        
        // Insert directly without touching existing data
        const result = await pool.query(`
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, afgewerkt)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `, [
            actionData.id,
            actionData.tekst,
            actionData.aangemaakt,
            'acties',
            actionData.projectId || null,
            actionData.verschijndatum || null,
            actionData.contextId || null,
            actionData.duur || null,
            actionData.type || null,
            actionData.herhalingType || null,
            actionData.herhalingWaarde || null,
            actionData.herhalingActief === true || actionData.herhalingActief === 'true',
            null
        ]);
        
        console.log('🔧 SINGLE ACTION: Successfully inserted with ID:', result.rows[0].id);
        
        res.json({ 
            success: true, 
            message: 'Action added successfully',
            insertedId: result.rows[0].id,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('🔧 SINGLE ACTION ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Force database migration endpoint
app.post('/api/debug/force-migration', async (req, res) => {
    try {
        if (!pool) {
            return res.json({ error: 'Database pool not available', success: false });
        }
        
        console.log('🔧 FORCE MIGRATION: Starting herhaling_type column migration');
        
        // Force migrate the column size
        await pool.query(`ALTER TABLE taken ALTER COLUMN herhaling_type TYPE VARCHAR(50)`);
        
        console.log('✅ FORCE MIGRATION: Successfully migrated herhaling_type to VARCHAR(50)');
        
        res.json({ 
            success: true, 
            message: 'Migration completed successfully',
            migration: 'herhaling_type VARCHAR(30) -> VARCHAR(50)',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ FORCE MIGRATION ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Raw JSON test for debugging
app.get('/api/debug/raw-test/:pattern/:baseDate', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { pattern, baseDate } = req.params;
    
    // Just test if monthly-weekday logic reaches the calculation
    let reached = [];
    
    if (pattern.startsWith('monthly-weekday-')) {
        reached.push('monthly-weekday check passed');
        const parts = pattern.split('-');
        if (parts.length === 5) {
            reached.push('parts length check passed');
            const position = parts[2];
            const targetDay = parseInt(parts[3]);
            const interval = parseInt(parts[4]);
            
            const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
            // Allow 'workday' as special case for targetDay
            const isValidTargetDay = parts[3] === 'workday' || (!isNaN(targetDay) && targetDay >= 1 && targetDay <= 7);
            if (validPositions.includes(position) && 
                isValidTargetDay && 
                !isNaN(interval) && interval > 0) {
                reached.push('validation passed');
                
                const date = new Date(baseDate);
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + interval);
                
                // Special handling for workday patterns
                if (parts[3] === 'workday') {
                    reached.push('workday pattern detected');
                    
                    if (position === 'first') {
                        // First workday of month
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                    } else if (position === 'last') {
                        // Last workday of month
                        const targetMonth = nextDateObj.getMonth();
                        nextDateObj.setMonth(targetMonth + 1);
                        nextDateObj.setDate(0); // Last day of target month
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    }
                } else {
                    // Normal weekday patterns
                    const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                    
                    if (position === 'last') {
                        // Find last occurrence of weekday in month
                        const targetMonth = nextDateObj.getMonth();
                        nextDateObj.setMonth(targetMonth + 1);
                        nextDateObj.setDate(0); // Last day of target month
                        while (nextDateObj.getDay() !== jsTargetDay) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    } else {
                        // Find nth occurrence of weekday in month (first, second, third, fourth)
                        const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                        const occurrenceNumber = positionNumbers[position];
                        
                        nextDateObj.setDate(1); // Start at beginning of month
                        let occurrenceCount = 0;
                        
                        // Find the nth occurrence of the target weekday
                        while (occurrenceCount < occurrenceNumber) {
                            if (nextDateObj.getDay() === jsTargetDay) {
                                occurrenceCount++;
                                if (occurrenceCount === occurrenceNumber) {
                                    break; // Found the nth occurrence
                                }
                            }
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                            
                            // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                            if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                res.write(JSON.stringify({
                                    success: false,
                                    reached: [...reached, 'occurrence does not exist in month']
                                }));
                                res.end();
                                return;
                            }
                        }
                    }
                }
                
                reached.push('calculation completed');
                
                const nextDate = nextDateObj.toISOString().split('T')[0];
                
                res.write(JSON.stringify({
                    success: true,
                    nextDate,
                    reached
                }));
                res.end();
                return;
            } else {
                reached.push('validation failed');
            }
        } else {
            reached.push('parts length check failed');
        }
    } else {
        reached.push('monthly-weekday check failed');
    }
    
    res.write(JSON.stringify({
        success: false,
        reached
    }));
    res.end();
});

// Test pattern parsing
app.get('/api/debug/parse-pattern/:pattern', (req, res) => {
    const { pattern } = req.params;
    const parts = pattern.split('-');
    
    let validationDetails = {};
    
    if (pattern.startsWith('monthly-weekday-') && parts.length === 5) {
        const position = parts[2];
        const targetDay = parseInt(parts[3]);
        const interval = parseInt(parts[4]);
        
        const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
        validationDetails = {
            position,
            targetDay,
            interval,
            positionValid: validPositions.includes(position),
            targetDayValid: !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7,
            intervalValid: !isNaN(interval) && interval > 0,
            overallValid: validPositions.includes(position) && 
                         !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7 && 
                         !isNaN(interval) && interval > 0
        };
    }
    
    res.json({
        pattern,
        parts,
        partCount: parts.length,
        startsWithChecks: {
            'daily-': pattern.startsWith('daily-'),
            'weekly-': pattern.startsWith('weekly-'),
            'monthly-day-': pattern.startsWith('monthly-day-'),
            'yearly-': pattern.startsWith('yearly-'),
            'monthly-weekday-': pattern.startsWith('monthly-weekday-'),
            'yearly-special-': pattern.startsWith('yearly-special-'),
            'nederlandse-werkdag': ['eerste-werkdag-maand', 'laatste-werkdag-maand', 'eerste-werkdag-jaar', 'laatste-werkdag-jaar'].includes(pattern)
        },
        validationDetails
    });
});

// GET version of test-recurring for easier testing (date calculation only)
app.get('/api/debug/test-recurring/:pattern/:baseDate', async (req, res) => {
    try {
        const { pattern, baseDate } = req.params;
        
        if (!pattern || !baseDate) {
            return res.status(400).json({ error: 'Pattern and baseDate are required' });
        }
        
        console.log('🧪 Testing pattern:', pattern, 'with base date:', baseDate);
        
        // Test date calculation logic directly (simulate frontend logic)
        let nextDate = null;
        const date = new Date(baseDate);
        
        if (pattern.startsWith('daily-')) {
            // Pattern: daily-interval (e.g., daily-3 = every 3 days)
            const parts = pattern.split('-');
            if (parts.length === 2) {
                const interval = parseInt(parts[1]);
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setDate(date.getDate() + interval);
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('weekly-')) {
            // Pattern: weekly-interval-day (e.g., weekly-1-4 = every week on Thursday)
            const parts = pattern.split('-');
            if (parts.length === 3) {
                const interval = parseInt(parts[1]);
                const targetDay = parseInt(parts[2]); // 1=Monday, 2=Tuesday, ..., 7=Sunday
                
                if (!isNaN(interval) && !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7) {
                    // Convert our day numbering (1-7) to JavaScript day numbering (0-6, Sunday=0)
                    const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                    
                    // Find next occurrence of target day
                    const currentDay = date.getDay();
                    let daysToAdd = jsTargetDay - currentDay;
                    
                    if (daysToAdd <= 0) {
                        daysToAdd += 7;
                    }
                    
                    const nextOccurrence = new Date(date);
                    nextOccurrence.setDate(date.getDate() + daysToAdd);
                    
                    // Add additional weeks based on interval
                    if (interval > 1) {
                        nextOccurrence.setDate(nextOccurrence.getDate() + (interval - 1) * 7);
                    }
                    
                    nextDate = nextOccurrence.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('monthly-day-')) {
            // Pattern: monthly-day-daynum-interval (e.g., monthly-day-15-2 = day 15 every 2 months)
            const parts = pattern.split('-');
            if (parts.length === 4) {
                const dayNum = parseInt(parts[2]);
                const interval = parseInt(parts[3]);
                if (!isNaN(dayNum) && !isNaN(interval) && dayNum >= 1 && dayNum <= 31) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setMonth(date.getMonth() + interval);
                    nextDateObj.setDate(dayNum);
                    
                    // Handle months with fewer days
                    if (nextDateObj.getDate() !== dayNum) {
                        nextDateObj.setDate(0); // Last day of month
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('yearly-')) {
            // Pattern: yearly-day-month-interval (e.g., yearly-25-12-1 = Dec 25 every year)
            const parts = pattern.split('-');
            if (parts.length === 4) {
                const day = parseInt(parts[1]);
                const month = parseInt(parts[2]);
                const interval = parseInt(parts[3]);
                if (!isNaN(day) && !isNaN(month) && !isNaN(interval) && 
                    day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setFullYear(date.getFullYear() + interval);
                    nextDateObj.setMonth(month - 1); // JavaScript months are 0-based
                    nextDateObj.setDate(day);
                    
                    // Handle leap year issues
                    if (nextDateObj.getDate() !== day) {
                        nextDateObj.setDate(0); // Last day of previous month
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('monthly-weekday-')) {
            // Pattern: monthly-weekday-position-day-interval (e.g., monthly-weekday-second-3-1 = second Wednesday every month)
            // Special case: monthly-weekday-first-workday-1 = first workday of every month
            const parts = pattern.split('-');
            if (parts.length === 5) {
                const position = parts[2]; // 'first', 'second', 'third', 'fourth', 'last'
                const targetDay = parts[3]; // 1=Monday, ..., 7=Sunday, or 'workday'
                const interval = parseInt(parts[4]);
                
                const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
                const isValidDay = (!isNaN(parseInt(targetDay)) && parseInt(targetDay) >= 1 && parseInt(targetDay) <= 7) || targetDay === 'workday';
                
                if (validPositions.includes(position) && isValidDay && !isNaN(interval) && interval > 0) {
                    
                    // Special handling for workday patterns
                    if (targetDay === 'workday') {
                        const nextDateObj = new Date(date);
                        nextDateObj.setMonth(date.getMonth() + interval);
                        
                        if (position === 'first') {
                            // First workday of month
                            nextDateObj.setDate(1);
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() + 1);
                            }
                        } else if (position === 'last') {
                            // Last workday of month
                            const targetMonth = nextDateObj.getMonth();
                            nextDateObj.setMonth(targetMonth + 1);
                            nextDateObj.setDate(0); // Last day of target month
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                        }
                        
                        nextDate = nextDateObj.toISOString().split('T')[0];
                    } else {
                        // Regular weekday patterns (existing logic)
                        const numericTargetDay = parseInt(targetDay);
                        const jsTargetDay = numericTargetDay === 7 ? 0 : numericTargetDay; // Convert to JS day numbering
                        const nextDateObj = new Date(date);
                        nextDateObj.setMonth(date.getMonth() + interval);
                        
                        if (position === 'last') {
                            // Find last occurrence of weekday in month
                            const targetMonth = nextDateObj.getMonth();
                            nextDateObj.setMonth(targetMonth + 1);
                            nextDateObj.setDate(0); // Last day of target month
                            while (nextDateObj.getDay() !== jsTargetDay) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                        } else {
                            // Find nth occurrence of weekday in month (first, second, third, fourth)
                            const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                            const occurrenceNumber = positionNumbers[position];
                            
                            nextDateObj.setDate(1); // Start at beginning of month
                            let occurrenceCount = 0;
                            
                            // Find the nth occurrence of the target weekday
                            while (occurrenceCount < occurrenceNumber) {
                                if (nextDateObj.getDay() === jsTargetDay) {
                                    occurrenceCount++;
                                    if (occurrenceCount === occurrenceNumber) {
                                        break; // Found the nth occurrence
                                    }
                                }
                                nextDateObj.setDate(nextDateObj.getDate() + 1);
                                
                                // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                                if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                    nextDate = null; // This occurrence doesn't exist in this month
                                    break;
                                }
                            }
                        }
                        
                        if (nextDate !== null) {
                            nextDate = nextDateObj.toISOString().split('T')[0];
                        }
                    }
                }
            }
        } else if (pattern.startsWith('yearly-special-')) {
            // Pattern: yearly-special-type-interval (e.g., yearly-special-first-workday-1)
            const parts = pattern.split('-');
            if (parts.length >= 4) {
                const specialType = parts.slice(2, -1).join('-'); // Everything except 'yearly', 'special' and interval
                const interval = parseInt(parts[parts.length - 1]);
                
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setFullYear(date.getFullYear() + interval);
                    
                    if (specialType === 'first-workday') {
                        // First workday of the year
                        nextDateObj.setMonth(0); // January
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                    } else if (specialType === 'last-workday') {
                        // Last workday of the year
                        nextDateObj.setMonth(11); // December
                        nextDateObj.setDate(31);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern === 'eerste-werkdag-maand') {
            // First workday of next month
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-maand') {
            // Last workday of next month
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 2);
            nextDateObj.setDate(0); // Last day of next month
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-jaar') {
            // First workday of next year
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-jaar') {
            // Last workday of next year
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(11); // December
            nextDateObj.setDate(31);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        }
        
        // Special debug for monthly-weekday patterns
        let monthlyWeekdayDebug = null;
        if (pattern.startsWith('monthly-weekday-')) {
            const parts = pattern.split('-');
            const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
            monthlyWeekdayDebug = {
                parts,
                partsLength: parts.length,
                position: parts[2],
                targetDay: parseInt(parts[3]),
                interval: parseInt(parts[4]),
                positionCheck: validPositions.includes(parts[2]),
                targetDayCheck: !isNaN(parseInt(parts[3])) && parseInt(parts[3]) >= 1 && parseInt(parts[3]) <= 7,
                intervalCheck: !isNaN(parseInt(parts[4])) && parseInt(parts[4]) > 0
            };
        }
        
        res.json({
            pattern,
            baseDate,
            nextDate,
            success: !!nextDate,
            message: nextDate ? `Next occurrence: ${nextDate}` : 'Failed to calculate next date',
            calculation: nextDate ? `${baseDate} + ${pattern} = ${nextDate}` : 'Pattern not recognized',
            debug: {
                patternStartsWith: {
                    'daily-': pattern.startsWith('daily-'),
                    'weekly-': pattern.startsWith('weekly-'),
                    'monthly-day-': pattern.startsWith('monthly-day-'),
                    'yearly-': pattern.startsWith('yearly-'),
                    'monthly-weekday-': pattern.startsWith('monthly-weekday-'),
                    'yearly-special-': pattern.startsWith('yearly-special-'),
                    'nederlandse-werkdag': ['eerste-werkdag-maand', 'laatste-werkdag-maand', 'eerste-werkdag-jaar', 'laatste-werkdag-jaar'].includes(pattern)
                },
                monthlyWeekday: monthlyWeekdayDebug
            }
        });
        
    } catch (error) {
        console.error('Test recurring error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Test endpoint for complex recurring patterns
app.post('/api/debug/test-recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pattern, baseDate, expectedDays } = req.body;
        
        if (!pattern || !baseDate) {
            return res.status(400).json({ error: 'Pattern and baseDate are required' });
        }
        
        // Test the pattern by creating a test task and marking it complete
        const { pool, createRecurringTask } = require('./database');
        
        // Create test task
        const testTask = {
            tekst: `TEST: ${pattern}`,
            verschijndatum: baseDate,
            lijst: 'acties',
            project_id: null,
            context_id: 1, // Assuming context 1 exists
            duur: 30,
            herhaling_type: pattern,
            herhaling_actief: true
        };
        
        console.log('🧪 Creating test task:', testTask);
        
        const insertResult = await pool.query(`
            INSERT INTO taken (tekst, verschijndatum, lijst, project_id, context_id, duur, herhaling_type, herhaling_actief)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [testTask.tekst, testTask.verschijndatum, testTask.lijst, testTask.project_id, testTask.context_id, testTask.duur, testTask.herhaling_type, testTask.herhaling_actief]);
        
        const taskId = insertResult.rows[0].id;
        console.log('✅ Test task created with ID:', taskId);
        
        // Now test creating the next recurring task
        const nextDate = await createRecurringTask(testTask, baseDate);
        
        let results = [];
        if (nextDate) {
            // Verify the next task was created
            const verifyResult = await pool.query(`
                SELECT id, tekst, verschijndatum, herhaling_type, herhaling_actief
                FROM taken 
                WHERE tekst = $1 AND verschijndatum = $2 AND lijst = 'acties'
            `, [testTask.tekst, nextDate]);
            
            results = verifyResult.rows;
        }
        
        // Clean up test tasks
        await pool.query('DELETE FROM taken WHERE tekst LIKE $1', [`TEST: ${pattern}%`]);
        
        res.json({
            pattern,
            baseDate,
            nextDate,
            success: !!nextDate,
            createdTasks: results,
            message: nextDate ? `Next occurrence: ${nextDate}` : 'Failed to calculate next date'
        });
        
    } catch (error) {
        console.error('Test recurring error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Batch test endpoint for multiple patterns
app.post('/api/debug/batch-test-recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { patterns, baseDate } = req.body;
        
        if (!patterns || !Array.isArray(patterns) || !baseDate) {
            return res.status(400).json({ error: 'Patterns array and baseDate are required' });
        }
        
        const results = [];
        
        for (const pattern of patterns) {
            try {
                const response = await fetch(`http://localhost:${PORT}/api/debug/test-recurring`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pattern, baseDate })
                });
                
                const result = await response.json();
                results.push(result);
                
            } catch (error) {
                results.push({
                    pattern,
                    baseDate,
                    success: false,
                    error: error.message
                });
            }
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        res.json({
            baseDate,
            totalPatterns: patterns.length,
            results,
            summary: {
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        });
        
    } catch (error) {
        console.error('Batch test recurring error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

app.listen(PORT, () => {
    console.log(`🚀 Tickedify server v2 running on port ${PORT}`);
    
    // Initialize database after server starts
    setTimeout(async () => {
        try {
            if (db) {
                const { initDatabase } = require('./database');
                await initDatabase();
                dbInitialized = true;
                console.log('✅ Database initialized successfully');
            } else {
                console.log('⚠️ Database module not available, skipping initialization');
            }
        } catch (error) {
            console.error('⚠️ Database initialization failed:', error.message);
        }
    }, 1000);
});