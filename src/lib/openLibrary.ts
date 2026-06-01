/**
 * Thin wrapper around the Open Library APIs.
 * Docs: https://openlibrary.org/developers/api
 */

export interface OpenLibrarySuggestion {
  /** Either an Open Library work key ("/works/OL...") or a Google volume id. */
  key: string;
  title: string;
  /** First author from the search response. */
  author?: string;
  publishYear?: number;
  pages?: number;
  isbn?: string;
  /** Pre-built cover URL (medium) — undefined when no cover is available. */
  coverUrl?: string;
  /** Raw cover id for callers that want a different size (OL only). */
  coverId?: number;
  /** Language codes the book is available in. */
  languages?: string[];
  /**
   * Description / synopsis — pre-filled for Google-sourced results. For
   * Open-Library-sourced results, callers fetch it separately via
   * `fetchWorkDescription`.
   */
  description?: string;
}

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVERS_URL = "https://covers.openlibrary.org/b/id";
const WORKS_URL = "https://openlibrary.org";

/** ISO 639-1 (browser) → ISO 639-2 (Open Library) for the most common locales. */
const LANG_MAP: Record<string, string> = {
  pl: "pol",
  en: "eng",
  de: "ger",
  fr: "fre",
  es: "spa",
  it: "ita",
  pt: "por",
  nl: "dut",
  ru: "rus",
  uk: "ukr",
  cs: "cze",
  sk: "slo",
  hu: "hun",
  ro: "rum",
  sv: "swe",
  da: "dan",
  no: "nor",
  fi: "fin",
  ja: "jpn",
  ko: "kor",
  zh: "chi",
  ar: "ara",
  he: "heb",
  tr: "tur",
  el: "gre",
};

/**
 * Detects the user's preferred Open Library language code from
 * `navigator.language` (e.g. "pl-PL" → "pol"). Returns undefined when the
 * locale isn't in our small mapping table — in which case ranking is skipped.
 */
export function detectUserLanguage(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const code = navigator.language.split("-")[0]?.toLowerCase();
  return code ? LANG_MAP[code] : undefined;
}

interface RawEdition {
  title?: string;
  cover_i?: number;
  publish_date?: string;
  number_of_pages?: number;
  isbn?: string[];
}

interface RawEditionsField {
  numFound?: number;
  docs?: RawEdition[];
}

interface RawSearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  language?: string[];
  editions?: RawEditionsField;
}

interface RawSearchResponse {
  docs?: RawSearchDoc[];
}

/** Build a cover URL for a given Open Library cover id. */
export function coverUrl(coverId: number, size: "S" | "M" | "L" = "L"): string {
  return `${COVERS_URL}/${coverId}-${size}.jpg`;
}

const MAX_SUGGESTIONS = 8;

function yearFromDate(d?: string): number | undefined {
  if (!d) return undefined;
  const m = d.match(/\d{4}/);
  return m ? Number(m[0]) : undefined;
}

async function runSearch(
  q: string,
  signal: AbortSignal,
): Promise<OpenLibrarySuggestion[]> {
  const params = new URLSearchParams({
    q,
    limit: String(MAX_SUGGESTIONS),
    fields:
      "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,language",
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`);
  const data = (await res.json()) as RawSearchResponse;

  return (data.docs ?? []).map((d): OpenLibrarySuggestion => {
    const firstIsbn = Array.isArray(d.isbn) && d.isbn.length ? d.isbn[0] : undefined;
    return {
      key: d.key,
      title: d.title,
      author: d.author_name?.[0],
      publishYear: d.first_publish_year,
      pages: d.number_of_pages_median,
      isbn: firstIsbn,
      coverId: d.cover_i,
      coverUrl: d.cover_i ? coverUrl(d.cover_i, "L") : undefined,
      languages: d.language,
    };
  });
}

interface RawEditionDoc {
  title?: string;
  covers?: number[];
  publish_date?: string;
  number_of_pages?: number;
  isbn_13?: string[];
  isbn_10?: string[];
  languages?: { key: string }[]; // e.g. [{ key: "/languages/pol" }]
}

interface RawEditionsList {
  entries?: RawEditionDoc[];
}

/**
 * Pull the first edition of a work that matches `preferredLanguage` from the
 * dedicated `/works/{key}/editions.json` endpoint. Returns undefined if no
 * matching edition is found (or if the call fails).
 *
 * Used to enrich a search result with the user's localised title / cover / etc.
 */
export async function fetchLocalisedEdition(
  workKey: string,
  preferredLanguage: string,
  signal: AbortSignal,
): Promise<
  | {
      title?: string;
      coverId?: number;
      publishYear?: number;
      pages?: number;
      isbn?: string;
    }
  | undefined
> {
  const url = `${WORKS_URL}${workKey}/editions.json?limit=50`;
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch {
    return undefined;
  }
  if (!res.ok) return undefined;
  const data = (await res.json()) as RawEditionsList;
  const langKey = `/languages/${preferredLanguage}`;
  const match = data.entries?.find((e) =>
    e.languages?.some((l) => l.key === langKey),
  );
  if (!match) return undefined;
  const isbn = match.isbn_13?.[0] ?? match.isbn_10?.[0];
  return {
    title: match.title,
    coverId: match.covers?.[0],
    publishYear: yearFromDate(match.publish_date),
    pages: match.number_of_pages,
    isbn,
  };
}

/**
 * Search Open Library by free-text query.
 *
 * When `preferredLanguage` is provided (ISO 639-2, e.g. "pol"), we first
 * issue a hard-filtered query (`language:pol`) so the user sees results that
 * have an edition in their language. If that returns nothing, we fall back
 * to an unfiltered search so obscure / English-only titles are still findable.
 *
 * Throws if the response is non-2xx; aborts cleanly when the signal fires.
 */
export async function searchBooks(
  query: string,
  signal: AbortSignal,
  preferredLanguage?: string,
): Promise<OpenLibrarySuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (preferredLanguage) {
    const filtered = await runSearch(
      `${trimmed} language:${preferredLanguage}`,
      signal,
    );
    if (signal.aborted) return [];

    if (filtered.length > 0) {
      // Enrich each result with the Polish edition's title / cover / pages / ISBN,
      // running all lookups in parallel. Any individual failure falls back silently
      // to the work-level data already in the suggestion.
      const enriched = await Promise.all(
        filtered.map(async (s) => {
          const edition = await fetchLocalisedEdition(
            s.key,
            preferredLanguage,
            signal,
          );
          if (!edition) return s;
          return {
            ...s,
            title: edition.title ?? s.title,
            coverId: edition.coverId ?? s.coverId,
            coverUrl: edition.coverId
              ? coverUrl(edition.coverId, "L")
              : s.coverUrl,
            publishYear: edition.publishYear ?? s.publishYear,
            pages: edition.pages ?? s.pages,
            isbn: edition.isbn ?? s.isbn,
          };
        }),
      );
      return enriched;
    }
    // No language-matching books — fall back to a plain global search
    return runSearch(trimmed, signal);
  }

  return runSearch(trimmed, signal);
}

interface RawWork {
  description?: string | { value?: string };
}

/**
 * Fetch a Work's description. Open Library returns description as either
 * a plain string or an object `{ value: string, type: ... }`.
 * Returns undefined if no description is present.
 */
export async function fetchWorkDescription(
  workKey: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  // Only Open Library work keys are supported. Google volume ids would 404.
  if (!workKey.startsWith("/works/")) return undefined;
  const url = `${WORKS_URL}${workKey}.json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Library work fetch failed: ${res.status}`);
  const data = (await res.json()) as RawWork;
  if (!data.description) return undefined;
  if (typeof data.description === "string") return data.description;
  return data.description.value;
}

// ─── Google Books ────────────────────────────────────────────────────────────

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as
  | string
  | undefined;

/** ISO 639-2 → ISO 639-1 — Google Books uses 2-letter codes for `langRestrict`. */
const GOOGLE_LANG_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LANG_MAP).map(([short, long]) => [long, short]),
);

interface GoogleIdentifier {
  type: string;
  identifier: string;
}

interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  industryIdentifiers?: GoogleIdentifier[];
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string;
}

interface GoogleVolume {
  id: string;
  volumeInfo: GoogleVolumeInfo;
}

interface GoogleVolumesResponse {
  totalItems?: number;
  items?: GoogleVolume[];
}

function cleanGoogleImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  // HTTPS-upgrade and remove the dated "page curl" effect.
  return url.replace(/^http:\/\//i, "https://").replace(/&edge=curl/, "");
}

function pickIsbn(ids?: GoogleIdentifier[]): string | undefined {
  if (!ids) return undefined;
  return (
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier
  );
}

async function searchGoogleBooks(
  query: string,
  signal: AbortSignal,
  langRestrict?: string,
): Promise<OpenLibrarySuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(MAX_SUGGESTIONS),
    // Ask Google for only the fields we use — smaller payload.
    fields:
      "items(id,volumeInfo(title,authors,publishedDate,description,pageCount,industryIdentifiers,imageLinks/thumbnail,language))",
  });
  if (langRestrict) params.set("langRestrict", langRestrict);
  if (GOOGLE_BOOKS_API_KEY) params.set("key", GOOGLE_BOOKS_API_KEY);

  const res = await fetch(`${GOOGLE_BOOKS_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Google Books search failed: ${res.status}`);
  const data = (await res.json()) as GoogleVolumesResponse;

  return (data.items ?? []).map((v): OpenLibrarySuggestion => {
    const info = v.volumeInfo;
    const isbn = pickIsbn(info.industryIdentifiers);
    const googleCover = cleanGoogleImageUrl(info.imageLinks?.thumbnail);
    // Google's own thumbnail is the most reliable cover for its own results.
    // Only fall back to Open Library by ISBN when Google has none — and use
    // `?default=false` so OL returns a true 404 instead of a placeholder image
    // we'd otherwise mistake for a real cover.
    const olCoverFromIsbn = isbn
      ? `${COVERS_URL.replace("/b/id", "/b/isbn")}/${isbn}-L.jpg?default=false`
      : undefined;
    return {
      key: v.id, // Google volume id — distinct namespace from "/works/..."
      title: info.title ?? "Untitled",
      author: info.authors?.[0],
      publishYear: yearFromDate(info.publishedDate),
      pages: info.pageCount,
      isbn,
      coverUrl: googleCover ?? olCoverFromIsbn,
      languages: info.language ? [info.language] : undefined,
      description: info.description,
    };
  });
}

/**
 * Look up a single book by ISBN. Uses Google Books (`q=isbn:...`) — accurate
 * for both ISBN-10 and ISBN-13. Returns the first match, or undefined if no
 * volume is found. Non-2xx and abort errors propagate to the caller.
 */
export async function searchByIsbn(
  isbn: string,
  signal: AbortSignal,
): Promise<OpenLibrarySuggestion | undefined> {
  const cleaned = isbn.replace(/[^\dXx]/g, "");
  if (!cleaned) return undefined;
  const results = await searchGoogleBooks(`isbn:${cleaned}`, signal);
  return results[0];
}

// ─── Multi-source search ─────────────────────────────────────────────────────

/**
 * Primary autocomplete entry point. Tries Google Books first (best Polish
 * coverage; localised titles), retries unrestricted when no language-matching
 * results are found, and falls back to Open Library on error.
 *
 * `preferredLanguage` is an ISO 639-2 code (e.g. "pol") — same format as
 * returned by `detectUserLanguage`.
 */
export async function searchBooksMultiSource(
  query: string,
  signal: AbortSignal,
  preferredLanguage?: string,
): Promise<OpenLibrarySuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const langShort = preferredLanguage ? GOOGLE_LANG_MAP[preferredLanguage] : undefined;

  // 1) Google Books — primary (best Polish coverage, localised titles)
  try {
    if (langShort) {
      const restricted = await searchGoogleBooks(trimmed, signal, langShort);
      if (signal.aborted) return [];
      if (restricted.length > 0) return restricted;
      // No results in user's language — try unrestricted Google before falling
      // through to Open Library.
      const unrestricted = await searchGoogleBooks(trimmed, signal);
      if (signal.aborted) return [];
      if (unrestricted.length > 0) return unrestricted;
    } else {
      const results = await searchGoogleBooks(trimmed, signal);
      if (signal.aborted) return [];
      if (results.length > 0) return results;
    }
  } catch (err) {
    if (signal.aborted) return [];
    if (err instanceof DOMException && err.name === "AbortError") return [];
    // Google failed (quota, network, 5xx) — fall through to OL
  }

  if (signal.aborted) return [];

  // 2) Open Library — fallback when Google returns nothing or errors out
  try {
    return await searchBooks(trimmed, signal, preferredLanguage);
  } catch {
    return [];
  }
}
