export type ReadingStatus = "to-read" | "reading" | "finished";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  categoryIds: string[];
  shelfIds: string[];
  status: ReadingStatus;
  progress?: number;
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Shelf {
  id: string;
  name: string;
  /** Optional hex colour used for the dot indicator. */
  color?: string;
}

export interface LibraryState {
  schemaVersion: 3;
  books: Book[];
  categories: Category[];
  shelves: Shelf[];
}

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  "to-read": "To read",
  reading: "Reading",
  finished: "Finished",
};
