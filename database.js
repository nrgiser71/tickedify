const { Pool } = require('pg');

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
        ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) REFERENCES users(id)
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
        { name: 'user_id', type: 'VARCHAR(50) REFERENCES users(id)' }
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
            } else if (key === 'contextId') {
              basicFields.push(`context_id = $${basicParamIndex}`);
            } else if (!key.startsWith('herhaling')) {
              basicFields.push(`${key} = $${basicParamIndex}`);
            } else {
              console.log(`⏭️ DB: Skipping herhaling field: ${key}`);
              return; // Skip herhaling fields
            }
            basicValues.push(updates[key]);
            basicParamIndex++;
          });

          basicValues.push(taskId);
          basicValues.push(userId);
          const basicQuery = `UPDATE taken SET ${basicFields.join(', ')} WHERE id = $${basicParamIndex} AND user_id = $${basicParamIndex + 1}`;
          console.log(`🔄 DB: Fallback query:`, basicQuery);
          console.log(`🔄 DB: Fallback values:`, basicValues);
          
          const basicResult = await pool.query(basicQuery, basicValues);
          console.log(`✅ DB: Fallback successful, rowCount: ${basicResult.rowCount}`);
          return basicResult.rowCount > 0;
        }
        throw dbError;
      }
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      return false;
    }
  },

  // Create a new recurring task instance
  async createRecurringTask(originalTask, newDate, userId) {
    const client = await pool.connect();
    
    if (!userId) {
      console.warn('⚠️ createRecurringTask called without userId - operation cancelled');
      return null;
    }
    
    try {
      // Start explicit transaction
      await client.query('BEGIN');
      console.log('🔄 DEBUG: Started transaction');
      
      const newId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      
      // Debug log the original task properties
      console.log('🐛 DEBUG: originalTask properties:', Object.keys(originalTask));
      console.log('🐛 DEBUG: originalTask full object:', originalTask);
      console.log('🐛 DEBUG: recurring properties:', {
        herhalingType: originalTask.herhalingType,
        herhalingWaarde: originalTask.herhalingWaarde,
        herhalingActief: originalTask.herhalingActief
      });
      
      // Convert newDate string to proper ISO timestamp to avoid timezone issues (move outside try block)
      const verschijndatumISO = newDate + 'T00:00:00.000Z';
      console.log('🐛 DEBUG: converted to ISO:', verschijndatumISO);
      
      // Try with herhaling fields first
      try {
        console.log('🐛 DEBUG: About to insert with values:', [
          newId, originalTask.tekst, new Date().toISOString(), originalTask.lijst,
          originalTask.projectId, newDate, originalTask.contextId, originalTask.duur, originalTask.type,
          originalTask.herhalingType, originalTask.herhalingWaarde, originalTask.herhalingActief
        ]);
        console.log('🐛 DEBUG: newDate parameter received:', newDate, typeof newDate);
        
        const insertResult = await client.query(`
          INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, afgewerkt, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `, [
          newId, originalTask.tekst, new Date().toISOString(), originalTask.lijst,
          originalTask.projectId, verschijndatumISO, originalTask.contextId, originalTask.duur, originalTask.type,
          originalTask.herhalingType, originalTask.herhalingWaarde, originalTask.herhalingActief, originalTask.opmerkingen, null, userId
        ]);
        
        console.log('✅ DEBUG: Insert successful, returned ID:', insertResult.rows[0]?.id);
        
        // Verify the insert worked by immediately querying it back within transaction
        const verifyResult = await client.query('SELECT * FROM taken WHERE id = $1', [newId]);
        console.log('🔍 DEBUG: Verification query returned rows:', verifyResult.rows.length);
        
        if (verifyResult.rows.length === 0) {
          console.error('❌ DEBUG: Task was not found immediately after insert within transaction!');
          await client.query('ROLLBACK');
          console.log('🔄 DEBUG: Transaction rolled back');
          return null;
        }
        
        console.log('🔍 DEBUG: Saved task details within transaction:', {
          id: verifyResult.rows[0].id,
          tekst: verifyResult.rows[0].tekst,
          lijst: verifyResult.rows[0].lijst,
          verschijndatum: verifyResult.rows[0].verschijndatum,
          herhaling_type: verifyResult.rows[0].herhaling_type,
          herhaling_actief: verifyResult.rows[0].herhaling_actief
        });
        
        // Commit the transaction
        await client.query('COMMIT');
        console.log('✅ DEBUG: Transaction committed successfully');
        
        // EXTRA DEBUG: Query the task again AFTER commit to verify persistence
        const postCommitVerify = await pool.query('SELECT * FROM taken WHERE id = $1', [newId]);
        console.log('🔍 DEBUG: Post-commit verification rows:', postCommitVerify.rows.length);
        if (postCommitVerify.rows.length === 0) {
          console.error('❌ DEBUG: CRITICAL - Task disappeared after commit!');
        } else {
          console.log('✅ DEBUG: Task confirmed persistent after commit');
        }
        
        return newId;
      } catch (dbError) {
        console.error('❌ DEBUG: Insert failed with error:', dbError.message);
        
        // If herhaling columns don't exist, fall back to basic insert
        if (dbError.message.includes('herhaling_type') || 
            dbError.message.includes('herhaling_waarde') || 
            dbError.message.includes('herhaling_actief')) {
          
          console.log('🔄 DEBUG: Herhaling columns not found, trying basic insert');
          
          // Rollback the failed transaction and start new one
          await client.query('ROLLBACK');
          await client.query('BEGIN');
          
          const basicInsertResult = await client.query(`
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, opmerkingen, afgewerkt, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [
            newId, originalTask.tekst, new Date().toISOString(), originalTask.lijst,
            originalTask.projectId, verschijndatumISO, originalTask.contextId, originalTask.duur, originalTask.type, originalTask.opmerkingen, null, userId
          ]);
          
          console.log('✅ DEBUG: Basic insert successful, returned ID:', basicInsertResult.rows[0]?.id);
          
          // Verify basic insert
          const basicVerifyResult = await client.query('SELECT * FROM taken WHERE id = $1', [newId]);
          
          if (basicVerifyResult.rows.length === 0) {
            console.error('❌ DEBUG: Basic task was not found after insert!');
            await client.query('ROLLBACK');
            return null;
          }
          
          await client.query('COMMIT');
          console.log('✅ DEBUG: Basic transaction committed successfully');
          return newId;
        }
        
        await client.query('ROLLBACK');
        console.log('🔄 DEBUG: Transaction rolled back due to error');
        throw dbError;
      }
    } catch (error) {
      console.error('❌ DEBUG: Fatal error in createRecurringTask:', error);
      try {
        await client.query('ROLLBACK');
        console.log('🔄 DEBUG: Transaction rolled back due to fatal error');
      } catch (rollbackError) {
        console.error('❌ DEBUG: Error during rollback:', rollbackError);
      }
      return null;
    } finally {
      client.release();
      console.log('🔌 DEBUG: Database client released');
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
        return [];
      }

      const result = await pool.query(`
        SELECT dp.*, t.tekst as actie_tekst, t.project_id, t.context_id, t.duur as actie_duur
        FROM dagelijkse_planning dp
        LEFT JOIN taken t ON dp.actie_id = t.id
        WHERE dp.datum = $1 AND dp.user_id = $2
        AND (dp.actie_id IS NULL OR t.afgewerkt IS NULL)
        ORDER BY dp.uur ASC, dp.positie ASC, dp.aangemaakt ASC
      `, [datum, userId]);
      
      return result.rows.map(row => ({
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
    } catch (error) {
      console.error('Error getting dagelijkse planning:', error);
      return [];
    }
  },

  async addToDagelijksePlanning(planningItem, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ addToDagelijksePlanning called without userId - operation cancelled');
        return null;
      }

      const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      
      // Calculate next position for this hour for this user
      let positie = planningItem.positie;
      if (positie === undefined || positie === null) {
        const maxPosResult = await pool.query(`
          SELECT COALESCE(MAX(positie), -1) + 1 as next_position
          FROM dagelijkse_planning 
          WHERE datum = $1 AND uur = $2 AND user_id = $3
        `, [planningItem.datum, planningItem.uur, userId]);
        positie = maxPosResult.rows[0].next_position;
      }

      // If inserting at specific position, shift other items for this user
      if (planningItem.positie !== undefined && planningItem.positie !== null) {
        await pool.query(`
          UPDATE dagelijkse_planning 
          SET positie = positie + 1 
          WHERE datum = $1 AND uur = $2 AND positie >= $3 AND user_id = $4
        `, [planningItem.datum, planningItem.uur, planningItem.positie, userId]);
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
      
      return id;
    } catch (error) {
      console.error('Error adding to dagelijkse planning:', error);
      throw error;
    }
  },

  async updateDagelijksePlanning(id, updates, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ updateDagelijksePlanning called without userId - operation cancelled');
        return false;
      }

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
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating dagelijkse planning:', error);
      return false;
    }
  },

  async reorderDagelijksePlanning(id, targetUur, targetPosition, userId) {
    try {
      if (!userId) {
        console.warn('⚠️ reorderDagelijksePlanning called without userId - operation cancelled');
        return false;
      }

      // Get current item info with user verification
      const currentResult = await pool.query(`
        SELECT datum, uur, positie FROM dagelijkse_planning WHERE id = $1 AND user_id = $2
      `, [id, userId]);
      
      if (currentResult.rows.length === 0) {
        return false;
      }
      
      const current = currentResult.rows[0];
      const datum = current.datum;
      const currentUur = current.uur;
      const currentPositie = current.positie;
      
      // If moving to different hour or specific position
      if (currentUur !== targetUur || targetPosition !== null) {
        // Remove from current position (shift items down) - only for this user
        await pool.query(`
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
          await pool.query(`
            UPDATE dagelijkse_planning 
            SET positie = positie + 1 
            WHERE datum = $1 AND uur = $2 AND positie >= $3 AND user_id = $4
          `, [datum, targetUur, finalPosition, userId]);
        }
        
        // Update item with new hour and position
        await pool.query(`
          UPDATE dagelijkse_planning 
          SET uur = $1, positie = $2 
          WHERE id = $3 AND user_id = $4
        `, [targetUur, finalPosition, id, userId]);
        
        return true;
      }
      
      return true; // No change needed
    } catch (error) {
      console.error('Error reordering dagelijkse planning:', error);
      return false;
    }
  },

  async deleteDagelijksePlanning(id) {
    try {
      const result = await pool.query('DELETE FROM dagelijkse_planning WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting dagelijkse planning:', error);
      return false;
    }
  },

  async getIngeplandeActies(datum) {
    try {
      const result = await pool.query(`
        SELECT DISTINCT actie_id
        FROM dagelijkse_planning
        WHERE datum = $1 AND actie_id IS NOT NULL
      `, [datum]);
      
      return result.rows.map(row => row.actie_id);
    } catch (error) {
      console.error('Error getting ingeplande acties:', error);
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
