// ==========================================
// AUTH VALIDATION - COMPLETELY NEW FILE
// ==========================================
// Validation schemas for all auth endpoints
// Using Zod for type-safe validation
// ==========================================

import { z } from 'zod';

// ==========================================
// REUSABLE SCHEMAS
// ==========================================

const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

const phoneSchema = z.string()
  .regex(
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    'Invalid phone number format'
  )
  .optional();

// ==========================================
// SIGNUP VALIDATION
// ==========================================

export const signupSchema = z.object({
  email: emailSchema,
  
  password: passwordSchema,
  
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Full name can only contain letters, spaces, hyphens and apostrophes'
    )
    .trim(),
  
  phone: phoneSchema,
  
  // Terms acceptance (optional, but recommended)
  accept_terms: z.boolean()
    .refine(val => val === true, {
      message: 'You must accept the terms and conditions'
    })
    .optional()
});

export type SignupInput = z.infer<typeof signupSchema>;

// ==========================================
// LOGIN VALIDATION
// ==========================================

export const loginSchema = z.object({
  email: emailSchema,
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
  
  // Optional: Remember me functionality
  remember_me: z.boolean().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;

// ==========================================
// FORGOT PASSWORD VALIDATION
// ==========================================

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ==========================================
// RESET PASSWORD VALIDATION
// ==========================================

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  
  new_password: passwordSchema,
  
  confirm_password: z.string()
    .min(1, 'Password confirmation is required')
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
);

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ==========================================
// CHANGE PASSWORD VALIDATION (Logged In)
// ==========================================

export const changePasswordSchema = z.object({
  current_password: z.string()
    .min(1, 'Current password is required'),
  
  new_password: passwordSchema,
  
  confirm_password: z.string()
    .min(1, 'Password confirmation is required')
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password']
  }
);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ==========================================
// VERIFY EMAIL VALIDATION
// ==========================================

export const verifyEmailSchema = z.object({
  token: z.string()
    .min(1, 'Verification token is required')
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ==========================================
// REFRESH TOKEN VALIDATION
// ==========================================

export const refreshTokenSchema = z.object({
  refresh_token: z.string()
    .min(1, 'Refresh token is required')
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ==========================================
// UPDATE PROFILE VALIDATION
// ==========================================

export const updateProfileSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Full name can only contain letters, spaces, hyphens and apostrophes'
    )
    .trim()
    .optional(),
  
  phone: phoneSchema,
  
  avatar_url: z.string()
    .url('Invalid avatar URL')
    .optional(),
  
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().length(2, 'Country must be 2-letter ISO code').optional()
  }).optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;