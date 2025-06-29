const { Pool } = require('pg');
const forensicLogger = require('./forensic-logger');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

// Initialize database tables
const initDatabase = async () => {
  try {
    console.log('🔧 Initializing database...');
    console.log('📊 Using connection string from env vars...');
    
    // Test connection first
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Create users table first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        naam VARCHAR(255) NOT NULL,
        wachtwoord_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) DEFAULT 'user',
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        laatste_login TIMESTAMP,
        actief BOOLEAN DEFAULT TRUE
      )
    `);

    // Create base tables with user_id
    await pool.query(`
      CREATE TABLE IF NOT EXISTS taken (
        id VARCHAR(50) PRIMARY KEY,
        tekst TEXT NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lijst VARCHAR(50) NOT NULL DEFAULT 'inbox',
        project_id VARCHAR(50),
        verschijndatum DATE,
        context_id VARCHAR(50),
        duur INTEGER,
        type VARCHAR(20),
        afgewerkt TIMESTAMP,
        user_id VARCHAR(50) REFERENCES users(id)
      )
    `);

    // Then try to add the recurring columns (they might not exist yet)
    try {
      await pool.query(`
        ALTER TABLE taken 
        ADD COLUMN IF NOT EXISTS herhaling_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS herhaling_waarde INTEGER,
        ADD COLUMN IF NOT EXISTS herhaling_actief BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS opmerkingen TEXT,
        ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS top_prioriteit INTEGER CHECK (top_prioriteit IN (1, 2, 3)),
        ADD COLUMN IF NOT EXISTS prioriteit_datum DATE
      `);
      console.log('✅ Recurring task columns and opmerkingen added/verified');
    } catch (alterError) {
      console.log('⚠️ Could not add recurring columns (might already exist):', alterError.message);
      // Try individual column additions for databases that don't support multiple ADD COLUMN IF NOT EXISTS
      const recurringColumns = [
        { name: 'herhaling_type', type: 'VARCHAR(50)' },
        { name: 'herhaling_waarde', type: 'INTEGER' },
        { name: 'herhaling_actief', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'opmerkingen', type: 'TEXT' },
        { name: 'user_id', type: 'VARCHAR(50) REFERENCES users(id)' },
        { name: 'top_prioriteit', type: 'INTEGER CHECK (top_prioriteit IN (1, 2, 3))' },
        { name: 'prioriteit_datum', type: 'DATE' }
      ];
      
      for (const col of recurringColumns) {
        try {
          await pool.query(`ALTER TABLE taken ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added column ${col.name}`);
        } catch (colError) {
          console.log(`⚠️ Column ${col.name} might already exist:`, colError.message);
        }
      }
    }

    // Migrate existing herhaling_type column to larger size if needed
    try {
      await pool.query(`ALTER TABLE taken ALTER COLUMN herhaling_type TYPE VARCHAR(50)`);
      console.log('✅ Migrated herhaling_type column to VARCHAR(50)');
    } catch (migrateError) {
      console.log('⚠️ Could not migrate herhaling_type column (might not exist yet):', migrateError.message);
    }

    // Add email import code column to users table if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_import_code VARCHAR(20) UNIQUE');
      console.log('✅ Added email_import_code column to users table');
    } catch (migrateError) {
      console.log('⚠️ Could not add email_import_code column:', migrateError.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projecten (
        id VARCHAR(50) PRIMARY KEY,
        naam TEXT NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(50) REFERENCES users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contexten (
        id VARCHAR(50) PRIMARY KEY,
        naam TEXT NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(50) REFERENCES users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dagelijkse_planning (
        id VARCHAR(50) PRIMARY KEY,
        actie_id VARCHAR(50),
        datum DATE NOT NULL,
        uur INTEGER NOT NULL CHECK (uur >= 0 AND uur <= 23),
        positie INTEGER DEFAULT 0,
        type VARCHAR(20) NOT NULL CHECK (type IN ('taak', 'geblokkeerd', 'pauze')),
        naam TEXT,
        duur_minuten INTEGER NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(50) REFERENCES users(id),
        FOREIGN KEY (actie_id) REFERENCES taken(id) ON DELETE CASCADE
      )
    `);

    // Create mind dump preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mind_dump_preferences (
        user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        preferences JSONB NOT NULL DEFAULT '{}',
        custom_words JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add position column to existing tables if it doesn't exist
    try {
      await pool.query('ALTER TABLE dagelijkse_planning ADD COLUMN IF NOT EXISTS positie INTEGER DEFAULT 0');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add user_id columns to existing tables if they don't exist
    try {
      await pool.query('ALTER TABLE projecten ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id)');
      await pool.query('ALTER TABLE contexten ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id)');
      await pool.query('ALTER TABLE dagelijkse_planning ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id)');
      console.log('✅ User ID columns added to existing tables');
    } catch (error) {
      console.log('⚠️ Could not add user_id columns (might already exist):', error.message);
    }

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_taken_lijst ON taken(lijst);
      CREATE INDEX IF NOT EXISTS idx_taken_project ON taken(project_id);
      CREATE INDEX IF NOT EXISTS idx_taken_context ON taken(context_id);
      CREATE INDEX IF NOT EXISTS idx_taken_user ON taken(user_id);
      CREATE INDEX IF NOT EXISTS idx_taken_user_lijst ON taken(user_id, lijst);
      CREATE INDEX IF NOT EXISTS idx_projecten_user ON projecten(user_id);
      CREATE INDEX IF NOT EXISTS idx_contexten_user ON contexten(user_id);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_datum ON dagelijkse_planning(datum);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_actie ON dagelijkse_planning(actie_id);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_datum_uur ON dagelijkse_planning(datum, uur);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_user ON dagelijkse_planning(user_id);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_user_datum ON dagelijkse_planning(user_id, datum);
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error('📝 Available env vars:', Object.keys(process.env).filter(key => key.includes('POSTGRES') || key.includes('DATABASE')));
    throw error;
  }
};

// Database helper functions
const db = {
  // Get all items from a specific list for a specific user
  async getList(listName, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ getList called without userId - this will return empty results');
        return [];
      }

      let query;
      let params;
      
      if (listName === 'projecten-lijst') {
        query = 'SELECT * FROM projecten WHERE user_id = $1 ORDER BY aangemaakt DESC';
        params = [userId];
      } else if (listName === 'contexten') {
        query = 'SELECT * FROM contexten WHERE user_id = $1 ORDER BY aangemaakt DESC';
        params = [userId];
      } else if (listName === 'afgewerkte-taken') {
        query = 'SELECT * FROM taken WHERE user_id = $1 AND afgewerkt IS NOT NULL ORDER BY afgewerkt DESC';
        params = [userId];
      } else {
        query = 'SELECT * FROM taken WHERE user_id = $1 AND lijst = $2 AND afgewerkt IS NULL ORDER BY aangemaakt DESC';
        params = [userId, listName];
      }
      
      const result = await pool.query(query, params);
      
      // Map database column names to frontend property names
      return result.rows.map(row => {
        if (row.project_id !== undefined) {
          row.projectId = row.project_id;
          delete row.project_id;
        }
        if (row.context_id !== undefined) {
          row.contextId = row.context_id;
          delete row.context_id;
        }
        if (row.herhaling_type !== undefined) {
          row.herhalingType = row.herhaling_type;
          delete row.herhaling_type;
        }
        if (row.herhaling_waarde !== undefined) {
          row.herhalingWaarde = row.herhaling_waarde;
          delete row.herhaling_waarde;
        }
        if (row.herhaling_actief !== undefined) {
          row.herhalingActief = row.herhaling_actief;
          delete row.herhaling_actief;
        }
        return row;
      });
    } catch (error) {
      console.error(`Error getting list ${listName}:`, error);
      return [];
    }
  },

  // Save entire list (for compatibility with existing code)
  async saveList(listName, items, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ saveList called without userId - operation cancelled');
        return false;
      }

      if (listName === 'projecten-lijst') {
        // Clear and insert projects for this user
        await pool.query('DELETE FROM projecten WHERE user_id = $1', [userId]);
        for (const item of items) {
          await pool.query(
            'INSERT INTO projecten (id, naam, aangemaakt, user_id) VALUES ($1, $2, $3, $4)',
            [item.id, item.naam, item.aangemaakt, userId]
          );
        }
      } else if (listName === 'contexten') {
        // Clear and insert contexts for this user
        await pool.query('DELETE FROM contexten WHERE user_id = $1', [userId]);
        for (const item of items) {
          await pool.query(
            'INSERT INTO contexten (id, naam, aangemaakt, user_id) VALUES ($1, $2, $3, $4)',
            [item.id, item.naam, item.aangemaakt, userId]
          );
        }
      } else if (listName === 'afgewerkte-taken') {
        // Update completed tasks for this user
        await pool.query('DELETE FROM taken WHERE user_id = $1 AND afgewerkt IS NOT NULL', [userId]);
        for (const item of items) {
          await pool.query(`
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, afgewerkt, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            item.id, item.tekst, item.aangemaakt, item.lijst || 'afgewerkt',
            item.projectId, item.verschijndatum, item.contextId, item.duur, item.type, item.afgewerkt,
            item.herhalingType, item.herhalingWaarde, item.herhalingActief, item.opmerkingen, userId
          ]);
        }
      } else {
        // Clear and insert tasks for specific list for this user
        await pool.query('DELETE FROM taken WHERE user_id = $1 AND lijst = $2 AND afgewerkt IS NULL', [userId, listName]);
        
        for (const item of items) {
          // Debug logging for recurring tasks
          if (item.herhalingType) {
            console.log('💾 DB: Saving recurring task:', {
              id: item.id,
              tekst: item.tekst,
              herhalingType: item.herhalingType,
              herhalingActief: item.herhalingActief,
              userId
            });
          }
          
          // Check if herhaling columns exist and fall back gracefully
          try {
            await pool.query(`
              INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, afgewerkt, user_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
              item.id, 
              item.tekst, 
              item.aangemaakt, 
              listName,
              item.projectId || null, 
              item.verschijndatum || null, 
              item.contextId || null, 
              item.duur || null, 
              item.type || null,
              item.herhalingType || null, 
              item.herhalingWaarde || null, 
              item.herhalingActief === true || item.herhalingActief === 'true',
              item.opmerkingen || null,
              null,  // afgewerkt
              userId
            ]);
          } catch (insertError) {
            // Fall back to basic insert without herhaling fields
            if (insertError.message.includes('herhaling_type') || 
                insertError.message.includes('herhaling_waarde') || 
                insertError.message.includes('herhaling_actief')) {
              
              console.log(`⚠️ DB: Falling back to basic insert for item ${item.id}`);
              await pool.query(`
                INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, opmerkingen, afgewerkt, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              `, [
                item.id, 
                item.tekst, 
                item.aangemaakt, 
                listName,
                item.projectId || null, 
                item.verschijndatum || null, 
                item.contextId || null, 
                item.duur || null, 
                item.type || null,
                item.opmerkingen || null,
                null,  // afgewerkt
                userId
              ]);
            } else {
              throw insertError;
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.error(`Error saving list ${listName}:`, error);
      throw error; // Re-throw to get exact error in debug endpoint
    }
  },

  // Move/update a single task
  async updateTask(taskId, updates, userId) {
    console.log(`🔍 DB: updateTask called for taskId: ${taskId}, userId: ${userId}`);
    console.log(`📝 DB: Updates:`, JSON.stringify(updates, null, 2));
    
    // Log task update for forensic analysis
    await forensicLogger.logRecurringTaskOperation('UPDATE_ATTEMPT', {
      id: taskId,
      userId: userId,
      updates: updates
    }, {
      triggeredBy: 'user_action',
      endpoint: 'database.updateTask'
    });
    
    if (!userId) {
      console.warn('⚠️ updateTask called without userId - operation cancelled');
      return false;
    }
    
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (key === 'projectId') {
          fields.push(`project_id = $${paramIndex}`);
        } else if (key === 'contextId') {
          fields.push(`context_id = $${paramIndex}`);
        } else if (key === 'herhalingType') {
          // Check if column exists before trying to update
          fields.push(`herhaling_type = $${paramIndex}`);
        } else if (key === 'herhalingWaarde') {
          fields.push(`herhaling_waarde = $${paramIndex}`);
        } else if (key === 'herhalingActief') {
          fields.push(`herhaling_actief = $${paramIndex}`);
        } else {
          fields.push(`${key} = $${paramIndex}`);
        }
        values.push(updates[key]);
        paramIndex++;
      });

      console.log(`🔧 DB: Generated fields:`, fields);
      console.log(`🎯 DB: Values:`, values);

      values.push(taskId);
      values.push(userId);
      const query = `UPDATE taken SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`;
      console.log(`🗄️ DB: Executing query:`, query);
      console.log(`🗄️ DB: With values:`, values);
      
      try {
        const result = await pool.query(query, values);
        console.log(`✅ DB: Query successful, rowCount: ${result.rowCount}`);
        
        // DISABLED: Automatic planning cleanup temporarily disabled due to bug
        // TODO: Re-implement after investigating task disappearance issue
        /*
        if (result.rowCount > 0 && updates.afgewerkt) {
          console.log(`🧹 Task ${taskId} marked as completed, cleaning up planning items...`);
          try {
            const cleanupResult = await pool.query(
              'DELETE FROM dagelijkse_planning WHERE actie_id = $1 AND user_id = $2',
              [taskId, userId]
            );
            console.log(`✅ Cleaned up ${cleanupResult.rowCount} planning items for completed task ${taskId}`);
          } catch (cleanupError) {
            console.error(`⚠️ Failed to cleanup planning items for task ${taskId}:`, cleanupError.message);
          }
        }
        */
        
        return result.rowCount > 0;
      } catch (dbError) {
        console.log(`⚠️ DB: Query failed:`, dbError.message);
        
        // If error is about missing column, try without herhaling fields
        if (dbError.message.includes('herhaling_type') || 
            dbError.message.includes('herhaling_waarde') || 
            dbError.message.includes('herhaling_actief')) {
          
          console.log('🔄 DB: Herhaling columns not found, falling back to basic update');
          
          // Retry without herhaling fields
          const basicFields = [];
          const basicValues = [];
          let basicParamIndex = 1;

          Object.keys(updates).forEach(key => {
            if (key === 'projectId') {
              basicFields.push(`project_id = $${basicParamIndex}`);
              basicValues.push(updates[key]);
              basicParamIndex++;
            } else if (key === 'contextId') {
              basicFields.push(`context_id = $${basicParamIndex}`);
              basicValues.push(updates[key]);
              basicParamIndex++;
            } else if (!key.startsWith('herhaling')) {
              basicFields.push(`${key} = $${basicParamIndex}`);
              basicValues.push(updates[key]);
              basicParamIndex++;
            } else {
              console.log(`⏭️ DB: Skipping herhaling field: ${key}`);
              // Skip herhaling fields completely - do not add to basicFields or basicValues
            }
          });

          basicValues.push(taskId);
          basicValues.push(userId);
          const basicQuery = `UPDATE taken SET ${basicFields.join(', ')} WHERE id = $${basicParamIndex} AND user_id = $${basicParamIndex + 1}`;
          console.log(`🔄 DB: Fallback query:`, basicQuery);
          console.log(`🔄 DB: Fallback values:`, basicValues);
          
          const basicResult = await pool.query(basicQuery, basicValues);
          console.log(`✅ DB: Fallback successful, rowCount: ${basicResult.rowCount}`);
          
          // DISABLED: Automatic planning cleanup temporarily disabled due to bug
          // TODO: Re-implement after investigating task disappearance issue
          /*
          if (basicResult.rowCount > 0 && updates.afgewerkt) {
            console.log(`🧹 Task ${taskId} marked as completed (fallback), cleaning up planning items...`);
            try {
              const cleanupResult = await pool.query(
                'DELETE FROM dagelijkse_planning WHERE actie_id = $1 AND user_id = $2',
                [taskId, userId]
              );
              console.log(`✅ Cleaned up ${cleanupResult.rowCount} planning items for completed task ${taskId}`);
            } catch (cleanupError) {
              console.error(`⚠️ Failed to cleanup planning items for task ${taskId}:`, cleanupError.message);
            }
          }
          */
          
          return basicResult.rowCount > 0;
        }
        throw dbError;
      }
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      return false;
    }
  },

  // Create a new recurring task instance (simplified version without intensive logging)
  async createRecurringTask(originalTask, newDate, userId) {
    if (!userId) {
      console.warn('⚠️ createRecurringTask called without userId - operation cancelled');
      return null;
    }
    
    // Log what we're receiving
    console.log('🔄 Creating recurring task with:', {
      herhalingType: originalTask.herhalingType,
      herhalingActief: originalTask.herhalingActief,
      herhalingWaarde: originalTask.herhalingWaarde,
      newDate: newDate
    });
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('✅ Started transaction for recurring task creation');
      
      const newId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      const verschijndatumISO = newDate + 'T00:00:00.000Z';
      
      // Try with herhaling fields first
      try {
        const insertValues = [
          newId, 
          originalTask.tekst || 'Herhalende taak', 
          new Date().toISOString(), 
          originalTask.lijst || 'acties',
          originalTask.projectId || null, 
          verschijndatumISO, 
          originalTask.contextId || null, 
          originalTask.duur || 0, 
          originalTask.type || 'actie',
          originalTask.herhalingType || null, 
          originalTask.herhalingWaarde || null, 
          originalTask.herhalingType ? true : false, // herhalingActief = true als er een herhalingType is 
          originalTask.opmerkingen || null, 
          null, 
          userId
        ];
        
        const insertResult = await client.query(`
          INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, afgewerkt, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `, insertValues);
        
        if (insertResult.rows.length === 0) {
          throw new Error('Insert returned no rows');
        }
        
        await client.query('COMMIT');
        console.log('✅ Recurring task created successfully:', newId);
        return newId;
        
      } catch (dbError) {
        console.log('⚠️ Herhaling columns error, falling back to basic insert:', dbError.message);
        
        // Fallback to basic insert without herhaling fields
        await client.query('ROLLBACK');
        await client.query('BEGIN');
        
        const basicInsertValues = [
          newId, 
          originalTask.tekst || 'Herhalende taak', 
          new Date().toISOString(), 
          originalTask.lijst || 'acties',
          originalTask.projectId || null, 
          verschijndatumISO, 
          originalTask.contextId || null, 
          originalTask.duur || 0, 
          originalTask.type || 'actie', 
          originalTask.opmerkingen || null, 
          null, 
          userId
        ];
        
        const basicInsertResult = await client.query(`
          INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, opmerkingen, afgewerkt, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, basicInsertValues);
        
        if (basicInsertResult.rows.length === 0) {
          throw new Error('Basic insert returned no rows');
        }
        
        await client.query('COMMIT');
        console.log('✅ Recurring task created with basic insert:', newId);
        return newId;
      }
    } catch (error) {
      console.error('❌ Error in createRecurringTask:', error.message);
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError.message);
      }
      return null;
    } finally {
      client.release();
    }
  },

  // Get counts for all lists for a specific user
  async getCounts(userId) {
    try {
      if (!userId) {
        console.warn('⚠️ getCounts called without userId - returning empty counts');
        return {};
      }

      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE lijst = 'inbox' AND afgewerkt IS NULL) as inbox,
          COUNT(*) FILTER (WHERE lijst = 'acties' AND afgewerkt IS NULL) as acties,
          COUNT(*) FILTER (WHERE lijst = 'opvolgen' AND afgewerkt IS NULL) as opvolgen,
          COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as "afgewerkte-taken",
          COUNT(*) FILTER (WHERE lijst = 'uitgesteld-wekelijks' AND afgewerkt IS NULL) as "uitgesteld-wekelijks",
          COUNT(*) FILTER (WHERE lijst = 'uitgesteld-maandelijks' AND afgewerkt IS NULL) as "uitgesteld-maandelijks",
          COUNT(*) FILTER (WHERE lijst = 'uitgesteld-3maandelijks' AND afgewerkt IS NULL) as "uitgesteld-3maandelijks",
          COUNT(*) FILTER (WHERE lijst = 'uitgesteld-6maandelijks' AND afgewerkt IS NULL) as "uitgesteld-6maandelijks",
          COUNT(*) FILTER (WHERE lijst = 'uitgesteld-jaarlijks' AND afgewerkt IS NULL) as "uitgesteld-jaarlijks"
        FROM taken WHERE user_id = $1
      `, [userId]);
      
      const projectCount = await pool.query('SELECT COUNT(*) as count FROM projecten WHERE user_id = $1', [userId]);
      
      const counts = result.rows[0];
      counts['projecten-lijst'] = projectCount.rows[0].count;
      
      // Convert string numbers to integers
      Object.keys(counts).forEach(key => {
        counts[key] = parseInt(counts[key]) || 0;
      });
      
      return counts;
    } catch (error) {
      console.error('Error getting counts:', error);
      return {};
    }
  },

  // Dagelijkse Planning functions
  async getDagelijksePlanning(datum, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ getDagelijksePlanning called without userId - returning empty results');
        
        // Log missing userId issue
        await forensicLogger.log('PLANNING', 'GET_PLANNING_NO_USERID', {
          datum: datum,
          userId: userId || 'missing',
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.getDagelijksePlanning',
          triggeredBy: 'system_error'
        });
        
        return [];
      }

      // Log planning retrieval attempt
      await forensicLogger.log('PLANNING', 'GET_PLANNING_ATTEMPT', {
        datum: datum,
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.getDagelijksePlanning',
        triggeredBy: 'user_action'
      });

      const result = await pool.query(`
        SELECT dp.*, t.tekst as actie_tekst, t.project_id, t.context_id, t.duur as actie_duur
        FROM dagelijkse_planning dp
        LEFT JOIN taken t ON dp.actie_id = t.id
        WHERE dp.datum = $1 AND dp.user_id = $2
        AND (dp.actie_id IS NULL OR t.afgewerkt IS NULL)
        ORDER BY dp.uur ASC, dp.positie ASC, dp.aangemaakt ASC
      `, [datum, userId]);
      
      const planningItems = result.rows.map(row => ({
        id: row.id,
        actieId: row.actie_id,
        datum: row.datum,
        uur: row.uur,
        positie: row.positie || 0,
        type: row.type,
        naam: row.naam,
        duurMinuten: row.duur_minuten,
        aangemaakt: row.aangemaakt,
        // Actie details (als beschikbaar)
        actieTekst: row.actie_tekst,
        projectId: row.project_id,
        contextId: row.context_id,
        actieDuur: row.actie_duur
      }));
      
      // Log successful planning retrieval with summary
      await forensicLogger.log('PLANNING', 'GET_PLANNING_SUCCESS', {
        datum: datum,
        userId: userId,
        itemCount: planningItems.length,
        itemSummary: planningItems.map(item => ({
          id: item.id,
          type: item.type,
          uur: item.uur,
          naam: item.naam,
          actieId: item.actieId,
          actieTekst: item.actieTekst
        })),
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.getDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      return planningItems;
    } catch (error) {
      console.error('Error getting dagelijkse planning:', error);
      
      // Log planning retrieval failure
      await forensicLogger.log('PLANNING', 'GET_PLANNING_FAILED', {
        datum: datum,
        userId: userId,
        error: error.message,
        stack: error.stack,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.getDagelijksePlanning',
        triggeredBy: 'system_error'
      });
      
      return [];
    }
  },

  async addToDagelijksePlanning(planningItem, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ addToDagelijksePlanning called without userId - operation cancelled');
        
        await forensicLogger.log('PLANNING', 'ADD_PLANNING_NO_USERID', {
          planningItem: planningItem,
          userId: userId || 'missing',
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.addToDagelijksePlanning',
          triggeredBy: 'system_error'
        });
        
        return null;
      }

      const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      
      // Log planning addition attempt
      await forensicLogger.log('PLANNING', 'ADD_PLANNING_ATTEMPT', {
        planningItem: planningItem,
        generatedId: id,
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.addToDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      // Get current items count for this hour
      const countResult = await pool.query(`
        SELECT COUNT(*) as item_count
        FROM dagelijkse_planning 
        WHERE datum = $1 AND uur = $2 AND user_id = $3
      `, [planningItem.datum, planningItem.uur, userId]);
      const currentItemCount = parseInt(countResult.rows[0].item_count);

      // Calculate actual position
      let positie = planningItem.positie;
      if (positie === undefined || positie === null) {
        // No position specified, add at end
        positie = currentItemCount;
      } else if (positie >= currentItemCount) {
        // Position is at or beyond the current count, add at end without shifting
        // Don't change the position - keep it as is
        // This allows proper ordering when multiple items are added at the end
      } else {
        // Position is within the existing items, shift others
        const shiftResult = await pool.query(`
          UPDATE dagelijkse_planning 
          SET positie = positie + 1 
          WHERE datum = $1 AND uur = $2 AND positie >= $3 AND user_id = $4
        `, [planningItem.datum, planningItem.uur, planningItem.positie, userId]);
        
        await forensicLogger.log('PLANNING', 'ADD_PLANNING_POSITION_SHIFT', {
          planningId: id,
          shiftedRows: shiftResult.rowCount,
          datum: planningItem.datum,
          uur: planningItem.uur,
          insertPosition: planningItem.positie,
          currentItemCount: currentItemCount,
          userId: userId,
          endpoint: 'database.addToDagelijksePlanning',
          triggeredBy: 'user_action'
        });
      }
      
      await pool.query(`
        INSERT INTO dagelijkse_planning (id, actie_id, datum, uur, positie, type, naam, duur_minuten, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        id,
        planningItem.actieId || null,
        planningItem.datum,
        planningItem.uur,
        positie,
        planningItem.type,
        planningItem.naam || null,
        planningItem.duurMinuten,
        userId
      ]);
      
      // Log successful planning addition
      await forensicLogger.log('PLANNING', 'ADD_PLANNING_SUCCESS', {
        planningId: id,
        addedItem: {
          id: id,
          actieId: planningItem.actieId,
          datum: planningItem.datum,
          uur: planningItem.uur,
          positie: positie,
          type: planningItem.type,
          naam: planningItem.naam,
          duurMinuten: planningItem.duurMinuten
        },
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.addToDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      return id;
    } catch (error) {
      console.error('Error adding to dagelijkse planning:', error);
      
      // Log planning addition failure
      await forensicLogger.log('PLANNING', 'ADD_PLANNING_FAILED', {
        planningItem: planningItem,
        userId: userId,
        error: error.message,
        stack: error.stack,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.addToDagelijksePlanning',
        triggeredBy: 'system_error'
      });
      
      throw error;
    }
  },

  async updateDagelijksePlanning(id, updates, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ updateDagelijksePlanning called without userId - operation cancelled');
        
        await forensicLogger.log('PLANNING', 'UPDATE_PLANNING_NO_USERID', {
          planningId: id,
          updates: updates,
          userId: userId || 'missing',
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.updateDagelijksePlanning',
          triggeredBy: 'system_error'
        });
        
        return false;
      }

      // Get current planning item for logging
      const beforeResult = await pool.query(`
        SELECT dp.*, t.tekst as actie_tekst
        FROM dagelijkse_planning dp
        LEFT JOIN taken t ON dp.actie_id = t.id
        WHERE dp.id = $1 AND dp.user_id = $2
      `, [id, userId]);
      
      const beforeItem = beforeResult.rows[0];
      
      // Log planning update attempt
      await forensicLogger.log('PLANNING', 'UPDATE_PLANNING_ATTEMPT', {
        planningId: id,
        updates: updates,
        beforeItem: beforeItem,
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.updateDagelijksePlanning',
        triggeredBy: 'user_action'
      });

      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (key === 'actieId') {
          fields.push(`actie_id = $${paramIndex}`);
        } else if (key === 'duurMinuten') {
          fields.push(`duur_minuten = $${paramIndex}`);
        } else {
          fields.push(`${key} = $${paramIndex}`);
        }
        values.push(updates[key]);
        paramIndex++;
      });

      values.push(id);
      values.push(userId);
      const query = `UPDATE dagelijkse_planning SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`;
      
      const result = await pool.query(query, values);
      
      // Get updated item for logging
      const afterResult = await pool.query(`
        SELECT dp.*, t.tekst as actie_tekst
        FROM dagelijkse_planning dp
        LEFT JOIN taken t ON dp.actie_id = t.id
        WHERE dp.id = $1 AND dp.user_id = $2
      `, [id, userId]);
      
      const afterItem = afterResult.rows[0];
      
      // Log update result
      await forensicLogger.log('PLANNING', 'UPDATE_PLANNING_SUCCESS', {
        planningId: id,
        rowsUpdated: result.rowCount,
        beforeItem: beforeItem,
        afterItem: afterItem,
        updates: updates,
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.updateDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating dagelijkse planning:', error);
      
      // Log planning update failure
      await forensicLogger.log('PLANNING', 'UPDATE_PLANNING_FAILED', {
        planningId: id,
        updates: updates,
        userId: userId,
        error: error.message,
        stack: error.stack,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.updateDagelijksePlanning',
        triggeredBy: 'system_error'
      });
      
      return false;
    }
  },

  async reorderDagelijksePlanning(id, targetUur, targetPosition, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ reorderDagelijksePlanning called without userId - operation cancelled');
        
        await forensicLogger.log('PLANNING', 'REORDER_PLANNING_NO_USERID', {
          planningId: id,
          targetUur: targetUur,
          targetPosition: targetPosition,
          userId: userId || 'missing',
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.reorderDagelijksePlanning',
          triggeredBy: 'system_error'
        });
        
        return false;
      }

      // Get current item info with user verification
      const currentResult = await pool.query(`
        SELECT dp.*, t.tekst as actie_tekst
        FROM dagelijkse_planning dp
        LEFT JOIN taken t ON dp.actie_id = t.id
        WHERE dp.id = $1 AND dp.user_id = $2
      `, [id, userId]);
      
      if (currentResult.rows.length === 0) {
        await forensicLogger.log('PLANNING', 'REORDER_PLANNING_NOT_FOUND', {
          planningId: id,
          targetUur: targetUur,  
          targetPosition: targetPosition,
          userId: userId,
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.reorderDagelijksePlanning',
          triggeredBy: 'system_error'
        });
        
        return false;
      }
      
      const current = currentResult.rows[0];
      const datum = current.datum;
      const currentUur = current.uur;
      const currentPositie = current.positie;
      
      // Log reorder attempt
      await forensicLogger.log('PLANNING', 'REORDER_PLANNING_ATTEMPT', {
        planningId: id,
        currentItem: current,
        currentPosition: {
          datum: datum,
          uur: currentUur,
          positie: currentPositie
        },
        targetPosition: {
          uur: targetUur,
          positie: targetPosition
        },
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.reorderDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      // If moving to different hour or specific position
      if (currentUur !== targetUur || targetPosition !== null) {
        // Remove from current position (shift items down) - only for this user
        const shiftDownResult = await pool.query(`
          UPDATE dagelijkse_planning 
          SET positie = positie - 1 
          WHERE datum = $1 AND uur = $2 AND positie > $3 AND user_id = $4
        `, [datum, currentUur, currentPositie, userId]);
        
        // Determine target position
        let finalPosition = targetPosition;
        if (finalPosition === null || finalPosition === undefined) {
          // Append to end of target hour for this user
          const maxPosResult = await pool.query(`
            SELECT COALESCE(MAX(positie), -1) + 1 as next_position
            FROM dagelijkse_planning 
            WHERE datum = $1 AND uur = $2 AND user_id = $3
          `, [datum, targetUur, userId]);
          finalPosition = maxPosResult.rows[0].next_position;
        } else {
          // Insert at specific position, shift others up - only for this user
          const shiftUpResult = await pool.query(`
            UPDATE dagelijkse_planning 
            SET positie = positie + 1 
            WHERE datum = $1 AND uur = $2 AND positie >= $3 AND user_id = $4
          `, [datum, targetUur, finalPosition, userId]);
          
          await forensicLogger.log('PLANNING', 'REORDER_PLANNING_SHIFT_UP', {
            planningId: id,
            shiftedRows: shiftUpResult.rowCount,
            datum: datum,
            targetUur: targetUur,
            insertPosition: finalPosition,
            userId: userId,
            endpoint: 'database.reorderDagelijksePlanning',
            triggeredBy: 'user_action'
          });
        }
        
        // Update item with new hour and position
        const updateResult = await pool.query(`
          UPDATE dagelijkse_planning 
          SET uur = $1, positie = $2 
          WHERE id = $3 AND user_id = $4
        `, [targetUur, finalPosition, id, userId]);
        
        // Log successful reorder
        await forensicLogger.log('PLANNING', 'REORDER_PLANNING_SUCCESS', {
          planningId: id,
          reorderResult: {
            rowsUpdated: updateResult.rowCount,
            shiftedDown: shiftDownResult.rowCount,
            finalPosition: finalPosition,
            finalUur: targetUur
          },
          beforeState: {
            uur: currentUur,
            positie: currentPositie
          },
          afterState: {
            uur: targetUur,
            positie: finalPosition
          },
          userId: userId,
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.reorderDagelijksePlanning',
          triggeredBy: 'user_action'
        });
        
        return true;
      }
      
      // Log no change needed
      await forensicLogger.log('PLANNING', 'REORDER_PLANNING_NO_CHANGE', {
        planningId: id,
        reason: 'Same hour and no specific position requested',
        currentPosition: {
          uur: currentUur,
          positie: currentPositie
        },
        userId: userId,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.reorderDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      return true; // No change needed
    } catch (error) {
      console.error('Error reordering dagelijkse planning:', error);
      
      // Log reorder failure
      await forensicLogger.log('PLANNING', 'REORDER_PLANNING_FAILED', {
        planningId: id,
        targetUur: targetUur,
        targetPosition: targetPosition,
        userId: userId,
        error: error.message,
        stack: error.stack,
        requestTimestamp: new Date().toISOString(),
        endpoint: 'database.reorderDagelijksePlanning',
        triggeredBy: 'system_error'
      });
      
      return false;
    }
  },

  async deleteDagelijksePlanning(id, userId = null) {
    try {
      // Get planning item details before deletion for forensic logging
      const beforeResult = await pool.query(`
        SELECT dp.*, t.tekst as actie_tekst, t.lijst as actie_lijst
        FROM dagelijkse_planning dp
        LEFT JOIN taken t ON dp.actie_id = t.id
        WHERE dp.id = $1
      `, [id]);
      
      const planningItem = beforeResult.rows[0];
      
      // Log deletion attempt with full context
      await forensicLogger.log('PLANNING', 'DELETE_PLANNING_ATTEMPT', {
        planningId: id,
        planningItem: planningItem,
        userId: userId || planningItem?.user_id || 'unknown',
        deletionDetails: {
          itemExists: !!planningItem,
          datum: planningItem?.datum,
          uur: planningItem?.uur,
          type: planningItem?.type,
          naam: planningItem?.naam,
          actieId: planningItem?.actie_id,
          actieTekst: planningItem?.actie_tekst,
          actieLijst: planningItem?.actie_lijst
        },
        endpoint: 'database.deleteDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      const result = await pool.query('DELETE FROM dagelijkse_planning WHERE id = $1', [id]);
      
      // Log successful deletion
      await forensicLogger.log('PLANNING', 'DELETE_PLANNING_SUCCESS', {
        planningId: id,
        rowsDeleted: result.rowCount,
        deletedItem: planningItem,
        userId: userId || planningItem?.user_id || 'unknown',
        endpoint: 'database.deleteDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting dagelijkse planning:', error);
      
      // Log deletion failure
      await forensicLogger.log('PLANNING', 'DELETE_PLANNING_FAILED', {
        planningId: id,
        error: error.message,
        stack: error.stack,
        userId: userId || 'unknown',
        endpoint: 'database.deleteDagelijksePlanning',
        triggeredBy: 'user_action'
      });
      
      return false;
    }
  },

  async getIngeplandeActies(datum, userId = null) {
    try {
      // Log retrieval attempt
      if (userId) {
        await forensicLogger.log('PLANNING', 'GET_INGEPLANDE_ACTIES_ATTEMPT', {
          datum: datum,
          userId: userId,
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.getIngeplandeActies',
          triggeredBy: 'user_action'
        });
      }

      const result = await pool.query(`
        SELECT DISTINCT actie_id
        FROM dagelijkse_planning
        WHERE datum = $1 AND actie_id IS NOT NULL
      `, [datum]);
      
      const actieIds = result.rows.map(row => row.actie_id);
      
      // Log successful retrieval
      if (userId) {
        await forensicLogger.log('PLANNING', 'GET_INGEPLANDE_ACTIES_SUCCESS', {
          datum: datum,
          actieCount: actieIds.length,
          actieIds: actieIds,
          userId: userId,
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.getIngeplandeActies',
          triggeredBy: 'user_action'
        });
      }
      
      return actieIds;
    } catch (error) {
      console.error('Error getting ingeplande acties:', error);
      
      // Log retrieval failure
      if (userId) {
        await forensicLogger.log('PLANNING', 'GET_INGEPLANDE_ACTIES_FAILED', {
          datum: datum,
          userId: userId,
          error: error.message,
          stack: error.stack,
          requestTimestamp: new Date().toISOString(),
          endpoint: 'database.getIngeplandeActies',
          triggeredBy: 'system_error'
        });
      }
      
      return [];
    }
  },

  // Email import code functions
  async generateEmailImportCode(userId) {
    try {
      let code;
      let attempts = 0;
      const maxAttempts = 10;
      
      // Generate unique code with collision checking
      while (attempts < maxAttempts) {
        // Generate a more secure 12-character code
        code = Math.random().toString(36).substring(2, 14);
        
        // Check if code already exists
        const existingCode = await pool.query(
          'SELECT id FROM users WHERE email_import_code = $1',
          [code]
        );
        
        if (existingCode.rows.length === 0) {
          // Code is unique, break out of loop
          break;
        }
        
        attempts++;
        console.warn(`Email import code collision detected (attempt ${attempts}), retrying...`);
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique email import code after maximum attempts');
      }
      
      // Update user with unique code
      await pool.query(
        'UPDATE users SET email_import_code = $1 WHERE id = $2',
        [code, userId]
      );
      
      console.log(`✅ Generated unique email import code: ${code} for user ${userId}`);
      return code;
    } catch (error) {
      console.error('Error generating email import code:', error);
      return null;
    }
  },

  async getUserByImportCode(code) {
    try {
      if (!code) return null;
      
      const result = await pool.query(
        'SELECT id, email, naam FROM users WHERE email_import_code = $1 AND actief = TRUE',
        [code]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user by import code:', error);
      return null;
    }
  },

  async getEmailImportCode(userId) {
    try {
      const result = await pool.query(
        'SELECT email_import_code FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      let code = result.rows[0].email_import_code;
      
      // Generate code if it doesn't exist
      if (!code) {
        code = await this.generateEmailImportCode(userId);
      }
      
      return code;
    } catch (error) {
      console.error('Error getting email import code:', error);
      return null;
    }
  }
};

module.exports = { initDatabase, db, pool };
