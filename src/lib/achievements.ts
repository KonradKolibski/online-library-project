import {
  Award,
  BookCheck,
  BookOpen,
  CalendarCheck,
  Flame,
  Library,
  Quote,
  Smile,
  Trophy,
  type LucideIcon,
} from "lucide-react";

/** Derived, persistence-free summary of a reader's history. */
export interface ReadingStats {
  currentStreak: number;
  longestStreak: number;
  booksFinished: number;
  totalPagesRead: number;
  daysLogged: number;
  moodsUsed: number; // distinct moods ever used (0–5)
  quotesLogged: number; // sessions that recorded a quote
  perfectMonths: number; // calendar months with every day logged
}

export type AchievementTier = 1 | 2 | 3 | 4;

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tier: AchievementTier;
  xpReward: number;
  coinReward: number;
  /** Pure predicate over derived stats. */
  earned: (s: ReadingStats) => boolean;
}

/** Tiered reward table — keep XP/coin payouts consistent across tiers. */
const TIER_XP: Record<AchievementTier, number> = { 1: 50, 2: 100, 3: 500, 4: 2000 };
const TIER_COINS: Record<AchievementTier, number> = { 1: 10, 2: 25, 3: 100, 4: 400 };

function def(
  id: string,
  title: string,
  description: string,
  icon: LucideIcon,
  tier: AchievementTier,
  earned: (s: ReadingStats) => boolean,
): AchievementDef {
  return {
    id,
    title,
    description,
    icon,
    tier,
    xpReward: TIER_XP[tier],
    coinReward: TIER_COINS[tier],
    earned,
  };
}

/**
 * Launch achievement set (~12). Each is a pure function of `ReadingStats`, so
 * the earned set is fully derived from reading history — no stored flags.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // Streaks
  def("streak-3", "Getting Going", "Reach a 3-day reading streak.", Flame, 1, (s) => s.longestStreak >= 3),
  def("streak-7", "Week Strong", "Reach a 7-day reading streak.", Flame, 2, (s) => s.longestStreak >= 7),
  def("streak-30", "Unstoppable", "Reach a 30-day reading streak.", Flame, 3, (s) => s.longestStreak >= 30),
  def("streak-100", "Centurion", "Reach a 100-day reading streak.", Trophy, 4, (s) => s.longestStreak >= 100),

  // Volume
  def("first-book", "First Finish", "Finish your first book.", BookCheck, 1, (s) => s.booksFinished >= 1),
  def("books-10", "Bookworm", "Finish 10 books.", BookOpen, 2, (s) => s.booksFinished >= 10),
  def("books-25", "Voracious", "Finish 25 books.", Library, 3, (s) => s.booksFinished >= 25),
  def("pages-1k", "Page Turner", "Read 1,000 pages.", BookOpen, 2, (s) => s.totalPagesRead >= 1000),
  def("pages-10k", "Marathoner", "Read 10,000 pages.", Award, 3, (s) => s.totalPagesRead >= 10000),

  // Habit
  def("collector", "Collector", "Save 10 quotes.", Quote, 2, (s) => s.quotesLogged >= 10),
  def("all-moods", "In Your Feelings", "Log all five reading moods.", Smile, 1, (s) => s.moodsUsed >= 5),
  def("perfect-month", "Perfect Month", "Read every day of a calendar month.", CalendarCheck, 4, (s) => s.perfectMonths >= 1),
];

/** Returns the set of earned achievement ids for the given stats. */
export function evaluateAchievements(stats: ReadingStats): Set<string> {
  const earned = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (a.earned(stats)) earned.add(a.id);
  }
  return earned;
}
