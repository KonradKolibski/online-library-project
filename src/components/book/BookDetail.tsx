import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Pencil,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Book, ReadingStatus } from "@/types/book";
import { useLibrary } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Long-text block that collapses to a fixed height with a fade-out gradient
 * and a "Show more / Show less" toggle. Only renders the toggle when the text
 * actually overflows the collapsed height — short descriptions show in full
 * with no UI clutter.
 */
function CollapsibleText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const COLLAPSED_PX = 168; // ~ 8 lines of text-sm leading-relaxed

  useLayoutEffect(() => {
    if (!ref.current) return;
    setOverflows(ref.current.scrollHeight > COLLAPSED_PX + 4);
  }, [text]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <p
          ref={ref}
          style={!expanded ? { maxHeight: COLLAPSED_PX } : undefined}
          className={cn(
            "text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap overflow-hidden",
            !expanded && "transition-[max-height]",
          )}
        >
          {text}
        </p>
        {/* Fade-out gradient masking the cut-off text */}
        {!expanded && overflows && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
}

/** Compact stat cell used in the 3-column row. Icon sits next to the label. */
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
import { CoverImage } from "./CoverImage";
import { StarRating } from "./StarRating";
import { BookForm } from "./BookForm";
import { cn } from "@/lib/utils";

interface BookDetailProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookDetail({ book, open, onOpenChange }: BookDetailProps) {
  const { state, updateBook, deleteBook } = useLibrary();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");

  // Local mirror of progress so the slider responds instantly while the user
  // drags. We push to the store on commit (release) — and also keep the local
  // value in sync if the book changes from elsewhere.
  const [draftProgress, setDraftProgress] = useState<number>(book.progress ?? 0);
  useEffect(() => {
    setDraftProgress(book.progress ?? 0);
  }, [book.progress, book.id]);

  // After the user marks the book as finished, prompt them to rate it if they
  // haven't already. Cleared on rate, skip, modal close, or book switch.
  const [askForRating, setAskForRating] = useState(false);
  useEffect(() => {
    setAskForRating(false);
  }, [book.id, open]);

  function setStatus(next: ReadingStatus) {
    // Keep progress logically consistent with status:
    //  - to-read    → clear progress
    //  - reading    → keep / default to 0
    //  - finished   → 100% (so charts show it as done)
    const progress =
      next === "to-read"
        ? undefined
        : next === "finished"
          ? 100
          : (book.progress ?? 0);
    updateBook(book.id, { status: next, progress });
    // Prompt for a rating right after the user finishes a book that wasn't
    // already rated. Surfacing it inline avoids a separate modal-on-modal step.
    if (next === "finished" && book.rating === undefined) {
      setAskForRating(true);
    } else {
      setAskForRating(false);
    }
  }

  const categories = book.categoryIds
    .map((id) => state.categories.find((c) => c.id === id))
    .filter(Boolean) as { id: string; name: string }[];
  const shelves = book.shelfIds
    .map((id) => state.shelves.find((s) => s.id === id))
    .filter(Boolean) as { id: string; name: string }[];

  function close() {
    setMode("view");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMode("view");
        onOpenChange(o);
      }}
    >
      <DialogContent className={mode === "edit" ? "gap-0 p-0" : undefined}>
        {mode === "edit" ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Edit book</DialogTitle>
            </DialogHeader>
            <BookForm
              initial={book}
              onSubmit={(input) => {
                updateBook(book.id, input);
                setMode("view");
              }}
              onCancel={() => setMode("view")}
            />
          </>
        ) : mode === "confirm-delete" ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete this book?</DialogTitle>
              <DialogDescription>
                &ldquo;{book.title}&rdquo; will be removed from your library.
                This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMode("view")}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteBook(book.id);
                  close();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top action row — edit & delete on the left, the built-in × is
              on the right (provided by DialogContent). */}
            <div className="flex items-center gap-1 -mt-1 -ml-1">
              <button
                type="button"
                onClick={() => setMode("edit")}
                aria-label="Edit"
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setMode("confirm-delete")}
                aria-label="Delete"
                className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            {/* Cover — centred, soft drop shadow */}
            <div className="self-center w-36 sm:w-40 drop-shadow-md">
              <CoverImage title={book.title} src={book.coverUrl} />
            </div>

            {/* Title & author */}
            <div className="text-center space-y-1.5">
              <DialogTitle className="text-xl font-semibold leading-snug">
                {book.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {book.author}
              </DialogDescription>
            </div>

            {/* Categories chips (centred row) */}
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {categories.map((c) => (
                  <Badge key={c.id} variant="secondary">
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Reading progress (only while reading) — slim, centred, fully
              interactive. Drag the slider to set %, or tap a quick-jump chip. */}
            {book.status === "reading" && (
              <div className="space-y-2">
                <Slider
                  value={[draftProgress]}
                  onValueChange={([v]) => setDraftProgress(v ?? 0)}
                  onValueCommit={([v]) =>
                    updateBook(book.id, { progress: v ?? 0 })
                  }
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Reading progress"
                />
                <p className="text-center text-xs tabular-nums text-muted-foreground">
                  {Math.round(draftProgress)}% read
                </p>
              </div>
            )}

            {/* Primary CTA — adapts to status. Pill-shaped, centred.
              For "to-read" we expose both Mark as finished (primary — the
              user finished it without tracking, e.g. an old book) and Start
              reading (secondary — begin a new reading session). */}
            <div className="flex flex-wrap justify-center gap-2">
              {book.status === "to-read" && (
                <>
                  <Button
                    size="lg"
                    className="rounded-full px-8"
                    onClick={() => setStatus("finished")}
                  >
                    <Check className="h-4 w-4" />
                    Mark as finished
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-8"
                    onClick={() => setStatus("reading")}
                  >
                    <BookOpen className="h-4 w-4" />
                    Start reading
                  </Button>
                </>
              )}
              {book.status === "reading" && (
                <Button
                  size="lg"
                  className="rounded-full px-8"
                  onClick={() => setStatus("finished")}
                >
                  <Check className="h-4 w-4" />
                  Mark as finished
                </Button>
              )}
              {book.status === "finished" && (
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8"
                  onClick={() => setStatus("reading")}
                >
                  <Undo2 className="h-4 w-4" />
                  Read again
                </Button>
              )}
            </div>

            {/* Rating prompt — appears once after the user marks the book as
              finished and they haven't rated it yet. Clicking a star saves
              immediately and dismisses the prompt; Skip dismisses without
              recording a rating. */}
            {askForRating && book.status === "finished" && (
              <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 flex flex-col items-center gap-2">
                <p className="text-sm font-medium">How was it?</p>
                <StarRating
                  value={book.rating}
                  onChange={(v) => {
                    updateBook(book.id, { rating: v });
                    if (v !== undefined) setAskForRating(false);
                  }}
                  size="md"
                />
                <button
                  type="button"
                  onClick={() => setAskForRating(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </div>
            )}

            {/* Stats — 3-column grid, icon + label above bold value */}
            <div className="grid grid-cols-3 gap-2 border-y border-border/60 py-4">
              <Stat
                icon={Star}
                label="Rating"
                value={book.rating !== undefined ? `${book.rating}/10` : "—"}
              />
              <Stat icon={BookOpen} label="Pages" value={book.pages ?? "—"} />
              <Stat icon={Calendar} label="Year" value={book.publishYear ?? "—"} />
            </div>

            {/* Overview (description) */}
            {book.description && (
              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold">Overview</h3>
                <CollapsibleText text={book.description} />
              </section>
            )}

            {/* Notes */}
            {book.notes && (
              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold">Notes</h3>
                <CollapsibleText text={book.notes} />
              </section>
            )}

            {/* Shelves & ISBN — secondary info, kept at the bottom */}
            {(shelves.length > 0 || book.isbn) && (
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                {shelves.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="uppercase tracking-wide">Shelves:</span>
                    {shelves.map((s) => (
                      <Badge key={s.id} variant="outline" className="font-normal">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {book.isbn && (
                  <p>
                    <span className="uppercase tracking-wide">ISBN:</span>{" "}
                    <span className="font-medium text-foreground">{book.isbn}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
