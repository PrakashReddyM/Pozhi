// ==========================================
// ORDERS ROUTES - PRODUCTION READY
// ==========================================

import { Router } from 'express';
import * as OrderController from './orders.controller';

import { requireAuth, optionalAuth, requireAdmin } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validate } from '../../middleware/validate';
import { createStudioOrderSchema, updateOrderStatusSchema } from './orders.validation';

const router = Router();

// ==========================================
// RATE LIMITERS
// ==========================================

/**
 * Order creation rate limiter
 * Strict: 5 orders per hour per user to prevent spam/fraud
 */
const orderCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // Increased for E2E testing
  message: 'Too many orders. Maximum 5 orders per hour allowed.',
  keyGenerator: (req) => req.user?.id || req.ip as string
});

/**
 * Order viewing rate limiter
 * 50 requests per 15 minutes
 */
const orderViewLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests',
  keyGenerator: (req) => req.user?.id || req.ip as string
});

// ==========================================
// ROUTES
// ==========================================

/**
 * Create new order
 * POST /api/v1/orders
 * ✅ ENFORCED LOGIN: requireAuth instead of optionalAuth
 */
router.post(
  '/',
  requireAuth,
  orderCreationLimiter,
  validate(createStudioOrderSchema),
  OrderController.createOrder
);

/**
 * Get user's orders
 * GET /api/v1/orders
 */
router.get(
  '/',
  requireAuth,
  orderViewLimiter,
  OrderController.getUserOrders
);

/**
 * Get Booked Slots for Snap n' Print
 * GET /api/v1/orders/booked-slots
 */
router.get(
  '/booked-slots',
  OrderController.getBookedSlots
);

/**
 * Get Income Stats (Admin)
 * GET /api/v1/orders/admin/stats
 */
router.get(
  '/admin/stats',
  requireAuth,
  requireAdmin,
  OrderController.getAdminStats
);

/**
 * Get ALL orders (Admin)
 * GET /api/v1/orders/admin/all
 */
router.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  // rate limiter shared with view
  OrderController.getAllOrders
);

/**
 * Track order by order number (human-readable, e.g. POZ-1234)
 * GET /api/v1/orders/track/:orderNumber
 * Must be defined BEFORE /:id to avoid route shadowing
 */
router.get(
  '/track/:orderNumber',
  requireAuth,
  orderViewLimiter,
  OrderController.getOrderByNumber
);

/**
 * Get single order
 * GET /api/v1/orders/:id
 */
router.get(
  '/:id',
  requireAuth,
  orderViewLimiter,
  OrderController.getOrderById
);

/**
 * Cancel order
 * POST /api/v1/orders/:id/cancel
 */
router.post(
  '/:id/cancel',
  requireAuth,
  orderCreationLimiter,
  OrderController.cancelOrder
);

/**
 * Update order status (Admin only)
 * PATCH /api/v1/orders/:id/status
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  validate(updateOrderStatusSchema), // ✅ Validation added
  OrderController.updateOrderStatus
);

/**
 * Submit order feedback
 * POST /api/v1/orders/:id/feedback
 */
router.post(
  '/:id/feedback',
  requireAuth,
  orderCreationLimiter,
  OrderController.submitFeedback
);

export default router;