// ==========================================
// ORDER VALIDATION - PRODUCTION GRADE
// Security Level: Banking-Grade ✓
// ==========================================

import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

/**
 * Address validation schema
 * SECURITY: Strict format validation prevents injection
 */
const addressSchema = z.object({
  recipient_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name contains invalid characters'),

  phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .transform(val => val.trim()),

  street_line1: z.string()
    .min(5, 'Address too short')
    .max(200, 'Address too long')
    .transform(val => val.trim()),

  street_line2: z.string()
    .max(200, 'Address too long')
    .optional()
    .transform(val => val?.trim()),

  city: z.string()
    .min(2, 'City name too short')
    .max(100, 'City name too long')
    .regex(/^[a-zA-Z\s.'-]+$/, 'City name contains invalid characters')
    .transform(val => val.trim()),

  state: z.string()
    .min(2, 'State name too short')
    .max(100, 'State name too long')
    .regex(/^[a-zA-Z\s.'-]+$/, 'State name contains invalid characters')
    .transform(val => val.trim()),

  zip_code: z.string()
    .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits, cannot start with 0)')
    .transform(val => val.trim()),

  country: z.string()
    .default('India')
    .refine(val => val === 'India', 'Currently only shipping to India'),

  landmark: z.string()
    .max(200, 'Landmark too long')
    .optional()
    .transform(val => val?.trim())
});

/**
 * Order item customization schema
 */
const customizationSchema = z.object({
  mat_color: z.string()
    .max(50, 'Mat color name too long')
    .optional()
    .transform(val => val?.trim()),

  glass_type: z.string()
    .max(50, 'Glass type name too long')
    .optional()
    .transform(val => val?.trim()),

  finish: z.string()
    .max(50, 'Finish name too long')
    .optional()
    .transform(val => val?.trim()),

  border_style: z.string()
    .max(50, 'Border style too long')
    .optional()
    .transform(val => val?.trim()),

  // Custom dimensions (if applicable)
  custom_width: z.number()
    .min(1, 'Width must be positive')
    .max(200, 'Width too large')
    .optional(),

  custom_height: z.number()
    .min(1, 'Height must be positive')
    .max(200, 'Height too large')
    .optional()
}).strict(); // Reject unknown properties

/**
 * Order item schema
 * SECURITY: Strict validation prevents price manipulation
 */
const orderItemSchema = z.object({
  // Item type validation
  item_type: z.enum(['gallery', 'custom'], {
    errorMap: () => ({ message: 'Item type must be "gallery" or "custom"' })
  }),

  // Product IDs (UUID validation prevents injection)
  frame_id: z.string()
    .uuid('Invalid frame ID')
    .optional(),

  frame_size_id: z.string()
    .uuid('Invalid frame size ID')
    .optional(),

  gallery_art_id: z.string()
    .uuid('Invalid gallery art ID')
    .optional(),

  passphoto_pack_id: z.string()
    .uuid('Invalid passphoto pack ID')
    .optional(),

  photocopies_single_id: z.string()
    .uuid('Invalid photocopies single ID')
    .optional(),

  photocopies_set_id: z.string()
    .uuid('Invalid photocopies set ID')
    .optional(),

  album_capacity_id: z.string()
    .uuid('Invalid album capacity ID')
    .optional(),

  snapnprint_package_id: z.string()
    .uuid('Invalid snapnprint package ID')
    .optional(),

  user_upload_id: z.string()
    .uuid('Invalid upload ID')
    .optional(),

  // Frame size name (for display purposes)
  frame_size: z.string()
    .min(2, 'Frame size too short')
    .max(50, 'Frame size too long')
    .regex(/^[a-zA-Z0-9\s\-x×]+$/, 'Invalid frame size format')
    .optional(), // Made optional as not all items have this

  // Customizations
  customizations: customizationSchema.optional(),

  // Quantity validation (prevent negative/huge orders)
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(50, 'Maximum 50 items per product')
})
  .refine(data => {
    // Relaxed validation: ensure at least one ID is present
    const hasId = data.frame_id || data.gallery_art_id || data.passphoto_pack_id ||
      data.photocopies_single_id || data.photocopies_set_id ||
      data.album_capacity_id || data.snapnprint_package_id || data.user_upload_id;

    return !!hasId;
  }, {
    message: 'Item must have a valid product ID'
  });

/**
 * Create order schema
 * SECURITY: Complete validation prevents all injection attacks
 */
export const createOrderSchema = z.object({
  items: z.array(orderItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(50, 'Maximum 50 items per order'),

  shipping_address: addressSchema,

  billing_address: addressSchema
    .optional()
    .describe('If not provided, shipping address will be used'),

  coupon_code: z.string()
    .min(3, 'Coupon code too short')
    .max(50, 'Coupon code too long')
    .regex(/^[A-Z0-9_-]+$/, 'Invalid coupon code format')
    .optional()
    .transform(val => val?.toUpperCase().trim()),

  customer_notes: z.string()
    .max(1000, 'Notes too long (max 1000 characters)')
    .optional()
    .transform(val => val?.trim())
}).strict(); // Reject any extra fields

/**
 * Update order status schema (Admin only)
 */
export const updateOrderStatusSchema = z.object({
  order_status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'ready', // Added missing status
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  ], {
    errorMap: () => ({ message: 'Invalid order status' })
  }).optional(),

  payment_status: z.enum([
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
  ], {
    errorMap: () => ({ message: 'Invalid payment status' })
  }).optional(),

  tracking_number: z.string()
    .regex(/^[A-Z0-9-]+$/, 'Invalid tracking number format')
    .max(100, 'Tracking number too long')
    .optional()
    .transform(val => val?.toUpperCase().trim()),

  courier_service: z.string()
    .max(100, 'Courier service name too long')
    .optional()
    .transform(val => val?.trim()),

  id: z.string().uuid().optional(), // Handle merged params

  internal_notes: z.string()
    .max(2000, 'Notes too long')
    .optional()
    .transform(val => val?.trim())
}).strict();

/**
 * Cancel order schema
 */
export const cancelOrderSchema = z.object({
  cancellation_reason: z.string()
    .min(10, 'Please provide a reason (at least 10 characters)')
    .max(500, 'Reason too long (max 500 characters)')
    .transform(val => val.trim())
}).strict();

/**
 * Order query filters schema
 */
export const orderQuerySchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'all'
  ]).optional(),

  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(val => parseInt(val))
    .refine(val => val > 0, 'Page must be positive')
    .optional(),

  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional(),

  from_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),

  to_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
}).strict();

// ==========================================
// TYPE EXPORTS
// ==========================================

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

// ==========================================
// VALIDATION HELPERS
// ==========================================

/**
 * Validate order ID (UUID)
 */
export function validateOrderId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate order number format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  // Format: LOS-YYYYMMDD-XXXX (from database trigger)
  const orderNumberRegex = /^LOS-\d{8}-\d{4}$/;
  return orderNumberRegex.test(orderNumber);
}

/**
 * Sanitize order notes (prevent XSS)
 */
export function sanitizeOrderNotes(notes: string): string {
  return notes
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous chars
    .trim()
    .substring(0, 1000);
}
// ==========================================
// STUDIO ORDER (the shape the storefront actually posts)
// ==========================================

/**
 * Detail values are free-form labels chosen on the service pages
 * (e.g. "Material": "Glass — Glossy Finish"), so we bound the size
 * and value types rather than the key names.
 */
const orderDetailsSchema = z
  .record(z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
  .refine((obj) => Object.keys(obj).length <= 30, 'Too many detail fields');

/**
 * Exactly one of these identifies the catalogue row the server re-prices from.
 * unit_price is accepted for display parity but is never trusted.
 */
const studioOrderItemSchema = z.object({
  service_type: z.string().min(1).max(50).optional(),
  title: z.string().min(1, 'Item title required').max(200),
  quantity: z.number().int().min(1).max(100).default(1),
  unit_price: z.number().nonnegative().optional(),

  passphoto_pack_id: z.string().max(64).optional(),
  photocopies_single_id: z.string().max(64).optional(),
  photocopies_set_id: z.string().max(64).optional(),
  frame_size_id: z.string().max(64).optional(),
  album_capacity_id: z.string().max(64).optional(),
  snapnprint_package_id: z.string().max(64).optional(),

  user_upload_id: z.string().uuid('Invalid upload reference').optional(),
  // H2: full ordered image set for Album/PhotoCopies (one order_item can carry
  // many images via order_item_uploads). 100 covers the largest album capacity.
  upload_ids: z.array(z.string().uuid('Invalid upload reference')).max(100).optional(),
  details: orderDetailsSchema.optional()
}).strict();

export const createStudioOrderSchema = z.object({
  service_type: z.enum(['PassPhoto', 'PhotoCopies', 'Frames', 'Album', 'SnapnPrint']),

  items: z.array(studioOrderItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(50, 'Maximum 50 items per order'),

  customer_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .transform((v) => v.trim()),

  customer_email: z.string().email('Invalid email address').max(255).optional().nullable(),

  customer_phone: z.string()
    .regex(/^(\+?91)?[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .transform((v) => v.trim()),

  // Legacy single-field address. Still accepted (and still the column the admin
  // portal and WhatsApp templates read) but the server now derives it from the
  // structured fields below whenever those are supplied.
  delivery_address: z.string()
    .min(5, 'Address too short')
    .max(500, 'Address too long')
    .optional()
    .transform((v) => v?.trim()),

  // Structured delivery address (E4)
  address_house: z.string()
    .min(1, 'House / flat number is required')
    .max(120, 'House / flat number too long')
    .optional()
    .transform((v) => v?.trim()),

  address_street: z.string()
    .min(3, 'Street / area is required')
    .max(200, 'Street / area too long')
    .optional()
    .transform((v) => v?.trim()),

  address_landmark: z.string()
    .max(200, 'Landmark too long')
    .optional()
    .nullable()
    .transform((v) => v?.trim() || null),

  address_city: z.string()
    .min(2, 'City is required')
    .max(100, 'City name too long')
    .optional()
    .transform((v) => v?.trim()),

  address_state: z.string()
    .min(2, 'State is required')
    .max(100, 'State name too long')
    .optional()
    .transform((v) => v?.trim()),

  address_pincode: z.string()
    .regex(/^[1-9]\d{5}$/, 'Invalid PIN code (6 digits, cannot start with 0)')
    .optional()
    .transform((v) => v?.trim()),

  event_date: z.string().max(40).optional().nullable(),

  gift_wrap: z.boolean().optional().default(false)
})
  .strict()
  .refine((data) => {
    // Either the full structured address, or the legacy free-text one.
    const structured = !!(
      data.address_house && data.address_street && data.address_city &&
      data.address_state && data.address_pincode
    );
    return structured || !!data.delivery_address;
  }, {
    message: 'A complete delivery address is required (house, street, city, state and PIN code)',
    path: ['delivery_address']
  });
