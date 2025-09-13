const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
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

// Session configuration - try PostgreSQL store first for persistence across serverless instances
try {
    // First try PostgreSQL session store for persistence
    const pgSession = require('connect-pg-simple')(session);
    
    app.use(session({
        store: new pgSession({
            conString: process.env.DATABASE_URL,
            tableName: 'user_sessions',
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET || 'development-secret-key-for-tickedify',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    }));
    console.log('✅ PostgreSQL session store configured for serverless persistence');
} catch (sessionError) {
    console.error('❌ PostgreSQL session store failed:', sessionError);
    console.log('🔄 Falling back to memory store (may not work in serverless)');
    
    // Fallback to memory store
    app.use(session({
        secret: 'emergency-secret',
        resave: true,
        saveUninitialized: true,
        cookie: { 
            secure: false,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }
    }));
    console.log('🚨 Using memory session store fallback');
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
    const packageJson = require('./package.json');
    res.json({ 
        status: 'ok',
        version: packageJson.version,
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/version', (req, res) => {
    try {
        const packageJson = require('./package.json');
        res.json({
            version: packageJson.version,
            status: 'active',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            version: '0.15.46-fallback',
            status: 'active_fallback',
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
        const { email, password, wachtwoord } = req.body;
        const actualPassword = password || wachtwoord; // Support both English and Dutch
        console.log('🔐 Login attempt for:', email);
        
        if (!db) {
            console.error('❌ Database not available');
            return res.status(500).json({ error: 'Database not available' });
        }
        
        const user = await db.getUserByEmail(email);
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ User found:', user.email);
        
        // Check password with bcrypt  
        const validPassword = await bcrypt.compare(actualPassword, user.wachtwoord_hash);
        if (!validPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ Password valid for:', email);
        
        // Check if session exists
        if (!req.session) {
            console.error('❌ No session available');
            return res.status(500).json({ error: 'Session not available' });
        }
        
        console.log('✅ Session available, setting user data');
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        
        // Simple direct session save - fallback if complex methods fail
        try {
            console.log('✅ Session data set, sending response');
            res.json({ 
                message: 'Login successful',
                user: { id: user.id, email: user.email, naam: user.naam }
            });
        } catch (responseError) {
            console.error('❌ Response error:', responseError);
            res.status(500).json({ error: 'Login response failed' });
        }
    } catch (error) {
        console.error('💥 Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
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

// User info endpoint (for compatibility)
app.get('/api/user/info', requireAuth, async (req, res) => {
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
            storage_used_mb: user.storage_used_mb || 0,
            email_import_code: user.email_import_code || null
        });
    } catch (error) {
        console.error('⚠️ User info error:', error);
        res.json({
            id: req.session.userId,
            email: req.session.userEmail,
            naam: 'Unknown',
            error: 'user_info_failed'
        });
    }
});

// User info endpoint - graceful authentication check without 401 errors
app.get('/api/auth/me', async (req, res) => {
    // Don't use requireAuth middleware to avoid 401 errors during login race condition
    if (!req.session || !req.session.userId) {
        return res.status(200).json({ authenticated: false });
    }
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

// Basic subscription status with full fallbacks - graceful authentication check
app.get('/api/subscription/status', async (req, res) => {
    // Don't use requireAuth middleware to avoid 401 errors during login race condition
    if (!req.session || !req.session.userId) {
        return res.status(200).json({ 
            authenticated: false,
            status: 'not_authenticated' 
        });
    }
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

// Daily planning endpoint
app.get('/api/dagelijkse-planning/:datum', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const datum = req.params.datum;
        
        if (!db || typeof db.getDagelijksePlanning !== 'function') {
            return res.json([]);
        }
        
        const planning = await db.getDagelijksePlanning(userId, datum);
        res.json(planning || []);
    } catch (error) {
        console.error('⚠️ Daily planning error:', error);
        res.json([]);
    }
});

// Save list endpoint
app.post('/api/lijst/:lijstNaam', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const lijstNaam = req.params.lijstNaam;
        const taken = req.body;
        
        if (!db || typeof db.saveTakenToLijst !== 'function') {
            return res.status(501).json({ error: 'Save list not available' });
        }
        
        await db.saveTakenToLijst(userId, lijstNaam, taken);
        res.json({ success: true, message: 'List saved' });
    } catch (error) {
        console.error('⚠️ Save list error:', error);
        res.status(500).json({ error: 'Save list failed' });
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

// Database schema debug endpoint - EXACT column verification
app.get('/api/debug/schema', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database pool not available' });
        }
        
        // Get EXACT column structure of users table
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        res.json({
            table: 'users',
            columns: result.rows,
            total_columns: result.rows.length,
            timestamp: new Date().toISOString(),
            purpose: 'EXACT database schema verification for login fix'
        });
    } catch (error) {
        console.error('Schema debug error:', error);
        res.status(500).json({ 
            error: error.message,
            purpose: 'Failed to get exact database schema'
        });
    }
});

// Debug endpoint for user lookup
app.get('/api/debug/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!db) {
            return res.status(500).json({ error: 'Database not available' });
        }
        
        console.log('🔍 Debug: Looking up user:', email);
        const user = await db.getUserByEmail(email);
        
        res.json({
            email: email,
            found: !!user,
            user: user ? {
                id: user.id,
                email: user.email,
                naam: user.naam,
                hasPassword: !!user.wachtwoord_hash,
                account_type: user.account_type,
                subscription_status: user.subscription_status
            } : null
        });
    } catch (error) {
        console.error('Debug user lookup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint for database schema check
app.get('/api/debug/schema', async (req, res) => {
    try {
        if (!db || !pool) {
            return res.status(500).json({ error: 'Database not available' });
        }
        
        // Check users table structure
        const schemaResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        // Count users
        const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
        
        // Get sample users (without passwords)
        const sampleResult = await pool.query(`
            SELECT id, email, naam, account_type, created_at 
            FROM users 
            LIMIT 5
        `);
        
        res.json({
            schema: schemaResult.rows,
            userCount: countResult.rows[0].count,
            sampleUsers: sampleResult.rows
        });
    } catch (error) {
        console.error('Debug schema error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint for session status
app.get('/api/debug/session-test', (req, res) => {
    try {
        if (!req.session) {
            return res.json({ error: 'No session available', hasSession: false });
        }
        
        // Test session write
        req.session.test = 'test-value';
        req.session.timestamp = new Date().toISOString();
        
        res.json({
            hasSession: !!req.session,
            sessionId: req.session.id,
            userId: req.session.userId,
            userEmail: req.session.userEmail,
            test: req.session.test,
            timestamp: req.session.timestamp
        });
    } catch (error) {
        console.error('Session test error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint for session table
app.get('/api/debug/session-table', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database not available' });
        }
        
        // Check if session table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'session'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            return res.json({ 
                sessionTableExists: false,
                error: 'Session table does not exist'
            });
        }
        
        // Get session table structure
        const schemaResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'session' 
            ORDER BY ordinal_position
        `);
        
        // Count sessions
        const countResult = await pool.query('SELECT COUNT(*) as count FROM session');
        
        res.json({
            sessionTableExists: true,
            schema: schemaResult.rows,
            sessionCount: countResult.rows[0].count
        });
    } catch (error) {
        console.error('Session table debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to create session table
app.post('/api/debug/create-session-table', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database not available' });
        }
        
        // Create session table with connect-pg-simple schema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL
            )
            WITH (OIDS=FALSE);
        `);
        
        await pool.query(`
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
        
        console.log('✅ Session table created successfully');
        
        res.json({ 
            message: 'Session table created successfully',
            success: true 
        });
    } catch (error) {
        console.error('Create session table error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});

// Catch all
app.use((req, res) => {
    res.status(404).json({ 
        error: `Route ${req.path} not found`,
        status: 'active'
    });
});

app.listen(PORT, () => {
    const packageJson = require('./package.json');
    console.log(`🚀 Minimal server v${packageJson.version} running on port ${PORT}`);
});