import { useMemo, useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { useLibrary } from "@/store/library";
import { useDebounced } from "@/hooks/useDebounced";
import type { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookGrid } from "@/components/book/BookGrid";
import { BookForm } from "@/components/book/BookForm";
import { BookDetail } from "@/components/book/BookDetail";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterChips } from "@/components/search/FilterChips";

export function LibraryPage() {
  const { state, addBook, allTags } = useLibrary();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 200);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return state.books.filter((b) => {
      if (categoryId && b.categoryId !== categoryId) return false;
      if (tag && !b.tags.includes(tag)) return false;
      if (q) {
        const hay = `${b.title} ${b.author}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.books, debounced, categoryId, tag]);

  const selectedLive = selected
    ? state.books.find((b) => b.id === selected.id) ?? null
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <SearchBar value={query} onChange={setQuery} />
        <Button
          onClick={() => setAddOpen(true)}
          className="hidden sm:inline-flex"
          aria-label="Add book"
        >
          <Plus className="h-4 w-4" />
          Add book
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">My books</h2>
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {state.books.length}
          </span>
        </div>
        <FilterChips
          options={state.categories.map((c) => ({ id: c.id, label: c.name }))}
          activeId={categoryId}
          onChange={setCategoryId}
        />
        {allTags.length > 0 && (
          <FilterChips
            options={allTags.map((t) => ({ id: t, label: t }))}
            activeId={tag}
            onChange={setTag}
            allLabel="Any tag"
            prefix="#"
          />
        )}
      </div>

      {state.books.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          subtitle="Add your first book to start your shelf."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add a book
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No books match"
          subtitle="Try clearing the search or a filter chip."
        />
      ) : (
        <BookGrid books={filtered} onSelect={setSelected} />
      )}

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="sm:hidden fixed right-4 bottom-20 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Add book"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a book</DialogTitle>
          </DialogHeader>
          <BookForm
            onSubmit={(input) => {
              addBook(input);
              setAddOpen(false);
            }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {selectedLive && (
        <BookDetail
          book={selectedLive}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-accent grid place-items-center">
        <BookOpen className="h-6 w-6 text-accent-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
