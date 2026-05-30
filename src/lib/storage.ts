import type { Category, LibraryState } from "@/types/book";
import { newId } from "./id";

const STORAGE_KEY = "online-library:v1";

const DEFAULT_CATEGORY_NAMES = [
  "Fiction",
  "Non-fiction",
  "Design",
  "Science fiction",
  "Astrology",
  "Biography",
];

export const UNCATEGORIZED_NAME = "Uncategorized";

export function seedCategories(): Category[] {
  return DEFAULT_CATEGORY_NAMES.map((name) => ({ id: newId(), name }));
}

export function emptyLibrary(): LibraryState {
  return {
    schemaVersion: 1,
    books: [],
    categories: seedCategories(),
  };
}

export function load(): LibraryState {
  if (typeof window === "undefined") return emptyLibrary();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLibrary();
    const parsed = JSON.parse(raw) as Partial<LibraryState>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.books) || !Array.isArray(parsed.categories)) {
      return emptyLibrary();
    }
    return {
      schemaVersion: 1,
      books: parsed.books,
      categories: parsed.categories.length ? parsed.categories : seedCategories(),
    };
  } catch {
    return emptyLibrary();
  }
}

export function save(state: LibraryState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or privacy mode — ignored */
  }
}
