// ==========================================
// AUTH MIDDLEWARE - PRODUCTION-READY FOR FREELANCERS
// ==========================================
// Security Level: Banking-Grade
// Protects You AND Your Client
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { verifyAccessToken } from '../services/token.service';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { logSecurityEvent } from '../utils/securityLogger';

/**
 * Look up the live account state for a token's subject.
 *
 * The access token already carries id/email/role, but role and ban status are
 * re-read on every request so that banning a user, or demoting an admin, takes
 * effect immediately instead of waiting for their token to expire.
 */
async function loadAccount(userId: string) {
  const [profile] = await db
    .select({
      id: schema.profiles.id,
      email: schema.profiles.email,
      role: schema.profiles.role,
      isBanned: schema.profiles.isBanned,
      isActive: schema.profiles.isActive
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);

  return profile ?? null;
}

// ==========================================
// TYPESCRIPT DEFINITIONS
// ==========================================

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// ==========================================
// OPTIONAL AUTH (With Smart Logging)
// ==========================================

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // No token? That's fine for optional auth
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Verify locally against our own signing key - no network call.
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error: any) {
      logger.warn('Optional auth failed:', {
        error: error.message,
        ip: req.ip,
        path: req.path
      });

      // Continue without user (optional auth)
      return next();
    }

    const profile = await loadAccount(payload.sub);

    // Token signed for a user who no longer exists.
    if (!profile) {
      logger.warn('Optional auth: token subject has no profile', {
        userId: payload.sub,
        ip: req.ip
      });
      return next();
    }

    const user = { id: profile.id, email: profile.email };

    if (profile.isActive === false) {
      logger.warn('Inactive account attempted access', {
        userId: user.id,
        ip: req.ip
      });
      return next();
    }

    // ✅ CHECK IF BANNED (Even in optional auth!)
    if (profile.isBanned) {
      // ✅ LOG BANNED USER ATTEMPT
      await logSecurityEvent({
        type: 'unauthorized_access',
        user_id: user.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'Banned user attempted access',
          path: req.path,
          method: req.method
        }
      });

      logger.warn('Banned user attempted access:', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        path: req.path
      });

      // Don't attach user to request
      return next();
    }

    // ✅ ATTACH USER TO REQUEST
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role || 'customer'
    };

    next();

  } catch (error: any) {
    // ✅ LOG UNEXPECTED ERRORS (System failures)
    logger.error('Optional auth system error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path
    });

    // ⚠️ Alert admin about system issues
    if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout')) {
      logger.error('CRITICAL: PostgreSQL connection issue!', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      // TODO: Send alert to admin (email/Slack)
    }

    // Continue without user (but error is logged)
    next();
  }
};

// ==========================================
// REQUIRED AUTH (Strict Security)
// ==========================================

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ CHECK FOR TOKEN
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // ✅ LOG MISSING TOKEN ATTEMPT
      await logSecurityEvent({
        type: 'unauthorized_access',
        user_id: undefined,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'No authentication token provided',
          path: req.path,
          method: req.method
        }
      });

      throw new ApiError(401, 'No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // ✅ VERIFY TOKEN (locally, against our own signing key)
    // verifyAccessToken already distinguishes expired from malformed, which
    // the frontend needs: it refreshes on the former, signs out on the latter.
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error: any) {
      await logSecurityEvent({
        type: 'unauthorized_access',
        user_id: undefined,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: {
          reason: error.message,
          path: req.path,
          method: req.method
        }
      });

      logger.warn('Authentication failed:', {
        reason: error.message,
        ip: req.ip,
        path: req.path
      });

      throw error;
    }

    const profile = await loadAccount(payload.sub);

    // A validly signed token for a deleted account must not authenticate.
    if (!profile) {
      logger.warn('Auth rejected: token subject has no profile', {
        userId: payload.sub,
        ip: req.ip
      });
      throw new ApiError(401, 'Authentication failed');
    }

    if (profile.isActive === false) {
      throw new ApiError(403, 'Your account is inactive. Contact support for assistance.');
    }

    const user = { id: profile.id, email: profile.email };

    // ✅ CHECK IF BANNED
    if (profile.isBanned) {
      // ✅ LOG BANNED USER ATTEMPT
      await logSecurityEvent({
        type: 'unauthorized_access',
        user_id: user.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'Banned user attempted access',
          path: req.path,
          method: req.method,
          email: user.email
        }
      });

      logger.warn('🚨 Banned user attempted access:', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      throw new ApiError(403, 'Your account has been suspended. Contact support for assistance.');
    }

    // ✅ ATTACH USER TO REQUEST
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role || 'customer'
    };

    // ✅ LOG SUCCESSFUL AUTH (Optional, enable for high-security needs)
    // logger.debug('Auth successful:', { userId: user.id, path: req.path });

    next();

  } catch (error: any) {
    // ✅ LOG SYSTEM ERRORS
    if (!(error instanceof ApiError)) {
      logger.error('Auth middleware system error:', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        path: req.path
      });

      // ⚠️ Alert on critical failures
      if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('timeout')) {
        logger.error('CRITICAL: PostgreSQL connection issue!', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    next(error);
  }
};

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

/**
 * Require Admin Role
 * Use: app.get('/admin/dashboard', requireAuth, requireAdmin, controller)
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'admin') {
    // ✅ LOG UNAUTHORIZED ADMIN ACCESS ATTEMPT
    logSecurityEvent({
      type: 'permission_denied',
      user_id: req.user.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: {
        reason: 'Non-admin attempted admin access',
        path: req.path,
        method: req.method,
        userRole: req.user.role
      }
    });

    logger.warn('⚠️ Unauthorized admin access attempt:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      path: req.path,
      ip: req.ip
    });

    throw new ApiError(403, 'Admin access required');
  }

  next();
};

/**
 * Require Customer or Admin Role
 * Use: app.get('/api/orders', requireAuth, requireCustomer, controller)
 */
export const requireCustomer = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const allowedRoles = ['customer', 'admin'];

  if (!allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, 'Customer access required');
  }

  next();
};

/**
 * Check Specific Roles
 * Use: app.get('/api/warehouse', requireAuth, requireRoles(['admin', 'warehouse']), controller)
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      // ✅ LOG ROLE MISMATCH
      logSecurityEvent({
        type: 'permission_denied',
        user_id: req.user.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'Insufficient role permissions',
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          path: req.path,
          method: req.method
        }
      });

      throw new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

// ==========================================
// EXPORT ALL MIDDLEWARE
// ==========================================

export default {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireCustomer,
  requireRoles
};