import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookForm } from "@/components/book/BookForm";
import { useLibrary } from "@/store/library";

interface AddBookContextValue {
  /** Open the Add Book dialog. Optionally pre-select shelves on the new book. */
  openAddBook: (opts?: { initialShelfIds?: string[] }) => void;
}

const AddBookContext = createContext<AddBookContextValue | null>(null);

/**
 * Wraps the app with an always-mounted Add Book dialog and exposes a single
 * `openAddBook` trigger. Lets every screen — and the global FAB on the bottom
 * nav — open the same dialog without each one owning a local copy.
 */
export function AddBookProvider({ children }: { children: ReactNode }) {
  const { addBook } = useLibrary();
  const [open, setOpen] = useState(false);
  const [initialShelfIds, setInitialShelfIds] = useState<string[]>([]);

  const openAddBook = useCallback<AddBookContextValue["openAddBook"]>(
    (opts) => {
      setInitialShelfIds(opts?.initialShelfIds ?? []);
      setOpen(true);
    },
    [],
  );

  return (
    <AddBookContext.Provider value={{ openAddBook }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Add a book</DialogTitle>
          </DialogHeader>
          <BookForm
            initialShelfIds={initialShelfIds}
            onSubmit={(input) => {
              addBook(input);
              setOpen(false);
            }}
            onAddAnother={(input) => {
              addBook(input);
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </AddBookContext.Provider>
  );
}

export function useAddBook(): AddBookContextValue {
  const ctx = useContext(AddBookContext);
  if (!ctx) throw new Error("useAddBook must be used inside an AddBookProvider");
  return ctx;
}
