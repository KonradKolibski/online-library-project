import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import {
  detectUserLanguage,
  searchBooksMultiSource,
  type OpenLibrarySuggestion,
} from "@/lib/openLibrary";
import { cn } from "@/lib/utils";

export interface OpenLibraryPick {
  title: string;
  author?: string;
  coverUrl?: string;
  pages?: number;
  publishYear?: number;
  isbn?: string;
  /**
   * Open Library work key ("/works/...") or Google volume id. The caller may
   * try to fetch a description with this key; only OL work keys will succeed,
   * Google-sourced picks already include the description below.
   */
  workKey: string;
  /** Pre-fetched description when the source is Google Books. */
  description?: string;
}

interface OpenLibraryTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called when the user picks a suggestion. Fires synchronously with the
   * search-result fields. The caller is responsible for fetching the
   * description with `workKey` if desired.
   */
  onPick: (pick: OpenLibraryPick) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

export function OpenLibraryTitleInput({
  value,
  onChange,
  onPick,
  id,
  required,
  placeholder,
}: OpenLibraryTitleInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Detect user's preferred Open Library language code once on mount.
  const userLang = useMemo(() => detectUserLanguage(), []);

  const debouncedValue = useDebounced(value, DEBOUNCE_MS);

  const [suggestions, setSuggestions] = useState<OpenLibrarySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** Per-row keys whose <img> failed to load — we render the icon instead. */
  const [brokenCovers, setBrokenCovers] = useState<Set<string>>(new Set());
  /** Tracks the title we just picked, so we don't re-search on its echo */
  const lastPickedTitleRef = useRef<string | null>(null);

  // --- Cleanup on unmount: abort any in-flight request ---
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // --- Search on debounced value ---
  useEffect(() => {
    const q = debouncedValue.trim();

    // Avoid re-querying for the just-picked title
    if (lastPickedTitleRef.current && q === lastPickedTitleRef.current) {
      return;
    }

    // Cancel any earlier in-flight request
    abortRef.current?.abort();

    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      setErrored(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setErrored(false);

    searchBooksMultiSource(q, controller.signal, userLang)
      .then((results) => {
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setBrokenCovers(new Set());
        setActiveIndex(-1);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
        setErrored(true);
        setLoading(false);
      });
  }, [debouncedValue, userLang]);

  // --- Auto-open when results, loading or error become available ---
  useEffect(() => {
    if (!inputRef.current) return;
    const focused = document.activeElement === inputRef.current;
    if (!focused) return;
    if (suggestions.length > 0 || loading || errored) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [suggestions, loading, errored]);

  // --- Outside click ---
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function handlePick(s: OpenLibrarySuggestion) {
    abortRef.current?.abort();
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    lastPickedTitleRef.current = s.title;
    onPick({
      title: s.title,
      author: s.author,
      coverUrl: s.coverUrl,
      pages: s.pages,
      publishYear: s.publishYear,
      isbn: s.isbn,
      workKey: s.key,
      description: s.description,
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handlePick(suggestions[activeIndex]);
    }
  }

  const showDropdown =
    open && (suggestions.length > 0 || loading || errored ||
      (debouncedValue.trim().length >= MIN_QUERY));

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        required={required}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          lastPickedTitleRef.current = null;
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0 || loading || errored) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className="pr-9"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
      )}

      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-1 rounded-xl border border-input bg-popover shadow-md overflow-y-auto max-h-80"
          // Prevent input blur from closing the dropdown before the click registers
          onMouseDown={(e) => e.preventDefault()}
        >
          {errored && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              Couldn&apos;t reach Open Library. You can still fill the form manually.
            </div>
          )}

          {!errored && loading && suggestions.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching Open Library…
            </div>
          )}

          {!errored &&
            !loading &&
            suggestions.length === 0 &&
            debouncedValue.trim().length >= MIN_QUERY && (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No matches. Keep typing or fill the form manually.
              </div>
            )}

          {suggestions.map((s, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={`${s.key}-${idx}`}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handlePick(s)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2 text-left transition-colors",
                  active ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <div className="w-9 h-[54px] shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {s.coverUrl && !brokenCovers.has(s.key) ? (
                    <img
                      src={s.coverUrl}
                      alt=""
                      loading="lazy"
                      onError={() =>
                        setBrokenCovers((prev) => {
                          if (prev.has(s.key)) return prev;
                          const next = new Set(prev);
                          next.add(s.key);
                          return next;
                        })
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-sm font-medium leading-tight line-clamp-1">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {s.author ?? "Unknown author"}
                    {s.publishYear ? ` · ${s.publishYear}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
