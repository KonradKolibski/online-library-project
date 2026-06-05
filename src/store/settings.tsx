import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store/auth";

const DEFAULTS: AppSettings = {
  name: "",
  readingGoal: null,
};

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
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

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside a SettingsProvider");
  return ctx;
}
