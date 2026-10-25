// ==========================================
// AUTH CONTROLLER
//
// Previously a thin wrapper over Supabase Auth. Everything Supabase was doing
// now happens here: password hashing, session issuing, the Google OAuth
// exchange, and the single-use links for password reset and email
// verification.
//
// The HTTP contract is deliberately unchanged - same routes, same request
// bodies, same `{ user, session: { access_token, refresh_token, expires_at } }`
// response - so the storefront and the admin portal keep working.
//
// Two protections Supabase gave us for free had to be rebuilt explicitly:
//   * per-account lockout after repeated failures (the route limiter only
//     caps requests per IP, which a distributed attempt walks straight past);
//   * not revealing whether an email is registered, on any path.
// ==========================================

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../../db';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import * as securityLogger from '../../utils/securityLogger';
import { env, isGoogleOAuthConfigured } from '../../config/env';
import { emailService } from '../../services/email.service';
import {
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
  issueAuthToken,
  consumeAuthToken
} from '../../services/token.service';

// ==========================================
// CONSTANTS
// ==========================================

// bcrypt work factor. 12 is ~250ms on a small server: slow enough to make
// offline cracking expensive, fast enough for an interactive login.
const BCRYPT_ROUNDS = 12;

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

// ==========================================
// HELPERS
// ==========================================

const requestContext = (req: Request) => ({
  userAgent: req.get('user-agent') || undefined,
  ipAddress: req.ip || undefined
});

/** The public shape of a user, as every auth response has always returned it. */
const publicUser = (profile: {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
}) => ({
  id: profile.id,
  email: profile.email,
  full_name: profile.fullName,
  role: profile.role,
  ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
  ...(profile.avatarUrl !== undefined ? { avatar_url: profile.avatarUrl } : {}),
  ...(profile.createdAt !== undefined ? { created_at: profile.createdAt } : {})
});

async function findProfileByEmail(email: string) {
  const [profile] = await db
    .select()
    .from(schema.profiles)
    // Emails are stored as entered but compared case-insensitively, so
    // Prakash@x.com and prakash@x.com cannot become two accounts.
    .where(sql`lower(${schema.profiles.email}) = lower(${email})`)
    .limit(1);
  return profile ?? null;
}

/** Record a failed password attempt and lock the account past the threshold. */
async function registerFailedLogin(userId: string, currentFailures: number) {
  const failures = (currentFailures ?? 0) + 1;
  const lockUntil = failures >= MAX_FAILED_LOGINS
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
    : null;

  await db
    .update(schema.profiles)
    .set({
      failedLoginAttempts: failures,
      lastFailedLogin: new Date().toISOString(),
      ...(lockUntil ? { accountLockedUntil: lockUntil } : {})
    })
    .where(eq(schema.profiles.id, userId));

  return { failures, lockUntil };
}

async function clearLoginFailures(userId: string) {
  await db
    .update(schema.profiles)
    .set({
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    })
    .where(eq(schema.profiles.id, userId));
}

// ==========================================
// SIGNUP - Create new user account (AUTO-VERIFIED)
// ==========================================

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, full_name, phone } = req.body;

    logger.info('Signup attempt (Auto-Verify)', { email });

    if (await findProfileByEmail(email)) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let created;
    try {
      // The identity and the profile are one row now, so there is no longer a
      // window where an auth user exists without a profile (which the old code
      // could only log about after the fact).
      [created] = await db
        .insert(schema.profiles)
        .values({
          email,
          fullName: full_name,
          phone: phone ?? null,
          passwordHash,
          role: 'customer',
          isBanned: false,
          // Matches the previous behaviour: Supabase was called with
          // email_confirm: true, so accounts started verified.
          isEmailVerified: true
        })
        .returning();
    } catch (error: any) {
      // 23505 is Postgres unique_violation: someone registered the same email
      // between the check above and this insert.
      if (String(error?.code) === '23505') {
        throw new ApiError(409, 'User with this email already exists');
      }
      throw error;
    }

    await securityLogger.logSecurityEvent({
      type: 'signup_success',
      user_id: created.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email, auto_verified: true }
    });

    logger.info('Signup successful (Auto-Verified)', { userId: created.id, email });

    emailService.sendWelcomeEmail(created.email, created.fullName || 'there')
      .catch((err) => logger.error('Failed to send welcome email', { err }));

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully. You can now login.',
      data: {
        user: {
          id: created.id,
          email: created.email,
          full_name: created.fullName
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN - Authenticate user
// ==========================================

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    logger.info('Login attempt', { email });

    const profile = await findProfileByEmail(email);

    const failLogin = async (reason: string) => {
      await securityLogger.logSecurityEvent({
        type: 'login_failed',
        user_id: profile?.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: { email, reason },
        severity: 'medium'
      });
      // Always the same message: revealing "no such account" would turn this
      // endpoint into a list of who has registered.
      throw new ApiError(401, 'Invalid email or password');
    };

    if (!profile) {
      // Hash anyway so a missing account does not answer measurably faster
      // than a wrong password.
      await bcrypt.compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000');
      await failLogin('no such account');
      return;
    }

    if (profile.accountLockedUntil && new Date(profile.accountLockedUntil) > new Date()) {
      await securityLogger.logSecurityEvent({
        type: 'login_blocked_banned',
        user_id: profile.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: { email, reason: 'account temporarily locked' },
        blocked: true
      });
      throw new ApiError(
        429,
        `Too many failed attempts. Please try again in ${LOCKOUT_MINUTES} minutes.`
      );
    }

    // Google- or passkey-only account: there is no password to compare.
    if (!profile.passwordHash) {
      await failLogin('no password set on account');
      return;
    }

    if (!(await bcrypt.compare(password, profile.passwordHash))) {
      const { failures, lockUntil } = await registerFailedLogin(
        profile.id,
        profile.failedLoginAttempts ?? 0
      );
      logger.warn('Login failed: bad password', {
        userId: profile.id,
        failures,
        locked: !!lockUntil
      });
      await failLogin('invalid password');
      return;
    }

    if (profile.isBanned) {
      await securityLogger.logSecurityEvent({
        type: 'login_blocked_banned',
        user_id: profile.id,
        ip: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        details: { email },
        blocked: true
      });
      throw new ApiError(403, 'Your account has been suspended. Please contact support.');
    }

    if (profile.isActive === false) {
      throw new ApiError(403, 'Your account is inactive. Please contact support.');
    }

    await clearLoginFailures(profile.id);

    const session = await issueSession(
      { id: profile.id, email: profile.email, role: profile.role },
      requestContext(req)
    );

    await securityLogger.logSecurityEvent({
      type: 'login_success',
      user_id: profile.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email }
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: publicUser(profile),
        session: {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: session.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGOUT - End user session
// ==========================================

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Not authenticated');
    }

    logger.info('Logout attempt', { userId });

    // With the refresh token we can end just this device's session; without
    // it, end them all, which is the safer reading of "log me out".
    const { refresh_token } = req.body ?? {};
    if (refresh_token) {
      await revokeRefreshToken(refresh_token);
    } else {
      await revokeAllSessions(userId);
    }

    await securityLogger.logSecurityEvent({
      type: 'logout',
      user_id: userId,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { scope: refresh_token ? 'this_session' : 'all_sessions' }
    });

    logger.info('Logout successful', { userId });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Not authenticated');
    }

    // The old version had an "auto-heal" branch that created a missing
    // profile from the Supabase auth user. profiles IS the user now, so a
    // missing row cannot be healed - and a token for a deleted account must
    // not resolve to a usable session.
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);

    if (!profile) {
      logger.error('Profile not found for authenticated user', { userId });
      throw new ApiError(404, 'User profile not found');
    }

    res.status(200).json({
      status: 'success',
      data: { user: publicUser(profile) }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// FORGOT PASSWORD - Send reset email
// ==========================================

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    logger.info('Password reset requested', { email });

    const profile = await findProfileByEmail(email);

    if (profile) {
      const token = await issueAuthToken(profile.id, 'password_reset', 60);

      // Sent, not awaited for the response: whether the mail succeeds must not
      // change the timing or the body, or this endpoint reveals who is
      // registered.
      emailService.sendPasswordReset(profile.email, token)
        .catch((err) => logger.error('Failed to send password reset email', { err }));
    }

    await securityLogger.logSecurityEvent({
      type: 'password_reset_requested',
      user_id: profile?.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email, account_exists: !!profile }
    });

    res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, we sent a password reset link.'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RESET PASSWORD - Change password with token
// ==========================================

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, new_password } = req.body;

    logger.info('Password reset attempt');

    // Single-use and time-limited; consuming it is what proves the caller
    // controls the mailbox. The old code called supabase.auth.updateUser()
    // with no session, which could not have worked.
    const userId = await consumeAuthToken(token, 'password_reset');

    const passwordHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    await db
      .update(schema.profiles)
      .set({ passwordHash, failedLoginAttempts: 0, accountLockedUntil: null })
      .where(eq(schema.profiles.id, userId));

    // A password reset is also how you recover a compromised account, so every
    // existing session has to die with it.
    await revokeAllSessions(userId);

    await securityLogger.logSecurityEvent({
      type: 'password_changed',
      user_id: userId,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { via: 'reset_link' }
    });

    logger.info('Password reset successful', { userId });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CHANGE PASSWORD - Update password (logged in)
// ==========================================

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Not authenticated');
    }

    logger.info('Password change attempt', { userId });

    const [profile] = await db
      .select({
        id: schema.profiles.id,
        email: schema.profiles.email,
        role: schema.profiles.role,
        passwordHash: schema.profiles.passwordHash
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);

    if (!profile) {
      throw new ApiError(404, 'User not found');
    }

    if (!profile.passwordHash) {
      throw new ApiError(
        400,
        'This account has no password set. Use the password reset link to create one.'
      );
    }

    if (!(await bcrypt.compare(current_password, profile.passwordHash))) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    await db
      .update(schema.profiles)
      .set({ passwordHash })
      .where(eq(schema.profiles.id, userId));

    // End other sessions, then hand this caller a fresh one so changing a
    // password does not log you out of the device you changed it on.
    await revokeAllSessions(userId);
    const session = await issueSession(
      { id: profile.id, email: profile.email, role: profile.role },
      requestContext(req)
    );

    await securityLogger.logSecurityEvent({
      type: 'password_changed',
      user_id: userId,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { via: 'change_password' }
    });

    logger.info('Password changed successfully', { userId });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
      data: {
        session: {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: session.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GOOGLE OAUTH
// ==========================================

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * The redirect URI must be byte-identical in the authorize request and the
 * token exchange, and must be registered in the Google Cloud console.
 */
const googleRedirectUri = (): string =>
  env.GOOGLE_AUTH_REDIRECT_URL || `${env.FRONTEND_URL}/login`;

export const loginWithGoogle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!isGoogleOAuthConfigured()) {
      throw new ApiError(
        503,
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
      );
    }

    // Signed, short-lived state. This is the CSRF defence for the callback:
    // a code delivered with state we did not sign is not ours.
    const state = jwt.sign(
      { purpose: 'google_oauth', redirectTo: (req.query.redirectTo as string) || null },
      env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const url = `${GOOGLE_AUTH_ENDPOINT}?${new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state
    }).toString()}`;

    res.status(200).json({ status: 'success', data: { url } });
  } catch (error) {
    next(error);
  }
};

interface GoogleIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export const exchangeCodeForSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      throw new ApiError(400, 'OAuth code is required');
    }

    if (!isGoogleOAuthConfigured()) {
      throw new ApiError(503, 'Google sign-in is not configured.');
    }

    // Verify our own state when the client returns one.
    if (state) {
      try {
        jwt.verify(state, env.JWT_SECRET);
      } catch {
        throw new ApiError(400, 'Invalid OAuth state');
      }
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code'
      }).toString(),
      signal: AbortSignal.timeout(10_000)
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => '');
      logger.warn('Google token exchange failed', {
        status: tokenResponse.status,
        detail: detail.slice(0, 300)
      });
      throw new ApiError(401, 'Failed to exchange code for session');
    }

    const tokens = (await tokenResponse.json()) as { id_token?: string };

    if (!tokens.id_token) {
      throw new ApiError(401, 'Google did not return an identity token');
    }

    // The id_token came straight from Google's token endpoint over TLS, in
    // response to a request carrying our client secret. Per Google's own
    // guidance that makes it trustworthy without re-verifying the signature;
    // signature checks matter for tokens received from a browser.
    const claims = jwt.decode(tokens.id_token) as GoogleIdTokenClaims | null;

    if (!claims?.sub || !claims.email) {
      throw new ApiError(401, 'Google identity token was missing an email');
    }

    // Match on the Google subject first - it is stable even if the user
    // changes their Gmail address - then fall back to email so an existing
    // password account gets linked rather than duplicated.
    let [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.googleSub, claims.sub))
      .limit(1);

    if (!profile) {
      const byEmail = await findProfileByEmail(claims.email);

      if (byEmail) {
        [profile] = await db
          .update(schema.profiles)
          .set({
            googleSub: claims.sub,
            avatarUrl: byEmail.avatarUrl || claims.picture || null,
            isEmailVerified: byEmail.isEmailVerified || !!claims.email_verified
          })
          .where(eq(schema.profiles.id, byEmail.id))
          .returning();
      } else {
        [profile] = await db
          .insert(schema.profiles)
          .values({
            email: claims.email,
            fullName: claims.name || claims.email.split('@')[0],
            googleSub: claims.sub,
            avatarUrl: claims.picture || null,
            // No passwordHash: this account signs in with Google until it
            // sets a password through the reset flow.
            role: 'customer',
            isBanned: false,
            isEmailVerified: !!claims.email_verified
          })
          .returning();

        logger.info('Created account from Google sign-in', { userId: profile.id });
      }
    }

    if (profile.isBanned) {
      throw new ApiError(403, 'Your account has been suspended.');
    }

    if (profile.isActive === false) {
      throw new ApiError(403, 'Your account is inactive. Please contact support.');
    }

    await clearLoginFailures(profile.id);

    const session = await issueSession(
      { id: profile.id, email: profile.email, role: profile.role },
      requestContext(req)
    );

    await securityLogger.logSecurityEvent({
      type: 'login_success',
      user_id: profile.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: { email: profile.email, provider: 'google' }
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: publicUser(profile),
        session: {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: session.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REFRESH TOKEN - Get new access token
// ==========================================

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Rotating: the presented token is spent, and a replay of it revokes
    // every session for that user.
    const rotated = await rotateRefreshToken(refresh_token, requestContext(req));

    await securityLogger.logSecurityEvent({
      type: 'token_refresh',
      user_id: rotated.user.id,
      ip: req.ip || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      details: {}
    });

    res.status(200).json({
      status: 'success',
      data: {
        session: {
          access_token: rotated.accessToken,
          refresh_token: rotated.refreshToken,
          expires_at: rotated.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY EMAIL
// ==========================================

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;

    logger.info('Email verification attempt');

    const userId = await consumeAuthToken(token, 'email_verification');

    await db
      .update(schema.profiles)
      .set({ isEmailVerified: true })
      .where(eq(schema.profiles.id, userId));

    logger.info('Email verified successfully', { userId });

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RESEND VERIFICATION
// ==========================================

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      throw new ApiError(401, 'Not authenticated');
    }

    logger.info('Resending verification email', { userId, email });

    const token = await issueAuthToken(userId, 'email_verification', 24 * 60);
    const link = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

    const sent = await emailService.sendEmail({
      to: email,
      subject: 'Verify your Pozhi Studio email',
      html: `
        <p>Hello,</p>
        <p>Confirm your email address to finish securing your Pozhi Studio account:</p>
        <p><a href="${link}">Verify my email</a></p>
        <p>This link expires in 24 hours. If you did not ask for it, you can ignore this email.</p>
      `
    });

    if (!sent) {
      throw new ApiError(500, 'Failed to resend verification email');
    }

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    next(error);
  }
};
