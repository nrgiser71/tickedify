/**
 * BackupManager - Database backup and restore functionality
 * Feature 071: Backup Strategie
 *
 * Handles:
 * - Full database backups to Backblaze B2
 * - Backup listing and download
 * - Database restoration from backups
 * - Automatic cleanup of expired backups
 */

const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class BackupManager {
  constructor(pool, storageManager) {
    this.pool = pool;
    this.storageManager = storageManager;

    // Tables to include in backup (order matters for foreign key constraints)
    this.TABLES_TO_BACKUP = [
      'users',
      'projecten',
      'contexten',
      'taken',
      'subtaken',
      'dagelijkse_planning',
      'bijlagen',
      'mind_dump_preferences',
      'feedback'
    ];

    // Retention period in hours
    this.RETENTION_HOURS = 24;

    // B2 folder for backups
    this.B2_FOLDER = 'database-backups';
  }

  /**
   * Generate a unique backup ID based on timestamp
   */
  generateBackupId() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    return `backup-${timestamp}`;
  }

  /**
   * Generate a UUID for the backup record
   */
  generateUUID() {
    return 'bkp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create a full database backup
   * @param {string} type - 'scheduled' or 'manual'
   * @returns {Object} Backup metadata object
   */
  async createBackup(type = 'scheduled') {
    const id = this.generateUUID();
    const backupId = this.generateBackupId();
    const storagePath = `${this.B2_FOLDER}/${backupId}.json.gz`;
    const expiresAt = new Date(Date.now() + this.RETENTION_HOURS * 60 * 60 * 1000);

    console.log(`🔄 Starting ${type} backup: ${backupId}`);

    // Insert initial metadata record
    try {
      await this.pool.query(`
        INSERT INTO backup_metadata (id, backup_id, backup_type, storage_path, status, expires_at)
        VALUES ($1, $2, $3, $4, 'in_progress', $5)
      `, [id, backupId, type, storagePath, expiresAt]);
    } catch (err) {
      console.error('❌ Failed to create backup metadata:', err);
      throw new Error('Failed to initialize backup');
    }

    try {
      // Export all tables
      const backupData = {};
      const recordCounts = {};

      for (const tableName of this.TABLES_TO_BACKUP) {
        try {
          const result = await this.pool.query(`SELECT * FROM ${tableName}`);
          backupData[tableName] = result.rows;
          recordCounts[tableName] = result.rows.length;
          console.log(`  ✅ Exported ${tableName}: ${result.rows.length} records`);
        } catch (tableErr) {
          console.warn(`  ⚠️ Could not export ${tableName}:`, tableErr.message);
          backupData[tableName] = [];
          recordCounts[tableName] = 0;
        }
      }

      // Add metadata to backup
      backupData._metadata = {
        backupId,
        createdAt: new Date().toISOString(),
        type,
        tables: this.TABLES_TO_BACKUP,
        recordCounts
      };

      // Compress the backup
      const jsonString = JSON.stringify(backupData);
      const compressedBuffer = await gzip(jsonString);
      const sizeBytes = compressedBuffer.length;

      console.log(`  📦 Compressed size: ${(sizeBytes / 1024).toFixed(2)} KB`);

      // Upload to B2
      if (this.storageManager && this.storageManager.b2Client) {
        await this.storageManager.initialize();

        // Get upload URL
        const uploadUrlResponse = await this.storageManager.b2Client.getUploadUrl({
          bucketId: this.storageManager.bucketId
        });

        // Calculate SHA1 hash
        const crypto = require('crypto');
        const sha1 = crypto.createHash('sha1').update(compressedBuffer).digest('hex');

        // Upload the file
        await this.storageManager.b2Client.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: storagePath,
          data: compressedBuffer,
          hash: sha1
        });

        console.log(`  ☁️ Uploaded to B2: ${storagePath}`);
      } else {
        console.warn('  ⚠️ B2 storage not available, backup only saved in metadata');
      }

      // Update metadata with success
      await this.pool.query(`
        UPDATE backup_metadata
        SET status = 'completed', size_bytes = $1, record_counts = $2
        WHERE id = $3
      `, [sizeBytes, JSON.stringify(recordCounts), id]);

      console.log(`✅ Backup completed: ${backupId}`);

      // Return the backup object
      const result = await this.pool.query(
        'SELECT * FROM backup_metadata WHERE id = $1',
        [id]
      );
      return result.rows[0];

    } catch (err) {
      console.error('❌ Backup failed:', err);

      // Update metadata with failure
      await this.pool.query(`
        UPDATE backup_metadata
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [err.message, id]);

      throw err;
    }
  }

  /**
   * List available backups
   * @param {Object} options - { limit, status }
   * @returns {Object} { backups: [], total: number }
   */
  async listBackups(options = {}) {
    const { limit = 20, status } = options;

    let query = 'SELECT * FROM backup_metadata';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const result = await this.pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM backup_metadata';
    const countParams = [];
    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await this.pool.query(countQuery, countParams);

    return {
      backups: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Download a backup by ID
   * @param {string} backupId - The backup ID or UUID
   * @returns {Buffer} Gzipped backup data
   */
  async downloadBackup(backupId) {
    // Find the backup
    const result = await this.pool.query(
      'SELECT * FROM backup_metadata WHERE id = $1 OR backup_id = $1',
      [backupId]
    );

    if (result.rows.length === 0) {
      throw new Error('Backup not found');
    }

    const backup = result.rows[0];

    if (backup.status !== 'completed') {
      throw new Error('Backup is not available for download');
    }

    // Download from B2
    if (!this.storageManager || !this.storageManager.b2Client) {
      throw new Error('B2 storage not available');
    }

    await this.storageManager.initialize();

    const downloadResponse = await this.storageManager.b2Client.downloadFileByName({
      bucketName: process.env.B2_BUCKET_NAME || 'tickedify-attachments',
      fileName: backup.storage_path,
      responseType: 'arraybuffer'
    });

    return Buffer.from(downloadResponse.data);
  }

  /**
   * Restore database from a backup
   * @param {string} backupId - The backup ID or UUID
   * @param {boolean} replayTransactions - Whether to replay transaction log
   * @returns {Object} { success, tablesRestored, transactionsReplayed }
   */
  async restoreBackup(backupId, replayTransactions = true) {
    console.log(`🔄 Starting restore from backup: ${backupId}`);

    // Download and decompress the backup
    const compressedData = await this.downloadBackup(backupId);
    const jsonString = (await gunzip(compressedData)).toString('utf8');
    const backupData = JSON.parse(jsonString);

    const metadata = backupData._metadata;
    console.log(`  📦 Backup from: ${metadata.createdAt}`);
    console.log(`  📊 Tables: ${metadata.tables.join(', ')}`);

    const client = await this.pool.connect();
    let tablesRestored = 0;
    let transactionsReplayed = 0;

    try {
      await client.query('BEGIN');

      // Truncate tables in reverse order (for FK constraints)
      const tablesToTruncate = [...this.TABLES_TO_BACKUP].reverse();

      // Skip users table from truncation to preserve admin accounts
      const safeTablesTruncate = tablesToTruncate.filter(t => t !== 'users');

      for (const tableName of safeTablesTruncate) {
        try {
          await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);
          console.log(`  🗑️ Truncated ${tableName}`);
        } catch (err) {
          console.warn(`  ⚠️ Could not truncate ${tableName}:`, err.message);
        }
      }

      // Restore data for each table
      for (const tableName of this.TABLES_TO_BACKUP) {
        const tableData = backupData[tableName];
        if (!tableData || tableData.length === 0) continue;

        // Skip users table restore (only restore non-users data)
        if (tableName === 'users') {
          console.log(`  ⏭️ Skipping users table restore (preserving existing users)`);
          continue;
        }

        for (const row of tableData) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          try {
            await client.query(
              `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values
            );
          } catch (insertErr) {
            console.warn(`  ⚠️ Could not insert into ${tableName}:`, insertErr.message);
          }
        }

        console.log(`  ✅ Restored ${tableName}: ${tableData.length} records`);
        tablesRestored++;
      }

      // Replay transactions if requested
      if (replayTransactions && metadata.createdAt) {
        const txResult = await client.query(
          'SELECT * FROM transaction_log WHERE timestamp > $1 ORDER BY timestamp ASC',
          [metadata.createdAt]
        );

        for (const tx of txResult.rows) {
          try {
            if (tx.operation === 'INSERT' && tx.new_data) {
              const columns = Object.keys(tx.new_data);
              const values = Object.values(tx.new_data);
              const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
              await client.query(
                `INSERT INTO ${tx.table_name} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                values
              );
            } else if (tx.operation === 'UPDATE' && tx.new_data) {
              const setClauses = Object.keys(tx.new_data)
                .filter(k => k !== 'id')
                .map((k, i) => `${k} = $${i + 2}`)
                .join(', ');
              const values = [tx.record_id, ...Object.values(tx.new_data).filter((_, i) => Object.keys(tx.new_data)[i] !== 'id')];
              await client.query(
                `UPDATE ${tx.table_name} SET ${setClauses} WHERE id = $1`,
                values
              );
            } else if (tx.operation === 'DELETE') {
              await client.query(
                `DELETE FROM ${tx.table_name} WHERE id = $1`,
                [tx.record_id]
              );
            }
            transactionsReplayed++;
          } catch (txErr) {
            console.warn(`  ⚠️ Could not replay transaction ${tx.id}:`, txErr.message);
          }
        }

        console.log(`  🔄 Replayed ${transactionsReplayed} transactions`);
      }

      await client.query('COMMIT');
      console.log('✅ Restore completed successfully');

      return {
        success: true,
        message: 'Restore completed',
        tablesRestored,
        transactionsReplayed
      };

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Restore failed, rolled back:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired backups
   * @returns {number} Number of deleted backups
   */
  async cleanupExpired() {
    console.log('🧹 Cleaning up expired backups...');

    // Find expired backups
    const expiredResult = await this.pool.query(
      'SELECT * FROM backup_metadata WHERE expires_at < NOW()'
    );

    let deletedCount = 0;

    for (const backup of expiredResult.rows) {
      try {
        // Delete from B2 if storage available
        if (this.storageManager && this.storageManager.b2Client && backup.storage_path) {
          try {
            await this.storageManager.initialize();

            // List file versions to get fileId
            const listResponse = await this.storageManager.b2Client.listFileNames({
              bucketId: this.storageManager.bucketId,
              prefix: backup.storage_path,
              maxFileCount: 1
            });

            if (listResponse.data.files.length > 0) {
              const file = listResponse.data.files[0];
              await this.storageManager.b2Client.deleteFileVersion({
                fileId: file.fileId,
                fileName: file.fileName
              });
              console.log(`  🗑️ Deleted from B2: ${backup.storage_path}`);
            }
          } catch (b2Err) {
            console.warn(`  ⚠️ Could not delete from B2: ${b2Err.message}`);
          }
        }

        // Delete metadata record
        await this.pool.query('DELETE FROM backup_metadata WHERE id = $1', [backup.id]);
        deletedCount++;
        console.log(`  ✅ Deleted backup: ${backup.backup_id}`);

      } catch (err) {
        console.error(`  ❌ Failed to delete backup ${backup.id}:`, err.message);
      }
    }

    console.log(`🧹 Cleanup complete: ${deletedCount} backups deleted`);
    return deletedCount;
  }
}

module.exports = BackupManager;
