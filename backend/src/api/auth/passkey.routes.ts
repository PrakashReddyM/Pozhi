// ==========================================
// PASSKEY ROUTES - WebAuthn/FIDO2 Endpoints
// ==========================================

import { Router } from 'express';
import * as PasskeyController from './passkey.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validate } from '../../middleware/validate';
import {
  registerOptionsSchema,
  registerVerifySchema,
  loginOptionsSchema,
  loginVerifySchema,
} from './passkey.validation';

const router = Router();

// ==========================================
// RATE LIMITER
// ==========================================

const passkeyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many passkey attempts, please try again later',
  keyGenerator: (req) => req.ip as string,
});

// ==========================================
// PUBLIC ROUTES (Login)
// ==========================================

// POST /api/v1/auth/passkey/login/options
router.post(
  '/login/options',
  passkeyRateLimiter,
  validate(loginOptionsSchema),
  PasskeyController.loginOptions
);

// POST /api/v1/auth/passkey/login/verify
router.post(
  '/login/verify',
  passkeyRateLimiter,
  validate(loginVerifySchema),
  PasskeyController.loginVerify
);

// ==========================================
// PROTECTED ROUTES (Registration & Management)
// ==========================================

// POST /api/v1/auth/passkey/register/options
router.post(
  '/register/options',
  requireAuth,
  validate(registerOptionsSchema),
  PasskeyController.registerOptions
);

// POST /api/v1/auth/passkey/register/verify
router.post(
  '/register/verify',
  requireAuth,
  validate(registerVerifySchema),
  PasskeyController.registerVerify
);

// GET /api/v1/auth/passkey
router.get(
  '/',
  requireAuth,
  PasskeyController.listPasskeys
);

// DELETE /api/v1/auth/passkey/:id
router.delete(
  '/:id',
  requireAuth,
  PasskeyController.deletePasskey
);

export default router;
