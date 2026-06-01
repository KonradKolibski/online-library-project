import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Book, Category, LibraryState, Shelf } from "@/types/book";
import { newId } from "@/lib/id";
import { load, save } from "@/lib/storage";

type Action =
  | { type: "hydrate"; state: LibraryState }
  | { type: "addBook"; input: BookInput }
  | { type: "updateBook"; id: string; patch: Partial<BookInput> }
  | { type: "deleteBook"; id: string }
  | { type: "addCategory"; id: string; name: string }
  | { type: "renameCategory"; id: string; name: string }
  | { type: "deleteCategory"; id: string }
  | { type: "addShelf"; id: string; name: string; color?: string }
  | { type: "renameShelf"; id: string; name: string }
  | { type: "setShelfColor"; id: string; color: string | undefined }
  | { type: "deleteShelf"; id: string }
  | { type: "importState"; state: LibraryState }
  | { type: "clearAll" };

export type BookInput = Omit<Book, "id" | "createdAt" | "updatedAt">;

const initialState: LibraryState = {
  schemaVersion: 4,
  books: [],
  categories: [],
  shelves: [],
};

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
      const exists = state.categories.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) return state;
      return {
        ...state,
        categories: [...state.categories, { id: action.id, name }],
      };
    }
    case "renameCategory": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, name } : c,
        ),
      };
    }
    case "deleteCategory": {
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        books: state.books.map((b) => ({
          ...b,
          categoryIds: b.categoryIds.filter((id) => id !== action.id),
        })),
      };
    }
    case "addShelf": {
      const name = action.name.trim();
      if (!name) return state;
      const exists = state.shelves.some(
        (s) => s.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) return state;
      return {
        ...state,
        shelves: [...state.shelves, { id: action.id, name, color: action.color }],
      };
    }
    case "renameShelf": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        shelves: state.shelves.map((s) => (s.id === action.id ? { ...s, name } : s)),
      };
    }
    case "setShelfColor": {
      return {
        ...state,
        shelves: state.shelves.map((s) =>
          s.id === action.id ? { ...s, color: action.color } : s,
        ),
      };
    }
    case "deleteShelf": {
      return {
        ...state,
        shelves: state.shelves.filter((s) => s.id !== action.id),
        books: state.books.map((b) => ({
          ...b,
          shelfIds: b.shelfIds.filter((id) => id !== action.id),
        })),
      };
    }
    case "importState":
      return action.state;
    case "clearAll":
      return { ...initialState, schemaVersion: 4, categories: [], shelves: [] };
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
  /** Creates a new category (or returns the existing one's id if name matches) and returns its id. */
  addCategoryAndGetId: (name: string) => string;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  categoryById: (id: string) => Category | undefined;
  addShelf: (name: string, color?: string) => void;
  /** Creates a new shelf (or returns the existing one's id if name matches) and returns its id. */
  addShelfAndGetId: (name: string, color?: string) => string;
  renameShelf: (id: string, name: string) => void;
  setShelfColor: (id: string, color: string | undefined) => void;
  deleteShelf: (id: string) => void;
  shelfById: (id: string) => Shelf | undefined;
  importState: (state: LibraryState) => void;
  clearAll: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "hydrate", state: load() });
  }, []);

  useEffect(() => {
    if (
      state.categories.length === 0 &&
      state.books.length === 0 &&
      state.shelves.length === 0
    )
      return;
    save(state);
  }, [state]);

  const value = useMemo<LibraryContextValue>(() => {
    const categoryMap = new Map(state.categories.map((c) => [c.id, c]));
    const shelfMap = new Map(state.shelves.map((s) => [s.id, s]));
    return {
      state,
      addBook: (input) => dispatch({ type: "addBook", input }),
      updateBook: (id, patch) => dispatch({ type: "updateBook", id, patch }),
      deleteBook: (id) => dispatch({ type: "deleteBook", id }),
      addCategory: (name) => {
        dispatch({ type: "addCategory", id: newId(), name });
      },
      addCategoryAndGetId: (name) => {
        const trimmed = name.trim();
        const existing = state.categories.find(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) return existing.id;
        const id = newId();
        dispatch({ type: "addCategory", id, name: trimmed });
        return id;
      },
      renameCategory: (id, name) => dispatch({ type: "renameCategory", id, name }),
      deleteCategory: (id) => dispatch({ type: "deleteCategory", id }),
      categoryById: (id) => categoryMap.get(id),
      addShelf: (name, color) => {
        dispatch({ type: "addShelf", id: newId(), name, color });
      },
      addShelfAndGetId: (name, color) => {
        const trimmed = name.trim();
        const existing = state.shelves.find(
          (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) return existing.id;
        const id = newId();
        dispatch({ type: "addShelf", id, name: trimmed, color });
        return id;
      },
      renameShelf: (id, name) => dispatch({ type: "renameShelf", id, name }),
      setShelfColor: (id, color) => dispatch({ type: "setShelfColor", id, color }),
      deleteShelf: (id) => dispatch({ type: "deleteShelf", id }),
      shelfById: (id) => shelfMap.get(id),
      importState: (state) => dispatch({ type: "importState", state }),
      clearAll: () => dispatch({ type: "clearAll" }),
    };
  }, [state]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside a LibraryProvider");
  return ctx;
}
