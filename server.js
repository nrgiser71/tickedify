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

// Enhanced request logging with API tracking
const apiStats = new Map();
const errorLogs = [];
const MAX_ERROR_LOGS = 100;

// Import forensic logger
const forensicLogger = require('./forensic-logger');

// Debug: Check forensic logger status at startup
console.log('🔍 DEBUG: FORENSIC_DEBUG environment variable:', process.env.FORENSIC_DEBUG);
console.log('🔍 DEBUG: Forensic logger enabled status:', forensicLogger.enabled);

// Force test log on startup
if (forensicLogger.enabled) {
    setTimeout(() => {
        forensicLogger.log('SYSTEM', 'STARTUP_TEST', { message: 'Forensic logging system initialized' });
        console.log('🧪 Startup test log written');
    }, 2000);
}

// Add forensic logging middleware
app.use(forensicLogger.middleware());

app.use((req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Track API usage
    const endpoint = req.method + ' ' + req.route?.path || req.url;
    if (!apiStats.has(endpoint)) {
        apiStats.set(endpoint, { calls: 0, totalTime: 0, errors: 0, lastCalled: null });
    }
    
    res.send = function(data) {
        const responseTime = Date.now() - startTime;
        const stats = apiStats.get(endpoint);
        
        stats.calls++;
        stats.totalTime += responseTime;
        stats.lastCalled = new Date().toISOString();
        
        // Track errors
        if (res.statusCode >= 400) {
            stats.errors++;
            
            // Log error
            errorLogs.unshift({
                timestamp: new Date().toISOString(),
                endpoint: req.url,
                method: req.method,
                statusCode: res.statusCode,
                message: typeof data === 'string' ? data : JSON.stringify(data),
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            });
            
            // Keep only recent errors
            if (errorLogs.length > MAX_ERROR_LOGS) {
                errorLogs.splice(MAX_ERROR_LOGS);
            }
        }
        
        return originalSend.call(this, data);
    };
    
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

// Get user's email import code
app.get('/api/user/email-import-code', (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        db.getEmailImportCode(userId).then(code => {
            if (code) {
                res.json({
                    success: true,
                    importCode: code,
                    importEmail: `import+${code}@tickedify.com`,
                    instructions: 'Send emails to this address from any email account'
                });
            } else {
                res.status(500).json({ error: 'Could not generate import code' });
            }
        }).catch(error => {
            console.error('Error getting import code:', error);
            res.status(500).json({ error: 'Database error' });
        });
        
    } catch (error) {
        console.error('Error in email import code endpoint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate new email import code for user
app.post('/api/user/regenerate-import-code', (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        db.generateEmailImportCode(userId).then(code => {
            if (code) {
                res.json({
                    success: true,
                    importCode: code,
                    importEmail: `import+${code}@tickedify.com`,
                    message: 'New import code generated'
                });
            } else {
                res.status(500).json({ error: 'Could not generate new import code' });
            }
        }).catch(error => {
            console.error('Error generating new import code:', error);
            res.status(500).json({ error: 'Database error' });
        });
        
    } catch (error) {
        console.error('Error in regenerate import code endpoint:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Debug endpoint to check last email import attempts
app.get('/api/debug/last-imports', (req, res) => {
    try {
        // In production, you'd want to secure this endpoint
        const userId = getCurrentUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // For now, just return a message about checking server logs
        res.json({
            message: 'Check server logs for IMPORT_LOG entries',
            hint: 'Look for recipient field with import+code pattern',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Test import code extraction
app.get('/api/debug/test-import-code/:recipient', async (req, res) => {
    try {
        const recipient = req.params.recipient;
        console.log('Testing recipient:', recipient);
        
        const importCodeMatch = recipient.match(/import\+([a-zA-Z0-9]+)@/);
        if (importCodeMatch) {
            const importCode = importCodeMatch[1];
            const user = await db.getUserByImportCode(importCode);
            
            res.json({
                recipient: recipient,
                importCodeFound: true,
                importCode: importCode,
                userFound: !!user,
                user: user ? { id: user.id, email: user.email } : null
            });
        } else {
            res.json({
                recipient: recipient,
                importCodeFound: false,
                message: 'No import code pattern found'
            });
        }
    } catch (error) {
        console.error('Error in test import code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to get user ID by email address
async function getUserIdByEmail(email) {
    try {
        if (!email) {
            console.log('getUserIdByEmail: empty email provided');
            return null;
        }
        
        // Clean up email address (remove any brackets, spaces, etc.)
        const cleanEmail = email.trim().toLowerCase();
        console.log(`🔍 Looking up user for email: ${cleanEmail}`);
        
        const result = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1 AND actief = TRUE',
            [cleanEmail]
        );
        
        if (result.rows.length === 0) {
            console.log(`❌ No active user found for email: ${cleanEmail}`);
            return null;
        }
        
        const userId = result.rows[0].id;
        console.log(`✅ Found user ID: ${userId} for email: ${cleanEmail}`);
        return userId;
        
    } catch (error) {
        console.error('Error looking up user by email:', error);
        return null;
    }
}

// Email Import System - Mailgun Webhook Handler
app.post('/api/email/import', upload.any(), async (req, res) => {
    try {
        console.log('📧 Email import request received');
        console.log('Headers:', req.headers);
        console.log('Body keys:', Object.keys(req.body));
        console.log('Files:', req.files?.length || 0);
        console.log('Full body:', req.body);
        
        // Log to a file we can check later
        const logEntry = {
            timestamp: new Date().toISOString(),
            headers: req.headers,
            body: req.body,
            bodyKeys: Object.keys(req.body)
        };
        console.log('IMPORT_LOG:', JSON.stringify(logEntry));
        
        // Try multiple field name variations for Mailgun compatibility
        const sender = req.body.sender || req.body.from || req.body.From || '';
        const recipient = req.body.recipient || req.body.to || req.body.To || '';
        const subject = req.body.subject || req.body.Subject || '';
        const bodyPlain = req.body['body-plain'] || req.body.text || req.body.body || '';
        const bodyHtml = req.body['body-html'] || req.body.html || '';
        const strippedText = req.body['stripped-text'] || req.body['stripped-plain'] || bodyPlain;
        
        console.log('Extracted fields:', { sender, recipient, subject, bodyPlain: bodyPlain?.substring(0, 100) });
        
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
        
        // Get user ID based on import code in recipient address
        let userId = null;
        
        // Try to extract import code from recipient (e.g., import+abc123@tickedify.com)
        if (recipient) {
            const importCodeMatch = recipient.match(/import\+([a-zA-Z0-9]+)@/);
            if (importCodeMatch) {
                const importCode = importCodeMatch[1];
                console.log(`🔍 Found import code: ${importCode}`);
                
                const user = await db.getUserByImportCode(importCode);
                if (user) {
                    userId = user.id;
                    console.log(`✅ Found user ID: ${userId} (${user.email}) for import code: ${importCode}`);
                } else {
                    console.log(`❌ No user found for import code: ${importCode}`);
                    return res.status(404).json({
                        success: false,
                        error: `Invalid import code: ${importCode}`,
                        hint: 'Check your personal import email address in Tickedify settings',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        // Fallback to sender email matching if no import code found
        if (!userId) {
            console.log('⚠️ No import code found, falling back to sender email matching');
            userId = await getUserIdByEmail(sender);
            if (!userId) {
                console.log(`❌ No user found for email: ${sender}`);
                return res.status(404).json({
                    success: false,
                    error: `No user account found for email address: ${sender}`,
                    hint: 'Use your personal import email address: import+yourcode@tickedify.com (get code from settings)',
                    timestamp: new Date().toISOString()
                });
            }
            console.log(`✅ Found user ID: ${userId} for email: ${sender} (fallback method)`);
        }
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

// Debug endpoint to check all users and their import codes
app.get('/api/debug/users-import-codes', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const result = await pool.query(`
            SELECT id, email, naam, email_import_code, actief 
            FROM users 
            ORDER BY aangemaakt
        `);
        
        res.json({
            success: true,
            userCount: result.rows.length,
            users: result.rows,
            message: 'Alle gebruikers met hun import codes'
        });
        
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check tasks created via email import
app.get('/api/debug/email-imported-tasks', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get tasks created in last 24 hours via email import (those with opmerkingen containing email patterns)
        const result = await pool.query(`
            SELECT t.id, t.tekst, t.lijst, t.user_id, t.aangemaakt, t.opmerkingen, u.email as user_email, u.naam as user_naam
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.aangemaakt > NOW() - INTERVAL '24 hours'
            AND (t.opmerkingen LIKE '%Datum:%' OR t.opmerkingen LIKE '%Duur:%' OR t.id LIKE 'task_%')
            ORDER BY t.aangemaakt DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            tasks: result.rows,
            message: 'Recent email imported tasks'
        });
        
    } catch (error) {
        console.error('Debug email imported tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to fix import code for actual user
app.post('/api/debug/fix-user-import-code', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { email } = req.body;
        const targetEmail = email || 'info@BaasOverJeTijd.be';
        
        // Find the actual user (not default-user-001)
        const result = await pool.query(`
            SELECT id, email, naam, email_import_code 
            FROM users 
            WHERE email = $1 
            AND id != 'default-user-001'
        `, [targetEmail]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: `No actual user found with email ${targetEmail}`
            });
        }
        
        const actualUser = result.rows[0];
        
        // Generate new import code for actual user
        const newCode = await db.generateEmailImportCode(actualUser.id);
        
        res.json({
            success: true,
            user: {
                id: actualUser.id,
                email: actualUser.email,
                naam: actualUser.naam,
                oldImportCode: actualUser.email_import_code,
                newImportCode: newCode
            },
            importEmail: `import+${newCode}@tickedify.com`,
            message: 'Import code updated for actual user'
        });
        
    } catch (error) {
        console.error('Fix import code error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint voor huidige gebruiker info inclusief import code
app.get('/api/user/info', async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get user info including import code
        const result = await pool.query(`
            SELECT id, email, naam, email_import_code, rol, aangemaakt
            FROM users 
            WHERE id = $1 AND actief = TRUE
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        
        const user = result.rows[0];
        
        // Generate import code if it doesn't exist
        let importCode = user.email_import_code;
        if (!importCode) {
            importCode = await db.generateEmailImportCode(userId);
            console.log(`📧 Generated missing import code for user ${userId}: ${importCode}`);
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol,
                importCode: importCode,
                importEmail: `import+${importCode}@tickedify.com`
            }
        });
        
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Fout bij ophalen gebruiker gegevens' });
    }
});

// API endpoint voor alle gebruikers (voor test dashboard)
app.get('/api/users', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get all active users
        const result = await pool.query(`
            SELECT id, email, naam, rol
            FROM users 
            WHERE actief = TRUE
            ORDER BY naam
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Fout bij ophalen gebruikers' });
    }
});

// Debug endpoint om huidige gebruiker te checken
app.get('/api/debug/current-user', (req, res) => {
    const userId = getCurrentUserId(req);
    const sessionData = req.session || {};
    
    res.json({
        currentUserId: userId,
        sessionData: {
            id: sessionData.id,
            userId: sessionData.userId,
            cookie: sessionData.cookie
        },
        isAuthenticated: !!sessionData.userId,
        message: 'Current user info based on session'
    });
});

// Debug endpoint to check all inbox tasks
app.get('/api/debug/inbox-tasks/:userId?', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = req.params.userId;
        
        let query = `
            SELECT t.id, t.tekst, t.lijst, t.user_id, t.aangemaakt, u.email as user_email, u.naam as user_naam
            FROM taken t
            JOIN users u ON t.user_id = u.id
            WHERE t.lijst = 'inbox' 
            AND t.afgewerkt IS NULL
        `;
        
        const params = [];
        if (userId) {
            query += ' AND t.user_id = $1';
            params.push(userId);
        }
        
        query += ' ORDER BY t.aangemaakt DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            count: result.rows.length,
            userId: userId || 'all users',
            tasks: result.rows,
            message: userId ? `Inbox tasks for user ${userId}` : 'All inbox tasks'
        });
        
    } catch (error) {
        console.error('Debug inbox tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

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
        
        // Generate email import code for new user
        const importCode = await db.generateEmailImportCode(userId);
        console.log(`📧 Generated import code for new user: ${importCode}`);
        
        // Start session
        req.session.userId = userId;
        req.session.userEmail = email;
        req.session.userNaam = naam;
        
        console.log(`✅ New user registered: ${email} (${userId}) with import code: ${importCode}`);
        
        res.json({
            success: true,
            message: 'Account succesvol aangemaakt',
            user: {
                id: userId,
                email,
                naam,
                rol: 'user',
                importCode: importCode,
                importEmail: `import+${importCode}@tickedify.com`
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

// Old admin users endpoint removed - using consolidated version later in file

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

// Search endpoint definitief verwijderd in v0.5.80
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

// Debug endpoint to find main user (the one with most tasks)
app.get('/api/debug/find-main-user', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        // Get task count per user
        const taskCounts = await pool.query(`
            SELECT user_id, COUNT(*) as task_count
            FROM taken 
            GROUP BY user_id
            ORDER BY task_count DESC
        `);
        
        // Get all users info
        const users = await pool.query('SELECT id, email, name, created_at FROM users ORDER BY created_at');
        
        res.json({
            taskCountsByUser: taskCounts.rows,
            allUsers: users.rows,
            mainUser: taskCounts.rows[0] // User with most tasks
        });
        
    } catch (error) {
        console.error('Find main user error:', error);
        res.status(500).json({ error: error.message });
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
            'tickedify-jan-2025': 'user_1750506689312_16hqhim0k',  // Jan's actual user ID from database
            'tickedify-jan-alt-2025': 'jan@buskens.be',            // Jan's alternative account (needs real ID)
            'tickedify-external-2025': 'default-user-001'          // Legacy fallback
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

// Delete individual task
app.delete('/api/taak/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        console.log(`🗑️ Deleting task ${id} for user ${userId}`);
        
        const result = await pool.query(
            'DELETE FROM taken WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        
        if (result.rows.length > 0) {
            console.log(`✅ Task ${id} deleted successfully`);
            res.json({ success: true, deleted: id });
        } else {
            console.log(`❌ Task ${id} not found or not owned by user`);
            res.status(404).json({ error: 'Taak niet gevonden' });
        }
    } catch (error) {
        console.error(`Error deleting task ${id}:`, error);
        res.status(500).json({ error: 'Fout bij verwijderen', details: error.message });
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
        
        // Log API request
        await forensicLogger.log('PLANNING', 'API_GET_PLANNING_REQUEST', {
            datum: datum,
            userId: userId,
            endpoint: '/api/dagelijkse-planning/:datum',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        const planning = await db.getDagelijksePlanning(datum, userId);
        
        // Log successful response
        await forensicLogger.log('PLANNING', 'API_GET_PLANNING_SUCCESS', {
            datum: datum,
            userId: userId,
            planningItemsReturned: planning.length,
            endpoint: '/api/dagelijkse-planning/:datum',
            responseTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        res.json(planning);
    } catch (error) {
        console.error('Error getting dagelijkse planning:', error);
        
        // Log API error
        await forensicLogger.log('PLANNING', 'API_GET_PLANNING_ERROR', {
            datum: req.params.datum,
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/dagelijkse-planning/:datum',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'api_error'
        });
        
        res.status(500).json({ error: 'Fout bij ophalen dagelijkse planning' });
    }
});

app.post('/api/dagelijkse-planning', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }
        
        const userId = getCurrentUserId(req);
        
        // Log API request
        await forensicLogger.log('PLANNING', 'API_ADD_PLANNING_REQUEST', {
            planningData: req.body,
            userId: userId,
            endpoint: '/api/dagelijkse-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        const planningId = await db.addToDagelijksePlanning(req.body, userId);
        
        // Log successful response
        await forensicLogger.log('PLANNING', 'API_ADD_PLANNING_SUCCESS', {
            planningId: planningId,
            planningData: req.body,
            userId: userId,
            endpoint: '/api/dagelijkse-planning',
            responseTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call'
        });
        
        res.json({ success: true, id: planningId });
    } catch (error) {
        console.error('Error adding to dagelijkse planning:', error);
        
        // Log API error
        await forensicLogger.log('PLANNING', 'API_ADD_PLANNING_ERROR', {
            planningData: req.body,
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/dagelijkse-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'api_error'
        });
        
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
        const userId = getCurrentUserId(req);
        
        // Log API request - CRITICAL for debugging planning disappearance
        await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_REQUEST', {
            planningId: id,
            userId: userId,
            endpoint: '/api/dagelijkse-planning/:id',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'api_call',
            severity: 'CRITICAL' // Mark as critical for forensic analysis
        });
        
        const success = await db.deleteDagelijksePlanning(id, userId);
        
        if (success) {
            // Log successful deletion
            await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_SUCCESS', {
                planningId: id,
                userId: userId,
                endpoint: '/api/dagelijkse-planning/:id',
                responseTimestamp: new Date().toISOString(),
                triggeredBy: 'api_call',
                severity: 'CRITICAL'
            });
            
            res.json({ success: true });
        } else {
            // Log planning item not found
            await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_NOT_FOUND', {
                planningId: id,
                userId: userId,
                endpoint: '/api/dagelijkse-planning/:id',
                responseTimestamp: new Date().toISOString(),
                triggeredBy: 'api_call',
                severity: 'WARNING'
            });
            
            res.status(404).json({ error: 'Planning item niet gevonden' });
        }
    } catch (error) {
        console.error('Error deleting dagelijkse planning:', error);
        
        // Log API error - CRITICAL for debugging
        await forensicLogger.log('PLANNING', 'API_DELETE_PLANNING_ERROR', {
            planningId: req.params.id,
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/dagelijkse-planning/:id',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'api_error',
            severity: 'CRITICAL'
        });
        
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

// Test if weekly-1-4 works correctly
app.get('/api/debug/test-weekly-simple', (req, res) => {
    const pattern = 'weekly-1-4';
    const baseDate = '2025-06-17';
    const date = new Date(baseDate);
    
    // Manual calculation step by step
    const steps = [];
    steps.push(`Input: ${pattern} + ${baseDate}`);
    steps.push(`Base date object: ${date.toDateString()}`);
    steps.push(`Base day of week: ${date.getDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]})`);
    
    const parts = pattern.split('-');
    const interval = parseInt(parts[1]); // 1
    const targetDay = parseInt(parts[2]); // 4 (Thursday)
    steps.push(`Parsed: interval=${interval}, targetDay=${targetDay}`);
    
    const jsTargetDay = targetDay === 7 ? 0 : targetDay; // 4
    steps.push(`JS target day: ${jsTargetDay} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][jsTargetDay]})`);
    
    const currentDay = date.getDay(); // 2 (Tuesday)
    let daysToAdd = jsTargetDay - currentDay; // 4-2 = 2
    steps.push(`Days to add initially: ${daysToAdd}`);
    
    if (daysToAdd <= 0) {
        daysToAdd += 7;
        steps.push(`Adjusted days to add: ${daysToAdd}`);
    }
    
    const nextOccurrence = new Date(date);
    nextOccurrence.setDate(date.getDate() + daysToAdd);
    steps.push(`After adding days: ${nextOccurrence.toDateString()}`);
    
    if (interval > 1) {
        const extraWeeks = (interval - 1) * 7;
        nextOccurrence.setDate(nextOccurrence.getDate() + extraWeeks);
        steps.push(`After adding ${extraWeeks} extra days: ${nextOccurrence.toDateString()}`);
    }
    
    const result = nextOccurrence.toISOString().split('T')[0];
    steps.push(`Final result: ${result}`);
    
    res.json({
        pattern,
        baseDate,
        expected: '2025-06-19',
        result,
        correct: result === '2025-06-19',
        steps
    });
});

// Debug endpoint for detailed weekly calculation
app.get('/api/debug/weekly-calc/:pattern/:baseDate', (req, res) => {
    const { pattern, baseDate } = req.params;
    const date = new Date(baseDate);
    
    if (pattern.startsWith('weekly-')) {
        const parts = pattern.split('-');
        const interval = parseInt(parts[1]);
        const targetDay = parseInt(parts[2]);
        const jsTargetDay = targetDay === 7 ? 0 : targetDay;
        const currentDay = date.getDay();
        let daysToAdd = jsTargetDay - currentDay;
        
        const originalDaysToAdd = daysToAdd;
        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }
        
        const nextOccurrence = new Date(date);
        nextOccurrence.setDate(date.getDate() + daysToAdd);
        
        const beforeInterval = nextOccurrence.toISOString().split('T')[0];
        
        // Add interval weeks
        if (interval > 1) {
            nextOccurrence.setDate(nextOccurrence.getDate() + (interval - 1) * 7);
        }
        
        const result = nextOccurrence.toISOString().split('T')[0];
        
        res.json({
            pattern,
            baseDate,
            baseDateObj: date.toDateString(),
            baseDayOfWeek: currentDay,
            targetDay,
            jsTargetDay,
            originalDaysToAdd,
            adjustedDaysToAdd: daysToAdd,
            beforeInterval,
            interval,
            extraWeeks: interval > 1 ? (interval - 1) : 0,
            finalResult: result
        });
    } else {
        res.json({ error: 'Not a weekly pattern' });
    }
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
        
        // Handle simple Dutch patterns first
        if (pattern === 'dagelijks') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 1);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'werkdagen') {
            // Find next weekday (Monday to Friday)
            const nextDateObj = new Date(date);
            do {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            } while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6); // Skip weekends
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'wekelijks') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 7);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'maandelijks') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 1);
            
            // Handle months with fewer days (e.g., day 31 in February)
            if (nextDateObj.getDate() !== originalDay) {
                // Set to last day of target month if original day doesn't exist
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'jaarlijks') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            const originalMonth = date.getMonth();
            nextDateObj.setFullYear(date.getFullYear() + 1);
            
            // Handle leap year issues (e.g., Feb 29 in non-leap year)
            if (nextDateObj.getDate() !== originalDay && originalMonth === 1 && originalDay === 29) {
                // Feb 29 in non-leap year becomes Feb 28
                nextDateObj.setDate(28);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'om-de-dag') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 2);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '2-weken') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 14);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '3-weken') {
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + 21);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '2-maanden') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 2);
            
            // Handle months with fewer days
            if (nextDateObj.getDate() !== originalDay) {
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '3-maanden') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 3);
            
            // Handle months with fewer days
            if (nextDateObj.getDate() !== originalDay) {
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === '6-maanden') {
            const nextDateObj = new Date(date);
            const originalDay = date.getDate();
            nextDateObj.setMonth(date.getMonth() + 6);
            
            // Handle months with fewer days
            if (nextDateObj.getDate() !== originalDay) {
                nextDateObj.setDate(0);
            }
            
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].includes(pattern)) {
            // Specific weekdays
            const weekdays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
            const targetDay = weekdays.indexOf(pattern);
            const currentDay = date.getDay();
            let daysToAdd = targetDay - currentDay;
            
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
            
            const nextDateObj = new Date(date);
            nextDateObj.setDate(date.getDate() + daysToAdd);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-dag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-dag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 2);
            nextDateObj.setDate(0); // Last day of previous month
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 1);
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-maand') {
            const nextDateObj = new Date(date);
            nextDateObj.setMonth(date.getMonth() + 2);
            nextDateObj.setDate(0); // Last day of next month
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-dag-jaar') {
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-dag-jaar') {
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(11); // December
            nextDateObj.setDate(31);
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'eerste-werkdag-jaar') {
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(0); // January
            nextDateObj.setDate(1);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() + 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern === 'laatste-werkdag-jaar') {
            const nextDateObj = new Date(date);
            nextDateObj.setFullYear(date.getFullYear() + 1);
            nextDateObj.setMonth(11); // December
            nextDateObj.setDate(31);
            while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                nextDateObj.setDate(nextDateObj.getDate() - 1);
            }
            nextDate = nextDateObj.toISOString().split('T')[0];
        } else if (pattern.startsWith('eerste-') && pattern.endsWith('-maand')) {
            // Handle eerste-weekdag-maand patterns
            const weekdayName = pattern.replace('eerste-', '').replace('-maand', '');
            const weekdays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
            const targetWeekday = weekdays.indexOf(weekdayName);
            
            if (targetWeekday !== -1) {
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + 1);
                nextDateObj.setDate(1);
                
                // Find the first occurrence of the target weekday in the month
                while (nextDateObj.getDay() !== targetWeekday) {
                    nextDateObj.setDate(nextDateObj.getDate() + 1);
                }
                
                nextDate = nextDateObj.toISOString().split('T')[0];
            }
        } else if (pattern.startsWith('laatste-') && pattern.endsWith('-maand')) {
            // Handle laatste-weekdag-maand patterns
            const weekdayName = pattern.replace('laatste-', '').replace('-maand', '');
            const weekdays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
            const targetWeekday = weekdays.indexOf(weekdayName);
            
            if (targetWeekday !== -1) {
                const nextDateObj = new Date(date);
                nextDateObj.setMonth(date.getMonth() + 2);
                nextDateObj.setDate(0); // Last day of the next month
                
                // Go backwards to find the last occurrence of the target weekday
                while (nextDateObj.getDay() !== targetWeekday) {
                    nextDateObj.setDate(nextDateObj.getDate() - 1);
                }
                
                nextDate = nextDateObj.toISOString().split('T')[0];
            }
        } else if (pattern.startsWith('daily-')) {
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
            console.log('🐛 ENTERING WEEKLY SECTION');
            // Pattern: weekly-interval-day (e.g., weekly-1-4 = every week on Thursday)
            const parts = pattern.split('-');
            console.log('🐛 PARTS:', parts);
            if (parts.length === 3) {
                const interval = parseInt(parts[1]);
                const targetDay = parseInt(parts[2]);
                console.log('🐛 PARSED:', { interval, targetDay });
                
                // Normal logic
                const jsTargetDay = targetDay === 7 ? 0 : targetDay;
                const currentDay = date.getDay();
                let daysToAdd = jsTargetDay - currentDay;
                
                if (daysToAdd <= 0) {
                    daysToAdd += 7;
                }
                
                const nextOccurrence = new Date(date);
                nextOccurrence.setDate(date.getDate() + daysToAdd);
                
                // Add interval weeks
                if (interval > 1) {
                    nextOccurrence.setDate(nextOccurrence.getDate() + (interval - 1) * 7);
                }
                
                nextDate = nextOccurrence.toISOString().split('T')[0];
                console.log('🐛 WEEKLY RESULT:', nextDate);
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
                            nextDate = nextDateObj.toISOString().split('T')[0];
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
                                        // Found the nth occurrence, set nextDate
                                        nextDate = nextDateObj.toISOString().split('T')[0];
                                        break;
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
                    }
                }
            }
        } else if (pattern.startsWith('yearly-special-')) {
            // Pattern: yearly-special-type-interval (e.g., yearly-special-first-workday-1)
            const parts = pattern.split('-');
            console.log('🐛 Yearly special parts:', parts);
            if (parts.length >= 4) {
                const specialType = parts.slice(2, -1).join('-'); // Everything except 'yearly', 'special' and interval
                const interval = parseInt(parts[parts.length - 1]);
                console.log('🐛 Special type:', specialType, 'interval:', interval);
                
                if (!isNaN(interval) && interval > 0) {
                    const nextDateObj = new Date(date);
                    nextDateObj.setFullYear(date.getFullYear() + interval);
                    
                    if (specialType === 'first-workday') {
                        console.log('🐛 Processing first-workday');
                        // First workday of the year
                        nextDateObj.setMonth(0); // January
                        nextDateObj.setDate(1);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() + 1);
                        }
                        console.log('🐛 First workday result:', nextDateObj.toISOString().split('T')[0]);
                    } else if (specialType === 'last-workday') {
                        console.log('🐛 Processing last-workday');
                        // Last workday of the year
                        nextDateObj.setMonth(11); // December
                        nextDateObj.setDate(31);
                        while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6) {
                            nextDateObj.setDate(nextDateObj.getDate() - 1);
                        }
                        console.log('🐛 Last workday result:', nextDateObj.toISOString().split('T')[0]);
                    }
                    
                    nextDate = nextDateObj.toISOString().split('T')[0];
                    console.log('🐛 Final nextDate:', nextDate);
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
        
        // For test endpoint, we skip the "ensure future date" logic
        // so tests can get exact calculations regardless of current date
        console.log(`✅ Server: Calculated date for testing: ${nextDate}`);
        
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

// Debug endpoint for mind dump table
app.get('/api/debug/mind-dump-table', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database pool not available' });
        }

        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'mind_dump_preferences'
        `);
        
        const tableExists = tableCheck.rows.length > 0;
        
        let tableData = [];
        if (tableExists) {
            const dataResult = await pool.query('SELECT * FROM mind_dump_preferences LIMIT 5');
            tableData = dataResult.rows;
        }

        res.json({
            tableExists,
            tableData,
            userId: req.session.user.id
        });
    } catch (error) {
        console.error('Debug mind dump table error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mind dump preferences endpoints (BEFORE 404 handler!)
app.get('/api/mind-dump/preferences', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            console.error('Mind dump GET: Database pool not available');
            return res.status(500).json({ error: 'Database not available' });
        }

        const userId = req.session.user.id;
        console.log('Mind dump GET: Loading preferences for user:', userId);
        
        // First ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mind_dump_preferences (
                user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                preferences JSONB NOT NULL DEFAULT '{}',
                custom_words JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const result = await pool.query(
            'SELECT preferences, custom_words FROM mind_dump_preferences WHERE user_id = $1',
            [userId]
        );

        console.log('Mind dump GET: Query result rows:', result.rows.length);
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log('Mind dump GET: Found preferences for user');
            res.json({
                preferences: row.preferences || {},
                customWords: row.custom_words || []
            });
        } else {
            console.log('Mind dump GET: No preferences found, returning defaults');
            // Return empty for new users
            res.json({
                preferences: {},
                customWords: []
            });
        }
    } catch (error) {
        console.error('Error loading mind dump preferences:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.post('/api/mind-dump/preferences', requireAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: 'Database pool not available' });
        }

        const userId = req.session.user.id;
        const { preferences, customWords } = req.body;

        // First ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mind_dump_preferences (
                user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                preferences JSONB NOT NULL DEFAULT '{}',
                custom_words JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Upsert preferences
        await pool.query(`
            INSERT INTO mind_dump_preferences (user_id, preferences, custom_words, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET 
                preferences = EXCLUDED.preferences,
                custom_words = EXCLUDED.custom_words,
                updated_at = NOW()
        `, [userId, JSON.stringify(preferences), JSON.stringify(customWords)]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving mind dump preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========================================
// ADMIN API ENDPOINTS
// ========================================

// Admin Users Statistics
app.get('/api/admin/users', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Total users
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const total = parseInt(totalResult.rows[0].count);

        // Active users (logged in last 30 days)
        const activeResult = await pool.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE laatste_login > NOW() - INTERVAL '30 days'
        `);
        const active = parseInt(activeResult.rows[0].count);

        // New users today
        const newTodayResult = await pool.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE DATE(aangemaakt) = CURRENT_DATE
        `);
        const newToday = parseInt(newTodayResult.rows[0].count);

        // Recent users with task counts (more detailed info for table)
        const recentResult = await pool.query(`
            SELECT u.id, u.naam, u.email, u.aangemaakt, u.laatste_login, 
                   COUNT(t.id) as task_count,
                   COUNT(CASE WHEN t.afgewerkt IS NULL THEN 1 END) as active_tasks,
                   COUNT(CASE WHEN t.afgewerkt IS NOT NULL THEN 1 END) as completed_tasks
            FROM users u
            LEFT JOIN taken t ON u.id = t.user_id
            GROUP BY u.id, u.naam, u.email, u.aangemaakt, u.laatste_login
            ORDER BY u.laatste_login DESC NULLS LAST, u.aangemaakt DESC
            LIMIT 20
        `);

        res.json({
            total,
            active,
            newToday,
            recent: recentResult.rows.map(user => ({
                ...user,
                name: user.naam, // Add name field for consistency
                created_at: user.aangemaakt, // Add created_at field for consistency
                last_login: user.laatste_login, // Add last_login field for consistency
                task_count: parseInt(user.task_count),
                active_tasks: parseInt(user.active_tasks),
                completed_tasks: parseInt(user.completed_tasks)
            }))
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Tasks Statistics
app.get('/api/admin/tasks', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Total tasks
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM taken');
        const total = parseInt(totalResult.rows[0].count);

        // Completed tasks (tasks with afgewerkt timestamp)
        const completedResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken WHERE afgewerkt IS NOT NULL
        `);
        const completed = parseInt(completedResult.rows[0].count);

        // Recurring tasks
        const recurringResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken WHERE herhaling_actief = true
        `);
        const recurring = parseInt(recurringResult.rows[0].count);

        // Tasks by list
        const byListResult = await pool.query(`
            SELECT lijst as list_name, COUNT(*) as count
            FROM taken
            GROUP BY lijst
            ORDER BY count DESC
        `);

        res.json({
            total,
            completed,
            recurring,
            byList: byListResult.rows
        });
    } catch (error) {
        console.error('Admin tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin System Statistics
app.get('/api/admin/system', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Database size estimation
        const sizeResult = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                   pg_database_size(current_database()) as size_bytes
        `);

        // Total records across all tables
        const tablesResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        let totalRecords = 0;
        const tableDetails = [];
        for (const table of tablesResult.rows) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
                const count = parseInt(countResult.rows[0].count);
                totalRecords += count;
                tableDetails.push({ table_name: table.table_name, count });
            } catch (error) {
                console.log(`Skipping table ${table.table_name}: ${error.message}`);
            }
        }

        // Daily growth (tasks created today)
        const dailyGrowthResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken WHERE DATE(aangemaakt) = CURRENT_DATE
        `);
        const dailyGrowth = parseInt(dailyGrowthResult.rows[0].count);

        res.json({
            dbSize: sizeResult.rows[0].size_bytes,
            totalRecords,
            dailyGrowth,
            tables: tableDetails
        });
    } catch (error) {
        console.error('Admin system error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Insights
app.get('/api/admin/insights', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Average tasks per day (last 30 days)
        const tasksPerDayResult = await pool.query(`
            SELECT AVG(daily_count) as avg_tasks
            FROM (
                SELECT DATE(aangemaakt) as date, COUNT(*) as daily_count
                FROM taken
                WHERE aangemaakt > NOW() - INTERVAL '30 days'
                GROUP BY DATE(aangemaakt)
            ) daily_stats
        `);
        const tasksPerDay = Math.round(tasksPerDayResult.rows[0].avg_tasks || 0);

        // Completion rate
        const completionResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NOT NULL) * 100.0 / 
                NULLIF((SELECT COUNT(*) FROM taken), 0) as completion_rate
        `);
        const completionRate = Math.round(completionResult.rows[0].completion_rate || 0);

        // Productivity score (tasks completed per active user)
        const productivityResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM taken WHERE afgewerkt IS NOT NULL) * 1.0 /
                NULLIF((SELECT COUNT(*) FROM users WHERE laatste_login > NOW() - INTERVAL '30 days'), 0) as productivity
        `);
        const productivityScore = Math.round(productivityResult.rows[0].productivity || 0);

        res.json({
            tasksPerDay,
            completionRate,
            productivityScore
        });
    } catch (error) {
        console.error('Admin insights error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Monitoring
app.get('/api/admin/monitoring', async (req, res) => {
    try {
        const status = pool ? 'Healthy' : 'Database Error';
        const uptime = process.uptime();
        const uptimeStr = Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm';

        // Real error count from tracked errors
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const errors24h = errorLogs.filter(error => 
            new Date(error.timestamp).getTime() > twentyFourHoursAgo
        ).length;

        res.json({
            status,
            uptime: uptimeStr,
            errors24h,
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
        });
    } catch (error) {
        console.error('Admin monitoring error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Popular Projects
app.get('/api/admin/projects', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        const result = await pool.query(`
            SELECT p.naam as name, 
                   COUNT(t.id) as task_count,
                   COUNT(DISTINCT t.user_id) as user_count,
                   COALESCE(
                       (COUNT(CASE WHEN t.afgewerkt IS NOT NULL THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(t.id), 0)), 0
                   ) as completion_rate
            FROM projecten p
            LEFT JOIN taken t ON p.naam = t.project
            GROUP BY p.naam
            HAVING COUNT(t.id) > 0
            ORDER BY task_count DESC
            LIMIT 20
        `);

        res.json({
            popular: result.rows.map(row => ({
                ...row,
                completion_rate: Math.round(row.completion_rate)
            }))
        });
    } catch (error) {
        console.error('Admin projects error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Popular Contexts
app.get('/api/admin/contexts', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        const result = await pool.query(`
            SELECT c.naam as name,
                   COUNT(t.id) as task_count,
                   COUNT(DISTINCT t.user_id) as user_count,
                   COALESCE(AVG(t.duur), 0) as avg_duration
            FROM contexten c
            LEFT JOIN taken t ON c.naam = t.context
            GROUP BY c.naam
            HAVING COUNT(t.id) > 0
            ORDER BY task_count DESC
            LIMIT 20
        `);

        res.json({
            popular: result.rows.map(row => ({
                ...row,
                avg_duration: Math.round(row.avg_duration)
            }))
        });
    } catch (error) {
        console.error('Admin contexts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Error Logs (real-time from server tracking)
app.get('/api/admin/errors', async (req, res) => {
    try {
        res.json({
            recent: errorLogs.map(error => ({
                timestamp: error.timestamp,
                endpoint: error.endpoint,
                message: `${error.statusCode}: ${error.message.substring(0, 100)}`,
                user_email: null, // Could be enhanced to track actual user
                method: error.method,
                statusCode: error.statusCode
            }))
        });
    } catch (error) {
        console.error('Admin errors error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin API Usage Statistics (real-time from server tracking)
app.get('/api/admin/api-usage', async (req, res) => {
    try {
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        
        const endpoints = Array.from(apiStats.entries())
            .map(([endpoint, stats]) => ({
                endpoint: endpoint.replace(/GET |POST |PUT |DELETE /, ''),
                calls_24h: stats.calls, // For now all calls (could filter by time)
                avg_response_time: stats.calls > 0 ? Math.round(stats.totalTime / stats.calls) : 0,
                error_count: stats.errors,
                last_called: stats.lastCalled
            }))
            .filter(stat => stat.calls_24h > 0)
            .sort((a, b) => b.calls_24h - a.calls_24h)
            .slice(0, 20); // Top 20 endpoints

        res.json({
            endpoints,
            totalRequests: Array.from(apiStats.values()).reduce((sum, stat) => sum + stat.calls, 0),
            totalErrors: Array.from(apiStats.values()).reduce((sum, stat) => sum + stat.errors, 0)
        });
    } catch (error) {
        console.error('Admin API usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Email Statistics
app.get('/api/admin/email-stats', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Total email imports (tasks with opmerkingen suggesting email origin)
        const totalResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken 
            WHERE opmerkingen LIKE '%Email import%' 
               OR opmerkingen LIKE '%Datum:%' 
               OR opmerkingen LIKE '%Duur:%'
        `);
        const total = parseInt(totalResult.rows[0].count);

        // This week
        const thisWeekResult = await pool.query(`
            SELECT COUNT(*) as count FROM taken 
            WHERE (opmerkingen LIKE '%Email import%' 
                   OR opmerkingen LIKE '%Datum:%' 
                   OR opmerkingen LIKE '%Duur:%')
              AND aangemaakt > NOW() - INTERVAL '7 days'
        `);
        const thisWeek = parseInt(thisWeekResult.rows[0].count);

        // Success rate (assuming 98% for now, in production track actual failures)
        const successRate = 98;

        res.json({
            total,
            thisWeek,
            successRate
        });
    } catch (error) {
        console.error('Admin email stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Export Data
app.get('/api/admin/export', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Get comprehensive data for CSV export
        const users = await pool.query(`
            SELECT u.id, u.naam, u.email, u.aangemaakt, u.laatste_login,
                   COUNT(t.id) as total_tasks,
                   COUNT(CASE WHEN t.afgewerkt IS NOT NULL THEN 1 END) as completed_tasks
            FROM users u
            LEFT JOIN taken t ON u.id = t.user_id
            GROUP BY u.id, u.naam, u.email, u.aangemaakt, u.laatste_login
            ORDER BY u.aangemaakt DESC
        `);

        // Convert to CSV
        const csvHeaders = ['User ID', 'Name', 'Email', 'Registered', 'Last Login', 'Total Tasks', 'Completed Tasks'];
        let csvContent = csvHeaders.join(',') + '\n';

        users.rows.forEach(user => {
            const row = [
                user.id,
                `"${user.naam}"`,
                user.email,
                user.aangemaakt,
                user.laatste_login || '',
                user.total_tasks,
                user.completed_tasks
            ];
            csvContent += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tickedify-export.csv');
        res.send(csvContent);
    } catch (error) {
        console.error('Admin export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint voor admin data onderzoek
app.get('/api/admin/debug', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Alle unieke lijst waarden
        const lijstResult = await pool.query('SELECT DISTINCT lijst, COUNT(*) as count FROM taken GROUP BY lijst ORDER BY count DESC');
        
        // Sample taken om te zien wat erin staat
        const sampleResult = await pool.query('SELECT id, tekst, lijst, afgewerkt FROM taken LIMIT 10');
        
        // Check database schema voor taken tabel
        const schemaResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'taken' 
            ORDER BY ordinal_position
        `);

        res.json({
            lijstWaarden: lijstResult.rows,
            sampleTaken: sampleResult.rows,
            databaseSchema: schemaResult.rows
        });
    } catch (error) {
        console.error('Admin debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Maintenance
app.post('/api/admin/maintenance', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });

        // Perform maintenance tasks
        let cleanedCount = 0;

        // Clean up orphaned records (example: tasks without users)
        const cleanupResult = await pool.query(`
            DELETE FROM taken WHERE user_id NOT IN (SELECT id FROM users)
        `);
        cleanedCount += cleanupResult.rowCount || 0;

        // Update database statistics
        await pool.query('ANALYZE');

        res.json({
            success: true,
            message: `Onderhoud voltooid. ${cleanedCount} onnodige records verwijderd.`
        });
    } catch (error) {
        console.error('Admin maintenance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== V1 API - URL-based endpoints for external integrations =====
// These endpoints use import codes for authentication instead of sessions

// Test endpoint to verify V1 API is accessible
app.get('/api/v1/test', (req, res) => {
    res.json({
        message: 'V1 API is working',
        version: '0.6.10',
        timestamp: new Date().toISOString()
    });
});

// Quick Add Task via URL (for Siri Shortcuts, automations, etc.)
app.get('/api/v1/quick-add', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // Log incoming request for debugging
        console.log('🔗 Quick-add request received:', {
            url: req.url,
            query: req.query,
            headers: req.headers
        });

        // Extract parameters from URL
        const { code, text, project, context, date, duur } = req.query;

        // Validate required fields
        if (!code || !text) {
            return res.status(400).json({
                error: 'Missing required parameters',
                received: req.query,
                required: ['code', 'text'],
                optional: ['project', 'context', 'date', 'duur'],
                example: '/api/v1/quick-add?code=abc123&text=Buy milk&project=Shopping'
            });
        }

        // Find user by import code
        const user = await db.getUserByImportCode(code);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid import code',
                hint: 'Use your personal import code from Tickedify settings'
            });
        }

        const userId = user.id;
        console.log(`🔗 Quick-add task via URL for user ${user.email}`);

        // Build task data
        const taskData = {
            text: text.trim(),
            userId: userId,
            lijst: 'inbox', // Always add to inbox
            duur: duur ? parseInt(duur) : null
        };

        // Handle project
        if (project) {
            taskData.projectId = await findOrCreateProject(project, userId);
        }

        // Handle context
        if (context) {
            taskData.contextId = await findOrCreateContext(context, userId);
        }

        // Handle date
        if (date) {
            try {
                // Support multiple date formats
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    taskData.verschijndatum = parsedDate.toISOString().split('T')[0];
                }
            } catch (e) {
                console.log('Could not parse date:', date);
            }
        }

        // Create the task
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const result = await pool.query(`
            INSERT INTO taken (
                id, tekst, lijst, aangemaakt, project_id, context_id, 
                verschijndatum, duur, type, user_id
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            taskId,
            taskData.text,
            'inbox',
            taskData.projectId || null,
            taskData.contextId || null,
            taskData.verschijndatum || null,
            taskData.duur || null,
            'taak',
            userId
        ]);

        const createdTask = result.rows[0];
        console.log(`✅ Task created via quick-add: ${taskId}`);

        // Return success with task details
        res.json({
            success: true,
            message: 'Task added successfully',
            task: {
                id: createdTask.id,
                text: createdTask.tekst,
                project: project || null,
                context: context || null,
                date: createdTask.verschijndatum || null,
                duration: createdTask.duur || null,
                list: createdTask.lijst
            }
        });

    } catch (error) {
        console.error('Quick-add error:', error);
        res.status(500).json({ 
            error: 'Failed to add task',
            details: error.message 
        });
    }
});

// Debug endpoint for recurring tasks issue
app.get('/api/debug/recurring-tasks-analysis', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        // Get recently completed tasks with recurring settings
        const recentlyCompletedQuery = `
            SELECT 
                id, tekst, lijst, project_id, context_id, 
                verschijndatum, afgewerkt, 
                herhaling_type, herhaling_actief,
                opmerkingen
            FROM taken 
            WHERE afgewerkt >= NOW() - INTERVAL '3 days'
            AND herhaling_actief = true
            AND herhaling_type IS NOT NULL
            ORDER BY afgewerkt DESC
        `;
        
        const completedResult = await pool.query(recentlyCompletedQuery);
        
        // For each completed recurring task, check if a new one was created
        const analysis = [];
        
        for (const task of completedResult.rows) {
            // Look for potential new tasks created around the same time
            const searchQuery = `
                SELECT id, tekst, verschijndatum, aangemaakt
                FROM taken
                WHERE tekst = $1
                AND lijst = $2
                AND aangemaakt >= $3
                AND afgewerkt IS NULL
                ORDER BY aangemaakt DESC
                LIMIT 1
            `;
            
            const newTaskResult = await pool.query(searchQuery, [
                task.tekst,
                task.lijst,
                task.afgewerkt
            ]);
            
            analysis.push({
                completedTask: {
                    id: task.id,
                    tekst: task.tekst,
                    lijst: task.lijst,
                    afgewerkt: task.afgewerkt,
                    herhaling_type: task.herhaling_type,
                    verschijndatum: task.verschijndatum
                },
                newTaskCreated: newTaskResult.rows.length > 0,
                newTask: newTaskResult.rows[0] || null
            });
        }
        
        // Also check for orphaned recurring tasks (active but not completed)
        const orphanedQuery = `
            SELECT id, tekst, lijst, verschijndatum, herhaling_type, aangemaakt
            FROM taken
            WHERE herhaling_actief = true
            AND afgewerkt IS NULL
            AND verschijndatum < CURRENT_DATE
            ORDER BY verschijndatum DESC
            LIMIT 20
        `;
        
        const orphanedResult = await pool.query(orphanedQuery);
        
        res.json({
            summary: {
                recentlyCompletedRecurring: completedResult.rows.length,
                successfullyRecreated: analysis.filter(a => a.newTaskCreated).length,
                failed: analysis.filter(a => !a.newTaskCreated).length,
                orphanedRecurringTasks: orphanedResult.rows.length
            },
            failedRecreations: analysis.filter(a => !a.newTaskCreated),
            orphanedTasks: orphanedResult.rows,
            allAnalysis: analysis
        });
        
    } catch (error) {
        console.error('Debug recurring tasks analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to find task by ID across all tables
app.get('/api/debug/find-task/:taskId', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskId } = req.params;
        
        // Search in taken table
        const taskResult = await pool.query('SELECT * FROM taken WHERE id = $1', [taskId]);
        
        // Also check if this task ID appears in any planning
        const planningResult = await pool.query('SELECT * FROM dagelijkse_planning WHERE actie_id = $1', [taskId]);
        
        res.json({
            task_id: taskId,
            found_in_taken: taskResult.rows,
            referenced_in_planning: planningResult.rows
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to cleanup orphaned planning items
app.post('/api/debug/cleanup-orphaned-planning', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const userId = getCurrentUserId(req);
        
        // Log cleanup operation start - CRITICAL for debugging mass deletions
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_START', {
            userId: userId,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestTimestamp: new Date().toISOString(),
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        // Find planning items that reference completed tasks
        const completedTasksPlanning = await pool.query(`
            SELECT dp.id, dp.datum, dp.uur, dp.naam, dp.actie_id, t.afgewerkt
            FROM dagelijkse_planning dp
            JOIN taken t ON dp.actie_id = t.id
            WHERE dp.actie_id IS NOT NULL 
            AND t.afgewerkt IS NOT NULL
            ORDER BY dp.datum DESC, dp.uur
        `);
        
        // Find planning items that reference non-existent tasks
        const orphanedPlanning = await pool.query(`
            SELECT dp.id, dp.datum, dp.uur, dp.naam, dp.actie_id
            FROM dagelijkse_planning dp
            LEFT JOIN taken t ON dp.actie_id = t.id
            WHERE dp.actie_id IS NOT NULL 
            AND t.id IS NULL
            ORDER BY dp.datum DESC, dp.uur
        `);
        
        const totalToClean = orphanedPlanning.rows.length + completedTasksPlanning.rows.length;
        
        // Log cleanup analysis
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_ANALYSIS', {
            userId: userId,
            completedTasksPlanningCount: completedTasksPlanning.rows.length,
            orphanedPlanningCount: orphanedPlanning.rows.length,
            totalToClean: totalToClean,
            completedTasksPlanningIds: completedTasksPlanning.rows.map(row => row.id),
            orphanedPlanningIds: orphanedPlanning.rows.map(row => row.id),
            endpoint: '/api/debug/cleanup-orphaned-planning',
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        if (totalToClean === 0) {
            await forensicLogger.log('PLANNING', 'BULK_CLEANUP_NO_ITEMS', {
                userId: userId,
                endpoint: '/api/debug/cleanup-orphaned-planning',
                responseTimestamp: new Date().toISOString(),
                triggeredBy: 'debug_cleanup'
            });
            
            return res.json({
                message: 'No planning items to clean',
                cleaned: 0,
                completed_tasks_planning: [],
                orphaned_items: []
            });
        }
        
        // Delete planning items for completed tasks
        const deleteCompletedResult = await pool.query(`
            DELETE FROM dagelijkse_planning
            WHERE id IN (
                SELECT dp.id
                FROM dagelijkse_planning dp
                JOIN taken t ON dp.actie_id = t.id
                WHERE dp.actie_id IS NOT NULL 
                AND t.afgewerkt IS NOT NULL
            )
        `);
        
        // Log completed tasks cleanup
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_COMPLETED_TASKS', {
            userId: userId,
            deletedCount: deleteCompletedResult.rowCount,
            deletedItems: completedTasksPlanning.rows,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        // Delete orphaned planning items
        const deleteOrphanedResult = await pool.query(`
            DELETE FROM dagelijkse_planning
            WHERE id IN (
                SELECT dp.id
                FROM dagelijkse_planning dp
                LEFT JOIN taken t ON dp.actie_id = t.id
                WHERE dp.actie_id IS NOT NULL 
                AND t.id IS NULL
            )
        `);
        
        // Log orphaned items cleanup
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_ORPHANED_ITEMS', {
            userId: userId,
            deletedCount: deleteOrphanedResult.rowCount,
            deletedItems: orphanedPlanning.rows,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        const totalCleaned = deleteCompletedResult.rowCount + deleteOrphanedResult.rowCount;
        
        // Log cleanup completion
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_COMPLETE', {
            userId: userId,
            cleanedCompleted: deleteCompletedResult.rowCount,
            cleanedOrphaned: deleteOrphanedResult.rowCount,
            totalCleaned: totalCleaned,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            responseTimestamp: new Date().toISOString(),
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        res.json({
            message: 'Cleaned up planning items',
            completed_tasks_planning: completedTasksPlanning.rows,
            orphaned_items: orphanedPlanning.rows,
            cleaned_completed: deleteCompletedResult.rowCount,
            cleaned_orphaned: deleteOrphanedResult.rowCount,
            total_cleaned: totalCleaned
        });
        
    } catch (error) {
        // Log cleanup error
        await forensicLogger.log('PLANNING', 'BULK_CLEANUP_ERROR', {
            userId: getCurrentUserId(req),
            error: error.message,
            stack: error.stack,
            endpoint: '/api/debug/cleanup-orphaned-planning',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            errorTimestamp: new Date().toISOString(),
            triggeredBy: 'debug_cleanup',
            severity: 'CRITICAL'
        });
        
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to check recent planning data
app.get('/api/debug/recent-planning', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        // Get all planning data from the last 7 days
        const recentPlanning = await pool.query(`
            SELECT datum, COUNT(*) as item_count, 
                   array_agg(DISTINCT type) as types,
                   MIN(aangemaakt) as earliest_created,
                   MAX(aangemaakt) as latest_created
            FROM dagelijkse_planning 
            WHERE datum >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY datum
            ORDER BY datum DESC
        `);
        
        // Get all planning items for today specifically
        const todayPlanning = await pool.query(`
            SELECT id, datum, uur, type, naam, actie_id, aangemaakt
            FROM dagelijkse_planning 
            WHERE datum = CURRENT_DATE
            ORDER BY uur, positie
        `);
        
        // Check if any planning was deleted recently (if we had audit logs)
        const allPlanningCount = await pool.query('SELECT COUNT(*) as total FROM dagelijkse_planning');
        
        res.json({
            recent_planning_by_date: recentPlanning.rows,
            today_planning_items: todayPlanning.rows,
            total_planning_items_in_db: parseInt(allPlanningCount.rows[0].total),
            today_date: new Date().toISOString().split('T')[0]
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to test recovery
app.get('/api/debug/test-recovery/:taskId', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskId } = req.params;
        
        // Test 1: Check database connection
        const dbTest = await pool.query('SELECT NOW()');
        
        // Test 2: Find the task
        const taskResult = await pool.query(
            'SELECT id, tekst, herhaling_type, lijst FROM taken WHERE id = $1',
            [taskId]
        );
        
        // Test 3: Check table columns
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'taken'
            ORDER BY ordinal_position
        `);
        
        res.json({
            database_connected: true,
            database_time: dbTest.rows[0].now,
            task_found: taskResult.rows.length > 0,
            task_data: taskResult.rows[0] || null,
            table_columns: columnCheck.rows.map(r => r.column_name)
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Single task recovery endpoint
app.post('/api/taak/recover-recurring', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskId } = req.body;
        console.log('🔧 Recovery request for taskId:', taskId);
        
        if (!taskId) {
            return res.status(400).json({ error: 'taskId required' });
        }
        
        // Get the completed task
        const taskResult = await pool.query(
            'SELECT * FROM taken WHERE id = $1',
            [taskId]
        );
        
        console.log('📋 Found task rows:', taskResult.rows.length);
        
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const task = taskResult.rows[0];
        console.log('✅ Task data:', { id: task.id, tekst: task.tekst, herhaling_type: task.herhaling_type });
        
        // Create new task with proper date calculation
        const newTask = {
            tekst: task.tekst,
            lijst: task.lijst,
            projectId: task.project_id,
            contextId: task.context_id,
            duur: task.duur,
            herhalingActief: true,
            herhalingType: task.herhaling_type,
            opmerkingen: task.opmerkingen
        };
        
        // Calculate next date based on recurrence type
        let nextDate;
        if (task.herhaling_type === 'werkdagen') {
            // Find next weekday
            nextDate = new Date();
            do {
                nextDate.setDate(nextDate.getDate() + 1);
            } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
        } else if (task.herhaling_type === 'dagelijks') {
            nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 1);
        } else if (task.herhaling_type && task.herhaling_type.startsWith('weekly-')) {
            // Calculate proper weekly recurrence
            const parts = task.herhaling_type.split('-');
            const interval = parseInt(parts[1]) || 1;
            const targetDays = parts[2]?.split(',').map(Number) || [];
            
            nextDate = new Date(task.verschijndatum);
            nextDate.setDate(nextDate.getDate() + (interval * 7));
        } else {
            // Default to tomorrow
            nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 1);
        }
        
        newTask.verschijndatum = nextDate.toISOString().split('T')[0];
        
        // Insert directly using SQL
        const newTaskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // First check if herhaling columns exist
            const columnCheck = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'taken' 
                AND column_name IN ('herhaling_type', 'herhaling_actief', 'opmerkingen')
            `);
            
            const existingColumns = columnCheck.rows.map(r => r.column_name);
            console.log('🔍 Available columns:', existingColumns);
            
            // Build dynamic insert query based on available columns
            const columns = ['id', 'tekst', 'lijst', 'project_id', 'context_id', 'verschijndatum', 'duur', 'user_id', 'aangemaakt'];
            const values = [newTaskId, task.tekst, 'acties', task.project_id, task.context_id, newTask.verschijndatum, task.duur, task.user_id];
            const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', 'NOW()'];
            
            // Add optional columns if they exist
            if (existingColumns.includes('herhaling_type')) {
                columns.push('herhaling_type');
                values.push(task.herhaling_type);
                placeholders.push(`$${values.length}`);
            }
            
            if (existingColumns.includes('herhaling_actief')) {
                columns.push('herhaling_actief');
                values.push(true);
                placeholders.push(`$${values.length}`);
            }
            
            if (existingColumns.includes('opmerkingen')) {
                columns.push('opmerkingen');
                values.push(task.opmerkingen || '');
                placeholders.push(`$${values.length}`);
            }
            
            const insertQuery = `
                INSERT INTO taken (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
            `;
            
            console.log('📝 Insert query:', insertQuery);
            console.log('📊 Values:', values.slice(0, 8)); // Don't log all values for security
            
            await pool.query(insertQuery, values.slice(0, placeholders.filter(p => p.startsWith('$')).length));
            
            res.json({
                success: true,
                newTaskId: newTaskId,
                nextDate: newTask.verschijndatum
            });
        } catch (insertError) {
            console.error('Failed to insert recovered task:', insertError);
            console.error('Error details:', insertError.message);
            throw insertError;
        }
        
    } catch (error) {
        console.error('Recover recurring task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Recovery endpoint for missing recurring tasks
app.post('/api/debug/recover-recurring-tasks', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const { taskIds } = req.body;
        if (!taskIds || !Array.isArray(taskIds)) {
            return res.status(400).json({ error: 'taskIds array required' });
        }
        
        const recovered = [];
        const failed = [];
        
        for (const taskId of taskIds) {
            try {
                // Get the completed task
                const taskResult = await pool.query(
                    'SELECT * FROM taken WHERE id = $1',
                    [taskId]
                );
                
                if (taskResult.rows.length === 0) {
                    failed.push({ taskId, error: 'Task not found' });
                    continue;
                }
                
                const task = taskResult.rows[0];
                
                // Calculate next date based on pattern
                // For now, set to tomorrow as a simple recovery
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + 1);
                const nextDateString = nextDate.toISOString().split('T')[0];
                
                // Create new task WITH recurring properties preserved
                const newId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                const insertResult = await pool.query(`
                    INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, afgewerkt, user_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING id
                `, [
                    newId, task.tekst, new Date().toISOString(), task.lijst,
                    task.project_id, nextDateString + 'T00:00:00.000Z', task.context_id, task.duur, task.type,
                    task.herhaling_type, task.herhaling_waarde, task.herhaling_actief, task.opmerkingen, null, task.user_id
                ]);
                
                const newTaskResult = { id: insertResult.rows[0]?.id };
                
                if (newTaskResult.id) {
                    recovered.push({
                        originalTaskId: taskId,
                        newTaskId: newTaskResult.id,
                        newDate: nextDateString
                    });
                } else {
                    failed.push({ taskId, error: 'Failed to create new task' });
                }
                
            } catch (error) {
                failed.push({ taskId, error: error.message });
            }
        }
        
        res.json({
            success: true,
            recovered: recovered.length,
            failed: failed.length,
            details: { recovered, failed }
        });
        
    } catch (error) {
        console.error('Recover recurring tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fix recovered tasks that lost their recurring properties  
app.post('/api/debug/fix-missing-recurring-properties', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const userId = getCurrentUserId(req);
        
        // Find all completed recurring tasks from today
        const completedRecurringTasks = await pool.query(`
            SELECT * FROM taken 
            WHERE user_id = $1 
            AND herhaling_type IS NOT NULL 
            AND herhaling_actief = true 
            AND afgewerkt >= CURRENT_DATE
            ORDER BY afgewerkt DESC
        `, [userId]);
        
        // Find all active tasks created today that might be missing recurring properties
        const todaysTasks = await pool.query(`
            SELECT * FROM taken 
            WHERE user_id = $1 
            AND afgewerkt IS NULL 
            AND aangemaakt >= CURRENT_DATE
            AND (herhaling_type IS NULL OR herhaling_actief = false)
        `, [userId]);
        
        const fixed = [];
        
        // Try to match tasks by name and restore recurring properties
        for (const completedTask of completedRecurringTasks.rows) {
            const matchingTask = todaysTasks.rows.find(task => 
                task.tekst === completedTask.tekst && 
                (!task.herhaling_type || !task.herhaling_actief)
            );
            
            if (matchingTask) {
                await pool.query(`
                    UPDATE taken 
                    SET herhaling_type = $1, herhaling_waarde = $2, herhaling_actief = $3
                    WHERE id = $4 AND user_id = $5
                `, [
                    completedTask.herhaling_type,
                    completedTask.herhaling_waarde, 
                    completedTask.herhaling_actief,
                    matchingTask.id,
                    userId
                ]);
                
                fixed.push({
                    taskId: matchingTask.id,
                    taskName: matchingTask.tekst,
                    restoredRecurring: completedTask.herhaling_type
                });
            }
        }
        
        res.json({
            success: true,
            message: `Fixed ${fixed.length} tasks with missing recurring properties`,
            completedRecurringFound: completedRecurringTasks.rows.length,
            todaysTasksFound: todaysTasks.rows.length,
            fixed: fixed
        });
        
    } catch (error) {
        console.error('Fix recurring properties error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to list all users
app.get('/api/debug/users-info', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const users = await pool.query(`
            SELECT id, email, naam, rol, aangemaakt, actief, email_import_code
            FROM users 
            ORDER BY aangemaakt ASC
        `);
        
        res.json({
            total_users: users.rows.length,
            users: users.rows.map(user => ({
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol,
                aangemaakt: user.aangemaakt,
                actief: user.actief,
                has_import_code: !!user.email_import_code
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Test user switch endpoint for Claude testing
app.post('/api/debug/switch-test-user', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        const testUserEmail = 'test@example.com';
        
        // Get test user info
        const testUser = await pool.query(`
            SELECT id, email, naam, rol 
            FROM users 
            WHERE email = $1 AND actief = true
        `, [testUserEmail]);
        
        if (testUser.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Test user not found',
                hint: 'test@example.com user must exist and be active' 
            });
        }
        
        const user = testUser.rows[0];
        
        // Log the switch for forensic tracking
        await forensicLogger.logUserAction('TEST_USER_SWITCH', {
            userId: user.id,
            userEmail: user.email
        }, {
            endpoint: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            switchedFrom: 'Claude automated testing'
        });
        
        // Return test user session info
        res.json({
            success: true,
            testUser: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                rol: user.rol
            },
            message: 'Claude can now test with this user account',
            note: 'All subsequent API calls should use this user_id for testing'
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Direct database query for forensic logs (bypass logger)
app.get('/api/debug/forensic/raw-database', async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'Database not available' });
        
        // Check if forensic_logs table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'forensic_logs'
            ) as exists
        `);
        
        if (!tableExists.rows[0].exists) {
            return res.json({
                status: 'forensic_logs table does not exist',
                forensic_debug: process.env.FORENSIC_DEBUG,
                logger_enabled: forensicLogger.enabled
            });
        }
        
        // Get recent logs directly from database
        const logs = await pool.query(`
            SELECT * FROM forensic_logs 
            ORDER BY timestamp DESC 
            LIMIT 20
        `);
        
        res.json({
            status: 'forensic_logs table exists',
            forensic_debug: process.env.FORENSIC_DEBUG,
            logger_enabled: forensicLogger.enabled,
            total_logs: logs.rows.length,
            recent_logs: logs.rows
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            forensic_debug: process.env.FORENSIC_DEBUG,
            logger_enabled: forensicLogger.enabled
        });
    }
});

// Forensic logging analysis endpoints
app.get('/api/debug/forensic/recurring-events', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.hours) || 24;
        const taskId = req.query.taskId;
        
        const events = await forensicLogger.getRecurringTaskEvents(taskId, timeRange);
        
        res.json({
            timeRange: `${timeRange} hours`,
            totalEvents: events.length,
            events: events
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/forensic/planning-events', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.hours) || 24;
        
        const events = await forensicLogger.getPlanningEvents(timeRange);
        
        res.json({
            timeRange: `${timeRange} hours`,
            totalEvents: events.length,
            events: events
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404 handler - MUST be after all routes!
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