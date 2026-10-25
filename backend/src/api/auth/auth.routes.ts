// ==========================================
// AUTH ROUTES - PRODUCTION READY
// ==========================================

import { Router } from 'express';
import * as AuthController from './auth.controller';
import passkeyRouter from './passkey.routes';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { validate } from '../../middleware/validate';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema
} from './auth.validation';

const router = Router();

// Mount passkey sub-router
router.use('/passkey', passkeyRouter);

// ==========================================
// RATE LIMITERS
// ==========================================

// Strict limiter for login/signup to prevent brute force
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => req.ip as string
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

// POST /api/v1/auth/signup
router.post(
  '/signup', 
  authRateLimiter, 
  validate(signupSchema), 
  AuthController.signup
);

// POST /api/v1/auth/login
router.post(
  '/login', 
  authRateLimiter, 
  validate(loginSchema), 
  AuthController.login
);

// GET /api/v1/auth/google
router.get('/google', AuthController.loginWithGoogle);

// POST /api/v1/auth/google/exchange
router.post('/google/exchange', AuthController.exchangeCodeForSession);

// POST /api/v1/auth/refresh-token
router.post(
  '/refresh-token', 
  validate(refreshTokenSchema), 
  AuthController.refreshToken
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password', 
  authRateLimiter, 
  validate(forgotPasswordSchema), 
  AuthController.forgotPassword
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password', 
  authRateLimiter, 
  validate(resetPasswordSchema), 
  AuthController.resetPassword
);

// POST /api/v1/auth/verify-email
router.post(
  '/verify-email', 
  validate(verifyEmailSchema), 
  AuthController.verifyEmail
);

// ==========================================
// PROTECTED ROUTES (Require Login)
// ==========================================

// GET /api/v1/auth/me (Get current user)
router.get('/me', requireAuth, AuthController.getCurrentUser);

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, AuthController.logout);

// POST /api/v1/auth/change-password
router.post(
  '/change-password', 
  requireAuth, 
  validate(changePasswordSchema), 
  AuthController.changePassword
);

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', requireAuth, AuthController.resendVerification);

export default router;