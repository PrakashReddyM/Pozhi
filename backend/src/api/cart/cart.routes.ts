// ==========================================
// CART ROUTES - PRODUCTION READY
// ==========================================

import { Router } from 'express';
import * as CartController from './cart.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { 
  addToCartSchema, 
  updateCartSchema,     // ✅ Now exists in validation.ts
  removeFromCartSchema  // ✅ Now exists in validation.ts
} from './cart.validation';

const router = Router();

// ==========================================
// RATE LIMITER
// ==========================================
const cartLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 min
  message: 'Too many cart requests',
  keyGenerator: (req) => req.user?.id || req.ip as string
});

router.use(requireAuth);
router.use(cartLimiter);

// ==========================================
// ROUTES
// ==========================================

// GET /api/v1/cart - View Cart
router.get('/', CartController.getCart);

// POST /api/v1/cart - Add Item
router.post(
  '/', 
  validate(addToCartSchema), 
  CartController.addToCart
);

// PATCH /api/v1/cart - Update Item Quantity
router.patch(
  '/', 
  validate(updateCartSchema), 
  CartController.updateCart
);

// DELETE /api/v1/cart/:id - Remove Item
router.delete(
  '/:id', 
  validate(removeFromCartSchema), 
  CartController.removeFromCart
);

// DELETE /api/v1/cart - Clear Cart
router.delete('/', CartController.clearCart);

export default router;