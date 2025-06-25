/**
 * Forensic Logging System for Tickedify
 * Complete audit trail for debugging recurring tasks & planning disappearance
 * 
 * Environment variable: FORENSIC_DEBUG=true/false
 * When false: Zero performance impact, no logging
 * When true: Complete transaction logging with full content
 */

const fs = require('fs').promises;
const path = require('path');

class ForensicLogger {
    constructor() {
        this.enabled = process.env.FORENSIC_DEBUG === 'true';
        this.logDir = path.join(__dirname, 'forensic-logs');
        this.maxLogFiles = 50; // Keep last 50 log files
        
        if (this.enabled) {
            this.initializeLogDirectory();
            console.log('🔍 Forensic logging ENABLED - All operations will be logged');
        } else {
            console.log('🔍 Forensic logging DISABLED - Zero performance impact');
        }
    }

    async initializeLogDirectory() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create forensic log directory:', error);
        }
    }

    // Main logging function - returns immediately if disabled
    async log(category, action, data) {
        if (!this.enabled) return; // Zero performance impact when disabled

        const logEntry = {
            timestamp: new Date().toISOString(),
            category, // 'RECURRING_TASKS', 'PLANNING', 'USER_ACTION', 'SYSTEM'
            action,   // 'CREATE', 'DELETE', 'UPDATE', 'CLEANUP', etc.
            data: {
                ...data,
                environment: process.env.NODE_ENV || 'unknown',
                userAgent: data.userAgent || 'server-side'
            }
        };

        try {
            await this.writeLogEntry(logEntry);
        } catch (error) {
            console.error('Forensic logging failed (non-blocking):', error.message);
        }
    }

    async writeLogEntry(entry) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const logFile = path.join(this.logDir, `forensic-${date}.jsonl`);
        
        // Write as JSON Lines format for easy parsing
        const logLine = JSON.stringify(entry) + '\n';
        
        try {
            await fs.appendFile(logFile, logLine);
            await this.rotateLogsIfNeeded();
        } catch (error) {
            console.error('Failed to write forensic log:', error);
        }
    }

    async rotateLogsIfNeeded() {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files
                .filter(f => f.startsWith('forensic-') && f.endsWith('.jsonl'))
                .sort()
                .reverse();

            if (logFiles.length > this.maxLogFiles) {
                const filesToDelete = logFiles.slice(this.maxLogFiles);
                for (const file of filesToDelete) {
                    await fs.unlink(path.join(this.logDir, file));
                }
            }
        } catch (error) {
            console.error('Log rotation failed:', error);
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
        if (!this.enabled) return [];

        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files.filter(f => f.startsWith('forensic-') && f.endsWith('.jsonl'));
            
            const logs = [];
            for (const file of logFiles) {
                const content = await fs.readFile(path.join(this.logDir, file), 'utf8');
                const lines = content.trim().split('\n').filter(line => line);
                
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        const entryTime = new Date(entry.timestamp);
                        
                        if (entryTime >= startTime && entryTime <= endTime) {
                            if (!category || entry.category === category) {
                                logs.push(entry);
                            }
                        }
                    } catch (parseError) {
                        console.error('Failed to parse log line:', parseError);
                    }
                }
            }
            
            return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error('Failed to read forensic logs:', error);
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