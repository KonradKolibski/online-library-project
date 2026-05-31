export interface AppSettings {
  name: string;
  readingGoal: number | null; // books per year
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
