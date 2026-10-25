// ==========================================
// PRICING CONTROLLER - Serve all pricing data
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin as supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

// ==========================================
// GET PASSPHOTO PRICING
// ==========================================

export const getPassPhotoPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Fetch all categories with their packs
        const { data: categories, error: catError } = await supabase
            .from('passphoto_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (catError) {
            console.error('SUPABASE ERROR (PassPhoto Categories):', catError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        // Fetch all packs and group by category
        const { data: packs, error: packsError } = await supabase
            .from('passphoto_packs')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (packsError) {
            console.error('SUPABASE ERROR (PassPhoto Packs):', packsError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        // Group packs by category
        const categoriesWithPacks = categories?.map(category => ({
            id: category.category_id,
            label: category.label,
            columns: category.columns,
            rows: category.rows,
            aspectLabel: category.aspect_label,
            packs: packs
                ?.filter(pack => pack.category_id === category.id)
                .map(pack => ({
                    id: pack.id, // Use UUID
                    packId: pack.pack_id, // Keep text ID just in case
                    label: pack.label,
                    copies: pack.copies,
                    price: parseFloat(pack.price),
                    description: pack.description
                })) || []
        })) || [];

        res.status(200).json({
            status: 'success',
            data: {
                categories: categoriesWithPacks
            }
        });

    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET PHOTOCOPIES PRICING
// ==========================================

export const getPhotoCopiesPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Fetch single options
        const { data: singleOptions, error: singleError } = await supabase
            .from('photocopies_single')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (singleError) {
            console.error('SUPABASE ERROR (Single Options):', singleError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        // Fetch set options
        const { data: setOptions, error: setError } = await supabase
            .from('photocopies_set')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (setError) {
            console.error('SUPABASE ERROR (Set Options):', setError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        res.status(200).json({
            status: 'success',
            data: {
                single: singleOptions?.map(opt => ({
                    id: opt.id, // Use UUID
                    optionId: opt.option_id,
                    sizeLabel: opt.size_label,
                    sizeKey: opt.size_key,
                    copies: opt.copies_text,
                    price: parseFloat(opt.price),
                    aspectRatio: opt.aspect_ratio
                })) || [],
                set: setOptions?.map(opt => ({
                    id: opt.id, // Use UUID
                    setId: opt.set_id,
                    sizeLabel: opt.size_label,
                    sizeKey: opt.size_key,
                    pricePerPiece: parseFloat(opt.price_per_piece),
                    aspectRatio: opt.aspect_ratio,
                    copiesPerUnit: opt.copies_per_unit
                })) || []
            }
        });

    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET FRAMES PRICING
// ==========================================

export const getFramesPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Fetch materials
        const { data: materials, error: materialsError } = await supabase
            .from('frame_materials')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (materialsError) {
            console.error('SUPABASE ERROR (Frame Materials):', materialsError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        // Fetch sizes
        const { data: sizes, error: sizesError } = await supabase
            .from('frame_sizes')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (sizesError) {
            console.error('SUPABASE ERROR (Frame Sizes):', sizesError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        res.status(200).json({
            status: 'success',
            data: {
                materials: materials?.map(mat => ({
                    id: mat.id, // Use UUID
                    materialId: mat.material_id,
                    label: mat.label,
                    description: mat.description
                })) || [],
                sizes: sizes?.map(size => ({
                    id: size.id, // Use UUID
                    sizeId: size.size_id,
                    sizeLabel: size.size_label,
                    dimensions: size.dimensions,
                    price: parseFloat(size.price),
                    aspectRatio: size.aspect_ratio,
                    orientation: size.orientation
                })) || []
            }
        });

    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET ALBUM PRICING
// ==========================================

export const getAlbumPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { data: capacities, error } = await supabase
            .from('album_capacities')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (error) {
            console.error('SUPABASE ERROR (Album Capacities):', error);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        res.status(200).json({
            status: 'success',
            data: {
                capacities: capacities?.map(cap => ({
                    id: cap.id, // Use UUID
                    capacityId: cap.capacity_id,
                    label: cap.label,
                    images: cap.images,
                    price: parseFloat(cap.price)
                })) || []
            }
        });

    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET SNAP'N'PRINT PRICING
// ==========================================

export const getSnapnPrintPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Fetch categories
        const { data: categories, error: catError } = await supabase
            .from('snapnprint_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (catError) {
            console.error('SUPABASE ERROR (SnapnPrint Categories):', catError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        // Fetch packages
        const { data: packages, error: packError } = await supabase
            .from('snapnprint_packages')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (packError) {
            console.error('SUPABASE ERROR (SnapnPrint Packages):', packError);
            throw new ApiError(500, 'Failed to fetch pricing data');
        }

        // Group packages by category
        const categoriesWithPackages = categories?.map(category => ({
            id: category.category_id,
            label: category.label,
            description: category.description,
            packages: packages
                ?.filter(pkg => pkg.category_id === category.id)
                .map(pkg => ({
                    id: pkg.id, // Use UUID
                    packageId: pkg.package_id,
                    label: pkg.label,
                    price: parseFloat(pkg.price)
                })) || []
        })) || [];

        res.status(200).json({
            status: 'success',
            data: {
                categories: categoriesWithPackages
            }
        });

    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET ALL PRICING (Convenience endpoint)
// ==========================================

export const getAllPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        logger.info('Fetching all pricing data');

        // This is a convenience endpoint that fetches all pricing at once
        // Useful for initial app load or caching
        const passphoto = await getPassPhotoPricingData();
        const photocopies = await getPhotoCopiesPricingData();
        const frames = await getFramesPricingData();
        const albums = await getAlbumPricingData();
        const snapnprint = await getSnapnPrintPricingData();

        res.status(200).json({
            status: 'success',
            data: {
                passphoto,
                photocopies,
                frames,
                albums,
                snapnprint
            }
        });

    } catch (error) {
        next(error);
    }
};

// Helper functions for getAllPricing
async function getPassPhotoPricingData() {
    const { data: categories } = await supabase
        .from('passphoto_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    const { data: packs } = await supabase
        .from('passphoto_packs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    return categories?.map(category => ({
        id: category.category_id,
        label: category.label,
        columns: category.columns,
        rows: category.rows,
        aspectLabel: category.aspect_label,
        packs: packs
            ?.filter(pack => pack.category_id === category.id)
            .map(pack => ({
                id: pack.id, // Use UUID
                packId: pack.pack_id,
                label: pack.label,
                copies: pack.copies,
                price: parseFloat(pack.price),
                description: pack.description
            })) || []
    })) || [];
}

async function getPhotoCopiesPricingData() {
    const { data: singleOptions } = await supabase
        .from('photocopies_single')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    const { data: setOptions } = await supabase
        .from('photocopies_set')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    return {
        single: singleOptions?.map(opt => ({
            id: opt.id, // Use UUID
            optionId: opt.option_id,
            sizeLabel: opt.size_label,
            sizeKey: opt.size_key,
            copies: opt.copies_text,
            price: parseFloat(opt.price),
            aspectRatio: opt.aspect_ratio
        })) || [],
        set: setOptions?.map(opt => ({
            id: opt.id, // Use UUID
            setId: opt.set_id,
            sizeLabel: opt.size_label,
            sizeKey: opt.size_key,
            pricePerPiece: parseFloat(opt.price_per_piece),
            aspectRatio: opt.aspect_ratio,
            copiesPerUnit: opt.copies_per_unit
        })) || []
    };
}

async function getFramesPricingData() {
    const { data: materials } = await supabase
        .from('frame_materials')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    const { data: sizes } = await supabase
        .from('frame_sizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    return {
        materials: materials?.map(mat => ({
            id: mat.id, // Use UUID
            materialId: mat.material_id,
            label: mat.label,
            description: mat.description
        })) || [],
        sizes: sizes?.map(size => ({
            id: size.id, // Use UUID
            sizeId: size.size_id,
            sizeLabel: size.size_label,
            dimensions: size.dimensions,
            price: parseFloat(size.price),
            aspectRatio: size.aspect_ratio,
            orientation: size.orientation
        })) || []
    };
}

async function getAlbumPricingData() {
    const { data: capacities } = await supabase
        .from('album_capacities')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    return capacities?.map(cap => ({
        id: cap.id, // Use UUID
        capacityId: cap.capacity_id,
        label: cap.label,
        images: cap.images,
        price: parseFloat(cap.price)
    })) || [];
}

async function getSnapnPrintPricingData() {
    const { data: categories } = await supabase
        .from('snapnprint_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    const { data: packages } = await supabase
        .from('snapnprint_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    return categories?.map(category => ({
        id: category.category_id,
        label: category.label,
        description: category.description,
        packages: packages
            ?.filter(pkg => pkg.category_id === category.id)
            .map(pkg => ({
                id: pkg.id, // Use UUID
                packageId: pkg.package_id,
                label: pkg.label,
                price: parseFloat(pkg.price)
            })) || []
    })) || [];
}

// ==========================================
// UPDATE PRICING (Admin Only)
// ==========================================

export const updatePrice = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            throw new ApiError(403, 'Admin access required');
        }

        const { type, id, price } = req.body;

        // Allowlist of tables is handled by Zod validation, but double check here for safety
        const validTables = [
            'passphoto_packs',
            'photocopies_single',
            'photocopies_set',
            'frame_sizes',
            'album_capacities',
            'snapnprint_packages'
        ];

        if (!validTables.includes(type)) {
            throw new ApiError(400, 'Invalid product type');
        }

        const { data, error } = await supabase
            .from(type)
            .update({ price: price, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Failed to update price', { error: error.message, type, id });
            throw new ApiError(500, 'Failed to update price');
        }

        logger.info('Price updated successfully', { type, id, price });

        res.status(200).json({
            status: 'success',
            message: 'Price updated successfully',
            data
        });

    } catch (error) {
        next(error);
    }
};
