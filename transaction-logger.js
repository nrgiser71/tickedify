/**
 * TransactionLogger - Database operation audit logging
 * Feature 071: Backup Strategie
 *
 * Handles:
 * - Logging INSERT, UPDATE, DELETE operations
 * - Querying transaction history
 * - Undoing specific operations
 * - Automatic cleanup of old logs
 */

class TransactionLogger {
  constructor(pool) {
    this.pool = pool;

    // Tables to track for transaction logging
    this.TRACKED_TABLES = [
      'taken',
      'projecten',
      'contexten',
      'dagelijkse_planning',
      'subtaken'
    ];

    // Retention period in hours (3 days = 72 hours)
    this.RETENTION_HOURS = 72;
  }

  /**
   * Check if a table should be tracked
   * @param {string} tableName - Table name to check
   * @returns {boolean}
   */
  isTrackedTable(tableName) {
    return this.TRACKED_TABLES.includes(tableName);
  }

  /**
   * Log a database operation
   * @param {Object} params - Operation details
   * @param {string} params.userId - User who triggered the operation (null for system)
   * @param {string} params.operation - 'INSERT', 'UPDATE', or 'DELETE'
   * @param {string} params.tableName - Affected table name
   * @param {string} params.recordId - Primary key of affected record
   * @param {Object} params.oldData - Previous state (for UPDATE/DELETE)
   * @param {Object} params.newData - New state (for INSERT/UPDATE)
   * @param {string} params.requestPath - API endpoint that triggered the change
   * @returns {Object} The created log entry
   */
  async log({ userId, operation, tableName, recordId, oldData, newData, requestPath }) {
    // Validate operation
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`);
    }

    // Validate table is tracked
    if (!this.isTrackedTable(tableName)) {
      console.log(`⚠️ Table ${tableName} is not tracked for transaction logging`);
      return null;
    }

    try {
      const result = await this.pool.query(`
        INSERT INTO transaction_log (user_id, operation, table_name, record_id, old_data, new_data, request_path)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userId || null,
        operation,
        tableName,
        recordId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        requestPath || null
      ]);

      console.log(`📝 Logged ${operation} on ${tableName}:${recordId}`);
      return result.rows[0];

    } catch (err) {
      console.error('❌ Failed to log transaction:', err);
      // Don't throw - logging should not break the main operation
      return null;
    }
  }

  /**
   * Query transaction log entries
   * @param {Object} options - Query filters
   * @param {Date|string} options.since - Start timestamp
   * @param {Date|string} options.until - End timestamp
   * @param {string} options.userId - Filter by user
   * @param {string} options.tableName - Filter by table
   * @param {string} options.operation - Filter by operation type
   * @param {number} options.limit - Maximum entries to return
   * @returns {Object} { entries: [], total: number }
   */
  async getLogSince(options = {}) {
    const { since, until, userId, tableName, operation, limit = 100 } = options;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (since) {
      conditions.push(`timestamp >= $${paramIndex}`);
      params.push(since);
      paramIndex++;
    }

    if (until) {
      conditions.push(`timestamp <= $${paramIndex}`);
      params.push(until);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (tableName) {
      conditions.push(`table_name = $${paramIndex}`);
      params.push(tableName);
      paramIndex++;
    }

    if (operation) {
      conditions.push(`operation = $${paramIndex}`);
      params.push(operation);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get entries
    const query = `
      SELECT * FROM transaction_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await this.pool.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM transaction_log ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params.slice(0, -1));

    return {
      entries: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Undo a specific operation
   * @param {number} entryId - Transaction log entry ID
   * @returns {Object} { success, message, affectedRecord }
   */
  async undoOperation(entryId) {
    // Find the log entry
    const entryResult = await this.pool.query(
      'SELECT * FROM transaction_log WHERE id = $1',
      [entryId]
    );

    if (entryResult.rows.length === 0) {
      throw new Error('Transaction log entry not found');
    }

    const entry = entryResult.rows[0];
    const { operation, table_name: tableName, record_id: recordId, old_data: oldData, new_data: newData } = entry;

    console.log(`🔄 Undoing ${operation} on ${tableName}:${recordId}`);

    try {
      if (operation === 'INSERT') {
        // Undo INSERT = DELETE the record
        await this.pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [recordId]);
        console.log(`  ✅ Deleted record ${recordId} from ${tableName}`);

        return {
          success: true,
          message: `Deleted ${tableName} record ${recordId}`,
          affectedRecord: recordId
        };

      } else if (operation === 'DELETE') {
        // Undo DELETE = re-INSERT the old data
        if (!oldData) {
          throw new Error('No old_data available to restore');
        }

        const data = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        await this.pool.query(
          `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        console.log(`  ✅ Restored record ${recordId} to ${tableName}`);

        return {
          success: true,
          message: `Restored ${tableName} record ${recordId}`,
          affectedRecord: recordId
        };

      } else if (operation === 'UPDATE') {
        // Undo UPDATE = restore old_data
        if (!oldData) {
          throw new Error('No old_data available to restore');
        }

        // Check if record still exists
        const currentResult = await this.pool.query(
          `SELECT * FROM ${tableName} WHERE id = $1`,
          [recordId]
        );

        if (currentResult.rows.length === 0) {
          throw new Error('Record no longer exists');
        }

        const data = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
        const setClauses = Object.keys(data)
          .filter(k => k !== 'id')
          .map((k, i) => `${k} = $${i + 2}`)
          .join(', ');
        const values = [recordId, ...Object.values(data).filter((_, i) => Object.keys(data)[i] !== 'id')];

        await this.pool.query(
          `UPDATE ${tableName} SET ${setClauses} WHERE id = $1`,
          values
        );
        console.log(`  ✅ Reverted record ${recordId} in ${tableName}`);

        return {
          success: true,
          message: `Reverted ${tableName} record ${recordId} to previous state`,
          affectedRecord: recordId
        };
      }

      throw new Error(`Unknown operation: ${operation}`);

    } catch (err) {
      console.error(`❌ Failed to undo operation:`, err);
      throw err;
    }
  }

  /**
   * Clean up old transaction logs
   * @returns {number} Number of deleted entries
   */
  async cleanup() {
    console.log('🧹 Cleaning up old transaction logs...');

    const result = await this.pool.query(`
      DELETE FROM transaction_log
      WHERE timestamp < NOW() - INTERVAL '${this.RETENTION_HOURS} hours'
    `);

    const deletedCount = result.rowCount;
    console.log(`🧹 Deleted ${deletedCount} old transaction log entries`);

    return deletedCount;
  }
}

module.exports = TransactionLogger;
