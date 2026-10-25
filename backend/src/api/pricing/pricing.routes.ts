// ==========================================
// PRICING ROUTES - Public endpoints
// ==========================================

import { Router } from 'express';
import {
    getPassPhotoPricing,
    getPhotoCopiesPricing,
    getFramesPricing,
    getAlbumPricing,
    getSnapnPrintPricing,
    getAllPricing,
    updatePrice
} from './pricing.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { updatePriceSchema } from './pricing.validation';

const router = Router();

// All pricing endpoints are PUBLIC (no authentication required)

/**
 * @route   GET /api/pricing/passphoto
 * @desc    Get all PassPhoto pricing (categories and packs)
 * @access  Public
 */
router.get('/passphoto', getPassPhotoPricing);

/**
 * @route   GET /api/pricing/photocopies
 * @desc    Get all PhotoCopies pricing (single and set options)
 * @access  Public
 */
router.get('/photocopies', getPhotoCopiesPricing);

/**
 * @route   GET /api/pricing/frames
 * @desc    Get all Frames pricing (materials and sizes)
 * @access  Public
 */
router.get('/frames', getFramesPricing);

/**
 * @route   GET /api/pricing/albums
 * @desc    Get all Album pricing (capacities)
 * @access  Public
 */
router.get('/albums', getAlbumPricing);

/**
 * @route   GET /api/pricing/snapnprint
 * @desc    Get all Snap'n'Print pricing (categories and packages)
 * @access  Public
 */
router.get('/snapnprint', getSnapnPrintPricing);

/**
 * @route   GET /api/pricing/all
 * @desc    Get ALL pricing data at once (convenience endpoint for caching)
 * @access  Public
 */
router.get('/all', getAllPricing);

/**
 * @route   PATCH /api/pricing/update
 * @desc    Update product price (Admin only)
 * @access  Private (Admin)
 */
router.patch(
    '/update',
    requireAuth,
    validate(updatePriceSchema),
    updatePrice
);

export default router;
