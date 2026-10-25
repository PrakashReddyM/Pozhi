import { z } from 'zod';

export const updatePriceSchema = z.object({
    type: z.enum([
        'passphoto_packs',
        'photocopies_single',
        'photocopies_set',
        'frame_sizes',
        'album_capacities',
        'snapnprint_packages'
    ], {
        errorMap: () => ({ message: 'Invalid product type' })
    }),
    id: z.string().uuid('Invalid ID format'),
    price: z.number().positive('Price must be positive')
});

export type UpdatePriceInput = z.infer<typeof updatePriceSchema>;
