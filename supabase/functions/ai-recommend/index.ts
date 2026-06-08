// Supabase Edge Function: ai-recommend
//
// Profile-grounded book recommendation chat powered by Grok (xAI). The browser
// sends the running conversation plus a compact projection of the user's
// library; we ask Grok for a conversational reply and a structured list of book
// recommendations, and return that JSON to the client.
//
// The xAI key MUST stay server-side — it is read from the XAI_API_KEY secret
// (set via `supabase secrets set XAI_API_KEY=...`) and never reaches the bundle.
// The actual Grok call lives in ../_shared/grok.ts so the public `api` gateway
// can reuse it.

import { corsHeaders, json } from "../_shared/cors.ts";
import {
  askGrok,
  cleanMessages,
  type CompactBook,
  MAX_PROFILE_BOOKS,
} from "../_shared/grok.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("XAI_API_KEY");
  if (!apiKey) {
    return json(
      { error: "Server is missing XAI_API_KEY. Set it with `supabase secrets set`." },
      500,
    );
  }

  let messages: unknown = [];
  let profile: CompactBook[] = [];
  try {
    const body = await req.json();
    messages = body.messages;
    profile = Array.isArray(body.profile) ? body.profile : [];
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const clean = cleanMessages(messages);
  if (clean.length === 0) {
    return json({ error: "No conversation messages provided." }, 400);
  }

  try {
    const result = await askGrok(apiKey, clean, profile.slice(0, MAX_PROFILE_BOOKS));
    return json(result);
  } catch (err) {
    console.error("[ai-recommend] Grok call failed:", err);
    return json(
      { error: "The recommendation service is unavailable right now. Please try again." },
      502,
    );
  }
});
