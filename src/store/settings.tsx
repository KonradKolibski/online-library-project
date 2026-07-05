import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings, ProgressionState } from "@/lib/settings";
import { EMPTY_PROGRESSION } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store/auth";

const DEFAULTS: AppSettings = {
  name: "",
  readingGoal: null,
};

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  /**
   * Make a shop purchase atomically on the server: spend `amount` coins and,
   * optionally, adjust the streak-freeze inventory / protect a day — all in one
   * transaction. The UI balance is refreshed from the DB result. Overspend must
   * be gated by the caller (it knows the derived balance).
   */
  spendCoins: (
    amount: number,
    opts?: { freezeDelta?: number; frozenDate?: string },
  ) => void;
  /** Consume one freeze from inventory to protect a missed day. No-op if the
   *  day is already frozen or the inventory is empty. */
  applyFreeze: (date: string) => void;
  /** Re-fetch settings from Supabase (e.g. after a server-side coin credit). */
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!userId) {
      setSettings(DEFAULTS);
      return;
    }
    const { data, error } = await supabase
      .from("app_settings")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[settings] load", error);
      return;
    }
    setSettings({ ...DEFAULTS, ...(data?.data as Partial<AppSettings> | undefined) });
    loadedRef.current = true;
  }, [userId]);

  useEffect(() => {
    loadedRef.current = false;
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId || !loadedRef.current) return;
    supabase
      .from("app_settings")
      .upsert({ user_id: userId, data: settings, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[settings] save", error);
        }
      });
  }, [settings, userId]);

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    loadedRef.current = true;
  }

  function updateProgression(fn: (p: ProgressionState) => ProgressionState) {
    setSettings((prev) => ({
      ...prev,
      // Merge onto EMPTY_PROGRESSION so a partially-populated row (e.g. one the
      // Stripe webhook wrote with only coinsPurchased) can never yield an
      // `undefined` numeric field, which would turn arithmetic into NaN.
      progression: fn({ ...EMPTY_PROGRESSION, ...prev.progression }),
    }));
    loadedRef.current = true;
  }

  /**
   * Run a shop purchase through the atomic `spend_coins` RPC (single locked
   * read-modify-write server-side, so the new balance is `old − cost` and never
   * NaN), then refresh the whole progression from the DB's returned value in one
   * state update — no split writes that a blanket upsert could persist out of
   * order. Overspend is gated by the caller.
   */
  async function spendCoins(
    amount: number,
    opts?: { freezeDelta?: number; frozenDate?: string },
  ) {
    if (!userId || amount <= 0) return;
    const { data, error } = await supabase.rpc("spend_coins", {
      p_amount: Math.round(amount),
      p_freeze_delta: opts?.freezeDelta ?? 0,
      p_frozen_date: opts?.frozenDate ?? null,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[settings] spendCoins", error);
      return;
    }
    // The RPC returns the authoritative progression (coinsSpent/freezeInventory/
    // frozenDates all numeric). Merge onto EMPTY_PROGRESSION so nothing is ever
    // undefined, and over prev so unrelated fields survive.
    const returned = (data ?? {}) as Partial<ProgressionState>;
    setSettings((prev) => ({
      ...prev,
      progression: { ...EMPTY_PROGRESSION, ...prev.progression, ...returned },
    }));
    loadedRef.current = true;
  }

  function applyFreeze(date: string) {
    updateProgression((p) => {
      if (p.freezeInventory <= 0 || p.frozenDates.includes(date)) return p;
      return {
        ...p,
        freezeInventory: p.freezeInventory - 1,
        frozenDates: [...p.frozenDates, date],
      };
    });
  }

  return (
    <SettingsContext.Provider
      value={{ settings, update, spendCoins, applyFreeze, reload: load }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside a SettingsProvider");
  return ctx;
}
