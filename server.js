const express = require('express');
const fs = require('fs');
const path = require('path');
const { initDatabase, db } = require('./database');

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'public', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'debug.log');

// Custom logger function
function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${message}\n`;
    
    // Write to file (append)
    fs.appendFileSync(logFile, logLine);
    
    // Also log to console
    console.log(message);
}

// Override console.log, console.error etc.
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
    const message = args.join(' ');
    logToFile(message);
    originalConsoleLog(...args);
};

console.error = (...args) => {
    const message = 'ERROR: ' + args.join(' ');
    logToFile(message);
    originalConsoleError(...args);
};
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📡 ${timestamp} ${req.method} ${req.url}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));
    }
    
    // Log response status
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`📤 Response ${res.statusCode} for ${req.method} ${req.url}`);
        if (res.statusCode >= 400) {
            console.log(`⚠️ Error response:`, data);
        }
        originalSend.call(this, data);
    };
    
    next();
});

// Initialize database on startup (don't crash if it fails)
initDatabase().catch(error => {
    console.error('⚠️ Database initialization failed, continuing without database:', error);
});

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
        res.json([]);
    }
});

app.get('/api/tellingen', async (req, res) => {
    try {
        const tellingen = await db.getCounts();
        res.json(tellingen);
    } catch (error) {
        console.error('Error getting counts:', error);
        res.json({});
    }
});

app.get('/api/lijst/:naam', async (req, res) => {
    try {
        const { naam } = req.params;
        const data = await db.getList(naam);
        res.json(data);
    } catch (error) {
        console.error(`Error getting list ${naam}:`, error);
        res.status(404).json({ error: 'Lijst niet gevonden' });
    }
});

app.post('/api/lijst/:naam', async (req, res) => {
    try {
        const { naam } = req.params;
        const success = await db.saveList(naam, req.body);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Fout bij opslaan' });
        }
    } catch (error) {
        console.error(`Error saving list ${naam}:`, error);
        res.status(500).json({ error: 'Fout bij opslaan' });
    }
});

app.put('/api/taak/:id', async (req, res) => {
    console.log(`🔄 PUT /api/taak/${req.params.id}`);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { id } = req.params;
        console.log(`🎯 Updating task with ID: ${id}`);
        
        const success = await db.updateTask(id, req.body);
        console.log(`✅ Update result: ${success}`);
        
        if (success) {
            console.log(`✅ Task ${id} updated successfully`);
            res.json({ success: true });
        } else {
            console.log(`❌ Task ${id} not found or update failed`);
            res.status(404).json({ error: 'Taak niet gevonden' });
        }
    } catch (error) {
        console.error(`💥 Error updating task ${req.params.id}:`, error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Fout bij updaten', details: error.message });
    }
});

app.post('/api/taak/recurring', async (req, res) => {
    try {
        const { originalTask, nextDate } = req.body;
        const taskId = await db.createRecurringTask(originalTask, nextDate);
        if (taskId) {
            res.json({ success: true, taskId });
        } else {
            res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
        }
    } catch (error) {
        console.error('Error creating recurring task:', error);
        res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
    }
});

// Debug endpoints for logs
app.get('/api/debug/logs', (req, res) => {
    try {
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            res.setHeader('Content-Type', 'text/plain');
            res.send(logs);
        } else {
            res.send('No logs found');
        }
    } catch (error) {
        res.status(500).send('Error reading logs: ' + error.message);
    }
});

app.post('/api/debug/clear-logs', (req, res) => {
    try {
        if (fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
        }
        console.log('🗑️ Logs cleared');
        res.json({ success: true, message: 'Logs cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Error clearing logs: ' + error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Tickedify server running on port ${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    if (NODE_ENV === 'development') {
        console.log(`🌐 Local: http://localhost:${PORT}`);
    }
});