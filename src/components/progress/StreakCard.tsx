import { Check, Flame, Snowflake } from "lucide-react";
import type { ReadingSession } from "@/types/book";
import { detectFirstDayOfWeek, localDateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  /** Current reading streak in days. */
  streak: number;
  sessions: ReadingSession[];
  /** Days protected by a streak freeze. */
  frozenDates: Set<string>;
}

type DayStatus = "logged" | "frozen" | "today" | "future" | "missed";

interface DayCell {
  key: string;
  letter: string;
  isToday: boolean;
  status: DayStatus;
}

/** Single-letter labels by JS day-of-week (0 = Sunday). */
const DOW_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** Build the current week (locale first-day) with each day's status. */
function buildWeek(sessionDates: Set<string>, frozenDates: Set<string>): DayCell[] {
  const firstDay = detectFirstDayOfWeek(); // 0 = Sun … 6 = Sat
  const today = new Date();
  const todayKey = localDateString(today);
  const diff = (today.getDay() - firstDay + 7) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diff);

  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = localDateString(d);
    const isToday = key === todayKey;
    let status: DayStatus;
    if (sessionDates.has(key)) status = "logged";
    else if (frozenDates.has(key)) status = "frozen";
    else if (isToday) status = "today";
    else if (key > todayKey) status = "future";
    else status = "missed";
    cells.push({ key, letter: DOW_LETTERS[d.getDay()], isToday, status });
  }
  return cells;
}

/**
 * Hero box: the fire capybara over a CSS radial-orange gradient, the current
 * streak count, and a 7-day tracker of the week (logged / freeze / today).
 */
export function StreakCard({ streak, sessions, frozenDates }: StreakCardProps) {
  const sessionDates = new Set(sessions.map((s) => s.date));
  const week = buildWeek(sessionDates, frozenDates);

  return (
    <div className="flex min-h-[160px] items-center gap-2 overflow-hidden rounded-3xl px-3 shadow-sm bg-[radial-gradient(circle_at_50%_42%,#fdc946_0%,#f7ab1e_58%,#f1990f_100%)]">
      <img
        src="/illustrations/capy-streak-flames.png"
        alt=""
        aria-hidden
        className="h-32 w-28 shrink-0 object-contain"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-3">
        <div className="flex items-end gap-1.5">
          <Flame className="h-6 w-6 shrink-0 fill-orange-500 text-orange-600" />
          <span className="font-display text-4xl font-bold leading-none tabular-nums text-amber-950">
            {streak.toLocaleString()}
          </span>
          <span className="pb-0.5 text-xs font-semibold lowercase tracking-wide text-amber-900/90">
            streak days
          </span>
        </div>

        <div className="flex gap-1 rounded-xl bg-black/25 p-2">
          {week.map((c) => (
            <div key={c.key} className="flex w-6 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-[11px] font-medium leading-none",
                  c.isToday ? "font-bold text-amber-300" : "text-white/70",
                )}
              >
                {c.letter}
              </span>
              <DayCircle status={c.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayCircle({ status }: { status: DayStatus }) {
  switch (status) {
    case "logged":
      return (
        <span className="flex size-6 items-center justify-center rounded-full bg-amber-400">
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </span>
      );
    case "frozen":
      return (
        <span className="flex size-6 items-center justify-center rounded-full bg-sky-300">
          <Snowflake className="h-3.5 w-3.5 text-sky-700" strokeWidth={2.5} />
        </span>
      );
    case "today":
      return <span className="size-6 rounded-full border-2 border-amber-200/90" />;
    case "future":
      return <span className="size-6 rounded-full bg-white/10" />;
    default: // missed
      return <span className="size-6 rounded-full bg-white/15" />;
  }
}
