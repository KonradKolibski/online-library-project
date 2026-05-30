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
  const { categoryById, updateBook, deleteBook } = useLibrary();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");

  const category = categoryById(book.categoryId);

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
                "{book.title}" will be removed from your library. This can't be undone.
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
                  {category && <Badge variant="secondary">{category.name}</Badge>}
                  <Badge variant="outline">{READING_STATUS_LABEL[book.status]}</Badge>
                </div>
                {book.status === "reading" && typeof book.progress === "number" && (
                  <ProgressBar value={book.progress} showLabel />
                )}
                {book.rating !== undefined && (
                  <StarRating value={book.rating} readOnly size="sm" />
                )}
                {book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {book.tags.map((t) => (
                      <Badge key={t} variant="outline" className="font-normal">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {book.notes && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{book.notes}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMode("confirm-delete")}>
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
