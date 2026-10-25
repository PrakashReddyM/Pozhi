// ==========================================
// SECURITY LOGGER - PRODUCTION READY
// ==========================================

import { db, schema } from '../db';
import { logger } from './logger';

// ==========================================
// TYPES
// ==========================================

export type SecurityEventType =
  | 'signup_success'
  | 'signup_failed'
  | 'login_success'
  | 'login_failed'
  | 'login_blocked_banned'
  | 'logout'
  | 'password_reset_requested'
  | 'password_changed'
  | 'token_refresh'
  | 'passkey_register_start'
  | 'passkey_register_success'
  | 'passkey_register_failed'
  | 'passkey_login_start'
  | 'passkey_login_success'
  | 'passkey_login_failed'
  | 'passkey_deleted'
  | 'suspicious_activity'
  | 'suspicious_search'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'permission_denied'
  | 'csrf_violation'
  | 'malware_detected';

export interface SecurityEvent {
  type: SecurityEventType;
  user_id?: string;
  ip: string;
  user_agent: string;
  details: Record<string, any>;
  // ✅ ADDED THESE TO FIX THE ERROR
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'warning';
  blocked?: boolean;
}

// ==========================================
// EXPORTED FUNCTIONS
// ==========================================

/**
 * Log security event to database
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await db.insert(schema.securityEvents).values({
      eventType: event.type,
      // A security event is worth keeping even if the user row is gone, so
      // the column is nullable and set null rather than omitted.
      userId: event.user_id || null,
      ipAddress: event.ip,
      userAgent: event.user_agent,
      details: event.details,
      severity: event.severity || 'low',
      blocked: event.blocked || false
      // created_at defaults to now() in the database.
    });
  } catch (error: any) {
    // Never let audit logging break the request it is describing.

    logger.error('Security event logging error', {
      error: error.message,
      eventType: event.type
    });
  }
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(
  email: string,
  ip: string,
  userAgent: string,
  reason: string
): Promise<void> {
  await logSecurityEvent({
    type: 'login_failed',
    ip,
    user_agent: userAgent,
    details: { email, reason },
    severity: 'medium'
  });
}

/**
 * Log successful login
 */
export async function logSuccessfulLogin(
  userId: string,
  email: string,
  ip: string,
  userAgent: string
): Promise<void> {
  await logSecurityEvent({
    type: 'login_success',
    user_id: userId,
    ip,
    user_agent: userAgent,
    details: { email },
    severity: 'low'
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string | undefined,
  ip: string,
  userAgent: string,
  reason: string,
  details: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type: 'suspicious_activity',
    user_id: userId,
    ip,
    user_agent: userAgent,
    details: { reason, ...details },
    severity: 'high'
  });

  // Also log to application logger for immediate visibility
  logger.warn('Suspicious activity detected', {
    userId,
    ip,
    reason,
    details
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  endpoint: string,
  ip: string,
  userAgent: string,
  userId?: string
): Promise<void> {
  await logSecurityEvent({
    type: 'rate_limit_exceeded',
    user_id: userId,
    ip,
    user_agent: userAgent,
    details: { endpoint },
    severity: 'medium',
    blocked: true
  });
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  endpoint: string,
  ip: string,
  userAgent: string,
  userId?: string
): Promise<void> {
  await logSecurityEvent({
    type: 'unauthorized_access',
    user_id: userId,
    ip,
    user_agent: userAgent,
    details: { endpoint },
    severity: 'medium',
    blocked: true
  });
}