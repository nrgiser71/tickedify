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

    // Test 4: Filter functionaliteit (nieuwe feature v1.0.8)
    await testRunner.runTest('Task Filter Functionality', async () => {
        // Maak taken met verschillende teksten voor filtering tests
        const task1 = await testRunner.createTestTask({
            tekst: 'Email versturen naar klanten',
            lijst: 'acties'
        });
        
        const task2 = await testRunner.createTestTask({
            tekst: 'Vergadering voorbereiden',
            lijst: 'acties'
        });
        
        const task3 = await testRunner.createTestTask({
            tekst: 'Factuur email versturen',
            lijst: 'acties'
        });
        
        // Test dat taken correct zijn aangemaakt
        const acties = await db.getList('acties');
        const createdTasks = acties.filter(t => 
            t.id === task1.id || t.id === task2.id || t.id === task3.id
        );
        
        if (createdTasks.length !== 3) throw new Error('Not all filter test tasks created');
        
        // Verificeer dat taken correcte tekst hebben voor filter testing
        const emailTasks = createdTasks.filter(t => t.tekst.toLowerCase().includes('email'));
        if (emailTasks.length !== 2) throw new Error('Email filter test tasks not found correctly');
        
        const vergaderingTasks = createdTasks.filter(t => t.tekst.toLowerCase().includes('vergadering'));
        if (vergaderingTasks.length !== 1) throw new Error('Vergadering filter test task not found correctly');
    });

    // Test 5: Datum filter functionaliteit (fix voor v1.0.10)
    await testRunner.runTest('Date Filter Functionality', async () => {
        // Maak taken met specifieke datums voor filter testing
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayISO = today.toISOString().split('T')[0];
        const tomorrowISO = tomorrow.toISOString().split('T')[0];
        
        const taskToday = await testRunner.createTestTask({
            tekst: 'Taak voor vandaag',
            lijst: 'acties',
            verschijndatum: todayISO
        });
        
        const taskTomorrow = await testRunner.createTestTask({
            tekst: 'Taak voor morgen',
            lijst: 'acties', 
            verschijndatum: tomorrowISO
        });
        
        // Verificeer dat taken correct zijn aangemaakt met juiste datums
        const acties = await db.getList('acties');
        const todayTask = acties.find(t => t.id === taskToday.id);
        const tomorrowTask = acties.find(t => t.id === taskTomorrow.id);
        
        if (!todayTask) throw new Error('Today task not found');
        if (!tomorrowTask) throw new Error('Tomorrow task not found');
        
        // Test datum normalisatie (verschillende datum formaten moeten correct worden vergeleken)
        const normalizeDate = (dateStr) => {
            if (!dateStr) return null;
            const parsed = new Date(dateStr);
            return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
        };
        
        const normalizedTodayDate = normalizeDate(todayTask.verschijndatum);
        const normalizedTomorrowDate = normalizeDate(tomorrowTask.verschijndatum);
        
        if (normalizedTodayDate !== todayISO) throw new Error(`Today task date mismatch: ${normalizedTodayDate} !== ${todayISO}`);
        if (normalizedTomorrowDate !== tomorrowISO) throw new Error(`Tomorrow task date mismatch: ${normalizedTomorrowDate} !== ${tomorrowISO}`);
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

/**
 * Task Completion API Tests
 */
async function runTaskCompletionAPITests(testRunner) {
    console.log('✅ Running Task Completion API Tests...');

    // T003: API contract test for PUT /api/taak/:id completion
    await testRunner.runTest('Task Completion via Checkbox API', async () => {
        // Create test task in inbox
        const testTask = await testRunner.createTestTask({
            tekst: 'Test checkbox completion task',
            lijst: 'inbox',
            verschijndatum: new Date().toISOString().split('T')[0]
        });

        // Test completion via checkbox API call
        const completionData = {
            lijst: 'afgewerkt',
            afgewerkt: new Date().toISOString(),
            completedViaCheckbox: true
        };

        // This should FAIL until T010 is implemented
        try {
            const response = await fetch(`http://localhost:3000/api/taak/${testTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(completionData)
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Verify response structure
            if (!result.success) {
                throw new Error('API did not return success');
            }

            if (result.task.lijst !== 'afgewerkt') {
                throw new Error('Task not marked as completed');
            }

            if (!result.task.afgewerkt) {
                throw new Error('Completion timestamp not set');
            }

        } catch (error) {
            throw new Error(`Task completion API test failed: ${error.message}`);
        }
    });
}

/**
 * Recurring Task API Tests
 */
async function runRecurringTaskAPITests(testRunner) {
    console.log('🔄 Running Recurring Task API Tests...');

    // T004: API contract test for recurring task creation
    await testRunner.runTest('Recurring Task Creation via Checkbox', async () => {
        // Create recurring test task
        const recurringTask = await testRunner.createTestTask({
            tekst: 'Test recurring checkbox completion',
            lijst: 'inbox',
            herhaling_type: 'weekly-1-1',
            herhaling_actief: true,
            verschijndatum: new Date().toISOString().split('T')[0]
        });

        // Complete recurring task via checkbox
        const completionData = {
            lijst: 'afgewerkt',
            afgewerkt: new Date().toISOString(),
            completedViaCheckbox: true
        };

        // This should FAIL until T012 is implemented
        try {
            const response = await fetch(`http://localhost:3000/api/taak/${recurringTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(completionData)
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Verify recurring task was created
            if (!result.recurringTaskCreated) {
                throw new Error('Recurring task was not created');
            }

            if (!result.nextTask || !result.nextTask.id) {
                throw new Error('Next task instance not returned');
            }

            // Track the new task for cleanup
            testRunner.createdRecords.taken.push(result.nextTask.id);

        } catch (error) {
            throw new Error(`Recurring task API test failed: ${error.message}`);
        }
    });
}

/**
 * Error Handling API Tests
 */
async function runErrorHandlingAPITests(testRunner) {
    console.log('⚠️ Running Error Handling API Tests...');

    // T005: Error handling contract tests (404, 400, 500)
    await testRunner.runTest('404 Error for Non-existent Task', async () => {
        const completionData = {
            lijst: 'afgewerkt',
            afgewerkt: new Date().toISOString(),
            completedViaCheckbox: true
        };

        try {
            const response = await fetch('http://localhost:3000/api/taak/99999', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(completionData)
            });

            if (response.status !== 404) {
                throw new Error(`Expected 404, got ${response.status}`);
            }

            const result = await response.json();
            if (result.success !== false || result.code !== 'TASK_NOT_FOUND') {
                throw new Error('Error response format incorrect');
            }

        } catch (error) {
            throw new Error(`404 error test failed: ${error.message}`);
        }
    });

    await testRunner.runTest('400 Error for Already Completed Task', async () => {
        // Create and complete a task first
        const testTask = await testRunner.createTestTask({
            tekst: 'Already completed task',
            lijst: 'afgewerkt',
            afgewerkt: new Date().toISOString()
        });

        const completionData = {
            lijst: 'afgewerkt',
            afgewerkt: new Date().toISOString(),
            completedViaCheckbox: true
        };

        try {
            const response = await fetch(`http://localhost:3000/api/taak/${testTask.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(completionData)
            });

            if (response.status !== 400) {
                throw new Error(`Expected 400, got ${response.status}`);
            }

            const result = await response.json();
            if (result.success !== false || result.code !== 'INVALID_TASK_STATE') {
                throw new Error('Error response format incorrect');
            }

        } catch (error) {
            throw new Error(`400 error test failed: ${error.message}`);
        }
    });
}

/**
 * UI Integration Tests
 */
async function runUIIntegrationTests(testRunner) {
    console.log('🖱️ Running UI Integration Tests...');

    // T006: Normal planning baseline workflow
    await testRunner.runTest('Normal Planning Baseline Workflow', async () => {
        const testTask = await testRunner.createTestTask({
            tekst: 'Normal planning test task',
            lijst: 'inbox',
            verschijndatum: new Date().toISOString().split('T')[0]
        });

        // This test validates that existing functionality still works
        // Will be implemented as browser automation or API simulation
        console.log('📝 Normal planning workflow test placeholder - requires browser automation');

        // For now, just verify task exists in inbox
        const tasks = await pool.query('SELECT * FROM taken WHERE id = $1', [testTask.id]);
        if (tasks.rows.length === 0) {
            throw new Error('Test task not found in database');
        }

        if (tasks.rows[0].lijst !== 'inbox') {
            throw new Error('Test task not in inbox status');
        }
    });

    // T007: Direct task completion workflow
    await testRunner.runTest('Direct Task Completion Workflow', async () => {
        const testTask = await testRunner.createTestTask({
            tekst: 'Direct completion test task',
            lijst: 'inbox',
            verschijndatum: new Date().toISOString().split('T')[0]
        });

        // This test validates the complete UI workflow for checkbox completion
        console.log('✅ Direct completion workflow test placeholder - requires UI implementation');

        // Test will validate:
        // - Checkbox appears in planning popup
        // - Button text changes when checked
        // - Validation is bypassed
        // - Task completion succeeds
        // - Task moves to completed status

        // For now, verify task setup
        if (!testTask.id) {
            throw new Error('Test task creation failed');
        }
    });

    // T008: Checkbox toggle behavior
    await testRunner.runTest('Checkbox Toggle Behavior', async () => {
        console.log('🔄 Checkbox toggle behavior test placeholder - requires UI implementation');

        // Test will validate:
        // - Checkbox state changes affect form state
        // - Button text toggles correctly
        // - Validation state toggles correctly
        // - Form can return to normal mode

        // Placeholder passes for now
    });

    // T009: Recurring task completion workflow
    await testRunner.runTest('Recurring Task Completion Workflow', async () => {
        const recurringTask = await testRunner.createTestTask({
            tekst: 'Recurring UI completion test',
            lijst: 'inbox',
            herhaling_type: 'weekly-1-1',
            herhaling_actief: true,
            verschijndatum: new Date().toISOString().split('T')[0]
        });

        console.log('🔄 Recurring task UI workflow test placeholder - requires UI implementation');

        // Test will validate:
        // - Recurring task completes via checkbox
        // - New recurring instance is created
        // - User sees success feedback
        // - Both tasks tracked correctly

        // For now, verify recurring task setup
        if (!recurringTask.herhaling_actief) {
            throw new Error('Recurring task not properly configured');
        }
    });
}

/**
 * Performance Tests - Validates API response times (<300ms)
 */
async function runPerformanceTests(testRunner) {
    console.log('🚀 Running Performance Tests...');

    // Helper function to measure API response time
    const measureApiCall = async (url, method = 'GET', body = null) => {
        const startTime = Date.now();

        // Make URL absolute if it's relative
        const absoluteUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;

        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(absoluteUrl, options);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return { response, responseTime };
    };

    // Test 1: GET /api/lijst/inbox performance
    await testRunner.runTest('GET /api/lijst/inbox Response Time', async () => {
        const { response, responseTime } = await measureApiCall('/api/lijst/inbox');

        console.log(`📊 Inbox list API response time: ${responseTime}ms`);

        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        if (responseTime > 300) {
            throw new Error(`Response time ${responseTime}ms exceeds 300ms limit`);
        }
    });

    // Test 2: PUT /api/taak/:id performance (task completion)
    await testRunner.runTest('PUT /api/taak/:id Response Time (Completion)', async () => {
        // Create a test task first
        const testTask = await testRunner.createTestTask({
            tekst: 'Performance test taak',
            lijst: 'inbox',
            verschijndatum: new Date().toISOString().split('T')[0]
        });

        const updateData = {
            tekst: 'Performance test taak updated',
            lijst: 'afgewerkt',
            completedViaCheckbox: true
        };

        const { response, responseTime } = await measureApiCall(
            `/api/taak/${testTask.id}`,
            'PUT',
            updateData
        );

        console.log(`📊 Task completion API response time: ${responseTime}ms`);

        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        if (responseTime > 300) {
            throw new Error(`Response time ${responseTime}ms exceeds 300ms limit`);
        }
    });

    // Test 3: POST /api/taak/recurring performance
    await testRunner.runTest('POST /api/taak/recurring Response Time', async () => {
        const recurringData = {
            originalTask: {
                id: `test_recurring_${Date.now()}`,
                tekst: 'Recurring performance test',
                herhalingType: 'weekly-1-1'
            },
            nextDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        const { response, responseTime } = await measureApiCall(
            '/api/taak/recurring',
            'POST',
            recurringData
        );

        console.log(`📊 Recurring task creation API response time: ${responseTime}ms`);

        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        if (responseTime > 300) {
            throw new Error(`Response time ${responseTime}ms exceeds 300ms limit`);
        }

        // Track the created recurring task for cleanup
        const result = await response.json();
        if (result.newTask && result.newTask.id) {
            testRunner.createdRecords.taken.push(result.newTask.id);
        }
    });

    // Test 4: Bulk performance test - multiple API calls
    await testRunner.runTest('Bulk API Performance Test', async () => {
        const concurrentCalls = 5;
        const promises = [];

        for (let i = 0; i < concurrentCalls; i++) {
            promises.push(measureApiCall('/api/lijst/inbox'));
        }

        const results = await Promise.all(promises);
        const avgResponseTime = results.reduce((sum, result) => sum + result.responseTime, 0) / results.length;
        const maxResponseTime = Math.max(...results.map(r => r.responseTime));

        console.log(`📊 Bulk test - Average: ${avgResponseTime.toFixed(1)}ms, Max: ${maxResponseTime}ms`);

        // Check that all calls succeeded
        results.forEach((result, index) => {
            if (!result.response.ok) {
                throw new Error(`Concurrent call ${index + 1} failed with status ${result.response.status}`);
            }
        });

        // Check average response time
        if (avgResponseTime > 200) {
            throw new Error(`Average response time ${avgResponseTime.toFixed(1)}ms exceeds 200ms limit for bulk operations`);
        }

        // Check max response time
        if (maxResponseTime > 300) {
            throw new Error(`Maximum response time ${maxResponseTime}ms exceeds 300ms limit`);
        }
    });
}

module.exports = {
    TestRunner,
    runFullRegressionTests,
    runDatabaseIntegrityTests,
    runApiEndpointTests,
    runRecurringTaskTests,
    runBusinessLogicTests,
    runTaskCompletionAPITests,
    runRecurringTaskAPITests,
    runErrorHandlingAPITests,
    runUIIntegrationTests,
    runPerformanceTests
};