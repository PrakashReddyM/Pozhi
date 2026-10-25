// ==========================================
// USER ROUTES - PRODUCTION READY
// ==========================================

import { Router } from 'express';
import * as UserController from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { 
  updateProfileSchema, 
  addAddressSchema, 
  updateAddressSchema 
} from './users.validation';

const router = Router();

// ==========================================
// RATE LIMITER
// ==========================================
const userLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many user requests',
  keyGenerator: (req) => req.user?.id || req.ip as string // ✅ Added Missing Key Generator
});

router.use(requireAuth);
router.use(userLimiter);

// ==========================================
// ROUTES
// ==========================================

// GET /api/v1/users/me - Get Profile
router.get('/me', UserController.getMyProfile);

// PATCH /api/v1/users/me - Update Profile
router.patch(
  '/me', 
  validate(updateProfileSchema), 
  UserController.updateProfile
);

// GET /api/v1/users/addresses - Get Addresses
router.get('/addresses', UserController.getAddresses); // ✅ Now exists in controller

// POST /api/v1/users/addresses - Add Address
router.post(
  '/addresses', 
  validate(addAddressSchema), 
  UserController.addAddress
);

// PUT /api/v1/users/addresses/:id - Update Address
router.put(
  '/addresses/:id', 
  validate(updateAddressSchema), 
  UserController.updateAddress // ✅ Now exists in controller
);

// DELETE /api/v1/users/addresses/:id - Delete Address
router.delete('/addresses/:id', UserController.deleteAddress);

// GET /api/v1/users/orders - Get User Orders
router.get('/orders', UserController.getOrders); // ✅ Now exists in controller

export default router;