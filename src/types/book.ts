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
  /** Metadata imported from Open Library (or set manually) */
  isbn?: string;
  pages?: number;
  publishYear?: number;
  description?: string;
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

export type SessionMood =
  | "happy"
  | "thoughtful"
  | "moved"
  | "motivated"
  | "bored";

export interface SessionBookProgress {
  bookId: string;
  /** Progress percentage AFTER this reading session (0–100). */
  newProgress: number;
}

export interface ReadingSession {
  id: string;
  /** Local-time YYYY-MM-DD, NOT a full ISO timestamp. The strip groups by day
   *  so anything finer would just complicate lookups. */
  date: string;
  bookProgresses: SessionBookProgress[];
  /** Minutes read in this session, optional. */
  minutes?: number;
  /** How the session felt — drives the future streak/check-in surfaces. */
  mood?: SessionMood;
  /** Free-form thoughts. */
  notes?: string;
  /** Optional "commonplace book" quote. */
  quote?: string;
  quotePage?: number;
  /** When the entry was logged (for audit; date drives the calendar). */
  createdAt: string;
}

export interface LibraryState {
  schemaVersion: 5;
  books: Book[];
  categories: Category[];
  shelves: Shelf[];
  sessions: ReadingSession[];
}

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  "to-read": "To read",
  reading: "Reading",
  finished: "Finished",
};
