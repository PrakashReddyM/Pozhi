
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const BUCKETS = [env.SUPABASE_BUCKET, 'user-uploads', 'customer-photos'];

async function initStorage() {
    logger.info('Initializing Supabase Storage...');

    try {
        // 1. List existing buckets
        const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();

        if (listError) {
            logger.error('Failed to list buckets', { error: listError.message });
            throw new Error(listError.message);
        }

        const existingNames = existingBuckets.map(b => b.name);
        logger.info('Existing buckets:', existingNames);

        for (const bucketName of BUCKETS) {
            if (existingNames.includes(bucketName)) {
                logger.info(`Bucket '${bucketName}' already exists.`);
                continue;
            }

            logger.info(`Bucket '${bucketName}' does not exist. Creating...`);

            // 3. Create bucket if missing
            const { data, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
                public: true, // Make it public so we can share links easily
                fileSizeLimit: 52428800, // 50MB
                allowedMimeTypes: ['image/*', 'application/pdf', 'application/zip']
            });

            if (createError) {
                logger.error(`Failed to create bucket '${bucketName}'`, { error: createError.message });
                // Don't exit, try next bucket
            } else {
                logger.info(`Bucket '${bucketName}' created successfully!`);
            }
        }

        logger.info('Storage initialization complete.');
        // Allow process to exit naturally

    } catch (error: any) {
        logger.error('Unexpected error during storage init', { error: error.message });
        process.exitCode = 1;
    }
}

initStorage();
