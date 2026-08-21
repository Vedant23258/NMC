import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appEnv } from '@/core/config/env';

let client: SupabaseClient | undefined;

export const supabase = (): SupabaseClient => {
  if (client) return client;
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set to use VITE_API_MODE=gateway.',
    );
  }
  client = createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey);
  return client;
};
