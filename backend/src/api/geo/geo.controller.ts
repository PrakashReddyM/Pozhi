// ==========================================
// GEO CONTROLLER
// Reverse geocoding proxy for the checkout "Use my current location" button.
//
// Nominatim (OpenStreetMap) is proxied server-side rather than called from the
// browser so that its usage policy can actually be honoured: an identifying
// User-Agent is required, and the upstream must not be hit more than once a
// second. Neither is enforceable from client code.
// https://operations.osmfoundation.org/policies/nominatim/
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const UPSTREAM_TIMEOUT_MS = 8000;
const MIN_UPSTREAM_INTERVAL_MS = 1100; // Nominatim allows at most 1 req/sec

let lastUpstreamCallAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serialise calls to Nominatim so we never exceed 1 request per second,
 * regardless of how many customers are on the checkout page at once.
 */
async function throttleUpstream(): Promise<void> {
  const wait = lastUpstreamCallAt + MIN_UPSTREAM_INTERVAL_MS - Date.now();
  lastUpstreamCallAt = Date.now() + Math.max(wait, 0);
  if (wait > 0) await sleep(wait);
}

const firstOf = (addr: Record<string, string>, keys: string[]): string =>
  keys.map((k) => addr[k]).find((v) => !!v) || '';

/**
 * Map Nominatim's address object onto the structured checkout fields.
 * Anything we cannot work out is returned empty — the fields stay editable,
 * so a partial fill is still useful.
 */
function toAddressFields(payload: any) {
  const addr: Record<string, string> = payload?.address || {};

  const house = [addr.house_number, addr.building || addr.house_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  const street = [
    addr.road || addr.pedestrian || addr.residential,
    addr.neighbourhood || addr.suburb || addr.village
  ]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  const pincode = /^[1-9]\d{5}$/.test(addr.postcode || '') ? addr.postcode : '';

  return {
    house,
    street,
    landmark: '',
    city: firstOf(addr, ['city', 'town', 'municipality', 'city_district', 'county', 'state_district']),
    state: addr.state || '',
    pincode,
    formatted: payload?.display_name || ''
  };
}

/**
 * Reverse geocode coordinates into address fields
 * @route GET /api/v1/geo/reverse?lat=..&lon=..
 * @access Private
 */
export const reverseGeocode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new ApiError(400, 'Valid lat and lon query parameters are required');
    }

    const url = `${NOMINATIM_URL}?${new URLSearchParams({
      format: 'jsonv2',
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
      zoom: '18',
      addressdetails: '1'
    }).toString()}`;

    await throttleUpstream();

    let upstream: Awaited<ReturnType<typeof fetch>>;
    try {
      upstream = await fetch(url, {
        headers: {
          'User-Agent': env.NOMINATIM_USER_AGENT,
          'Accept-Language': 'en',
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
    } catch (err) {
      logger.warn('Reverse geocoding upstream unreachable', { err: (err as Error)?.message });
      throw new ApiError(503, 'Could not look up your location right now. Please type your address.');
    }

    if (!upstream.ok) {
      logger.warn('Reverse geocoding upstream error', { status: upstream.status });
      throw new ApiError(503, 'Could not look up your location right now. Please type your address.');
    }

    const payload: any = await upstream.json();

    if (payload?.error) {
      throw new ApiError(404, 'No address found for your location. Please type your address.');
    }

    res.status(200).json({
      success: true,
      data: toAddressFields(payload)
    });
  } catch (error) {
    next(error);
  }
};
