import { localDateString } from "./dates";

/**
 * Count consecutive read-days ending at today (or yesterday if today isn't
 * logged yet, so the streak chip doesn't flicker off before the user reads).
 *
 * `frozenDates` are days protected by a streak freeze: they *bridge* a gap so
 * the run keeps counting across them, but a frozen day is not itself a read day
 * and so does not add to the count.
 */
export function calculateStreak(
  sessionDates: Set<string>,
  today: Date,
  frozenDates: Set<string> = new Set(),
): number {
  if (sessionDates.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!sessionDates.has(localDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const key = localDateString(cursor);
    if (sessionDates.has(key)) {
      streak++;
    } else if (frozenDates.has(key)) {
      // bridge — keep walking, don't increment
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Add `n` days to a YYYY-MM-DD key, returning a new YYYY-MM-DD key. */
function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return localDateString(dt);
}

/**
 * Longest run of consecutive read-days across the whole history, with frozen
 * days bridging gaps (the same way `calculateStreak` treats them). Only read
 * days contribute to the length.
 */
export function longestStreak(
  sessionDates: Set<string>,
  frozenDates: Set<string> = new Set(),
): number {
  const sorted = [...sessionDates].sort();
  if (sorted.length === 0) return 0;
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      // Are all calendar days strictly between prev and day frozen?
      let gapBridged = true;
      let cursor = addDays(prev, 1);
      while (cursor < day) {
        if (!frozenDates.has(cursor)) {
          gapBridged = false;
          break;
        }
        cursor = addDays(cursor, 1);
      }
      run = gapBridged ? run + 1 : 1;
    }
    if (run > best) best = run;
    prev = day;
  }
  return best;
}
