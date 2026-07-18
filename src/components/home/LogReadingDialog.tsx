import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Book, SessionMood } from "@/types/book";
import { useLibrary } from "@/store/library";
import { useProgression } from "@/lib/xp";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements";
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

type Step = 1 | 2;

const MOODS: { value: SessionMood; emoji: string; label: string }[] = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "thoughtful", emoji: "🤔", label: "Thoughtful" },
  { value: "moved", emoji: "😢", label: "Moved" },
  { value: "motivated", emoji: "🔥", label: "Motivated" },
  { value: "bored", emoji: "😴", label: "Bored" },
];

export function LogReadingDialog({ open, onOpenChange }: LogReadingDialogProps) {
  const { state, addSession, deleteSession } = useLibrary();
  const progression = useProgression();
  const today = useMemo(() => localDateString(new Date()), []);

  // Snapshot of XP + unlocked achievements captured the instant we save, so the
  // success screen can show what this session earned (progression is derived, so
  // after the dispatch `progression` already reflects the new totals).
  const beforeRef = useRef<{ totalXp: number; earned: Set<string> } | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [saved, setSaved] = useState(false);
  // Id of today's existing session when editing; null when logging a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftBook[]>([]);
  const [minutes, setMinutes] = useState<string>("");
  const [mood, setMood] = useState<SessionMood | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState("");
  const [quotePage, setQuotePage] = useState<string>("");
  const [addingBook, setAddingBook] = useState(false);

  // On open, prefill from today's session if one already exists (edit mode);
  // otherwise start a fresh log seeded with the currently-reading books.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSaved(false);
    setAddingBook(false);

    const todaySession = state.sessions.find((s) => s.date === today) ?? null;
    if (todaySession) {
      setEditingId(todaySession.id);
      setDrafts(
        todaySession.bookProgresses.map((bp) => ({
          bookId: bp.bookId,
          newProgress: bp.newProgress,
        })),
      );
      setMinutes(todaySession.minutes != null ? String(todaySession.minutes) : "");
      setMood(todaySession.mood);
      setNotes(todaySession.notes ?? "");
      setQuote(todaySession.quote ?? "");
      setQuotePage(
        todaySession.quotePage != null ? String(todaySession.quotePage) : "",
      );
    } else {
      setEditingId(null);
      setDrafts(
        state.books
          .filter((b) => b.status === "reading")
          .map((b) => ({ bookId: b.id, newProgress: b.progress ?? 0 })),
      );
      setMinutes("");
      setMood(undefined);
      setNotes("");
      setQuote("");
      setQuotePage("");
    }
    // Capture library state only at open time, not on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    setDrafts((prev) => [...prev, { bookId, newProgress: book.progress ?? 0 }]);
    setAddingBook(false);
  }

  function handleSave() {
    if (drafts.length === 0) return;
    const parsedMinutes = minutes.trim() ? parseInt(minutes, 10) : NaN;
    const parsedQuotePage = quotePage.trim() ? parseInt(quotePage, 10) : NaN;
    beforeRef.current = {
      totalXp: progression.totalXp,
      earned: new Set(progression.earnedAchievements),
    };
    // One session per day: editing replaces today's existing session.
    if (editingId) deleteSession(editingId);
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
    setSaved(true);
  }

  const before = beforeRef.current;
  const xpGained = saved && before ? Math.max(0, progression.totalXp - before.totalXp) : 0;
  const newAchievements =
    saved && before
      ? ACHIEVEMENTS.filter(
          (a) => progression.earnedAchievements.has(a.id) && !before.earned.has(a.id),
        )
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {saved ? (
          <SuccessScreen
            count={drafts.length}
            editing={editingId !== null}
            xpGained={xpGained}
            newAchievements={newAchievements}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === 1
                  ? "What books have you read?"
                  : "How long did you read and how did it feel?"}
              </DialogTitle>
            </DialogHeader>

            <StepIndicator step={step} />

            {step === 1 ? (
              <StepBooks
                state={state}
                drafts={drafts}
                availableToAdd={availableToAdd}
                addingBook={addingBook}
                setAddingBook={setAddingBook}
                onUpdateProgress={updateProgress}
                onRemoveBook={removeBook}
                onAddBook={addBook}
              />
            ) : (
              <StepDetails
                minutes={minutes}
                setMinutes={setMinutes}
                mood={mood}
                setMood={setMood}
                notes={notes}
                setNotes={setNotes}
                quote={quote}
                setQuote={setQuote}
                quotePage={quotePage}
                setQuotePage={setQuotePage}
              />
            )}

            {/* Footer navigation — pinned to the bottom of the modal */}
            <div className="mt-auto flex justify-between gap-2 pt-1">
              {step === 1 ? (
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {step === 1 ? (
                <Button
                  onClick={() => setStep(2)}
                  disabled={drafts.length === 0}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSave}>
                  {editingId ? "Update session" : "Save session"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step >= n ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        Step {step} of 2
      </span>
    </div>
  );
}

// ── Step 1: books ──────────────────────────────────────────────────────────

function StepBooks({
  state,
  drafts,
  availableToAdd,
  addingBook,
  setAddingBook,
  onUpdateProgress,
  onRemoveBook,
  onAddBook,
}: {
  state: ReturnType<typeof useLibrary>["state"];
  drafts: DraftBook[];
  availableToAdd: Book[];
  addingBook: boolean;
  setAddingBook: (v: boolean) => void;
  onUpdateProgress: (bookId: string, p: number) => void;
  onRemoveBook: (bookId: string) => void;
  onAddBook: (bookId: string) => void;
}) {
  return (
    <section className="space-y-2">
      <Label>Books read in this session</Label>
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
                  onClick={() => onRemoveBook(d.bookId)}
                  aria-label="Remove"
                  className="text-muted-foreground hover:text-destructive p-1 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <ProgressRow
                book={book}
                value={d.newProgress}
                onChange={(v) => onUpdateProgress(d.bookId, v)}
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
              onClick={() => onAddBook(b.id)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
            >
              <div className="w-8 h-12 shrink-0">
                <CoverImage title={b.title} src={b.coverUrl} rounded="rounded-sm" />
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
  );
}

// ── Step 2: time, mood, notes, quote ───────────────────────────────────────

function StepDetails({
  minutes,
  setMinutes,
  mood,
  setMood,
  notes,
  setNotes,
  quote,
  setQuote,
  quotePage,
  setQuotePage,
}: {
  minutes: string;
  setMinutes: (v: string) => void;
  mood: SessionMood | undefined;
  setMood: (v: SessionMood | undefined) => void;
  notes: string;
  setNotes: (v: string) => void;
  quote: string;
  setQuote: (v: string) => void;
  quotePage: string;
  setQuotePage: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
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
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-100 active:translate-y-px",
                  selected
                    ? "bg-primary/10 border-transparent text-foreground shadow-[0_3px_0_0_rgba(107,96,230,0.4)] active:shadow-[0_1px_0_0_rgba(107,96,230,0.4)]"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/40 shadow-[0_3px_0_0_hsl(var(--border))] active:shadow-[0_1px_0_0_hsl(var(--border))]",
                )}
              >
                <span aria-hidden="true">{m.emoji}</span>
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Notes (optional) */}
      <section className="space-y-1.5">
        <Label htmlFor="session-notes">Notes (optional)</Label>
        {/* ph-no-capture: personal journal text is redacted from PostHog session recordings. */}
        <Textarea
          id="session-notes"
          rows={3}
          placeholder="What stuck with you?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="ph-no-capture"
        />
      </section>

      {/* Quote (optional) */}
      <section className="space-y-1.5">
        <Label htmlFor="session-quote">Quote (optional)</Label>
        <Textarea
          id="session-quote"
          rows={2}
          placeholder="A line you want to remember"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          className="ph-no-capture"
        />
        {quote.trim() && (
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Page (optional)"
            value={quotePage}
            onChange={(e) => setQuotePage(e.target.value)}
            className="w-32 ph-no-capture"
          />
        )}
      </section>
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────

function SuccessScreen({
  count,
  editing,
  xpGained,
  newAchievements,
  onDone,
}: {
  count: number;
  editing: boolean;
  xpGained: number;
  newAchievements: AchievementDef[];
  onDone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center gap-4 py-10">
      {/* Visually-hidden title keeps the dialog accessible. */}
      <DialogTitle className="sr-only">Session saved</DialogTitle>

      <div className="relative flex items-center justify-center">
        {/* Pulsing celebratory ring */}
        <span className="absolute h-20 w-20 rounded-full bg-primary/30 animate-success-ring" />
        {/* Check badge */}
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-primary-foreground shadow-lg animate-pop-in">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden="true">
            <path
              d="M5 12.5 L10 17.5 L19 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{ strokeDasharray: 1 }}
              className="animate-check-draw"
            />
          </svg>
        </span>
      </div>

      <div className="space-y-1 animate-rise-in">
        <p className="text-lg font-semibold">
          {editing ? "Session updated!" : "Session logged!"}
        </p>
        <p className="text-sm text-muted-foreground">
          {count === 1
            ? "Progress saved for 1 book. Keep the streak going."
            : `Progress saved for ${count} books. Keep the streak going.`}
        </p>
      </div>

      {xpGained > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary animate-rise-in">
          <Sparkles className="h-4 w-4" />
          +{xpGained.toLocaleString()} XP
        </span>
      )}

      {newAchievements.length > 0 && (
        <div className="w-full space-y-2 animate-rise-in">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Achievement{newAchievements.length > 1 ? "s" : ""} unlocked
          </p>
          {newAchievements.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{a.title}</p>
                  <p className="text-[11px] text-primary font-medium tabular-nums">
                    +{a.xpReward} XP · +{a.coinReward} coins
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={onDone} className="mt-2 animate-rise-in">
        Done
      </Button>
    </div>
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
  const hasPages = typeof book.pages === "number" && book.pages > 0;
  const totalPages = book.pages ?? 0;
  // Local string state lets the user type freely (incl. clearing) without the
  // value fighting their keystrokes.
  const [pageInput, setPageInput] = useState(
    hasPages ? String(Math.round((value / 100) * totalPages)) : "",
  );

  // Keep the page field in sync when the slider moves the value.
  useEffect(() => {
    if (hasPages) setPageInput(String(Math.round((value / 100) * totalPages)));
  }, [value, hasPages, totalPages]);

  function handlePageChange(raw: string) {
    setPageInput(raw);
    if (!hasPages) return;
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(totalPages, n));
    // Store a precise (2-decimal) percentage so each page round-trips exactly,
    // even on long books where one slider step spans several pages.
    onChange(Math.round((clamped / totalPages) * 10000) / 100);
  }

  function handlePageBlur() {
    if (hasPages && pageInput.trim() === "") {
      setPageInput(String(Math.round((value / 100) * totalPages)));
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Progress</span>
        {hasPages ? (
          <label className="flex items-center gap-1.5">
            <span>Page</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={totalPages}
              value={pageInput}
              onChange={(e) => handlePageChange(e.target.value)}
              onBlur={handlePageBlur}
              aria-label={`Current page for ${book.title}`}
              className="h-7 w-16 px-1.5 text-center tabular-nums"
            />
            <span className="tabular-nums">of {totalPages}</span>
          </label>
        ) : (
          <span className="tabular-nums">{Math.round(value)}%</span>
        )}
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
