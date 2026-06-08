// Supabase Edge Function: tokens
//
// First-party token management for the in-app Docs page. The caller is a
// logged-in app user, so this function verifies their Supabase JWT (forwarded by
// supabase.functions.invoke) and then uses the service-role client to manage rows
// in `public.api_tokens` for that user. The raw token is returned exactly once,
// on creation; only its SHA-256 hash is stored.
//
//   POST   { name }              → create a token (returns plaintext once)
//   GET                          → list the user's tokens (metadata only)
//   POST   { action:"revoke", id } | DELETE ?id=  → revoke a token

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { generateToken } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Resolve the calling user from their forwarded JWT.
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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (req.method === "GET") {
      const { data, error } = await admin
        .from("api_tokens")
        .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ tokens: data ?? [] });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

      if (body.action === "revoke") {
        if (typeof body.id !== "string") return json({ error: "Provide token 'id'." }, 400);
        return await revoke(admin, uid, body.id);
      }

      // Otherwise: create a token.
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
      const { token, hash, prefix } = await generateToken();
      const { data, error } = await admin
        .from("api_tokens")
        .insert({ user_id: uid, name, token_hash: hash, token_prefix: prefix })
        .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
        .single();
      if (error) throw error;
      // `token` is the only time the plaintext is ever returned.
      return json({ token, record: data }, 201);
    }

    if (req.method === "DELETE") {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) return json({ error: "Provide token 'id'." }, 400);
      return await revoke(admin, uid, id);
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (err) {
    console.error("[tokens] error:", err);
    return json({ error: "Token operation failed." }, 500);
  }
});

async function revoke(admin: ReturnType<typeof createClient>, uid: string, id: string) {
  const { error } = await admin
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", uid)
    .is("revoked_at", null);
  if (error) throw error;
  return json({ ok: true });
}
