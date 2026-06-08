import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsReference, type DocSection } from "@/components/docs/DocsReference";

const MCP_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/mcp`
    : "https://<your-app>/api/mcp";

function Tool({
  name,
  desc,
  params,
}: {
  name: string;
  desc: string;
  params: [string, string][];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-sm font-semibold text-primary">{name}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {params.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
          {params.map(([p, d]) => (
            <div key={p} className="flex gap-3 text-xs">
              <dt className="w-36 shrink-0 font-mono text-foreground/90">{p}</dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

const SECTIONS: DocSection[] = [
  {
    id: "overview",
    label: "Overview",
    title: "Overview",
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          The MCP (Model Context Protocol) server lets AI agents — Claude, Cursor, VS
          Code, and any MCP-compatible client — read and manage your library directly,
          without writing HTTP calls by hand. It exposes the same capabilities as the
          REST API as a set of typed <em>tools</em>.
        </p>
        <p className="text-sm">Connect your client to this endpoint:</p>
        <CodeBlock language="MCP endpoint" code={MCP_URL} />
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            • <strong>Transport:</strong> Streamable HTTP
          </li>
          <li>
            • <strong>Auth:</strong> a Personal Access Token (
            <code className="font-mono">lib_sk_…</code>) sent as a Bearer header —
            generate one with the token field at the top of this page.
          </li>
          <li>
            • <strong>Scope:</strong> every tool acts only on the library that owns the
            token.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "connect",
    label: "Connect a client",
    title: "Connect a client",
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          Add the server to your client&apos;s MCP config, passing your token in the{" "}
          <code className="font-mono">Authorization</code> header. Replace{" "}
          <code className="font-mono">lib_sk_…</code> with your generated token.
        </p>

        <p className="text-sm font-medium">Claude Desktop / generic MCP config</p>
        <CodeBlock
          language="JSON"
          code={`{
  "mcpServers": {
    "capy-books": {
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer lib_sk_…" }
    }
  }
}`}
        />

        <p className="text-sm font-medium">Cursor — .cursor/mcp.json</p>
        <CodeBlock
          language="JSON"
          code={`{
  "mcpServers": {
    "capy-books": {
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer lib_sk_…" }
    }
  }
}`}
        />

        <p className="text-sm font-medium">Claude Code (CLI)</p>
        <CodeBlock
          language="Shell"
          code={`claude mcp add --transport http capy-books "${MCP_URL}" \\
  --header "Authorization: Bearer lib_sk_…"`}
        />

        <p className="text-sm text-muted-foreground">
          Then ask your agent to “list my library” or “add a book” — it will discover
          and call the tools below.
        </p>
      </>
    ),
  },
  {
    id: "tools",
    label: "Tools",
    title: "Tools",
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          The server exposes four tools mirroring the REST API:
        </p>
        <div className="space-y-3">
          <Tool
            name="get_library"
            desc="Returns the full library: books (status, progress, ratings, category/shelf ids), categories, shelves, and reading sessions."
            params={[]}
          />
          <Tool
            name="add_books"
            desc="Add one or more books. Each needs at least a title and author; optional status, progress, rating, isbn, pages, publishYear, coverUrl, notes, description, categoryIds, shelfIds."
            params={[["books", "array of book objects (min 1)"]]}
          />
          <Tool
            name="add_reading_session"
            desc="Log a reading session and optionally advance books' progress (100 marks a book finished)."
            params={[
              ["date", "YYYY-MM-DD (required)"],
              ["minutes", "integer (optional)"],
              ["mood", "happy·thoughtful·moved·motivated·bored (optional)"],
              ["notes / quote / quotePage", "optional"],
              ["bookProgresses", "[{ bookId, newProgress }] (optional)"],
            ]}
          />
          <Tool
            name="recommend_books"
            desc="Ask the recommendation agent for books that suit the user's taste, grounded in their library."
            params={[["query", "what to recommend, e.g. 'cozy sci-fi'"]]}
          />
        </div>
      </>
    ),
  },
  {
    id: "example",
    label: "Example",
    title: "Example",
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          Once connected, drive everything in natural language — the agent picks the
          right tools:
        </p>
        <CodeBlock
          language="Prompt"
          code={`Add "Dune" by Frank Herbert to my library as reading,
then recommend three similar books I don't own yet.`}
        />
        <p className="text-sm text-muted-foreground">
          The agent calls <code className="font-mono">add_books</code> then{" "}
          <code className="font-mono">recommend_books</code>, both scoped to your
          account via the token.
        </p>
      </>
    ),
  },
];

export function McpReference() {
  return <DocsReference navLabel="MCP reference" sections={SECTIONS} />;
}
