import { Sparkles } from "lucide-react";
import type { Book } from "@/types/book";
import { CoverImage } from "@/components/book/CoverImage";
import { SectionHeader } from "./SectionHeader";

interface WeeklyFeaturedBookProps {
  book: Book | null;
  onSelect: (book: Book) => void;
}

/**
 * Single prominent "featured" book pulled at random from the user's to-read
 * pile. Acts as a gentle nudge — *here's something waiting for you*.
 */
export function WeeklyFeaturedBook({ book, onSelect }: WeeklyFeaturedBookProps) {
  return (
    <section className="flex h-full flex-col gap-3">
      <SectionHeader title="This week's pick" />
      {book ? (
        <button
          type="button"
          onClick={() => onSelect(book)}
          className="group w-full flex-1 rounded-2xl bg-gradient-to-br from-pink-100/60 via-rose-50 to-amber-100/40 p-4 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-32 drop-shadow-md">
            <CoverImage title={book.title} src={book.coverUrl} rounded="rounded-xl" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold leading-tight line-clamp-2">{book.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
          </div>
        </button>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex-1 rounded-2xl border border-dashed border-border bg-card/40 px-4 py-8 flex flex-col items-center justify-center text-center gap-2">
      <div className="rounded-xl bg-muted/60 p-2.5 text-muted-foreground">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">Nothing on the wishlist yet</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Add a book to your <span className="font-medium">to-read</span> pile
        and we'll surface one here each week.
      </p>
    </div>
  );
}
