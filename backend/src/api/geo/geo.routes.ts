// ==========================================
// GEO ROUTES
// ==========================================

import { Router } from 'express';
import * as GeoController from './geo.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

/**
 * Keeps the proxy from being used as a free geocoding service.
 * A customer filling in one address needs a handful of lookups at most.
 */
const geocodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many location lookups. Please enter your address manually.',
  keyGenerator: (req) => req.user?.id || (req.ip as string)
});

/**
 * Reverse geocode GPS coordinates
 * GET /api/v1/geo/reverse?lat=..&lon=..
 */
router.get('/reverse', requireAuth, geocodeLimiter, GeoController.reverseGeocode);

export default router;
