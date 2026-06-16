// Shared Grok (xAI) agent logic, used by both the `ai-recommend` function
// (first-party, called from the browser) and the public `api` gateway
// (PAT-authed). The xAI key stays server-side via the XAI_API_KEY secret.
//
// xAI has no dedicated JS SDK, so we use the OpenAI client pointed at xAI's
// OpenAI-compatible endpoint.
//
// The agent can call tools — `search_reading_sessions` (hybrid full-text +
// semantic retrieval over the user's journal) and `get_reading_stats` (aggregate
// totals/counts) — before it answers. The caller supplies the executors; if none
// are given, no tools are offered and the agent behaves as a plain recommender
// (used by the PAT `api`).

import OpenAI from "npm:openai@4";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.3";

// Bound the payload so a huge library / long chat can't blow up token cost.
export const MAX_PROFILE_BOOKS = 100;
export const MAX_MESSAGES = 12;
// Bound the agentic loop and the size of tool output we feed back to the model.
const MAX_TOOL_ROUNDS = 3;
const MAX_TOOL_RESULTS = 18;

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

/** Compact session shape the agent gets back from the search tool. */
export interface AgentSessionHit {
  date: string;
  mood: string | null;
  minutes: number | null;
  notes: string | null;
  quote: string | null;
  books: string[];
  isRecent: boolean;
}

/** Executors the caller wires to the real data layer. */
export type SessionSearchFn = (query: string) => Promise<AgentSessionHit[]>;
export type ReadingStatsFn = () => Promise<unknown>;

export interface AgentTools {
  /** Hybrid search over the user's reading journal (returns a relevant sample). */
  searchSessions?: SessionSearchFn;
  /** Aggregate reading stats (totals/counts) for the user. */
  getReadingStats?: ReadingStatsFn;
}

const SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_reading_sessions",
    description:
      "Search the user's OWN private reading journal — their per-session notes, " +
      "moods, reading minutes, dates and which book each session covered — using " +
      "hybrid full-text + semantic search. Also returns the user's most recent " +
      "sessions. Call this BEFORE answering anything about the user's past reading, " +
      "how they felt, what/when they read, their habits or themes, AND to ground a " +
      "book recommendation in what they have actually been reading.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Natural-language description of what to find in the reading journal, " +
            "e.g. 'how I felt reading Mistborn' or 'sessions about grief and loss'.",
        },
      },
      required: ["query"],
    },
  },
};

const STATS_TOOL = {
  type: "function" as const,
  function: {
    name: "get_reading_stats",
    description:
      "Get AGGREGATE statistics about the user's reading: total number of reading " +
      "sessions, total minutes read, average session length, days read, first/last " +
      "session date, sessions in the last 7 days, counts of books by status " +
      "(finished/reading/to-read), and a mood breakdown. Use this for ANY 'how many', " +
      "'how much', 'total', 'count', 'average', 'how often' or similar aggregate " +
      "question. NEVER answer such questions by counting search_reading_sessions " +
      "results — those are only a small relevant sample, not the totals.",
    parameters: { type: "object", properties: {} },
  },
};

function buildSystemPrompt(
  profile: CompactBook[],
  hasSearch: boolean,
  hasStats: boolean,
): string {
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

  const lines = [
    "You are a warm, knowledgeable reading companion inside a personal reading app.",
    "You do two things, depending on what the user asks:",
    "1) Answer questions about the user's OWN reading — how they felt, what and when",
    "   they read, recurring themes and habits — grounded in their reading journal.",
    "2) Recommend real, published books that suit their taste.",
  ];

  if (hasSearch || hasStats) {
    lines.push("", "You have tools to look up the user's real reading data:");
  }
  if (hasSearch) {
    lines.push(
      "- `search_reading_sessions`: hybrid full-text + semantic search over the user's",
      "  reading journal (session notes, moods, dates, and the book each covered); it",
      "  also returns their most recent sessions. It returns only a RELEVANT SAMPLE, not",
      "  every session. Use it to find or quote specific sessions and to ground a",
      "  recommendation in what they've actually read. NEVER infer totals or counts from",
      "  how many results it returns.",
    );
  }
  if (hasStats) {
    lines.push(
      "- `get_reading_stats`: aggregate totals/counts (number of sessions, total minutes,",
      "  average session length, days read, books by status, mood breakdown, etc.). Use",
      "  this for ANY 'how many / how much / total / average / how often' question.",
    );
  }
  if (hasSearch || hasStats) {
    lines.push(
      "- Base every statement about the user's reading on tool results; do NOT invent",
      "  sessions or numbers. If the tools don't cover the question, say so honestly.",
      "- For simple greetings or small talk you don't need any tool.",
    );
  }

  lines.push(
    "",
    "The user's library (books they own) — for additional context:",
    profileText,
    "",
    "Rules:",
    "- For recommendations: NEVER recommend a book already in the library above or one",
    "  the journal shows they've already read. Honour any count the user asks for.",
    "- Keep `reply` conversational and concise. Put recommended books only in `books`,",
    "  not as a list inside `reply`.",
    "- Always reply with VALID JSON ONLY, matching exactly this shape:",
    '  { "reply": string, "books": [ { "title": string, "author": string, "reason": string } ] }',
    "  `books` is empty when you are answering a question rather than recommending.",
  );

  return lines.join("\n");
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

function parseReply(raw: string): GrokReply {
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
  return { reply: typeof parsed.reply === "string" ? parsed.reply : "", books };
}

/** Execute a single tool call against the wired executors. */
// deno-lint-ignore no-explicit-any
async function runTool(tc: any, agentTools: AgentTools): Promise<string> {
  const name = tc?.function?.name;
  let args: { query?: unknown } = {};
  try {
    args = JSON.parse(tc?.function?.arguments || "{}");
  } catch { /* leave args empty */ }

  if (name === "search_reading_sessions" && agentTools.searchSessions) {
    const hits = await agentTools.searchSessions(String(args.query ?? ""));
    return JSON.stringify(hits.slice(0, MAX_TOOL_RESULTS));
  }
  if (name === "get_reading_stats" && agentTools.getReadingStats) {
    return JSON.stringify(await agentTools.getReadingStats());
  }
  return JSON.stringify({ error: `unknown tool: ${name}` });
}

/**
 * Call Grok with the user's profile + conversation and return the structured
 * reply. When `agentTools` are provided, the model may call them (e.g.
 * `search_reading_sessions`, `get_reading_stats`), looped up to MAX_TOOL_ROUNDS
 * times, before producing the final JSON answer. Throws on transport/API errors.
 */
export async function askGrok(
  apiKey: string,
  messages: ChatTurn[],
  profile: CompactBook[],
  agentTools: AgentTools = {},
): Promise<GrokReply> {
  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });
  const model = Deno.env.get("XAI_MODEL") ?? DEFAULT_MODEL;
  const hasSearch = typeof agentTools.searchSessions === "function";
  const hasStats = typeof agentTools.getReadingStats === "function";

  const tools = [
    ...(hasSearch ? [SEARCH_TOOL] : []),
    ...(hasStats ? [STATS_TOOL] : []),
  ];
  const hasTools = tools.length > 0;

  // deno-lint-ignore no-explicit-any
  const convo: any[] = [
    {
      role: "system",
      content: buildSystemPrompt(profile.slice(0, MAX_PROFILE_BOOKS), hasSearch, hasStats),
    },
    ...messages,
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(hasTools ? { tools, tool_choice: "auto" as const } : {}),
      messages: convo,
    });

    const msg = completion.choices[0]?.message;
    const toolCalls = msg?.tool_calls ?? [];

    if (hasTools && toolCalls.length > 0) {
      convo.push(msg); // assistant turn carrying the tool_calls
      for (const tc of toolCalls) {
        let content: string;
        try {
          content = await runTool(tc, agentTools);
        } catch (err) {
          console.error("[grok] tool exec failed:", err);
          content = JSON.stringify({ error: "tool execution failed" });
        }
        convo.push({ role: "tool", tool_call_id: tc.id, content });
      }
      continue; // let the model read the tool output and decide next step
    }

    return parseReply(msg?.content ?? "{}");
  }

  // Tool budget exhausted — force a final answer with no further tool calls.
  const final = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: convo,
  });
  return parseReply(final.choices[0]?.message?.content ?? "{}");
}
