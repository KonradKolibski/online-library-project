import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import { SortSelector, type SortOption } from "@/components/search/SortSelector";
import { sortBooks } from "@/lib/sort";
import { ReadingIllustration } from "@/components/illustrations/ReadingIllustration";
import { BookshelfIllustration } from "@/components/illustrations/BookshelfIllustration";

export function LibraryPage() {
  const { state, addBook, allTags } = useLibrary();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 200);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const results = state.books.filter((b) => {
      if (categoryId && b.categoryId !== categoryId) return false;
      if (tag && !b.tags.includes(tag)) return false;
      if (q) {
        const hay = `${b.title} ${b.author}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortBooks(results, sortBy);
  }, [state.books, debounced, categoryId, tag, sortBy]);

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

      <div className="space-y-3">
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
        <div className="pt-1">
          <SortSelector value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {state.books.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100/60 via-pink-100/50 to-amber-100/50 px-6 py-10 sm:px-10 sm:py-14">
          <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
            <div className="space-y-4 max-w-md">
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                All your books in one place
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Build your personal shelf. Add titles, rate what you've read, and find anything in seconds.
              </p>
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add your first book
              </Button>
            </div>
            <ReadingIllustration className="w-full max-w-md justify-self-center" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <BookshelfIllustration className="w-40 sm:w-48" />
          <p className="font-semibold">No books match</p>
          <p className="text-sm text-muted-foreground">Try clearing the search or a filter chip.</p>
        </div>
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

