import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the service role key
 * This client has full access and can query auth.users
 * ONLY use this on the server side, never expose the service role key to the client
 * Returns null if service role key is not available
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is not set");
    return null;
  }

  if (!supabaseServiceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will be limited.");
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

