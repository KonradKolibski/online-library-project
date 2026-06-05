import type {
  Book,
  Category,
  LibraryState,
  ReadingSession,
  ReadingStatus,
  SessionMood,
  Shelf,
} from "@/types/book";

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

interface ShelfRow {
  id: string;
  name: string;
  color: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
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

export function rowToShelf(r: ShelfRow): Shelf {
  return { id: r.id, name: r.name, color: r.color ?? undefined };
}

export function rowToCategory(r: CategoryRow): Category {
  return { id: r.id, name: r.name };
}

export function rowsToBooks(
  rows: BookRow[],
  shelfJoins: JoinRow[],
  categoryJoins: JoinRow[],
): Book[] {
  const shelfMap = new Map<string, string[]>();
  for (const j of shelfJoins) {
    const arr = shelfMap.get(j.book_id) ?? [];
    arr.push(j.shelf_id!);
    shelfMap.set(j.book_id, arr);
  }
  const catMap = new Map<string, string[]>();
  for (const j of categoryJoins) {
    const arr = catMap.get(j.book_id) ?? [];
    arr.push(j.category_id!);
    catMap.set(j.book_id, arr);
  }

  return rows.map<Book>((r) => ({
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

export function bookToRow(b: Book, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    title: b.title,
    author: b.author,
    cover_url: b.coverUrl ?? null,
    status: b.status,
    progress: b.progress ?? null,
    rating: b.rating ?? null,
    notes: b.notes ?? null,
    isbn: b.isbn ?? null,
    pages: b.pages ?? null,
    publish_year: b.publishYear ?? null,
    description: b.description ?? null,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

export function bookPatchToRow(patch: Partial<Book>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.author !== undefined) out.author = patch.author;
  if ("coverUrl" in patch) out.cover_url = patch.coverUrl ?? null;
  if (patch.status !== undefined) out.status = patch.status;
  if ("progress" in patch) out.progress = patch.progress ?? null;
  if ("rating" in patch) out.rating = patch.rating ?? null;
  if ("notes" in patch) out.notes = patch.notes ?? null;
  if ("isbn" in patch) out.isbn = patch.isbn ?? null;
  if ("pages" in patch) out.pages = patch.pages ?? null;
  if ("publishYear" in patch) out.publish_year = patch.publishYear ?? null;
  if ("description" in patch) out.description = patch.description ?? null;
  if (patch.updatedAt !== undefined) out.updated_at = patch.updatedAt;
  return out;
}

export function rowsToSessions(
  rows: SessionRow[],
  progresses: SessionProgressRow[],
): ReadingSession[] {
  const map = new Map<string, { bookId: string; newProgress: number }[]>();
  for (const p of progresses) {
    const arr = map.get(p.session_id) ?? [];
    arr.push({ bookId: p.book_id, newProgress: p.new_progress });
    map.set(p.session_id, arr);
  }
  return rows.map<ReadingSession>((r) => ({
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

export function sessionToRow(s: ReadingSession, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    date: s.date,
    minutes: s.minutes ?? null,
    mood: s.mood ?? null,
    notes: s.notes ?? null,
    quote: s.quote ?? null,
    quote_page: s.quotePage ?? null,
    created_at: s.createdAt,
  };
}

export const emptyLibraryState: LibraryState = {
  schemaVersion: 5,
  books: [],
  categories: [],
  shelves: [],
  sessions: [],
};
