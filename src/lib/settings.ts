/** Spendable / consumable gamification state. Everything else (XP, level,
 *  which achievements are unlocked) is *derived* from reading history and so is
 *  never stored here. */
export interface ProgressionState {
  coinsSpent: number; // total coins ever spent in the shop
  freezeInventory: number; // bought-but-unused streak freezes
  frozenDates: string[]; // YYYY-MM-DD days protected by an applied freeze
}

export const EMPTY_PROGRESSION: ProgressionState = {
  coinsSpent: 0,
  freezeInventory: 0,
  frozenDates: [],
};

export interface AppSettings {
  name: string;
  readingGoal: number | null; // books per year
  progression?: ProgressionState;
}

const SETTINGS_KEY = "capy-books:settings";

const DEFAULTS: AppSettings = {
  name: "",
  readingGoal: null,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* quota / privacy mode */
  }
}
