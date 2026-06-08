// Personal Access Token (PAT) helpers for the public API gateway.
//
// Tokens look like `lib_sk_<base64url>`; we only ever store their SHA-256 hash in
// `public.api_tokens`. On each request we hash the presented token, look up a
// matching non-revoked row, bump `last_used_at`, and return the owning user id.
// The raw token is never logged.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const TOKEN_PREFIX = "lib_sk_";

/** SHA-256 of the raw token, hex-encoded. */
export async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a fresh token + its hash + a display prefix. Used by the tokens fn. */
export async function generateToken(): Promise<{
  token: string;
  hash: string;
  prefix: string;
}> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url without padding.
  const b64 = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const token = `${TOKEN_PREFIX}${b64}`;
  return {
    token,
    hash: await hashToken(token),
    prefix: token.slice(0, TOKEN_PREFIX.length + 6),
  };
}

export interface AuthResult {
  userId: string | null;
  /** A ready-to-return error response when authentication fails. */
  error: Response | null;
}

/**
 * Authenticate a request by its `Authorization: Bearer lib_sk_…` header.
 * `admin` must be a service-role client (RLS-bypassing) so it can read api_tokens.
 */
export async function authenticatePat(
  req: Request,
  admin: SupabaseClient,
  unauthorized: (msg: string) => Response,
): Promise<AuthResult> {
  const header = req.headers.get("Authorization") ?? "";
  const raw = header.replace(/^Bearer\s+/i, "").trim();
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) {
    return {
      userId: null,
      error: unauthorized("Missing or malformed API token. Send 'Authorization: Bearer lib_sk_…'."),
    };
  }

  const hash = await hashToken(raw);
  const { data, error } = await admin
    .from("api_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (error) {
    return { userId: null, error: unauthorized("Could not verify the API token.") };
  }
  if (!data || data.revoked_at) {
    return { userId: null, error: unauthorized("Invalid or revoked API token.") };
  }

  // Best-effort last-used bump; never block the request on it.
  admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {}, () => {});

  return { userId: data.user_id as string, error: null };
}
