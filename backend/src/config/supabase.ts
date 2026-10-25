
// ==========================================
// SUPABASE CLIENT - CORRECTED VERSION
// ==========================================
// ✅ Uses validated env variables
// ✅ Proper error handling
// ✅ Admin and public client separation
// ==========================================

import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from '../utils/logger';

// ==========================================
// PUBLIC CLIENT (For frontend/user operations)
// ==========================================

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side, no session persistence
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-application': 'luminia-backend'
      }
    }
  }
);

// ==========================================
// ADMIN CLIENT (For privileged operations)
// ==========================================

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-application': 'luminia-backend-admin'
      }
    }
  }
);

// ==========================================
// CONNECTION TEST
// ==========================================

export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      logger.error('Supabase connection test failed', { error: error.message });
      return false;
    }

    logger.info('✅ Supabase connection successful');
    return true;

  } catch (error: any) {
    logger.error('Supabase connection test error', { error: error.message });
    return false;
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get storage bucket public URL
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Create signed URL for private files
 */
export const createSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    logger.error('Failed to create signed URL', { error: error.message, bucket, path });
    return null;
  }

  return data.signedUrl;
};

// ==========================================
// EXPORT
// ==========================================

export default supabase;