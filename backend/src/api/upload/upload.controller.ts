// ==========================================
// UPLOAD CONTROLLER - POZHI SMART STORAGE
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../../config/supabase';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MB_10_IN_BYTES = 10 * 1024 * 1024; // 10MB threshold

// Initialize S3 Client for Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

/**
 * Upload files with SMART STORAGE LOGIC
 * - Single file < 10MB → Supabase
 * - Single file ≥ 10MB → Cloudflare R2
 * - Multiple files → Cloudflare R2
 * 
 * @route POST /api/v1/upload
 * @access Private (authenticated users only)
 */
export const uploadFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    // Check if files exist (multer middleware should handle this)
    const files = req.files as any[];
    if (!files || files.length === 0) {
      throw new ApiError(400, 'No files uploaded');
    }

    logger.info('Upload request', {
      userId,
      fileCount: files.length,
      sizes: files.map(f => f.size)
    });

    const uploads: any[] = [];

    // SMART LOGIC: Determine storage provider
    let storageProvider: 'supabase' | 'cloudflare_r2';

    if (files.length > 1) {
      // Multiple files → Always Cloudflare R2
      storageProvider = 'cloudflare_r2';
    } else if (files[0].size >= MB_10_IN_BYTES) {
      // Single large file → Cloudflare R2
      storageProvider = 'cloudflare_r2';
    } else {
      // Single small file → Supabase
      storageProvider = 'supabase';
    }

    logger.info('Storage provider selected', { storageProvider, fileCount: files.length });

    // Process each file
    for (const file of files) {
      let uploadResult;

      if (storageProvider === 'supabase') {
        uploadResult = await uploadToSupabase(file, userId);
      } else {
        uploadResult = await uploadToCloudflareR2(file, userId);
      }

      // Save to database
      const { data: upload, error: dbError } = await supabaseAdmin
        .from('user_uploads')
        .insert({
          user_id: userId,
          storage_provider: storageProvider,
          storage_url: uploadResult.url,
          storage_path: uploadResult.path,
          original_filename: file.originalname,
          sanitized_filename: uploadResult.sanitizedFilename,
          mime_type: file.mimetype,
          file_size_bytes: file.size,
          width: uploadResult.width,
          height: uploadResult.height,
          processing_status: 'completed'
        })
        .select()
        .single();

      if (dbError) {
        logger.error('Failed to save upload to database', { error: dbError.message });
        throw new ApiError(500, 'Failed to save upload metadata');
      }

      uploads.push({
        id: upload.id,
        storage_provider: storageProvider,
        storage_url: upload.storage_url,
        file_size_bytes: upload.file_size_bytes,
        original_filename: upload.original_filename
      });

      logger.info('File uploaded successfully', {
        uploadId: upload.id,
        provider: storageProvider,
        size: file.size
      });
    }

    res.status(201).json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      data: {
        uploads,
        storage_provider: storageProvider
      }
    });

  } catch (error) {
    logger.error('Upload failed', { error, userId: req.user?.id });
    next(error);
  }
};

/**
 * Get user's uploads
 * @route GET /api/v1/upload
 * @access Private
 */
export const getUserUploads = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: uploads, error } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch uploads', { error: error.message });
      throw new ApiError(500, 'Failed to fetch uploads');
    }

    res.status(200).json({
      success: true,
      count: uploads?.length || 0,
      data: uploads || []
    });

  } catch (error) {
    logger.error('Failed to get uploads', { error, userId: req.user?.id });
    next(error);
  }
};

/**
 * View/Download an upload via redirect (Handles R2 presigned URLs)
 * @route GET /api/v1/upload/view-by-url
 */
export async function viewUploadByUrl(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const targetUrl = req.query.url as string;
    const isDownload = req.query.download === 'true';
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!targetUrl) {
      throw new ApiError(400, 'Missing url query parameter');
    }

    // Resolve the upload by its stored URL. Everything we serve must correspond to a
    // row we own a record of — we never fetch or redirect to a caller-supplied URL,
    // which would make this an open redirect / SSRF gadget.
    const { data: upload, error: fetchError } = await supabaseAdmin
      .from('user_uploads')
      .select('*')
      .eq('storage_url', targetUrl)
      .single();

    if (fetchError || !upload) {
      throw new ApiError(404, 'Upload not found');
    }

    // These are customer photographs, including passport and visa images. Only the
    // uploader or an admin fulfilling the order may view them.
    if (upload.user_id !== userId && req.user?.role !== 'admin') {
      logger.warn('Blocked unauthorised upload access', { uploadId: upload.id, userId });
      throw new ApiError(404, 'Upload not found');
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: upload.storage_path,
      ResponseContentType: upload.mime_type || 'image/jpeg',
      ResponseContentDisposition: isDownload ? `attachment; filename="${upload.original_filename || 'download.jpg'}"` : 'inline',
    });
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    res.redirect(signedUrl);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an upload
 * @route DELETE /api/v1/upload/:uploadId
 * @access Private
 */
export const deleteUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const { uploadId } = req.params;
    if (!uploadId) {
      throw new ApiError(400, 'Upload ID is required');
    }

    // Get upload details
    const { data: upload, error: fetchError } = await supabase
      .from('user_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !upload) {
      throw new ApiError(404, 'Upload not found');
    }

    // Delete from storage
    if (upload.storage_provider === 'supabase') {
      await deleteFromSupabase(upload.storage_path);
    } else {
      await deleteFromCloudflareR2(upload.storage_path);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_uploads')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('Failed to delete upload from database', { error: deleteError.message });
      throw new ApiError(500, 'Failed to delete upload');
    }

    logger.info('Upload deleted', { uploadId, userId });

    res.status(200).json({
      success: true,
      message: 'Upload deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete upload', { error, uploadId: req.params.uploadId });
    next(error);
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Upload file to Supabase Storage
 */
async function uploadToSupabase(file: any, userId: string) {
  const sanitizedFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${userId}/${sanitizedFilename}`;

  const { data, error } = await supabaseAdmin.storage
    .from(env.SUPABASE_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    logger.error('Supabase upload failed', { error: error.message });
    throw new ApiError(500, 'Failed to upload to Supabase');
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(env.SUPABASE_BUCKET)
    .getPublicUrl(filePath);

  // Get image dimensions if it's an image
  let width, height;
  if (file.mimetype.startsWith('image/')) {
    // Placeholder - implement with sharp or similar
    width = null;
    height = null;
  }

  return {
    url: urlData.publicUrl,
    path: filePath,
    sanitizedFilename,
    width,
    height
  };
}

/**
 * Upload file to Cloudflare R2
 */
async function uploadToCloudflareR2(file: any, userId: string) {
  const sanitizedFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${userId}/${sanitizedFilename}`;

  try {
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filePath, // Stores as "userId/filename" in the root of the bucket
      Body: file.buffer,
      ContentType: file.mimetype
    });

    await r2Client.send(command);

    // Construct Public URL
    // NOTE: This assumes R2 bucket has public access enabled or is behind a Custom Domain
    // If not, you might need pre-signed URLs similar to Supabase private buckets
    // For now, we'll try to construct a public URL assuming a custom domain or public R2 dev URL
    // Since we don't have a custom domain var, we will use the S3 endpoint pattern or a placeholder
    // Ideally user provides R2_PUBLIC_DOMAIN in .env

    // Fallback: If no custom domain, this might not be publicly accessible directly without auth
    // But for the sake of the task, we will return the path key and a constructed URL

    // Strategy: Return a URL that the frontend can use. 
    // If authenticated, maybe we should use signed URLs for R2 too?
    // Use the controller's logic to sign URLs if needed later. 
    // For now, assume public access or signed URL generation on fetch.

    // We will store the full S3 endpoint URL as a fallback
    const publicUrl = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${filePath}`;

    return {
      url: publicUrl,
      path: filePath,
      sanitizedFilename,
      width: null,
      height: null
    };

  } catch (error: any) {
    logger.error('Cloudflare R2 upload failed', { error: error.message });
    throw new ApiError(500, 'Failed to upload to Cloudflare R2');
  }
}

/**
 * Delete file from Supabase
 */
async function deleteFromSupabase(filePath: string) {
  const { error } = await supabaseAdmin.storage
    .from(env.SUPABASE_BUCKET)
    .remove([filePath]);

  if (error) {
    logger.error('Failed to delete from Supabase', { error: error.message });
  }
}

/**
 * Delete file from Cloudflare R2
 */
async function deleteFromCloudflareR2(filePath: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filePath
    });

    await r2Client.send(command);
    logger.info('Deleted file from R2', { filePath });

  } catch (error: any) {
    logger.error('Failed to delete from Cloudflare R2', { error: error.message, filePath });
    // Don't throw logic error here to allow DB cleanup to proceed potentially?
    // Or throw to consistency? Let's catch and log to allow soft-fail.
  }
}