// ==========================================
// UPLOAD CONTROLLER - POZHI SMART STORAGE
//
// All files are stored in Cloudflare R2.
// (The original code had a Supabase Storage fallback for files < 10 MB;
// that path has been removed during the self-hosted PostgreSQL migration.)
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../../db';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
 * Upload files to Cloudflare R2, then record each in user_uploads.
 *
 * @route POST /api/v1/upload
 * @access Private
 */
export const uploadFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const files = req.files as any[];
    if (!files || files.length === 0) throw new ApiError(400, 'No files uploaded');

    logger.info('Upload request', {
      userId,
      fileCount: files.length,
      sizes: files.map((f: any) => f.size)
    });

    const uploads: any[] = [];

    for (const file of files) {
      const result = await uploadToCloudflareR2(file, userId);

      const [upload] = await db
        .insert(schema.userUploads)
        .values({
          userId,
          storageProvider: 'cloudflare_r2',
          storageUrl: result.url,
          storagePath: result.path,
          originalFilename: file.originalname,
          sanitizedFilename: result.sanitizedFilename,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          width: result.width ?? null,
          height: result.height ?? null,
          processingStatus: 'completed'
        })
        .returning();

      if (!upload) {
        logger.error('Failed to save upload to database', { file: file.originalname });
        throw new ApiError(500, 'Failed to save upload metadata');
      }

      uploads.push({
        id: upload.id,
        storage_provider: upload.storageProvider,
        storage_url: upload.storageUrl,
        file_size_bytes: upload.fileSizeBytes,
        original_filename: upload.originalFilename
      });

      logger.info('File uploaded successfully', {
        uploadId: upload.id,
        provider: 'cloudflare_r2',
        size: file.size
      });
    }

    res.status(201).json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      data: {
        uploads,
        storage_provider: 'cloudflare_r2'
      }
    });

  } catch (error) {
    logger.error('Upload failed', { error, userId: req.user?.id });
    next(error);
  }
};

/**
 * List the current user's uploads.
 *
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
    if (!userId) throw new ApiError(401, 'Authentication required');

    const limit  = Math.min(parseInt(req.query.limit  as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const uploads = await db
      .select()
      .from(schema.userUploads)
      .where(eq(schema.userUploads.userId, userId))
      .orderBy(desc(schema.userUploads.createdAt))
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      success: true,
      count: uploads.length,
      data: uploads
    });

  } catch (error) {
    logger.error('Failed to get uploads', { error, userId: req.user?.id });
    next(error);
  }
};

/**
 * Redirect the caller to a short-lived R2 presigned URL for an upload.
 * The upload is identified by its stored URL, not by a caller-supplied path,
 * so this cannot be used as an open redirect or SSRF gadget.
 *
 * @route GET /api/v1/upload/view-by-url
 * @access Private
 */
export async function viewUploadByUrl(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const targetUrl = req.query.url as string;
    const isDownload = req.query.download === 'true';

    if (!targetUrl) throw new ApiError(400, 'Missing url query parameter');

    const [upload] = await db
      .select()
      .from(schema.userUploads)
      .where(eq(schema.userUploads.storageUrl, targetUrl))
      .limit(1);

    if (!upload) throw new ApiError(404, 'Upload not found');

    // Customer photographs may include passport/visa images — only the uploader
    // or an admin fulfilling the order may access them.
    if (upload.userId !== userId && req.user?.role !== 'admin') {
      logger.warn('Blocked unauthorised upload access', { uploadId: upload.id, userId });
      throw new ApiError(404, 'Upload not found');
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: upload.storagePath,
      ResponseContentType: upload.mimeType || 'image/jpeg',
      ResponseContentDisposition: isDownload
        ? `attachment; filename="${upload.originalFilename || 'download.jpg'}"`
        : 'inline'
    });
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    res.redirect(signedUrl);

  } catch (error) {
    next(error);
  }
}

/**
 * Delete an upload (from R2 and the DB row).
 *
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
    if (!userId) throw new ApiError(401, 'Authentication required');

    const { uploadId } = req.params;
    if (!uploadId) throw new ApiError(400, 'Upload ID is required');

    const [upload] = await db
      .select()
      .from(schema.userUploads)
      .where(and(
        eq(schema.userUploads.id, uploadId),
        eq(schema.userUploads.userId, userId)
      ))
      .limit(1);

    if (!upload) throw new ApiError(404, 'Upload not found');

    await deleteFromCloudflareR2(upload.storagePath);

    await db
      .delete(schema.userUploads)
      .where(and(
        eq(schema.userUploads.id, uploadId),
        eq(schema.userUploads.userId, userId)
      ));

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
// HELPERS
// ==========================================

async function uploadToCloudflareR2(file: any, userId: string) {
  const sanitizedFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${userId}/${sanitizedFilename}`;

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype
    }));

    // Public URL — assumes the bucket has public access or is behind a custom domain.
    // For private buckets the signed-URL flow in viewUploadByUrl handles serving.
    const publicUrl = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${filePath}`;

    return {
      url: publicUrl,
      path: filePath,
      sanitizedFilename,
      width: null as number | null,
      height: null as number | null
    };
  } catch (error: any) {
    logger.error('Cloudflare R2 upload failed', { error: error.message });
    throw new ApiError(500, 'Failed to upload file');
  }
}

async function deleteFromCloudflareR2(filePath: string) {
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filePath
    }));
    logger.info('Deleted file from R2', { filePath });
  } catch (error: any) {
    // Log but don't rethrow — the DB row is already being removed and
    // orphaned R2 objects can be cleaned up by a lifecycle rule.
    logger.error('Failed to delete from R2', { error: error.message, filePath });
  }
}
