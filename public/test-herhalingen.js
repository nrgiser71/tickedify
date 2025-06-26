// Test Herhalingen Dashboard JavaScript

class HerhalingenTestRunner {
    constructor() {
        this.testUser = null;
        this.createdTasks = [];
        this.testResults = [];
        this.isRunning = false;
        this.shouldStop = false;
        
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            pending: 0
        };
        
        this.init();
    }
    
    async init() {
        // Load test users
        await this.loadTestUsers();
        
        // Setup event listeners
        document.getElementById('runAllTests').addEventListener('click', () => this.runAllTests());
        document.getElementById('stopTests').addEventListener('click', () => this.stopTests());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
        
        // Initialize test definitions
        this.defineTests();
    }
    
    async loadTestUsers() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                const select = document.getElementById('testUser');
                
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.naam} (${user.email})`;
                    select.appendChild(option);
                });
                
                // Select first user by default if available
                if (users.length > 0) {
                    select.value = users[0].id;
                    this.testUser = users[0].id;
                }
                
                select.addEventListener('change', (e) => {
                    this.testUser = e.target.value;
                });
            }
        } catch (error) {
            console.error('Error loading test users:', error);
            this.showToast('Fout bij laden van gebruikers', 'error');
        }
    }
    
    defineTests() {
        this.testSuites = {
            daily: [
                // Dagelijkse herhalingen
                { description: 'Elke dag', pattern: 'dagelijks', baseDate: '2025-06-01', expected: '2025-06-02' },
                { description: 'Elke dag (einde jaar)', pattern: 'dagelijks', baseDate: '2025-12-31', expected: '2026-01-01', edgeCase: 'Jaarovergang' },
                { description: 'Elke 2 dagen', pattern: 'daily-2', baseDate: '2025-06-15', expected: '2025-06-17' },
                { description: 'Elke 3 dagen', pattern: 'daily-3', baseDate: '2025-06-20', expected: '2025-06-23' },
                { description: 'Elke 7 dagen', pattern: 'daily-7', baseDate: '2025-06-01', expected: '2025-06-08' },
                { description: 'Elke 10 dagen', pattern: 'daily-10', baseDate: '2025-06-25', expected: '2025-07-05', edgeCase: 'Maandovergang' },
                { description: 'Elke 30 dagen', pattern: 'daily-30', baseDate: '2025-01-15', expected: '2025-02-14' },
                { description: 'Elke 365 dagen', pattern: 'daily-365', baseDate: '2024-02-29', expected: '2025-02-28', edgeCase: 'Schrikkeljaar' },
                { description: 'Om de dag', pattern: 'om-de-dag', baseDate: '2025-06-10', expected: '2025-06-12' },
                { description: 'Werkdagen', pattern: 'werkdagen', baseDate: '2025-06-13', expected: '2025-06-16', edgeCase: 'Weekend skip' },
                { description: 'Werkdagen (vrijdag)', pattern: 'werkdagen', baseDate: '2025-06-20', expected: '2025-06-23', edgeCase: 'Weekend skip' }
            ],
            
            weekly: [
                // Wekelijkse herhalingen
                { description: 'Elke week', pattern: 'wekelijks', baseDate: '2025-06-01', expected: '2025-06-08' },
                { description: 'Elke week (jaarovergang)', pattern: 'wekelijks', baseDate: '2025-12-28', expected: '2026-01-04', edgeCase: 'Jaarovergang' },
                { description: 'Elke 2 weken', pattern: '2-weken', baseDate: '2025-06-15', expected: '2025-06-29' },
                { description: 'Elke 3 weken', pattern: '3-weken', baseDate: '2025-06-01', expected: '2025-06-22' },
                { description: 'Elke week op maandag', pattern: 'weekly-1-1', baseDate: '2025-06-17', expected: '2025-06-23' },
                { description: 'Elke week op donderdag', pattern: 'weekly-1-4', baseDate: '2025-06-17', expected: '2025-06-19' },
                { description: 'Elke 2 weken op vrijdag', pattern: 'weekly-2-5', baseDate: '2025-06-01', expected: '2025-06-13' },
                { description: 'Elke 4 weken op zondag', pattern: 'weekly-4-0', baseDate: '2025-06-01', expected: '2025-06-29' },
                { description: 'Volgende maandag', pattern: 'maandag', baseDate: '2025-06-17', expected: '2025-06-23' },
                { description: 'Volgende vrijdag', pattern: 'vrijdag', baseDate: '2025-06-17', expected: '2025-06-20' },
                { description: 'Volgende zondag', pattern: 'zondag', baseDate: '2025-06-17', expected: '2025-06-22' }
            ],
            
            monthly: [
                // Maandelijkse herhalingen
                { description: 'Elke maand', pattern: 'maandelijks', baseDate: '2025-06-15', expected: '2025-07-15' },
                { description: 'Elke maand (31 jan)', pattern: 'maandelijks', baseDate: '2025-01-31', expected: '2025-02-28', edgeCase: 'Februari aanpassing' },
                { description: 'Elke 2 maanden', pattern: '2-maanden', baseDate: '2025-06-01', expected: '2025-08-01' },
                { description: 'Elke 3 maanden', pattern: '3-maanden', baseDate: '2025-03-31', expected: '2025-06-30', edgeCase: 'Kwartaal einde' },
                { description: 'Elke 6 maanden', pattern: '6-maanden', baseDate: '2025-06-30', expected: '2025-12-30' },
                { description: 'Dag 1 van elke maand', pattern: 'monthly-day-1-1', baseDate: '2025-06-15', expected: '2025-07-01' },
                { description: 'Dag 15 van elke 2 maanden', pattern: 'monthly-day-15-2', baseDate: '2025-06-01', expected: '2025-08-15' },
                { description: 'Dag 29 van elke maand', pattern: 'monthly-day-29-1', baseDate: '2025-01-15', expected: '2025-01-29', edgeCase: 'Februari 29' },
                { description: 'Dag 31 van elke maand', pattern: 'monthly-day-31-1', baseDate: '2025-01-15', expected: '2025-01-31' },
                { description: 'Dag 31 van elke maand (vanaf feb)', pattern: 'monthly-day-31-1', baseDate: '2025-02-15', expected: '2025-03-31', edgeCase: 'Februari skip' },
                { description: 'Eerste dag van maand', pattern: 'eerste-dag-maand', baseDate: '2025-06-15', expected: '2025-07-01' },
                { description: 'Laatste dag van maand', pattern: 'laatste-dag-maand', baseDate: '2025-06-15', expected: '2025-07-31' }
            ],
            
            yearly: [
                // Jaarlijkse herhalingen
                { description: 'Elk jaar', pattern: 'jaarlijks', baseDate: '2025-06-15', expected: '2026-06-15' },
                { description: 'Elk jaar (29 feb)', pattern: 'jaarlijks', baseDate: '2024-02-29', expected: '2025-02-28', edgeCase: 'Schrikkeljaar' },
                { description: '25 december elk jaar', pattern: 'yearly-25-12-1', baseDate: '2025-06-01', expected: '2025-12-25' },
                { description: '29 februari elk jaar', pattern: 'yearly-29-2-1', baseDate: '2024-01-01', expected: '2024-02-29', edgeCase: 'Schrikkeljaar' },
                { description: '29 februari (niet-schrikkeljaar)', pattern: 'yearly-29-2-1', baseDate: '2025-01-01', expected: '2025-02-28', edgeCase: 'Niet-schrikkeljaar' },
                { description: '1 januari elk jaar', pattern: 'yearly-1-1-1', baseDate: '2025-06-15', expected: '2026-01-01' },
                { description: '31 december om de 2 jaar', pattern: 'yearly-31-12-2', baseDate: '2025-01-01', expected: '2025-12-31' },
                { description: 'Eerste dag van jaar', pattern: 'eerste-dag-jaar', baseDate: '2025-06-15', expected: '2026-01-01' },
                { description: 'Laatste dag van jaar', pattern: 'laatste-dag-jaar', baseDate: '2025-06-15', expected: '2025-12-31' },
                { description: 'Verjaardag (6 augustus)', pattern: 'yearly-6-8-1', baseDate: '2025-01-01', expected: '2025-08-06' }
            ],
            
            workday: [
                // Werkdag patronen
                { description: 'Eerste werkdag van maand', pattern: 'eerste-werkdag-maand', baseDate: '2025-06-15', expected: '2025-07-01' },
                { description: 'Eerste werkdag (weekend start)', pattern: 'eerste-werkdag-maand', baseDate: '2025-01-15', expected: '2025-02-03', edgeCase: 'Feb start op zat' },
                { description: 'Laatste werkdag van maand', pattern: 'laatste-werkdag-maand', baseDate: '2025-06-15', expected: '2025-07-31' },
                { description: 'Laatste werkdag (weekend einde)', pattern: 'laatste-werkdag-maand', baseDate: '2025-07-15', expected: '2025-08-29', edgeCase: 'Aug eindigt op zon' },
                { description: 'Eerste werkdag van jaar', pattern: 'eerste-werkdag-jaar', baseDate: '2025-06-15', expected: '2026-01-01' },
                { description: 'Eerste werkdag 2026', pattern: 'eerste-werkdag-jaar', baseDate: '2025-12-15', expected: '2026-01-01', edgeCase: '1 jan op donderdag' },
                { description: 'Laatste werkdag van jaar', pattern: 'laatste-werkdag-jaar', baseDate: '2025-06-15', expected: '2025-12-31' },
                { description: 'Eerste werkdag (monthly-weekday)', pattern: 'monthly-weekday-first-workday-1', baseDate: '2025-06-15', expected: '2025-07-01' },
                { description: 'Laatste werkdag (monthly-weekday)', pattern: 'monthly-weekday-last-workday-1', baseDate: '2025-06-15', expected: '2025-07-31' },
                { description: 'Eerste werkdag jaar (yearly-special)', pattern: 'yearly-special-first-workday-1', baseDate: '2025-06-15', expected: '2026-01-01' },
                { description: 'Laatste werkdag jaar (yearly-special)', pattern: 'yearly-special-last-workday-1', baseDate: '2025-06-15', expected: '2025-12-31' }
            ],
            
            weekday: [
                // Specifieke weekdag patronen
                { description: 'Eerste maandag van maand', pattern: 'eerste-maandag-maand', baseDate: '2025-06-15', expected: '2025-07-07' },
                { description: 'Eerste woensdag van maand', pattern: 'eerste-woensdag-maand', baseDate: '2025-06-15', expected: '2025-07-02' },
                { description: 'Laatste vrijdag van maand', pattern: 'laatste-vrijdag-maand', baseDate: '2025-06-15', expected: '2025-07-25' },
                { description: 'Laatste zondag van maand', pattern: 'laatste-zondag-maand', baseDate: '2025-06-15', expected: '2025-07-27' },
                { description: 'Eerste maandag (monthly-weekday)', pattern: 'monthly-weekday-first-1-1', baseDate: '2025-06-15', expected: '2025-07-07' },
                { description: '2de woensdag van maand', pattern: 'monthly-weekday-second-3-1', baseDate: '2025-06-15', expected: '2025-07-09' },
                { description: '3de donderdag van maand', pattern: 'monthly-weekday-third-4-1', baseDate: '2025-06-15', expected: '2025-07-17' },
                { description: '4de vrijdag van maand', pattern: 'monthly-weekday-fourth-5-1', baseDate: '2025-06-15', expected: '2025-07-25' },
                { description: 'Laatste dinsdag van maand', pattern: 'monthly-weekday-last-2-1', baseDate: '2025-06-15', expected: '2025-07-29' },
                { description: '1ste maandag om de 2 maanden', pattern: 'monthly-weekday-first-1-2', baseDate: '2025-06-01', expected: '2025-08-04' },
                { description: '5de vrijdag (bestaat niet)', pattern: 'monthly-weekday-fifth-5-1', baseDate: '2025-06-15', expected: null, edgeCase: 'Niet bestaand' }
            ],
            
            event: [
                // Event-based herhalingen (deze kunnen niet automatisch getest worden zonder event datum)
                { description: '10 dagen voor webinar', pattern: 'event-10-before-webinar', eventDate: '2025-07-01', expected: '2025-06-21' },
                { description: '30 dagen voor conferentie', pattern: 'event-30-before-conferentie', eventDate: '2025-12-15', expected: '2025-11-15' },
                { description: '7 dagen na lancering', pattern: 'event-7-after-lancering', eventDate: '2025-06-01', expected: '2025-06-08' },
                { description: '14 dagen voor deadline', pattern: 'event-14-before-deadline', eventDate: '2025-06-30', expected: '2025-06-16' },
                { description: '60 dagen voor event', pattern: 'event-60-before-event', eventDate: '2025-08-01', expected: '2025-06-02' }
            ]
        };
    }
    
    async runAllTests() {
        if (!this.testUser) {
            this.showToast('Selecteer eerst een test gebruiker', 'error');
            return;
        }
        
        if (this.isRunning) {
            this.showToast('Tests zijn al bezig', 'warning');
            return;
        }
        
        this.isRunning = true;
        this.shouldStop = false;
        this.createdTasks = [];
        this.testResults = [];
        
        // Update UI
        document.getElementById('runAllTests').disabled = true;
        document.getElementById('stopTests').disabled = false;
        document.getElementById('progressBar').style.display = 'block';
        
        // Clear previous results
        this.clearResults();
        
        // Count total tests
        this.stats.total = 0;
        Object.values(this.testSuites).forEach(suite => {
            this.stats.total += suite.length;
        });
        
        this.stats.pending = this.stats.total;
        this.updateStats();
        
        try {
            // Run test suites sequentially
            for (const [suiteName, tests] of Object.entries(this.testSuites)) {
                if (this.shouldStop) break;
                
                await this.runTestSuite(suiteName, tests);
            }
            
            this.showToast('Alle tests voltooid!', 'success');
        } catch (error) {
            console.error('Error running tests:', error);
            this.showToast('Fout bij uitvoeren van tests', 'error');
        } finally {
            // Cleanup
            await this.cleanup();
            
            this.isRunning = false;
            document.getElementById('runAllTests').disabled = false;
            document.getElementById('stopTests').disabled = true;
        }
    }
    
    async runTestSuite(suiteName, tests) {
        const tableId = suiteName + 'Tests';
        const tbody = document.querySelector(`#${tableId} tbody`);
        
        for (let i = 0; i < tests.length; i++) {
            if (this.shouldStop) break;
            
            const test = tests[i];
            const row = this.createTestRow(test);
            tbody.appendChild(row);
            
            // Update progress
            const progress = ((this.stats.passed + this.stats.failed) / this.stats.total) * 100;
            this.updateProgress(progress);
            
            // Run the test
            await this.runSingleTest(test, row);
            
            // Small delay between tests
            await this.delay(100);
        }
    }
    
    createTestRow(test) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${test.description}${test.edgeCase ? `<span class="edge-case-tag">${test.edgeCase}</span>` : ''}</td>
            <td><code>${test.pattern}</code></td>
            <td>${test.baseDate || test.eventDate || '-'}</td>
            <td>${test.expected || 'null'}</td>
            <td class="actual-result">-</td>
            <td class="status-cell"><span class="test-status pending">In afwachting</span></td>
            <td class="details-cell">-</td>
        `;
        return row;
    }
    
    async runSingleTest(test, row) {
        const statusCell = row.querySelector('.status-cell');
        const actualCell = row.querySelector('.actual-result');
        const detailsCell = row.querySelector('.details-cell');
        
        // Update status to running
        statusCell.innerHTML = '<span class="test-status running"><span class="loading-spinner"></span>Bezig...</span>';
        
        try {
            // Calculate next recurring date using the API
            const result = await this.calculateNextRecurringDate(
                test.baseDate || test.eventDate,
                test.pattern,
                test.eventDate
            );
            
            actualCell.textContent = result || 'null';
            
            // Compare results
            const passed = result === test.expected;
            
            if (passed) {
                statusCell.innerHTML = '<span class="test-status pass">✓ Geslaagd</span>';
                this.stats.passed++;
                detailsCell.textContent = 'Correct berekend';
            } else {
                statusCell.innerHTML = '<span class="test-status fail">✗ Gefaald</span>';
                this.stats.failed++;
                detailsCell.innerHTML = `<div class="test-results">Verwacht: ${test.expected}\nGekregen: ${result}</div>`;
            }
            
            this.stats.pending--;
            this.updateStats();
            
        } catch (error) {
            statusCell.innerHTML = '<span class="test-status fail">✗ Error</span>';
            this.stats.failed++;
            this.stats.pending--;
            detailsCell.innerHTML = `<div class="test-results">Error: ${error.message}</div>`;
            this.updateStats();
        }
    }
    
    async calculateNextRecurringDate(baseDate, pattern, eventDate = null) {
        try {
            // For event-based patterns, we need special handling
            if (pattern.startsWith('event-')) {
                if (!eventDate) return null;
                
                // Parse event pattern: event-days-direction-eventname
                const parts = pattern.split('-');
                const days = parseInt(parts[1]);
                const direction = parts[2]; // 'before' or 'after'
                
                const event = new Date(eventDate);
                const result = new Date(event);
                
                if (direction === 'before') {
                    result.setDate(result.getDate() - days);
                } else {
                    result.setDate(result.getDate() + days);
                }
                
                return result.toISOString().split('T')[0];
            }
            
            // Use the API endpoint for testing
            const response = await fetch(`/api/debug/test-recurring/${encodeURIComponent(pattern)}/${baseDate}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.nextDate;
            
        } catch (error) {
            console.error('Error calculating recurring date:', error);
            throw error;
        }
    }
    
    async cleanup() {
        const cleanupStatus = document.getElementById('cleanupStatus');
        cleanupStatus.textContent = 'Bezig met opruimen van test data...';
        
        try {
            // Cleanup any created tasks
            for (const taskId of this.createdTasks) {
                try {
                    await fetch(`/api/taak/${taskId}`, {
                        method: 'DELETE',
                        headers: {
                            'X-User-ID': this.testUser
                        }
                    });
                } catch (error) {
                    console.error(`Error deleting task ${taskId}:`, error);
                }
            }
            
            cleanupStatus.textContent = `✓ ${this.createdTasks.length} test taken opgeruimd.`;
            this.createdTasks = [];
            
        } catch (error) {
            console.error('Error during cleanup:', error);
            cleanupStatus.textContent = '✗ Fout bij opruimen van test data.';
        }
    }
    
    stopTests() {
        this.shouldStop = true;
        this.showToast('Tests worden gestopt...', 'info');
    }
    
    clearResults() {
        // Clear all test tables
        Object.keys(this.testSuites).forEach(suiteName => {
            const tbody = document.querySelector(`#${suiteName}Tests tbody`);
            if (tbody) tbody.innerHTML = '';
        });
        
        // Reset stats
        this.stats = { total: 0, passed: 0, failed: 0, pending: 0 };
        this.updateStats();
        
        // Hide progress bar
        document.getElementById('progressBar').style.display = 'none';
    }
    
    updateStats() {
        document.getElementById('totalTests').textContent = this.stats.total;
        document.getElementById('passedTests').textContent = this.stats.passed;
        document.getElementById('failedTests').textContent = this.stats.failed;
        document.getElementById('pendingTests').textContent = this.stats.pending;
    }
    
    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = percentage + '%';
        progressFill.textContent = Math.round(percentage) + '%';
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"></div>
            <div class="toast-message">${message}</div>
        `;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Simple toast styles
const style = document.createElement('style');
style.textContent = `
    #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
    }
    
    .toast {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px 20px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        pointer-events: auto;
        cursor: pointer;
        animation: slideIn 0.3s ease;
    }
    
    .toast.toast-exit {
        animation: slideOut 0.3s ease;
    }
    
    .toast-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
    }
    
    .toast.success {
        border-left: 4px solid #28a745;
    }
    
    .toast.success .toast-icon::before {
        content: '✓';
        color: #28a745;
        font-weight: bold;
    }
    
    .toast.error {
        border-left: 4px solid #dc3545;
    }
    
    .toast.error .toast-icon::before {
        content: '✗';
        color: #dc3545;
        font-weight: bold;
    }
    
    .toast.warning {
        border-left: 4px solid #ffc107;
    }
    
    .toast.warning .toast-icon::before {
        content: '⚠';
        color: #ffc107;
    }
    
    .toast.info {
        border-left: 4px solid #17a2b8;
    }
    
    .toast.info .toast-icon::before {
        content: 'ℹ';
        color: #17a2b8;
        font-weight: bold;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the test runner when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.testRunner = new HerhalingenTestRunner();
});