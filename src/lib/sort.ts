import type { Book } from "@/types/book";
import type { SortOption } from "@/components/search/SortSelector";

const STATUS_ORDER: Record<string, number> = {
  "to-read": 1,
  reading: 2,
  finished: 3,
};

export function sortBooks(books: Book[], sortBy: SortOption): Book[] {
  const sorted = [...books];

  switch (sortBy) {
    case "title-asc":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "author-asc":
      sorted.sort((a, b) => a.author.localeCompare(b.author));
      break;
    case "rating-desc":
      sorted.sort((a, b) => {
        const aRating = a.rating ?? 0;
        const bRating = b.rating ?? 0;
        return bRating - aRating;
      });
      break;
    case "date-desc":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "status":
      sorted.sort((a, b) => {
        const aOrder = STATUS_ORDER[a.status] ?? 99;
        const bOrder = STATUS_ORDER[b.status] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.title.localeCompare(b.title);
      });
      break;
  }

  return sorted;
}
