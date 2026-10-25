// ==========================================
// TOKEN SERVICE
//
// Replaces what Supabase Auth issued and validated for us.
//
// Model: a short-lived access JWT (15 minutes by default) that the API
// verifies locally, plus a long-lived opaque refresh token with one row per
// session in the database.
//
// Why the refresh token is opaque rather than a second JWT: a JWT cannot be
// revoked without a server-side list anyway, so the row IS the session. That
// makes logout, "log out everywhere", ban and password-change all able to kill
// live sessions - which a pure-JWT scheme cannot do.
//
// Only a keyed hash of the refresh token is stored. Someone who reads the
// database still cannot authenticate with what they find there, because the
// HMAC key lives in the environment and not in the table.
// ==========================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { db, schema } from '../db';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const REFRESH_TOKEN_BYTES = 48;

/**
 * Keyed hash, not a bare SHA-256: without the environment key, a stolen
 * refresh_tokens table cannot be matched against guessed or captured tokens.
 */
function hashRefreshToken(raw: string): string {
  return crypto
    .createHmac('sha256', env.JWT_REFRESH_SECRET)
    .update(raw)
    .digest('hex');
}

function refreshExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + env.JWT_REFRESH_TTL_DAYS);
  return expires;
}

// ==========================================
// ACCESS TOKENS
// ==========================================

export function issueAccessToken(user: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL, issuer: 'pozhi-api' } as jwt.SignOptions
  );
}

/**
 * Verify an access token. Throws ApiError(401) with a message that
 * distinguishes an expired token from a malformed one, because the frontend
 * refreshes on the former and signs out on the latter.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'pozhi-api'
    }) as jwt.JwtPayload;

    if (!payload.sub) {
      throw new ApiError(401, 'Invalid authentication token');
    }

    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ''),
      role: String(payload.role ?? 'customer')
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token has expired. Please login again.');
    }
    throw new ApiError(401, 'Invalid authentication token');
  }
}

// ==========================================
// REFRESH TOKENS (one row per session)
// ==========================================

export async function issueRefreshToken(
  userId: string,
  context: { userAgent?: string; ipAddress?: string } = {}
): Promise<string> {
  const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');

  await db.insert(schema.refreshTokens).values({
    userId,
    tokenHash: hashRefreshToken(raw),
    expiresAt: refreshExpiry().toISOString(),
    userAgent: context.userAgent ?? null,
    ipAddress: context.ipAddress ?? null
  });

  return raw;
}

/** Issue a complete session: access token + refresh token. */
export async function issueSession(
  user: { id: string; email: string; role: string },
  context: { userAgent?: string; ipAddress?: string } = {}
): Promise<SessionTokens> {
  const accessToken = issueAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, context);

  const decoded = jwt.decode(accessToken) as jwt.JwtPayload;

  return {
    accessToken,
    refreshToken,
    // Seconds since epoch, matching what the Supabase session object carried.
    expiresAt: Number(decoded?.exp ?? 0)
  };
}

/**
 * Exchange a refresh token for a new session, rotating it in the process.
 *
 * Rotation means a refresh token is single-use: if one is replayed after being
 * used, that is a sign it was stolen, and every session for that user is
 * revoked rather than just the one.
 */
export async function rotateRefreshToken(
  raw: string,
  context: { userAgent?: string; ipAddress?: string } = {}
): Promise<SessionTokens & { user: { id: string; email: string; role: string } }> {
  const tokenHash = hashRefreshToken(raw);

  const [row] = await db
    .select({
      id: schema.refreshTokens.id,
      userId: schema.refreshTokens.userId,
      expiresAt: schema.refreshTokens.expiresAt,
      revokedAt: schema.refreshTokens.revokedAt
    })
    .from(schema.refreshTokens)
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (row.revokedAt) {
    // Replay of an already-used token: assume compromise, end all sessions.
    logger.warn('Refresh token replay detected - revoking all sessions', {
      userId: row.userId
    });
    await revokeAllSessions(row.userId);
    throw new ApiError(401, 'Session expired. Please login again.');
  }

  if (new Date(row.expiresAt) <= new Date()) {
    throw new ApiError(401, 'Session expired. Please login again.');
  }

  const [profile] = await db
    .select({
      id: schema.profiles.id,
      email: schema.profiles.email,
      role: schema.profiles.role,
      isBanned: schema.profiles.isBanned,
      isActive: schema.profiles.isActive
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, row.userId))
    .limit(1);

  if (!profile || profile.isBanned || profile.isActive === false) {
    await revokeAllSessions(row.userId);
    throw new ApiError(403, 'This account is no longer active.');
  }

  // Rotate: mark the presented token used, then mint a fresh pair.
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() })
    .where(eq(schema.refreshTokens.id, row.id));

  const user = { id: profile.id, email: profile.email, role: profile.role };
  const session = await issueSession(user, context);

  return { ...session, user };
}

/** Revoke one session (logout on this device). */
export async function revokeRefreshToken(raw: string): Promise<void> {
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(
      eq(schema.refreshTokens.tokenHash, hashRefreshToken(raw)),
      isNull(schema.refreshTokens.revokedAt)
    ));
}

/** Revoke every session for a user (password change, ban, "log out everywhere"). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(
      eq(schema.refreshTokens.userId, userId),
      isNull(schema.refreshTokens.revokedAt)
    ));
}

/**
 * Delete rows that can no longer authenticate anyone: expired, or revoked
 * long enough ago that they are no longer useful for replay detection.
 */
export async function pruneExpiredTokens(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const deleted = await db
    .delete(schema.refreshTokens)
    .where(or(
      lt(schema.refreshTokens.expiresAt, new Date().toISOString()),
      lt(schema.refreshTokens.revokedAt, cutoff.toISOString())
    ))
    .returning({ id: schema.refreshTokens.id });

  return deleted.length;
}

// ==========================================
// SINGLE-USE TOKENS (email verification, password reset)
// ==========================================

export type AuthTokenPurpose = 'email_verification' | 'password_reset';

/**
 * Create a single-use token and return the raw value to put in an email link.
 * Any outstanding token for the same purpose is invalidated first, so a
 * forwarded older email cannot still be used.
 */
export async function issueAuthToken(
  userId: string,
  purpose: AuthTokenPurpose,
  ttlMinutes = 60
): Promise<string> {
  const raw = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  await db
    .update(schema.authTokens)
    .set({ consumedAt: new Date().toISOString() })
    .where(and(
      eq(schema.authTokens.userId, userId),
      eq(schema.authTokens.purpose, purpose),
      isNull(schema.authTokens.consumedAt)
    ));

  await db.insert(schema.authTokens).values({
    userId,
    purpose,
    tokenHash: hashRefreshToken(raw),
    expiresAt: expiresAt.toISOString()
  });

  return raw;
}

/**
 * Consume a single-use token, returning the user id it belonged to.
 * Marking it consumed in the same statement that checks it makes the token
 * genuinely single-use even if two requests arrive at once.
 */
export async function consumeAuthToken(
  raw: string,
  purpose: AuthTokenPurpose
): Promise<string> {
  const now = new Date().toISOString();

  const [consumed] = await db
    .update(schema.authTokens)
    .set({ consumedAt: now })
    .where(and(
      eq(schema.authTokens.tokenHash, hashRefreshToken(raw)),
      eq(schema.authTokens.purpose, purpose),
      isNull(schema.authTokens.consumedAt),
      gt(schema.authTokens.expiresAt, now)
    ))
    .returning({ userId: schema.authTokens.userId });

  if (!consumed) {
    throw new ApiError(400, 'This link is invalid or has expired. Please request a new one.');
  }

  return consumed.userId;
}
