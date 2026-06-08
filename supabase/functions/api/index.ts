// Supabase Edge Function: api
//
// Public, per-user HTTP API for the library app. Callers authenticate with a
// Personal Access Token (`Authorization: Bearer lib_sk_…`) — NOT a Supabase JWT
// or anon key — so this function must be deployed with JWT verification OFF
// (see supabase/config.toml). Every route resolves the token to a user_id and
// then acts on that user's data via the service-role client.
//
// Routes (relative to /functions/v1/api):
//   POST   /books      add one or more books
//   GET    /library    full library snapshot
//   POST   /sessions   log a reading session
//   POST   /recommend  AI book recommendations grounded in the user's library

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { authenticatePat } from "../_shared/auth.ts";
import { bookToRow, rowsToBooks, rowsToSessions } from "../_shared/mapping.ts";
import { askGrok, cleanMessages, type CompactBook } from "../_shared/grok.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_STATUS = new Set(["to-read", "reading", "finished"]);

function unauthorized(message: string): Response {
  return json({ error: message }, 401);
}

function newId(): string {
  return crypto.randomUUID();
}

/** Extract the route segment after `/api` from the request path. */
function routeOf(req: Request): string {
  const { pathname } = new URL(req.url);
  // Strip everything up to and including the function name.
  const after = pathname.split("/api").pop() ?? "";
  return "/" + after.replace(/^\/+|\/+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { userId, error: authError } = await authenticatePat(req, admin, unauthorized);
  if (authError) return authError;
  const uid = userId!;

  const route = routeOf(req);

  try {
    if (req.method === "GET" && route === "/library") {
      return await getLibrary(admin, uid);
    }
    if (req.method === "POST" && route === "/books") {
      return await addBooks(admin, uid, await req.json().catch(() => null));
    }
    if (req.method === "POST" && route === "/sessions") {
      return await addSession(admin, uid, await req.json().catch(() => null));
    }
    if (req.method === "POST" && route === "/recommend") {
      return await recommend(admin, uid, await req.json().catch(() => null));
    }
    return json({ error: `No route for ${req.method} ${route}.` }, 404);
  } catch (err) {
    console.error("[api] unhandled error:", err);
    return json({ error: "Internal error." }, 500);
  }
});

// ── GET /library ──────────────────────────────────────────────────────────────

async function getLibrary(admin: ReturnType<typeof createClient>, uid: string) {
  const [books, shelves, categories, bookShelves, bookCategories, sessions, progresses] =
    await Promise.all([
      admin.from("books").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
      admin.from("shelves").select("id, name, color").eq("user_id", uid),
      admin.from("categories").select("id, name").eq("user_id", uid),
      admin.from("book_shelves").select("book_id, shelf_id").eq("user_id", uid),
      admin.from("book_categories").select("book_id, category_id").eq("user_id", uid),
      admin.from("reading_sessions").select("*").eq("user_id", uid).order("date", { ascending: false }),
      admin.from("session_book_progresses").select("session_id, book_id, new_progress").eq("user_id", uid),
    ]);

  const firstErr =
    books.error || shelves.error || categories.error || bookShelves.error ||
    bookCategories.error || sessions.error || progresses.error;
  if (firstErr) {
    console.error("[api] library read failed:", firstErr);
    return json({ error: "Could not load the library." }, 500);
  }

  return json({
    books: rowsToBooks(books.data as never, bookShelves.data as never, bookCategories.data as never),
    categories: (categories.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    shelves: (shelves.data ?? []).map((s) => ({ id: s.id, name: s.name, color: s.color ?? undefined })),
    sessions: rowsToSessions(sessions.data as never, progresses.data as never),
  });
}

// ── POST /books ───────────────────────────────────────────────────────────────

async function addBooks(admin: ReturnType<typeof createClient>, uid: string, body: unknown) {
  if (!body || typeof body !== "object") {
    return json({ error: "Expected a JSON body." }, 400);
  }
  const raw = (body as { books?: unknown }).books ?? body;
  const inputs = Array.isArray(raw) ? raw : [raw];
  if (inputs.length === 0) {
    return json({ error: "Provide at least one book." }, 400);
  }

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  const categoryLinks: { book_id: string; category_id: string; user_id: string }[] = [];
  const shelfLinks: { book_id: string; shelf_id: string; user_id: string }[] = [];

  for (const item of inputs) {
    if (!item || typeof item !== "object") {
      return json({ error: "Each book must be an object." }, 400);
    }
    const b = item as Record<string, unknown>;
    if (typeof b.title !== "string" || !b.title.trim()) {
      return json({ error: "Each book needs a non-empty 'title'." }, 400);
    }
    if (typeof b.author !== "string" || !b.author.trim()) {
      return json({ error: "Each book needs a non-empty 'author'." }, 400);
    }
    if (b.status !== undefined && !VALID_STATUS.has(String(b.status))) {
      return json({ error: "'status' must be one of to-read, reading, finished." }, 400);
    }
    if (b.progress !== undefined && b.progress !== null) {
      const p = Number(b.progress);
      if (!Number.isInteger(p) || p < 0 || p > 100) {
        return json({ error: "'progress' must be an integer 0–100." }, 400);
      }
    }
    if (b.rating !== undefined && b.rating !== null) {
      const r = Number(b.rating);
      if (!Number.isInteger(r) || r < 0 || r > 5) {
        return json({ error: "'rating' must be an integer 0–5." }, 400);
      }
    }

    const id = newId();
    rows.push(bookToRow(b, id, uid, now));
    for (const cid of Array.isArray(b.categoryIds) ? b.categoryIds : []) {
      if (typeof cid === "string") categoryLinks.push({ book_id: id, category_id: cid, user_id: uid });
    }
    for (const sid of Array.isArray(b.shelfIds) ? b.shelfIds : []) {
      if (typeof sid === "string") shelfLinks.push({ book_id: id, shelf_id: sid, user_id: uid });
    }
  }

  const { data: inserted, error } = await admin
    .from("books")
    .insert(rows)
    .select("*");
  if (error) {
    console.error("[api] book insert failed:", error);
    return json({ error: error.message }, 400);
  }

  if (categoryLinks.length) {
    const { error: cErr } = await admin.from("book_categories").insert(categoryLinks);
    if (cErr) console.error("[api] category link failed:", cErr);
  }
  if (shelfLinks.length) {
    const { error: sErr } = await admin.from("book_shelves").insert(shelfLinks);
    if (sErr) console.error("[api] shelf link failed:", sErr);
  }

  return json(
    {
      books: rowsToBooks(
        inserted as never,
        shelfLinks.map((l) => ({ book_id: l.book_id, shelf_id: l.shelf_id })),
        categoryLinks.map((l) => ({ book_id: l.book_id, category_id: l.category_id })),
      ),
    },
    201,
  );
}

// ── POST /sessions ────────────────────────────────────────────────────────────

async function addSession(admin: ReturnType<typeof createClient>, uid: string, body: unknown) {
  if (!body || typeof body !== "object") {
    return json({ error: "Expected a JSON body." }, 400);
  }
  const s = body as Record<string, unknown>;
  if (typeof s.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
    return json({ error: "'date' is required as YYYY-MM-DD." }, 400);
  }
  const bookProgresses = Array.isArray(s.bookProgresses) ? s.bookProgresses : [];

  const sessionId = newId();
  const now = new Date().toISOString();

  const { error: sErr } = await admin.from("reading_sessions").insert({
    id: sessionId,
    user_id: uid,
    date: s.date,
    minutes: (s.minutes as number | undefined) ?? null,
    mood: (s.mood as string | undefined) ?? null,
    notes: (s.notes as string | undefined) ?? null,
    quote: (s.quote as string | undefined) ?? null,
    quote_page: (s.quotePage as number | undefined) ?? null,
    created_at: now,
  });
  if (sErr) {
    console.error("[api] session insert failed:", sErr);
    return json({ error: sErr.message }, 400);
  }

  // Fetch the affected books so we can derive status transitions.
  const ids = bookProgresses
    .map((p) => (p && typeof p === "object" ? (p as Record<string, unknown>).bookId : null))
    .filter((v): v is string => typeof v === "string");

  const owned = new Map<string, { status: string }>();
  if (ids.length) {
    const { data } = await admin.from("books").select("id, status").eq("user_id", uid).in("id", ids);
    for (const r of data ?? []) owned.set(r.id as string, { status: r.status as string });
  }

  const progressRows: { session_id: string; book_id: string; user_id: string; new_progress: number }[] = [];
  for (const p of bookProgresses) {
    if (!p || typeof p !== "object") continue;
    const bp = p as Record<string, unknown>;
    const bookId = bp.bookId;
    if (typeof bookId !== "string" || !owned.has(bookId)) continue; // ignore books not owned by this user
    const clamped = Math.max(0, Math.min(100, Math.round(Number(bp.newProgress) || 0)));
    progressRows.push({ session_id: sessionId, book_id: bookId, user_id: uid, new_progress: clamped });

    const prev = owned.get(bookId)!;
    const patch: Record<string, unknown> = { progress: clamped, updated_at: now };
    if (clamped >= 100) patch.status = "finished";
    else if (prev.status === "to-read") patch.status = "reading";
    await admin.from("books").update(patch).eq("id", bookId).eq("user_id", uid);
  }

  if (progressRows.length) {
    const { error: pErr } = await admin.from("session_book_progresses").insert(progressRows);
    if (pErr) console.error("[api] session progress insert failed:", pErr);
  }

  return json(
    {
      session: {
        id: sessionId,
        date: s.date,
        minutes: (s.minutes as number | undefined) ?? undefined,
        mood: (s.mood as string | undefined) ?? undefined,
        notes: (s.notes as string | undefined) ?? undefined,
        quote: (s.quote as string | undefined) ?? undefined,
        quotePage: (s.quotePage as number | undefined) ?? undefined,
        bookProgresses: progressRows.map((r) => ({ bookId: r.book_id, newProgress: r.new_progress })),
        createdAt: now,
      },
    },
    201,
  );
}

// ── POST /recommend ───────────────────────────────────────────────────────────

async function recommend(admin: ReturnType<typeof createClient>, uid: string, body: unknown) {
  const apiKey = Deno.env.get("XAI_API_KEY");
  if (!apiKey) {
    return json({ error: "Server is missing XAI_API_KEY." }, 500);
  }

  const b = (body ?? {}) as Record<string, unknown>;
  // Accept either a full chat (`messages`) or a single `query` string.
  const messages = cleanMessages(
    Array.isArray(b.messages)
      ? b.messages
      : typeof b.query === "string"
        ? [{ role: "user", content: b.query }]
        : [],
  );
  if (messages.length === 0) {
    return json({ error: "Provide 'messages' or a 'query' string." }, 400);
  }

  // Build the user's compact reading profile from their library.
  const [booksRes, catsRes, linksRes] = await Promise.all([
    admin.from("books").select("title, author, status, rating, pages, publish_year, id").eq("user_id", uid),
    admin.from("categories").select("id, name").eq("user_id", uid),
    admin.from("book_categories").select("book_id, category_id").eq("user_id", uid),
  ]);

  const catName = new Map((catsRes.data ?? []).map((c) => [c.id as string, c.name as string]));
  const catsByBook = new Map<string, string[]>();
  for (const l of linksRes.data ?? []) {
    const arr = catsByBook.get(l.book_id as string) ?? [];
    const n = catName.get(l.category_id as string);
    if (n) arr.push(n);
    catsByBook.set(l.book_id as string, arr);
  }

  const profile: CompactBook[] = (booksRes.data ?? []).map((r) => ({
    title: r.title as string,
    author: r.author as string,
    status: (r.status as string) ?? undefined,
    rating: (r.rating as number | null) ?? undefined,
    categories: catsByBook.get(r.id as string),
    pages: (r.pages as number | null) ?? undefined,
    publishYear: (r.publish_year as number | null) ?? undefined,
  }));

  try {
    const result = await askGrok(apiKey, messages, profile);
    return json(result);
  } catch (err) {
    console.error("[api] Grok call failed:", err);
    return json({ error: "The recommendation service is unavailable right now." }, 502);
  }
}
