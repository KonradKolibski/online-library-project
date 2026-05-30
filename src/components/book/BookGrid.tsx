import type { Book } from "@/types/book";
import { BookCard } from "./BookCard";

interface BookGridProps {
  books: Book[];
  onSelect: (book: Book) => void;
}

export function BookGrid({ books, onSelect }: BookGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {books.map((b) => (
        <BookCard key={b.id} book={b} onClick={() => onSelect(b)} />
      ))}
    </div>
  );
}
