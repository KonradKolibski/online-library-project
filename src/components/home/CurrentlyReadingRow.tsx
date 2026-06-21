import { BookOpen } from "lucide-react";
import type { Book } from "@/types/book";
import { HorizontalScroller } from "@/components/ui/horizontal-scroller";
import { BookMiniCard } from "./BookMiniCard";
import { SectionHeader } from "./SectionHeader";

interface CurrentlyReadingRowProps {
  books: Book[];
  onSelect: (book: Book) => void;
}

export function CurrentlyReadingRow({
  books,
  onSelect,
}: CurrentlyReadingRowProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Currently reading"
        meta={
          books.length > 0
            ? `${books.length} book${books.length === 1 ? "" : "s"}`
            : undefined
        }
      />
      {books.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl bg-card border border-border p-4">
          <HorizontalScroller className="pb-1 -mx-1 px-1">
            {books.map((b) => (
              <BookMiniCard
                key={b.id}
                book={b}
                onClick={() => onSelect(b)}
                showProgress
              />
            ))}
          </HorizontalScroller>
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-6 flex flex-col items-center text-center gap-2">
      <div className="rounded-xl bg-muted/60 p-2.5 text-muted-foreground">
        <BookOpen className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">Nothing in progress</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Open a book from your library and tap{" "}
        <span className="font-medium">Start reading</span> to track it here.
      </p>
    </div>
  );
}
