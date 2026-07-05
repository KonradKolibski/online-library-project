import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type {
  Book,
  Category,
  LibraryState,
  ReadingSession,
  Shelf,
} from "@/types/book";
import { newId } from "@/lib/id";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { useAuth } from "@/store/auth";
import {
  bookPatchToRow,
  bookToRow,
  emptyLibraryState,
  rowToCategory,
  rowToShelf,
  rowsToBooks,
  rowsToSessions,
  sessionToRow,
} from "@/lib/supabase-mapping";
import { seedCategories } from "@/lib/storage";

type Action =
  | { type: "hydrate"; state: LibraryState }
  | { type: "addBook"; book: Book }
  | { type: "updateBook"; id: string; patch: Partial<BookInput>; updatedAt: string }
  | { type: "deleteBook"; id: string }
  | { type: "addCategory"; category: Category }
  | { type: "renameCategory"; id: string; name: string }
  | { type: "deleteCategory"; id: string }
  | { type: "addShelf"; shelf: Shelf }
  | { type: "renameShelf"; id: string; name: string }
  | { type: "setShelfColor"; id: string; color: string | undefined }
  | { type: "deleteShelf"; id: string }
  | {
      type: "addSession";
      session: ReadingSession;
      bookPatches: BookPatchByID;
      updatedAt: string;
    }
  | { type: "deleteSession"; id: string }
  | { type: "importState"; state: LibraryState }
  | { type: "clearAll" };

export type BookInput = Omit<Book, "id" | "createdAt" | "updatedAt">;
export type SessionInput = Omit<ReadingSession, "id" | "createdAt">;
type BookPatchByID = Record<string, Partial<BookInput>>;

function reducer(state: LibraryState, action: Action): LibraryState {
  switch (action.type) {
    case "hydrate":
    case "importState":
      return action.state;
    case "addBook":
      return { ...state, books: [action.book, ...state.books] };
    case "updateBook":
      return {
        ...state,
        books: state.books.map((b) =>
          b.id === action.id ? { ...b, ...action.patch, updatedAt: action.updatedAt } : b,
        ),
      };
    case "deleteBook":
      return { ...state, books: state.books.filter((b) => b.id !== action.id) };
    case "addCategory":
      if (
        state.categories.some(
          (c) => c.name.toLowerCase() === action.category.name.toLowerCase(),
        )
      )
        return state;
      return { ...state, categories: [...state.categories, action.category] };
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
    case "deleteCategory":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        books: state.books.map((b) => ({
          ...b,
          categoryIds: b.categoryIds.filter((id) => id !== action.id),
        })),
      };
    case "addShelf":
      if (
        state.shelves.some(
          (s) => s.name.toLowerCase() === action.shelf.name.toLowerCase(),
        )
      )
        return state;
      return { ...state, shelves: [...state.shelves, action.shelf] };
    case "renameShelf": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        shelves: state.shelves.map((s) =>
          s.id === action.id ? { ...s, name } : s,
        ),
      };
    }
    case "setShelfColor":
      return {
        ...state,
        shelves: state.shelves.map((s) =>
          s.id === action.id ? { ...s, color: action.color } : s,
        ),
      };
    case "deleteShelf":
      return {
        ...state,
        shelves: state.shelves.filter((s) => s.id !== action.id),
        books: state.books.map((b) => ({
          ...b,
          shelfIds: b.shelfIds.filter((id) => id !== action.id),
        })),
      };
    case "addSession": {
      const patchedBooks = state.books.map((b) => {
        const patch = action.bookPatches[b.id];
        return patch ? { ...b, ...patch, updatedAt: action.updatedAt } : b;
      });
      return {
        ...state,
        books: patchedBooks,
        sessions: [action.session, ...state.sessions],
      };
    }
    case "deleteSession":
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.id),
      };
    case "clearAll":
      return { ...emptyLibraryState };
    default:
      return state;
  }
}

interface LibraryContextValue {
  state: LibraryState;
  loading: boolean;
  addBook: (input: BookInput) => void;
  updateBook: (id: string, patch: Partial<BookInput>) => void;
  deleteBook: (id: string) => void;
  addCategory: (name: string) => void;
  addCategoryAndGetId: (name: string) => string;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  categoryById: (id: string) => Category | undefined;
  addShelf: (name: string, color?: string) => void;
  addShelfAndGetId: (name: string, color?: string) => string;
  renameShelf: (id: string, name: string) => void;
  setShelfColor: (id: string, color: string | undefined) => void;
  deleteShelf: (id: string) => void;
  shelfById: (id: string) => Shelf | undefined;
  addSession: (input: SessionInput) => void;
  deleteSession: (id: string) => void;
  importState: (state: LibraryState) => void;
  clearAll: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function logError(scope: string, err: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[library] ${scope}`, err);
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, dispatch] = useReducer(reducer, emptyLibraryState);
  const loadingRef = useRef(true);

  const fetchAll = useCallback(async (uid: string) => {
    const [
      { data: books, error: e1 },
      { data: shelves, error: e2 },
      { data: categories, error: e3 },
      { data: shelfJoins, error: e4 },
      { data: catJoins, error: e5 },
      { data: sessions, error: e6 },
      { data: progresses, error: e7 },
    ] = await Promise.all([
      supabase.from("books").select("*").eq("user_id", uid).order("updated_at", { ascending: false }),
      supabase.from("shelves").select("*").eq("user_id", uid),
      supabase.from("categories").select("*").eq("user_id", uid),
      supabase.from("book_shelves").select("book_id, shelf_id").eq("user_id", uid),
      supabase.from("book_categories").select("book_id, category_id").eq("user_id", uid),
      supabase.from("reading_sessions").select("*").eq("user_id", uid).order("date", { ascending: false }),
      supabase.from("session_book_progresses").select("session_id, book_id, new_progress").eq("user_id", uid),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7;
    if (err) throw err;
    let cats = (categories ?? []).map(rowToCategory);
    if (cats.length === 0 && (books ?? []).length === 0 && (shelves ?? []).length === 0) {
      const seeded = seedCategories();
      const { error: seedErr } = await supabase
        .from("categories")
        .insert(seeded.map((c) => ({ id: c.id, user_id: uid, name: c.name })));
      if (!seedErr) cats = seeded;
    }
    const nextState: LibraryState = {
      schemaVersion: 5,
      books: rowsToBooks(books ?? [], shelfJoins ?? [], catJoins ?? []),
      shelves: (shelves ?? []).map(rowToShelf),
      categories: cats,
      sessions: rowsToSessions(sessions ?? [], progresses ?? []),
    };
    dispatch({ type: "hydrate", state: nextState });
  }, []);

  useEffect(() => {
    if (!userId) {
      dispatch({ type: "hydrate", state: emptyLibraryState });
      loadingRef.current = false;
      return;
    }
    loadingRef.current = true;
    fetchAll(userId)
      .catch((err) => logError("initial fetch", err))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [userId, fetchAll]);

  const resync = useCallback(() => {
    if (userId) fetchAll(userId).catch((err) => logError("resync", err));
  }, [userId, fetchAll]);

  const value = useMemo<LibraryContextValue>(() => {
    const categoryMap = new Map(state.categories.map((c) => [c.id, c]));
    const shelfMap = new Map(state.shelves.map((s) => [s.id, s]));

    function requireUser(): string | null {
      if (!userId) {
        logError("mutation", "no authenticated user");
        return null;
      }
      return userId;
    }

    async function syncBookJoins(
      bookId: string,
      uid: string,
      shelfIds: string[],
      categoryIds: string[],
    ) {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("book_shelves").delete().eq("book_id", bookId),
        supabase.from("book_categories").delete().eq("book_id", bookId),
      ]);
      if (e1 || e2) throw e1 || e2;
      if (shelfIds.length) {
        const { error } = await supabase.from("book_shelves").insert(
          shelfIds.map((sid) => ({ book_id: bookId, shelf_id: sid, user_id: uid })),
        );
        if (error) throw error;
      }
      if (categoryIds.length) {
        const { error } = await supabase.from("book_categories").insert(
          categoryIds.map((cid) => ({ book_id: bookId, category_id: cid, user_id: uid })),
        );
        if (error) throw error;
      }
    }

    return {
      state,
      loading: loadingRef.current,

      addBook: (input) => {
        const uid = requireUser();
        if (!uid) return;
        const now = new Date().toISOString();
        const book: Book = { id: newId(), createdAt: now, updatedAt: now, ...input };
        dispatch({ type: "addBook", book });
        track("book_added", {
          status: book.status,
          has_isbn: Boolean(book.isbn),
          has_cover: Boolean(book.coverUrl),
          has_pages: typeof book.pages === "number",
        });
        (async () => {
          const { error } = await supabase.from("books").insert(bookToRow(book, uid));
          if (error) throw error;
          await syncBookJoins(book.id, uid, book.shelfIds, book.categoryIds);
        })().catch((err) => {
          logError("addBook", err);
          resync();
        });
      },

      updateBook: (id, patch) => {
        const uid = requireUser();
        if (!uid) return;
        const now = new Date().toISOString();
        dispatch({ type: "updateBook", id, patch, updatedAt: now });
        (async () => {
          const row = { ...bookPatchToRow(patch), updated_at: now };
          const { error } = await supabase.from("books").update(row).eq("id", id);
          if (error) throw error;
          if (patch.shelfIds !== undefined || patch.categoryIds !== undefined) {
            const current = state.books.find((b) => b.id === id);
            const shelfIds = patch.shelfIds ?? current?.shelfIds ?? [];
            const categoryIds = patch.categoryIds ?? current?.categoryIds ?? [];
            await syncBookJoins(id, uid, shelfIds, categoryIds);
          }
        })().catch((err) => {
          logError("updateBook", err);
          resync();
        });
      },

      deleteBook: (id) => {
        if (!requireUser()) return;
        dispatch({ type: "deleteBook", id });
        supabase
          .from("books")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("deleteBook", error);
              resync();
            }
          });
      },

      addCategory: (name) => {
        const uid = requireUser();
        if (!uid) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        if (
          state.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
        )
          return;
        const category: Category = { id: newId(), name: trimmed };
        dispatch({ type: "addCategory", category });
        supabase
          .from("categories")
          .insert({ id: category.id, user_id: uid, name: trimmed })
          .then(({ error }) => {
            if (error) {
              logError("addCategory", error);
              resync();
            }
          });
      },

      addCategoryAndGetId: (name) => {
        const uid = requireUser();
        const trimmed = name.trim();
        const existing = state.categories.find(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) return existing.id;
        const id = newId();
        dispatch({ type: "addCategory", category: { id, name: trimmed } });
        if (uid) {
          supabase
            .from("categories")
            .insert({ id, user_id: uid, name: trimmed })
            .then(({ error }) => {
              if (error) {
                logError("addCategoryAndGetId", error);
                resync();
              }
            });
        }
        return id;
      },

      renameCategory: (id, name) => {
        if (!requireUser()) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        dispatch({ type: "renameCategory", id, name: trimmed });
        supabase
          .from("categories")
          .update({ name: trimmed })
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("renameCategory", error);
              resync();
            }
          });
      },

      deleteCategory: (id) => {
        if (!requireUser()) return;
        dispatch({ type: "deleteCategory", id });
        supabase
          .from("categories")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("deleteCategory", error);
              resync();
            }
          });
      },

      categoryById: (id) => categoryMap.get(id),

      addShelf: (name, color) => {
        const uid = requireUser();
        if (!uid) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        if (state.shelves.some((s) => s.name.toLowerCase() === trimmed.toLowerCase()))
          return;
        const shelf: Shelf = { id: newId(), name: trimmed, color };
        dispatch({ type: "addShelf", shelf });
        supabase
          .from("shelves")
          .insert({ id: shelf.id, user_id: uid, name: trimmed, color: color ?? null })
          .then(({ error }) => {
            if (error) {
              logError("addShelf", error);
              resync();
            }
          });
      },

      addShelfAndGetId: (name, color) => {
        const uid = requireUser();
        const trimmed = name.trim();
        const existing = state.shelves.find(
          (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) return existing.id;
        const id = newId();
        dispatch({ type: "addShelf", shelf: { id, name: trimmed, color } });
        if (uid) {
          supabase
            .from("shelves")
            .insert({ id, user_id: uid, name: trimmed, color: color ?? null })
            .then(({ error }) => {
              if (error) {
                logError("addShelfAndGetId", error);
                resync();
              }
            });
        }
        return id;
      },

      renameShelf: (id, name) => {
        if (!requireUser()) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        dispatch({ type: "renameShelf", id, name: trimmed });
        supabase
          .from("shelves")
          .update({ name: trimmed })
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("renameShelf", error);
              resync();
            }
          });
      },

      setShelfColor: (id, color) => {
        if (!requireUser()) return;
        dispatch({ type: "setShelfColor", id, color });
        supabase
          .from("shelves")
          .update({ color: color ?? null })
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("setShelfColor", error);
              resync();
            }
          });
      },

      deleteShelf: (id) => {
        if (!requireUser()) return;
        dispatch({ type: "deleteShelf", id });
        supabase
          .from("shelves")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("deleteShelf", error);
              resync();
            }
          });
      },

      shelfById: (id) => shelfMap.get(id),

      addSession: (input) => {
        const uid = requireUser();
        if (!uid) return;
        const now = new Date().toISOString();
        const session: ReadingSession = { id: newId(), createdAt: now, ...input };

        const bookPatches: Record<string, Partial<BookInput>> = {};
        for (const { bookId, newProgress } of input.bookProgresses) {
          const book = state.books.find((b) => b.id === bookId);
          if (!book) continue;
          const clamped = Math.max(0, Math.min(100, Math.round(newProgress)));
          const patch: Partial<BookInput> = { progress: clamped };
          if (clamped >= 100) patch.status = "finished";
          else if (book.status === "to-read") patch.status = "reading";
          bookPatches[bookId] = patch;
        }

        dispatch({ type: "addSession", session, bookPatches, updatedAt: now });
        track("reading_session_logged", {
          minutes: input.minutes ?? null,
          mood: input.mood ?? null,
          has_notes: Boolean(input.notes?.trim()),
          has_quote: Boolean(input.quote?.trim()),
          books: input.bookProgresses.length,
          books_finished: Object.values(bookPatches).filter(
            (p) => p.status === "finished",
          ).length,
        });

        (async () => {
          const { error: sErr } = await supabase
            .from("reading_sessions")
            .insert(sessionToRow(session, uid));
          if (sErr) throw sErr;
          if (session.bookProgresses.length) {
            const { error: pErr } = await supabase
              .from("session_book_progresses")
              .insert(
                session.bookProgresses.map((p) => ({
                  session_id: session.id,
                  book_id: p.bookId,
                  user_id: uid,
                  new_progress: Math.max(0, Math.min(100, Math.round(p.newProgress))),
                })),
              );
            if (pErr) throw pErr;
          }
          const patchEntries = Object.entries(bookPatches);
          if (patchEntries.length) {
            await Promise.all(
              patchEntries.map(([id, patch]) =>
                supabase
                  .from("books")
                  .update({ ...bookPatchToRow(patch), updated_at: now })
                  .eq("id", id)
                  .then(({ error }) => {
                    if (error) throw error;
                  }),
              ),
            );
          }
        })().catch((err) => {
          logError("addSession", err);
          resync();
        });
      },

      deleteSession: (id) => {
        if (!requireUser()) return;
        dispatch({ type: "deleteSession", id });
        supabase
          .from("reading_sessions")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              logError("deleteSession", error);
              resync();
            }
          });
      },

      importState: (s) => {
        dispatch({ type: "importState", state: s });
      },

      clearAll: () => {
        const uid = requireUser();
        if (!uid) return;
        dispatch({ type: "clearAll" });
        (async () => {
          const tables = [
            "session_book_progresses",
            "reading_sessions",
            "book_shelves",
            "book_categories",
            "books",
            "shelves",
            "categories",
          ];
          for (const t of tables) {
            const { error } = await supabase.from(t).delete().eq("user_id", uid);
            if (error) throw error;
          }
        })().catch((err) => {
          logError("clearAll", err);
          resync();
        });
      },
    };
  }, [state, userId, resync]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside a LibraryProvider");
  return ctx;
}
