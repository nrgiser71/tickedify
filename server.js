const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

// Import PostgreSQL session store
const pgSession = require('connect-pg-simple')(session);

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

// Session configuration with fallback
if (db && pool) {
    try {
        app.use(session({
            store: new pgSession({
                pool: pool,
                tableName: 'session'
            }),
            secret: process.env.SESSION_SECRET || 'development-secret',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dagen
            }
        }));
        console.log('✅ Session store configured');
    } catch (sessionError) {
        console.error('Session configuration failed:', sessionError);
        // Continue without sessions
    }
}

// Simple middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

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

// Basic login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!db) {
            return res.status(500).json({ error: 'Database not available' });
        }
        
        const user = await db.getUserByEmail(email);
        if (!user || !await db.verifyPassword(password, user.wachtwoord)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        
        res.json({ 
            message: 'Login successful',
            user: { id: user.id, email: user.email, naam: user.naam }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Auth check with session
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ 
            authenticated: true,
            user: { 
                id: req.session.userId, 
                email: req.session.userEmail 
            }
        });
    } else {
        res.json({ 
            authenticated: false,
            user: null
        });
    }
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