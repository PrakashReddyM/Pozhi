import { z } from 'zod';

// We don't validate the file binary here (Multer does that), 
// but we do validate the "Delete" action.

export const deleteFileSchema = z.object({
  fileId: z.string().uuid("Invalid file ID format")
});