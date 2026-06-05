import type { Book } from "@/types/book";
import { CoverImage } from "@/components/book/CoverImage";
import { ProgressBar } from "@/components/book/ProgressBar";
import { cn } from "@/lib/utils";

interface BookMiniCardProps {
  book: Book;
  onClick: () => void;
  /** When true, render a slim progress bar under the title. */
  showProgress?: boolean;
}

/**
 * Narrow tappable book card used in the dashboard's horizontal rows. Smaller
 * than `BookCard` (which targets the library grid) — fixed 7rem wide so a row
 * of them feels like a curated shelf.
 *
 * When `showProgress` is on, the bar reads `X / Y pages` if the book has both
 * a `pages` count and a numeric `progress`. Otherwise it falls back to the
 * standard percentage label.
 */
export function BookMiniCard({ book, onClick, showProgress }: BookMiniCardProps) {
  const progress = typeof book.progress === "number" ? book.progress : 0;
  const pagesRead =
    book.pages !== undefined ? Math.round((progress / 100) * book.pages) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group shrink-0 w-28 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl",
      )}
    >
      <CoverImage
        title={book.title}
        src={book.coverUrl}
        rounded="rounded-xl"
        className="shadow-sm group-hover:shadow-md transition-shadow"
      />
      <p className="mt-2 text-sm font-medium leading-tight line-clamp-2">
        {book.title}
      </p>
      <p className="text-xs text-muted-foreground line-clamp-1">
        {book.author}
      </p>
      {showProgress && (
        <div className="mt-1.5 space-y-0.5">
          <ProgressBar value={progress} />
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {pagesRead !== null && book.pages
              ? `${pagesRead} / ${book.pages}`
              : `${progress}%`}
          </p>
        </div>
      )}
    </button>
  );
}
