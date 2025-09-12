const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database import with error handling
let db = null;
let pool = null;

try {
    const dbModule = require('./database');
    db = dbModule.db;
    pool = dbModule.pool;
    console.log('✅ Database module imported');
    
    // Initialize database without waiting
    dbModule.initDatabase().catch(error => {
        console.error('Database init failed:', error);
    });
} catch (error) {
    console.error('Database import failed:', error);
}

// Minimal working endpoints
app.get('/api/ping', (req, res) => {
    res.json({ 
        status: 'ok',
        version: '0.15.23-minimal',
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/version', (req, res) => {
    try {
        const packageJson = require('./package.json');
        res.json({
            version: packageJson.version,
            status: 'minimal_mode',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            version: '0.15.23-minimal',
            status: 'minimal_mode',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'minimal_running',
        database_available: !!db,
        timestamp: new Date().toISOString()
    });
});

// Simple auth check without subscription logic
app.get('/api/auth/check', (req, res) => {
    res.json({ 
        authenticated: false,
        user: null,
        minimal_mode: true
    });
});

// Catch all
app.use((req, res) => {
    res.status(404).json({ 
        error: `Route ${req.path} not found`,
        minimal_mode: true
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Minimal server v0.15.23 running on port ${PORT}`);
});