// ==========================================
// UPLOAD ROUTES - POZHI SMART STORAGE
// ==========================================

import { Router } from 'express';
import multer from 'multer';
import * as UploadController from './upload.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { scanForMalware } from '../../middleware/malware.middleware';

const router = Router();

// ==========================================
// MULTER CONFIGURATION (Memory Storage)
// ==========================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10 // Max 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ==========================================
// RATE LIMITER
// ==========================================
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 200,  // Increased for testing
  message: 'Too many upload requests, please try again later',
  keyGenerator: (req) => req.user?.id || req.ip as string
});

// ==========================================
// ROUTES
// ==========================================

/**
 * @route   POST /api/v1/upload
 * @desc    Upload files with smart storage logic
 * @access  Private (authenticated users)
 * @security Malware scanning enabled
 */
router.post(
  '/',
  requireAuth,
  uploadLimiter,
  upload.array('files', 10), // Support multiple files
  scanForMalware, // Scan for malware before processing
  UploadController.uploadFiles
);

/**
 * @route   GET /api/v1/upload
 * @desc    Get user's uploads
 * @access  Private
 */
router.get(
  '/',
  requireAuth,
  UploadController.getUserUploads
);

/**
 * @route   DELETE /api/v1/upload/:uploadId
 * @desc    Delete an upload
 * @access  Private
 */
router.delete(
  '/:uploadId',
  requireAuth,
  UploadController.deleteUpload
);

/**
 * @route   GET /api/v1/upload/view-by-url
 * @desc    Redirect to a short-lived presigned URL for an upload
 * @access  Private (uploader or admin)
 */
router.get(
  '/view-by-url',
  requireAuth,
  UploadController.viewUploadByUrl
);

export default router;