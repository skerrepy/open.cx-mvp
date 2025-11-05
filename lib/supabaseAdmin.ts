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
    console.error("[ADMIN CLIENT] NEXT_PUBLIC_SUPABASE_URL is not set");
    return null;
  }

  if (!supabaseServiceRoleKey) {
    console.error("[ADMIN CLIENT] SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will be limited.");
    return null;
  }

  // Verify service role key format (should start with 'eyJ' for JWT)
  if (!supabaseServiceRoleKey.startsWith('eyJ')) {
    console.error("[ADMIN CLIENT] Service role key does not appear to be a valid JWT token");
    return null;
  }

  console.log("[ADMIN CLIENT] Creating admin client with service role key (length:", supabaseServiceRoleKey.length, ")");

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
    },
  });

  // Verify admin methods are available
  if (!client.auth.admin) {
    console.error("[ADMIN CLIENT] Admin methods not available - service role key may be invalid");
    return null;
  }

  console.log("[ADMIN CLIENT] Admin client created successfully");
  return client;
}

