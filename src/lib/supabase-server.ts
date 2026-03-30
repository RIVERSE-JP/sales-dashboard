import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // During build-time prerendering, env vars may not be available.
    // Return a placeholder client — ISR will re-run at request time with real env vars.
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
  if (!_client) {
    _client = createClient(url, key);
  }
  return _client;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabaseServer() as unknown as Record<string | symbol, any>)[prop];
  },
});
