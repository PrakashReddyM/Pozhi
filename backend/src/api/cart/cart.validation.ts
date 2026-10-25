import { z } from 'zod';

// Define the schema for a single item (refactored for reuse)
const singleCartItemSchema = z.object({
  item_type: z.enum(['gallery', 'custom']),
  frame_id: z.string().uuid(),
  gallery_art_id: z.string().uuid().optional(),
  user_upload_id: z.string().uuid().optional(),
  frame_size: z.string().min(1),
  mat_color: z.string().optional(),
  glass_type: z.string().optional(),
  quantity: z.number().int().min(1).max(50).default(1)
}).refine(data => {
  if (data.item_type === 'gallery' && !data.gallery_art_id) return false;
  if (data.item_type === 'custom' && !data.user_upload_id) return false;
  return true;
}, {
  message: "gallery_art_id is required for gallery items, user_upload_id for custom items"
});

// ✅ Updated: Accepts a single object OR an array, always transforms to Array
export const addToCartSchema = z.union([
  singleCartItemSchema,
  z.array(singleCartItemSchema)
]).transform((data) => {
  return Array.isArray(data) ? data : [data];
});

export const updateCartSchema = z.object({
  quantity: z.number().int().min(1).max(50),
  cart_item_id: z.string().uuid().optional()
});

export const removeFromCartSchema = z.object({
  id: z.string().uuid()
}).transform(data => ({
  // Ensures 'id' is treated as param
  params: { id: data.id }
}));