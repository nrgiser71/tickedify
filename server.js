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

// Email notifications system
let emailNotifications = null;

try {
    const EmailNotificationManager = require('./email-notifications');
    emailNotifications = new EmailNotificationManager();
    console.log('📧 Email notification system initialized');
} catch (error) {
    console.error('Email notification system import failed:', error);
    console.log('⚠️ Email notifications will be disabled');
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

// Admin authentication middleware
const requireAdminAuth = (req, res, next) => {
    if (req.session && req.session.adminAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Admin authentication required' });
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

// Enhanced subscription status with beta-end logic
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
        
        // Get beta configuration and user data
        let betaConfig = null;
        let subscription = null;
        let user = null;
        
        try {
            if (typeof db.getBetaConfig === 'function') {
                betaConfig = await db.getBetaConfig();
            }
            if (typeof db.getUserSubscription === 'function') {
                subscription = await db.getUserSubscription(userId);
            }
            if (typeof db.getUserById === 'function') {
                user = await db.getUserById(userId);
            }
        } catch (dbError) {
            console.log('⚠️ Subscription/beta tables not available, using fallback:', dbError.message);
        }
        
        // Determine user status based on beta config and user data
        let userStatus = 'beta';
        let betaEnded = false;
        
        if (betaConfig && !betaConfig.beta_period_active) {
            // Global beta period has ended
            betaEnded = true;
            
            if (user && user.account_type === 'regular') {
                // User is already converted to regular (has made choice)
                userStatus = user.subscription_status || 'active';
            } else if (subscription) {
                // User has active subscription
                userStatus = subscription.status;
            } else {
                // User needs to choose subscription
                userStatus = 'needs_subscription';
            }
        } else {
            // Beta period still active or no beta config
            if (subscription) {
                userStatus = subscription.status;
            } else {
                userStatus = user?.account_type === 'regular' ? user?.subscription_status || 'active' : 'beta';
            }
        }
        
        console.log('🔍 Subscription status check:', {
            userId,
            betaActive: betaConfig?.beta_period_active,
            userAccountType: user?.account_type,
            userStatus,
            betaEnded
        });
        
        // Always return a valid response
        res.json({
            status: userStatus,
            beta_ended: betaEnded,
            storage_used_mb: user?.storage_used_mb || '0.00',
            subscription: subscription || null,
            beta_config: betaConfig ? {
                active: betaConfig.beta_period_active,
                ended_at: betaConfig.beta_ended_at
            } : null,
            fallback: (subscription || betaConfig) ? null : 'subscription_system_unavailable'
        });
        
    } catch (error) {
        console.error('⚠️ Subscription status error:', error);
        res.json({
            status: 'beta',
            beta_ended: false,
            storage_used_mb: '0.00',
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

// Start trial subscription endpoint
app.post('/api/subscription/start-trial', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        console.log('🆓 Starting trial for user:', userId);
        
        if (!db || typeof db.createUserSubscription !== 'function') {
            console.log('⚠️ Subscription system not available - simulating trial');
            return res.json({ 
                success: true, 
                message: 'Trial started',
                trial: true,
                fallback: true 
            });
        }
        
        // Create trial subscription
        const trialData = {
            addon_storage: 'basic',
            storage_limit_mb: 100,
            status: 'trial',
            trial_ends_at: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)), // 14 days
            plugandpay_subscription_id: null // No payment for trial
        };
        
        await db.createUserSubscription(userId, trialData);
        console.log('✅ Trial subscription created for user:', userId);
        
        // Send trial started email notification
        if (emailNotifications && emailNotifications.isAvailable()) {
            try {
                const user = await db.getUserById(userId);
                if (user) {
                    await emailNotifications.sendTrialStartedEmail(user, trialData.trial_ends_at);
                    console.log('📧 Trial started email sent to:', user.email);
                }
            } catch (emailError) {
                console.warn('⚠️ Failed to send trial started email:', emailError.message);
            }
        }
        
        res.json({
            success: true,
            message: 'Trial started successfully',
            trial: true,
            trial_ends_at: trialData.trial_ends_at
        });
        
    } catch (error) {
        console.error('❌ Error starting trial:', error);
        res.status(500).json({ 
            error: 'Failed to start trial',
            fallback: true
        });
    }
});

// End beta period for testing purposes (admin only)
app.post('/api/admin/end-beta', requireAdminAuth, async (req, res) => {
    try {
        if (!db || typeof db.updateBetaConfig !== 'function') {
            return res.status(501).json({ error: 'Beta config not available' });
        }
        
        await db.updateBetaConfig(false); // End beta period
        console.log('🚨 Beta period ended via admin endpoint');
        
        res.json({
            success: true,
            message: 'Beta period ended',
            beta_period_active: false
        });
        
    } catch (error) {
        console.error('❌ Error ending beta period:', error);
        res.status(500).json({ error: 'Failed to end beta period' });
    }
});

// Storage usage check endpoint
app.get('/api/subscription/storage-usage', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const additionalBytes = parseInt(req.query.additionalBytes) || 0;
        
        if (!db || typeof db.getStorageLimits !== 'function') {
            // Fallback for systems without subscription tables
            return res.json({
                allowed: true,
                used_mb: 0,
                limit_mb: 1000,
                percentage: 0,
                fallback: true
            });
        }
        
        const limits = await db.getStorageLimits(userId);
        const wouldUseMB = parseFloat(limits.storage_used_mb) + (additionalBytes / (1024 * 1024));
        const allowed = wouldUseMB <= limits.storage_limit_mb;
        
        res.json({
            allowed: allowed,
            used_mb: limits.storage_used_mb,
            limit_mb: limits.storage_limit_mb,
            percentage: Math.round((wouldUseMB / limits.storage_limit_mb) * 100),
            would_use_mb: wouldUseMB.toFixed(2)
        });
        
    } catch (error) {
        console.error('❌ Storage usage check error:', error);
        res.json({
            allowed: true, // Allow on error to not block user
            error: 'storage_check_failed'
        });
    }
});

// Admin beta status endpoint
app.get('/api/admin/beta/status', requireAdminAuth, async (req, res) => {
    try {
        if (!db || typeof db.getBetaConfig !== 'function') {
            return res.json({
                betaConfig: { beta_period_active: true, beta_ended_at: null },
                statistics: { totalBetaUsers: 0, newThisWeek: 0 },
                fallback: true
            });
        }
        
        const betaConfig = await db.getBetaConfig();
        
        // Get user statistics if available
        let statistics = { totalBetaUsers: 0, newThisWeek: 0 };
        try {
            if (typeof db.getAllUsers === 'function') {
                const users = await db.getAllUsers();
                statistics.totalBetaUsers = users.filter(u => u.account_type === 'beta').length;
                
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                statistics.newThisWeek = users.filter(u => 
                    u.account_type === 'beta' && 
                    new Date(u.created_at) >= oneWeekAgo
                ).length;
            }
        } catch (statsError) {
            console.log('⚠️ Could not get user statistics:', statsError.message);
        }
        
        res.json({
            betaConfig,
            statistics
        });
        
    } catch (error) {
        console.error('❌ Beta status error:', error);
        res.status(500).json({ error: 'Failed to get beta status' });
    }
});

// Admin beta users endpoint  
app.get('/api/admin/beta/users', requireAdminAuth, async (req, res) => {
    try {
        if (!db || typeof db.getAllUsers !== 'function') {
            return res.json({
                users: [],
                fallback: true
            });
        }
        
        const allUsers = await db.getAllUsers();
        const betaUsers = allUsers.filter(user => user.account_type === 'beta');
        
        // Add task count for each beta user
        const betaUsersWithStats = [];
        for (const user of betaUsers) {
            let taskCount = 0;
            try {
                if (pool) {
                    const taskResult = await pool.query('SELECT COUNT(*) as count FROM taken WHERE user_id = $1', [user.id]);
                    taskCount = parseInt(taskResult.rows[0]?.count || 0);
                }
            } catch (taskError) {
                console.warn('Could not get task count for user:', user.id);
            }
            
            betaUsersWithStats.push({
                ...user,
                task_count: taskCount
            });
        }
        
        res.json({
            users: betaUsersWithStats,
            total: betaUsersWithStats.length
        });
        
    } catch (error) {
        console.error('❌ Beta users error:', error);
        res.json({
            users: [],
            error: 'Failed to get beta users'
        });
    }
});

// Admin beta toggle endpoint
app.post('/api/admin/beta/toggle', requireAdminAuth, async (req, res) => {
    try {
        if (!db || typeof db.getBetaConfig !== 'function' || typeof db.updateBetaConfig !== 'function') {
            return res.status(501).json({ error: 'Beta config not available' });
        }
        
        const currentConfig = await db.getBetaConfig();
        const newStatus = !currentConfig.beta_period_active;
        
        await db.updateBetaConfig(newStatus);
        console.log(`🔄 Beta period toggled to: ${newStatus ? 'ACTIVE' : 'ENDED'}`);
        
        // Send beta ended emails to all beta users when beta is ended
        if (!newStatus && emailNotifications && emailNotifications.isAvailable()) {
            try {
                const betaUsers = await db.getAllUsers();
                const betaUsersFiltered = betaUsers?.filter(user => user.account_type === 'beta') || [];
                
                console.log(`📧 Sending beta ended emails to ${betaUsersFiltered.length} beta users`);
                
                for (const user of betaUsersFiltered) {
                    try {
                        await emailNotifications.sendBetaEndedEmail(user);
                        console.log(`📧 Beta ended email sent to: ${user.email}`);
                    } catch (userEmailError) {
                        console.warn(`⚠️ Failed to send beta ended email to ${user.email}:`, userEmailError.message);
                    }
                }
            } catch (emailError) {
                console.warn('⚠️ Failed to send beta ended emails:', emailError.message);
            }
        }
        
        res.json({
            success: true,
            message: `Beta period ${newStatus ? 'activated' : 'ended'}`,
            beta_period_active: newStatus
        });
        
    } catch (error) {
        console.error('❌ Error toggling beta period:', error);
        res.status(500).json({ error: 'Failed to toggle beta period' });
    }
});

// Admin all users with subscription info endpoint
app.get('/api/admin/all-users', requireAdminAuth, async (req, res) => {
    try {
        if (!db || typeof db.getAllUsers !== 'function') {
            return res.json({
                users: [],
                fallback: true
            });
        }
        
        const users = await db.getAllUsers();
        
        // Enrich with subscription data and task counts
        const enrichedUsers = [];
        for (const user of users) {
            let subscription = null;
            let taskCount = 0;
            
            try {
                if (typeof db.getUserSubscription === 'function') {
                    subscription = await db.getUserSubscription(user.id);
                }
            } catch (subError) {
                // Subscription system not available for this user
            }
            
            try {
                if (pool) {
                    const taskResult = await pool.query('SELECT COUNT(*) as count FROM taken WHERE user_id = $1', [user.id]);
                    taskCount = parseInt(taskResult.rows[0]?.count || 0);
                }
            } catch (taskError) {
                console.warn('Could not get task count for user:', user.id);
            }
            
            enrichedUsers.push({
                ...user,
                subscription: subscription,
                has_subscription: !!subscription,
                task_count: taskCount
            });
        }
        
        res.json({
            users: enrichedUsers,
            total: enrichedUsers.length,
            beta_users: enrichedUsers.filter(u => u.account_type === 'beta').length,
            regular_users: enrichedUsers.filter(u => u.account_type === 'regular').length,
            with_subscriptions: enrichedUsers.filter(u => u.has_subscription).length
        });
        
    } catch (error) {
        console.error('❌ All users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Admin user account type management endpoint
app.put('/api/admin/user/:id/account-type', requireAdminAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const { account_type } = req.body;
        
        if (!['beta', 'regular'].includes(account_type)) {
            return res.status(400).json({ error: 'Invalid account type' });
        }
        
        if (!db || !pool) {
            return res.status(501).json({ error: 'Database not available' });
        }
        
        // Update account type and set appropriate subscription status
        const subscription_status = account_type === 'regular' ? 'active' : 'beta_active';
        
        await pool.query(
            'UPDATE users SET account_type = $1, subscription_status = $2 WHERE id = $3',
            [account_type, subscription_status, userId]
        );
        
        console.log(`👤 User ${userId} account type changed to: ${account_type}`);
        
        // Send account upgrade email notification if upgraded to regular
        if (account_type === 'regular' && emailNotifications && emailNotifications.isAvailable()) {
            try {
                const user = await db.getUserById(userId);
                if (user) {
                    await emailNotifications.sendAccountUpgradeEmail(user, 'regular');
                    console.log('📧 Account upgrade email sent to:', user.email);
                }
            } catch (emailError) {
                console.warn('⚠️ Failed to send account upgrade email:', emailError.message);
            }
        }
        
        res.json({
            success: true,
            message: `Account type updated to ${account_type}`,
            account_type,
            subscription_status
        });
        
    } catch (error) {
        console.error('❌ Update account type error:', error);
        res.status(500).json({ error: 'Failed to update account type' });
    }
});

// Admin authentication endpoint
app.post('/api/admin/auth', async (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123tickedify';
        
        console.log('🔍 Admin auth attempt:', {
            receivedPassword: password,
            expectedPassword: adminPassword,
            envPasswordSet: !!process.env.ADMIN_PASSWORD,
            match: password === adminPassword
        });
        
        if (!process.env.ADMIN_PASSWORD) {
            console.warn('⚠️ Using fallback admin password - set ADMIN_PASSWORD environment variable');
        }
        
        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }
        
        if (password === adminPassword) {
            // Set admin session
            req.session.adminAuthenticated = true;
            req.session.adminLoginTime = new Date().toISOString();
            
            console.log('✅ Admin authentication successful');
            res.json({
                success: true,
                message: 'Admin authentication successful',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('❌ Admin authentication failed - incorrect password');
            res.status(401).json({ error: 'Invalid admin password' });
        }
        
    } catch (error) {
        console.error('❌ Admin auth error:', error);
        res.status(500).json({ error: 'Admin authentication failed' });
    }
});

// Admin check endpoint
app.get('/api/admin/check', (req, res) => {
    try {
        const isAuthenticated = !!(req.session && req.session.adminAuthenticated);
        
        res.json({
            authenticated: isAuthenticated,
            loginTime: req.session?.adminLoginTime || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Admin check error:', error);
        res.json({
            authenticated: false,
            error: 'Session check failed'
        });
    }
});

// Debug endpoint for admin auth
app.get('/api/debug/admin-config', (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123tickedify';
    res.json({
        envPasswordSet: !!process.env.ADMIN_PASSWORD,
        expectedPassword: adminPassword,
        fallbackUsed: !process.env.ADMIN_PASSWORD
    });
});

// Debug endpoint for database functions
app.get('/api/debug/db-functions', (req, res) => {
    res.json({
        dbExists: !!db,
        dbType: typeof db,
        getAllUsersExists: !!(db && db.getAllUsers),
        getAllUsersType: typeof (db && db.getAllUsers),
        availableMethods: db ? Object.getOwnPropertyNames(Object.getPrototypeOf(db)) : null
    });
});

// Admin logout endpoint
app.post('/api/admin/logout', (req, res) => {
    try {
        if (req.session) {
            req.session.adminAuthenticated = false;
            delete req.session.adminLoginTime;
        }
        
        console.log('🚪 Admin logout successful');
        res.json({
            success: true,
            message: 'Admin logout successful'
        });
    } catch (error) {
        console.error('❌ Admin logout error:', error);
        res.status(500).json({ error: 'Admin logout failed' });
    }
});

// Test email endpoint for admin
app.post('/api/admin/test-email', requireAdminAuth, async (req, res) => {
    try {
        const { email, type = 'welcome' } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email address required' });
        }
        
        if (!emailNotifications || !emailNotifications.isAvailable()) {
            return res.status(501).json({ 
                error: 'Email system not available',
                details: 'Mailgun credentials not configured'
            });
        }
        
        console.log(`🧪 Testing email type '${type}' to: ${email}`);
        
        // Create test user object
        const testUser = {
            email: email,
            naam: 'Test Gebruiker'
        };
        
        let result;
        
        switch (type) {
            case 'welcome':
                result = await emailNotifications.sendWelcomeEmail(testUser);
                break;
            case 'trial-started':
                const trialEndsAt = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000));
                result = await emailNotifications.sendTrialStartedEmail(testUser, trialEndsAt);
                break;
            case 'beta-ended':
                result = await emailNotifications.sendBetaEndedEmail(testUser);
                break;
            case 'trial-ending':
                result = await emailNotifications.sendTrialEndingEmail(testUser, 3);
                break;
            case 'account-upgrade':
                result = await emailNotifications.sendAccountUpgradeEmail(testUser, 'yearly');
                break;
            default:
                return res.status(400).json({ error: 'Invalid email type' });
        }
        
        if (result.success) {
            console.log(`✅ Test email sent successfully: ${result.messageId}`);
            res.json({
                success: true,
                message: `Test email '${type}' sent successfully`,
                messageId: result.messageId
            });
        } else {
            console.error(`❌ Test email failed: ${result.error}`);
            res.status(500).json({
                success: false,
                error: 'Failed to send test email',
                details: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({ error: 'Test email failed', details: error.message });
    }
});

// Admin fallback endpoints - these provide empty data for admin UI compatibility
app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
    try {
        if (!db || !pool) {
            return res.json({
                total: 0,
                active: 0,
                inactive: 0,
                recent: [],
                fallback: 'Database not available'
            });
        }

        // Get user statistics with recent users
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const recentResult = await pool.query(`
            SELECT id, naam, email, created_at, 
                   (SELECT COUNT(*) FROM taken WHERE user_id = users.id) as task_count
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const activeResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM taken 
            WHERE aangemaakt >= $1
        `, [oneWeekAgo]);

        res.json({
            total: parseInt(totalResult.rows[0]?.count || 0),
            active: parseInt(activeResult.rows[0]?.count || 0),
            inactive: 0, // TODO: Calculate inactive users
            recent: recentResult.rows.map(user => ({
                name: user.naam,
                email: user.email,
                created_at: user.created_at,
                task_count: parseInt(user.task_count || 0)
            })),
            fallback: false
        });
    } catch (error) {
        console.error('❌ Admin users error:', error);
        res.json({
            total: 0,
            active: 0,
            inactive: 0,
            recent: [],
            error: 'Users statistics failed'
        });
    }
});

app.get('/api/admin/tasks', requireAdminAuth, async (req, res) => {
    try {
        if (!db || !pool) {
            return res.json({
                total: 0,
                completed: 0,
                pending: 0,
                overdue: 0,
                recent: [],
                fallback: 'Database not available'
            });
        }

        // Get task statistics from database
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM taken');
        const completedResult = await pool.query("SELECT COUNT(*) as count FROM taken WHERE lijst = 'afgewerkt'");
        const pendingResult = await pool.query("SELECT COUNT(*) as count FROM taken WHERE lijst != 'afgewerkt'");
        
        // Get tasks by list for byList data that admin.js expects
        const byListResult = await pool.query(`
            SELECT lijst as list_name, COUNT(*) as count
            FROM taken 
            GROUP BY lijst 
            ORDER BY count DESC
        `);

        const total = parseInt(totalResult.rows[0]?.count || 0);

        res.json({
            total: total,
            completed: parseInt(completedResult.rows[0]?.count || 0),
            pending: parseInt(pendingResult.rows[0]?.count || 0),
            overdue: 0, // TODO: Calculate overdue based on deadlines
            recurring: 0, // TODO: Count recurring tasks
            byList: byListResult.rows.map(item => ({
                list_name: item.list_name,
                count: parseInt(item.count),
                percentage: total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0
            })),
            recent: [],
            fallback: false
        });
    } catch (error) {
        console.error('❌ Admin tasks error:', error);
        res.json({
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
            recent: [],
            error: 'Task statistics failed'
        });
    }
});

app.get('/api/admin/system', requireAdminAuth, async (req, res) => {
    try {
        const packageJson = require('./package.json');
        
        res.json({
            version: packageJson.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            node_version: process.version,
            timestamp: new Date().toISOString(),
            database_connected: !!db,
            email_configured: emailNotifications?.isAvailable() || false
        });
    } catch (error) {
        console.error('❌ Admin system error:', error);
        res.status(500).json({ error: 'System info failed' });
    }
});

app.get('/api/admin/insights', requireAdminAuth, (req, res) => {
    res.json({
        daily_active_users: 0,
        tasks_created_today: 0,
        completion_rate: 0,
        popular_features: [],
        user_engagement: {},
        fallback: 'Insights not implemented yet'
    });
});

app.get('/api/admin/monitoring', requireAdminAuth, (req, res) => {
    const uptimeSeconds = process.uptime();
    const uptimeFormatted = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;
    
    res.json({
        uptime: uptimeFormatted,
        uptimeSeconds: uptimeSeconds,
        status: 'Online',
        errors24h: 0, // TODO: Implement error counting
        health_checks: {
            database: !!db,
            email_service: emailNotifications?.isAvailable() || false,
            api_responses: 'ok'
        },
        last_errors: [],
        response_times: {},
        fallback: 'Basic monitoring only'
    });
});

app.get('/api/admin/projects', requireAdminAuth, async (req, res) => {
    try {
        if (!db || !pool) {
            return res.json({
                total: 0,
                projects: [],
                fallback: 'Database not available'
            });
        }

        // Get project statistics (distinct project names from tasks)
        const result = await pool.query(`
            SELECT project, COUNT(*) as task_count 
            FROM taken 
            WHERE project IS NOT NULL AND project != '' 
            GROUP BY project 
            ORDER BY task_count DESC
        `);

        res.json({
            total: result.rows.length,
            projects: result.rows,
            popular: result.rows.map(project => ({
                name: project.project,
                task_count: parseInt(project.task_count),
                user_count: 1, // TODO: Calculate unique users per project
                completion_rate: 0 // TODO: Calculate completion rate per project
            })),
            fallback: false
        });
    } catch (error) {
        console.error('❌ Admin projects error:', error);
        res.json({
            total: 0,
            projects: [],
            error: 'Projects statistics failed'
        });
    }
});

app.get('/api/admin/contexts', requireAdminAuth, async (req, res) => {
    try {
        if (!db || !pool) {
            return res.json({
                total: 0,
                contexts: [],
                fallback: 'Database not available'
            });
        }

        // Get context statistics (distinct context names from tasks)
        const result = await pool.query(`
            SELECT context, COUNT(*) as task_count 
            FROM taken 
            WHERE context IS NOT NULL AND context != '' 
            GROUP BY context 
            ORDER BY task_count DESC
        `);

        res.json({
            total: result.rows.length,
            contexts: result.rows,
            popular: result.rows.map(context => ({
                name: context.context,
                task_count: parseInt(context.task_count),
                user_count: 1, // TODO: Calculate unique users per context  
                avg_duration: 30 // TODO: Calculate average task duration per context
            })),
            fallback: false
        });
    } catch (error) {
        console.error('❌ Admin contexts error:', error);
        res.json({
            total: 0,
            contexts: [],
            error: 'Contexts statistics failed'
        });
    }
});

app.get('/api/admin/errors', requireAdminAuth, (req, res) => {
    res.json({
        recent_errors: [],
        error_count: 0,
        critical_errors: 0,
        fallback: 'Error logging not implemented yet'
    });
});

app.get('/api/admin/api-usage', requireAdminAuth, (req, res) => {
    res.json({
        requests_today: 0,
        popular_endpoints: [],
        average_response_time: 0,
        fallback: 'API usage tracking not implemented yet'
    });
});

app.get('/api/admin/email-stats', requireAdminAuth, (req, res) => {
    res.json({
        emails_sent: 0,
        success_rate: 100,
        bounce_rate: 0,
        email_types: {},
        fallback: emailNotifications?.isAvailable() ? 'Email stats tracking not implemented yet' : 'Email service not configured'
    });
});

app.get('/api/admin/feedback/stats', requireAdminAuth, (req, res) => {
    res.json({
        total_feedback: 0,
        new_feedback: 0,
        resolved_feedback: 0,
        bug_reports: 0,
        feature_requests: 0,
        fallback: 'Feedback system not implemented yet'
    });
});

app.get('/api/admin/feedback', requireAdminAuth, (req, res) => {
    res.json({
        feedback: [], // Admin.js expects 'feedback' property, not 'feedback_items'
        feedback_items: [],
        total: 0,
        fallback: 'Feedback system not implemented yet'
    });
});

// Add single task to inbox endpoint
app.post('/api/taak/add-to-inbox', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { tekst, id, aangemaakt, lijst } = req.body;
        
        console.log('📝 Adding task to inbox:', { tekst, id, userId });
        
        if (!tekst || !tekst.trim()) {
            return res.status(400).json({ error: 'Task text is required' });
        }
        
        if (!db || typeof db.getTakenByLijst !== 'function' || typeof db.saveTakenToLijst !== 'function') {
            return res.status(501).json({ error: 'Database functions not available' });
        }
        
        // Get current inbox tasks
        const currentInbox = await db.getTakenByLijst(userId, 'inbox') || [];
        console.log('📊 Current inbox has', currentInbox.length, 'tasks');
        
        // Create new task object
        const newTask = {
            id: id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tekst: tekst.trim(),
            aangemaakt: aangemaakt || new Date().toISOString(),
            lijst: 'inbox'
        };
        
        // Add new task to inbox
        const updatedInbox = [...currentInbox, newTask];
        console.log('📝 Adding task, new inbox size:', updatedInbox.length);
        
        // Save updated inbox
        await db.saveTakenToLijst(userId, 'inbox', updatedInbox);
        
        console.log('✅ Task added successfully to inbox');
        res.json({ 
            success: true, 
            message: 'Task added to inbox',
            task: newTask,
            inboxSize: updatedInbox.length
        });
    } catch (error) {
        console.error('❌ Add task to inbox error:', error);
        res.status(500).json({ error: 'Failed to add task to inbox' });
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