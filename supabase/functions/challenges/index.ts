// Supabase Edge Function: challenges
//
// Evaluates the caller's reading sessions against the reading challenges authored
// in Strapi (the headless CMS on Railway) and grants coin/XP rewards for any
// newly-completed challenge. Returns the merged challenge + progress list for the
// app to render.
//
// First-party, called from the browser with the logged-in user's Supabase JWT
// (verify_jwt = true in config.toml). We resolve the user from that JWT, read the
// challenge definitions from Strapi server-side (the Strapi token never touches
// the browser), then score + grant using a service-role client.
//
// Strapi config lives in secrets: STRAPI_URL (required) and STRAPI_API_TOKEN
// (a read-only token). If STRAPI_URL is unset we return an empty list so the app
// degrades gracefully instead of erroring.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { evaluateChallenges, fetchStrapiChallenges } from "../_shared/challenges.ts";

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

  const strapiUrl = Deno.env.get("STRAPI_URL");
  if (!strapiUrl) {
    // Strapi not configured yet — no challenges to show, but don't error.
    return json({ challenges: [], newlyCompleted: [] });
  }
  const strapiToken = Deno.env.get("STRAPI_API_TOKEN");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const defs = await fetchStrapiChallenges(strapiUrl, strapiToken);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const result = await evaluateChallenges(admin, uid, defs, today);
    // Only surface challenges that are active or already completed.
    const visible = result.challenges.filter((c) => c.active || c.completed);
    return json({ challenges: visible, newlyCompleted: result.newlyCompleted });
  } catch (err) {
    console.error("[challenges] evaluation failed:", err);
    return json({ error: "Challenge evaluation failed." }, 502);
  }
});
