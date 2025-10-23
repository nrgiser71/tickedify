const { pool } = require('./database.js');
const { storageManager } = require('./storage-manager.js');

/**
 * Migration script to move existing database-stored files to Backblaze B2
 * This is needed when transitioning from hybrid to pure B2 storage
 */
async function migrateDatabaseFilesToB2() {
  console.log('🚀 Starting migration from database to pure B2 storage...');
  
  try {
    await storageManager.initialize();
    
    if (!storageManager.isB2Available()) {
      throw new Error('❌ B2 storage not available - cannot perform migration');
    }

    // Find all bijlagen that are stored in database (have bestand_data)
    const result = await pool.query(`
      SELECT id, taak_id, bestandsnaam, bestandsgrootte, mimetype, bestand_data, user_id
      FROM bijlagen 
      WHERE storage_type = 'database' AND bestand_data IS NOT NULL
      ORDER BY geupload ASC
    `);

    const databaseFiles = result.rows;
    console.log(`📁 Found ${databaseFiles.length} files to migrate from database to B2`);

    if (databaseFiles.length === 0) {
      console.log('✅ No files to migrate - already using pure B2 storage');
      return;
    }

    let migrated = 0;
    let errors = 0;

    for (const file of databaseFiles) {
      try {
        console.log(`📤 Migrating: ${file.bestandsnaam} (${file.bestandsgrootte} bytes)`);
        
        // Create a file-like object for the storage manager
        const fileObject = {
          originalname: file.bestandsnaam,
          buffer: file.bestand_data,
          size: file.bestandsgrootte,
          mimetype: file.mimetype
        };

        // Generate B2 path
        const fileName = `${file.user_id}/${file.taak_id}/${file.id}_${file.bestandsnaam}`;
        
        // Upload to B2
        const uploadUrl = await storageManager.b2Client.getUploadUrl({
          bucketId: storageManager.bucketId
        });

        await storageManager.b2Client.uploadFile({
          uploadUrl: uploadUrl.data.uploadUrl,
          uploadAuthToken: uploadUrl.data.authorizationToken,
          fileName: fileName,
          data: file.bestand_data,
          mime: file.mimetype
        });

        // Update database record to point to B2
        await pool.query(`
          UPDATE bijlagen 
          SET storage_type = 'backblaze', 
              storage_path = $1,
              bestand_data = NULL
          WHERE id = $2
        `, [fileName, file.id]);

        migrated++;
        console.log(`✅ Migrated: ${file.bestandsnaam}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${file.bestandsnaam}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migrated} files`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} files`);
    }
    
    // Verify migration
    const remainingDatabaseFiles = await pool.query(`
      SELECT COUNT(*) as count 
      FROM bijlagen 
      WHERE storage_type = 'database' AND bestand_data IS NOT NULL
    `);
    
    const remainingCount = parseInt(remainingDatabaseFiles.rows[0].count);
    if (remainingCount === 0) {
      console.log(`🏆 All files successfully migrated to B2!`);
    } else {
      console.log(`⚠️ ${remainingCount} files still in database - check error logs above`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabaseFilesToB2()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabaseFilesToB2 };