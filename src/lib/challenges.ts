import { supabase } from "@/lib/supabase";

/** Goal types authored in Strapi; kept in sync with the CMS `Challenge` enum. */
export type ChallengeGoalType =
  | "days_logged"
  | "books_finished"
  | "pages_read"
  | "minutes_read"
  | "distinct_genres";

/** A challenge plus this user's progress, as returned by the `challenges` edge fn. */
export interface ChallengeProgress {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  goalType: ChallengeGoalType;
  target: number;
  startDate: string | null;
  endDate: string | null;
  xpReward: number;
  coinReward: number;
  progress: number;
  completed: boolean;
  active: boolean;
}

export interface ChallengesResponse {
  challenges: ChallengeProgress[];
  newlyCompleted: ChallengeProgress[];
}

/** Human-readable unit for a goal type, e.g. "3 / 10 days". */
export function goalUnit(goalType: ChallengeGoalType): string {
  switch (goalType) {
    case "days_logged":
      return "days";
    case "books_finished":
      return "books";
    case "pages_read":
      return "pages";
    case "minutes_read":
      return "minutes";
    case "distinct_genres":
      return "genres";
    default:
      return "";
  }
}

/**
 * Ask the `challenges` edge function to evaluate the signed-in user's reading
 * sessions against the Strapi-authored challenges, granting any newly-completed
 * rewards server-side. Returns the merged list for rendering. Invoked with the
 * user's JWT (functions.invoke forwards the session automatically), mirroring
 * src/lib/aiRecommend.ts.
 */
export async function evaluateChallenges(): Promise<ChallengesResponse> {
  const { data, error } = await supabase.functions.invoke<ChallengesResponse>(
    "challenges",
    { body: {} },
  );
  if (error) throw error;
  return {
    challenges: data?.challenges ?? [],
    newlyCompleted: data?.newlyCompleted ?? [],
  };
}

/** Sum of coin/XP rewards this user has already been granted (source of truth). */
export async function fetchChallengeRewardTotals(
  userId: string,
): Promise<{ coins: number; xp: number }> {
  const { data, error } = await supabase
    .from("challenge_completions")
    .select("coin_reward, xp_reward")
    .eq("user_id", userId);
  if (error) throw error;
  let coins = 0;
  let xp = 0;
  for (const r of data ?? []) {
    coins += (r as { coin_reward: number }).coin_reward ?? 0;
    xp += (r as { xp_reward: number }).xp_reward ?? 0;
  }
  return { coins, xp };
}
