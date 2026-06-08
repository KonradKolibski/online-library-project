// Deno-side row ⇄ JSON mappers for the public API. These mirror
// src/lib/supabase-mapping.ts — kept as a separate copy because edge functions
// can't import the browser `@/types` modules. Keep field names in sync with that
// file if the schema changes.

export type ReadingStatus = "to-read" | "reading" | "finished";
export type SessionMood =
  | "happy"
  | "thoughtful"
  | "moved"
  | "motivated"
  | "bored";

interface BookRow {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  status: ReadingStatus;
  progress: number | null;
  rating: number | null;
  notes: string | null;
  isbn: string | null;
  pages: number | null;
  publish_year: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface JoinRow {
  book_id: string;
  shelf_id?: string;
  category_id?: string;
}

interface SessionRow {
  id: string;
  date: string;
  minutes: number | null;
  mood: SessionMood | null;
  notes: string | null;
  quote: string | null;
  quote_page: number | null;
  created_at: string;
}

interface SessionProgressRow {
  session_id: string;
  book_id: string;
  new_progress: number;
}

export function rowsToBooks(
  rows: BookRow[],
  shelfJoins: JoinRow[],
  categoryJoins: JoinRow[],
) {
  const shelfMap = new Map<string, string[]>();
  for (const j of shelfJoins) {
    const arr = shelfMap.get(j.book_id) ?? [];
    if (j.shelf_id) arr.push(j.shelf_id);
    shelfMap.set(j.book_id, arr);
  }
  const catMap = new Map<string, string[]>();
  for (const j of categoryJoins) {
    const arr = catMap.get(j.book_id) ?? [];
    if (j.category_id) arr.push(j.category_id);
    catMap.set(j.book_id, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    coverUrl: r.cover_url ?? undefined,
    categoryIds: catMap.get(r.id) ?? [],
    shelfIds: shelfMap.get(r.id) ?? [],
    status: r.status,
    progress: r.progress ?? undefined,
    rating: r.rating ?? undefined,
    notes: r.notes ?? undefined,
    isbn: r.isbn ?? undefined,
    pages: r.pages ?? undefined,
    publishYear: r.publish_year ?? undefined,
    description: r.description ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/** Build an insertable books row from an API book payload. */
export function bookToRow(
  b: Record<string, unknown>,
  id: string,
  userId: string,
  now: string,
) {
  return {
    id,
    user_id: userId,
    title: String(b.title),
    author: String(b.author),
    cover_url: (b.coverUrl as string) ?? null,
    status: (b.status as string) ?? "to-read",
    progress: (b.progress as number | undefined) ?? null,
    rating: (b.rating as number | undefined) ?? null,
    notes: (b.notes as string) ?? null,
    isbn: (b.isbn as string) ?? null,
    pages: (b.pages as number | undefined) ?? null,
    publish_year: (b.publishYear as number | undefined) ?? null,
    description: (b.description as string) ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function rowsToSessions(
  rows: SessionRow[],
  progresses: SessionProgressRow[],
) {
  const map = new Map<string, { bookId: string; newProgress: number }[]>();
  for (const p of progresses) {
    const arr = map.get(p.session_id) ?? [];
    arr.push({ bookId: p.book_id, newProgress: p.new_progress });
    map.set(p.session_id, arr);
  }
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    bookProgresses: map.get(r.id) ?? [],
    minutes: r.minutes ?? undefined,
    mood: r.mood ?? undefined,
    notes: r.notes ?? undefined,
    quote: r.quote ?? undefined,
    quotePage: r.quote_page ?? undefined,
    createdAt: r.created_at,
  }));
}
