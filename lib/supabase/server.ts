import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseServerAdminClient: SupabaseClient | null = null;

/**
 * Server-side Supabase client with admin privileges (uses SUPABASE_SECRET_KEY).
 * NEVER expose this client to the browser.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (supabaseServerAdminClient) {
    return supabaseServerAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecfzfcpiyalrcavgytyk.supabase.co';
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || 'sb_secret_9A-M6hth_8y2Koe95bOA7g_fd9ia_JB';

  supabaseServerAdminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseServerAdminClient;
}
