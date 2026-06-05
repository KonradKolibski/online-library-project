/**
 * Local-time date utilities for the weekly reading strip.
 *
 * Sessions are keyed by a YYYY-MM-DD string in the user's *local* time —
 * intentionally not UTC. A session logged at 11pm should belong to that
 * calendar day, not the next one.
 */

/** Format a Date as YYYY-MM-DD in the user's local time. */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Detect the first day of the week from the user's browser locale.
 * 0 = Sunday … 6 = Saturday. Returns 1 (Monday) for locales the runtime can't
 * resolve.
 *
 * Falls back gracefully on older browsers without `Intl.Locale#getWeekInfo` /
 * `weekInfo`.
 */
export function detectFirstDayOfWeek(): number {
  if (typeof navigator === "undefined") return 1;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Loc: any = (Intl as any).Locale;
    if (!Loc) return 1;
    const loc = new Loc(navigator.language);
    // Chromium / Safari modern: getWeekInfo() — Firefox prefers .weekInfo
    const info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
    if (!info || typeof info.firstDay !== "number") return 1;
    // Intl uses 1=Mon … 7=Sun. JS Date.getDay() uses 0=Sun … 6=Sat.
    return info.firstDay === 7 ? 0 : info.firstDay;
  } catch {
    return 1;
  }
}

/** Returns a new Date set to local midnight of `d`. Doesn't mutate. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Returns an array of 7 Date objects representing the current week containing
 * `now`, starting on `firstDayOfWeek`. Each entry is local-midnight that day.
 */
export function currentWeek(now: Date, firstDayOfWeek: number): Date[] {
  const today = startOfDay(now);
  const dow = today.getDay();
  const diff = (dow - firstDayOfWeek + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - diff);
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

/** Localised short weekday label ("Mon", "Wt", etc.) for a given Date. */
export function shortWeekday(d: Date, locale?: string): string {
  return d.toLocaleDateString(locale, { weekday: "short" });
}
