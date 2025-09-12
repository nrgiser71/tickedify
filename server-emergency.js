const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚨 Emergency server starting...');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Emergency health endpoints
app.get('/api/ping', (req, res) => {
    res.json({ 
        status: 'emergency_mode',
        version: '0.15.21-emergency',
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/version', (req, res) => {
    res.json({ 
        version: '0.15.21-emergency',
        status: 'emergency_mode',
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'emergency_running',
        version: '0.15.21-emergency',
        timestamp: new Date().toISOString()
    });
});

// Database initialization attempt
let db = null;
let pool = null;

try {
    console.log('🔧 Attempting database import...');
    const dbModule = require('./database');
    db = dbModule.db;
    pool = dbModule.pool;
    console.log('✅ Database module imported successfully');
    
    // Initialize database
    dbModule.initDatabase().then(() => {
        console.log('✅ Database initialization completed');
    }).catch(error => {
        console.error('❌ Database initialization failed:', error);
    });
} catch (error) {
    console.error('❌ Failed to import database module:', error);
}

// Basic authentication check endpoint  
app.get('/api/auth/check', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                authenticated: false,
                error: 'Database not available - emergency mode',
                user: null 
            });
        }
        
        // Minimal auth check without complex logic
        res.json({ 
            authenticated: false,
            user: null,
            emergency_mode: true
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ 
            authenticated: false, 
            error: error.message 
        });
    }
});

// Basic task list endpoint
app.get('/api/lijst/:lijstNaam', async (req, res) => {
    try {
        if (!db || !pool) {
            return res.status(503).json({ 
                error: 'Database not available - emergency mode',
                taken: []
            });
        }
        
        // Basic query without complex features
        const result = await pool.query('SELECT * FROM taken LIMIT 10');
        res.json(result.rows);
        
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ 
            error: error.message,
            taken: []
        });
    }
});

// Catch all 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: `Route ${req.path} not found`,
        emergency_mode: true
    });
});

app.listen(PORT, () => {
    console.log(`🚨 Emergency server running on port ${PORT}`);
    console.log('🎯 Basic endpoints available: /api/ping, /api/version, /api/health');
});