import { useMemo } from "react";
import { Check, Flame, History, Pencil, Plus } from "lucide-react";
import {
  currentWeek,
  detectFirstDayOfWeek,
  localDateString,
  shortWeekday,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

interface WeekStripProps {
  /** All session date strings (YYYY-MM-DD) — membership = "read that day". */
  sessionDates: Set<string>;
  /** Triggered by the log-reading button. */
  onLogReading: () => void;
  /** Opens the browse-all-sessions modal. */
  onBrowseSessions: () => void;
  /** Opens a read-only preview of the session logged on the given day. */
  onSelectDay: (dateKey: string) => void;
}

/**
 * Top-of-Home reading week — two cards side by side:
 *  - a warm streak card (flame + consecutive-day count)
 *  - a week card with a 7-day pill strip and a link to the full history.
 *
 * Day states: read (emerald check), missed (rose "!") — but only on days that
 * fall on/after the user's first ever session so brand-new users aren't
 * scolded for blank history — today (highlighted tile), and future / pre-first
 * (calm soft fill).
 */
export function WeekStrip({
  sessionDates,
  onLogReading,
  onBrowseSessions,
  onSelectDay,
}: WeekStripProps) {
  const { days, todayKey, streak, firstKey } = useMemo(() => {
    const fdow = detectFirstDayOfWeek();
    const now = new Date();
    const week = currentWeek(now, fdow);
    const sorted = [...sessionDates].sort();
    return {
      days: week,
      todayKey: localDateString(now),
      streak: calculateStreak(sessionDates, now),
      firstKey: sorted[0] ?? null,
    };
  }, [sessionDates]);

  const loggedToday = sessionDates.has(todayKey);

  return (
    <section className="flex flex-col sm:flex-row gap-3">
      <StreakCard streak={streak} />

      {/* Week card */}
      <div className="flex-1 rounded-2xl bg-card border border-border p-3 sm:p-4 flex flex-col gap-3">
        {/* Header: title + link to the full sessions history */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">This week</p>
          <button
            type="button"
            onClick={onBrowseSessions}
            aria-label="Check all reading sessions"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Check all sessions</span>
          </button>
        </div>

        {/* Day strip */}
        <ul className="flex items-end justify-between gap-1 sm:gap-1.5">
          {days.map((d) => {
            const key = localDateString(d);
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            const isFuture = key > todayKey;
            const hasRead = sessionDates.has(key);
            const isMissed =
              isPast && !hasRead && firstKey != null && key >= firstKey;
            return (
              <li
                key={key}
                className="flex-1 min-w-0 flex flex-col items-center gap-1.5"
              >
                {hasRead ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay(key)}
                    aria-label={`View reading session for ${shortWeekday(d)}`}
                    className="rounded-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <DayTile
                      isToday={isToday}
                      isFuture={isFuture}
                      hasRead={hasRead}
                      isMissed={isMissed}
                    />
                  </button>
                ) : (
                  <DayTile
                    isToday={isToday}
                    isFuture={isFuture}
                    hasRead={hasRead}
                    isMissed={isMissed}
                  />
                )}
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide",
                    isToday
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {shortWeekday(d)}
                </span>
                <span
                  className={cn(
                    "h-0.5 w-4 rounded-full",
                    isToday ? "bg-primary" : "bg-transparent",
                  )}
                  aria-hidden="true"
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Log / edit session button — sits outside the week card and stretches to
          its full height so the three top cards read as one row. Once today is
          logged it switches to editing that session (one session per day). */}
      <button
        type="button"
        onClick={onLogReading}
        aria-label={loggedToday ? "Edit today's reading session" : "Log a reading session"}
        className="group shrink-0 sm:w-32 flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 px-5 py-3.5 text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/25">
          {loggedToday ? (
            <Pencil className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          )}
        </span>
        <span className="text-sm font-semibold leading-tight text-center">
          {loggedToday ? "Edit today's session" : "Log session"}
        </span>
      </button>
    </section>
  );
}

// ── Streak card ───────────────────────────────────────────────────────────────

function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="relative shrink-0 sm:w-40 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 px-4 py-3.5 text-amber-950 flex flex-col justify-center min-h-[88px]">
      <p className="text-3xl font-bold leading-none tabular-nums">{streak}</p>
      <p className="text-xs font-semibold mt-1">
        Streak {streak === 1 ? "day" : "days"}
      </p>
      <Flame
        className="absolute -bottom-3 -right-2 h-20 w-20 text-orange-500/50 fill-orange-400/40"
        aria-hidden="true"
      />
    </div>
  );
}

// ── Day tile ──────────────────────────────────────────────────────────────────

function DayTile({
  isToday,
  isFuture,
  hasRead,
  isMissed,
}: {
  isToday: boolean;
  isFuture: boolean;
  hasRead: boolean;
  isMissed: boolean;
}) {
  const base =
    "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center";

  // Today — highlighted tile. Check if logged; otherwise just an empty
  // highlighted tile (no marker inside).
  if (isToday) {
    return (
      <div className={cn(base, "bg-primary/10 ring-2 ring-primary/40 text-primary")}>
        {hasRead && <Check className="h-4 w-4" strokeWidth={3} />}
      </div>
    );
  }

  // Past + read — emerald check
  if (hasRead) {
    return (
      <div className={cn(base, "bg-emerald-100 text-emerald-600")}>
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }

  // Past + missed (after first session) — rose "!"
  if (isMissed) {
    return (
      <div className={cn(base, "bg-rose-50 text-rose-500")}>
        <span className="text-sm font-bold leading-none">!</span>
      </div>
    );
  }

  // Future, or pre-first-session past — calm soft fill
  return (
    <div className={cn(base, isFuture ? "bg-foreground/[0.04]" : "bg-foreground/5")} />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Count consecutive read-days ending at today (or yesterday if today isn't
 * logged yet, so the chip doesn't flicker off before the user reads).
 */
function calculateStreak(sessionDates: Set<string>, today: Date): number {
  if (sessionDates.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!sessionDates.has(localDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (sessionDates.has(localDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
