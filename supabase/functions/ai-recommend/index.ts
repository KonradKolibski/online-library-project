// Supabase Edge Function: ai-recommend
//
// Profile-grounded book recommendation chat powered by Grok (xAI). The browser
// sends the running conversation plus a compact projection of the user's
// library; we ask Grok for a conversational reply and a structured list of book
// recommendations, and return that JSON to the client.
//
// The xAI key MUST stay server-side — it is read from the XAI_API_KEY secret
// (set via `supabase secrets set XAI_API_KEY=...`) and never reaches the bundle.
// xAI has no dedicated JS SDK, so we use the OpenAI client pointed at xAI's
// OpenAI-compatible endpoint.

import OpenAI from "npm:openai@4";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.3";

// Bound the payload so a huge library / long chat can't blow up token cost.
const MAX_PROFILE_BOOKS = 100;
const MAX_MESSAGES = 12;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface CompactBook {
  title: string;
  author: string;
  status?: string;
  rating?: number;
  categories?: string[];
  pages?: number;
  publishYear?: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(profile: CompactBook[]): string {
  const profileText = profile.length
    ? profile
        .map((b) => {
          const bits = [`"${b.title}" by ${b.author}`];
          if (b.status) bits.push(b.status);
          if (typeof b.rating === "number") bits.push(`rated ${b.rating}/10`);
          if (b.categories?.length) bits.push(b.categories.join("/"));
          return `- ${bits.join(" — ")}`;
        })
        .join("\n")
    : "(the user's library is currently empty)";

  return [
    "You are a warm, knowledgeable book-recommendation assistant inside a personal reading app.",
    "Recommend real, published books that suit the user's taste, grounded in their reading profile below.",
    "",
    "User's reading profile (books they already have in their library):",
    profileText,
    "",
    "Rules:",
    "- NEVER recommend a book that already appears in the profile above.",
    "- Honour any count the user asks for (e.g. 'top 10' → return 10 books).",
    "- Prefer books that genuinely match the genres, authors, and ratings in their profile, plus whatever the latest message asks for.",
    "- Keep `reason` to one short sentence explaining why it suits THIS user.",
    "- Always reply with VALID JSON ONLY, matching exactly this shape:",
    '{ "reply": string, "books": [ { "title": string, "author": string, "reason": string } ] }',
    "`reply` is a short, friendly message shown above the list. `books` may be empty if the user is just chatting.",
  ].join("\n");
}

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

  let messages: ChatTurn[] = [];
  let profile: CompactBook[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    profile = Array.isArray(body.profile) ? body.profile : [];
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // Sanitise + clamp.
  const cleanMessages = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-MAX_MESSAGES);
  if (cleanMessages.length === 0) {
    return json({ error: "No conversation messages provided." }, 400);
  }
  const cleanProfile = profile.slice(0, MAX_PROFILE_BOOKS);

  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });
  const model = Deno.env.get("XAI_MODEL") ?? DEFAULT_MODEL;

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(cleanProfile) },
        ...cleanMessages,
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { reply?: string; books?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Model didn't return clean JSON — surface its text as the reply.
      return json({ reply: raw, books: [] });
    }

    const books = Array.isArray(parsed.books)
      ? parsed.books
          .filter(
            (b: unknown): b is { title: string; author: string; reason?: string } =>
              !!b &&
              typeof (b as { title?: unknown }).title === "string" &&
              typeof (b as { author?: unknown }).author === "string",
          )
          .map((b) => ({
            title: b.title,
            author: b.author,
            reason: typeof b.reason === "string" ? b.reason : "",
          }))
      : [];

    return json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      books,
    });
  } catch (err) {
    console.error("[ai-recommend] Grok call failed:", err);
    return json(
      { error: "The recommendation service is unavailable right now. Please try again." },
      502,
    );
  }
});
