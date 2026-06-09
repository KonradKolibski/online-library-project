import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, Clock, Flame, Plus } from "lucide-react";
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
  /** Total books finished, all-time. */
  totalBooksRead: number;
  /** Total minutes logged across all sessions. */
  totalMinutes: number;
  /** Triggered by the log-reading button. */
  onLogReading: () => void;
}

/**
 * Top-of-Home reading week — two cards side by side:
 *  - a warm streak card (flame + consecutive-day count)
 *  - a week card with all-time stats, a 7-day pill strip, and a log button.
 *
 * Day states: read (emerald check), missed (rose "!") — but only on days that
 * fall on/after the user's first ever session so brand-new users aren't
 * scolded for blank history — today (highlighted tile), and future / pre-first
 * (calm soft fill).
 */
export function WeekStrip({
  sessionDates,
  totalBooksRead,
  totalMinutes,
  onLogReading,
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

  return (
    <section className="flex flex-col sm:flex-row gap-3">
      <StreakCard streak={streak} />

      {/* Week card */}
      <div className="flex-1 rounded-2xl bg-card border border-border p-3 sm:p-4 flex flex-col gap-3">
        {/* Header: title + all-time stats */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">This week</p>
          <div className="flex items-center gap-3">
            <StatWithTooltip
              icon={BookOpen}
              value={String(totalBooksRead)}
              tip="Books you've finished, all-time."
            />
            <StatWithTooltip
              icon={Clock}
              value={formatMinutes(totalMinutes)}
              tip="Total time you've logged across all reading sessions."
            />
          </div>
        </div>

        {/* Day strip + big log button, same row */}
        <div className="flex items-stretch gap-2 sm:gap-3">
          <ul className="flex-1 flex items-end justify-between gap-1 sm:gap-1.5">
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
                  <DayTile
                    isToday={isToday}
                    isFuture={isFuture}
                    hasRead={hasRead}
                    isMissed={isMissed}
                  />
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

          {/* Big log-reading button, aligned to the day column height */}
          <button
            type="button"
            onClick={onLogReading}
            className="shrink-0 flex flex-col items-center justify-center gap-1 px-4 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[11px] font-medium leading-none">Log</span>
          </button>
        </div>
      </div>
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

// ── Header stat with hover tooltip ────────────────────────────────────────────

function StatWithTooltip({
  icon: Icon,
  value,
  tip,
}: {
  icon: React.ElementType;
  value: string;
  tip: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
  }
  function close() {
    setPos(null);
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        tabIndex={0}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground cursor-help rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="tabular-nums text-foreground">{value}</span>
      </span>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            className="fixed z-[60] max-w-[14rem] rounded-lg bg-foreground text-background text-xs leading-relaxed px-3 py-2 shadow-lg pointer-events-none text-center"
          >
            {tip}
          </div>,
          document.body,
        )}
    </>
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

function formatMinutes(total: number): string {
  if (total <= 0) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

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
