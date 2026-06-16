// Aggregate reading statistics for a user — totals/counts that the retrieval
// search tool cannot answer. Backs the agent's `get_reading_stats` tool so it
// can answer "how many sessions / total minutes / books finished" correctly
// instead of miscounting a bounded search sample.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ReadingStats {
  totalSessions: number;
  totalMinutes: number;
  avgMinutesPerSession: number | null;
  daysRead: number;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  sessionsLast7Days: number;
  totalBooks: number;
  booksFinished: number;
  booksReading: number;
  booksToRead: number;
  moodBreakdown: Record<string, number>;
}

/**
 * Fetch aggregate reading stats for a user via the `get_reading_stats` RPC.
 * `admin` must be a service-role client (the RPC is scoped by p_user_id).
 */
export async function getReadingStats(
  admin: SupabaseClient,
  uid: string,
): Promise<ReadingStats> {
  const { data, error } = await admin.rpc("get_reading_stats", { p_user_id: uid });
  if (error) throw new Error(`get_reading_stats failed: ${error.message}`);
  return data as ReadingStats;
}
