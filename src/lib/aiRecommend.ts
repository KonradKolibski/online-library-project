import { supabase } from "@/lib/supabase";
import {
  detectUserLanguage,
  searchBooksMultiSource,
  type OpenLibrarySuggestion,
} from "@/lib/openLibrary";
import type { Book, Category } from "@/types/book";

/** One turn of the recommendation conversation. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** A raw book recommendation as returned by Grok. */
export interface AiRecommendation {
  title: string;
  author: string;
  reason: string;
}

/** The structured response from the `ai-recommend` edge function. */
export interface AiReply {
  reply: string;
  books: AiRecommendation[];
}

/** A recommendation enriched with cover/metadata + library membership. */
export interface ResolvedRecommendation extends AiRecommendation {
  coverUrl?: string;
  isbn?: string;
  pages?: number;
  publishYear?: number;
  description?: string;
  /** True when a book with this title already exists in the user's library. */
  inLibrary: boolean;
}

/** Compact projection of a library book sent to the model as the user's profile. */
interface CompactBook {
  title: string;
  author: string;
  status?: string;
  rating?: number;
  categories?: string[];
  pages?: number;
  publishYear?: number;
}

function toCompactBook(book: Book, categoryName: (id: string) => string | undefined): CompactBook {
  const categories = book.categoryIds
    .map(categoryName)
    .filter((n): n is string => Boolean(n));
  return {
    title: book.title,
    author: book.author,
    status: book.status,
    rating: book.rating,
    categories: categories.length ? categories : undefined,
    pages: book.pages,
    publishYear: book.publishYear,
  };
}

/**
 * Ask Grok (via the `ai-recommend` edge function) for book recommendations
 * grounded in the user's library. Throws on transport/server errors so the UI
 * can show an error bubble.
 */
export async function askRecommendations(
  messages: ChatTurn[],
  books: Book[],
  categories: Category[],
): Promise<AiReply> {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const profile = books.map((b) => toCompactBook(b, (id) => categoryMap.get(id)));

  const { data, error } = await supabase.functions.invoke<AiReply & { error?: string }>(
    "ai-recommend",
    { body: { messages, profile } },
  );

  if (error) {
    throw new Error(error.message || "Failed to reach the recommendation service.");
  }
  if (!data || data.error) {
    throw new Error(data?.error || "The recommendation service returned no data.");
  }
  return { reply: data.reply ?? "", books: Array.isArray(data.books) ? data.books : [] };
}

/**
 * Best-effort cover/metadata lookup for a recommendation, reusing the same
 * Open Library / Google Books search the Add Book flow uses. Falls back to the
 * bare recommendation (no cover) when nothing matches.
 */
export async function resolveRecommendation(
  rec: AiRecommendation,
  ownedTitles: Set<string>,
): Promise<ResolvedRecommendation> {
  const inLibrary = ownedTitles.has(rec.title.trim().toLowerCase());
  const base: ResolvedRecommendation = { ...rec, inLibrary };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let hits: OpenLibrarySuggestion[];
    try {
      hits = await searchBooksMultiSource(
        `${rec.title} ${rec.author}`,
        controller.signal,
        detectUserLanguage(),
      );
    } finally {
      clearTimeout(timer);
    }
    const hit = hits[0];
    if (!hit) return base;
    return {
      ...base,
      coverUrl: hit.coverUrl,
      isbn: hit.isbn,
      pages: hit.pages,
      publishYear: hit.publishYear,
      description: hit.description,
    };
  } catch {
    return base;
  }
}
