import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Book } from "@/types/book";
import { READING_STATUS_LABEL } from "@/types/book";
import { useLibrary } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CoverImage } from "./CoverImage";
import { ProgressBar } from "./ProgressBar";
import { StarRating } from "./StarRating";
import { BookForm } from "./BookForm";

interface BookDetailProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookDetail({ book, open, onOpenChange }: BookDetailProps) {
  const { state, updateBook, deleteBook } = useLibrary();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");

  const categories = book.categoryIds
    .map((id) => state.categories.find((c) => c.id === id))
    .filter(Boolean) as { id: string; name: string }[];
  const shelves = book.shelfIds
    .map((id) => state.shelves.find((s) => s.id === id))
    .filter(Boolean) as { id: string; name: string }[];

  function close() {
    setMode("view");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMode("view");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        {mode === "edit" ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit book</DialogTitle>
            </DialogHeader>
            <BookForm
              initial={book}
              onSubmit={(input) => {
                updateBook(book.id, input);
                setMode("view");
              }}
              onCancel={() => setMode("view")}
            />
          </>
        ) : mode === "confirm-delete" ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete this book?</DialogTitle>
              <DialogDescription>
                &ldquo;{book.title}&rdquo; will be removed from your library.
                This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMode("view")}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteBook(book.id);
                  close();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{book.title}</DialogTitle>
              <DialogDescription>{book.author}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-4">
              <div className="w-28 shrink-0">
                <CoverImage title={book.title} src={book.coverUrl} />
              </div>
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                  <Badge variant="outline">
                    {READING_STATUS_LABEL[book.status]}
                  </Badge>
                </div>
                {book.status === "reading" &&
                  typeof book.progress === "number" && (
                    <ProgressBar value={book.progress} showLabel />
                  )}
                {book.rating !== undefined && (
                  <StarRating value={book.rating} readOnly size="sm" />
                )}
                {shelves.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {shelves.map((s) => (
                      <Badge key={s.id} variant="outline" className="font-normal">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Metadata facts */}
            {(book.pages !== undefined ||
              book.publishYear !== undefined ||
              book.isbn) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {book.publishYear !== undefined && (
                  <span>
                    <span className="font-medium text-foreground">{book.publishYear}</span>
                    <span className="ml-1">published</span>
                  </span>
                )}
                {book.pages !== undefined && (
                  <span>
                    <span className="font-medium text-foreground">{book.pages}</span>
                    <span className="ml-1">pages</span>
                  </span>
                )}
                {book.isbn && (
                  <span>
                    <span className="font-medium text-foreground">ISBN</span>
                    <span className="ml-1">{book.isbn}</span>
                  </span>
                )}
              </div>
            )}

            {/* Description (from Open Library) */}
            {book.description && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  About
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {book.description}
                </p>
              </div>
            )}

            {book.notes && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {book.notes}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setMode("confirm-delete")}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button onClick={() => setMode("edit")}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
