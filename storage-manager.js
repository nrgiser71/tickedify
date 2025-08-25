const B2 = require('backblaze-b2');

// Storage configuration
const STORAGE_CONFIG = {
  FREE_TIER_LIMIT: 100 * 1024 * 1024, // 100MB total for free users
  MAX_FILE_SIZE_FREE: 5 * 1024 * 1024, // 5MB max file size for free users
  MAX_ATTACHMENTS_PER_TASK_FREE: 1, // 1 attachment per task for free users
  ALLOWED_MIMETYPES: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other common types
    'application/json',
    'application/xml'
  ]
};

class StorageManager {
  constructor() {
    this.b2Client = null;
    this.bucketId = null;
    this.authToken = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // Only initialize B2 if credentials are provided
      if (process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY) {
        this.b2Client = new B2({
          applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
          applicationKey: process.env.B2_APPLICATION_KEY
        });

        // Authorize with B2
        await this.b2Client.authorize();
        console.log('✅ Backblaze B2 authorized successfully');

        // Get bucket info (create if needed)
        const bucketName = process.env.B2_BUCKET_NAME || 'tickedify-attachments';
        await this.ensureBucket(bucketName);
        
        this.initialized = true;
        console.log('✅ Storage Manager initialized with B2 support');
      } else {
        console.log('⚠️ B2 credentials not found - bijlagen system will not work');
        this.initialized = true;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Storage Manager:', error.message);
      // B2 initialization failed - bijlagen system will not work
      this.initialized = true;
      return false;
    }
  }

  async ensureBucket(bucketName) {
    try {
      const { data } = await this.b2Client.listBuckets();
      const existingBucket = data.buckets.find(bucket => bucket.bucketName === bucketName);
      
      if (existingBucket) {
        this.bucketId = existingBucket.bucketId;
        console.log('✅ Using existing B2 bucket:', bucketName);
      } else {
        const { data: bucketData } = await this.b2Client.createBucket({
          bucketName: bucketName,
          bucketType: 'allPrivate'
        });
        this.bucketId = bucketData.bucketId;
        console.log('✅ Created new B2 bucket:', bucketName);
      }
    } catch (error) {
      console.error('❌ Error with B2 bucket:', error.message);
      throw error;
    }
  }

  // Pure B2 storage - no storage type determination needed
  isB2Available() {
    return this.b2Client && this.bucketId;
  }

  // Validate file before upload
  validateFile(file, isPremium, userStats) {
    const errors = [];

    // Check file size limits
    if (!isPremium && file.size > STORAGE_CONFIG.MAX_FILE_SIZE_FREE) {
      errors.push(`Bestand te groot. Maximum ${this.formatBytes(STORAGE_CONFIG.MAX_FILE_SIZE_FREE)} voor gratis gebruikers.`);
    }

    // Check total storage limit for free users
    if (!isPremium) {
      const totalAfterUpload = userStats.used_bytes + file.size;
      if (totalAfterUpload > STORAGE_CONFIG.FREE_TIER_LIMIT) {
        const remaining = STORAGE_CONFIG.FREE_TIER_LIMIT - userStats.used_bytes;
        errors.push(`Onvoldoende opslag. Nog ${this.formatBytes(remaining)} beschikbaar van ${this.formatBytes(STORAGE_CONFIG.FREE_TIER_LIMIT)}.`);
      }
    }

    // Check MIME type
    if (!STORAGE_CONFIG.ALLOWED_MIMETYPES.includes(file.mimetype)) {
      errors.push(`Bestandstype '${file.mimetype}' niet toegestaan.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Upload file to Backblaze B2 storage (pure B2 approach)
  async uploadFile(file, taakId, userId) {
    await this.initialize();
    
    if (!this.isB2Available()) {
      throw new Error('Bestandsopslag niet beschikbaar. Contacteer support.');
    }
    
    const bijlageId = this.generateId();

    try {
      return await this.uploadToB2(file, bijlageId, taakId, userId);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  async uploadToB2(file, bijlageId, taakId, userId) {
    try {
      const fileName = `${userId}/${taakId}/${bijlageId}_${file.originalname}`;
      
      const uploadUrl = await this.b2Client.getUploadUrl({
        bucketId: this.bucketId
      });

      const response = await this.b2Client.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName: fileName,
        data: file.buffer,
        mime: file.mimetype
      });

      return {
        id: bijlageId,
        taak_id: taakId,
        bestandsnaam: file.originalname,
        bestandsgrootte: file.size,
        mimetype: file.mimetype,
        storage_type: 'backblaze',
        storage_path: fileName,
        user_id: userId
      };
    } catch (error) {
      console.error('❌ B2 upload failed:', error);
      throw new Error('Upload naar cloud storage gefaald');
    }
  }


  // Download file from Backblaze B2 storage
  async downloadFile(bijlage) {
    await this.initialize();
    
    if (!this.isB2Available()) {
      throw new Error('Bestandsopslag niet beschikbaar. Contacteer support.');
    }
    
    return await this.downloadFromB2(bijlage.storage_path);
  }

  async downloadFromB2(storagePath) {
    try {
      const response = await this.b2Client.downloadFileByName({
        bucketName: process.env.B2_BUCKET_NAME || 'tickedify-attachments',
        fileName: storagePath
      });

      return response.data;
    } catch (error) {
      console.error('❌ B2 download failed:', error);
      throw new Error('Download van cloud storage gefaald');
    }
  }

  // Delete file from Backblaze B2 storage
  async deleteFile(bijlage) {
    await this.initialize();
    
    if (!this.isB2Available()) {
      console.warn('⚠️ B2 not available for file deletion:', bijlage.storage_path);
      return;
    }

    try {
      // Get file info first
      const fileInfo = await this.b2Client.getFileInfo({
        bucketName: process.env.B2_BUCKET_NAME || 'tickedify-attachments',
        fileName: bijlage.storage_path
      });

      // Delete the file
      await this.b2Client.deleteFileVersion({
        fileId: fileInfo.data.fileId,
        fileName: bijlage.storage_path
      });

      console.log('✅ File deleted from B2:', bijlage.storage_path);
    } catch (error) {
      console.error('❌ B2 delete failed:', error);
      // Don't throw - database record will be deleted anyway
    }
  }

  // Utility functions
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Export singleton instance
const storageManager = new StorageManager();
module.exports = { storageManager, STORAGE_CONFIG };