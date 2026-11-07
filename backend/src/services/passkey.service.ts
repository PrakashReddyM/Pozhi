// ==========================================
// PASSKEY SERVICE - WebAuthn/FIDO2 Server Logic
//
// Migrated from Supabase to local PostgreSQL + Drizzle.
// Session issuance now uses token.service instead of the Supabase Auth Admin SDK.
// ==========================================

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { env } from '../config/env';
import { cacheService } from './cache.service';
import { issueSession } from './token.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import crypto from 'crypto';

// ==========================================
// CONFIG
// ==========================================

const rpName = env.WEBAUTHN_RP_NAME;
const rpID = env.WEBAUTHN_RP_ID;
const origin = env.WEBAUTHN_ORIGIN;

const CHALLENGE_TTL = 300; // 5 minutes in Redis

// ==========================================
// REGISTRATION
// ==========================================

/**
 * Generate registration options for the user to create a new passkey.
 */
export async function getRegistrationOptions(
  userId: string,
  userEmail: string,
  friendlyName: string = 'My Passkey'
) {
  const existingCredentials = await _getUserCredentials(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: userEmail,
    userDisplayName: userEmail.split('@')[0],
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports as AuthenticatorTransportFuture[]) || []
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred'
    }
  });

  // Store challenge in Redis (single-use, 5 min TTL)
  const challengeKey = `passkey:challenge:reg:${userId}`;
  await cacheService.set(challengeKey, JSON.stringify({
    challenge: options.challenge,
    friendly_name: friendlyName
  }), CHALLENGE_TTL);

  return options;
}

/**
 * Verify registration response and persist the new credential.
 */
export async function verifyRegistration(
  userId: string,
  credential: RegistrationResponseJSON
) {
  const challengeKey = `passkey:challenge:reg:${userId}`;
  const challengeData = await cacheService.get(challengeKey);

  if (!challengeData) {
    throw new ApiError(400, 'Registration challenge expired or not found. Please try again.');
  }

  await cacheService.del(challengeKey);

  const { challenge, friendly_name } = JSON.parse(challengeData);

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new ApiError(400, 'Passkey registration verification failed.');
  }

  const { credential: regCredential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await db.insert(schema.passkeyCredentials).values({
    userId,
    credentialId: regCredential.id,
    publicKey: Buffer.from(regCredential.publicKey).toString('base64url'),
    counter: regCredential.counter,
    transports: credential.response.transports ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    aaguid: verification.registrationInfo.aaguid ?? null,
    friendlyName: friendly_name || 'My Passkey'
  });

  return {
    verified: true,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp
  };
}

// ==========================================
// AUTHENTICATION
// ==========================================

/**
 * Generate authentication options (login challenge).
 */
export async function getAuthenticationOptions(email?: string) {
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

  if (email) {
    const [profile] = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.email, email.toLowerCase()))
      .limit(1);

    if (profile) {
      const credentials = await _getUserCredentials(profile.id);
      allowCredentials = credentials.map((cred) => ({
        id: cred.credentialId,
        transports: (cred.transports as AuthenticatorTransportFuture[]) || []
      }));
    }
    // Don't 404 if email doesn't exist — don't reveal account enumeration.
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred'
  });

  const challengeId = crypto.randomUUID();
  const challengeKey = `passkey:challenge:auth:${challengeId}`;
  await cacheService.set(challengeKey, options.challenge, CHALLENGE_TTL);

  return { options, challengeId };
}

/**
 * Verify authentication response and return a new session.
 */
export async function verifyAuthentication(
  challengeId: string,
  credential: AuthenticationResponseJSON,
  context: { userAgent?: string; ipAddress?: string } = {}
) {
  const challengeKey = `passkey:challenge:auth:${challengeId}`;
  const expectedChallenge = await cacheService.get(challengeKey);

  if (!expectedChallenge) {
    throw new ApiError(400, 'Authentication challenge expired or not found. Please try again.');
  }

  await cacheService.del(challengeKey);

  const [storedCred] = await db
    .select()
    .from(schema.passkeyCredentials)
    .where(eq(schema.passkeyCredentials.credentialId, credential.id))
    .limit(1);

  if (!storedCred) {
    throw new ApiError(401, 'Passkey not recognised. Please register a passkey first.');
  }

  const publicKeyBytes = Buffer.from(storedCred.publicKey, 'base64url');

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: storedCred.credentialId,
      publicKey: new Uint8Array(publicKeyBytes),
      counter: storedCred.counter,
      transports: (storedCred.transports as AuthenticatorTransportFuture[]) || []
    }
  });

  if (!verification.verified) {
    throw new ApiError(401, 'Passkey authentication failed.');
  }

  // Counter check — a non-incrementing counter signals a possible cloned authenticator.
  const newCounter = verification.authenticationInfo.newCounter;
  if (newCounter > 0 && newCounter <= storedCred.counter) {
    logger.warn('Passkey counter did not increment — possible clone detected', {
      userId: storedCred.userId,
      credentialId: storedCred.credentialId,
      storedCounter: storedCred.counter,
      newCounter
    });
    throw new ApiError(403, 'Authentication failed: security check failed.');
  }

  // Update counter and last-used timestamp.
  await db
    .update(schema.passkeyCredentials)
    .set({ counter: newCounter, lastUsedAt: new Date().toISOString() })
    .where(eq(schema.passkeyCredentials.id, storedCred.id));

  const [profile] = await db
    .select({
      id: schema.profiles.id,
      email: schema.profiles.email,
      fullName: schema.profiles.fullName,
      role: schema.profiles.role,
      isBanned: schema.profiles.isBanned,
      isActive: schema.profiles.isActive
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, storedCred.userId))
    .limit(1);

  if (!profile) {
    throw new ApiError(500, 'Failed to retrieve user profile.');
  }

  if (profile.isBanned) {
    throw new ApiError(403, 'Your account has been suspended. Contact support.');
  }

  if (profile.isActive === false) {
    throw new ApiError(403, 'Your account is inactive. Contact support.');
  }

  // Record last login.
  await db
    .update(schema.profiles)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(schema.profiles.id, profile.id));

  const session = await issueSession(
    { id: profile.id, email: profile.email, role: profile.role },
    context
  );

  return {
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.fullName,
      role: profile.role
    },
    session: {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_at: session.expiresAt
    }
  };
}

// ==========================================
// CREDENTIAL MANAGEMENT
// ==========================================

/**
 * List all passkeys for a user (public fields only).
 */
export async function getUserPasskeys(userId: string) {
  return db
    .select({
      id: schema.passkeyCredentials.id,
      friendlyName: schema.passkeyCredentials.friendlyName,
      deviceType: schema.passkeyCredentials.deviceType,
      backedUp: schema.passkeyCredentials.backedUp,
      transports: schema.passkeyCredentials.transports,
      lastUsedAt: schema.passkeyCredentials.lastUsedAt,
      createdAt: schema.passkeyCredentials.createdAt
    })
    .from(schema.passkeyCredentials)
    .where(eq(schema.passkeyCredentials.userId, userId))
    .orderBy(desc(schema.passkeyCredentials.createdAt));
}

/**
 * Delete a passkey credential.
 */
export async function deletePasskey(userId: string, passkeyId: string) {
  const [deleted] = await db
    .delete(schema.passkeyCredentials)
    .where(and(
      eq(schema.passkeyCredentials.id, passkeyId),
      eq(schema.passkeyCredentials.userId, userId)
    ))
    .returning({ id: schema.passkeyCredentials.id });

  if (!deleted) {
    throw new ApiError(404, 'Passkey not found or already deleted.');
  }

  return { deleted: true };
}

/**
 * Rename a passkey's friendly name.
 */
export async function renamePasskey(userId: string, passkeyId: string, newName: string) {
  const [updated] = await db
    .update(schema.passkeyCredentials)
    .set({ friendlyName: newName })
    .where(and(
      eq(schema.passkeyCredentials.id, passkeyId),
      eq(schema.passkeyCredentials.userId, userId)
    ))
    .returning({
      id: schema.passkeyCredentials.id,
      friendlyName: schema.passkeyCredentials.friendlyName
    });

  if (!updated) {
    throw new ApiError(404, 'Passkey not found.');
  }

  return updated;
}

// ==========================================
// INTERNAL HELPERS
// ==========================================

async function _getUserCredentials(userId: string) {
  return db
    .select()
    .from(schema.passkeyCredentials)
    .where(eq(schema.passkeyCredentials.userId, userId));
}
