// ==========================================
// PASSKEY SERVICE - WebAuthn/FIDO2 Server Logic
// ==========================================

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import crypto from 'crypto';

// ==========================================
// CONFIG
// ==========================================

const rpName = env.WEBAUTHN_RP_NAME;
const rpID = env.WEBAUTHN_RP_ID;
const origin = env.WEBAUTHN_ORIGIN;

const CHALLENGE_TTL = 300; // 5 minutes

// ==========================================
// TYPES
// ==========================================

interface StoredCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
  device_type: string;
  backed_up: boolean;
  aaguid: string | null;
  friendly_name: string;
  last_used_at: string | null;
  created_at: string;
}

// ==========================================
// REGISTRATION
// ==========================================

/**
 * Generate registration options for a user to create a new passkey
 */
export async function getRegistrationOptions(
  userId: string,
  userEmail: string,
  friendlyName: string = 'My Passkey'
) {
  // Fetch existing credentials to exclude (prevent re-registration)
  const existingCredentials = await getUserCredentials(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: userEmail,
    userDisplayName: userEmail.split('@')[0],
    attestationType: 'none', // We don't need attestation for passkeys
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credential_id,
      transports: (cred.transports as AuthenticatorTransportFuture[]) || [],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge in Redis (single-use, 5 min TTL)
  const challengeKey = `passkey:challenge:reg:${userId}`;
  await cacheService.set(challengeKey, JSON.stringify({
    challenge: options.challenge,
    friendly_name: friendlyName,
  }), CHALLENGE_TTL);

  return options;
}

/**
 * Verify registration response and store credential in database
 */
export async function verifyRegistration(
  userId: string,
  credential: RegistrationResponseJSON
) {
  // Retrieve and delete challenge (single-use)
  const challengeKey = `passkey:challenge:reg:${userId}`;
  const challengeData = await cacheService.get(challengeKey);

  if (!challengeData) {
    throw new ApiError(400, 'Registration challenge expired or not found. Please try again.');
  }

  // Delete immediately to prevent replay
  await cacheService.del(challengeKey);

  const { challenge, friendly_name } = JSON.parse(challengeData);

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new ApiError(400, 'Passkey registration verification failed.');
  }

  const { credential: regCredential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  // Store credential in database
  const { error } = await supabaseAdmin
    .from('passkey_credentials')
    .insert({
      user_id: userId,
      credential_id: regCredential.id,
      public_key: Buffer.from(regCredential.publicKey).toString('base64url'),
      counter: regCredential.counter,
      transports: credential.response.transports || [],
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      aaguid: verification.registrationInfo.aaguid,
      friendly_name: friendly_name || 'My Passkey',
    });

  if (error) {
    logger.error('Failed to store passkey credential', { error: error.message, userId });
    throw new ApiError(500, 'Failed to save passkey. Please try again.');
  }

  return {
    verified: true,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  };
}

// ==========================================
// AUTHENTICATION
// ==========================================

/**
 * Generate authentication options (login challenge)
 */
export async function getAuthenticationOptions(email?: string) {
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

  if (email) {
    // Look up user by email to get their credentials
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (profile) {
      const credentials = await getUserCredentials(profile.id);
      allowCredentials = credentials.map((cred) => ({
        id: cred.credential_id,
        transports: (cred.transports as AuthenticatorTransportFuture[]) || [],
      }));
    }
    // If no profile found, we still return options (discoverable credential flow)
    // Don't reveal whether email exists
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  // Generate unique challenge ID
  const challengeId = crypto.randomUUID();

  // Store challenge in Redis
  const challengeKey = `passkey:challenge:auth:${challengeId}`;
  await cacheService.set(challengeKey, options.challenge, CHALLENGE_TTL);

  return { options, challengeId };
}

/**
 * Verify authentication response and return user session
 */
export async function verifyAuthentication(
  challengeId: string,
  credential: AuthenticationResponseJSON
) {
  // Retrieve and delete challenge (single-use)
  const challengeKey = `passkey:challenge:auth:${challengeId}`;
  const expectedChallenge = await cacheService.get(challengeKey);

  if (!expectedChallenge) {
    throw new ApiError(400, 'Authentication challenge expired or not found. Please try again.');
  }

  // Delete immediately to prevent replay
  await cacheService.del(challengeKey);

  // Look up credential in database
  const { data: storedCred, error: lookupError } = await supabaseAdmin
    .from('passkey_credentials')
    .select('*')
    .eq('credential_id', credential.id)
    .single();

  if (lookupError || !storedCred) {
    throw new ApiError(401, 'Passkey not recognized. Please register a passkey first.');
  }

  // Reconstruct public key from base64url
  const publicKeyBytes = Buffer.from(storedCred.public_key, 'base64url');

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: storedCred.credential_id,
      publicKey: new Uint8Array(publicKeyBytes),
      counter: storedCred.counter,
      transports: (storedCred.transports as AuthenticatorTransportFuture[]) || [],
    },
  });

  if (!verification.verified) {
    throw new ApiError(401, 'Passkey authentication failed.');
  }

  // Counter validation (clone detection)
  const newCounter = verification.authenticationInfo.newCounter;
  if (newCounter > 0 && newCounter <= storedCred.counter) {
    logger.warn('Passkey counter did not increment - possible clone detected', {
      userId: storedCred.user_id,
      credentialId: storedCred.credential_id,
      storedCounter: storedCred.counter,
      newCounter,
    });
    throw new ApiError(403, 'Authentication failed: security check failed.');
  }

  // Update counter and last_used_at
  await supabaseAdmin
    .from('passkey_credentials')
    .update({
      counter: newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', storedCred.id);

  // Get user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, is_banned')
    .eq('id', storedCred.user_id)
    .single();

  if (profileError || !profile) {
    throw new ApiError(500, 'Failed to retrieve user profile.');
  }

  if (profile.is_banned) {
    throw new ApiError(403, 'Your account has been suspended. Contact support.');
  }

  // Generate a Supabase session for the user via admin magic link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
  });

  if (linkError || !linkData) {
    logger.error('Failed to generate session for passkey login', {
      error: linkError?.message,
      userId: profile.id,
    });
    throw new ApiError(500, 'Failed to create session. Please try again.');
  }

  // Extract the token hash and verify it to get a real session
  const tokenHash = linkData.properties?.hashed_token;

  if (!tokenHash) {
    throw new ApiError(500, 'Failed to create session token.');
  }

  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });

  if (sessionError || !sessionData.session) {
    logger.error('Failed to verify OTP for passkey session', {
      error: sessionError?.message,
      userId: profile.id,
    });
    throw new ApiError(500, 'Failed to establish session. Please try again.');
  }

  // Update last login
  await supabaseAdmin
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', profile.id);

  return {
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
    },
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
    },
  };
}

// ==========================================
// CREDENTIAL MANAGEMENT
// ==========================================

/**
 * Get all passkey credentials for a user
 */
export async function getUserPasskeys(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('passkey_credentials')
    .select('id, friendly_name, device_type, backed_up, transports, last_used_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch passkeys', { error: error.message, userId });
    throw new ApiError(500, 'Failed to retrieve passkeys.');
  }

  return data || [];
}

/**
 * Delete a passkey credential
 */
export async function deletePasskey(userId: string, passkeyId: string) {
  const { data, error } = await supabaseAdmin
    .from('passkey_credentials')
    .delete()
    .eq('id', passkeyId)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Passkey not found or already deleted.');
  }

  return { deleted: true };
}

/**
 * Rename a passkey
 */
export async function renamePasskey(userId: string, passkeyId: string, newName: string) {
  const { data, error } = await supabaseAdmin
    .from('passkey_credentials')
    .update({ friendly_name: newName })
    .eq('id', passkeyId)
    .eq('user_id', userId)
    .select('id, friendly_name')
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Passkey not found.');
  }

  return data;
}

// ==========================================
// INTERNAL HELPERS
// ==========================================

async function getUserCredentials(userId: string): Promise<StoredCredential[]> {
  const { data, error } = await supabaseAdmin
    .from('passkey_credentials')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to fetch credentials', { error: error.message, userId });
    return [];
  }

  return data || [];
}
