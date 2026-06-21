import type { Book } from "@/types/book";

const STORAGE_KEY = "capy-books:weekly-pick";

/**
 * Year + ISO week number (e.g. "2026-W25"), stable for the whole week so the
 * featured pick only changes when the week rolls over.
 */
export function currentWeekKey(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  // Shift to the Thursday of this week — ISO weeks are defined by their Thursday.
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / 86_400_000 / 7,
    );
  return `${d.getUTCFullYear()}-W${week}`;
}

interface StoredPick {
  weekKey: string;
  bookId: string;
}

function readStored(): StoredPick | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPick) : null;
  } catch {
    return null;
  }
}

function writeStored(pick: StoredPick): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pick));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * This week's featured book — a random pick from the to-read pile that stays
 * the same for the whole week. The choice is persisted, so it survives refreshes
 * and re-renders. It only rerolls when the week changes or when the stored pick
 * is no longer in the to-read pile (finished, removed, or status changed).
 */
export function pickWeeklyFeatured(toRead: Book[]): Book | null {
  if (toRead.length === 0) return null;

  const weekKey = currentWeekKey();
  const stored = readStored();
  if (stored?.weekKey === weekKey) {
    const existing = toRead.find((b) => b.id === stored.bookId);
    if (existing) return existing;
  }

  const pick = toRead[Math.floor(Math.random() * toRead.length)];
  writeStored({ weekKey, bookId: pick.id });
  return pick;
}
