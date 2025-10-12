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
        ADD COLUMN IF NOT EXISTS prioriteit_datum DATE,
        ADD COLUMN IF NOT EXISTS prioriteit VARCHAR(10) DEFAULT 'gemiddeld' CHECK (prioriteit IN ('laag', 'gemiddeld', 'hoog'))
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
        { name: 'prioriteit_datum', type: 'DATE' },
        { name: 'prioriteit', type: 'VARCHAR(10) DEFAULT \'gemiddeld\' CHECK (prioriteit IN (\'laag\', \'gemiddeld\', \'hoog\'))' }
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

    // Add beta testing columns to users table
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'beta',
        ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'beta_active',
        ADD COLUMN IF NOT EXISTS ghl_contact_id VARCHAR(255)
      `);
      console.log('✅ Added beta testing columns to users table');
    } catch (betaMigrateError) {
      console.log('⚠️ Could not add beta columns, trying individually:', betaMigrateError.message);
      // Try individual column additions for databases that don't support multiple ADD COLUMN IF NOT EXISTS
      const betaColumns = [
        { name: 'account_type', type: 'VARCHAR(20) DEFAULT \'beta\'' },
        { name: 'subscription_status', type: 'VARCHAR(20) DEFAULT \'beta_active\'' },
        { name: 'ghl_contact_id', type: 'VARCHAR(255)' }
      ];
      
      for (const col of betaColumns) {
        try {
          await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added beta column ${col.name}`);
        } catch (colError) {
          console.log(`⚠️ Beta column ${col.name} might already exist:`, colError.message);
        }
      }
    }

    // Add subscription selection columns to users table
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS selected_plan VARCHAR(20),
        ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS selection_source VARCHAR(20)
      `);
      console.log('✅ Added subscription selection columns to users table');
    } catch (subscriptionMigrateError) {
      console.log('⚠️ Could not add subscription columns, trying individually:', subscriptionMigrateError.message);
      // Try individual column additions for databases that don't support multiple ADD COLUMN IF NOT EXISTS
      const subscriptionColumns = [
        { name: 'selected_plan', type: 'VARCHAR(20)' },
        { name: 'plan_selected_at', type: 'TIMESTAMP' },
        { name: 'selection_source', type: 'VARCHAR(20)' }
      ];

      for (const col of subscriptionColumns) {
        try {
          await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added subscription column ${col.name}`);
        } catch (colError) {
          console.log(`⚠️ Subscription column ${col.name} might already exist:`, colError.message);
        }
      }
    }

    // Add index for subscription plan queries
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_selected_plan
        ON users(selected_plan) WHERE selected_plan IS NOT NULL
      `);
      console.log('✅ Added index for selected_plan column');
    } catch (indexError) {
      console.log('⚠️ Could not add selected_plan index:', indexError.message);
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

    // Create waitlist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT,
        referrer TEXT
      )
    `);

    // Create feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id),
        type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature')),
        titel VARCHAR(255) NOT NULL,
        beschrijving TEXT NOT NULL,
        stappen TEXT,
        status VARCHAR(20) DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'in_behandeling', 'opgelost')),
        prioriteit VARCHAR(20) DEFAULT 'normaal' CHECK (prioriteit IN ('laag', 'normaal', 'hoog', 'kritiek')),
        context JSONB,
        aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bijgewerkt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create subtaken table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subtaken (
        id SERIAL PRIMARY KEY,
        parent_taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE,
        titel VARCHAR(500) NOT NULL,
        voltooid BOOLEAN DEFAULT FALSE,
        volgorde INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bijlagen table for task attachments (pure B2 storage)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bijlagen (
        id VARCHAR(50) PRIMARY KEY,
        taak_id VARCHAR(50) NOT NULL REFERENCES taken(id) ON DELETE CASCADE,
        bestandsnaam VARCHAR(255) NOT NULL,
        bestandsgrootte INTEGER NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        storage_type VARCHAR(20) NOT NULL DEFAULT 'backblaze' CHECK (storage_type = 'backblaze'),
        storage_path VARCHAR(500) NOT NULL, -- B2 object key (required for all files)
        geupload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(50) REFERENCES users(id)
      )
    `);

    // Migration: Drop bestand_data column if it exists (for pure B2 storage)
    try {
      await pool.query(`
        ALTER TABLE bijlagen DROP COLUMN IF EXISTS bestand_data
      `);
      console.log('✅ Migrated bijlagen table to pure B2 storage');
    } catch (error) {
      // Ignore error if column doesn't exist
      console.log('📝 bestand_data column removal: already done or not needed');
    }

    // Create user storage usage tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_storage_usage (
        user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
        used_bytes BIGINT DEFAULT 0,
        bijlagen_count INTEGER DEFAULT 0,
        premium_expires DATE, -- NULL = free user
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // Add due_date and opmerkingen columns to projecten table
    try {
      await pool.query('ALTER TABLE projecten ADD COLUMN IF NOT EXISTS due_date DATE');
      await pool.query('ALTER TABLE projecten ADD COLUMN IF NOT EXISTS opmerkingen TEXT');
      console.log('✅ Due date and opmerkingen columns added to projecten table');
    } catch (error) {
      console.log('⚠️ Could not add projecten columns (might already exist):', error.message);
    }

    // Add premium_expires column to users table if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires DATE');
      console.log('✅ Premium expires column added to users table');
    } catch (error) {
      console.log('⚠️ Could not add premium_expires column (might already exist):', error.message);
    }

    // Create beta configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS beta_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        beta_period_active BOOLEAN DEFAULT TRUE,
        beta_ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default beta config if it doesn't exist
    try {
      await pool.query(`
        INSERT INTO beta_config (id, beta_period_active) 
        VALUES (1, TRUE) 
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Beta configuration table created with default settings');
    } catch (error) {
      console.log('⚠️ Could not insert default beta config:', error.message);
    }

    // Update bestaande taken die nog geen prioriteit hebben naar 'gemiddeld'
    try {
      const updateResult = await pool.query(`
        UPDATE taken SET prioriteit = 'gemiddeld'
        WHERE prioriteit IS NULL OR prioriteit = ''
      `);
      if (updateResult.rowCount > 0) {
        console.log(`✅ Updated ${updateResult.rowCount} existing tasks to 'gemiddeld' priority`);
      }
    } catch (error) {
      console.log('⚠️ Could not update existing tasks priority (might not have prioriteit column yet):', error.message);
    }

    // Feature 011: Payment System - Extend users table
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS trial_start_date DATE,
        ADD COLUMN IF NOT EXISTS trial_end_date DATE,
        ADD COLUMN IF NOT EXISTS had_trial BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS plugandpay_order_id VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER,
        ADD COLUMN IF NOT EXISTS login_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS login_token_expires TIMESTAMP,
        ADD COLUMN IF NOT EXISTS login_token_used BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Feature 011: Payment tracking columns added to users table');
    } catch (paymentMigrateError) {
      console.log('⚠️ Could not add payment columns, trying individually:', paymentMigrateError.message);
      const paymentColumns = [
        { name: 'payment_confirmed_at', type: 'TIMESTAMP' },
        { name: 'trial_start_date', type: 'DATE' },
        { name: 'trial_end_date', type: 'DATE' },
        { name: 'had_trial', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'plugandpay_order_id', type: 'VARCHAR(255) UNIQUE' },
        { name: 'amount_paid_cents', type: 'INTEGER' },
        { name: 'login_token', type: 'VARCHAR(255)' },
        { name: 'login_token_expires', type: 'TIMESTAMP' },
        { name: 'login_token_used', type: 'BOOLEAN DEFAULT FALSE' }
      ];

      for (const col of paymentColumns) {
        try {
          await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added payment column ${col.name}`);
        } catch (colError) {
          console.log(`⚠️ Payment column ${col.name} might already exist:`, colError.message);
        }
      }
    }

    // Feature 011: Create payment_configurations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_configurations (
        id SERIAL PRIMARY KEY,
        plan_id VARCHAR(50) UNIQUE NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        checkout_url TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Feature 011: Insert initial payment configurations
    try {
      await pool.query(`
        INSERT INTO payment_configurations (plan_id, plan_name, checkout_url, is_active) VALUES
          ('monthly_7', 'Maandelijks €7', '', FALSE),
          ('yearly_70', 'Jaarlijks €70', '', FALSE),
          ('monthly_8', 'Premium Plus Maandelijks €8', '', FALSE),
          ('yearly_80', 'Premium Plus Jaarlijks €80', '', FALSE)
        ON CONFLICT (plan_id) DO NOTHING
      `);
      console.log('✅ Feature 011 & 013: Payment configurations initialized (Standard + Premium Plus)');
    } catch (error) {
      console.log('⚠️ Could not insert payment configurations:', error.message);
    }

    // Feature v0.18.5: Add landing_page_url column for post-payment redirects
    try {
      await pool.query(`
        ALTER TABLE payment_configurations
        ADD COLUMN IF NOT EXISTS landing_page_url TEXT DEFAULT NULL
      `);
      console.log('✅ Feature v0.18.5: Added landing_page_url column to payment_configurations');
    } catch (error) {
      console.log('⚠️ Could not add landing_page_url column:', error.message);
    }

    // Feature 011: Create payment_webhook_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_webhook_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100),
        order_id VARCHAR(255),
        email VARCHAR(255),
        amount_cents INTEGER,
        payload JSONB,
        signature_valid BOOLEAN,
        processed_at TIMESTAMP DEFAULT NOW(),
        error_message TEXT,
        ip_address VARCHAR(45)
      )
    `);

    // Feature 011: Add payment indexes
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
        CREATE INDEX IF NOT EXISTS idx_users_plugandpay_order_id ON users(plugandpay_order_id);
        CREATE INDEX IF NOT EXISTS idx_users_login_token ON users(login_token) WHERE login_token_used = FALSE;
        CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON users(trial_end_date) WHERE subscription_status = 'trialing';
        CREATE INDEX IF NOT EXISTS idx_payment_configs_plan_id ON payment_configurations(plan_id);
        CREATE INDEX IF NOT EXISTS idx_payment_configs_active ON payment_configurations(is_active);
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON payment_webhook_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON payment_webhook_logs(order_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON payment_webhook_logs(processed_at);
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON payment_webhook_logs(event_type);
      `);
      console.log('✅ Feature 011: Payment system indexes created');
    } catch (indexError) {
      console.log('⚠️ Could not create payment indexes:', indexError.message);
    }

    // Feature 011: Create updated_at trigger for payment_configurations
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_payment_config_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER payment_config_updated_at
          BEFORE UPDATE ON payment_configurations
          FOR EACH ROW
          EXECUTE FUNCTION update_payment_config_updated_at();
      `);
      console.log('✅ Feature 011: Payment configuration trigger created');
    } catch (triggerError) {
      console.log('⚠️ Payment configuration trigger might already exist:', triggerError.message);
    }

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_taken_lijst ON taken(lijst);
      CREATE INDEX IF NOT EXISTS idx_taken_project ON taken(project_id);
      CREATE INDEX IF NOT EXISTS idx_taken_context ON taken(context_id);
      CREATE INDEX IF NOT EXISTS idx_taken_user ON taken(user_id);
      CREATE INDEX IF NOT EXISTS idx_taken_user_lijst ON taken(user_id, lijst);
      CREATE INDEX IF NOT EXISTS idx_taken_prioriteit ON taken(prioriteit);
      CREATE INDEX IF NOT EXISTS idx_projecten_user ON projecten(user_id);
      CREATE INDEX IF NOT EXISTS idx_contexten_user ON contexten(user_id);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_datum ON dagelijkse_planning(datum);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_actie ON dagelijkse_planning(actie_id);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_datum_uur ON dagelijkse_planning(datum, uur);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_user ON dagelijkse_planning(user_id);
      CREATE INDEX IF NOT EXISTS idx_dagelijkse_planning_user_datum ON dagelijkse_planning(user_id, datum);
      CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
      CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
      CREATE INDEX IF NOT EXISTS idx_subtaken_parent ON subtaken(parent_taak_id);
      CREATE INDEX IF NOT EXISTS idx_subtaken_parent_volgorde ON subtaken(parent_taak_id, volgorde);
      CREATE INDEX IF NOT EXISTS idx_bijlagen_taak ON bijlagen(taak_id);
      CREATE INDEX IF NOT EXISTS idx_bijlagen_user ON bijlagen(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_storage_usage_premium ON user_storage_usage(premium_expires);
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
  // Get a single task by ID for a specific user
  async getTask(taskId, userId) {
    try {
      if (!pool) {
        throw new Error('Database pool not available');
      }

      if (!userId) {
        console.warn('⚠️ getTask called without userId - operation cancelled');
        return null;
      }

      const result = await pool.query(
        'SELECT * FROM taken WHERE id = $1 AND user_id = $2',
        [taskId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting task:', error);
      throw error;
    }
  },

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
            INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, afgewerkt, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, prioriteit, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [
            item.id, item.tekst, item.aangemaakt, item.lijst || 'afgewerkt',
            item.projectId, item.verschijndatum, item.contextId, item.duur, item.type, item.afgewerkt,
            item.herhalingType, item.herhalingWaarde, item.herhalingActief, item.opmerkingen, item.prioriteit || 'gemiddeld', userId
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
              INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, prioriteit, afgewerkt, user_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
              item.prioriteit || 'gemiddeld',
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
                INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, opmerkingen, prioriteit, afgewerkt, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
                item.prioriteit || 'gemiddeld',
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
          originalTask.prioriteit || 'gemiddeld',
          null, 
          userId
        ];
        
        const insertResult = await client.query(`
          INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, herhaling_type, herhaling_waarde, herhaling_actief, opmerkingen, prioriteit, afgewerkt, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `, insertValues);
        
        if (insertResult.rows.length === 0) {
          throw new Error('Insert returned no rows');
        }
        
        // Copy bijlagen references from original task to new recurring task
        // Debug: log all available properties
        console.log('🔍 DEBUG: originalTask properties:', Object.keys(originalTask));
        console.log('🔍 DEBUG: originalTask sample values:', {
          id: originalTask.id,
          taakId: originalTask.taakId,
          task_id: originalTask.task_id,
          originalId: originalTask.originalId
        });
        
        const originalTaskId = originalTask.id || originalTask.taakId || originalTask.task_id || null;
        if (originalTaskId) {
          console.log('✅ Found original task ID for bijlagen:', originalTaskId);
          await this.copyBijlagenReferences(originalTaskId, newId, userId, client);
        } else {
          console.log('⚠️ No original task ID found for bijlagen copying - skipping');
          console.log('⚠️ Available properties:', Object.keys(originalTask));
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
          originalTask.prioriteit || 'gemiddeld',
          null, 
          userId
        ];
        
        const basicInsertResult = await client.query(`
          INSERT INTO taken (id, tekst, aangemaakt, lijst, project_id, verschijndatum, context_id, duur, type, opmerkingen, prioriteit, afgewerkt, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `, basicInsertValues);
        
        if (basicInsertResult.rows.length === 0) {
          throw new Error('Basic insert returned no rows');
        }
        
        // Copy bijlagen references from original task to new recurring task
        // Debug: log all available properties
        console.log('🔍 DEBUG: originalTask properties:', Object.keys(originalTask));
        console.log('🔍 DEBUG: originalTask sample values:', {
          id: originalTask.id,
          taakId: originalTask.taakId,
          task_id: originalTask.task_id,
          originalId: originalTask.originalId
        });
        
        const originalTaskId = originalTask.id || originalTask.taakId || originalTask.task_id || null;
        if (originalTaskId) {
          console.log('✅ Found original task ID for bijlagen:', originalTaskId);
          await this.copyBijlagenReferences(originalTaskId, newId, userId, client);
        } else {
          console.log('⚠️ No original task ID found for bijlagen copying - skipping');
          console.log('⚠️ Available properties:', Object.keys(originalTask));
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

  // Copy bijlagen references from original task to new recurring task
  async copyBijlagenReferences(originalTaskId, newTaskId, userId, client) {
    try {
      console.log('📎 Copying bijlagen references from', originalTaskId, 'to', newTaskId);
      
      const result = await client.query(`
        INSERT INTO bijlagen (id, taak_id, bestandsnaam, bestandsgrootte, 
                             mimetype, storage_type, storage_path, user_id)
        SELECT 
          $2 || '_bij_' || ROW_NUMBER() OVER() as id, -- nieuwe unieke bijlage ID
          $2, -- nieuwe taak_id  
          bestandsnaam, 
          bestandsgrootte, 
          mimetype, 
          storage_type, 
          storage_path,  -- ZELFDE B2 bestand - geen duplicaat!
          user_id
        FROM bijlagen 
        WHERE taak_id = $1 AND user_id = $3
        RETURNING id
      `, [originalTaskId, newTaskId, userId]);
      
      if (result.rowCount > 0) {
        console.log('✅ Copied', result.rowCount, 'bijlagen references to new recurring task');
      } else {
        console.log('📎 No bijlagen to copy - task had no attachments');
      }
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error copying bijlagen references:', error);
      // Don't throw - bijlagen copying should not fail the recurring task creation
      return 0;
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

  // Clean project names from planning items (remove "(ProjectName)" from naam field)
  async cleanPlanningProjectNames(userId) {
    try {
      // Update planning items where naam contains project in parentheses
      // Extract the tekst from taken table and use that as the clean naam
      const result = await pool.query(`
        UPDATE dagelijkse_planning dp
        SET naam = t.tekst
        FROM taken t
        WHERE dp.actie_id = t.id 
        AND dp.user_id = $1
        AND dp.naam ~ '\\(.*\\)$'
        AND dp.naam != t.tekst
      `, [userId]);
      
      console.log(`✅ Cleaned ${result.rowCount} planning items - removed project names from naam field`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error cleaning planning project names:', error);
      throw error;
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
  },

  // Feedback functions
  async createFeedback(feedbackData) {
    try {
      const { userId, type, titel, beschrijving, stappen, prioriteit, context } = feedbackData;
      
      // Generate unique ID
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const result = await pool.query(
        `INSERT INTO feedback (id, user_id, type, titel, beschrijving, stappen, prioriteit, context) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [id, userId, type, titel, beschrijving, stappen || null, prioriteit || 'normaal', context || null]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  },

  async getFeedback(userId, isAdmin = false) {
    try {
      let query;
      let params;
      
      if (isAdmin) {
        // Admin can see all feedback
        query = `
          SELECT f.*, u.naam as user_naam, u.email as user_email 
          FROM feedback f
          LEFT JOIN users u ON f.user_id = u.id
          ORDER BY f.aangemaakt DESC
        `;
        params = [];
      } else {
        // Regular users can only see their own feedback
        query = `
          SELECT * FROM feedback 
          WHERE user_id = $1 
          ORDER BY aangemaakt DESC
        `;
        params = [userId];
      }
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting feedback:', error);
      return [];
    }
  },

  async updateFeedbackStatus(feedbackId, status, userId, isAdmin = false) {
    try {
      let query;
      let params;
      
      if (isAdmin) {
        // Admin can update any feedback
        query = `
          UPDATE feedback 
          SET status = $1, bijgewerkt = CURRENT_TIMESTAMP 
          WHERE id = $2 
          RETURNING *
        `;
        params = [status, feedbackId];
      } else {
        // Regular users can only update their own feedback
        query = `
          UPDATE feedback 
          SET status = $1, bijgewerkt = CURRENT_TIMESTAMP 
          WHERE id = $2 AND user_id = $3 
          RETURNING *
        `;
        params = [status, feedbackId, userId];
      }
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw error;
    }
  },

  // Subtaken functions
  async getSubtaken(parentTaakId) {
    try {
      const result = await pool.query(`
        SELECT * FROM subtaken 
        WHERE parent_taak_id = $1 
        ORDER BY volgorde ASC, created_at ASC
      `, [parentTaakId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting subtaken:', error);
      return [];
    }
  },

  async createSubtaak(parentTaakId, titel, volgorde = null) {
    try {
      // If no volgorde specified, append to end
      if (volgorde === null || volgorde === undefined) {
        const maxResult = await pool.query(`
          SELECT COALESCE(MAX(volgorde), -1) + 1 as next_volgorde
          FROM subtaken 
          WHERE parent_taak_id = $1
        `, [parentTaakId]);
        volgorde = maxResult.rows[0].next_volgorde;
      } else {
        // Shift existing subtaken
        await pool.query(`
          UPDATE subtaken 
          SET volgorde = volgorde + 1 
          WHERE parent_taak_id = $1 AND volgorde >= $2
        `, [parentTaakId, volgorde]);
      }

      const result = await pool.query(`
        INSERT INTO subtaken (parent_taak_id, titel, volgorde) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `, [parentTaakId, titel, volgorde]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating subtaak:', error);
      throw error;
    }
  },

  async updateSubtaak(subtaakId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      });

      values.push(subtaakId);
      const query = `UPDATE subtaken SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating subtaak:', error);
      throw error;
    }
  },

  async deleteSubtaak(subtaakId) {
    try {
      // Get subtaak info before deletion for cleanup
      const subtaakResult = await pool.query('SELECT parent_taak_id, volgorde FROM subtaken WHERE id = $1', [subtaakId]);
      
      if (subtaakResult.rows.length === 0) {
        return false;
      }

      const { parent_taak_id, volgorde } = subtaakResult.rows[0];

      // Delete the subtaak
      const deleteResult = await pool.query('DELETE FROM subtaken WHERE id = $1', [subtaakId]);
      
      // Shift remaining subtaken down
      await pool.query(`
        UPDATE subtaken 
        SET volgorde = volgorde - 1 
        WHERE parent_taak_id = $1 AND volgorde > $2
      `, [parent_taak_id, volgorde]);

      return deleteResult.rowCount > 0;
    } catch (error) {
      console.error('Error deleting subtaak:', error);
      return false;
    }
  },

  async reorderSubtaken(parentTaakId, subtaakIds) {
    try {
      // Update volgorde for all subtaken in the new order
      for (let i = 0; i < subtaakIds.length; i++) {
        await pool.query(`
          UPDATE subtaken 
          SET volgorde = $1 
          WHERE id = $2 AND parent_taak_id = $3
        `, [i, subtaakIds[i], parentTaakId]);
      }
      
      return true;
    } catch (error) {
      console.error('Error reordering subtaken:', error);
      return false;
    }
  },

  // Bijlagen (Attachments) functions
  async createBijlage(bijlageData) {
    try {
      const result = await pool.query(`
        INSERT INTO bijlagen (id, taak_id, bestandsnaam, bestandsgrootte, mimetype, storage_type, storage_path, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        bijlageData.id,
        bijlageData.taak_id,
        bijlageData.bestandsnaam,
        bijlageData.bestandsgrootte,
        bijlageData.mimetype,
        bijlageData.storage_type, // Always 'backblaze'
        bijlageData.storage_path, // Required B2 path
        bijlageData.user_id
      ]);

      // Update user storage usage
      await this.updateUserStorageUsage(bijlageData.user_id);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating bijlage:', error);
      throw error;
    }
  },

  async getBijlagenForTaak(taakId) {
    try {
      const result = await pool.query(`
        SELECT id, taak_id, bestandsnaam, bestandsgrootte, mimetype, storage_type, storage_path, geupload, user_id
        FROM bijlagen 
        WHERE taak_id = $1 
        ORDER BY geupload DESC
      `, [taakId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting bijlagen for taak:', error);
      return [];
    }
  },

  async getBijlagenCountsForTaken(taakIds) {
    try {
      if (!taakIds || taakIds.length === 0) {
        return {};
      }
      
      const result = await pool.query(`
        SELECT taak_id, COUNT(*) as bijlagen_count
        FROM bijlagen 
        WHERE taak_id = ANY($1)
        GROUP BY taak_id
      `, [taakIds]);
      
      // Convert to object with taak_id as key
      const counts = {};
      result.rows.forEach(row => {
        counts[row.taak_id] = parseInt(row.bijlagen_count);
      });
      
      return counts;
    } catch (error) {
      console.error('Error getting bijlagen counts for taken:', error);
      return {};
    }
  },

  async getBijlage(bijlageId, includeData = false) {
    try {
      let query = `
        SELECT id, taak_id, bestandsnaam, bestandsgrootte, mimetype, storage_type, storage_path, geupload, user_id
        ${includeData ? ', bestand_data' : ''}
        FROM bijlagen 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [bijlageId]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting bijlage:', error);
      return null;
    }
  },

  async deleteBijlage(bijlageId, userId) {
    try {
      const result = await pool.query(`
        DELETE FROM bijlagen 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [bijlageId, userId]);

      if (result.rows.length > 0) {
        // Update user storage usage after deletion
        await this.updateUserStorageUsage(userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting bijlage:', error);
      return false;
    }
  },

  async updateUserStorageUsage(userId) {
    try {
      // Calculate total usage for this user
      const result = await pool.query(`
        SELECT 
          COALESCE(SUM(bestandsgrootte), 0) as used_bytes,
          COUNT(*) as bijlagen_count
        FROM bijlagen 
        WHERE user_id = $1
      `, [userId]);

      const { used_bytes, bijlagen_count } = result.rows[0];

      // Upsert the usage record
      await pool.query(`
        INSERT INTO user_storage_usage (user_id, used_bytes, bijlagen_count, updated)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET 
          used_bytes = $2,
          bijlagen_count = $3,
          updated = CURRENT_TIMESTAMP
      `, [userId, used_bytes, bijlagen_count]);

      return { used_bytes: parseInt(used_bytes), bijlagen_count: parseInt(bijlagen_count) };
    } catch (error) {
      console.error('Error updating user storage usage:', error);
      return { used_bytes: 0, bijlagen_count: 0 };
    }
  },

  async getUserStorageStats(userId) {
    try {
      const result = await pool.query(`
        SELECT used_bytes, bijlagen_count, premium_expires, updated
        FROM user_storage_usage 
        WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        // Initialize usage record if it doesn't exist
        return await this.updateUserStorageUsage(userId);
      }

      const stats = result.rows[0];
      return {
        used_bytes: parseInt(stats.used_bytes),
        bijlagen_count: parseInt(stats.bijlagen_count),
        premium_expires: stats.premium_expires,
        updated: stats.updated
      };
    } catch (error) {
      console.error('Error getting user storage stats:', error);
      return { used_bytes: 0, bijlagen_count: 0, premium_expires: null };
    }
  },

  async checkUserPremiumStatus(userId) {
    try {
      // Check for Premium Plus subscription (monthly_8 or yearly_80) in users table
      const userResult = await pool.query(`
        SELECT selected_plan, trial_end_date
        FROM users
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return false; // User not found
      }

      const { selected_plan, trial_end_date } = userResult.rows[0];

      // Define Premium Plus plan IDs
      const PREMIUM_PLUS_PLAN_IDS = ['monthly_8', 'yearly_80'];
      const PREMIUM_STANDARD_PLAN_IDS = ['monthly_7', 'yearly_70'];
      const ALL_PREMIUM_PLAN_IDS = [...PREMIUM_PLUS_PLAN_IDS, ...PREMIUM_STANDARD_PLAN_IDS];

      // Check if user has an active paid subscription (Standard or Premium Plus)
      if (selected_plan && ALL_PREMIUM_PLAN_IDS.includes(selected_plan)) {
        // Check if trial hasn't expired (for trial users)
        if (trial_end_date) {
          const now = new Date();
          const trialEnds = new Date(trial_end_date);
          if (trialEnds > now) {
            return true; // Trial still active
          }
          // Trial expired, check if they have a paid plan
          return selected_plan && ALL_PREMIUM_PLAN_IDS.includes(selected_plan);
        }
        // No trial_end_date means paid subscription
        return true;
      }

      // Fallback: Check legacy premium_expires in user_storage_usage table
      const storageResult = await pool.query(`
        SELECT premium_expires
        FROM user_storage_usage
        WHERE user_id = $1
      `, [userId]);

      if (storageResult.rows.length === 0) {
        return false; // No record = free user
      }

      const premiumExpires = storageResult.rows[0].premium_expires;
      if (!premiumExpires) {
        return false; // NULL = free user
      }

      // Check if legacy premium is still valid
      const now = new Date();
      const expires = new Date(premiumExpires);
      return expires > now;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  },

  // Beta configuration functions
  async getBetaConfig() {
    try {
      const result = await pool.query('SELECT * FROM beta_config WHERE id = 1');
      return result.rows[0] || { beta_period_active: true };
    } catch (error) {
      console.error('Error getting beta config:', error);
      return { beta_period_active: true }; // Default to beta active if error
    }
  },

  async updateBetaConfig(active) {
    try {
      const result = await pool.query(`
        UPDATE beta_config 
        SET beta_period_active = $1,
            beta_ended_at = CASE WHEN $1 = FALSE THEN NOW() ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `, [active]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating beta config:', error);
      throw error;
    }
  },

  async setPremiumStatus(userId, expiresDate) {
    try {
      await pool.query(`
        INSERT INTO user_storage_usage (user_id, premium_expires, updated)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET 
          premium_expires = $2,
          updated = CURRENT_TIMESTAMP
      `, [userId, expiresDate]);

      return true;
    } catch (error) {
      console.error('Error setting premium status:', error);
      return false;
    }
  }
};

module.exports = { initDatabase, db, pool };
