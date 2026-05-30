export type ReadingStatus = "to-read" | "reading" | "finished";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  tags: string[];
  categoryId: string;
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

export interface LibraryState {
  schemaVersion: 1;
  books: Book[];
  categories: Category[];
}

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  "to-read": "To read",
  reading: "Reading",
  finished: "Finished",
};
