// ==========================================
// PRODUCT ROUTES - PRODUCTION GRADE
// Security Level: Banking-Grade ✓
// ==========================================

import { Router } from 'express';
import * as ProductController from './products.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

// ==========================================
// RATE LIMITERS
// ==========================================

/**
 * General product browsing rate limit
 * Allow 100 requests per 15 minutes per IP
 */
const browseRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests. Please try again later.',
  keyGenerator: (req) => req.ip as string
});

/**
 * Search rate limit (stricter)
 * Allow 20 searches per 15 minutes per IP
 * Prevents search abuse and scraping
 */
const searchRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many search requests. Please try again in 15 minutes.',
  keyGenerator: (req) => req.ip as string
});

/**
 * Detail view rate limit (per product)
 * Prevents scraping of product details
 * 30 detail views per minute per IP
 */
const detailRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many product detail requests.',
  keyGenerator: (req) => req.ip as string
});

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================

/**
 * Get all frames with filters
 * 
 * @route GET /api/v1/products/frames
 * @query {string} [category] - Filter by category
 * @query {number} [minPrice] - Minimum price filter
 * @query {number} [maxPrice] - Maximum price filter
 * @query {string} [material] - Filter by material
 * @query {boolean} [inStock] - Show only in-stock items
 * @query {boolean} [featured] - Show only featured items
 * 
 * @example GET /api/v1/products/frames?category=wood&inStock=true&minPrice=100&maxPrice=5000
 */
router.get(
  '/frames',
  browseRateLimiter,
  optionalAuth, // Get user ID if logged in, but don't require it
  ProductController.getFrames
);

/**
 * Get single frame details
 * 
 * @route GET /api/v1/products/frames/:id
 * @param {string} id - Frame UUID
 * 
 * @example GET /api/v1/products/frames/550e8400-e29b-41d4-a716-446655440000
 */
router.get(
  '/frames/:id',
  detailRateLimiter,
  optionalAuth,
  ProductController.getFrameDetails
);

/**
 * Get gallery art with filters
 * 
 * @route GET /api/v1/products/gallery
 * @query {string} [category] - Filter by art category
 * @query {string} [artist] - Filter by artist name
 * @query {number} [minPrice] - Minimum price
 * @query {number} [maxPrice] - Maximum price
 * 
 * @example GET /api/v1/products/gallery?category=nature&minPrice=500
 */
router.get(
  '/gallery',
  browseRateLimiter,
  optionalAuth,
  ProductController.getGallery
);

/**
 * Get single gallery art item
 * 
 * @route GET /api/v1/products/gallery/:id
 * @param {string} id - Gallery art UUID
 */
router.get(
  '/gallery/:id',
  detailRateLimiter,
  optionalAuth,
  ProductController.getGalleryArtDetails
);

/**
 * Get customization options
 * 
 * @route GET /api/v1/products/options
 * 
 * @returns {object} Customization options grouped by type
 * @example Response:
 * {
 *   "mat_color": [
 *     { "id": "...", "option_value": "black", "display_name": "Black Mat", "price_adjustment": 0 }
 *   ],
 *   "glass_type": [
 *     { "id": "...", "option_value": "uv_protection", "display_name": "UV Protection", "price_adjustment": 200 }
 *   ]
 * }
 */
router.get(
  '/options',
  browseRateLimiter,
  optionalAuth,
  ProductController.getOptions
);

/**
 * Get featured products
 * 
 * @route GET /api/v1/products/featured
 * 
 * @returns {object} Featured frames and gallery art
 */
router.get(
  '/featured',
  browseRateLimiter,
  optionalAuth,
  ProductController.getFeaturedProducts
);

/**
 * Search products
 * 
 * @route GET /api/v1/products/search
 * @query {string} q - Search query (required, min 2 chars, max 100 chars)
 * 
 * SECURITY: Strict rate limiting to prevent abuse
 * 
 * @example GET /api/v1/products/search?q=wooden+frame
 */
router.get(
  '/search',
  searchRateLimiter, // Stricter limit
  optionalAuth,
  ProductController.searchProducts
);

/**
 * Get product recommendations
 * 
 * @route GET /api/v1/products/recommendations
 * 
 * @description Returns personalized recommendations if authenticated,
 * otherwise returns featured products
 */
router.get(
  '/recommendations',
  browseRateLimiter,
  optionalAuth,
  ProductController.getRecommendations
);

// ==========================================
// ROUTE DOCUMENTATION
// ==========================================

/**
 * USAGE NOTES:
 * 
 * 1. All routes are public (no authentication required)
 * 2. Rate limiting applied to prevent abuse
 * 3. Optional authentication enhances experience (tracking, recommendations)
 * 4. All responses are cached for performance
 * 5. All inputs are validated and sanitized
 * 
 * ERROR RESPONSES:
 * - 400: Bad Request (invalid parameters)
 * - 404: Not Found (product doesn't exist)
 * - 429: Too Many Requests (rate limit exceeded)
 * - 500: Internal Server Error (database/server issue)
 * 
 * SUCCESS RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "count": 10,        // For list endpoints
 *   "data": {...}       // Actual data
 * }
 */

export default router;