// ==========================================
// PASSKEY VALIDATION - Zod Schemas
// ==========================================

import { z } from 'zod';

// ==========================================
// REGISTRATION
// ==========================================

export const registerOptionsSchema = z.object({
  friendly_name: z.string()
    .min(1, 'Passkey name is required')
    .max(50, 'Passkey name must not exceed 50 characters')
    .trim()
    .optional()
    .default('My Passkey'),
});

export const registerVerifySchema = z.object({
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    response: z.object({
      clientDataJSON: z.string().min(1),
      attestationObject: z.string().min(1),
      transports: z.array(z.string()).optional(),
      publicKeyAlgorithm: z.number().optional(),
      publicKey: z.string().optional(),
      authenticatorData: z.string().optional(),
    }),
    type: z.literal('public-key'),
    clientExtensionResults: z.record(z.any()).optional(),
    authenticatorAttachment: z.string().optional(),
  }),
});

// ==========================================
// AUTHENTICATION
// ==========================================

export const loginOptionsSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
});

export const loginVerifySchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID'),
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    response: z.object({
      clientDataJSON: z.string().min(1),
      authenticatorData: z.string().min(1),
      signature: z.string().min(1),
      userHandle: z.string().optional(),
    }),
    type: z.literal('public-key'),
    clientExtensionResults: z.record(z.any()).optional(),
    authenticatorAttachment: z.string().optional(),
  }),
});

// ==========================================
// MANAGEMENT
// ==========================================

export const deletePasskeySchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
});

export const renamePasskeySchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
  friendly_name: z.string()
    .min(1, 'Passkey name is required')
    .max(50, 'Passkey name must not exceed 50 characters')
    .trim(),
});
