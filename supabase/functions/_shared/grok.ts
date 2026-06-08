// Shared Grok (xAI) recommendation logic, used by both the `ai-recommend`
// function (first-party, called from the browser) and the public `api` gateway
// (PAT-authed). The xAI key stays server-side via the XAI_API_KEY secret.
//
// xAI has no dedicated JS SDK, so we use the OpenAI client pointed at xAI's
// OpenAI-compatible endpoint.

import OpenAI from "npm:openai@4";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.3";

// Bound the payload so a huge library / long chat can't blow up token cost.
export const MAX_PROFILE_BOOKS = 100;
export const MAX_MESSAGES = 12;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CompactBook {
  title: string;
  author: string;
  status?: string;
  rating?: number;
  categories?: string[];
  pages?: number;
  publishYear?: number;
}

export interface GrokReply {
  reply: string;
  books: { title: string; author: string; reason: string }[];
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

/** Sanitise + clamp the incoming conversation. */
export function cleanMessages(messages: unknown): ChatTurn[] {
  const arr = Array.isArray(messages) ? messages : [];
  return arr
    .filter(
      (m): m is ChatTurn =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_MESSAGES);
}

/**
 * Call Grok with the user's profile + conversation and return the structured
 * reply. Throws on transport/API errors; the caller maps that to a 502.
 */
export async function askGrok(
  apiKey: string,
  messages: ChatTurn[],
  profile: CompactBook[],
): Promise<GrokReply> {
  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });
  const model = Deno.env.get("XAI_MODEL") ?? DEFAULT_MODEL;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(profile.slice(0, MAX_PROFILE_BOOKS)) },
      ...messages,
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { reply?: string; books?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reply: raw, books: [] };
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

  return {
    reply: typeof parsed.reply === "string" ? parsed.reply : "",
    books,
  };
}
