import { useMemo } from "react";
import type { Book, ReadingSession } from "@/types/book";
import { useLibrary } from "@/store/library";
import { useSettings } from "@/store/settings";
import { useChallenges } from "@/store/challenges";
import { localDateString } from "./dates";
import { calculateStreak, longestStreak } from "./streak";
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  type AchievementTrack,
  type ReadingStats,
} from "./achievements";

/**
 * All XP / economy constants in one place so they're easy to tune. XP is a
 * permanent score (only ever goes up); coins are a spendable currency derived
 * from levels + achievements and depleted via the shop.
 */
export const XP_CONFIG = {
  sessionBase: 10,
  xpPerPage: 1,
  pagesFallbackPerBook: 15,
  minutesDivisor: 2,
  minutesXpCap: 60,
  completenessBonus: 15,
  dailySessionCap: 300,
  bookFinishPerPage: 0.5,
  bookFinishCap: 300,
  bookFinishFallback: 200,
  milestoneXp: 20, // per first 25/50/75% crossing
  streakDailyXp: 5,
  streakDayCap: 20,
  coinsPerLevel: 10,
} as const;

/** Coin prices for shop consumables. */
export const SHOP_PRICES = { freeze: 50, repair: 150 } as const;

const MILESTONES = [25, 50, 75] as const;

export interface Progression {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  coinsEarned: number;
  coinsSpent: number;
  coinsPurchased: number;
  coinsFromChallenges: number;
  coinBalance: number;
  stats: ReadingStats;
  earnedAchievements: Set<string>;
}

// ── Level curve ──────────────────────────────────────────────────────────────
// Triangular curve: XP required to *reach* level L is 100 · (L-1)·L / 2.
// → level 1: 0, level 2: 100, level 3: 300, level 4: 600, level 5: 1000 …

export function totalXpForLevel(level: number): number {
  const l = Math.max(1, level);
  return (100 * (l - 1) * l) / 2;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level++;
  return level;
}

// ── Pages-read reconstruction + per-session XP ────────────────────────────────

interface SessionDerived {
  totalPagesRead: number;
  sessionXpTotal: number;
}

/**
 * Walks sessions oldest→newest, tracking each book's high-water progress mark
 * to reconstruct pages read per session (only forward progress counts), and
 * sums the per-session XP (base + pages + minutes + completeness, daily-capped).
 */
function deriveSessions(books: Book[], sessions: ReadingSession[]): SessionDerived {
  const bookById = new Map(books.map((b) => [b.id, b]));
  const lastProgress = new Map<string, number>();

  const ordered = [...sessions].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.createdAt.localeCompare(b.createdAt),
  );

  let totalPagesRead = 0;
  let sessionXpTotal = 0;

  for (const s of ordered) {
    let pages = 0;
    let flatFallback = 0;
    for (const bp of s.bookProgresses) {
      const book = bookById.get(bp.bookId);
      if (!book) continue;
      const prev = lastProgress.get(bp.bookId) ?? 0;
      const delta = bp.newProgress - prev;
      if (delta > 0) {
        if (typeof book.pages === "number" && book.pages > 0) {
          pages += Math.round((delta / 100) * book.pages);
        } else {
          flatFallback += XP_CONFIG.pagesFallbackPerBook;
        }
        lastProgress.set(bp.bookId, bp.newProgress);
      } else {
        // keep the high-water mark; never lower it on a drag-back
        lastProgress.set(bp.bookId, Math.max(prev, bp.newProgress));
      }
    }

    const minutesXp = Math.min(
      XP_CONFIG.minutesXpCap,
      Math.floor((s.minutes ?? 0) / XP_CONFIG.minutesDivisor),
    );
    const completeness =
      s.mood && s.notes?.trim() && s.quote?.trim() ? XP_CONFIG.completenessBonus : 0;

    const raw =
      XP_CONFIG.sessionBase +
      pages * XP_CONFIG.xpPerPage +
      flatFallback +
      minutesXp +
      completeness;

    totalPagesRead += pages;
    sessionXpTotal += Math.min(XP_CONFIG.dailySessionCap, raw);
  }

  return { totalPagesRead, sessionXpTotal };
}

// ── Reading stats ──────────────────────────────────────────────────────────────

export function computeReadingStats(
  books: Book[],
  sessions: ReadingSession[],
  frozenDates: Set<string>,
): ReadingStats {
  const readSet = new Set(sessions.map((s) => s.date));
  const { totalPagesRead } = deriveSessions(books, sessions);

  // Perfect months: a calendar month where every day appears in readSet.
  const byMonth = new Map<string, Set<number>>();
  for (const key of readSet) {
    const [y, m, d] = key.split("-").map(Number);
    const mk = `${y}-${m}`;
    const set = byMonth.get(mk) ?? new Set<number>();
    set.add(d);
    byMonth.set(mk, set);
  }
  let perfectMonths = 0;
  for (const [mk, daySet] of byMonth) {
    const [y, m] = mk.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    if (daySet.size === daysInMonth) perfectMonths++;
  }

  // moodRounds: how many times *every* one of the 5 moods has been logged —
  // the minimum count across all mood types (0 until all five appear).
  const moodCounts = new Map<string, number>();
  for (const s of sessions) {
    if (s.mood) moodCounts.set(s.mood, (moodCounts.get(s.mood) ?? 0) + 1);
  }
  const MOOD_TYPES = 5;
  const moodRounds = moodCounts.size >= MOOD_TYPES ? Math.min(...moodCounts.values()) : 0;

  return {
    currentStreak: calculateStreak(readSet, new Date(), frozenDates),
    longestStreak: longestStreak(readSet, frozenDates),
    booksFinished: books.filter((b) => b.status === "finished").length,
    totalPagesRead,
    daysLogged: readSet.size,
    moodRounds,
    quotesLogged: sessions.filter((s) => s.quote?.trim()).length,
    perfectMonths,
  };
}

// ── Full progression ─────────────────────────────────────────────────────────

export function computeProgression(
  books: Book[],
  sessions: ReadingSession[],
  frozenDates: Set<string>,
  coinsSpent: number,
  coinsPurchased = 0,
  coinsFromChallenges = 0,
  xpFromChallenges = 0,
): Progression {
  const stats = computeReadingStats(books, sessions, frozenDates);
  const { sessionXpTotal } = deriveSessions(books, sessions);

  // Book-finish + milestone XP (derived from each book's current progress).
  let bookXp = 0;
  for (const b of books) {
    const progress = b.status === "finished" ? 100 : b.progress ?? 0;
    for (const m of MILESTONES) if (progress >= m) bookXp += XP_CONFIG.milestoneXp;
    if (b.status === "finished") {
      bookXp +=
        typeof b.pages === "number" && b.pages > 0
          ? Math.min(XP_CONFIG.bookFinishCap, Math.round(b.pages * XP_CONFIG.bookFinishPerPage))
          : XP_CONFIG.bookFinishFallback;
    }
  }

  // Streak XP: reward each read-day by its running run length (frozen bridges).
  const streakXp = computeStreakXp(new Set(sessions.map((s) => s.date)), frozenDates);

  // Achievement bonus XP + coins.
  const earnedAchievements = evaluateAchievements(stats);
  let achievementXp = 0;
  let achievementCoins = 0;
  for (const a of ACHIEVEMENTS) {
    if (earnedAchievements.has(a.id)) {
      achievementXp += a.xpReward;
      achievementCoins += a.coinReward;
    }
  }

  const totalXp = sessionXpTotal + bookXp + streakXp + achievementXp + xpFromChallenges;
  const level = levelForXp(totalXp);
  const base = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);

  const coinsEarned = XP_CONFIG.coinsPerLevel * (level - 1) + achievementCoins;

  return {
    totalXp,
    level,
    xpIntoLevel: totalXp - base,
    xpForNextLevel: next - base,
    coinsEarned,
    coinsSpent,
    coinsPurchased,
    coinsFromChallenges,
    coinBalance: Math.max(
      0,
      coinsEarned + coinsPurchased + coinsFromChallenges - coinsSpent,
    ),
    stats,
    earnedAchievements,
  };
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return localDateString(new Date(y, m - 1, d + n));
}

// ── Unlock-date reconstruction ────────────────────────────────────────────────
// Achievements aren't timestamped, so the "unlocked on" date is reconstructed
// from reading history: the local date on which a track's FIRST level threshold
// was first satisfied. Returns a YYYY-MM-DD string, or null if not yet unlocked.

export function reconstructUnlockDate(
  track: AchievementTrack,
  books: Book[],
  sessions: ReadingSession[],
  frozenDates: Set<string>,
): string | null {
  const threshold = track.levels[0]?.threshold ?? Infinity;

  switch (track.id) {
    case "streak":
      return streakReachDate(new Set(sessions.map((s) => s.date)), frozenDates, threshold);

    case "books": {
      const finished = books
        .filter((b) => b.status === "finished")
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const book = finished[threshold - 1];
      return book ? localDateString(new Date(book.updatedAt)) : null;
    }

    case "pages":
      return pagesCrossDate(books, sessions, threshold);

    case "quotes": {
      const quoted = sessions
        .filter((s) => s.quote?.trim())
        .sort((a, b) => a.date.localeCompare(b.date));
      return quoted[threshold - 1]?.date ?? null;
    }

    case "moods": {
      // Date the min count across all 5 moods first reaches `threshold`.
      const counts = new Map<string, number>();
      const MOOD_TYPES = 5;
      for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
        if (!s.mood) continue;
        counts.set(s.mood, (counts.get(s.mood) ?? 0) + 1);
        if (counts.size >= MOOD_TYPES && Math.min(...counts.values()) >= threshold) return s.date;
      }
      return null;
    }

    case "perfect":
      return firstPerfectMonthDate(new Set(sessions.map((s) => s.date)));

    default:
      return null;
  }
}

/** Date the longest run first reaches `threshold` consecutive read-days. */
function streakReachDate(
  readSet: Set<string>,
  frozenDates: Set<string>,
  threshold: number,
): string | null {
  const days = [...readSet].sort();
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    if (prev === null) {
      run = 1;
    } else {
      let bridged = true;
      let cursor = addDays(prev, 1);
      while (cursor < day) {
        if (!frozenDates.has(cursor)) {
          bridged = false;
          break;
        }
        cursor = addDays(cursor, 1);
      }
      run = bridged ? run + 1 : 1;
    }
    if (run >= threshold) return day;
    prev = day;
  }
  return null;
}

/** Date cumulative pages read first cross `threshold` (same high-water logic). */
function pagesCrossDate(
  books: Book[],
  sessions: ReadingSession[],
  threshold: number,
): string | null {
  const bookById = new Map(books.map((b) => [b.id, b]));
  const lastProgress = new Map<string, number>();
  const ordered = [...sessions].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.createdAt.localeCompare(b.createdAt),
  );
  let cumulative = 0;
  for (const s of ordered) {
    for (const bp of s.bookProgresses) {
      const book = bookById.get(bp.bookId);
      if (!book) continue;
      const prev = lastProgress.get(bp.bookId) ?? 0;
      const delta = bp.newProgress - prev;
      if (delta > 0) {
        cumulative +=
          typeof book.pages === "number" && book.pages > 0
            ? Math.round((delta / 100) * book.pages)
            : XP_CONFIG.pagesFallbackPerBook;
        lastProgress.set(bp.bookId, bp.newProgress);
      } else {
        lastProgress.set(bp.bookId, Math.max(prev, bp.newProgress));
      }
    }
    if (cumulative >= threshold) return s.date;
  }
  return null;
}

/** Last day of the earliest calendar month with every day logged. */
function firstPerfectMonthDate(readSet: Set<string>): string | null {
  const byMonth = new Map<string, Set<number>>();
  for (const key of readSet) {
    const [y, m, d] = key.split("-").map(Number);
    const mk = `${y}-${String(m).padStart(2, "0")}`;
    const set = byMonth.get(mk) ?? new Set<number>();
    set.add(d);
    byMonth.set(mk, set);
  }
  const perfect = [...byMonth.entries()]
    .filter(([mk, daySet]) => {
      const [y, m] = mk.split("-").map(Number);
      return daySet.size === new Date(y, m, 0).getDate();
    })
    .map(([mk]) => mk)
    .sort();
  if (perfect.length === 0) return null;
  const [y, m] = perfect[0].split("-").map(Number);
  return localDateString(new Date(y, m - 1, new Date(y, m, 0).getDate()));
}

/** Sum of streakDailyXp · min(run, cap) over every read-day (frozen bridges gaps). */
function computeStreakXp(readSet: Set<string>, frozenDates: Set<string>): number {
  const sorted = [...readSet].sort();
  let total = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      let bridged = true;
      let cursor = addDays(prev, 1);
      while (cursor < day) {
        if (!frozenDates.has(cursor)) {
          bridged = false;
          break;
        }
        cursor = addDays(cursor, 1);
      }
      run = bridged ? run + 1 : 1;
    }
    total += XP_CONFIG.streakDailyXp * Math.min(run, XP_CONFIG.streakDayCap);
    prev = day;
  }
  return total;
}

// ── React hook ────────────────────────────────────────────────────────────────

/** Memoized progression for the signed-in user, derived from library + settings. */
export function useProgression(): Progression {
  const { state } = useLibrary();
  const { settings } = useSettings();
  const { coinsFromChallenges, xpFromChallenges } = useChallenges();
  const progression = settings.progression;

  return useMemo(
    () =>
      computeProgression(
        state.books,
        state.sessions,
        new Set(progression?.frozenDates ?? []),
        progression?.coinsSpent ?? 0,
        progression?.coinsPurchased ?? 0,
        coinsFromChallenges,
        xpFromChallenges,
      ),
    [
      state.books,
      state.sessions,
      progression?.frozenDates,
      progression?.coinsSpent,
      progression?.coinsPurchased,
      coinsFromChallenges,
      xpFromChallenges,
    ],
  );
}
