import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';

// Store file in RAM first (so we can process it with Sharp)
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req: Request, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed!') as any);
    }
  },
});