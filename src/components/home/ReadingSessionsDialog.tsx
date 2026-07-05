import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  Quote as QuoteIcon,
} from "lucide-react";
import type { Book, ReadingSession, SessionMood } from "@/types/book";
import { useLibrary } from "@/store/library";
import { CoverImage } from "@/components/book/CoverImage";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterChips } from "@/components/search/FilterChips";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounced } from "@/hooks/useDebounced";

interface ReadingSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog opens straight to this session's read-only preview. */
  initialSessionId?: string | null;
}

const MOOD_META: Record<SessionMood, { emoji: string; label: string }> = {
  happy: { emoji: "😊", label: "Happy" },
  thoughtful: { emoji: "🤔", label: "Thoughtful" },
  moved: { emoji: "😢", label: "Moved" },
  motivated: { emoji: "🔥", label: "Motivated" },
  bored: { emoji: "😴", label: "Bored" },
};

const MOOD_OPTIONS = (Object.keys(MOOD_META) as SessionMood[]).map((value) => ({
  id: value,
  label: `${MOOD_META[value].emoji} ${MOOD_META[value].label}`,
}));

/**
 * Browse-all-sessions surface opened from the "This week" card. Full-screen on
 * mobile, centred modal on desktop (via the shared Dialog primitive).
 *
 * Two modes:
 *  - list: searchbar + mood filter over every logged session (newest first)
 *  - detail: a single session shown read-only (no editing here by design)
 */
export function ReadingSessionsDialog({
  open,
  onOpenChange,
  initialSessionId,
}: ReadingSessionsDialogProps) {
  const { state } = useLibrary();
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedQuery = useDebounced(query, 200);

  // On open, jump straight to a specific session's preview when requested.
  useEffect(() => {
    if (open) setSelectedId(initialSessionId ?? null);
  }, [open, initialSessionId]);

  // Quick book lookup by id for titles / covers / authors.
  const bookById = useMemo(
    () => new Map(state.books.map((b) => [b.id, b])),
    [state.books],
  );

  // Newest first. Tie-break on createdAt so multiple same-day sessions keep a
  // stable, sensible order.
  const sorted = useMemo(
    () =>
      [...state.sessions].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [state.sessions],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return sorted.filter((s) => {
      if (mood && s.mood !== mood) return false;
      if (!q) return true;
      const haystack = [
        s.notes ?? "",
        s.quote ?? "",
        ...s.bookProgresses.map((bp) => {
          const book = bookById.get(bp.bookId);
          return book ? `${book.title} ${book.author}` : "";
        }),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, mood, debouncedQuery, bookById]);

  const selected = selectedId
    ? state.sessions.find((s) => s.id === selectedId) ?? null
    : null;

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset to a clean list view for the next open.
      setSelectedId(null);
      setQuery("");
      setMood(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col gap-0 p-0">
        {selected ? (
          <SessionDetail
            session={selected}
            bookById={bookById}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle>Reading sessions</DialogTitle>
            </DialogHeader>

            {/* Search + mood filters */}
            <div className="px-6 pb-3 space-y-3 border-b border-border">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search notes, quotes or books…"
              />
              <FilterChips
                options={MOOD_OPTIONS}
                activeId={mood}
                onChange={(id) => setMood(id as SessionMood | null)}
                allLabel="All moods"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {sorted.length === 0
                    ? "No reading sessions logged yet."
                    : "No sessions match your search."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((s) => (
                    <li key={s.id}>
                      <SessionRow
                        session={s}
                        bookById={bookById}
                        onClick={() => setSelectedId(s.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function SessionRow({
  session,
  bookById,
  onClick,
}: {
  session: ReadingSession;
  bookById: Map<string, Book>;
  onClick: () => void;
}) {
  const books = session.bookProgresses
    .map((bp) => bookById.get(bp.bookId))
    .filter(Boolean) as Book[];
  const snippet = session.notes?.trim() || session.quote?.trim() || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-3 hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        {/* Stacked covers */}
        <div className="flex shrink-0 -space-x-2">
          {books.slice(0, 3).map((b) => (
            <div key={b.id} className="w-7 h-[42px] ring-2 ring-card rounded-sm">
              <CoverImage title={b.title} src={b.coverUrl} rounded="rounded-sm" />
            </div>
          ))}
          {books.length === 0 && (
            <div className="w-7 h-[42px] rounded-sm bg-muted" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium leading-tight truncate">
              {books.length === 0
                ? "Reading session"
                : books.map((b) => b.title).join(", ")}
            </p>
            {session.mood && (
              <span className="shrink-0 text-base" aria-hidden="true">
                {MOOD_META[session.mood].emoji}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(session.date)}
            </span>
            {typeof session.minutes === "number" && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {formatMinutes(session.minutes)}
              </span>
            )}
          </div>
          {snippet && (
            <p className="ph-no-capture mt-1 text-xs text-muted-foreground line-clamp-1">
              {snippet}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Read-only detail ────────────────────────────────────────────────────────

function SessionDetail({
  session,
  bookById,
  onBack,
}: {
  session: ReadingSession;
  bookById: Map<string, Book>;
  onBack: () => void;
}) {
  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 mb-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          All sessions
        </button>
        <DialogTitle>{formatDate(session.date)}</DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Top meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {typeof session.minutes === "number" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {formatMinutes(session.minutes)}
            </span>
          )}
          {session.mood && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <span aria-hidden="true">{MOOD_META[session.mood].emoji}</span>
              {MOOD_META[session.mood].label}
            </span>
          )}
        </div>

        {/* Books read */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <BookOpen className="h-4 w-4" />
            Books
          </h3>
          <ul className="space-y-2">
            {session.bookProgresses.map((bp) => {
              const book = bookById.get(bp.bookId);
              const pagesRead =
                book?.pages !== undefined
                  ? Math.round((bp.newProgress / 100) * book.pages)
                  : null;
              return (
                <li
                  key={bp.bookId}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="w-9 h-[54px] shrink-0">
                    <CoverImage
                      title={book?.title ?? "Unknown book"}
                      src={book?.coverUrl}
                      rounded="rounded-md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight line-clamp-1">
                      {book?.title ?? "Removed book"}
                    </p>
                    {book?.author && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {book.author}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {pagesRead !== null && book?.pages
                        ? `Reached ${pagesRead} / ${book.pages} pages (${bp.newProgress}%)`
                        : `Reached ${bp.newProgress}%`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Notes */}
        {session.notes?.trim() && (
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">Notes</h3>
            <p className="ph-no-capture whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {session.notes}
            </p>
          </section>
        )}

        {/* Quote */}
        {session.quote?.trim() && (
          <section className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <QuoteIcon className="h-4 w-4" />
              Quote
            </h3>
            <blockquote className="ph-no-capture border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{session.quote}&rdquo;
              {typeof session.quotePage === "number" && (
                <span className="mt-1 block not-italic text-xs">
                  p. {session.quotePage}
                </span>
              )}
            </blockquote>
          </section>
        )}

        {/* Logged-at audit line */}
        <p className="pt-1 text-xs text-muted-foreground/70">
          Logged {formatDateTime(session.createdAt)}
        </p>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a local YYYY-MM-DD key as e.g. "Mon, 16 Jun 2026". */
function formatDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO timestamp for the audit line. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(total: number): string {
  if (total <= 0) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
