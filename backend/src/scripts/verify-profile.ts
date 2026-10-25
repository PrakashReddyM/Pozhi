
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

const USER_ID = 'fa9bda9c-cb33-407d-9122-b832a589c001'; // From logs
const EMAIL = 'admin@pozhi.com';

async function verifyProfile() {
    logger.info(`Verifying profile for user ${USER_ID}...`);

    try {
        // 1. Check if profile exists
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', USER_ID)
            .single();

        if (profile) {
            logger.info('✅ Profile exists:', profile);
        } else {
            logger.warn('❌ Profile not found. Attempting to create...');

            // 2. Create profile if missing
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: USER_ID,
                    email: EMAIL,
                    full_name: 'Admin User',
                    role: 'admin',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                logger.error('Failed to create profile', { error: createError.message });
            } else {
                logger.info('✅ Profile created successfully:', newProfile);
            }
        }

        process.exit(0);

    } catch (error: any) {
        logger.error('Unexpected error', { error: error.message });
        process.exit(1);
    }
}

verifyProfile();
