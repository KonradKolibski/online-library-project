import { BookOpen, Calendar, Clock, Library } from "lucide-react";

interface StatsHighlightsProps {
  /** Books finished this calendar year. */
  booksThisYear: number;
  /** Sum of `book.pages` for books finished this year. 0 when none have pages set. */
  pagesThisYear: number;
  /** Total books in the library, regardless of status. */
  totalBooks: number;
  /** Total minutes logged across all reading sessions, all-time. */
  totalMinutes: number;
}

interface Tile {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "primary" | "amber" | "emerald" | "rose";
}

const TONE_CLASS: Record<Tile["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  rose: "bg-rose-500/10 text-rose-600",
};

/**
 * Four fixed KPI tiles. Always rendered; unset values show as `0` rather than
 * hiding the tile so the row's rhythm stays consistent.
 */
export function StatsHighlights({
  booksThisYear,
  pagesThisYear,
  totalBooks,
  totalMinutes,
}: StatsHighlightsProps) {
  const tiles: Tile[] = [
    {
      icon: Calendar,
      label: "Books this year",
      value: String(booksThisYear),
      tone: "primary",
    },
    {
      icon: BookOpen,
      label: "Pages this year",
      value: pagesThisYear.toLocaleString(),
      tone: "amber",
    },
    {
      icon: Clock,
      label: "Time read",
      value: formatMinutes(totalMinutes),
      tone: "rose",
    },
    {
      icon: Library,
      label: "Books in library",
      value: String(totalBooks),
      tone: "emerald",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {tiles.map(({ icon: Icon, label, value, tone }) => (
        <div
          key={label}
          className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3"
        >
          <div className={`rounded-xl p-2.5 ${TONE_CLASS[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-semibold tabular-nums leading-none">
              {value}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMinutes(total: number): string {
  if (total <= 0) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
