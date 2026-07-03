import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/store/auth";
import { useLibrary } from "@/store/library";
import {
  evaluateChallenges,
  fetchChallengeRewardTotals,
  type ChallengeProgress,
} from "@/lib/challenges";

interface ChallengesContextValue {
  challenges: ChallengeProgress[];
  /** Coins/XP already granted for completed challenges (feeds useProgression). */
  coinsFromChallenges: number;
  xpFromChallenges: number;
  loading: boolean;
  /** Challenges completed on the most recent evaluation, for a celebratory UI. */
  newlyCompleted: ChallengeProgress[];
  acknowledgeCompleted: () => void;
  refresh: () => void;
}

/** Zero-valued default so useProgression works even outside the provider. */
const ChallengesContext = createContext<ChallengesContextValue>({
  challenges: [],
  coinsFromChallenges: 0,
  xpFromChallenges: 0,
  loading: false,
  newlyCompleted: [],
  acknowledgeCompleted: () => {},
  refresh: () => {},
});

// The evaluator reads the user's sessions from the DB, so re-running it right
// after logging must wait for that write to land. addSession updates the store
// optimistically first, so we debounce the sessions-driven refresh slightly.
const REFRESH_DEBOUNCE_MS = 1200;

export function ChallengesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { state } = useLibrary();

  const [challenges, setChallenges] = useState<ChallengeProgress[]>([]);
  const [rewards, setRewards] = useState({ coins: 0, xp: 0 });
  const [newlyCompleted, setNewlyCompleted] = useState<ChallengeProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const { challenges: list, newlyCompleted: newly } = await evaluateChallenges();
      setChallenges(list);
      if (newly.length) setNewlyCompleted(newly);
      // Reload granted totals (the evaluation may have inserted completions).
      const totals = await fetchChallengeRewardTotals(userId);
      setRewards(totals);
    } catch (err) {
      // Non-fatal: Strapi may be unconfigured/unreachable. Leave prior state.
      // eslint-disable-next-line no-console
      console.error("[challenges] refresh", err);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [userId]);

  // Reset + initial load when the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setChallenges([]);
      setRewards({ coins: 0, xp: 0 });
      setNewlyCompleted([]);
      return;
    }
    void refresh();
  }, [userId, refresh]);

  // Re-evaluate (debounced) whenever the user's sessions change — e.g. after
  // logging a reading session, which may complete a challenge.
  const sessionCount = state.sessions.length;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!userId) return;
    const t = setTimeout(() => void refresh(), REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [sessionCount, userId, refresh]);

  const value = useMemo<ChallengesContextValue>(
    () => ({
      challenges,
      coinsFromChallenges: rewards.coins,
      xpFromChallenges: rewards.xp,
      loading,
      newlyCompleted,
      acknowledgeCompleted: () => setNewlyCompleted([]),
      refresh: () => void refresh(),
    }),
    [challenges, rewards, loading, newlyCompleted, refresh],
  );

  return <ChallengesContext.Provider value={value}>{children}</ChallengesContext.Provider>;
}

export function useChallenges(): ChallengesContextValue {
  return useContext(ChallengesContext);
}
