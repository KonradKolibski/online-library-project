import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Whether the Supabase env vars are present. When false, the app renders a
 * configuration screen instead of crashing — IMPORTANT: throwing here at
 * module-load time white-screens the entire app (the bundle fails to evaluate
 * before React can mount), which is exactly what happens on a deploy that's
 * missing these vars.
 */
export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Set them in your environment (Vercel → Settings → Environment Variables, " +
      "or .env.local for local dev).",
  );
}

// Fall back to harmless placeholders so `createClient` doesn't throw on import.
// Any real auth call will fail at runtime, but the app stays mountable and can
// show a helpful message rather than a blank page.
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
