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
import { ShelfTabs } from "@/components/search/ShelfTabs";
import { SortSelector, type SortOption } from "@/components/search/SortSelector";
import { sortBooks } from "@/lib/sort";
import { ReadingIllustration } from "@/components/illustrations/ReadingIllustration";
import { BookshelfIllustration } from "@/components/illustrations/BookshelfIllustration";

export function LibraryPage() {
  const { state, addBook, addShelf, renameShelf, setShelfColor, deleteShelf } = useLibrary();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 200);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [shelfId, setShelfId] = useState<string | null>(null); // null = "All books"
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);

  // Books filtered first by shelf (so chips/search only operate on the active shelf)
  const shelfBooks = useMemo(() => {
    if (shelfId === null) return state.books;
    return state.books.filter((b) => b.shelfIds.includes(shelfId));
  }, [state.books, shelfId]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const results = shelfBooks.filter((b) => {
      if (categoryId && !b.categoryIds.includes(categoryId)) return false;
      if (q) {
        const hay = `${b.title} ${b.author}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortBooks(results, sortBy);
  }, [shelfBooks, debounced, categoryId, sortBy]);

  // Counts for tabs
  const shelfBookCounts = useMemo(() => {
    const map = new Map<string | null, number>();
    map.set(null, state.books.length);
    for (const s of state.shelves) {
      map.set(s.id, state.books.filter((b) => b.shelfIds.includes(s.id)).length);
    }
    return map;
  }, [state.books, state.shelves]);

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
            {filtered.length} of {shelfBooks.length}
          </span>
        </div>

        {/* Shelf tabs */}
        <ShelfTabs
          shelves={state.shelves}
          activeId={shelfId}
          onChange={setShelfId}
          onCreate={(name, color) => addShelf(name, color)}
          onRename={(id, name) => renameShelf(id, name)}
          onSetColor={(id, color) => setShelfColor(id, color)}
          onDelete={(id) => {
            if (shelfId === id) setShelfId(null);
            deleteShelf(id);
          }}
          bookCounts={shelfBookCounts}
        />

        {/* Sort + category filter chips */}
        <div className="flex items-start gap-2">
          <SortSelector value={sortBy} onChange={setSortBy} />
          <FilterChips
            options={state.categories.map((c) => ({ id: c.id, label: c.name }))}
            activeId={categoryId}
            onChange={setCategoryId}
          />
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
                Build your personal shelf. Add titles, rate what you&apos;ve
                read, and find anything in seconds.
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
          <p className="text-sm text-muted-foreground">
            Try clearing the search, switching shelves, or removing a filter.
          </p>
        </div>
      ) : (
        <BookGrid books={filtered} onSelect={setSelected} />
      )}

      {/*
        Mobile FAB — anchored so its centre sits exactly on the bottom nav's
        top edge. BottomNav measures 66px tall (verified at runtime), the FAB
        is 56px (h-14), so `bottom: navHeight - halfFab = 66 - 28 = 38px`.
      */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-[38px] z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            initialShelfIds={shelfId ? [shelfId] : []}
            onSubmit={(input) => {
              addBook(input);
              setAddOpen(false);
            }}
            onAddAnother={(input) => {
              addBook(input);
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
