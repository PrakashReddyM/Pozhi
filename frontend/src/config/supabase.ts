import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Defensive initialization: only create client if credentials exist
// to prevent the entire app from crashing on load.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: () => {
        throw new Error("Supabase client not initialized. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
      }
    });
