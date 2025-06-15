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
    
    // Create tables
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
        herhaling_type VARCHAR(30),
        herhaling_waarde INTEGER,
        herhaling_actief BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projecten (
        id VARCHAR(50) PRIMARY KEY,
        naam TEXT NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contexten (
        id VARCHAR(50) PRIMARY KEY,
        naam TEXT NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_taken_lijst ON taken(lijst);
      CREATE INDEX IF NOT EXISTS idx_taken_project ON taken(project_id);
      CREATE INDEX IF NOT EXISTS idx_taken_context ON taken(context_id);
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
  // Get all items from a specific list
  async getList(listName) {
    try {
      let query;
      if (listName === 'projecten-lijst') {
        query = 'SELECT * FROM projecten ORDER BY aangemaakt DESC';
      } else if (listName === 'contexten') {
        query = 'SELECT * FROM contexten ORDER BY aangemaakt DESC';
      } else if (listName === 'afgewerkte-taken') {
        query = 'SELECT * FROM taken WHERE afgewerkt IS NOT NULL ORDER BY afgewerkt DESC';
      } else {
        query = 'SELECT * FROM taken WHERE lijst = $1 AND afgewerkt IS NULL ORDER BY aangemaakt DESC';
      }
      
      const params = (listName === 'projecten-lijst' || listName === 'contexten' || listName === 'afgewerkte-taken') ? [] : [listName];
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
  async saveList(listName, items) {
    try {
      if (listName === 'projecten-lijst') {
        // Clear and insert projects
        await pool.query('DELETE FROM projecten');
        for (const item of items) {
          await pool.query(
            'INSERT INTO projecten (id, naam, aangemaakt) VALUES ($1, $2, $3)',
            [item.id, item.naam, item.aangemaakt]
          );
        }
      } else if (listName === 'contexten') {
        // Clear and insert contexts
        await pool.query('DELETE FROM contexten');
        for (const item of items) {
          await pool.query(
            'INSERT INTO contexten (id, naam, aangemaakt) VALUES ($1, $2, $3)',
            [item.id, item.naam, item.aangemaakt]
          );
        }
      } else if (listName === 'afgewerkte-taken') {
        // Update completed tasks
        await pool.query('DELETE FROM taken WHERE afgewerkt IS NOT NULL');
        for (const item of items) {
          await pool.query(`
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, afgewerkt, herhaling_type, herhaling_waarde, herhaling_actief)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            item.id, item.tekst, item.aangemaakt, item.lijst || 'afgewerkt',
            item.projectId, item.verschijndatum, item.contextId, item.duur, item.type, item.afgewerkt,
            item.herhalingType, item.herhalingWaarde, item.herhalingActief
          ]);
        }
      } else {
        // Clear and insert tasks for specific list
        await pool.query('DELETE FROM taken WHERE lijst = $1 AND afgewerkt IS NULL', [listName]);
        for (const item of items) {
          await pool.query(`
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            item.id, item.tekst, item.aangemaakt, listName,
            item.projectId, item.verschijndatum, item.contextId, item.duur, item.type,
            item.herhalingType, item.herhalingWaarde, item.herhalingActief
          ]);
        }
      }
      return true;
    } catch (error) {
      console.error(`Error saving list ${listName}:`, error);
      return false;
    }
  },

  // Move/update a single task
  async updateTask(taskId, updates) {
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

      values.push(taskId);
      const query = `UPDATE taken SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
      
      try {
        const result = await pool.query(query, values);
        return result.rowCount > 0;
      } catch (dbError) {
        // If error is about missing column, try without herhaling fields
        if (dbError.message.includes('herhaling_type') || 
            dbError.message.includes('herhaling_waarde') || 
            dbError.message.includes('herhaling_actief')) {
          
          console.log('Herhaling columns not found, falling back to basic update');
          
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
              return; // Skip herhaling fields
            }
            basicValues.push(updates[key]);
            basicParamIndex++;
          });

          basicValues.push(taskId);
          const basicQuery = `UPDATE taken SET ${basicFields.join(', ')} WHERE id = $${basicParamIndex}`;
          
          const basicResult = await pool.query(basicQuery, basicValues);
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
  async createRecurringTask(originalTask, newDate) {
    try {
      const newId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      
      // Try with herhaling fields first
      try {
        await pool.query(`
          INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          newId, originalTask.tekst, new Date().toISOString(), originalTask.lijst,
          originalTask.projectId, newDate, originalTask.contextId, originalTask.duur, originalTask.type,
          originalTask.herhalingType, originalTask.herhalingWaarde, originalTask.herhalingActief
        ]);
        return newId;
      } catch (dbError) {
        // If herhaling columns don't exist, fall back to basic insert
        if (dbError.message.includes('herhaling_type') || 
            dbError.message.includes('herhaling_waarde') || 
            dbError.message.includes('herhaling_actief')) {
          
          console.log('Herhaling columns not found, creating basic task without recurrence');
          
          await pool.query(`
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            newId, originalTask.tekst, new Date().toISOString(), originalTask.lijst,
            originalTask.projectId, newDate, originalTask.contextId, originalTask.duur, originalTask.type
          ]);
          return newId;
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error creating recurring task:', error);
      return null;
    }
  },

  // Get counts for all lists
  async getCounts() {
    try {
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
        FROM taken
      `);
      
      const projectCount = await pool.query('SELECT COUNT(*) as count FROM projecten');
      
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
  }
};

module.exports = { initDatabase, db, pool };