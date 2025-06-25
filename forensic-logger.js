/**
 * Forensic Logging System for Tickedify
 * Complete audit trail for debugging recurring tasks & planning disappearance
 * 
 * Environment variable: FORENSIC_DEBUG=true/false
 * When false: Zero performance impact, no logging
 * When true: Complete transaction logging to database
 */

const { Pool } = require('pg');

class ForensicLogger {
    constructor() {
        this.enabled = process.env.FORENSIC_DEBUG === 'true';
        this.pool = null;
        
        if (this.enabled) {
            this.initializeDatabase();
            console.log('🔍 Forensic logging ENABLED - All operations will be logged to database');
        } else {
            console.log('🔍 Forensic logging DISABLED - Zero performance impact');
        }
    }

    async initializeDatabase() {
        try {
            // Use same database connection as main app
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING,
                ssl: { rejectUnauthorized: false }
            });

            // Create forensic_logs table if it doesn't exist
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS forensic_logs (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    category VARCHAR(50) NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    data JSONB NOT NULL,
                    user_id VARCHAR(50),
                    endpoint VARCHAR(200),
                    ip_address INET,
                    user_agent TEXT
                )
            `);

            // Create index for faster queries
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_forensic_timestamp ON forensic_logs(timestamp);
                CREATE INDEX IF NOT EXISTS idx_forensic_category ON forensic_logs(category);
                CREATE INDEX IF NOT EXISTS idx_forensic_user ON forensic_logs(user_id);
            `);

            console.log('✅ Forensic logging database initialized');
        } catch (error) {
            console.error('Failed to initialize forensic logging database:', error);
            this.enabled = false; // Disable if database fails
        }
    }

    // Main logging function - returns immediately if disabled
    async log(category, action, data, context = {}) {
        if (!this.enabled || !this.pool) return; // Zero performance impact when disabled

        try {
            await this.pool.query(`
                INSERT INTO forensic_logs (category, action, data, user_id, endpoint, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                category,
                action,
                JSON.stringify({
                    ...data,
                    environment: process.env.NODE_ENV || 'unknown',
                    ...context
                }),
                data.userId || context.userId || null,
                context.endpoint || null,
                context.ip || null,
                context.userAgent || null
            ]);
        } catch (error) {
            console.error('Forensic logging failed (non-blocking):', error.message);
        }
    }

    // Specialized logging methods for key scenarios

    async logRecurringTaskOperation(action, taskData, context = {}) {
        await this.log('RECURRING_TASKS', action, {
            taskId: taskData.id,
            taskContent: {
                tekst: taskData.tekst,
                herhalingType: taskData.herhalingType || taskData.herhaling_type,
                herhalingActief: taskData.herhalingActief || taskData.herhaling_actief,
                herhalingWaarde: taskData.herhalingWaarde || taskData.herhaling_waarde,
                lijst: taskData.lijst,
                verschijndatum: taskData.verschijndatum,
                projectId: taskData.projectId || taskData.project_id,
                contextId: taskData.contextId || taskData.context_id,
                duur: taskData.duur,
                opmerkingen: taskData.opmerkingen
            },
            userId: taskData.userId || taskData.user_id,
            endpoint: context.endpoint,
            triggeredBy: context.triggeredBy, // 'user_action', 'system_cleanup', 'recurring_creation'
            ...context
        });
    }

    async logPlanningOperation(action, planningData, context = {}) {
        await this.log('PLANNING', action, {
            planningId: planningData.id,
            planningContent: {
                datum: planningData.datum,
                uur: planningData.uur,
                naam: planningData.naam,
                actie_id: planningData.actie_id,
                duur: planningData.duur,
                type: planningData.type
            },
            userId: planningData.user_id,
            endpoint: context.endpoint,
            bulkOperation: context.bulkOperation || false,
            itemsAffected: context.itemsAffected || 1,
            ...context
        });
    }

    async logUserAction(action, userData, context = {}) {
        await this.log('USER_ACTION', action, {
            userId: userData.userId,
            userEmail: userData.userEmail,
            endpoint: context.endpoint,
            userAgent: context.userAgent,
            ip: context.ip,
            ...context
        });
    }

    async logSystemEvent(action, eventData, context = {}) {
        await this.log('SYSTEM', action, {
            ...eventData,
            ...context
        });
    }

    // Analysis and recovery helper methods

    async getLogsForTimeRange(startTime, endTime, category = null) {
        if (!this.enabled || !this.pool) return [];

        try {
            let query = `
                SELECT id, timestamp, category, action, data, user_id, endpoint, ip_address, user_agent
                FROM forensic_logs 
                WHERE timestamp >= $1 AND timestamp <= $2
            `;
            const params = [startTime.toISOString(), endTime.toISOString()];

            if (category) {
                query += ` AND category = $3`;
                params.push(category);
            }

            query += ` ORDER BY timestamp ASC`;

            const result = await this.pool.query(query, params);
            
            return result.rows.map(row => ({
                id: row.id,
                timestamp: row.timestamp.toISOString(),
                category: row.category,
                action: row.action,
                data: row.data, // Already parsed JSON
                userId: row.user_id,
                endpoint: row.endpoint,
                ipAddress: row.ip_address,
                userAgent: row.user_agent
            }));
        } catch (error) {
            console.error('Failed to read forensic logs from database:', error);
            return [];
        }
    }

    async getRecurringTaskEvents(taskId = null, timeRange = 24) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (timeRange * 60 * 60 * 1000));
        
        const logs = await this.getLogsForTimeRange(startTime, endTime, 'RECURRING_TASKS');
        
        if (taskId) {
            return logs.filter(log => log.data.taskId === taskId);
        }
        
        return logs;
    }

    async getPlanningEvents(timeRange = 24) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (timeRange * 60 * 60 * 1000));
        
        return await this.getLogsForTimeRange(startTime, endTime, 'PLANNING');
    }

    // Express middleware for automatic request logging
    middleware() {
        return (req, res, next) => {
            if (!this.enabled) return next();

            const originalSend = res.send;
            const startTime = Date.now();
            
            res.send = function(data) {
                const responseTime = Date.now() - startTime;
                
                // Log significant operations
                if (req.method !== 'GET' || req.url.includes('/debug/')) {
                    forensicLogger.logUserAction('HTTP_REQUEST', {
                        userId: req.user?.id || 'anonymous',
                        userEmail: req.user?.email || 'unknown'
                    }, {
                        method: req.method,
                        endpoint: req.url,
                        statusCode: res.statusCode,
                        responseTime,
                        userAgent: req.get('User-Agent'),
                        ip: req.ip || req.connection.remoteAddress,
                        body: req.method !== 'GET' ? req.body : undefined
                    });
                }
                
                return originalSend.call(this, data);
            };
            
            next();
        };
    }
}

// Singleton instance
const forensicLogger = new ForensicLogger();

module.exports = forensicLogger;