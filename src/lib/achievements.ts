import {
  Award,
  BookOpen,
  CalendarCheck,
  Flame,
  Quote,
  Smile,
  type LucideIcon,
} from "lucide-react";

/** Derived, persistence-free summary of a reader's history. */
export interface ReadingStats {
  currentStreak: number;
  longestStreak: number;
  booksFinished: number;
  totalPagesRead: number;
  daysLogged: number;
  moodRounds: number; // fewest times any one of the 5 moods has been logged (min across moods)
  quotesLogged: number; // sessions that recorded a quote
  perfectMonths: number; // calendar months with every day logged
}

export type AchievementTier = 1 | 2 | 3 | 4;

/** Tiered reward table — keep XP/coin payouts consistent across tiers. */
const TIER_XP: Record<AchievementTier, number> = { 1: 50, 2: 100, 3: 500, 4: 2000 };
const TIER_COINS: Record<AchievementTier, number> = { 1: 10, 2: 25, 3: 100, 4: 400 };

// ── Track accents ─────────────────────────────────────────────────────────────

export type TrackAccent = "amber" | "violet" | "rose";

export interface AccentClasses {
  /** Solid badge fill for the level medallion. */
  badge: string;
  /** Progress-bar fill. */
  bar: string;
}

export const ACCENT: Record<TrackAccent, AccentClasses> = {
  amber: { badge: "bg-amber-500 text-white", bar: "bg-amber-500" },
  violet: { badge: "bg-primary text-primary-foreground", bar: "bg-primary" },
  rose: { badge: "bg-rose-500 text-white", bar: "bg-rose-500" },
};

// ── Difficulty ────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_META: Record<Difficulty, { label: string; classes: string }> = {
  easy: { label: "Easy", classes: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  medium: { label: "Medium", classes: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  hard: { label: "Hard", classes: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
};

// ── Tracks ────────────────────────────────────────────────────────────────────

interface LevelSpec {
  id: string;
  threshold: number;
  tier: AchievementTier;
  /** The goal shown while this level is in progress. */
  label: string;
}

export interface AchievementTrack {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Optional full-bleed badge illustration; falls back to `icon` when unset. */
  illustration?: string;
  accent: TrackAccent;
  /** How hard the track is to complete overall. */
  difficulty: Difficulty;
  /** Current value of the tracked stat — the numerator of the "x / y" progress. */
  metric: (s: ReadingStats) => number;
  /** Ascending thresholds. Levels beyond the launch set are extensions only. */
  levels: LevelSpec[];
}

/**
 * Leveled achievement tracks (Duolingo-style). Each track is one row on the
 * Progress screen with a level badge + a bar toward the next threshold. The
 * per-level ids/rewards double as the flat reward units that drive the economy
 * (see `ACHIEVEMENTS` below), so existing earn logic stays intact.
 */
export const ACHIEVEMENT_TRACKS: AchievementTrack[] = [
  {
    id: "streak",
    title: "Bookflame",
    icon: Flame,
    illustration: "/illustrations/capy-streak.png",
    accent: "amber",
    difficulty: "hard",
    metric: (s) => s.longestStreak,
    levels: [
      { id: "streak-3", threshold: 3, tier: 1, label: "Reach a 3-day reading streak." },
      { id: "streak-7", threshold: 7, tier: 2, label: "Reach a 7-day reading streak." },
      { id: "streak-30", threshold: 30, tier: 3, label: "Reach a 30-day reading streak." },
      { id: "streak-100", threshold: 100, tier: 4, label: "Reach a 100-day reading streak." },
    ],
  },
  {
    id: "books",
    title: "Bookworm",
    icon: BookOpen,
    illustration: "/illustrations/capy-books.png",
    accent: "violet",
    difficulty: "medium",
    metric: (s) => s.booksFinished,
    levels: [
      { id: "first-book", threshold: 1, tier: 1, label: "Finish your first book." },
      { id: "books-10", threshold: 10, tier: 2, label: "Finish 10 books." },
      { id: "books-25", threshold: 25, tier: 3, label: "Finish 25 books." },
      { id: "books-50", threshold: 50, tier: 4, label: "Finish 50 books." },
    ],
  },
  {
    id: "pages",
    title: "Marathoner",
    icon: Award,
    illustration: "/illustrations/capy-pages.png",
    accent: "violet",
    difficulty: "hard",
    metric: (s) => s.totalPagesRead,
    levels: [
      { id: "pages-1k", threshold: 1000, tier: 2, label: "Read 1,000 pages." },
      { id: "pages-10k", threshold: 10000, tier: 3, label: "Read 10,000 pages." },
      { id: "pages-50k", threshold: 50000, tier: 4, label: "Read 50,000 pages." },
    ],
  },
  {
    id: "quotes",
    title: "Collector",
    icon: Quote,
    illustration: "/illustrations/capy-quotes.png",
    accent: "rose",
    difficulty: "easy",
    metric: (s) => s.quotesLogged,
    levels: [
      { id: "collector", threshold: 10, tier: 2, label: "Save 10 quotes." },
      { id: "quotes-25", threshold: 25, tier: 3, label: "Save 25 quotes." },
      { id: "quotes-50", threshold: 50, tier: 4, label: "Save 50 quotes." },
    ],
  },
  {
    id: "moods",
    title: "In Your Feelings",
    icon: Smile,
    illustration: "/illustrations/capy-moods.png",
    accent: "rose",
    difficulty: "easy",
    metric: (s) => s.moodRounds,
    levels: [
      { id: "all-moods", threshold: 1, tier: 1, label: "Log all five reading moods." },
      { id: "all-moods-3", threshold: 3, tier: 2, label: "Log all five reading moods 3 times each." },
      { id: "all-moods-5", threshold: 5, tier: 3, label: "Log all five reading moods 5 times each." },
    ],
  },
  {
    id: "perfect",
    title: "Perfectionist",
    icon: CalendarCheck,
    illustration: "/illustrations/capy-perfect.png",
    accent: "violet",
    difficulty: "hard",
    metric: (s) => s.perfectMonths,
    levels: [
      { id: "perfect-month", threshold: 1, tier: 4, label: "Read every day of a calendar month." },
      { id: "perfect-3", threshold: 3, tier: 4, label: "Have 3 perfect reading months." },
      { id: "perfect-12", threshold: 12, tier: 4, label: "Have 12 perfect reading months." },
    ],
  },
];

// ── Flat reward layer (drives XP/coins + the "new achievement" toast) ──────────

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  xpReward: number;
  coinReward: number;
  /** Pure predicate over derived stats. */
  earned: (s: ReadingStats) => boolean;
}

/** Every track level flattened into an independently-earnable reward unit. */
export const ACHIEVEMENTS: AchievementDef[] = ACHIEVEMENT_TRACKS.flatMap((track) =>
  track.levels.map((l) => ({
    id: l.id,
    title: track.title,
    description: l.label,
    icon: track.icon,
    xpReward: TIER_XP[l.tier],
    coinReward: TIER_COINS[l.tier],
    earned: (s: ReadingStats) => track.metric(s) >= l.threshold,
  })),
);

/** Returns the set of earned achievement ids for the given stats. */
export function evaluateAchievements(stats: ReadingStats): Set<string> {
  const earned = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (a.earned(stats)) earned.add(a.id);
  }
  return earned;
}

// ── Display-layer evaluation (per-track level + progress) ──────────────────────

export interface TrackProgress {
  track: AchievementTrack;
  accent: AccentClasses;
  /** Current stat value. */
  value: number;
  /** Levels fully completed. */
  completed: number;
  /** Level number shown on the badge (the one in progress, or the top level). */
  displayLevel: number;
  maxed: boolean;
  /** Threshold of the level currently in progress (or the top level if maxed). */
  nextThreshold: number;
  /** Progress toward `nextThreshold`, 0–100. */
  pct: number;
  /** Goal label for the level in progress ("" when maxed). */
  goal: string;
  /** Reward for the level in progress (null when maxed). */
  nextReward: { xp: number; coins: number } | null;
  totalLevels: number;
}

export function evaluateTrack(track: AchievementTrack, stats: ReadingStats): TrackProgress {
  const value = track.metric(stats);
  const completed = track.levels.filter((l) => value >= l.threshold).length;
  const maxed = completed >= track.levels.length;
  const current = track.levels[Math.min(completed, track.levels.length - 1)];
  const nextThreshold = current.threshold;
  return {
    track,
    accent: ACCENT[track.accent],
    value,
    completed,
    displayLevel: maxed ? track.levels.length : completed + 1,
    maxed,
    nextThreshold,
    pct: maxed ? 100 : Math.max(0, Math.min(100, (value / nextThreshold) * 100)),
    goal: maxed ? "" : current.label,
    nextReward: maxed ? null : { xp: TIER_XP[current.tier], coins: TIER_COINS[current.tier] },
    totalLevels: track.levels.length,
  };
}

/** Evaluate every track against the given stats, in display order. */
export function evaluateTracks(stats: ReadingStats): TrackProgress[] {
  return ACHIEVEMENT_TRACKS.map((t) => evaluateTrack(t, stats));
}
