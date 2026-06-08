// Vercel Function: MCP server for the library app.
//
// Exposes the app's per-user API to AI agents over the Model Context Protocol
// (Streamable HTTP). It is a thin proxy: the agent authenticates with its
// personal access token (`Authorization: Bearer lib_sk_…`) and every tool
// forwards that token to the existing Supabase API, so this function holds no
// secrets and reuses all server-side validation and per-user scoping.
//
// Endpoint (once deployed): https://<your-app>/api/mcp

import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";

// The public Supabase API base. Override in Vercel via SUPABASE_API_URL.
const API_BASE =
  process.env.SUPABASE_API_URL ??
  "https://eqdyttfwnelnlsbiqhwx.supabase.co/functions/v1/api";

const TOKEN_PREFIX = "lib_sk_";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

/** Call the Supabase API with the caller's PAT and wrap the result for MCP. */
async function callApi(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<ToolResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        content: [{ type: "text", text: `Request failed (${res.status}): ${text}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Network error: ${(err as Error).message}` }],
      isError: true,
    };
  }
}

const bookSchema = z.object({
  title: z.string().describe("Book title (required)."),
  author: z.string().describe("Author name (required)."),
  status: z
    .enum(["to-read", "reading", "finished"])
    .optional()
    .describe("Reading status. Defaults to to-read."),
  coverUrl: z.string().url().optional(),
  progress: z.number().int().min(0).max(100).optional().describe("Percent read, 0-100."),
  rating: z.number().int().min(0).max(5).optional().describe("Rating 0-5."),
  notes: z.string().optional(),
  isbn: z.string().optional(),
  pages: z.number().int().optional(),
  publishYear: z.number().int().optional(),
  description: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  shelfIds: z.array(z.string()).optional(),
});

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      "get_library",
      "Get the user's full library: books (with status, progress, ratings, category/shelf ids), categories, shelves, and reading sessions.",
      {},
      async (_args, extra) =>
        callApi((extra.authInfo as AuthInfo).token, "/library"),
    );

    server.tool(
      "add_books",
      "Add one or more books to the user's library. Each book needs at least a title and author.",
      { books: z.array(bookSchema).min(1).describe("Books to add.") },
      async ({ books }, extra) =>
        callApi((extra.authInfo as AuthInfo).token, "/books", {
          method: "POST",
          body: { books },
        }),
    );

    server.tool(
      "add_reading_session",
      "Log a reading session for a given date and optionally advance one or more books' progress (100 marks a book finished).",
      {
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date as YYYY-MM-DD."),
        minutes: z.number().int().min(0).optional(),
        mood: z
          .enum(["happy", "thoughtful", "moved", "motivated", "bored"])
          .optional(),
        notes: z.string().optional(),
        quote: z.string().optional(),
        quotePage: z.number().int().optional(),
        bookProgresses: z
          .array(
            z.object({
              bookId: z.string(),
              newProgress: z.number().int().min(0).max(100),
            }),
          )
          .optional()
          .describe("Per-book progress updates after this session."),
      },
      async (args, extra) =>
        callApi((extra.authInfo as AuthInfo).token, "/sessions", {
          method: "POST",
          body: args,
        }),
    );

    server.tool(
      "recommend_books",
      "Ask the recommendation agent for books that suit the user's taste. Grounded automatically in their library.",
      { query: z.string().describe("What kind of recommendations to ask for.") },
      async ({ query }, extra) =>
        callApi((extra.authInfo as AuthInfo).token, "/recommend", {
          method: "POST",
          body: { query },
        }),
    );
  },
  {},
  { basePath: "/api", maxDuration: 60 },
);

// Accept any well-formed personal access token. Real per-user authorization is
// enforced by the library API on every tool call (it returns 401 for an invalid
// or revoked token), so we keep this check O(1) with no network round-trip —
// `withMcpAuth` may run it on every request.
const verifyToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken || !bearerToken.startsWith(TOKEN_PREFIX) || bearerToken.length < 16) {
    return undefined;
  }
  return {
    token: bearerToken,
    scopes: ["library"],
    clientId: bearerToken.slice(0, TOKEN_PREFIX.length + 6),
  };
};

const handler = withMcpAuth(baseHandler, verifyToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
