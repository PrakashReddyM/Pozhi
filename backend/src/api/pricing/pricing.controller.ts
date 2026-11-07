// ==========================================
// PRICING CONTROLLER - Serve all pricing data
//
// Migrated from Supabase/PostgREST to Drizzle. Two things changed in the shape
// of the code, not in the shape of the responses:
//
//   * Rows now come back with camelCase keys, because that is how the
//     introspected schema names the columns. The JSON sent to the frontend is
//     unchanged - the mapping functions below absorb the difference.
//   * Failed queries throw instead of returning an error object, so the
//     per-query `if (error)` blocks are gone; the try/catch handles it.
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../../db';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

// ==========================================
// HELPERS
// ==========================================

/**
 * Every catalogue table shares the same read: active rows, in display order.
 */
type CatalogueTable =
  | typeof schema.passphotoCategories
  | typeof schema.passphotoPacks
  | typeof schema.photocopiesSingle
  | typeof schema.photocopiesSet
  | typeof schema.frameMaterials
  | typeof schema.frameSizes
  | typeof schema.albumCapacities
  | typeof schema.snapnprintCategories
  | typeof schema.snapnprintPackages;

async function activeRows<T extends CatalogueTable>(table: T) {
  return db
    .select()
    .from(table as any)
    .where(eq((table as any).isActive, true))
    .orderBy(asc((table as any).displayOrder)) as Promise<any[]>;
}

/** Numeric columns arrive from pg as strings to protect decimal precision. */
const money = (value: string | null) => parseFloat(value ?? '0');

// ==========================================
// SHAPE MAPPERS (the response contract the frontends rely on)
// ==========================================

const mapPassPhotoCategories = (categories: any[], packs: any[]) =>
  categories.map((category) => ({
    id: category.categoryId,
    label: category.label,
    columns: category.columns,
    rows: category.rows,
    aspectLabel: category.aspectLabel,
    packs: packs
      .filter((pack) => pack.categoryId === category.id)
      .map((pack) => ({
        id: pack.id,
        packId: pack.packId,
        label: pack.label,
        copies: pack.copies,
        price: money(pack.price),
        description: pack.description
      }))
  }));

const mapPhotoCopies = (singleOptions: any[], setOptions: any[]) => ({
  single: singleOptions.map((opt) => ({
    id: opt.id,
    optionId: opt.optionId,
    sizeLabel: opt.sizeLabel,
    sizeKey: opt.sizeKey,
    copies: opt.copiesText,
    price: money(opt.price),
    aspectRatio: opt.aspectRatio
  })),
  set: setOptions.map((opt) => ({
    id: opt.id,
    setId: opt.setId,
    sizeLabel: opt.sizeLabel,
    sizeKey: opt.sizeKey,
    pricePerPiece: money(opt.pricePerPiece),
    aspectRatio: opt.aspectRatio,
    copiesPerUnit: opt.copiesPerUnit
  }))
});

const mapFrames = (materials: any[], sizes: any[]) => ({
  materials: materials.map((mat) => ({
    id: mat.id,
    materialId: mat.materialId,
    label: mat.label,
    description: mat.description
  })),
  sizes: sizes.map((size) => ({
    id: size.id,
    sizeId: size.sizeId,
    sizeLabel: size.sizeLabel,
    dimensions: size.dimensions,
    price: money(size.price),
    aspectRatio: size.aspectRatio,
    orientation: size.orientation
  }))
});

const mapAlbumCapacities = (capacities: any[]) =>
  capacities.map((cap) => ({
    id: cap.id,
    capacityId: cap.capacityId,
    label: cap.label,
    images: cap.images,
    price: money(cap.price)
  }));

const mapSnapnPrintCategories = (categories: any[], packages: any[]) =>
  categories.map((category) => ({
    id: category.categoryId,
    label: category.label,
    description: category.description,
    packages: packages
      .filter((pkg) => pkg.categoryId === category.id)
      .map((pkg) => ({
        id: pkg.id,
        packageId: pkg.packageId,
        label: pkg.label,
        price: money(pkg.price)
      }))
  }));

// ==========================================
// DATA LOADERS (shared by the single and combined endpoints)
// ==========================================

async function getPassPhotoPricingData() {
  const [categories, packs] = await Promise.all([
    activeRows(schema.passphotoCategories),
    activeRows(schema.passphotoPacks)
  ]);
  return { categories: mapPassPhotoCategories(categories, packs) };
}

async function getPhotoCopiesPricingData() {
  const [singleOptions, setOptions] = await Promise.all([
    activeRows(schema.photocopiesSingle),
    activeRows(schema.photocopiesSet)
  ]);
  return mapPhotoCopies(singleOptions, setOptions);
}

async function getFramesPricingData() {
  const [materials, sizes] = await Promise.all([
    activeRows(schema.frameMaterials),
    activeRows(schema.frameSizes)
  ]);
  return mapFrames(materials, sizes);
}

async function getAlbumPricingData() {
  return mapAlbumCapacities(await activeRows(schema.albumCapacities));
}

async function getSnapnPrintPricingData() {
  const [categories, packages] = await Promise.all([
    activeRows(schema.snapnprintCategories),
    activeRows(schema.snapnprintPackages)
  ]);
  return { categories: mapSnapnPrintCategories(categories, packages) };
}

// ==========================================
// ENDPOINTS
// ==========================================

export const getPassPhotoPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({ status: 'success', data: await getPassPhotoPricingData() });
  } catch (error) {
    next(error);
  }
};

export const getPhotoCopiesPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({ status: 'success', data: await getPhotoCopiesPricingData() });
  } catch (error) {
    next(error);
  }
};

export const getFramesPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({ status: 'success', data: await getFramesPricingData() });
  } catch (error) {
    next(error);
  }
};

export const getAlbumPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { capacities: await getAlbumPricingData() }
    });
  } catch (error) {
    next(error);
  }
};

export const getSnapnPrintPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({ status: 'success', data: await getSnapnPrintPricingData() });
  } catch (error) {
    next(error);
  }
};

/**
 * Everything at once, for the initial app load.
 * @route GET /api/v1/pricing
 */
export const getAllPricing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Fetching all pricing data');

    // Independent reads; no reason to serialise them as the old code did.
    const [passphoto, photocopies, frames, albums, snapnprint] = await Promise.all([
      getPassPhotoPricingData(),
      getPhotoCopiesPricingData(),
      getFramesPricingData(),
      getAlbumPricingData(),
      getSnapnPrintPricingData()
    ]);

    res.status(200).json({
      status: 'success',
      data: { passphoto, photocopies, frames, albums, snapnprint }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE PRICING (Admin Only)
// ==========================================

/**
 * The client names a product type; this maps it to a table and to that table's
 * price column. Two reasons it is a map rather than a dynamic table name:
 * the table can never be attacker-controlled, and `photocopies_set` prices its
 * rows in `price_per_piece` rather than `price` - which the previous dynamic
 * `.from(type).update({ price })` would have failed on.
 */
const PRICE_TARGETS = {
  // hasUpdatedAt: only passphoto_packs actually carries an updated_at column.
  // Setting it unconditionally would throw "column does not exist" on the
  // other five tables.
  passphoto_packs: { table: schema.passphotoPacks, column: 'price', hasUpdatedAt: true },
  photocopies_single: { table: schema.photocopiesSingle, column: 'price', hasUpdatedAt: false },
  photocopies_set: { table: schema.photocopiesSet, column: 'pricePerPiece', hasUpdatedAt: false },
  frame_sizes: { table: schema.frameSizes, column: 'price', hasUpdatedAt: false },
  album_capacities: { table: schema.albumCapacities, column: 'price', hasUpdatedAt: false },
  snapnprint_packages: { table: schema.snapnprintPackages, column: 'price', hasUpdatedAt: false }
} as const;

export const updatePrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const { type, id, price } = req.body;

    const target = PRICE_TARGETS[type as keyof typeof PRICE_TARGETS];
    if (!target) {
      throw new ApiError(400, 'Invalid product type');
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      throw new ApiError(400, 'Price must be a non-negative number');
    }

    // numeric columns are passed as strings so no float rounding creeps in.
    const [updated] = await db
      .update(target.table as any)
      .set({
        [target.column]: numericPrice.toFixed(2),
        // Timestamps are introspected as mode:'string', so pass an ISO string.
        ...(target.hasUpdatedAt ? { updatedAt: new Date().toISOString() } : {})
      })
      .where(eq((target.table as any).id, id))
      .returning();

    if (!updated) {
      throw new ApiError(404, 'Product not found');
    }

    logger.info('Price updated successfully', { type, id, price: numericPrice });

    res.status(200).json({
      status: 'success',
      message: 'Price updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
