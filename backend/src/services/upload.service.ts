// ==========================================
// TWIN-PATH UPLOAD SERVICE - PRODUCTION READY
// ==========================================

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import exifReader from 'exif-reader'; // ✨ NEW: Actually parse the EXIF data
import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'luminia-masters';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'customer-photos';

const PREVIEW_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85,
  format: 'webp' as const,
};

const PRINT_THRESHOLDS = {
  minDPI: 300,
  minWidthA4: 2480, // @300dpi
  minHeightA4: 3508 // @300dpi
};

// ==========================================
// TYPES
// ==========================================

interface UploadResult {
  uploadId: string;
  previewUrl: string;
  masterUrl: string | null;
  metadata: ImageMetadata;
  isPrintReady: boolean;
  recommendedMaxPrintSize: string;
}

interface ImageMetadata {
  originalFilename: string;
  originalSize: number;
  previewSize: number;
  masterSize: number | null;
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
  colorSpace: string;
  hasAlpha: boolean;
  dpi: number | null;
  exifData: any;
}

// ==========================================
// SERVICE IMPLEMENTATION
// ==========================================

export const uploadService = {

  // Add these methods to uploadService object

/**
 * 🗑️ DELETE uploaded photo
 * SECURITY: Twin-path deletion (Supabase + R2)
 */
async deleteUpload(uploadId: string, userId: string): Promise<void> {
  try {
    logger.info('Starting upload deletion', { uploadId, userId });

    // 1. Fetch upload record
    const { data: upload, error: fetchError } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)  // ✅ SECURITY: Only owner can delete
      .single();

    if (fetchError || !upload) {
      throw new ApiError(404, 'Upload not found or access denied');
    }

    // 2. Delete from Supabase Storage (preview)
    if (upload.preview_path) {
      const { error: supabaseDeleteError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([upload.preview_path]);
      
      if (supabaseDeleteError) {
        logger.warn('Failed to delete preview from Supabase', { 
          error: supabaseDeleteError.message,
          path: upload.preview_path 
        });
      }
    }

    // 3. Delete from R2 (master)
    if (upload.master_path) {
      try {
        await r2Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: upload.master_path
        }));
        logger.info('Master file deleted from R2', { path: upload.master_path });
      } catch (r2Error: any) {
        logger.warn('Failed to delete master from R2', { 
          error: r2Error.message,
          path: upload.master_path 
        });
      }
    }

    // 4. Soft delete in database (preserve audit trail)
    const { error: dbError } = await supabase
      .from('user_uploads')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    if (dbError) {
      throw new Error(`Failed to mark upload as deleted: ${dbError.message}`);
    }

    logger.info('Upload successfully deleted', { uploadId, userId });

  } catch (error: any) {
    logger.error('Failed to delete upload', { 
      error: error.message, 
      uploadId, 
      userId 
    });
    throw error;
  }
},

/**
 * 🗑️ Get user's uploads (for display)
 */
async getUserUploads(userId: string, options?: { 
  limit?: number; 
  offset?: number;
  includeDeleted?: boolean;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('user_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filter out deleted uploads by default
    if (!options?.includeDeleted) {
      query = query.eq('is_active', true);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch uploads: ${error.message}`);
    }

    return data || [];

  } catch (error: any) {
    logger.error('Failed to get user uploads', { error: error.message, userId });
    throw error;
  }
},

  /**
   * 🚀 CORE: Twin-Path Upload Orchestrator
   */
  async uploadPhoto(
    file: any,
    userId: string,
    options?: { skipMaster?: boolean; stripExif?: boolean }
  ): Promise<UploadResult> {
    
    // 1. Setup & IDs
    const uploadId = uuidv4();
    const previewPath = `previews/${userId}/${uploadId}.webp`; // Defined upfront for consistency
    const masterPath = `originals/${userId}/${uploadId}.${file.originalname.split('.').pop()}`; 

    try {
      logger.info('Starting Twin-Path upload', { userId, filename: file.originalname, size: file.size });

      // 2. Validation Checks
      await this.validateFile(file);
      await this.checkStorageLimit(userId, file.size);

      // 3. Metadata Extraction (Heavy Lifting)
      const metadata = await this.extractMetadata(file);
      const printQuality = this.assessPrintQuality(metadata);

      // 4. Generate Web Preview (CPU Bound)
      const preview = await this.generatePreview(file.buffer);

      // 5. PARALLEL UPLOAD: Supabase + R2
      // We run these concurrently to save time
      const uploadPromises: Promise<any>[] = [
        this.uploadPreviewToSupabase(preview.buffer, previewPath)
      ];

      if (!options?.skipMaster && file.size > 100 * 1024) { // Only master if > 100KB
        uploadPromises.push(
          this.uploadMasterToR2(file.buffer, masterPath, userId, uploadId, file.mimetype)
        );
      }

      const [previewUrl, masterResult] = await Promise.all(uploadPromises);
      
      const masterUrl = masterResult ? masterResult.url : null;
      const masterSize = masterResult ? masterResult.size : null;

      // 6. Database Record
      const { data: upload, error } = await supabase
        .from('user_uploads')
        .insert({
          id: uploadId,
          user_id: userId,
          original_filename: file.originalname,
          
          // Paths
          preview_url: previewUrl,
          preview_path: previewPath,
          master_url: masterUrl,
          master_path: masterUrl ? masterPath : null,
          master_storage_provider: 'cloudflare_r2',

          // Stats
          original_size_bytes: file.size,
          preview_size_bytes: preview.size,
          master_size_bytes: masterSize,
          
          // Image Specs
          original_width: metadata.width,
          original_height: metadata.height,
          preview_width: preview.width,
          preview_height: preview.height,
          aspect_ratio: metadata.aspectRatio,
          color_space: metadata.colorSpace,
          dpi: metadata.dpi,
          has_transparency: metadata.hasAlpha,

          // Metadata
          exif_data: options?.stripExif ? this.stripSensitiveExif(metadata.exifData) : metadata.exifData,
          
          // Quality & Status
          is_print_ready: printQuality.isPrintReady,
          print_quality_score: printQuality.score,
          recommended_max_print_size: printQuality.recommendedSize,
          processing_status: 'completed',
          preview_generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(`DB Insert Failed: ${error.message}`);

      // 7. Post-Processing
      await this.queueBackgroundJobs(uploadId, userId);

      return {
        uploadId,
        previewUrl,
        masterUrl,
        metadata: { ...metadata, previewSize: preview.size, masterSize },
        isPrintReady: printQuality.isPrintReady,
        recommendedMaxPrintSize: printQuality.recommendedSize
      };

    } catch (error: any) {
      // 🚨 ROLLBACK SYSTEM
      logger.error('Upload failed, rolling back...', { error: error.message });
      await this.rollbackUpload(previewPath, masterPath); // Use paths, not URLs
      throw error; // Re-throw for controller
    }
  },

  /**
   * 🔍 Validate File (Size & Type)
   */
  async validateFile(file: any): Promise<void> {
    // 1. Check MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ApiError(400, `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, HEIC, TIFF`);
    }

    // 2. Check Max Size (100MB for R2 support)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new ApiError(400, `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 100MB`);
    }

    // 3. Check Min Size (Prevent empty/corrupt files)
    if (file.size < 100) { // 100 bytes
      throw new ApiError(400, 'File too small or empty.');
    }
  },

  /**
   * 🛡️ Check Storage (RPC call)
   */
  async checkStorageLimit(userId: string, fileSize: number): Promise<void> {
    const { data, error } = await supabase.rpc('check_storage_limit', { p_user_id: userId });
    
    // If RPC fails or user not found, we assume they have space (or auto-create via trigger later)
    if (error || !data || data.length === 0) return;

    const limit = data[0];
    if (!limit.has_space || (limit.current_usage + fileSize > limit.limit_bytes)) {
      throw new ApiError(402, 'Storage limit exceeded. Please upgrade your plan.');
    }
  },

  /**
   * 🔍 Metadata Extraction using Sharp + Exif-Reader
   */
  async extractMetadata(file: any): Promise<Omit<ImageMetadata, 'previewSize' | 'masterSize'>> {
    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    let exifData = {};
    if (metadata.exif) {
      try {
        // ✨ FIXED: Actually parse the buffer
        const parsed = exifReader(metadata.exif);
        exifData = parsed; 
      } catch (e) {
        logger.warn('Could not parse EXIF data');
      }
    }

    return {
      originalFilename: file.originalname,
      originalSize: file.size,
      width: metadata.width || 0,
      height: metadata.height || 0,
      aspectRatio: (metadata.width || 1) / (metadata.height || 1),
      format: metadata.format || 'unknown',
      colorSpace: metadata.space || 'srgb',
      hasAlpha: metadata.hasAlpha || false,
      dpi: metadata.density || 72, // Default to 72 if missing
      exifData
    };
  },

  /**
   * 🖼️ Generate Web Preview
   */
  async generatePreview(buffer: Buffer) {
    const processed = await sharp(buffer)
      .resize(PREVIEW_CONFIG.maxWidth, PREVIEW_CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: PREVIEW_CONFIG.quality })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: processed.data,
      size: processed.info.size,
      width: processed.info.width,
      height: processed.info.height
    };
  },

  /**
   * ☁️ Upload to Supabase
   */
  async uploadPreviewToSupabase(buffer: Buffer, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(path, buffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  /**
   * 🗄️ Upload to R2 (Master)
   */
  async uploadMasterToR2(
    buffer: Buffer, 
    key: string, 
    userId: string, 
    uploadId: string, 
    contentType: string
  ) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: { userId, uploadId }
    });

    await r2Client.send(command);
    return {
      url: `r2://${R2_BUCKET}/${key}`,
      size: buffer.length
    };
  },

  /**
   * 🛑 Rollback Logic (Clean up orphans)
   */
  async rollbackUpload(previewPath: string, masterPath: string) {
    try {
      // 1. Delete from Supabase
      if (previewPath) {
        await supabase.storage.from(SUPABASE_BUCKET).remove([previewPath]);
      }
      // 2. Delete from R2
      if (masterPath) {
        await r2Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: masterPath
        }));
      }
    } catch (e) {
      logger.error('Rollback failed seriously', e);
    }
  },

  /**
   * 🖨️ Quality Assessment
   */
  assessPrintQuality(metadata: any) {
    let score = 0;
    // Simple point system
    if (metadata.width >= PRINT_THRESHOLDS.minWidthA4 && metadata.height >= PRINT_THRESHOLDS.minHeightA4) score += 50;
    if (metadata.dpi >= 300) score += 30;
    else if (metadata.dpi >= 150) score += 15;
    if (metadata.originalSize > 2 * 1024 * 1024) score += 20;

    // Calc max size (inches)
    const dpi = metadata.dpi || 72;
    const wInch = (metadata.width / dpi).toFixed(1);
    const hInch = (metadata.height / dpi).toFixed(1);

    return {
      isPrintReady: score >= 60,
      score,
      recommendedSize: `${wInch}x${hInch}"`
    };
  },

  /**
   * 🧹 Strip EXIF
   */
  stripSensitiveExif(exif: any) {
    if (!exif) return null;
    const { gps, GPSLatitude, GPSLongitude, ...safe } = exif;
    return safe;
  },

  /**
   * ⚡ Background Jobs
   */
  async queueBackgroundJobs(uploadId: string, userId: string) {
    // Just a simple insert, don't await the result to block response
    supabase.from('file_processing_queue').insert([
      { user_upload_id: uploadId, user_id: userId, job_type: 'virus_scan', priority: 1 }
    ]).then(({ error }) => {
      if(error) logger.warn('Failed to queue background job', error);
    });
  }
};