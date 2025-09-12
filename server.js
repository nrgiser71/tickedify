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

// User info endpoint
app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!db || typeof db.getUserById !== 'function') {
            return res.json({
                id: userId,
                email: req.session.userEmail,
                naam: 'Unknown',
                fallback: 'database_unavailable'
            });
        }
        
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.id,
            email: user.email,
            naam: user.naam,
            storage_used_mb: user.storage_used_mb || 0
        });
    } catch (error) {
        console.error('⚠️ Auth me error:', error);
        res.json({
            id: req.session.userId,
            email: req.session.userEmail,
            naam: 'Unknown',
            error: 'user_info_failed'
        });
    }
});

// Basic subscription status with full fallbacks
app.get('/api/subscription/status', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!db) {
            return res.json({
                status: 'beta',
                beta_ended: false,
                subscription: null,
                fallback: 'database_unavailable'
            });
        }
        
        // Check if subscription functions exist
        let subscription = null;
        let user = null;
        
        try {
            if (typeof db.getUserSubscription === 'function') {
                subscription = await db.getUserSubscription(userId);
            }
            if (typeof db.getUserById === 'function') {
                user = await db.getUserById(userId);
            }
        } catch (dbError) {
            console.log('⚠️ Subscription tables not available, using fallback:', dbError.message);
        }
        
        // Always return a valid response
        res.json({
            status: subscription?.status || 'beta',
            beta_ended: false,
            storage_used_mb: user?.storage_used_mb || 0,
            subscription: subscription || null,
            fallback: subscription ? null : 'subscription_system_unavailable'
        });
        
    } catch (error) {
        console.error('⚠️ Subscription status error:', error);
        res.json({
            status: 'beta',
            beta_ended: false,
            storage_used_mb: 0,
            subscription: null,
            error: 'subscription_check_failed'
        });
    }
});

// Basic task endpoints
app.get('/api/lijst/:lijstNaam', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const lijstNaam = req.params.lijstNaam;
        
        if (!db || typeof db.getTakenByLijst !== 'function') {
            return res.json([]);
        }
        
        const taken = await db.getTakenByLijst(userId, lijstNaam);
        res.json(taken || []);
    } catch (error) {
        console.error('⚠️ List endpoint error:', error);
        res.json([]);
    }
});

// Basic task update
app.put('/api/taak/:id', requireAuth, async (req, res) => {
    try {
        const taakId = req.params.id;
        const userId = req.session.userId;
        const updates = req.body;
        
        if (!db || typeof db.updateTask !== 'function') {
            return res.status(501).json({ error: 'Task update not available' });
        }
        
        await db.updateTask(taakId, updates, userId);
        res.json({ success: true, message: 'Task updated' });
    } catch (error) {
        console.error('⚠️ Task update error:', error);
        res.status(500).json({ error: 'Task update failed' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.json({ message: 'Logout successful' });
        });
    } else {
        res.json({ message: 'No session to logout' });
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