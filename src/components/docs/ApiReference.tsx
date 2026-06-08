import { CodeBlock } from "@/components/docs/CodeBlock";
import { Endpoint, type DocSection } from "@/components/docs/DocsReference";

const BASE = `${import.meta.env.VITE_SUPABASE_URL ?? "https://<project>.supabase.co"}/functions/v1/api`;

export const apiSections: DocSection[] = [
  {
    id: "overview",
    label: "Overview",
    title: "Overview",
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          The library API lets you control a single user&apos;s library
          programmatically — add books, log reading sessions, read the whole
          collection, and ask the recommendation agent. Every request is scoped to
          the user who owns the API token you send.
        </p>
        <p className="text-sm">All endpoints share this base URL:</p>
        <CodeBlock language="Base URL" code={BASE} />
        <p className="text-sm text-muted-foreground">
          Requests and responses are JSON. Errors return a non-2xx status with a body
          of the shape <code className="font-mono">{`{ "error": string }`}</code>.
        </p>
      </>
    ),
  },
  {
    id: "authentication",
    label: "Authentication",
    title: "Authentication",
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          Authenticate every request with a Personal Access Token in the{" "}
          <code className="font-mono">Authorization</code> header. Generate one using
          the <strong>access-token panel in the sidebar</strong>.
        </p>
        <CodeBlock language="Header" code={`Authorization: Bearer lib_sk_xxxxxxxxxxxxxxxx`} />
        <p className="text-sm text-muted-foreground">
          Tokens carry the full access of your account and never expire until you
          revoke them. Store them like passwords — the secret is shown{" "}
          <strong>once</strong> at creation.
        </p>
      </>
    ),
  },
  {
    id: "books",
    label: "Add books",
    title: "Add books",
    content: (
      <>
        <Endpoint method="POST" path="/books" />
        <p className="text-sm text-muted-foreground">
          Add one book or many. Each book needs at least a{" "}
          <code className="font-mono">title</code> and{" "}
          <code className="font-mono">author</code>. Optional fields:{" "}
          <code className="font-mono">status</code> (
          <code className="font-mono">to-read</code>·
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
      </>
    ),
  },
  {
    id: "library",
    label: "Library",
    title: "Library",
    content: (
      <>
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
      </>
    ),
  },
  {
    id: "sessions",
    label: "Reading sessions",
    title: "Reading sessions",
    content: (
      <>
        <Endpoint method="POST" path="/sessions" />
        <p className="text-sm text-muted-foreground">
          Log a reading session. <code className="font-mono">date</code> (YYYY-MM-DD)
          is required. Optional: <code className="font-mono">minutes</code>,{" "}
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
      </>
    ),
  },
  {
    id: "recommend",
    label: "Recommendations",
    title: "Recommendations",
    content: (
      <>
        <Endpoint method="POST" path="/recommend" />
        <p className="text-sm text-muted-foreground">
          Ask the recommendation agent for books that suit the user&apos;s taste. The
          agent is grounded in their library automatically. Send either a chat{" "}
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
      </>
    ),
  },
];

