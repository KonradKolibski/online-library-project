import { CalendarCheck, Construction } from "lucide-react";
import type { Book } from "@/types/book";
import { CoverImage } from "@/components/book/CoverImage";
import { SectionHeader } from "./SectionHeader";

interface WeeklyReadingGoalCardProps {
  /** A short list of books shown as context next to the goal visual. */
  books: Book[];
  onSelect: (book: Book) => void;
}

/**
 * Visual mockup of a weekly reading goal — left panel lists a few books
 * the user can read this week, right panel shows a friendly placeholder
 * dial. Real goal logic ships with the future Goals feature.
 */
export function WeeklyReadingGoalCard({
  books,
  onSelect,
}: WeeklyReadingGoalCardProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Weekly reading goal" meta="Preview" />
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {/* Reading list */}
          {books.length > 0 ? (
            <ul className="space-y-2.5">
              {books.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(b)}
                    className="w-full flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-xl text-left hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="w-10 h-14 shrink-0">
                      <CoverImage
                        title={b.title}
                        src={b.coverUrl}
                        rounded="rounded-md"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-1">
                        {b.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        By {b.author}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ListEmptyState />
          )}

          {/* Goal dial (mockup) */}
          <GoalDial />
        </div>
      </div>
    </section>
  );
}

/**
 * Friendly half-arc gauge built with CSS only — no chart library. The "filled"
 * portion is decorative for v1; real progress lights up once weekly goals ship.
 */
function GoalDial() {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-5 flex flex-col items-center justify-center text-center gap-2 min-h-[160px]">
      <p className="text-xs text-muted-foreground max-w-[22ch]">
        Read every day, see your progress, and finish more books.
      </p>
      <div
        className="relative h-14 w-28"
        role="img"
        aria-label="Weekly reading goal preview gauge"
      >
        {/* Background arc */}
        <div
          className="absolute inset-x-0 top-0 h-28 rounded-full border-[10px] border-muted/60"
          style={{ clipPath: "inset(0 0 50% 0)" }}
        />
        {/* "Filled" arc — purely decorative for this mockup */}
        <div
          className="absolute inset-x-0 top-0 h-28 rounded-full border-[10px] border-primary"
          style={{
            clipPath: "polygon(0 0, 55% 0, 55% 50%, 0 50%)",
          }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Construction className="h-3 w-3" />
        Goals — coming soon
      </div>
    </div>
  );
}

function ListEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 flex flex-col items-center text-center gap-2">
      <div className="rounded-xl bg-muted/60 p-2 text-muted-foreground">
        <CalendarCheck className="h-4 w-4" />
      </div>
      <p className="text-sm font-medium">Your reading queue is empty</p>
      <p className="text-xs text-muted-foreground">
        Add a book to your to-read pile to build your weekly plan.
      </p>
    </div>
  );
}
