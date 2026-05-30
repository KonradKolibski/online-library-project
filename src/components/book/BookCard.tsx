import type { Book } from "@/types/book";
import { CoverImage } from "./CoverImage";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  onClick?: () => void;
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
      <CoverImage title={book.title} src={book.coverUrl} />
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{book.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
      </div>
      {showProgress && <ProgressBar value={book.progress!} showLabel />}
    </button>
  );
}
