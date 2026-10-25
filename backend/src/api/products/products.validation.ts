// ==========================================
// PRODUCT VALIDATION - PRODUCTION READY
// ==========================================

import { z } from 'zod';

// ==========================================
// QUERY PARAM SCHEMAS
// ==========================================

export const frameFilterSchema = z.object({
  category: z.enum(['wood', 'metal', 'plastic', 'composite']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).max(1000000).optional(),
  material: z.enum(['wood', 'metal', 'plastic', 'composite', 'acrylic']).optional(),
  inStock: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  featured: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

export const galleryFilterSchema = z.object({
  category: z.enum([
    'nature', 'abstract', 'portrait', 'landscape', 
    'urban', 'wildlife', 'architecture', 'still_life'
  ]).optional(),
  artist: z.string().max(100).optional(), // Sanitize this in service
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).max(1000000).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(2, "Search query too short").max(100, "Search query too long")
});

export type FrameFilters = z.infer<typeof frameFilterSchema>;
export type GalleryFilters = z.infer<typeof galleryFilterSchema>;