
import crypto from 'crypto';

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
export function validatePhone(phone: string): boolean {
  // Indian phone: +91 followed by 10 digits
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate postal code (Indian PIN code)
 */
export function validatePinCode(pin: string): boolean {
  const pinRegex = /^[1-9][0-9]{5}$/;
  return pinRegex.test(pin);
}

/**
 * Sanitize string input
 * SECURITY: Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous chars
    .trim()
    .substring(0, 1000); // Max length
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: any, min = 0, max = 1000000): number | null {
  const num = parseFloat(input);
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

/**
 * Validate and sanitize query parameters
 */
export function sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Ignore other types
  }

  return sanitized;
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /('|\"|`)/
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if string contains XSS patterns
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // event handlers
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: {
  mimetype: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Allowed image types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
    };
  }

  // Max 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File too large. Maximum size is 10MB.' 
    };
  }

  return { valid: true };
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password (for comparison, not storage - use Supabase Auth)
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}