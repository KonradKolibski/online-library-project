import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Book, Category, LibraryState } from "@/types/book";
import { newId } from "@/lib/id";
import { load, save, UNCATEGORIZED_NAME } from "@/lib/storage";

type Action =
  | { type: "hydrate"; state: LibraryState }
  | { type: "addBook"; input: BookInput }
  | { type: "updateBook"; id: string; patch: Partial<BookInput> }
  | { type: "deleteBook"; id: string }
  | { type: "addCategory"; name: string }
  | { type: "renameCategory"; id: string; name: string }
  | { type: "deleteCategory"; id: string };

export type BookInput = Omit<Book, "id" | "createdAt" | "updatedAt">;

const initialState: LibraryState = {
  schemaVersion: 1,
  books: [],
  categories: [],
};

function ensureUncategorized(categories: Category[]): { id: string; categories: Category[] } {
  const found = categories.find((c) => c.name === UNCATEGORIZED_NAME);
  if (found) return { id: found.id, categories };
  const fallback: Category = { id: newId(), name: UNCATEGORIZED_NAME };
  return { id: fallback.id, categories: [...categories, fallback] };
}

function reducer(state: LibraryState, action: Action): LibraryState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "addBook": {
      const now = new Date().toISOString();
      const book: Book = { id: newId(), createdAt: now, updatedAt: now, ...action.input };
      return { ...state, books: [book, ...state.books] };
    }
    case "updateBook": {
      const now = new Date().toISOString();
      return {
        ...state,
        books: state.books.map((b) =>
          b.id === action.id ? { ...b, ...action.patch, updatedAt: now } : b,
        ),
      };
    }
    case "deleteBook":
      return { ...state, books: state.books.filter((b) => b.id !== action.id) };
    case "addCategory": {
      const name = action.name.trim();
      if (!name) return state;
      const exists = state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
      if (exists) return state;
      return { ...state, categories: [...state.categories, { id: newId(), name }] };
    }
    case "renameCategory": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.id ? { ...c, name } : c)),
      };
    }
    case "deleteCategory": {
      const remaining = state.categories.filter((c) => c.id !== action.id);
      const booksUsingIt = state.books.some((b) => b.categoryId === action.id);
      if (!booksUsingIt) {
        return { ...state, categories: remaining };
      }
      const { id: fallbackId, categories: withFallback } = ensureUncategorized(remaining);
      return {
        ...state,
        categories: withFallback,
        books: state.books.map((b) =>
          b.categoryId === action.id ? { ...b, categoryId: fallbackId } : b,
        ),
      };
    }
    default:
      return state;
  }
}

interface LibraryContextValue {
  state: LibraryState;
  addBook: (input: BookInput) => void;
  updateBook: (id: string, patch: Partial<BookInput>) => void;
  deleteBook: (id: string) => void;
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  categoryById: (id: string) => Category | undefined;
  allTags: string[];
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "hydrate", state: load() });
  }, []);

  useEffect(() => {
    if (state.categories.length === 0 && state.books.length === 0) return;
    save(state);
  }, [state]);

  const value = useMemo<LibraryContextValue>(() => {
    const categoryMap = new Map(state.categories.map((c) => [c.id, c]));
    const tagSet = new Set<string>();
    state.books.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
    return {
      state,
      addBook: (input) => dispatch({ type: "addBook", input }),
      updateBook: (id, patch) => dispatch({ type: "updateBook", id, patch }),
      deleteBook: (id) => dispatch({ type: "deleteBook", id }),
      addCategory: (name) => dispatch({ type: "addCategory", name }),
      renameCategory: (id, name) => dispatch({ type: "renameCategory", id, name }),
      deleteCategory: (id) => dispatch({ type: "deleteCategory", id }),
      categoryById: (id) => categoryMap.get(id),
      allTags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
    };
  }, [state]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside a LibraryProvider");
  return ctx;
}
