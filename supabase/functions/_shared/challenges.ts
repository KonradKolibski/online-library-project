// Reading-challenge evaluation. Challenges are authored in Strapi (headless CMS);
// this module fetches the active ones, then scores each against a user's reading
// sessions (read from Supabase with a service-role client). Progress is derived
// exactly like the app's XP engine (src/lib/xp.ts): pages read use a per-book
// high-water mark so only forward progress counts.
//
// Nothing here writes — the edge function decides what to grant. Kept pure so it
// is easy to reason about and test.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ChallengeGoalType =
  | "days_logged"
  | "books_finished"
  | "pages_read"
  | "minutes_read"
  | "distinct_genres";

export interface Challenge {
  id: string; // Strapi documentId
  title: string;
  description: string | null;
  coverUrl: string | null;
  goalType: ChallengeGoalType;
  target: number;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  xpReward: number;
  coinReward: number;
}

export interface ChallengeProgress extends Challenge {
  progress: number;
  /** Already recorded in challenge_completions (reward granted). */
  completed: boolean;
  /** Today falls within [startDate, endDate]. */
  active: boolean;
}

// ── Strapi fetch ──────────────────────────────────────────────────────────────

interface StrapiEntry {
  documentId?: string;
  id?: number | string;
  title?: string;
  description?: string | null;
  // Uploaded media relation (Supabase Storage). Populated via ?populate=cover.
  cover?: { url?: string | null } | null;
  goalType?: string;
  target?: number;
  startDate?: string | null;
  endDate?: string | null;
  xpReward?: number;
  coinReward?: number;
}

const GOAL_TYPES: ReadonlySet<string> = new Set([
  "days_logged",
  "books_finished",
  "pages_read",
  "minutes_read",
  "distinct_genres",
]);

/**
 * Fetch published challenges from Strapi's REST API. Strapi v5 flattens fields
 * onto the entry (no `.attributes`). Returns [] if Strapi is unreachable or
 * misconfigured so the app degrades gracefully rather than erroring.
 */
export async function fetchStrapiChallenges(
  strapiUrl: string,
  token: string | undefined,
): Promise<Challenge[]> {
  const base = strapiUrl.replace(/\/+$/, "");
  const url = `${base}/api/challenges?populate=cover&pagination[pageSize]=100&sort=createdAt:desc`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Strapi challenges fetch failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { data?: StrapiEntry[] };
  const rows = Array.isArray(body?.data) ? body.data : [];

  const out: Challenge[] = [];
  for (const r of rows) {
    const id = String(r.documentId ?? r.id ?? "");
    const goalType = r.goalType ?? "";
    if (!id || !r.title || !GOAL_TYPES.has(goalType)) continue;
    if (typeof r.target !== "number" || r.target <= 0) continue;
    out.push({
      id,
      title: r.title,
      description: r.description ?? null,
      coverUrl: r.cover?.url ?? null,
      goalType: goalType as ChallengeGoalType,
      target: r.target,
      startDate: r.startDate ?? null,
      endDate: r.endDate ?? null,
      xpReward: typeof r.xpReward === "number" ? r.xpReward : 0,
      coinReward: typeof r.coinReward === "number" ? r.coinReward : 0,
    });
  }
  return out;
}

// ── User reading data ─────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  date: string;
  minutes: number | null;
  created_at: string;
}
interface SessionProgressRow {
  session_id: string;
  book_id: string;
  new_progress: number;
}
interface BookRow {
  id: string;
  pages: number | null;
}
interface BookCategoryRow {
  book_id: string;
  category_id: string;
}

interface UserReadingData {
  sessions: SessionRow[];
  progresses: SessionProgressRow[];
  books: Map<string, BookRow>;
  bookCategories: Map<string, string[]>; // book_id -> category_ids
}

/** Load everything the goal types need, in parallel, scoped to one user. */
async function loadUserReadingData(
  admin: SupabaseClient,
  uid: string,
): Promise<UserReadingData> {
  const [sessionsRes, progressRes, booksRes, catsRes] = await Promise.all([
    admin
      .from("reading_sessions")
      .select("id, date, minutes, created_at")
      .eq("user_id", uid),
    admin
      .from("session_book_progresses")
      .select("session_id, book_id, new_progress")
      .eq("user_id", uid),
    admin.from("books").select("id, pages").eq("user_id", uid),
    admin.from("book_categories").select("book_id, category_id").eq("user_id", uid),
  ]);

  for (const r of [sessionsRes, progressRes, booksRes, catsRes]) {
    if (r.error) throw new Error(`load reading data failed: ${r.error.message}`);
  }

  const books = new Map<string, BookRow>();
  for (const b of (booksRes.data ?? []) as BookRow[]) books.set(b.id, b);

  const bookCategories = new Map<string, string[]>();
  for (const c of (catsRes.data ?? []) as BookCategoryRow[]) {
    const arr = bookCategories.get(c.book_id) ?? [];
    arr.push(c.category_id);
    bookCategories.set(c.book_id, arr);
  }

  return {
    sessions: (sessionsRes.data ?? []) as SessionRow[],
    progresses: (progressRes.data ?? []) as SessionProgressRow[],
    books,
    bookCategories,
  };
}

// ── Progress computation ──────────────────────────────────────────────────────

function inWindow(date: string, start: string | null, end: string | null): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function computeProgress(c: Challenge, data: UserReadingData): number {
  const { sessions, progresses } = data;

  // Sessions in date order (oldest→newest), with progress rows attached.
  const bySession = new Map<string, SessionProgressRow[]>();
  for (const p of progresses) {
    const arr = bySession.get(p.session_id) ?? [];
    arr.push(p);
    bySession.set(p.session_id, arr);
  }
  const ordered = [...sessions].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.created_at.localeCompare(b.created_at),
  );

  switch (c.goalType) {
    case "days_logged": {
      const days = new Set<string>();
      for (const s of ordered) if (inWindow(s.date, c.startDate, c.endDate)) days.add(s.date);
      return days.size;
    }

    case "minutes_read": {
      let total = 0;
      for (const s of ordered) {
        if (inWindow(s.date, c.startDate, c.endDate)) total += s.minutes ?? 0;
      }
      return total;
    }

    case "books_finished": {
      const finished = new Set<string>();
      for (const s of ordered) {
        if (!inWindow(s.date, c.startDate, c.endDate)) continue;
        for (const p of bySession.get(s.id) ?? []) {
          if (p.new_progress >= 100) finished.add(p.book_id);
        }
      }
      return finished.size;
    }

    case "distinct_genres": {
      const cats = new Set<string>();
      for (const s of ordered) {
        if (!inWindow(s.date, c.startDate, c.endDate)) continue;
        for (const p of bySession.get(s.id) ?? []) {
          for (const cat of data.bookCategories.get(p.book_id) ?? []) cats.add(cat);
        }
      }
      return cats.size;
    }

    case "pages_read": {
      // High-water mark per book (mirrors src/lib/xp.ts::deriveSessions) so only
      // forward progress counts; accumulate pages for in-window sessions only.
      const lastProgress = new Map<string, number>();
      let pages = 0;
      for (const s of ordered) {
        const within = inWindow(s.date, c.startDate, c.endDate);
        for (const p of bySession.get(s.id) ?? []) {
          const prev = lastProgress.get(p.book_id) ?? 0;
          const delta = p.new_progress - prev;
          if (delta > 0) {
            const book = data.books.get(p.book_id);
            if (within && book && typeof book.pages === "number" && book.pages > 0) {
              pages += Math.round((delta / 100) * book.pages);
            }
            lastProgress.set(p.book_id, p.new_progress);
          } else {
            lastProgress.set(p.book_id, Math.max(prev, p.new_progress));
          }
        }
      }
      return pages;
    }

    default:
      return 0;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EvaluationResult {
  challenges: ChallengeProgress[];
  newlyCompleted: ChallengeProgress[];
}

/**
 * Score every fetched challenge for a user and grant rewards for any newly
 * satisfied, still-active challenge (idempotent via the unique constraint on
 * challenge_completions). Returns the merged list for the UI.
 */
export async function evaluateChallenges(
  admin: SupabaseClient,
  uid: string,
  challenges: Challenge[],
  today: string,
): Promise<EvaluationResult> {
  const data = await loadUserReadingData(admin, uid);

  // Which challenges has this user already completed?
  const { data: doneRows, error: doneErr } = await admin
    .from("challenge_completions")
    .select("challenge_id")
    .eq("user_id", uid);
  if (doneErr) throw new Error(`load completions failed: ${doneErr.message}`);
  const alreadyDone = new Set<string>((doneRows ?? []).map((r) => r.challenge_id as string));

  const scored: ChallengeProgress[] = challenges.map((c) => {
    const active = inWindow(today, c.startDate, c.endDate);
    return {
      ...c,
      progress: computeProgress(c, data),
      completed: alreadyDone.has(c.id),
      active,
    };
  });

  // Grant newly-met, active, not-yet-recorded challenges.
  const toGrant = scored.filter(
    (c) => !c.completed && c.active && c.progress >= c.target,
  );
  const newlyCompleted: ChallengeProgress[] = [];
  if (toGrant.length) {
    const rows = toGrant.map((c) => ({
      user_id: uid,
      challenge_id: c.id,
      title: c.title,
      coin_reward: c.coinReward,
      xp_reward: c.xpReward,
    }));
    // Ignore-on-conflict keeps this safe under concurrent invocations.
    const { error: insErr } = await admin
      .from("challenge_completions")
      .upsert(rows, { onConflict: "user_id,challenge_id", ignoreDuplicates: true });
    if (insErr) throw new Error(`grant completions failed: ${insErr.message}`);
    for (const c of toGrant) {
      c.completed = true;
      newlyCompleted.push(c);
    }
  }

  return { challenges: scored, newlyCompleted };
}
