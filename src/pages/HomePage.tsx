import { useMemo, useState } from "react";
import type { Book } from "@/types/book";
import type { MainView } from "@/App";
import { useLibrary } from "@/store/library";
import { useSettings } from "@/store/settings";
import { useAddBook } from "@/store/addBook";
import { BookDetail } from "@/components/book/BookDetail";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { WeekStrip } from "@/components/home/WeekStrip";
import { LogReadingDialog } from "@/components/home/LogReadingDialog";
import { ReadingSessionsDialog } from "@/components/home/ReadingSessionsDialog";
import { CurrentlyReadingRow } from "@/components/home/CurrentlyReadingRow";
import { WeeklyFeaturedBook } from "@/components/home/WeeklyFeaturedBook";
import { WeeklyReadingGoalCard } from "@/components/home/WeeklyReadingGoalCard";
import { FavouriteAuthorsCard } from "@/components/home/FavouriteAuthorsCard";
import { StatsHighlights } from "@/components/home/StatsHighlights";
import { pickWeeklyFeatured } from "@/lib/weeklyPick";

interface HomePageProps {
  onNavigate: (view: MainView) => void;
  onOpenSettings: () => void;
}

const FAVOURITE_AUTHORS_LIMIT = 4;
const GOAL_BOOK_PREVIEW_LIMIT = 3;

export function HomePage({ onNavigate }: HomePageProps) {
  const { state } = useLibrary();
  const { settings } = useSettings();
  const { openAddBook } = useAddBook();

  // Touch onNavigate so its prop is wired for the future "View all" actions.
  void onNavigate;

  const [selected, setSelected] = useState<Book | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const selectedLive = selected
    ? state.books.find((b) => b.id === selected.id) ?? null
    : null;

  function openSessions() {
    setPreviewSessionId(null);
    setSessionsOpen(true);
  }
  function previewDay(dateKey: string) {
    const session = state.sessions.find((s) => s.date === dateKey);
    if (!session) return;
    setPreviewSessionId(session.id);
    setSessionsOpen(true);
  }

  /** Session-derived signals: the set of read-day keys + total minutes logged. */
  const { sessionDates, totalMinutes } = useMemo(() => {
    return {
      sessionDates: new Set(state.sessions.map((s) => s.date)),
      totalMinutes: state.sessions.reduce(
        (acc, s) => acc + (typeof s.minutes === "number" ? s.minutes : 0),
        0,
      ),
    };
  }, [state.sessions]);

  const {
    readingBooks,
    toReadBooks,
    featuredBook,
    favouriteAuthors,
    booksThisYear,
    pagesThisYear,
  } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const reading = state.books
      .filter((b) => b.status === "reading")
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

    const toRead = state.books
      .filter((b) => b.status === "to-read")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    // Featured book — a random pick from the to-read pile that stays fixed for
    // the whole week (persisted), rather than rerolling on every refresh.
    const featured = pickWeeklyFeatured(toRead);

    const finished = state.books.filter((b) => b.status === "finished");
    const finishedYr = finished.filter(
      (b) => new Date(b.updatedAt).getFullYear() === currentYear,
    );
    const pagesYr = finishedYr.reduce(
      (acc, b) => (typeof b.pages === "number" ? acc + b.pages : acc),
      0,
    );

    // Favourite authors — group by author string, count, sort desc.
    const counts = new Map<string, number>();
    for (const b of state.books) {
      const name = b.author?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const ranked = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) =>
        b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name),
      )
      .slice(0, FAVOURITE_AUTHORS_LIMIT);

    return {
      readingBooks: reading,
      toReadBooks: toRead,
      featuredBook: featured,
      favouriteAuthors: ranked,
      booksThisYear: finishedYr.length,
      pagesThisYear: pagesYr,
    };
  }, [state.books]);

  // ── Empty library — full onboarding hero ─────────────────────────────────
  if (state.books.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <WeekStrip
          sessionDates={sessionDates}
          onLogReading={() => setLogOpen(true)}
          onBrowseSessions={openSessions}
          onSelectDay={previewDay}
        />
        <WelcomeHero variant="empty" name={settings.name} onAddBook={openAddBook} />
        {/* Mockup sections still render — gives the user a preview of what's coming. */}
        <StatsHighlights
          booksThisYear={0}
          pagesThisYear={0}
          totalBooks={0}
          totalMinutes={0}
        />
        <DashboardGrid
          readingBooks={[]}
          featuredBook={null}
          goalBooks={[]}
          favouriteAuthors={[]}
          onSelect={setSelected}
        />
        <LogReadingDialog open={logOpen} onOpenChange={setLogOpen} />
        <ReadingSessionsDialog
          open={sessionsOpen}
          onOpenChange={setSessionsOpen}
          initialSessionId={previewSessionId}
        />
      </div>
    );
  }

  // ── Returning user ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <WeekStrip
        sessionDates={sessionDates}
        onLogReading={() => setLogOpen(true)}
        onBrowseSessions={openSessions}
        onSelectDay={previewDay}
      />
      <StatsHighlights
        booksThisYear={booksThisYear}
        pagesThisYear={pagesThisYear}
        totalBooks={state.books.length}
        totalMinutes={totalMinutes}
      />
      <DashboardGrid
        readingBooks={readingBooks}
        featuredBook={featuredBook}
        goalBooks={toReadBooks.slice(0, GOAL_BOOK_PREVIEW_LIMIT)}
        favouriteAuthors={favouriteAuthors}
        onSelect={setSelected}
      />

      {selectedLive && (
        <BookDetail
          book={selectedLive}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}

      <LogReadingDialog open={logOpen} onOpenChange={setLogOpen} />
      <ReadingSessionsDialog
        open={sessionsOpen}
        onOpenChange={setSessionsOpen}
        initialSessionId={previewSessionId}
      />
    </div>
  );
}

interface DashboardGridProps {
  readingBooks: Book[];
  featuredBook: Book | null;
  goalBooks: Book[];
  favouriteAuthors: { name: string; count: number }[];
  onSelect: (b: Book) => void;
}

/**
 * Responsive dashboard layout. Rather than two independent flex columns (which
 * let the left and right stacks drift out of vertical alignment), we use a
 * single CSS grid with explicit placement so paired sections share a real grid
 * row. `items-start` then tops them off together:
 *
 *   Row 1: Currently reading (2 cols)   |  Featured pick (1 col)
 *   Row 2: Weekly reading goal (2 cols) |  Favourite authors (1 col)  ← aligned
 *
 * On small screens it collapses to a single column in source order.
 */
function DashboardGrid({
  readingBooks,
  featuredBook,
  goalBooks,
  favouriteAuthors,
  onSelect,
}: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Row 1 — featured pick stretches to match the currently-reading box height */}
      <div className="lg:col-span-2">
        <CurrentlyReadingRow books={readingBooks} onSelect={onSelect} />
      </div>
      <div className="lg:col-span-1 lg:self-stretch">
        <WeeklyFeaturedBook book={featuredBook} onSelect={onSelect} />
      </div>

      {/* Row 2 — these two share a grid row, so they always top-align */}
      <div className="lg:col-span-2">
        <WeeklyReadingGoalCard books={goalBooks} onSelect={onSelect} />
      </div>
      <div className="lg:col-span-1">
        <FavouriteAuthorsCard authors={favouriteAuthors} />
      </div>
    </div>
  );
}
