import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiTokenManager } from "@/components/docs/ApiTokenManager";
import { cn } from "@/lib/utils";

interface DocsPageProps {
  onBack: () => void;
}

const BASE = `${import.meta.env.VITE_SUPABASE_URL ?? "https://<project>.supabase.co"}/functions/v1/api`;

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "books", label: "Add books" },
  { id: "library", label: "Library" },
  { id: "sessions", label: "Reading sessions" },
  { id: "recommend", label: "Recommendations" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ── Reusable doc pieces ─────────────────────────────────────────────────────

function Endpoint({ method, path }: { method: string; path: string }) {
  const color =
    method === "GET"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : method === "DELETE"
        ? "bg-red-500/15 text-red-600 dark:text-red-400"
        : "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-sm">
      <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", color)}>{method}</span>
      <span className="truncate">{path}</span>
    </div>
  );
}

function Section({
  id,
  title,
  children,
  refMap,
}: {
  id: SectionId;
  title: string;
  children: React.ReactNode;
  refMap: React.MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  return (
    <section
      id={id}
      ref={(el) => (refMap.current[id] = el)}
      className="scroll-mt-20 space-y-4 border-b border-border/60 pb-10 last:border-0"
    >
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function DocsPage({ onBack }: DocsPageProps) {
  const [active, setActive] = useState<SectionId>("overview");
  const refMap = useRef<Record<string, HTMLElement | null>>({});

  // Highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id as SectionId);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const s of SECTIONS) {
      const el = refMap.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function go(id: SectionId) {
    setActive(id);
    refMap.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">API documentation</h1>
      </div>

      {/* Mobile section selector */}
      <nav className="md:hidden -mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex gap-8">
        {/* Left nav (desktop) */}
        <aside className="hidden md:block w-52 shrink-0">
          <nav className="sticky top-20">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              API reference
            </p>
            <ul className="space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    className={cn(
                      "w-full rounded-lg border-l-2 px-3 py-1.5 text-left text-sm transition-colors",
                      active === s.id
                        ? "border-primary bg-primary/5 font-medium text-primary"
                        : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-10">
          <Section id="overview" title="Overview" refMap={refMap}>
            <p className="text-sm text-muted-foreground">
              The library API lets you control a single user&apos;s library
              programmatically — add books, log reading sessions, read the whole
              collection, and ask the recommendation agent. Every request is scoped
              to the user who owns the API token you send.
            </p>
            <p className="text-sm">All endpoints share this base URL:</p>
            <CodeBlock language="Base URL" code={BASE} />
            <p className="text-sm text-muted-foreground">
              Requests and responses are JSON. Errors return a non-2xx status with a
              body of the shape <code className="font-mono">{`{ "error": string }`}</code>.
            </p>
          </Section>

          <Section id="authentication" title="Authentication" refMap={refMap}>
            <p className="text-sm text-muted-foreground">
              Authenticate every request with a Personal Access Token in the{" "}
              <code className="font-mono">Authorization</code> header:
            </p>
            <CodeBlock language="Header" code={`Authorization: Bearer lib_sk_xxxxxxxxxxxxxxxx`} />
            <p className="text-sm text-muted-foreground">
              Tokens carry the full access of your account and never expire until you
              revoke them. Store them like passwords. Create and manage your tokens
              below — the secret is shown <strong>once</strong> at creation.
            </p>
            <div className="rounded-2xl border border-border bg-card p-4">
              <ApiTokenManager />
            </div>
          </Section>

          <Section id="books" title="Add books" refMap={refMap}>
            <Endpoint method="POST" path="/books" />
            <p className="text-sm text-muted-foreground">
              Add one book or many. Each book needs at least a{" "}
              <code className="font-mono">title</code> and{" "}
              <code className="font-mono">author</code>. Optional fields:{" "}
              <code className="font-mono">
                status
              </code>{" "}
              (<code className="font-mono">to-read</code>·
              <code className="font-mono">reading</code>·
              <code className="font-mono">finished</code>, default{" "}
              <code className="font-mono">to-read</code>),{" "}
              <code className="font-mono">coverUrl</code>,{" "}
              <code className="font-mono">progress</code> (0–100),{" "}
              <code className="font-mono">rating</code> (0–5),{" "}
              <code className="font-mono">notes</code>,{" "}
              <code className="font-mono">isbn</code>,{" "}
              <code className="font-mono">pages</code>,{" "}
              <code className="font-mono">publishYear</code>,{" "}
              <code className="font-mono">description</code>,{" "}
              <code className="font-mono">categoryIds</code>,{" "}
              <code className="font-mono">shelfIds</code>.
            </p>
            <CodeBlock
              language="cURL"
              code={`curl -X POST "${BASE}/books" \\
  -H "Authorization: Bearer $LIB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "books": [
      { "title": "Project Hail Mary", "author": "Andy Weir", "status": "reading" }
    ]
  }'`}
            />
            <p className="text-sm">Returns the created books:</p>
            <CodeBlock
              language="201 Response"
              code={`{ "books": [ { "id": "…", "title": "Project Hail Mary", "author": "Andy Weir", "status": "reading", "categoryIds": [], "shelfIds": [], … } ] }`}
            />
          </Section>

          <Section id="library" title="Library" refMap={refMap}>
            <Endpoint method="GET" path="/library" />
            <p className="text-sm text-muted-foreground">
              Returns the full library snapshot: books (with their category &amp; shelf
              ids and reading progress), categories, shelves, and reading sessions.
            </p>
            <CodeBlock
              language="cURL"
              code={`curl "${BASE}/library" \\
  -H "Authorization: Bearer $LIB_TOKEN"`}
            />
            <CodeBlock
              language="200 Response"
              code={`{
  "books": [ … ],
  "categories": [ { "id": "…", "name": "Sci-Fi" } ],
  "shelves":    [ { "id": "…", "name": "Favourites", "color": "#f59e0b" } ],
  "sessions":   [ { "id": "…", "date": "2026-06-08", "minutes": 30, "bookProgresses": [ … ] } ]
}`}
            />
          </Section>

          <Section id="sessions" title="Reading sessions" refMap={refMap}>
            <Endpoint method="POST" path="/sessions" />
            <p className="text-sm text-muted-foreground">
              Log a reading session. <code className="font-mono">date</code>{" "}
              (YYYY-MM-DD) is required. Optional:{" "}
              <code className="font-mono">minutes</code>,{" "}
              <code className="font-mono">mood</code> (
              <code className="font-mono">happy·thoughtful·moved·motivated·bored</code>),{" "}
              <code className="font-mono">notes</code>,{" "}
              <code className="font-mono">quote</code>,{" "}
              <code className="font-mono">quotePage</code>, and{" "}
              <code className="font-mono">bookProgresses</code> — each updates a book&apos;s
              progress and advances its status (100 → finished).
            </p>
            <CodeBlock
              language="cURL"
              code={`curl -X POST "${BASE}/sessions" \\
  -H "Authorization: Bearer $LIB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "2026-06-08",
    "minutes": 30,
    "mood": "motivated",
    "bookProgresses": [ { "bookId": "<book-id>", "newProgress": 60 } ]
  }'`}
            />
          </Section>

          <Section id="recommend" title="Recommendations" refMap={refMap}>
            <Endpoint method="POST" path="/recommend" />
            <p className="text-sm text-muted-foreground">
              Ask the recommendation agent for books that suit the user&apos;s taste.
              The agent is grounded in their library automatically. Send either a chat{" "}
              <code className="font-mono">messages</code> array or a single{" "}
              <code className="font-mono">query</code> string.
            </p>
            <CodeBlock
              language="cURL"
              code={`curl -X POST "${BASE}/recommend" \\
  -H "Authorization: Bearer $LIB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "recommend 3 sci-fi books like the ones I love" }'`}
            />
            <CodeBlock
              language="200 Response"
              code={`{
  "reply": "Here are three you might love…",
  "books": [ { "title": "…", "author": "…", "reason": "…" } ]
}`}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
