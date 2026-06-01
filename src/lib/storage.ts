import type { Category, LibraryState } from "@/types/book";
import { newId } from "./id";

const STORAGE_KEY = "online-library:v1";

const DEFAULT_CATEGORY_NAMES = [
  "Fiction",
  "Non-fiction",
  "Science fiction",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Horror",
  "Romance",
  "Historical fiction",
  "Literary fiction",
  "Young adult",
  "Children's",
  "Biography",
  "Autobiography",
  "Memoir",
  "History",
  "Science",
  "Psychology",
  "Philosophy",
  "Self-help",
  "Business",
  "Technology",
  "Design",
  "Art",
  "Travel",
  "Poetry",
  "Essays",
  "Comics & graphic novels",
  "Cooking",
  "Astrology",
];

export function seedCategories(): Category[] {
  return DEFAULT_CATEGORY_NAMES.map((name) => ({ id: newId(), name }));
}

export function emptyLibrary(): LibraryState {
  return {
    schemaVersion: 4,
    books: [],
    categories: seedCategories(),
    shelves: [],
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function migrateV1(parsed: any): LibraryState {
  return {
    schemaVersion: 4,
    books: (parsed.books ?? []).map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl,
      categoryIds: b.categoryId ? [b.categoryId] : [],
      shelfIds: [],
      status: b.status,
      progress: b.progress,
      rating: b.rating,
      notes: b.notes,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
    categories:
      Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : seedCategories(),
    shelves: [],
  };
}

function migrateV2(parsed: any): LibraryState {
  return {
    schemaVersion: 4,
    books: (parsed.books ?? []).map((b: any) => ({
      ...b,
      shelfIds: Array.isArray(b.shelfIds) ? b.shelfIds : [],
    })),
    categories:
      Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : seedCategories(),
    shelves: [],
  };
}

function migrateV3(parsed: any): LibraryState {
  // New optional metadata fields (isbn, pages, publishYear, description) just
  // need to be tolerated as undefined on existing books — no transformation.
  return {
    schemaVersion: 4,
    books: parsed.books ?? [],
    categories:
      Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : seedCategories(),
    shelves: Array.isArray(parsed.shelves) ? parsed.shelves : [],
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function load(): LibraryState {
  if (typeof window === "undefined") return emptyLibrary();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLibrary();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;
    if (parsed.schemaVersion === 1) return migrateV1(parsed);
    if (parsed.schemaVersion === 2) return migrateV2(parsed);
    if (parsed.schemaVersion === 3) return migrateV3(parsed);
    if (
      parsed.schemaVersion !== 4 ||
      !Array.isArray(parsed.books) ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.shelves)
    ) {
      return emptyLibrary();
    }
    return {
      schemaVersion: 4,
      books: parsed.books,
      categories: parsed.categories.length ? parsed.categories : seedCategories(),
      shelves: parsed.shelves,
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
