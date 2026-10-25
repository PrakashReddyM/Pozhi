// ==========================================
// CSRF PROTECTION MIDDLEWARE
// ==========================================
// Protects against Cross-Site Request Forgery attacks
// Uses cookie-based tokens for stateless protection

import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';
import { logger } from '../utils/logger';
import { logSecurityEvent } from '../utils/securityLogger';

// ==========================================
// CSRF MIDDLEWARE CONFIGURATION
// ==========================================

// Create CSRF protection middleware
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    key: '_csrf'
  }
});

// ==========================================
// CSRF TOKEN ENDPOINT
// ==========================================

/**
 * GET /api/v1/csrf-token
 * Returns a CSRF token for the client to use in subsequent requests
 */
export const getCsrfToken = (req: Request, res: Response) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken()
  });
};

// ==========================================
// CSRF ERROR HANDLER
// ==========================================

/**
 * Handle CSRF token validation errors
 * Logs security events and returns clear error messages
 */
export const csrfErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if this is a CSRF error
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // Log CSRF violation attempt
  await logSecurityEvent({
    type: 'csrf_violation',
    user_id: req.user?.id,
    ip: req.ip || 'unknown',
    user_agent: req.get('user-agent') || 'unknown',
    details: {
      path: req.path,
      method: req.method,
      referer: req.get('referer') || 'none'
    }
  });

  logger.warn('CSRF token validation failed:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    referer: req.get('referer')
  });

  // Return error response
  res.status(403).json({
    success: false,
    error: 'Invalid CSRF token. Please refresh the page and try again.',
    code: 'CSRF_VALIDATION_FAILED'
  });
};

// ==========================================
// CONDITIONAL CSRF PROTECTION
// ==========================================

/**
 * Apply CSRF protection only to state-changing methods
 * GET, HEAD, OPTIONS are exempt (read-only operations)
 */
export const conditionalCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Exempt safe HTTP methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt public endpoints (pricing, health checks)
  const publicPaths = [
    '/api/v1/pricing',
    '/health',
    '/',
    '/api/v1/auth/signup',
    '/api/v1/auth/login'
  ];

  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  if (isPublicPath) {
    return next();
  }

  // Apply CSRF protection to all other requests
  csrfProtection(req, res, next);
};

export default {
  csrfProtection,
  getCsrfToken,
  csrfErrorHandler,
  conditionalCsrf
};
