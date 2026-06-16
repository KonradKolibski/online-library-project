// Supabase Edge Function: ai-recommend
//
// The Discover agent. Powered by Grok (xAI), grounded in the user's library AND
// — via tool-calling — their reading journal. The browser sends the running
// conversation plus a compact projection of the user's library; the agent may
// call `search_reading_sessions` (hybrid full-text + semantic search over the
// user's sessions) before producing a conversational reply plus, when relevant,
// structured book recommendations.
//
// Secrets (server-side only, never bundled):
//   XAI_API_KEY     — Grok access (set via `supabase secrets set`)
//   OPENAI_API_KEY  — query embeddings for the session search tool

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  askGrok,
  cleanMessages,
  type CompactBook,
  MAX_PROFILE_BOOKS,
  type AgentSessionHit,
} from "../_shared/grok.ts";
import { searchSessions } from "../_shared/sessionSearch.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const xaiKey = Deno.env.get("XAI_API_KEY");
  if (!xaiKey) {
    return json(
      { error: "Server is missing XAI_API_KEY. Set it with `supabase secrets set`." },
      500,
    );
  }
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  // Resolve the caller from their JWT so the session search is scoped to them.
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

  // Wire the session-search tool — only when we can actually embed queries.
  let searchTool: ((query: string) => Promise<AgentSessionHit[]>) | undefined;
  if (openaiKey) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    searchTool = async (query: string) => {
      const hits = await searchSessions(admin, openaiKey, uid, query);
      return hits.map((h) => ({
        date: h.date,
        mood: h.mood,
        minutes: h.minutes,
        notes: h.notes,
        quote: h.quote,
        books: h.books,
        isRecent: h.isRecent,
      }));
    };
  } else {
    console.warn("[ai-recommend] OPENAI_API_KEY missing — session search tool disabled.");
  }

  try {
    const result = await askGrok(xaiKey, clean, profile.slice(0, MAX_PROFILE_BOOKS), searchTool);
    return json(result);
  } catch (err) {
    console.error("[ai-recommend] agent call failed:", err);
    return json(
      { error: "The recommendation service is unavailable right now. Please try again." },
      502,
    );
  }
});
