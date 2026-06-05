import { useMemo } from "react";
import { Check, Flame, Plus } from "lucide-react";
import {
  currentWeek,
  detectFirstDayOfWeek,
  localDateString,
  shortWeekday,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

interface WeekStripProps {
  /** All session date strings (YYYY-MM-DD) — we just check membership. */
  sessionDates: Set<string>;
  /** Triggered by the "+" button. */
  onLogReading: () => void;
}

/**
 * Compact 7-day reading strip + log-reading button — all on one row, no card
 * wrapper. A small flame-streak chip floats above the row when the user has
 * read at least one day in a row.
 *
 * Past days with a session show a soft emerald check. Today is a peach pill
 * with the day name (or a check if today is already logged). Future days are
 * dashed outlines, decorative. No interaction on past/future cells.
 */
export function WeekStrip({ sessionDates, onLogReading }: WeekStripProps) {
  const { days, todayKey, streak } = useMemo(() => {
    const fdow = detectFirstDayOfWeek();
    const now = new Date();
    const week = currentWeek(now, fdow);
    const todayK = localDateString(now);
    return {
      days: week,
      todayKey: todayK,
      streak: calculateStreak(sessionDates, now),
    };
  }, [sessionDates]);

  return (
    <section className="space-y-1.5">
      {/* Streak chip — only when there's actually a streak to celebrate */}
      <div className="flex items-center justify-end h-6">
        {streak > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-1 text-xs font-medium text-amber-700"
            aria-label={`${streak}-day reading streak`}
          >
            <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            {streak}-day streak
          </span>
        )}
      </div>

      {/* Days (glass) + labelled CTA — one row */}
      <div className="flex items-stretch gap-2 sm:gap-3">
        {/* Supple glass container hugging just the day cells */}
        <ul
          className={cn(
            "flex-1 flex items-end gap-1 sm:gap-1.5 min-w-0",
            "rounded-2xl px-3 py-2.5 sm:px-4",
            "bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 shadow-sm",
          )}
          aria-label="This week's reading"
        >
          {days.map((d) => {
            const key = localDateString(d);
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            const isFuture = key > todayKey;
            const hasRead = sessionDates.has(key);
            return (
              <li
                key={key}
                className="flex-1 min-w-0 flex flex-col items-center gap-1"
              >
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
                <Cell
                  isToday={isToday}
                  isPast={isPast}
                  isFuture={isFuture}
                  hasRead={hasRead}
                />
              </li>
            );
          })}
        </ul>

        {/* Labelled CTA, alongside the glass strip */}
        <button
          type="button"
          onClick={onLogReading}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl bg-primary text-primary-foreground px-3.5 text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Log reading</span>
          <span className="sm:hidden">Log</span>
        </button>
      </div>
    </section>
  );
}

function Cell({
  isToday,
  isPast,
  isFuture,
  hasRead,
}: {
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  hasRead: boolean;
}) {
  // Today — peach pill. Check if already logged, otherwise leave empty.
  if (isToday) {
    return (
      <div className="h-9 w-9 rounded-full bg-gradient-to-b from-amber-200 to-rose-300 text-rose-900 flex items-center justify-center">
        {hasRead && <Check className="h-4 w-4" strokeWidth={3} />}
      </div>
    );
  }
  // Past + read — soft emerald check
  if (isPast && hasRead) {
    return (
      <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }
  // Past + unread — soft filled pill (no outline)
  if (isPast) {
    return <div className="h-9 w-9 rounded-full bg-foreground/5" />;
  }
  // Future — even fainter fill so the row stays calm
  if (isFuture) {
    return <div className="h-9 w-9 rounded-full bg-foreground/[0.03]" />;
  }
  return null;
}

/**
 * Count consecutive days ending at (or one before) today. If today hasn't been
 * logged yet, the streak still counts from yesterday — that way the chip
 * doesn't pop in and out at midnight when the user hasn't read yet.
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
