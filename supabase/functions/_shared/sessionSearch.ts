// Shared hybrid-search-over-reading-sessions helper, used by both the
// `search-sessions` function (direct endpoint) and the `ai-recommend` agent
// (as a tool it can call). Embeds the query with OpenAI `text-embedding-3-small`
// (same model the stored session vectors were built with), runs the
// `hybrid_search_sessions` RPC (full-text + vector + RRF, plus the user's most
// recent sessions), then enriches each hit with the book title(s) it covers.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const EMBED_MODEL = "text-embedding-3-small";

export interface SessionHit {
  id: string;
  date: string;
  mood: string | null;
  minutes: number | null;
  notes: string | null;
  quote: string | null;
  score: number;
  isRecent: boolean;
  books: string[];
}

/** Embed a single string with OpenAI. Throws on API/transport failure. */
export async function embedText(openaiKey: string, text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

/**
 * Hybrid-search a user's reading sessions and return enriched hits.
 * `admin` must be a service-role client (the RPC is scoped by p_user_id).
 */
export async function searchSessions(
  admin: SupabaseClient,
  openaiKey: string,
  uid: string,
  query: string,
  matchCount = 20,
): Promise<SessionHit[]> {
  const embedding = await embedText(openaiKey, query);

  const { data, error } = await admin.rpc("hybrid_search_sessions", {
    p_user_id: uid,
    query_text: query,
    query_embedding: JSON.stringify(embedding),
    match_count: matchCount,
  });
  if (error) throw new Error(`hybrid_search_sessions failed: ${error.message}`);

  const rows = (data ?? []) as Array<{
    id: string; date: string; mood: string | null; minutes: number | null;
    notes: string | null; quote: string | null; score: number; is_recent: boolean;
  }>;
  if (rows.length === 0) return [];

  // Enrich with book title(s) per session (no FK-relationship assumption).
  const ids = rows.map((r) => r.id);
  const titlesBySession = new Map<string, string[]>();
  const { data: links } = await admin
    .from("session_book_progresses")
    .select("session_id, book_id")
    .eq("user_id", uid)
    .in("session_id", ids);

  const bookIds = [...new Set((links ?? []).map((l) => l.book_id as string))];
  const titleById = new Map<string, string>();
  if (bookIds.length) {
    const { data: books } = await admin
      .from("books")
      .select("id, title")
      .eq("user_id", uid)
      .in("id", bookIds);
    for (const b of books ?? []) titleById.set(b.id as string, b.title as string);
  }
  for (const l of links ?? []) {
    const title = titleById.get(l.book_id as string);
    if (!title) continue;
    const arr = titlesBySession.get(l.session_id as string) ?? [];
    arr.push(title);
    titlesBySession.set(l.session_id as string, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    mood: r.mood,
    minutes: r.minutes,
    notes: r.notes,
    quote: r.quote,
    score: r.score,
    isRecent: r.is_recent,
    books: titlesBySession.get(r.id) ?? [],
  }));
}
