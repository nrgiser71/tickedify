const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

// Import PostgreSQL session store
const pgSession = require('connect-pg-simple')(session);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add URL-encoded parsing for Mailgun
app.use(express.static('public'));

// Multer for form-data parsing (Mailgun webhooks)
const upload = multer();

// Request logging (simplified)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Test endpoints first
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString(), version: '1.1' });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        env: {
            NODE_ENV: process.env.NODE_ENV || 'unknown',
            PORT: process.env.PORT || 'default',
            has_database_url: !!process.env.DATABASE_URL,
            has_postgres_url: !!process.env.POSTGRES_URL,
            has_postgres_prisma_url: !!process.env.POSTGRES_PRISMA_URL,
            has_postgres_url_non_pooling: !!process.env.POSTGRES_URL_NON_POOLING
        }
    });
});

// Try to import and initialize database
let db = null;
let pool = null;
let dbInitialized = false;

// Initialize database immediately
try {
    const dbModule = require('./database');
    db = dbModule.db;
    pool = dbModule.pool;
    console.log('Database module imported successfully');
    
    // Configure session store immediately with pool
    app.use(session({
        store: new pgSession({
            pool: pool,
            tableName: 'user_sessions',
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET || 'tickedify-development-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: 'auto', // Let express-session auto-detect HTTPS
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'lax' // Better compatibility with modern browsers
        },
        name: 'tickedify.sid' // Custom session name for better identification
    }));
    
    console.log('✅ Session store configured with PostgreSQL');
    
    // Run database initialization
    dbModule.initDatabase().then(() => {
        dbInitialized = true;
        console.log('✅ Database initialization completed');
    }).catch(error => {
        console.error('❌ Database initialization failed:', error);
    });
} catch (error) {
    console.error('Failed to import database module:', error);
    
    // Fallback to memory store if database module fails to load
    app.use(session({
        secret: process.env.SESSION_SECRET || 'tickedify-development-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: 'auto',
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        },
        name: 'tickedify.sid'
    }));
    
    console.log('⚠️ Using fallback memory session store');
}

app.get('/api/db-test', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                status: 'database_module_not_loaded',
                timestamp: new Date().toISOString()
            });
        }
        
        // Test database connection
        const client = await pool.connect();
        client.release();
        
        res.json({ 
            status: 'database_connected',
            initialized: dbInitialized,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database test failed:', error);
        res.status(500).json({ 
            status: 'database_error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Create default user if not exists
app.post('/api/admin/create-default-user', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const defaultUserId = 'default-user-001';
        const defaultEmail = 'jan@tickedify.com';
        const defaultNaam = 'Jan Buskens';
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [defaultUserId]);
        
        if (existingUser.rows.length > 0) {
            return res.json({ 
                success: true, 
                message: 'Default user already exists',
                userId: defaultUserId
            });
        }
        
        // Create default user
        await pool.query(`
            INSERT INTO users (id, email, naam, wachtwoord_hash, rol, aangemaakt, actief)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
        `, [defaultUserId, defaultEmail, defaultNaam, 'temp-hash', 'admin', true]);
        
        console.log('✅ Default user created successfully');
        
        res.json({ 
            success: true, 
            message: 'Default user created successfully',
            userId: defaultUserId,
            email: defaultEmail,
            naam: defaultNaam
        });
        
    } catch (error) {
        console.error('Error creating default user:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/init-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        console.log('🔧 Manual database initialization requested...');
        const { initDatabase } = require('./database');
        await initDatabase();
        dbInitialized = true;
        
        console.log('✅ Manual database initialization completed');
        res.json({ 
            success: true, 
            message: 'Database initialized successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Manual database initialization failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database reset endpoint - DANGER: Deletes ALL data
app.post('/api/admin/reset-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        console.log('🚨 DATABASE RESET REQUESTED - This will delete ALL data!');
        
        // Get counts before deletion for confirmation
        const countQueries = [
            { table: 'dagelijkse_planning', query: 'SELECT COUNT(*) as count FROM dagelijkse_planning' },
            { table: 'taken', query: 'SELECT COUNT(*) as count FROM taken' },
            { table: 'projecten', query: 'SELECT COUNT(*) as count FROM projecten' },
            { table: 'contexten', query: 'SELECT COUNT(*) as count FROM contexten' }
        ];
        
        const beforeCounts = {};
        for (const countQuery of countQueries) {
            try {
                const result = await pool.query(countQuery.query);
                beforeCounts[countQuery.table] = parseInt(result.rows[0].count);
            } catch (error) {
                console.log(`Could not count ${countQuery.table}:`, error.message);
                beforeCounts[countQuery.table] = 0;
            }
        }
        
        console.log('📊 Records before deletion:', beforeCounts);
        
        // Delete in correct order (foreign key constraints)
        const deleteQueries = [
            'DELETE FROM dagelijkse_planning',
            'DELETE FROM taken', 
            'DELETE FROM projecten',
            'DELETE FROM contexten'
        ];
        
        const deletionResults = {};
        
        for (const deleteQuery of deleteQueries) {
            try {
                const result = await pool.query(deleteQuery);
                const tableName = deleteQuery.split(' ')[2]; // Extract table name
                deletionResults[tableName] = result.rowCount;
                console.log(`✅ Deleted ${result.rowCount} records from ${tableName}`);
            } catch (error) {
                console.error(`❌ Error deleting from table:`, error);
                throw error;
            }
        }
        
        console.log('🧹 Database reset completed successfully');
        console.log('📊 Deleted records:', deletionResults);
        
        res.json({
            success: true,
            message: 'Database reset completed - ALL data has been deleted',
            timestamp: new Date().toISOString(),
            before_counts: beforeCounts,
            deleted_records: deletionResults,
            warning: 'This action cannot be undone'
        });
        
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database reset failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Email Import System - Mailgun Webhook Handler
app.post('/api/email/import', upload.any(), async (req, res) => {
    try {
        console.log('📧 Email import request received');
        console.log('Headers:', req.headers);
        console.log('Body keys:', Object.keys(req.body));
        console.log('Files:', req.files?.length || 0);
        console.log('Full body:', req.body);
        
        // Try multiple field name variations for Mailgun compatibility
        const sender = req.body.sender || req.body.from || req.body.From || '';
        const subject = req.body.subject || req.body.Subject || '';
        const bodyPlain = req.body['body-plain'] || req.body.text || req.body.body || '';
        const bodyHtml = req.body['body-html'] || req.body.html || '';
        const strippedText = req.body['stripped-text'] || req.body['stripped-plain'] || bodyPlain;
        
        console.log('Extracted fields:', { sender, subject, bodyPlain: bodyPlain?.substring(0, 100) });
        
        if (!sender && !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required email fields (sender, subject)',
                receivedFields: Object.keys(req.body),
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`📨 Processing email from: ${sender}`);
        console.log(`📋 Subject: ${subject}`);
        
        // Parse email content
        console.log('🔄 About to parse email...');
        const taskData = parseEmailToTask({
            sender,
            subject,
            body: strippedText || bodyPlain || 'No body content',
            timestamp: new Date().toISOString()
        });
        console.log('✅ Email parsed successfully:', taskData);
        
        // Resolve project and context IDs  
        const userId = 'default-user-001'; // TODO: Get from authentication when implemented
        console.log('🔄 Resolving project and context IDs for user:', userId);
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }
        
        console.log('✅ Project/Context resolution completed:', {
            project: taskData.projectName ? `${taskData.projectName} → ${taskData.projectId}` : 'none',
            context: taskData.contextName ? `${taskData.contextName} → ${taskData.contextId}` : 'none'
        });
        
        // Create task in database
        if (!pool) {
            throw new Error('Database not available');
        }
        console.log('🔄 About to create task in database...');
        
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Convert verschijndatum to proper format for PostgreSQL DATE field
        let verschijndatumForDb = null;
        if (taskData.verschijndatum) {
            // Ensure it's in YYYY-MM-DD format for PostgreSQL DATE type
            const dateMatch = taskData.verschijndatum.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                verschijndatumForDb = dateMatch[1];
                console.log('📅 Converted deadline for database:', verschijndatumForDb);
            }
        }

        const result = await pool.query(`
            INSERT INTO taken (
                id, tekst, opmerkingen, lijst, aangemaakt, project_id, context_id, 
                verschijndatum, duur, type, user_id
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            taskId,
            taskData.tekst,
            taskData.opmerkingen || null,
            taskData.lijst || 'inbox',
            taskData.projectId,
            taskData.contextId,
            verschijndatumForDb,
            taskData.duur,
            'taak',
            userId
        ]);
        
        const createdTask = result.rows[0];
        
        console.log('✅ Task created successfully:', {
            id: createdTask.id,
            tekst: createdTask.tekst,
            lijst: createdTask.lijst
        });
        
        // Send confirmation (would need Mailgun sending setup)
        console.log('📤 Would send confirmation email to:', sender);
        
        res.json({
            success: true,
            message: 'Email imported successfully',
            task: {
                id: createdTask.id,
                tekst: createdTask.tekst,
                lijst: createdTask.lijst,
                project: taskData.projectName,
                context: taskData.contextName
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Email import failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Email import failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to find or create project
async function findOrCreateProject(projectName, userId = 'default-user-001') {
    if (!projectName || !pool) return null;
    
    try {
        // First try to find existing project (case-insensitive) for this user
        const existingProject = await pool.query(
            'SELECT id FROM projecten WHERE LOWER(naam) = LOWER($1) AND user_id = $2',
            [projectName, userId]
        );
        
        if (existingProject.rows.length > 0) {
            console.log('📁 Found existing project:', projectName, '→', existingProject.rows[0].id);
            return existingProject.rows[0].id;
        }
        
        // Create new project if not found
        const projectId = 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
            'INSERT INTO projecten (id, naam, user_id) VALUES ($1, $2, $3)',
            [projectId, projectName, userId]
        );
        
        console.log('📁 Created new project:', projectName, '→', projectId);
        return projectId;
        
    } catch (error) {
        console.error('❌ Error finding/creating project:', error);
        return null;
    }
}

// Helper function to find or create context
async function findOrCreateContext(contextName, userId = 'default-user-001') {
    if (!contextName || !pool) return null;
    
    try {
        // First try to find existing context (case-insensitive) for this user
        const existingContext = await pool.query(
            'SELECT id FROM contexten WHERE LOWER(naam) = LOWER($1) AND user_id = $2',
            [contextName, userId]
        );
        
        if (existingContext.rows.length > 0) {
            console.log('🏷️ Found existing context:', contextName, '→', existingContext.rows[0].id);
            return existingContext.rows[0].id;
        }
        
        // Create new context if not found
        const contextId = 'context_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(
            'INSERT INTO contexten (id, naam, user_id) VALUES ($1, $2, $3)',
            [contextId, contextName, userId]
        );
        
        console.log('🏷️ Created new context:', contextName, '→', contextId);
        return contextId;
        
    } catch (error) {
        console.error('❌ Error finding/creating context:', error);
        return null;
    }
}

// Email parsing helper function
function parseEmailToTask(emailData) {
    const { sender, subject, body, timestamp } = emailData;
    
    console.log('🔍 Parsing email content...');
    
    // Initialize task data
    const taskData = {
        tekst: subject, // Will be cleaned up later to just task name
        opmerkingen: '', // Will contain the email body content
        lijst: 'inbox',
        projectId: null,
        projectName: null,
        contextId: null,
        contextName: null,
        verschijndatum: null,
        duur: null,
        originalSender: sender,
        importedAt: timestamp
    };
    
    // Parse subject line for project, context, and tags
    // Format: [Project] Task title @context #tag
    
    // Extract project from [brackets]
    const projectMatch = subject.match(/\[([^\]]+)\]/);
    if (projectMatch) {
        taskData.projectName = projectMatch[1].trim();
        console.log('📁 Found project:', taskData.projectName);
    }
    
    // Extract context from @mentions
    const contextMatch = subject.match(/@([^\s#\]]+)/);
    if (contextMatch) {
        taskData.contextName = contextMatch[1].trim();
        console.log('🏷️ Found context:', taskData.contextName);
    }
    
    // Extract tags from #hashtags (for future use)
    const tagMatches = subject.match(/#([^\s@\]]+)/g);
    if (tagMatches) {
        const tags = tagMatches.map(tag => tag.substring(1));
        console.log('🏷️ Found tags:', tags);
    }
    
    // Clean up task title (remove project, context, tags)
    let cleanTitle = subject
        .replace(/\[[^\]]+\]/g, '') // Remove [project]
        .replace(/@[^\s#\]]+/g, '') // Remove @context
        .replace(/#[^\s@\]]+/g, '') // Remove #tags
        .trim();
    
    if (cleanTitle) {
        taskData.tekst = cleanTitle;
    }
    
    // Parse body for structured data
    if (body && body.length > 10) {
        console.log('📄 Parsing email body...');
        
        // Look for structured fields in body
        const bodyLines = body.split('\n');
        
        for (const line of bodyLines) {
            const trimmedLine = line.trim().toLowerCase();
            
            // Extract duration
            if (trimmedLine.startsWith('duur:')) {
                const duurMatch = line.match(/(\d+)/);
                if (duurMatch) {
                    taskData.duur = parseInt(duurMatch[1]);
                    console.log('⏱️ Found duration:', taskData.duur, 'minutes');
                }
            }
            
            // Extract deadline
            if (trimmedLine.startsWith('deadline:') || trimmedLine.startsWith('datum:')) {
                const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    taskData.verschijndatum = dateMatch[1];
                    console.log('📅 Found deadline:', taskData.verschijndatum);
                }
            }
            
            // Override project if specified in body
            if (trimmedLine.startsWith('project:')) {
                const projectName = line.split(':')[1]?.trim();
                if (projectName) {
                    taskData.projectName = projectName;
                    console.log('📁 Found project in body:', taskData.projectName);
                }
            }
            
            // Override context if specified in body
            if (trimmedLine.startsWith('context:')) {
                const contextName = line.split(':')[1]?.trim();
                if (contextName) {
                    taskData.contextName = contextName;
                    console.log('🏷️ Found context in body:', taskData.contextName);
                }
            }
        }
        
        // Extract body content as opmerkingen, excluding structured fields
        const bodyWithoutStructured = body
            .split('\n')
            .filter(line => {
                const lower = line.trim().toLowerCase();
                return !lower.startsWith('duur:') && 
                       !lower.startsWith('deadline:') && 
                       !lower.startsWith('datum:') &&
                       !lower.startsWith('project:') &&
                       !lower.startsWith('context:') &&
                       line.trim() !== '' &&
                       !line.trim().startsWith('---');
            })
            .join('\n')
            .trim();
            
        if (bodyWithoutStructured) {
            taskData.opmerkingen = bodyWithoutStructured;
            console.log('📝 Found opmerkingen:', taskData.opmerkingen.substring(0, 50) + '...');
        }
    }
    
    console.log('✅ Parsed task data:', {
        tekst: taskData.tekst.substring(0, 50) + '...',
        project: taskData.projectName,
        context: taskData.contextName,
        duur: taskData.duur,
        deadline: taskData.verschijndatum
    });
    
    return taskData;
}

// Test endpoint for email parsing (development only)
app.post('/api/email/test', async (req, res) => {
    try {
        const { subject, body, sender } = req.body;
        
        if (!subject) {
            return res.status(400).json({ error: 'Subject is required' });
        }
        
        const taskData = parseEmailToTask({
            sender: sender || 'test@example.com',
            subject,
            body: body || '',
            timestamp: new Date().toISOString()
        });
        
        // Also resolve project and context IDs for complete test
        const userId = 'default-user-001'; // Use same hardcoded userId for consistency
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }
        
        res.json({
            success: true,
            parsed_task: taskData,
            message: 'Email parsing test completed (with project/context resolution)'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Real import endpoint that actually saves tasks
app.post('/api/email/import-real', async (req, res) => {
    try {
        const { subject, body, sender } = req.body;
        const userId = getCurrentUserId(req);
        
        if (!subject) {
            return res.status(400).json({ error: 'Subject is required' });
        }
        
        // Parse email to task data
        const taskData = parseEmailToTask({
            sender: sender || 'import@tickedify.com',
            subject,
            body: body || '',
            timestamp: new Date().toISOString()
        });
        
        // Resolve project and context IDs
        if (taskData.projectName) {
            taskData.projectId = await findOrCreateProject(taskData.projectName, userId);
        }
        if (taskData.contextName) {
            taskData.contextId = await findOrCreateContext(taskData.contextName, userId);
        }
        
        // Create the actual task
        const task = {
            id: generateId(),
            tekst: taskData.tekst,
            lijst: 'inbox',
            aangemaakt: new Date().toISOString(),
            projectId: taskData.projectId || null,
            contextId: taskData.contextId || null,
            verschijndatum: taskData.verschijndatum || null,
            duur: taskData.duur || null,
            opmerkingen: taskData.opmerkingen || null,
            user_id: userId
        };
        
        // Save to database - get current inbox and add task
        const currentInbox = await db.getList('inbox', userId) || [];
        currentInbox.push(task);
        
        const success = await db.saveList('inbox', currentInbox, userId);
        
        if (success) {
            res.json({
                success: true,
                task: task,
                message: 'Task successfully imported to inbox'
            });
        } else {
            res.status(500).json({ error: 'Failed to save task to database' });
        }
        
    } catch (error) {
        console.error('Real import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// Optional auth middleware (allows both authenticated and guest access)
function optionalAuth(req, res, next) {
    // For endpoints that can work with or without authentication
    next();
}

// Get current user ID from session or fallback to default
function getCurrentUserId(req) {
    // Return user from session if authenticated, otherwise default user
    return req.session.userId || 'default-user-001';
}

// Authentication API endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, naam, wachtwoord } = req.body;
        
        if (!email || !naam || !wachtwoord) {
            return res.status(400).json({ error: 'Email, naam en wachtwoord zijn verplicht' });
        }
        
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email adres al in gebruik' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(wachtwoord, saltRounds);
        
        // Create user
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await pool.query(`
            INSERT INTO users (id, email, naam, wachtwoord_hash, rol, aangemaakt, actief)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
        `, [userId, email, naam, hashedPassword, 'user', true]);
        
        // Start session
        req.session.userId = userId;
        req.session.userEmail = email;
        req.session.userNaam = naam;
        
        console.log(`✅ New user registered: ${email} (${userId})`);
        
        res.json({
            success: true,
            message: 'Account succesvol aangemaakt',
            user: {
                id: userId,
                email,
                naam,
                rol: 'user'
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Fout bij aanmaken account' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, wachtwoord } = req.body;
        
        if (!email || !wachtwoord) {
            return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht' });
        }
        
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Find user
        const userResult = await pool.query(
            'SELECT id, email, naam, wachtwoord_hash, rol, actief FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
        }
        
        const user = userResult.rows[0];
        
        if (!user.actief) {
            return res.status(401).json({ error: 'Account is gedeactiveerd' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(wachtwoord, user.wachtwoord_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Ongeldige email of wachtwoord' });
        }
        
        // Update last login
        await pool.query(
            'UPDATE users SET laatste_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Start session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userNaam = user.naam;
        
        console.log(`✅ User logged in: ${email} (${user.id})`);
        
        res.json({
            success: true,
            message: 'Succesvol ingelogd',
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Fout bij inloggen' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const userEmail = req.session.userEmail;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Fout bij uitloggen' });
        }
        
        console.log(`✅ User logged out: ${userEmail}`);
        res.json({ success: true, message: 'Succesvol uitgelogd' });
    });
});

app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
        authenticated: true,
        user: {
            id: req.session.userId,
            email: req.session.userEmail,
            naam: req.session.userNaam
        }
    });
});

// Admin endpoints (for user management)
app.get('/api/admin/users', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all users with basic info (without password hashes)
        const result = await pool.query(`
            SELECT 
                id, 
                email, 
                naam, 
                rol, 
                aangemaakt, 
                laatste_login, 
                actief,
                (SELECT COUNT(*) FROM taken WHERE user_id = users.id AND afgewerkt IS NULL) as active_tasks,
                (SELECT COUNT(*) FROM taken WHERE user_id = users.id AND afgewerkt IS NOT NULL) as completed_tasks
            FROM users 
            ORDER BY aangemaakt DESC
        `);
        
        res.json({
            users: result.rows,
            total: result.rows.length
        });
        
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Fout bij ophalen gebruikers' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE actief = true) as active_users,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NULL) as active_tasks,
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NOT NULL) as completed_tasks,
                (SELECT COUNT(*) FROM projecten) as total_projects,
                (SELECT COUNT(*) FROM contexten) as total_contexts
        `);
        
        // Also check session table
        let sessionCount = 0;
        try {
            const sessionStats = await pool.query('SELECT COUNT(*) as count FROM user_sessions');
            sessionCount = parseInt(sessionStats.rows[0].count) || 0;
        } catch (sessionError) {
            console.log('Session table not available yet:', sessionError.message);
        }
        
        const result = stats.rows[0] || {};
        result.active_sessions = sessionCount;
        
        res.json(result);
        
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

// Debug endpoint to check user data
app.get('/api/debug/user-data/:userId', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { userId } = req.params;
        
        // Get all tasks for this user
        const tasks = await pool.query(`
            SELECT lijst, COUNT(*) as count, array_agg(tekst) as sample_tasks
            FROM taken 
            WHERE user_id = $1 AND afgewerkt IS NULL
            GROUP BY lijst
            ORDER BY lijst
        `, [userId]);
        
        // Get projects and contexts
        const projects = await pool.query('SELECT * FROM projecten WHERE user_id = $1', [userId]);
        const contexts = await pool.query('SELECT * FROM contexten WHERE user_id = $1', [userId]);
        
        res.json({
            userId,
            tasks: tasks.rows,
            projects: projects.rows,
            contexts: contexts.rows,
            totalTasks: tasks.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
        });
        
    } catch (error) {
        console.error('Debug user data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to search ALL data in database
app.get('/api/debug/database-search/:searchTerm', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { searchTerm } = req.params;
        
        // Search all tasks
        const allTasks = await pool.query(`
            SELECT id, tekst, lijst, user_id, aangemaakt, project_id, context_id, afgewerkt 
            FROM taken 
            WHERE tekst ILIKE $1 OR id ILIKE $1 OR lijst ILIKE $1
            ORDER BY aangemaakt DESC
        `, [`%${searchTerm}%`]);
        
        // Search all projects  
        const allProjects = await pool.query(`
            SELECT id, naam, user_id, aangemaakt
            FROM projecten 
            WHERE naam ILIKE $1 OR id ILIKE $1
            ORDER BY aangemaakt DESC
        `, [`%${searchTerm}%`]);
        
        // Search all contexts
        const allContexts = await pool.query(`
            SELECT id, naam, user_id, aangemaakt  
            FROM contexten
            WHERE naam ILIKE $1 OR id ILIKE $1
            ORDER BY aangemaakt DESC
        `, [`%${searchTerm}%`]);
        
        res.json({
            searchTerm,
            tasks: allTasks.rows,
            projects: allProjects.rows,
            contexts: allContexts.rows,
            total: allTasks.rows.length + allProjects.rows.length + allContexts.rows.length
        });
        
    } catch (error) {
        console.error('Database search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to show ALL data by user
app.get('/api/debug/all-users-data', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all data grouped by user
        const tasks = await pool.query(`
            SELECT user_id, lijst, COUNT(*) as count, array_agg(tekst) as sample_tasks
            FROM taken 
            WHERE afgewerkt IS NULL
            GROUP BY user_id, lijst
            ORDER BY user_id, lijst
        `);
        
        const projects = await pool.query(`
            SELECT user_id, COUNT(*) as count, array_agg(naam) as project_names
            FROM projecten
            GROUP BY user_id
            ORDER BY user_id
        `);
        
        const contexts = await pool.query(`
            SELECT user_id, COUNT(*) as count, array_agg(naam) as context_names  
            FROM contexten
            GROUP BY user_id
            ORDER BY user_id
        `);
        
        res.json({
            tasks: tasks.rows,
            projects: projects.rows,
            contexts: contexts.rows
        });
        
    } catch (error) {
        console.error('All users data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Database cleanup endpoint - removes all task data but keeps users
app.post('/api/debug/clean-database', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Count current data before cleanup
        const tasksCount = await pool.query('SELECT COUNT(*) as count FROM taken');
        const projectsCount = await pool.query('SELECT COUNT(*) as count FROM projecten');
        const contextsCount = await pool.query('SELECT COUNT(*) as count FROM contexten');
        const planningCount = await pool.query('SELECT COUNT(*) as count FROM dagelijkse_planning');
        
        // Clean all task-related data (but keep users and sessions)
        await pool.query('DELETE FROM dagelijkse_planning');
        await pool.query('DELETE FROM taken');
        await pool.query('DELETE FROM projecten');
        await pool.query('DELETE FROM contexten');
        
        console.log('✅ Database cleaned - all task data removed');
        
        res.json({
            message: 'Database successfully cleaned',
            removed: {
                tasks: parseInt(tasksCount.rows[0].count),
                projects: parseInt(projectsCount.rows[0].count),
                contexts: parseInt(contextsCount.rows[0].count),
                planning: parseInt(planningCount.rows[0].count)
            },
            timestamp: new Date().toISOString(),
            note: 'Users and sessions preserved'
        });
        
    } catch (error) {
        console.error('Database cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Basic API endpoints
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
        console.error('Error in /api/lijsten:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tellingen', async (req, res) => {
    try {
        if (!db) {
            return res.json({}); // Return empty if database not available
        }
        
        const userId = getCurrentUserId(req);
        const tellingen = await db.getCounts(userId);
        res.json(tellingen);
    } catch (error) {
        console.error('Error getting counts:', error);
        res.json({});
    }
});

// Global search endpoint
app.get('/api/search', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        const { 
            query, 
            status = 'all', 
            project = '', 
            context = '', 
            dateFrom = '', 
            dateTo = '', 
            includeRecurring = 'true' 
        } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        
        const startTime = Date.now();
        console.log(`🔍 Global search: "${query}" for user ${userId}`);
        
        // Build SQL query with filters
        let sqlQuery = `
            SELECT * FROM taken 
            WHERE user_id = $1 
            AND (tekst ILIKE $2 OR opmerkingen ILIKE $2)
        `;
        
        const queryParams = [userId, `%${query.trim()}%`];
        let paramIndex = 3;
        
        // Status filter
        if (status === 'active') {
            sqlQuery += ` AND afgewerkt IS NULL`;
        } else if (status === 'completed') {
            sqlQuery += ` AND afgewerkt IS NOT NULL`;
        }
        
        // Project filter
        if (project) {
            sqlQuery += ` AND project_id = $${paramIndex}`;
            queryParams.push(project);
            paramIndex++;
        }
        
        // Context filter  
        if (context) {
            sqlQuery += ` AND context_id = $${paramIndex}`;
            queryParams.push(context);
            paramIndex++;
        }
        
        // Date range filter
        if (dateFrom) {
            sqlQuery += ` AND verschijndatum >= $${paramIndex}`;
            queryParams.push(dateFrom);
            paramIndex++;
        }
        
        if (dateTo) {
            sqlQuery += ` AND verschijndatum <= $${paramIndex}`;
            queryParams.push(dateTo);
            paramIndex++;
        }
        
        // Recurring tasks filter
        if (includeRecurring === 'false') {
            sqlQuery += ` AND (herhaling_actief IS NULL OR herhaling_actief = FALSE)`;
        }
        
        sqlQuery += ` ORDER BY 
            CASE WHEN afgewerkt IS NULL THEN 0 ELSE 1 END,
            aangemaakt DESC
        `;
        
        const result = await pool.query(sqlQuery, queryParams);
        const tasks = result.rows;
        
        // Calculate distribution by list
        const distribution = {};
        tasks.forEach(task => {
            const listKey = task.afgewerkt ? 'afgewerkte-taken' : task.lijst;
            distribution[listKey] = (distribution[listKey] || 0) + 1;
        });
        
        // Map database columns to frontend format
        const mappedTasks = tasks.map(row => {
            const task = { ...row };
            if (task.project_id !== undefined) {
                task.projectId = task.project_id;
                delete task.project_id;
            }
            if (task.context_id !== undefined) {
                task.contextId = task.context_id;
                delete task.context_id;
            }
            if (task.herhaling_type !== undefined) {
                task.herhalingType = task.herhaling_type;
                delete task.herhaling_type;
            }
            if (task.herhaling_waarde !== undefined) {
                task.herhalingWaarde = task.herhaling_waarde;
                delete task.herhaling_waarde;
            }
            if (task.herhaling_actief !== undefined) {
                task.herhalingActief = task.herhaling_actief;
                delete task.herhaling_actief;
            }
            return task;
        });
        
        const executionTime = Date.now() - startTime;
        console.log(`🔍 Search completed: ${tasks.length} results in ${executionTime}ms`);
        
        res.json({
            tasks: mappedTasks,
            totalCount: tasks.length,
            executionTime,
            distribution,
            query: query.trim(),
            filters: {
                status,
                project,
                context,
                dateFrom,
                dateTo,
                includeRecurring: includeRecurring === 'true'
            }
        });
        
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const userId = getCurrentUserId(req);
        const data = await db.getList(naam, userId);
        res.json(data);
    } catch (error) {
        console.error(`Error getting list ${req.params.naam}:`, error);
        res.status(404).json({ error: 'Lijst niet gevonden' });
    }
});

// Debug endpoint to find user ID by email
app.get('/api/debug/user-by-email/:email', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { email } = req.params;
        
        // Find user by email
        const result = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = result.rows[0];
        
        // Get some task counts for verification
        const taskCounts = await pool.query(`
            SELECT lijst, COUNT(*) as count
            FROM taken 
            WHERE user_id = $1 AND afgewerkt IS NULL
            GROUP BY lijst
            ORDER BY lijst
        `, [user.id]);
        
        res.json({
            user: user,
            taskCounts: taskCounts.rows
        });
        
    } catch (error) {
        console.error('User lookup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// External API endpoint for adding tasks (for Keyboard Maestro, etc.)
app.post('/api/external/add-task', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // API key authentication with user mapping
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        
        // Map API keys to user IDs (multi-user support)
        const apiKeyToUser = {
            'tickedify-jan-2025': 'info@baasoverjetijd.be',  // Jan's personal API key for info@baasoverjetijd.be
            'tickedify-jan-alt-2025': 'jan@buskens.be',      // Jan's alternative account
            'tickedify-external-2025': 'default-user-001'    // Legacy fallback
        };
        
        const userId = apiKeyToUser[apiKey];
        if (!userId) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        const { tekst, project = '', context = '', lijst = 'inbox' } = req.body;
        
        if (!tekst) {
            return res.status(400).json({ error: 'Task text (tekst) is required' });
        }
        
        // Create task object with unique ID
        const today = new Date().toISOString().split('T')[0];
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            id: taskId,
            tekst: tekst,  // Database field is 'tekst', not 'beschrijving'
            project: project,
            context: context,
            verschijndatum: today,
            duur: 0,
            deadline: null,
            opmerkingen: '',
            herhalingType: null,
            herhalingWaarde: null,
            herhalingActief: false
        };
        
        // Get current list
        const currentList = await db.getList(lijst, userId);
        
        // Add new task to the list
        const updatedList = [...currentList, task];
        
        // Save updated list
        await db.saveList(lijst, updatedList, userId);
        
        res.json({ 
            success: true, 
            message: `Task added to ${lijst}`,
            task: task 
        });
        
    } catch (error) {
        console.error('External API error:', error);
        res.status(500).json({ 
            error: 'Failed to add task',
            details: error.message,
            stack: error.stack
        });
    }
});

app.post('/api/lijst/:naam', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const userId = getCurrentUserId(req);
        
        // Temporary: Log the exact data being sent by UI to identify the issue
        if (naam === 'acties' && req.body.some(item => item.herhalingType)) {
            console.log('🚨 UI DEBUG: Data causing 500 error:', JSON.stringify(req.body, null, 2));
        }
        
        const success = await db.saveList(naam, req.body, userId);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Fout bij opslaan' });
        }
    } catch (error) {
        console.error(`Error saving list ${req.params.naam}:`, error);
        res.status(500).json({ error: 'Fout bij opslaan' });
    }
});

app.put('/api/taak/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        console.log(`🔄 Server: Updating task ${id} for user ${userId}:`, JSON.stringify(req.body, null, 2));
        
        const success = await db.updateTask(id, req.body, userId);
        
        if (success) {
            console.log(`Task ${id} updated successfully`);
            res.json({ success: true });
        } else {
            console.log(`Task ${id} not found or update failed`);
            res.status(404).json({ error: 'Taak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error updating task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij updaten', details: error.message });
    }
});

// Debug endpoint to search for any task by ID
app.get('/api/debug/find-task/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM taken WHERE id = $1', [id]);
        
        if (result.rows.length > 0) {
            res.json({ found: true, task: result.rows[0] });
        } else {
            res.json({ found: false, id: id });
        }
    } catch (error) {
        console.error('Error searching for task:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test Dashboard Endpoints
const testModule = require('./test-runner');

// Version endpoint voor deployment tracking
app.get('/api/version', (req, res) => {
    const packageJson = require('./package.json');
    res.json({
        version: packageJson.version,
        commit_hash: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
        deployed_at: new Date().toISOString(),
        features: ['toast-notifications', 'recurring-tasks', 'test-dashboard', 'smart-date-filtering'],
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve test dashboard (multiple routes for accessibility)
app.get('/admin/tests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/test-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/tests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

// Run full regression test suite
app.get('/api/test/run-regression', async (req, res) => {
    try {
        console.log('🚀 Starting full regression test suite...');
        const results = await testModule.runFullRegressionTests();
        
        console.log('✅ Regression tests completed:', {
            total: results.total_tests,
            passed: results.passed,
            failed: results.failed,
            duration: results.duration_ms
        });
        
        res.json(results);
    } catch (error) {
        console.error('❌ Fatal error in regression tests:', error);
        res.status(500).json({
            error: 'Fatal error in regression tests',
            details: error.message,
            total_tests: 0,
            passed: 0,
            failed: 1,
            duration_ms: 0,
            cleanup_successful: false
        });
    }
});

// Run specific test categories
app.get('/api/test/run-database', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runDatabaseIntegrityTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Database tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-api', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runApiEndpointTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ API tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-recurring', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runRecurringTaskTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Recurring tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/run-business', async (req, res) => {
    try {
        const testRunner = new testModule.TestRunner();
        await testModule.runBusinessLogicTests(testRunner);
        const cleanupSuccess = await testRunner.cleanup();
        
        const summary = testRunner.getSummary();
        summary.cleanup_successful = cleanupSuccess;
        summary.test_data_removed = summary.test_data_created;
        
        res.json(summary);
    } catch (error) {
        console.error('❌ Business logic tests failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Dagelijkse Planning API endpoints
app.get('/api/dagelijkse-planning/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params;
        const userId = getCurrentUserId(req);
        const planning = await db.getDagelijksePlanning(datum, userId);
        res.json(planning);
    } catch (error) {
        console.error('Error getting dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij ophalen dagelijkse planning' });
    }
});

app.post('/api/dagelijkse-planning', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        const planningId = await db.addToDagelijksePlanning(req.body, userId);
        res.json({ success: true, id: planningId });
    } catch (error) {
        console.error('Error adding to dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij toevoegen aan dagelijkse planning' });
    }
});

app.put('/api/dagelijkse-planning/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        const success = await db.updateDagelijksePlanning(id, req.body, userId);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error updating dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij updaten dagelijkse planning' });
    }
});

app.put('/api/dagelijkse-planning/:id/reorder', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const { targetUur, targetPosition } = req.body;
        const userId = getCurrentUserId(req);
        const success = await db.reorderDagelijksePlanning(id, targetUur, targetPosition, userId);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error reordering dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij herordenen dagelijkse planning' });
    }
});

app.delete('/api/dagelijkse-planning/:id', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const success = await db.deleteDagelijksePlanning(id);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error deleting dagelijkse planning:', error);
        res.status(500).json({ error: 'Fout bij verwijderen dagelijkse planning' });
    }
});

app.get('/api/ingeplande-acties/:datum', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { datum } = req.params;
        const ingeplandeActies = await db.getIngeplandeActies(datum);
        res.json(ingeplandeActies);
    } catch (error) {
        console.error('Error getting ingeplande acties:', error);
        res.status(500).json({ error: 'Fout bij ophalen ingeplande acties' });
    }
});

// Emergency cleanup endpoint
app.post('/api/test/emergency-cleanup', async (req, res) => {
    try {
        console.log('🧹 Emergency cleanup initiated...');
        
        // Delete all test records (by ID pattern and by test names)
        const deletedTasks = await pool.query("DELETE FROM taken WHERE id LIKE 'test_%' OR tekst IN ('Completion test', 'Test taak', 'Database CRUD Test', 'Updated Test Task', 'Rollback Test', 'FK Test Task', 'Dagelijkse test taak', 'Completion workflow test', 'List management test', 'Project context test', 'Email versturen naar klanten', 'Vergadering voorbereiden', 'Factuur email versturen', 'Taak voor vandaag', 'Taak voor morgen') RETURNING id");
        const deletedProjects = await pool.query("DELETE FROM projecten WHERE id LIKE 'test_project_%' OR naam IN ('Test Project', 'FK Test Project') RETURNING id");
        const deletedContexts = await pool.query("DELETE FROM contexten WHERE id LIKE 'test_context_%' OR naam IN ('Test Context', 'FK Test Context') RETURNING id");
        
        const totalDeleted = deletedTasks.rows.length + deletedProjects.rows.length + deletedContexts.rows.length;
        
        console.log(`✅ Emergency cleanup completed - ${totalDeleted} records deleted`);
        res.json({ 
            success: true, 
            message: `Emergency cleanup completed successfully - ${totalDeleted} records deleted`,
            deleted: {
                tasks: deletedTasks.rows.length,
                projects: deletedProjects.rows.length, 
                contexts: deletedContexts.rows.length,
                total: totalDeleted
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint to add missing recurring columns (GET for easy access)
app.get('/api/admin/add-recurring-columns', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        console.log('🔧 Admin: Adding missing recurring columns...');
        
        // Add columns one by one to avoid conflicts
        const columns = [
            { name: 'herhaling_type', type: 'VARCHAR(30)' },
            { name: 'herhaling_waarde', type: 'INTEGER' },
            { name: 'herhaling_actief', type: 'BOOLEAN DEFAULT FALSE' }
        ];
        
        const results = [];
        
        for (const col of columns) {
            try {
                await pool.query(`ALTER TABLE taken ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added column ${col.name}`);
                results.push({ column: col.name, status: 'added' });
            } catch (colError) {
                if (colError.message.includes('already exists')) {
                    console.log(`⚠️ Column ${col.name} already exists`);
                    results.push({ column: col.name, status: 'already_exists' });
                } else {
                    console.log(`❌ Failed to add column ${col.name}:`, colError.message);
                    results.push({ column: col.name, status: 'error', error: colError.message });
                }
            }
        }
        
        console.log('✅ Recurring columns setup complete');
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('❌ Failed to add recurring columns:', error);
        res.status(500).json({ error: 'Failed to add columns', details: error.message });
    }
});

// Debug endpoint to list all tasks in a specific list
app.get('/api/debug/lijst/:naam', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { naam } = req.params;
        const result = await pool.query('SELECT * FROM taken WHERE lijst = $1 AND afgewerkt IS NULL ORDER BY aangemaakt DESC', [naam]);
        
        res.json({
            lijst: naam,
            count: result.rows.length,
            tasks: result.rows
        });
    } catch (error) {
        console.error(`Error getting debug list ${req.params.naam}:`, error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Debug endpoint to check task details
app.get('/api/taak/:id', async (req, res) => {
    try {
        if (!db) {
            console.log('🐛 DEBUG: Database not available for task lookup');
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        console.log('🐛 DEBUG: Looking up task with ID:', id);
        
        // Use same pool as database module to avoid connection issues
        const { pool: dbPool } = require('./database');
        const result = await dbPool.query('SELECT * FROM taken WHERE id = $1', [id]);
        console.log('🐛 DEBUG: Query result rows count:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('🐛 DEBUG: Found task:', result.rows[0]);
            res.json(result.rows[0]);
        } else {
            console.log('🐛 DEBUG: Task not found in database');
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error(`🐛 DEBUG: Error getting task ${req.params.id}:`, error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/taak/recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { originalTask, nextDate } = req.body;
        const userId = getCurrentUserId(req);
        console.log('Creating recurring task for user', userId, ':', { originalTask, nextDate });
        
        const taskId = await db.createRecurringTask(originalTask, nextDate, userId);
        if (taskId) {
            // Debug: immediately check what's in acties list after creation
            setTimeout(async () => {
                try {
                    const actiesTasks = await db.getList('acties', userId);
                    console.log('🔍 DEBUG: All tasks in acties after creation:', actiesTasks.length);
                    const newTask = actiesTasks.find(t => t.id === taskId);
                    if (newTask) {
                        console.log('✅ DEBUG: New task found in acties list:', newTask);
                    } else {
                        console.log('❌ DEBUG: New task NOT found in acties list');
                        console.log('🔍 DEBUG: All task IDs in acties:', actiesTasks.map(t => t.id));
                    }
                } catch (error) {
                    console.log('Debug check failed:', error);
                }
            }, 1000);
            
            res.json({ success: true, taskId });
        } else {
            res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
        }
    } catch (error) {
        console.error('Error creating recurring task:', error);
        res.status(500).json({ error: 'Fout bij aanmaken herhalende taak' });
    }
});

// Debug endpoint to check all tasks for 16/06
app.get('/api/debug/june16', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt, aangemaakt
            FROM taken 
            WHERE verschijndatum::date = '2025-06-16'
            ORDER BY aangemaakt DESC
        `);
        
        // Also check recent tasks regardless of date
        const recentResult = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt, aangemaakt
            FROM taken 
            WHERE aangemaakt > NOW() - INTERVAL '1 hour'
            ORDER BY aangemaakt DESC
        `);
        
        console.log('🔍 DEBUG: All tasks for 2025-06-16:', result.rows);
        console.log('🔍 DEBUG: Recent tasks (last hour):', recentResult.rows);
        res.json({ 
            june16_count: result.rows.length, 
            june16_tasks: result.rows,
            recent_count: recentResult.rows.length,
            recent_tasks: recentResult.rows
        });
    } catch (error) {
        console.error('Debug june16 error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Temporary debug endpoint to check what's actually in acties
app.get('/api/debug/acties', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pool } = require('./database');
        const result = await pool.query(`
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, herhaling_actief, afgewerkt 
            FROM taken 
            WHERE lijst = 'acties' AND afgewerkt IS NULL 
            ORDER BY verschijndatum DESC
        `);
        
        console.log('🔍 DEBUG: Raw acties from database:', result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Debug acties error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simple test endpoint to check if new endpoints work
app.get('/api/debug/test-simple', (req, res) => {
    res.json({ 
        message: 'Simple test endpoint works!', 
        timestamp: new Date().toISOString(),
        server: 'tickedify'
    });
});

// Direct working implementation test
app.get('/api/debug/test-second-wednesday', (req, res) => {
    // Test pattern: monthly-weekday-second-3-1
    // Base date: 2025-06-17
    // Expected: 2025-07-09 (second Wednesday of July)
    
    const baseDate = '2025-06-17';
    const date = new Date(baseDate);
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1); // July 2025
    nextMonth.setDate(1); // July 1st
    
    let wednesdayCount = 0;
    while (wednesdayCount < 2) {
        if (nextMonth.getDay() === 3) { // Wednesday
            wednesdayCount++;
            if (wednesdayCount === 2) {
                break; // Found second Wednesday
            }
        }
        nextMonth.setDate(nextMonth.getDate() + 1);
    }
    
    const result = nextMonth.toISOString().split('T')[0];
    
    res.json({
        baseDate,
        pattern: 'monthly-weekday-second-3-1',
        result,
        expected: '2025-07-09',
        matches: result === '2025-07-09',
        message: `Working implementation gives: ${result}`
    });
});

// Test Nederlandse werkdag patronen direct
app.get('/api/debug/test-dutch-workdays', (req, res) => {
    const baseDate = '2025-06-17'; // Tuesday
    const date = new Date(baseDate);
    
    // Test eerste-werkdag-maand (first workday of next month = July)
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1); // July 2025
    nextMonth.setDate(1); // July 1st
    while (nextMonth.getDay() === 0 || nextMonth.getDay() === 6) {
        nextMonth.setDate(nextMonth.getDate() + 1);
    }
    const eersteWerkdag = nextMonth.toISOString().split('T')[0];
    
    // Test laatste-werkdag-maand (last workday of next month = July)  
    const lastMonth = new Date(date);
    lastMonth.setMonth(date.getMonth() + 2); // August
    lastMonth.setDate(0); // Last day of July
    while (lastMonth.getDay() === 0 || lastMonth.getDay() === 6) {
        lastMonth.setDate(lastMonth.getDate() - 1);
    }
    const laatsteWerkdag = lastMonth.toISOString().split('T')[0];
    
    res.json({
        baseDate,
        tests: {
            'eerste-werkdag-maand': {
                result: eersteWerkdag,
                calculation: 'First workday of July 2025'
            },
            'laatste-werkdag-maand': {
                result: laatsteWerkdag,
                calculation: 'Last workday of July 2025'
            }
        }
    });
});

// Quick test for monthly-weekday pattern  
app.get('/api/debug/quick-monthly-test', (req, res) => {
    // Direct test - what are the Wednesdays in July 2025?
    const july2025 = [];
    for (let day = 1; day <= 31; day++) {
        const date = new Date(2025, 6, day); // July = month 6 (0-indexed)
        if (date.getDay() === 3) { // Wednesday
            july2025.push(date.toISOString().split('T')[0]);
        }
    }
    
    res.json({
        allWednesdaysInJuly2025: july2025,
        firstWednesday: july2025[0],
        secondWednesday: july2025[1],
        thirdWednesday: july2025[2],
        fourthWednesday: july2025[3],
        calculation: `Second Wednesday of July 2025 is ${july2025[1]}`
    });
});

// Debug endpoint to test saveList with recurring data
app.post('/api/debug/test-save-recurring', async (req, res) => {
    try {
        const testData = [{
            id: "debug-test-" + Date.now(),
            tekst: "Debug test recurring",
            aangemaakt: "2025-06-17T12:16:42.232Z",
            projectId: "ghhnv0pdlmbvaix7s",
            verschijndatum: "2025-06-17",
            contextId: "95dfadbz9mbvaj0nt",
            duur: 30,
            type: "actie",
            herhalingType: "monthly-weekday-first-workday-1",
            herhalingActief: true
        }];
        
        console.log('🔍 DEBUG ENDPOINT: Testing save with data:', testData);
        
        if (!db) {
            return res.json({ error: 'Database not available', success: false });
        }
        
        const success = await db.saveList('acties', testData);
        
        res.json({ 
            success, 
            message: success ? 'Save successful' : 'Save failed',
            testData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('🔍 DEBUG ENDPOINT ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Alternative: Add single action without loading existing list
app.post('/api/debug/add-single-action', async (req, res) => {
    try {
        if (!db) {
            return res.json({ error: 'Database not available', success: false });
        }
        
        const actionData = req.body;
        console.log('🔧 SINGLE ACTION: Adding action:', actionData);
        
        const userId = getCurrentUserId(req);
        console.log('🔧 SINGLE ACTION: Using userId:', userId);
        
        // First check if task already exists for this user
        const existingCheck = await pool.query('SELECT * FROM taken WHERE id = $1 AND user_id = $2', [actionData.id, userId]);
        if (existingCheck.rows.length > 0) {
            console.log('🔧 SINGLE ACTION: Task already exists, updating instead');
            
            // Delete the existing task first
            await pool.query('DELETE FROM taken WHERE id = $1 AND user_id = $2', [actionData.id, userId]);
            console.log('🔧 SINGLE ACTION: Deleted existing task');
        }
        
        // Insert directly without touching existing data - WITH user_id
        const result = await pool.query(`
            INSERT INTO taken (id, tekst, opmerkingen, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, afgewerkt, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id
        `, [
            actionData.id,
            actionData.tekst,
            actionData.opmerkingen || null,
            actionData.aangemaakt,
            'acties',
            actionData.projectId || null,
            actionData.verschijndatum || null,
            actionData.contextId || null,
            actionData.duur || null,
            actionData.type || null,
            actionData.herhalingType || null,
            actionData.herhalingWaarde || null,
            actionData.herhalingActief === true || actionData.herhalingActief === 'true',
            null,
            userId  // Add user_id
        ]);
        
        console.log('🔧 SINGLE ACTION: Successfully inserted with ID:', result.rows[0].id);
        
        res.json({ 
            success: true, 
            message: 'Action added successfully',
            insertedId: result.rows[0].id,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('🔧 SINGLE ACTION ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Force database migration endpoint
app.post('/api/debug/force-migration', async (req, res) => {
    try {
        if (!pool) {
            return res.json({ error: 'Database pool not available', success: false });
        }
        
        console.log('🔧 FORCE MIGRATION: Starting herhaling_type column migration');
        
        // Force migrate the column size
        await pool.query(`ALTER TABLE taken ALTER COLUMN herhaling_type TYPE VARCHAR(50)`);
        
        console.log('✅ FORCE MIGRATION: Successfully migrated herhaling_type to VARCHAR(50)');
        
        res.json({ 
            success: true, 
            message: 'Migration completed successfully',
            migration: 'herhaling_type VARCHAR(30) -> VARCHAR(50)',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ FORCE MIGRATION ERROR:', error);
        res.json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Raw JSON test for debugging
app.get('/api/debug/raw-test/:pattern/:baseDate', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { pattern, baseDate } = req.params;
    
    // Just test if monthly-weekday logic reaches the calculation
    let reached = [];
    
    if (pattern.startsWith('monthly-weekday-')) {
        reached.push('monthly-weekday check passed');
        const parts = pattern.split('-');
        if (parts.length === 5) {
            reached.push('parts length check passed');
            const position = parts[2];
            const targetDay = parseInt(parts[3]);
            const interval = parseInt(parts[4]);
            
            const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
            // Allow 'workday' as special case for targetDay
            const isValidTargetDay = parts[3] === 'workday' || (!isNaN(targetDay) && targetDay >= 1 && targetDay <= 7);
            if (validPositions.includes(position) && 
                isValidTargetDay && 
                !isNaN(interval) && interval > 0) {
                reached.push('validation passed');
                
                const date = new Date(baseDate);
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + interval);
                
                // Special handling for workday patterns
                if (parts[3] === 'workday') {
                    reached.push('workday pattern detected');
                    
                    if (position === 'first') {
                        // First workday of month
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                    } else if (position === 'last') {
                        // Last workday of month
                        const targetMonth = nextDateObj.getMonth();
                        nextDateObj.setMonth(targetMonth + 1);
                        nextDateObj.setDate(0); // Last day of target month
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    }
                } else {
                    // Normal weekday patterns
                    const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                    
                    if (position === 'last') {
                        // Find last occurrence of weekday in month
                        const targetMonth = nextDateObj.getMonth();
                        nextDateObj.setMonth(targetMonth + 1);
                        nextDateObj.setDate(0); // Last day of target month
                        while (nextDateObj.getDay() !== jsTargetDay) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    } else {
                        // Find nth occurrence of weekday in month (first, second, third, fourth)
                        const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                        const occurrenceNumber = positionNumbers[position];
                        
                        nextDateObj.setDate(1); // Start at beginning of month
                        let occurrenceCount = 0;
                        
                        // Find the nth occurrence of the target weekday
                        while (occurrenceCount < occurrenceNumber) {
                            if (nextDateObj.getDay() === jsTargetDay) {
                                occurrenceCount++;
                                if (occurrenceCount === occurrenceNumber) {
                                    break; // Found the nth occurrence
                                }
                            }
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                            
                            // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                            if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                res.write(JSON.stringify({
                                    success: false,
                                    reached: [...reached, 'occurrence does not exist in month']
                                }));
                                res.end();
                                return;
                            }
                        }
                    }
                }
                
                reached.push('calculation completed');
                
                const nextDate = nextDateObj.toISOString().split('T')[0];
                
                res.write(JSON.stringify({
                    success: true,
                    nextDate,
                    reached
                }));
                res.end();
                return;
            } else {
                reached.push('validation failed');
            }
        } else {
            reached.push('parts length check failed');
        }
    } else {
        reached.push('monthly-weekday check failed');
    }
    
    res.write(JSON.stringify({
        success: false,
        reached
    }));
    res.end();
});

// Test pattern parsing
app.get('/api/debug/parse-pattern/:pattern', (req, res) => {
    const { pattern } = req.params;
    const parts = pattern.split('-');
    
    let validationDetails = {};
    
    if (pattern.startsWith('monthly-weekday-') && parts.length === 5) {
        const position = parts[2];
        const targetDay = parseInt(parts[3]);
        const interval = parseInt(parts[4]);
        
        const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
        validationDetails = {
            position,
            targetDay,
            interval,
            positionValid: validPositions.includes(position),
            targetDayValid: !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7,
            intervalValid: !isNaN(interval) && interval > 0,
            overallValid: validPositions.includes(position) && 
                         !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7 && 
                         !isNaN(interval) && interval > 0
        };
    }
    
    res.json({
        pattern,
        parts,
        partCount: parts.length,
        startsWithChecks: {
            'daily-': pattern.startsWith('daily-'),
            'weekly-': pattern.startsWith('weekly-'),
            'monthly-day-': pattern.startsWith('monthly-day-'),
            'yearly-': pattern.startsWith('yearly-'),
            'monthly-weekday-': pattern.startsWith('monthly-weekday-'),
            'yearly-special-': pattern.startsWith('yearly-special-'),
            'nederlandse-werkdag': ['eerste-werkdag-maand', 'laatste-werkdag-maand', 'eerste-werkdag-jaar', 'laatste-werkdag-jaar'].includes(pattern)
        },
        validationDetails
    });
});

// GET version of test-recurring for easier testing (date calculation only)
app.get('/api/debug/test-recurring/:pattern/:baseDate', async (req, res) => {
    try {
        const { pattern, baseDate } = req.params;
        
        if (!pattern || !baseDate) {
            return res.status(400).json({ error: 'Pattern and baseDate are required' });
        }
        
        console.log('🧪 Testing pattern:', pattern, 'with base date:', baseDate);
        
        // Test date calculation logic directly (simulate frontend logic)
        let nextDate = null;
        const date = new Date(baseDate);
        
        if (pattern.startsWith('daily-')) {
            // Pattern: daily-interval (e.g., daily-3 = every 3 days)
            const parts = pattern.split('-');
            if (parts.length === 2) {
                const interval = parseInt(parts[1]);
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setDate(date.getDate() + interval);
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('weekly-')) {
            // Pattern: weekly-interval-day (e.g., weekly-1-4 = every week on Thursday)
            const parts = pattern.split('-');
            if (parts.length === 3) {
                const interval = parseInt(parts[1]);
                const targetDay = parseInt(parts[2]); // 1=Monday, 2=Tuesday, ..., 7=Sunday
                
                if (!isNaN(interval) && !isNaN(targetDay) && targetDay >= 1 && targetDay <= 7) {
                    // Convert our day numbering (1-7) to JavaScript day numbering (0-6, Sunday=0)
                    const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                    
                    // Find next occurrence of target day
                    const currentDay = date.getDay();
                    let daysToAdd = jsTargetDay - currentDay;
                    
                    if (daysToAdd <= 0) {
                        daysToAdd += 7;
                    }
                    
                    const nextOccurrence = new Date(date);
                    nextOccurrence.setDate(date.getDate() + daysToAdd);
                    
                    // Add additional weeks based on interval
                    if (interval > 1) {
                        nextOccurrence.setDate(nextOccurrence.getDate() + (interval - 1) * 7);
                    }
                    
                    nextDate = nextOccurrence.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('monthly-day-')) {
            // Pattern: monthly-day-daynum-interval (e.g., monthly-day-15-2 = day 15 every 2 months)
            const parts = pattern.split('-');
            if (parts.length === 4) {
                const dayNum = parseInt(parts[2]);
                const interval = parseInt(parts[3]);
                if (!isNaN(dayNum) && !isNaN(interval) && dayNum >= 1 && dayNum <= 31) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setMonth(date.getMonth() + interval);
                    nextDateObj.setDate(dayNum);
                    
                    // Handle months with fewer days
                    if (nextDateObj.getDate() !== dayNum) {
                        nextDateObj.setDate(0); // Last day of month
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('yearly-')) {
            // Pattern: yearly-day-month-interval (e.g., yearly-25-12-1 = Dec 25 every year)
            const parts = pattern.split('-');
            if (parts.length === 4) {
                const day = parseInt(parts[1]);
                const month = parseInt(parts[2]);
                const interval = parseInt(parts[3]);
                if (!isNaN(day) && !isNaN(month) && !isNaN(interval) && 
                    day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setFullYear(date.getFullYear() + interval);
                    nextDateObj.setMonth(month - 1); // JavaScript months are 0-based
                    nextDateObj.setDate(day);
                    
                    // Handle leap year issues
                    if (nextDateObj.getDate() !== day) {
                        nextDateObj.setDate(0); // Last day of previous month
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern.startsWith('monthly-weekday-')) {
            // Pattern: monthly-weekday-position-day-interval (e.g., monthly-weekday-second-3-1 = second Wednesday every month)
            // Special case: monthly-weekday-first-workday-1 = first workday of every month
            const parts = pattern.split('-');
            if (parts.length === 5) {
                const position = parts[2]; // 'first', 'second', 'third', 'fourth', 'last'
                const targetDay = parts[3]; // 1=Monday, ..., 7=Sunday, or 'workday'
                const interval = parseInt(parts[4]);
                
                const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
                const isValidDay = (!isNaN(parseInt(targetDay)) && parseInt(targetDay) >= 1 && parseInt(targetDay) <= 7) || targetDay === 'workday';
                
                if (validPositions.includes(position) && isValidDay && !isNaN(interval) && interval > 0) {
                    
                    // Special handling for workday patterns
                    if (targetDay === 'workday') {
                        const nextDateObj = new Date(date);
                        nextDateObj.setMonth(date.getMonth() + interval);
                        
                        if (position === 'first') {
                            // First workday of month
                            nextDateObj.setDate(1);
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() + 1);
                            }
                        } else if (position === 'last') {
                            // Last workday of month
                            const targetMonth = nextDateObj.getMonth();
                            nextDateObj.setMonth(targetMonth + 1);
                            nextDateObj.setDate(0); // Last day of target month
                            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                        }
                        
                        nextDate = nextDateObj.toISOString().split('T')[0];
                    } else {
                        // Regular weekday patterns (existing logic)
                        const numericTargetDay = parseInt(targetDay);
                        const jsTargetDay = numericTargetDay === 7 ? 0 : numericTargetDay; // Convert to JS day numbering
                        const nextDateObj = new Date(date);
                        nextDateObj.setMonth(date.getMonth() + interval);
                        
                        if (position === 'last') {
                            // Find last occurrence of weekday in month
                            const targetMonth = nextDateObj.getMonth();
                            nextDateObj.setMonth(targetMonth + 1);
                            nextDateObj.setDate(0); // Last day of target month
                            while (nextDateObj.getDay() !== jsTargetDay) {
                                nextDateObj.setDate(nextDateObj.getDate() - 1);
                            }
                        } else {
                            // Find nth occurrence of weekday in month (first, second, third, fourth)
                            const positionNumbers = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
                            const occurrenceNumber = positionNumbers[position];
                            
                            nextDateObj.setDate(1); // Start at beginning of month
                            let occurrenceCount = 0;
                            
                            // Find the nth occurrence of the target weekday
                            while (occurrenceCount < occurrenceNumber) {
                                if (nextDateObj.getDay() === jsTargetDay) {
                                    occurrenceCount++;
                                    if (occurrenceCount === occurrenceNumber) {
                                        break; // Found the nth occurrence
                                    }
                                }
                                nextDateObj.setDate(nextDateObj.getDate() + 1);
                                
                                // Safety check: if we've gone beyond the month, this occurrence doesn't exist
                                if (nextDateObj.getMonth() !== (date.getMonth() + interval) % 12) {
                                    nextDate = null; // This occurrence doesn't exist in this month
                                    break;
                                }
                            }
                        }
                        
                        if (nextDate !== null) {
                            nextDate = nextDateObj.toISOString().split('T')[0];
                        }
                    }
                }
            }
        } else if (pattern.startsWith('yearly-special-')) {
            // Pattern: yearly-special-type-interval (e.g., yearly-special-first-workday-1)
            const parts = pattern.split('-');
            if (parts.length >= 4) {
                const specialType = parts.slice(2, -1).join('-'); // Everything except 'yearly', 'special' and interval
                const interval = parseInt(parts[parts.length - 1]);
                
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setFullYear(date.getFullYear() + interval);
                    
                    if (specialType === 'first-workday') {
                        // First workday of the year
                        nextDateObj.setMonth(0); // January
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                    } else if (specialType === 'last-workday') {
                        // Last workday of the year
                        nextDateObj.setMonth(11); // December
                        nextDateObj.setDate(31);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                }
            }
        } else if (pattern === 'eerste-werkdag-maand') {
            // First workday of next month
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-maand') {
            // Last workday of next month
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 2);
            nextDateObj.setDate(0); // Last day of next month
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-jaar') {
            // First workday of next year
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-jaar') {
            // Last workday of next year
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(11); // December
            nextDateObj.setDate(31);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        }
        
        // Special debug for monthly-weekday patterns
        let monthlyWeekdayDebug = null;
        if (pattern.startsWith('monthly-weekday-')) {
            const parts = pattern.split('-');
            const validPositions = ['first', 'second', 'third', 'fourth', 'last'];
            monthlyWeekdayDebug = {
                parts,
                partsLength: parts.length,
                position: parts[2],
                targetDay: parseInt(parts[3]),
                interval: parseInt(parts[4]),
                positionCheck: validPositions.includes(parts[2]),
                targetDayCheck: !isNaN(parseInt(parts[3])) && parseInt(parts[3]) >= 1 && parseInt(parts[3]) <= 7,
                intervalCheck: !isNaN(parseInt(parts[4])) && parseInt(parts[4]) > 0
            };
        }
        
        res.json({
            pattern,
            baseDate,
            nextDate,
            success: !!nextDate,
            message: nextDate ? `Next occurrence: ${nextDate}` : 'Failed to calculate next date',
            calculation: nextDate ? `${baseDate} + ${pattern} = ${nextDate}` : 'Pattern not recognized',
            debug: {
                patternStartsWith: {
                    'daily-': pattern.startsWith('daily-'),
                    'weekly-': pattern.startsWith('weekly-'),
                    'monthly-day-': pattern.startsWith('monthly-day-'),
                    'yearly-': pattern.startsWith('yearly-'),
                    'monthly-weekday-': pattern.startsWith('monthly-weekday-'),
                    'yearly-special-': pattern.startsWith('yearly-special-'),
                    'nederlandse-werkdag': ['eerste-werkdag-maand', 'laatste-werkdag-maand', 'eerste-werkdag-jaar', 'laatste-werkdag-jaar'].includes(pattern)
                },
                monthlyWeekday: monthlyWeekdayDebug
            }
        });
        
    } catch (error) {
        console.error('Test recurring error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Test endpoint for complex recurring patterns
app.post('/api/debug/test-recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { pattern, baseDate, expectedDays } = req.body;
        
        if (!pattern || !baseDate) {
            return res.status(400).json({ error: 'Pattern and baseDate are required' });
        }
        
        // Test the pattern by creating a test task and marking it complete
        const { pool, createRecurringTask } = require('./database');
        
        // Create test task
        const testTask = {
            tekst: `TEST: ${pattern}`,
            verschijndatum: baseDate,
            lijst: 'acties',
            project_id: null,
            context_id: 1, // Assuming context 1 exists
            duur: 30,
            herhaling_type: pattern,
            herhaling_actief: true
        };
        
        console.log('🧪 Creating test task:', testTask);
        
        const insertResult = await pool.query(`
            INSERT INTO taken (tekst, verschijndatum, lijst, project_id, context_id, duur, herhaling_type, herhaling_actief)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [testTask.tekst, testTask.verschijndatum, testTask.lijst, testTask.project_id, testTask.context_id, testTask.duur, testTask.herhaling_type, testTask.herhaling_actief]);
        
        const taskId = insertResult.rows[0].id;
        console.log('✅ Test task created with ID:', taskId);
        
        // Now test creating the next recurring task
        const nextDate = await createRecurringTask(testTask, baseDate);
        
        let results = [];
        if (nextDate) {
            // Verify the next task was created
            const verifyResult = await pool.query(`
                SELECT id, tekst, verschijndatum, herhaling_type, herhaling_actief
                FROM taken 
                WHERE tekst = $1 AND verschijndatum = $2 AND lijst = 'acties'
            `, [testTask.tekst, nextDate]);
            
            results = verifyResult.rows;
        }
        
        // Clean up test tasks
        await pool.query('DELETE FROM taken WHERE tekst LIKE $1', [`TEST: ${pattern}%`]);
        
        res.json({
            pattern,
            baseDate,
            nextDate,
            success: !!nextDate,
            createdTasks: results,
            message: nextDate ? `Next occurrence: ${nextDate}` : 'Failed to calculate next date'
        });
        
    } catch (error) {
        console.error('Test recurring error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Batch test endpoint for multiple patterns
app.post('/api/debug/batch-test-recurring', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { patterns, baseDate } = req.body;
        
        if (!patterns || !Array.isArray(patterns) || !baseDate) {
            return res.status(400).json({ error: 'Patterns array and baseDate are required' });
        }
        
        const results = [];
        
        for (const pattern of patterns) {
            try {
                const response = await fetch(`http://localhost:${PORT}/api/debug/test-recurring`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pattern, baseDate })
                });
                
                const result = await response.json();
                results.push(result);
                
            } catch (error) {
                results.push({
                    pattern,
                    baseDate,
                    success: false,
                    error: error.message
                });
            }
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        res.json({
            baseDate,
            totalPatterns: patterns.length,
            results,
            summary: {
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        });
        
    } catch (error) {
        console.error('Batch test recurring error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Debug endpoint to view all tasks
app.get('/api/debug/all-tasks', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = 'default-user-001';
        const result = await pool.query(`
            SELECT id, tekst, lijst, afgewerkt IS NOT NULL as completed 
            FROM taken 
            WHERE user_id = $1 
            ORDER BY lijst, tekst
        `, [userId]);
        
        res.json({
            success: true,
            total: result.rows.length,
            tasks: result.rows
        });
        
    } catch (error) {
        console.error('All tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to force refresh user data (clear any server-side caching)
app.get('/api/debug/force-refresh/:userId', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = req.params.userId;
        
        // Get fresh data directly from database
        const result = await pool.query(`
            SELECT id, tekst, lijst, afgewerkt IS NOT NULL as completed
            FROM taken 
            WHERE user_id = $1 
            AND afgewerkt IS NULL
            ORDER BY lijst, tekst
        `, [userId]);
        
        res.json({
            success: true,
            userId: userId,
            freshData: true,
            tasks: result.rows,
            total: result.rows.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Force refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to force clean up 'Thuis' endings with verification
app.get('/api/debug/force-clean-thuis', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get all tasks that contain 'Thuis' (more aggressive search)
            const result = await client.query(`
                SELECT t.id, t.tekst, t.lijst, t.user_id, u.email 
                FROM taken t
                JOIN users u ON t.user_id = u.id
                WHERE (t.tekst LIKE '%Thuis%' OR t.tekst LIKE '%thuis%')
                AND t.afgewerkt IS NULL
            `);
            
            const tasksToUpdate = result.rows;
            let updatedCount = 0;
            const updateResults = [];
            
            for (const task of tasksToUpdate) {
                const originalText = task.tekst;
                // More aggressive cleanup - remove 'Thuis' or 'thuis' anywhere it appears
                let cleanedText = originalText
                    .replace(/\s*[Tt]huis\s*,/g, ',') // Remove 'Thuis,' 
                    .replace(/\s*[Tt]huis\s*$/g, '') // Remove 'Thuis' at end
                    .replace(/\s*[Tt]huis\s+/g, ' ') // Remove 'Thuis ' in middle
                    .replace(/\s+/g, ' ') // Normalize multiple spaces
                    .replace(/\s+$/, '') // Remove trailing whitespace
                    .trim();
                
                if (cleanedText !== originalText && cleanedText.length > 0) {
                    // Update the task
                    const updateResult = await client.query(`
                        UPDATE taken 
                        SET tekst = $1 
                        WHERE id = $2
                        RETURNING id, tekst
                    `, [cleanedText, task.id]);
                    
                    updateResults.push({
                        id: task.id,
                        original: originalText,
                        updated: updateResult.rows[0].tekst,
                        success: true
                    });
                    
                    updatedCount++;
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                found: tasksToUpdate.length,
                updated: updatedCount,
                updateResults: updateResults
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Force clean Thuis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to clean up 'Thuis' endings
app.get('/api/debug/clean-thuis', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all tasks for ALL users that end with 'Thuis'
        const result = await pool.query(`
            SELECT t.id, t.tekst, t.lijst, t.user_id, u.email 
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.tekst LIKE '%Thuis'
            AND t.afgewerkt IS NULL
        `);
        
        const tasksToUpdate = result.rows;
        let updatedCount = 0;
        
        for (const task of tasksToUpdate) {
            const originalText = task.tekst;
            const cleanedText = originalText.replace(/\s*Thuis\s*$/, '').trim();
            
            if (cleanedText !== originalText && cleanedText.length > 0) {
                console.log(`Updating task ${task.id}: "${originalText}" -> "${cleanedText}"`);
                
                const updateResult = await pool.query(`
                    UPDATE taken 
                    SET tekst = $1 
                    WHERE id = $2
                    RETURNING tekst
                `, [cleanedText, task.id]);
                
                console.log(`Update result for ${task.id}:`, updateResult.rows[0]);
                updatedCount++;
            }
        }
        
        res.json({
            success: true,
            found: tasksToUpdate.length,
            updated: updatedCount,
            tasks: tasksToUpdate.map(t => ({
                id: t.id,
                user_email: t.email,
                lijst: t.lijst,
                original: t.tekst,
                cleaned: t.tekst.replace(/\s*Thuis\s*$/, '').trim()
            }))
        });
        
    } catch (error) {
        console.error('Clean Thuis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

app.listen(PORT, () => {
    console.log(`🚀 Tickedify server v2 running on port ${PORT}`);
    
    // Initialize database after server starts
    setTimeout(async () => {
        try {
            if (db) {
                const { initDatabase } = require('./database');
                await initDatabase();
                dbInitialized = true;
                console.log('✅ Database initialized successfully');
            } else {
                console.log('⚠️ Database module not available, skipping initialization');
            }
        } catch (error) {
            console.error('⚠️ Database initialization failed:', error.message);
        }
    }, 1000);
});