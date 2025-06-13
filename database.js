const { Pool } = require('pg');

  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized:
  false } : false
  });

  // Initialize database tables
  const initDatabase = async () => {
    try {
      console.log('🔧 Initializing database...');

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
          afgewerkt TIMESTAMP
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
          query = 'SELECT * FROM taken WHERE afgewerkt IS NOT NULL ORDER BY
   afgewerkt DESC';
        } else {
          query = 'SELECT * FROM taken WHERE lijst = $1 AND afgewerkt IS 
  NULL ORDER BY aangemaakt DESC';
        }

        const params = (listName === 'projecten-lijst' || listName ===
  'contexten' || listName === 'afgewerkte-taken') ? [] : [listName];
        const result = await pool.query(query, params);
        return result.rows;
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
              'INSERT INTO projecten (id, naam, aangemaakt) VALUES ($1, $2,
   $3)',
              [item.id, item.naam, item.aangemaakt]
            );
          }
        } else if (listName === 'contexten') {
          // Clear and insert contexts
          await pool.query('DELETE FROM contexten');
          for (const item of items) {
            await pool.query(
              'INSERT INTO contexten (id, naam, aangemaakt) VALUES ($1, $2,
   $3)',
              [item.id, item.naam, item.aangemaakt]
            );
          }
        } else if (listName === 'afgewerkte-taken') {
          // Update completed tasks
          await pool.query('DELETE FROM taken WHERE afgewerkt IS NOT 
  NULL');
          for (const item of items) {
            await pool.query(`
              INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, 
  verschijndatum, context_id, duur, type, afgewerkt)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              item.id, item.tekst, item.aangemaakt, item.lijst ||
  'afgewerkt',
              item.projectId, item.verschijndatum, item.contextId,
  item.duur, item.type, item.afgewerkt
            ]);
          }
        } else {
          // Clear and insert tasks for specific list
          await pool.query('DELETE FROM taken WHERE lijst = $1 AND 
  afgewerkt IS NULL', [listName]);
          for (const item of items) {
            await pool.query(`
              INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, 
  verschijndatum, context_id, duur, type)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              item.id, item.tekst, item.aangemaakt, listName,
              item.projectId, item.verschijndatum, item.contextId,
  item.duur, item.type
            ]);
          }
        }
        return true;
      } catch (error) {
        console.error(`Error saving list ${listName}:`, error);
        return false;
      }
    },

    // Get counts for all lists
    async getCounts() {
      try {
        const result = await pool.query(`
          SELECT 
            COUNT(*) FILTER (WHERE lijst = 'inbox' AND afgewerkt IS NULL) 
  as inbox,
            COUNT(*) FILTER (WHERE lijst = 'acties' AND afgewerkt IS NULL) 
  as acties,
            COUNT(*) FILTER (WHERE lijst = 'opvolgen' AND afgewerkt IS 
  NULL) as opvolgen,
            COUNT(*) FILTER (WHERE afgewerkt IS NOT NULL) as 
  "afgewerkte-taken",
            COUNT(*) FILTER (WHERE lijst = 'uitgesteld-wekelijks' AND 
  afgewerkt IS NULL) as "uitgesteld-wekelijks",
            COUNT(*) FILTER (WHERE lijst = 'uitgesteld-maandelijks' AND 
  afgewerkt IS NULL) as "uitgesteld-maandelijks",
            COUNT(*) FILTER (WHERE lijst = 'uitgesteld-3maandelijks' AND 
  afgewerkt IS NULL) as "uitgesteld-3maandelijks",
            COUNT(*) FILTER (WHERE lijst = 'uitgesteld-6maandelijks' AND 
  afgewerkt IS NULL) as "uitgesteld-6maandelijks",
            COUNT(*) FILTER (WHERE lijst = 'uitgesteld-jaarlijks' AND 
  afgewerkt IS NULL) as "uitgesteld-jaarlijks"
          FROM taken
        `);

        const projectCount = await pool.query('SELECT COUNT(*) as count 
  FROM projecten');

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
