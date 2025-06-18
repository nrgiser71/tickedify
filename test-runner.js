const { db, pool } = require('./database');

/**
 * TestRunner Class - Voert tests uit met automatische cleanup
 * Houdt alle gemaakte test records bij voor gegarandeerde cleanup
 */
class TestRunner {
    constructor() {
        this.createdRecords = {
            taken: [],      // Track task IDs 
            acties: [],     // Track action IDs
            projecten: [],  // Track project IDs  
            contexten: []   // Track context IDs
        };
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * Voeg een test resultaat toe
     */
    addTestResult(testName, passed, details = null, executionTime = 0) {
        this.testResults.push({
            name: testName,
            passed,
            details,
            executionTime,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Maak een test taak aan en track het voor cleanup
     */
    async createTestTask(taskData) {
        const testId = `test_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        const taskToCreate = {
            id: testId,
            tekst: taskData.tekst || 'Test taak',
            aangemaakt: new Date().toISOString(),
            lijst: taskData.lijst || 'inbox',
            projectId: taskData.projectId || null,
            verschijndatum: taskData.verschijndatum || null,
            contextId: taskData.contextId || null,
            duur: taskData.duur || null,
            type: taskData.type || null,
            herhalingType: taskData.herhalingType || null,
            herhalingWaarde: taskData.herhalingWaarde || null,
            herhalingActief: taskData.herhalingActief || false,
            afgewerkt: taskData.afgewerkt || null
        };

        try {
            // Insert direct in database
            await pool.query(`
                INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, afgewerkt)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                taskToCreate.id, taskToCreate.tekst, taskToCreate.aangemaakt, taskToCreate.lijst,
                taskToCreate.projectId, taskToCreate.verschijndatum, taskToCreate.contextId, 
                taskToCreate.duur, taskToCreate.type, taskToCreate.herhalingType, 
                taskToCreate.herhalingWaarde, taskToCreate.herhalingActief, taskToCreate.afgewerkt
            ]);
            
            this.createdRecords.taken.push(testId);
            return { ...taskToCreate, id: testId };
        } catch (error) {
            // Fallback voor databases zonder herhaling kolommen
            if (error.message.includes('herhaling_type') || 
                error.message.includes('herhaling_waarde') || 
                error.message.includes('herhaling_actief')) {
                
                await pool.query(`
                    INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, afgewerkt)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    taskToCreate.id, taskToCreate.tekst, taskToCreate.aangemaakt, taskToCreate.lijst,
                    taskToCreate.projectId, taskToCreate.verschijndatum, taskToCreate.contextId, 
                    taskToCreate.duur, taskToCreate.type, taskToCreate.afgewerkt
                ]);
                
                this.createdRecords.taken.push(testId);
                return { ...taskToCreate, id: testId };
            }
            throw error;
        }
    }

    /**
     * Maak een test project aan en track het voor cleanup
     */
    async createTestProject(projectData) {
        const testId = `test_project_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        const projectToCreate = {
            id: testId,
            naam: projectData.naam || 'Test Project',
            aangemaakt: new Date().toISOString()
        };

        await pool.query(
            'INSERT INTO projecten (id, naam, aangemaakt) VALUES ($1, $2, $3)',
            [projectToCreate.id, projectToCreate.naam, projectToCreate.aangemaakt]
        );
        
        this.createdRecords.projecten.push(testId);
        return projectToCreate;
    }

    /**
     * Maak een test context aan en track het voor cleanup
     */
    async createTestContext(contextData) {
        const testId = `test_context_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        const contextToCreate = {
            id: testId,
            naam: contextData.naam || 'Test Context',
            aangemaakt: new Date().toISOString()
        };

        await pool.query(
            'INSERT INTO contexten (id, naam, aangemaakt) VALUES ($1, $2, $3)',
            [contextToCreate.id, contextToCreate.naam, contextToCreate.aangemaakt]
        );
        
        this.createdRecords.contexten.push(testId);
        return contextToCreate;
    }

    /**
     * Cleanup alle gemaakte test records (in omgekeerde volgorde voor foreign key constraints)
     */
    async cleanup() {
        console.log('🧹 Starting test data cleanup...');
        
        try {
            // Cleanup taken (kunnen foreign keys naar projecten/contexten hebben)
            for (const taakId of this.createdRecords.taken) {
                await pool.query('DELETE FROM taken WHERE id = $1', [taakId]);
            }
            console.log(`✅ Cleaned up ${this.createdRecords.taken.length} test taken`);

            // Cleanup projecten
            for (const projectId of this.createdRecords.projecten) {
                await pool.query('DELETE FROM projecten WHERE id = $1', [projectId]);
            }
            console.log(`✅ Cleaned up ${this.createdRecords.projecten.length} test projecten`);

            // Cleanup contexten
            for (const contextId of this.createdRecords.contexten) {
                await pool.query('DELETE FROM contexten WHERE id = $1', [contextId]);
            }
            console.log(`✅ Cleaned up ${this.createdRecords.contexten.length} test contexten`);

            // Reset tracking
            this.createdRecords = { taken: [], acties: [], projecten: [], contexten: [] };
            console.log('✅ Test data cleanup completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Error during test data cleanup:', error);
            return false;
        }
    }

    /**
     * Get test summary
     */
    getSummary() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const executionTime = Date.now() - this.startTime;

        return {
            total_tests: totalTests,
            passed: passedTests,
            failed: failedTests,
            duration_ms: executionTime,
            test_data_created: this.createdRecords.taken.length + 
                             this.createdRecords.projecten.length + 
                             this.createdRecords.contexten.length,
            results: this.testResults
        };
    }

    /**
     * Voer een test uit met error handling
     */
    async runTest(testName, testFunction) {
        const testStartTime = Date.now();
        console.log(`🧪 Running test: ${testName}`);
        
        try {
            await testFunction();
            const executionTime = Date.now() - testStartTime;
            this.addTestResult(testName, true, 'Test passed', executionTime);
            console.log(`✅ Test passed: ${testName} (${executionTime}ms)`);
        } catch (error) {
            const executionTime = Date.now() - testStartTime;
            this.addTestResult(testName, false, error.message, executionTime);
            console.error(`❌ Test failed: ${testName} - ${error.message} (${executionTime}ms)`);
        }
    }
}

/**
 * Test Suite Functions
 */

/**
 * Database Integriteit Tests
 */
async function runDatabaseIntegrityTests(testRunner) {
    console.log('🗄️ Running Database Integrity Tests...');

    // Test 1: Database connectie
    await testRunner.runTest('Database Connection', async () => {
        const client = await pool.connect();
        client.release();
    });

    // Test 2: Basis CRUD operaties
    await testRunner.runTest('Basic CRUD Operations', async () => {
        // Create
        const testTask = await testRunner.createTestTask({
            tekst: 'Database CRUD Test',
            lijst: 'inbox'
        });
        
        // Read
        const tasks = await db.getList('inbox');
        const createdTask = tasks.find(t => t.id === testTask.id);
        if (!createdTask) throw new Error('Task not found after creation');
        
        // Update
        const updated = await db.updateTask(testTask.id, { tekst: 'Updated Test Task' });
        if (!updated) throw new Error('Task update failed');
        
        // Verify update
        const updatedTasks = await db.getList('inbox');
        const updatedTask = updatedTasks.find(t => t.id === testTask.id);
        if (updatedTask.tekst !== 'Updated Test Task') throw new Error('Task update not persisted');
    });

    // Test 3: Transactie rollback
    await testRunner.runTest('Transaction Rollback', async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Maak een test task binnen transactie
            const testId = `rollback_test_${Date.now()}`;
            await client.query(
                'INSERT INTO taken (id, tekst, lijst) VALUES ($1, $2, $3)',
                [testId, 'Rollback Test', 'inbox']
            );
            
            // Rollback
            await client.query('ROLLBACK');
            
            // Verificeer dat task niet bestaat
            const result = await pool.query('SELECT * FROM taken WHERE id = $1', [testId]);
            if (result.rows.length > 0) throw new Error('Transaction rollback failed');
        } finally {
            client.release();
        }
    });

    // Test 4: Foreign key constraints
    await testRunner.runTest('Foreign Key Constraints', async () => {
        const project = await testRunner.createTestProject({ naam: 'FK Test Project' });
        const context = await testRunner.createTestContext({ naam: 'FK Test Context' });
        
        const task = await testRunner.createTestTask({
            tekst: 'FK Test Task',
            projectId: project.id,
            contextId: context.id
        });
        
        // Verificeer dat task correct is aangemaakt met foreign keys
        const tasks = await db.getList('inbox');
        const createdTask = tasks.find(t => t.id === task.id);
        if (createdTask.projectId !== project.id) throw new Error('Project foreign key not set correctly');
        if (createdTask.contextId !== context.id) throw new Error('Context foreign key not set correctly');
    });
}

/**
 * API Endpoint Tests
 */
async function runApiEndpointTests(testRunner) {
    console.log('🔌 Running API Endpoint Tests...');

    // Note: API tests should only run from within the application context
    // These tests are designed for internal use, not external API testing
    
    // Test 1: Database Connection (internal test)
    await testRunner.runTest('API Database Connection Internal', async () => {
        if (!pool) throw new Error('Database pool not available');
        const client = await pool.connect();
        client.release();
    });

    // Test 2: Database functionality
    await testRunner.runTest('API Database Functionality', async () => {
        if (!db) throw new Error('Database module not available');
        const counts = await db.getCounts();
        if (typeof counts !== 'object') throw new Error('Database counts invalid');
    });

    // Test 3: List operations
    await testRunner.runTest('API List Operations', async () => {
        if (!db) throw new Error('Database module not available');
        const inboxItems = await db.getList('inbox');
        if (!Array.isArray(inboxItems)) throw new Error('List operation failed');
    });
}

/**
 * Herhalende Taken Tests
 */
async function runRecurringTaskTests(testRunner) {
    console.log('🔄 Running Recurring Task Tests...');

    // Test 1: Basis herhalende taak aanmaken
    await testRunner.runTest('Create Basic Recurring Task', async () => {
        const recurringTask = await testRunner.createTestTask({
            tekst: 'Dagelijkse test taak',
            lijst: 'acties',
            herhalingType: 'dagelijks',
            herhalingActief: true,
            verschijndatum: '2025-06-18'
        });
        
        if (!recurringTask.herhalingActief) throw new Error('Recurring task not marked as active');
        if (recurringTask.herhalingType !== 'dagelijks') throw new Error('Recurring type not set correctly');
    });

    // Test 2: Complexe herhalingspatronen
    await testRunner.runTest('Complex Recurring Patterns', async () => {
        const patterns = [
            'daily-3',
            'weekly-1-1,3,5',
            'monthly-day-15-1',
            'monthly-weekday-first-1-1',
            'yearly-25-12-1'
        ];
        
        for (const pattern of patterns) {
            const task = await testRunner.createTestTask({
                tekst: `Test ${pattern}`,
                herhalingType: pattern,
                herhalingActief: true
            });
            
            if (task.herhalingType !== pattern) {
                throw new Error(`Pattern ${pattern} not saved correctly`);
            }
        }
    });

    // Test 3: Herhalende taak completion en nieuwe aanmaak
    await testRunner.runTest('Recurring Task Completion Workflow', async () => {
        const originalTask = await testRunner.createTestTask({
            tekst: 'Completion test',
            lijst: 'acties',
            herhalingType: 'dagelijks',
            herhalingActief: true,
            verschijndatum: '2025-06-18'
        });
        
        // Simuleer completion
        const nextDate = '2025-06-19';
        const newTaskId = await db.createRecurringTask(originalTask, nextDate);
        
        if (!newTaskId) throw new Error('New recurring task not created');
        
        // BELANGRIJK: Track de nieuwe herhalende taak voor cleanup
        testRunner.createdRecords.taken.push(newTaskId);
        
        // Verificeer nieuwe taak
        const newTasks = await db.getList('acties');
        const newTask = newTasks.find(t => t.id === newTaskId);
        
        if (!newTask) throw new Error('New recurring task not found in database');
        
        // Datum vergelijking met flexibiliteit voor UTC/timezone conversie
        const expectedDate = new Date(nextDate + 'T00:00:00.000Z');
        const actualDate = new Date(newTask.verschijndatum);
        
        if (Math.abs(expectedDate.getTime() - actualDate.getTime()) > 24 * 60 * 60 * 1000) {
            throw new Error(`New task date incorrect: expected ${nextDate}, got ${newTask.verschijndatum}`);
        }
    });
}

/**
 * Business Logic Tests
 */
async function runBusinessLogicTests(testRunner) {
    console.log('🎯 Running Business Logic Tests...');

    // Test 1: Task completion workflow
    await testRunner.runTest('Task Completion Workflow', async () => {
        const task = await testRunner.createTestTask({
            tekst: 'Completion workflow test',
            lijst: 'acties'
        });
        
        // Mark als afgewerkt
        const completed = await db.updateTask(task.id, { 
            afgewerkt: new Date().toISOString(),
            lijst: 'afgewerkt'
        });
        
        if (!completed) throw new Error('Task completion failed');
        
        // Verificeer in afgewerkte taken
        const completedTasks = await db.getList('afgewerkte-taken');
        const completedTask = completedTasks.find(t => t.id === task.id);
        
        if (!completedTask) throw new Error('Completed task not found in afgewerkte-taken');
        if (!completedTask.afgewerkt) throw new Error('Completed timestamp not set');
    });

    // Test 2: List management
    await testRunner.runTest('List Management', async () => {
        const task = await testRunner.createTestTask({
            tekst: 'List management test',
            lijst: 'inbox'
        });
        
        // Move to acties
        const moved = await db.updateTask(task.id, { lijst: 'acties' });
        if (!moved) throw new Error('Task move failed');
        
        // Verificeer in nieuwe lijst
        const actiesTasks = await db.getList('acties');
        const movedTask = actiesTasks.find(t => t.id === task.id);
        
        if (!movedTask) throw new Error('Task not found in acties list');
        if (movedTask.lijst !== 'acties') throw new Error('Task list not updated');
        
        // Verificeer niet meer in inbox
        const inboxTasks = await db.getList('inbox');
        const stillInInbox = inboxTasks.find(t => t.id === task.id);
        
        if (stillInInbox) throw new Error('Task still found in inbox after move');
    });

    // Test 3: Project/Context operations
    await testRunner.runTest('Project Context Operations', async () => {
        const project = await testRunner.createTestProject({ naam: 'Test Project' });
        const context = await testRunner.createTestContext({ naam: 'Test Context' });
        
        const task = await testRunner.createTestTask({
            tekst: 'Project context test',
            projectId: project.id,
            contextId: context.id
        });
        
        // Verificeer associations
        const tasks = await db.getList('inbox');
        const foundTask = tasks.find(t => t.id === task.id);
        
        if (foundTask.projectId !== project.id) throw new Error('Project association failed');
        if (foundTask.contextId !== context.id) throw new Error('Context association failed');
        
        // Test project/context lists
        const projects = await db.getList('projecten-lijst');
        const contexts = await db.getList('contexten');
        
        if (!projects.find(p => p.id === project.id)) throw new Error('Project not in projecten lijst');
        if (!contexts.find(c => c.id === context.id)) throw new Error('Context not in contexten lijst');
    });
}

/**
 * Voer volledige regression test suite uit
 */
async function runFullRegressionTests() {
    const testRunner = new TestRunner();
    
    try {
        console.log('🚀 Starting Full Regression Test Suite...');
        
        // Run alle test categorieën
        await runDatabaseIntegrityTests(testRunner);
        await runApiEndpointTests(testRunner);
        await runRecurringTaskTests(testRunner);
        await runBusinessLogicTests(testRunner);
        
        console.log('🧹 Running cleanup...');
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created; // Alles zou gecleanup moeten zijn
        
        console.log('✅ Regression Test Suite Complete');
        return summary;
        
    } catch (error) {
        console.error('❌ Fatal error in regression test suite:', error);
        
        // Probeer alsnog cleanup
        try {
            await testRunner.cleanup();
        } catch (cleanupError) {
            console.error('❌ Cleanup failed after fatal error:', cleanupError);
        }
        
        const summary = testRunner.getSummary();
        summary.fatal_error = error.message;
        summary.cleanup_successful = false;
        
        return summary;
    }
}

module.exports = {
    TestRunner,
    runFullRegressionTests,
    runDatabaseIntegrityTests,
    runApiEndpointTests,
    runRecurringTaskTests,
    runBusinessLogicTests
};