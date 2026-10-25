// ==========================================
// AUTH MIDDLEWARE - PRODUCTION-READY FOR FREELANCERS
// ==========================================
// Security Level: Banking-Grade
// Protects You AND Your Client
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { logSecurityEvent } from '../utils/securityLogger';

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

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      // ✅ LOG THE ERROR (Don't silently fail!)
      logger.warn('Optional auth failed:', {
        error: error.message,
        ip: req.ip,
        path: req.path
      });

      // Continue without user (optional auth)
      return next();
    }

    if (!user) {
      return next();
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      // ✅ LOG DATABASE ERRORS
      logger.error('Failed to fetch user profile:', {
        error: profileError.message,
        userId: user.id,
        ip: req.ip
      });
      return next();
    }

    // ✅ CHECK IF BANNED (Even in optional auth!)
    if (profile?.is_banned) {
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
      role: profile?.role || 'customer'
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
      logger.error('🚨 CRITICAL: Supabase connection issue!', {
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

    // ✅ VERIFY TOKEN WITH SUPABASE
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      // ✅ DIFFERENTIATE TOKEN ERRORS
      const isExpired = error.message.toLowerCase().includes('expired');
      const errorMessage = isExpired
        ? 'Token has expired. Please login again.'
        : 'Invalid authentication token';

      // ✅ LOG INVALID TOKEN ATTEMPT
      await logSecurityEvent({
        type: 'unauthorized_access',
        user_id: undefined,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: {
          reason: isExpired ? 'Expired token' : 'Invalid token',
          error: error.message,
          path: req.path,
          method: req.method
        }
      });

      logger.warn('Authentication failed:', {
        reason: isExpired ? 'expired' : 'invalid',
        error: error.message,
        ip: req.ip,
        path: req.path
      });

      throw new ApiError(401, errorMessage);
    }

    if (!user) {
      throw new ApiError(401, 'Authentication failed');
    }

    // ✅ GET USER PROFILE
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      // ✅ LOG DATABASE ERROR
      logger.error('Failed to fetch user profile:', {
        error: profileError.message,
        userId: user.id,
        ip: req.ip
      });

      throw new ApiError(500, 'Failed to verify user account');
    }

    // ✅ CHECK IF BANNED
    if (profile?.is_banned) {
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
      role: profile?.role || 'customer'
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
        logger.error('🚨 CRITICAL: Supabase connection issue!', {
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