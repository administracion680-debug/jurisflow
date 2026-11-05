import { createClient } from '@supabase/supabase-js';

// These are public client settings, not service-role credentials.
// They are safe to ship in the browser; database access is enforced by RLS.
const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://unzmbrmjrwaijkyxzxnc.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_vpARg6M9eyNsLGxtgNHXLw_DhRHCSFB';

export const supabase = createClient(projectUrl, publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
