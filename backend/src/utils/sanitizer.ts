// ==========================================
// INPUT SANITIZER
// Prevents XSS, HTML Injection
// ==========================================

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * Uses DOMPurify for comprehensive HTML sanitization
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove any HTML tags and sanitize
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true // Keep text content
  });

  // Additional cleanup
  return sanitized
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 10000); // Max length
}

/**
 * Sanitize HTML content (for rich text fields like descriptions)
 * Allows safe HTML tags only
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 
      'ul', 'ol', 'li', 'a', 'blockquote'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?):)?\/\//i // Only allow http(s) URLs
  });
}

/**
 * Sanitize JSON input
 */
export function sanitizeJSON(input: any): any {
  if (typeof input === 'string') {
    return sanitizeInput(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeJSON(item));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeJSON(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Escape special characters for SQL (additional safety layer)
 * Note: Use parameterized queries as primary defense
 */
export function escapeSQLString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\x00/g, ''); // Remove null bytes
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'untitled';

  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .substring(0, 255); // Max length
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Remove sensitive data from objects before logging
 */
export function sanitizeForLogging(obj: any): any {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'api_key', 'apiKey',
    'credit_card', 'cvv', 'ssn', 'pan', 'aadhaar'
  ];

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}