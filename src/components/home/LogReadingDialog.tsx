import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Book, SessionMood } from "@/types/book";
import { useLibrary } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { CoverImage } from "@/components/book/CoverImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { localDateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface LogReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DraftBook {
  bookId: string;
  newProgress: number;
}

const MOODS: { value: SessionMood; emoji: string; label: string }[] = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "thoughtful", emoji: "🤔", label: "Thoughtful" },
  { value: "moved", emoji: "😢", label: "Moved" },
  { value: "motivated", emoji: "🔥", label: "Motivated" },
  { value: "bored", emoji: "😴", label: "Bored" },
];

export function LogReadingDialog({ open, onOpenChange }: LogReadingDialogProps) {
  const { state, addSession } = useLibrary();
  const today = useMemo(() => localDateString(new Date()), []);

  // Default-include currently-reading books when the modal opens.
  const initialDrafts = useMemo<DraftBook[]>(
    () =>
      state.books
        .filter((b) => b.status === "reading")
        .map((b) => ({ bookId: b.id, newProgress: b.progress ?? 0 })),
    // We only want this list at *open* time, not whenever the books update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const [drafts, setDrafts] = useState<DraftBook[]>(initialDrafts);
  const [minutes, setMinutes] = useState<string>("");
  const [mood, setMood] = useState<SessionMood | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState("");
  const [quotePage, setQuotePage] = useState<string>("");
  const [addingBook, setAddingBook] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on every reopen so a previous draft doesn't linger.
  useEffect(() => {
    if (open) {
      setDrafts(initialDrafts);
      setMinutes("");
      setMood(undefined);
      setNotes("");
      setQuote("");
      setQuotePage("");
      setAddingBook(false);
      setError(null);
    }
  }, [open, initialDrafts]);

  const draftIds = new Set(drafts.map((d) => d.bookId));
  const availableToAdd = state.books.filter((b) => !draftIds.has(b.id));

  function updateProgress(bookId: string, p: number) {
    setDrafts((prev) =>
      prev.map((d) => (d.bookId === bookId ? { ...d, newProgress: p } : d)),
    );
  }
  function removeBook(bookId: string) {
    setDrafts((prev) => prev.filter((d) => d.bookId !== bookId));
  }
  function addBook(bookId: string) {
    const book = state.books.find((b) => b.id === bookId);
    if (!book) return;
    setDrafts((prev) => [
      ...prev,
      { bookId, newProgress: book.progress ?? 0 },
    ]);
    setAddingBook(false);
  }

  function handleSave() {
    if (drafts.length === 0) {
      setError("Pick at least one book to log.");
      return;
    }
    const parsedMinutes = minutes.trim() ? parseInt(minutes, 10) : NaN;
    const parsedQuotePage = quotePage.trim() ? parseInt(quotePage, 10) : NaN;
    addSession({
      date: today,
      bookProgresses: drafts,
      minutes:
        !isNaN(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : undefined,
      mood,
      notes: notes.trim() || undefined,
      quote: quote.trim() || undefined,
      quotePage:
        !isNaN(parsedQuotePage) && parsedQuotePage > 0 ? parsedQuotePage : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log today's reading</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Books + progress sliders */}
          <section className="space-y-2">
            <Label>Books</Label>
            {drafts.length === 0 && (
              <p className="rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm text-muted-foreground">
                No books selected — add one below.
              </p>
            )}
            <ul className="space-y-2">
              {drafts.map((d) => {
                const book = state.books.find((b) => b.id === d.bookId);
                if (!book) return null;
                return (
                  <li
                    key={d.bookId}
                    className="rounded-xl bg-card border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-[54px] shrink-0">
                        <CoverImage
                          title={book.title}
                          src={book.coverUrl}
                          rounded="rounded-md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight line-clamp-1">
                          {book.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {book.author}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBook(d.bookId)}
                        aria-label="Remove"
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <ProgressRow
                      book={book}
                      value={d.newProgress}
                      onChange={(v) => updateProgress(d.bookId, v)}
                    />
                  </li>
                );
              })}
            </ul>

            {addingBook && availableToAdd.length > 0 ? (
              <div className="rounded-xl border border-border bg-card max-h-44 overflow-y-auto divide-y divide-border/60">
                {availableToAdd.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => addBook(b.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
                  >
                    <div className="w-8 h-12 shrink-0">
                      <CoverImage
                        title={b.title}
                        src={b.coverUrl}
                        rounded="rounded-sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {b.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.author}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : availableToAdd.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddingBook(true)}
                className="self-start"
              >
                <Plus className="h-4 w-4" />
                Add another book
              </Button>
            ) : null}
          </section>

          {/* Reading time */}
          <section className="space-y-1.5">
            <Label htmlFor="minutes">How long did you read? (mins)</Label>
            <Input
              id="minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              placeholder="e.g. 45"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </section>

          {/* Mood */}
          <section className="space-y-1.5">
            <Label>How did it feel?</Label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const selected = mood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(selected ? undefined : m.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                    )}
                  >
                    <span aria-hidden="true">{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-1.5">
            <Label htmlFor="session-notes">Notes</Label>
            <Textarea
              id="session-notes"
              rows={3}
              placeholder="What stuck with you?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          {/* Quote */}
          <section className="space-y-1.5">
            <Label htmlFor="session-quote">Quote (optional)</Label>
            <Textarea
              id="session-quote"
              rows={2}
              placeholder="A line you want to remember"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
            {quote.trim() && (
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Page (optional)"
                value={quotePage}
                onChange={(e) => setQuotePage(e.target.value)}
                className="w-32"
              />
            )}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save session</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressRow({
  book,
  value,
  onChange,
}: {
  book: Book;
  value: number;
  onChange: (v: number) => void;
}) {
  const pagesRead =
    book.pages !== undefined ? Math.round((value / 100) * book.pages) : null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span className="tabular-nums">
          {pagesRead !== null && book.pages
            ? `${pagesRead} / ${book.pages} pages`
            : `${value}%`}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v ?? 0)}
        min={0}
        max={100}
        step={1}
        aria-label={`Progress for ${book.title}`}
      />
    </div>
  );
}
