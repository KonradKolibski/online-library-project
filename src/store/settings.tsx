import {
  createContext,
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
  /** Record coins spent in the shop. */
  spendCoins: (amount: number) => void;
  /** Add a purchased (unused) streak freeze to the inventory. */
  addFreeze: (count?: number) => void;
  /** Consume one freeze from inventory to protect a missed day. No-op if the
   *  day is already frozen or the inventory is empty. */
  applyFreeze: (date: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    if (!userId) {
      setSettings(DEFAULTS);
      return;
    }
    (async () => {
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
    })();
  }, [userId]);

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
      progression: fn(prev.progression ?? EMPTY_PROGRESSION),
    }));
    loadedRef.current = true;
  }

  function spendCoins(amount: number) {
    if (amount <= 0) return;
    updateProgression((p) => ({ ...p, coinsSpent: p.coinsSpent + amount }));
  }

  function addFreeze(count = 1) {
    updateProgression((p) => ({ ...p, freezeInventory: p.freezeInventory + count }));
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
      value={{ settings, update, spendCoins, addFreeze, applyFreeze }}
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
