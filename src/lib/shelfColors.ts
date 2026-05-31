export interface ShelfColor {
  name: string;
  value: string; // hex
}

/** Curated palette tuned to match the app's pastel feel. */
export const SHELF_COLORS: ShelfColor[] = [
  { name: "Purple", value: "#7c5cff" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Slate", value: "#64748b" },
];

export const DEFAULT_SHELF_COLOR = "#94a3b8"; // soft gray for shelves without a colour
