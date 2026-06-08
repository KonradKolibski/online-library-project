import { supabase } from "@/lib/supabase";

/** A token's metadata as returned by the `tokens` edge function (no secret). */
export interface ApiTokenRecord {
  id: string;
  name: string | null;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

async function invoke<T>(
  method: "GET" | "POST" | "DELETE",
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(
    "tokens",
    { method, ...(body ? { body } : {}) },
  );
  if (error) throw new Error(error.message || "Token request failed.");
  if (data && (data as { error?: string }).error) {
    throw new Error((data as { error?: string }).error);
  }
  return data as T;
}

/** List the current user's API tokens (metadata only). */
export async function listTokens(): Promise<ApiTokenRecord[]> {
  const data = await invoke<{ tokens: ApiTokenRecord[] }>("GET");
  return data.tokens ?? [];
}

/**
 * Create a new token. The returned `token` is the full plaintext secret and is
 * only available here, once — it can never be retrieved again.
 */
export async function createToken(
  name: string,
): Promise<{ token: string; record: ApiTokenRecord }> {
  return invoke<{ token: string; record: ApiTokenRecord }>("POST", { name });
}

/** Revoke (permanently disable) a token by id. */
export async function revokeToken(id: string): Promise<void> {
  await invoke<{ ok: true }>("POST", { action: "revoke", id });
}
