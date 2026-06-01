import { Check } from "lucide-react";
import type { Book } from "@/types/book";
import { CoverImage } from "./CoverImage";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  onClick?: () => void;
}

/**
 * Small status pill rendered on top of the cover. The three states share the
 * same shape and size; only background / icon / label differ so the row reads
 * consistently when the grid mixes statuses.
 */
function StatusBadge({ book }: { book: Book }) {
  const baseClasses =
    "absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none shadow-sm backdrop-blur-sm";

  if (book.status === "to-read") {
    return (
      <span
        className={cn(
          baseClasses,
          "bg-background/85 text-foreground border border-border",
        )}
      >
        To read
      </span>
    );
  }

  if (book.status === "reading") {
    const pct = typeof book.progress === "number" ? book.progress : 0;
    return (
      <span
        className={cn(baseClasses, "bg-primary text-primary-foreground")}
        aria-label={`Reading, ${pct}% complete`}
      >
        <span className="tabular-nums">{pct}%</span>
      </span>
    );
  }

  // finished
  return (
    <span
      className={cn(baseClasses, "bg-emerald-500 text-white")}
      aria-label="Finished"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
      Finished
    </span>
  );
}

export function BookCard({ book, onClick }: BookCardProps) {
  const showProgress = book.status === "reading" && typeof book.progress === "number";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left bg-card rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "flex flex-col gap-3",
      )}
    >
      <div className="relative">
        <CoverImage title={book.title} src={book.coverUrl} />
        <StatusBadge book={book} />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{book.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
      </div>
      {showProgress && <ProgressBar value={book.progress!} showLabel />}
    </button>
  );
}
