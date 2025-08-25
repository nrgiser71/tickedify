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

  async initialize(forceReinit = false) {
    if (this.initialized && !forceReinit) return true;
    
    // Reset state for fresh initialization
    if (forceReinit) {
      this.b2Client = null;
      this.bucketId = null;
      this.authToken = null;
      this.initialized = false;
      console.log('🔄 Forcing storage manager reinitialization');
    }

    try {
      // Only initialize B2 if credentials are provided
      if (process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY) {
        console.log('🔍 B2 credentials found, initializing...');
        console.log('🔍 B2_APPLICATION_KEY_ID:', process.env.B2_APPLICATION_KEY_ID ? '[SET]' : '[NOT SET]');
        console.log('🔍 B2_APPLICATION_KEY:', process.env.B2_APPLICATION_KEY ? '[SET]' : '[NOT SET]');
        console.log('🔍 B2_BUCKET_NAME:', process.env.B2_BUCKET_NAME || 'tickedify-attachments (default)');

        this.b2Client = new B2({
          applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
          applicationKey: process.env.B2_APPLICATION_KEY
        });

        // Authorize with B2
        console.log('🔍 Authorizing with B2...');
        await this.b2Client.authorize();
        console.log('✅ Backblaze B2 authorized successfully');

        // Get bucket info (create if needed)
        const bucketName = process.env.B2_BUCKET_NAME || 'tickedify-attachments';
        await this.ensureBucket(bucketName);
        
        this.initialized = true;
        console.log('✅ Storage Manager initialized with B2 support');
      } else {
        console.log('⚠️ B2 credentials not found in environment variables:');
        console.log('   - B2_APPLICATION_KEY_ID:', process.env.B2_APPLICATION_KEY_ID ? '[SET]' : '[NOT SET]');
        console.log('   - B2_APPLICATION_KEY:', process.env.B2_APPLICATION_KEY ? '[SET]' : '[NOT SET]');
        console.log('   - Bijlagen system will not work without B2 credentials');
        this.initialized = true;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Storage Manager:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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
    const available = this.b2Client && this.bucketId;
    console.log('🔍 B2 availability check:', {
      initialized: this.initialized,
      b2ClientExists: !!this.b2Client,
      bucketId: this.bucketId,
      available: available
    });
    return available;
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
      
      // DEBUG: Check file buffer before upload
      console.log('🔍 [UPLOAD DEBUG] File info:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferType: Buffer.isBuffer(file.buffer) ? 'Buffer' : typeof file.buffer,
        bufferLength: file.buffer?.length
      });
      
      // Ensure we have a proper Buffer for PNG files
      let uploadBuffer = file.buffer;
      if (file.mimetype === 'image/png') {
        if (!Buffer.isBuffer(file.buffer)) {
          console.log('⚠️ [UPLOAD DEBUG] Converting non-Buffer to Buffer for PNG');
          uploadBuffer = Buffer.from(file.buffer);
        }
        
        // Check PNG signature before upload
        if (uploadBuffer.length > 8) {
          const firstBytes = uploadBuffer.slice(0, 8);
          const hexBytes = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('🔍 [UPLOAD DEBUG] PNG signature before B2 upload:', hexBytes);
          
          const expectedPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
          const isValidPNG = expectedPNG.every((byte, index) => firstBytes[index] === byte);
          console.log('🔍 [UPLOAD DEBUG] Valid PNG signature before upload:', isValidPNG);
        }
      }
      
      const uploadUrl = await this.b2Client.getUploadUrl({
        bucketId: this.bucketId
      });

      // Ensure proper binary data handling for B2 upload
      let b2Data = uploadBuffer;
      if (file.mimetype === 'image/png') {
        // For PNG files, ensure we send as binary Buffer, not string
        b2Data = Buffer.isBuffer(uploadBuffer) ? uploadBuffer : Buffer.from(uploadBuffer, 'binary');
        console.log('🔍 [B2 UPLOAD] Using binary Buffer for PNG, size:', b2Data.length);
      }

      const response = await this.b2Client.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName: fileName,
        data: b2Data,
        mime: file.mimetype,
        contentLength: b2Data.length,
        // Explicitly set content encoding for binary files
        ...(file.mimetype.startsWith('image/') && { 
          headers: { 'Content-Transfer-Encoding': 'binary' }
        })
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
    console.log('🟡 [STORAGE] downloadFile start:', new Date().toISOString());
    
    const initStart = Date.now();
    await this.initialize();
    console.log('🟡 [STORAGE] Initialize time:', Date.now() - initStart, 'ms');
    
    if (!this.isB2Available()) {
      throw new Error('Bestandsopslag niet beschikbaar. Contacteer support.');
    }
    
    const b2Start = Date.now();
    const result = await this.downloadFromB2(bijlage.storage_path);
    console.log('🟡 [STORAGE] B2 API time:', Date.now() - b2Start, 'ms');
    
    return result;
  }

  async downloadFromB2(storagePath) {
    try {
      const bucketName = process.env.B2_BUCKET_NAME || 'tickedify-attachments';
      console.log('🔵 [B2] downloadFileByName start:', new Date().toISOString());
      console.log('🔍 B2 Download attempt:', {
        bucketName: bucketName,
        fileName: storagePath,
        b2ClientExists: !!this.b2Client,
        bucketId: this.bucketId
      });

      const apiStart = Date.now();
      const response = await this.b2Client.downloadFileByName({
        bucketName: bucketName,
        fileName: storagePath
      });
      console.log('🔵 [B2] API response time:', Date.now() - apiStart, 'ms');

      console.log('✅ B2 download successful, size:', response.data?.length || 'unknown');
      console.log('✅ B2 response data type:', typeof response.data, 'isBuffer:', Buffer.isBuffer(response.data));

      // DEBUG: Check raw B2 data if it's a PNG
      const data = response.data;
      if (storagePath.toLowerCase().includes('.png') && data && data.length > 8) {
        let firstBytes;
        if (Buffer.isBuffer(data)) {
          firstBytes = data.slice(0, 8);
        } else if (data instanceof Uint8Array) {
          firstBytes = data.slice(0, 8);
        } else if (typeof data === 'string') {
          firstBytes = Buffer.from(data, 'binary').slice(0, 8);
        }
        
        if (firstBytes) {
          const hexBytes = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('🔍 [B2 PNG DEBUG] Raw B2 data first 8 bytes:', hexBytes);
        }
      }

      // Ensure we return a Buffer for binary data integrity
      if (Buffer.isBuffer(data)) {
        return data;
      } else if (data instanceof Uint8Array) {
        return Buffer.from(data);
      } else if (typeof data === 'string') {
        // If data is a string, it might be base64 or binary string
        console.log('⚠️ B2 returned string data, converting to buffer');
        return Buffer.from(data, 'binary');
      } else {
        console.log('⚠️ B2 returned unknown data type, attempting buffer conversion');
        return Buffer.from(data);
      }
    } catch (error) {
      console.error('❌ B2 download failed for file:', storagePath);
      console.error('❌ B2 error details:', {
        name: error.name,
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        stack: error.stack
      });
      throw new Error(`Download van cloud storage gefaald: ${error.message}`);
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