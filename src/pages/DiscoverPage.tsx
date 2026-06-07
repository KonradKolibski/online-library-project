import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Check, Plus, Loader2, BookOpen } from "lucide-react";
import { useLibrary } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  askRecommendations,
  resolveRecommendation,
  type ChatTurn,
  type ResolvedRecommendation,
} from "@/lib/aiRecommend";

interface ChatMessage extends ChatTurn {
  /** Resolved book cards attached to an assistant turn. */
  books?: ResolvedRecommendation[];
  /** True while this assistant turn's books are still being looked up. */
  resolving?: boolean;
}

const EXAMPLE_PROMPTS = [
  "Give me top 10 fantasy books that suit my profile",
  "Short non-fiction like what I've finished",
  "Something cosy for a rainy weekend",
  "Standalone sci-fi, no series",
];

export function DiscoverPage() {
  const { state, addBook } = useLibrary();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Titles already in the library — used to flag/disable "Add" on recs.
  const ownedTitles = useMemo(
    () => new Set(state.books.map((b) => b.title.trim().toLowerCase())),
    [state.books],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    setError(null);
    setInput("");
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    setLoading(true);

    try {
      const turns: ChatTurn[] = history.map((m) => ({ role: m.role, content: m.content }));
      const reply = await askRecommendations(turns, state.books, state.categories);

      // Show the text reply immediately, then resolve covers in the background.
      const assistantIndex = history.length;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.reply, books: [], resolving: reply.books.length > 0 },
      ]);

      if (reply.books.length > 0) {
        const resolved = await Promise.all(
          reply.books.map((b) => resolveRecommendation(b, ownedTitles)),
        );
        setMessages((prev) => {
          const next = [...prev];
          if (next[assistantIndex]) {
            next[assistantIndex] = { ...next[assistantIndex], books: resolved, resolving: false };
          }
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(rec: ResolvedRecommendation) {
    addBook({
      title: rec.title,
      author: rec.author,
      coverUrl: rec.coverUrl,
      categoryIds: [],
      shelfIds: [],
      status: "to-read",
      isbn: rec.isbn,
      pages: rec.pages,
      publishYear: rec.publishYear,
      description: rec.description,
    });
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-8rem)]">
      <div className="flex items-center gap-2 pb-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight leading-tight">Discover</h2>
          <p className="text-xs text-muted-foreground">
            Ask for recommendations tailored to your library.
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
            <div className="rounded-2xl bg-primary/10 p-5 text-primary">
              <BookOpen className="h-10 w-10" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Tell me what you feel like reading and I&apos;ll suggest books that fit your taste —
              based on what&apos;s already on your shelves.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-full border border-input bg-background px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col gap-3">
                {m.content && (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm">
                    {m.content}
                  </div>
                )}
                {m.resolving && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding covers…
                  </p>
                )}
                {m.books && m.books.length > 0 && (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {m.books.map((rec, j) => (
                      <RecommendationCard
                        key={`${rec.title}-${j}`}
                        rec={rec}
                        owned={ownedTitles.has(rec.title.trim().toLowerCase())}
                        onAdd={() => handleAdd(rec)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ),
          )
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Grok is thinking…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        className="flex items-center gap-2 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a recommendation…"
          disabled={loading}
          aria-label="Ask for a recommendation"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function RecommendationCard({
  rec,
  owned,
  onAdd,
}: {
  rec: ResolvedRecommendation;
  owned: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {rec.coverUrl ? (
          <img src={rec.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[9px] font-medium leading-tight text-muted-foreground">
            {rec.title}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-semibold leading-tight">{rec.title}</p>
        <p className="truncate text-xs text-muted-foreground">{rec.author}</p>
        {rec.reason && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/90">{rec.reason}</p>
        )}
        <div className="mt-auto pt-2">
          {owned ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> In library
            </span>
          ) : (
            <Button size="sm" variant="outline" onClick={onAdd} className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add to library
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
