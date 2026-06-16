// Supabase Edge Function: search-sessions
//
// Hybrid search over the caller's reading sessions. Combines a classic
// full-text/relevance search with semantic vector search and fuses both ranked
// lists into ONE result list via Reciprocal Rank Fusion (RRF), always including
// the user's most recent sessions — all implemented in the shared
// `searchSessions` helper + the `hybrid_search_sessions` Postgres function.
//
// First-party, called from the browser with the logged-in user's Supabase JWT
// (verify_jwt = true in config.toml). We resolve the user from that JWT, then
// run the shared hybrid search (which embeds the query with OpenAI
// text-embedding-3-small — the same model the stored vectors were built with).
//
// The OpenAI key MUST stay server-side — read from the OPENAI_API_KEY secret.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { searchSessions } from "../_shared/sessionSearch.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_MATCH_COUNT = 30;
const MAX_MATCH_COUNT = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return json(
      { error: "Server is missing OPENAI_API_KEY. Set it with `supabase secrets set`." },
      500,
    );
  }

  // Resolve the caller from their JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Not authenticated." }, 401);
  }
  const uid = userData.user.id;

  // Parse the request.
  let query = "";
  let matchCount = DEFAULT_MATCH_COUNT;
  try {
    const body = await req.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
    if (Number.isInteger(body.matchCount)) {
      matchCount = Math.max(1, Math.min(MAX_MATCH_COUNT, body.matchCount));
    }
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  if (!query) {
    return json({ error: "Provide a non-empty 'query' string." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const results = await searchSessions(admin, openaiKey, uid, query, matchCount);
    return json({ results });
  } catch (err) {
    console.error("[search-sessions] search failed:", err);
    return json({ error: "Search failed." }, 502);
  }
});
