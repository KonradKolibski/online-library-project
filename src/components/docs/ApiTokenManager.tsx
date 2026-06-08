import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ApiTokenRecord,
  createToken,
  listTokens,
  revokeToken,
} from "@/lib/apiTokens";

function formatDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Inline token management surfaced inside the Docs → Authentication section. */
export function ApiTokenManager() {
  const [tokens, setTokens] = useState<ApiTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      setTokens(await listTokens());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tokens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      const { token } = await createToken(name.trim());
      setFreshToken(token);
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create token.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!window.confirm("Revoke this token? Apps using it will stop working immediately.")) {
      return;
    }
    setError(null);
    try {
      await revokeToken(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke token.");
    }
  }

  async function copyFresh() {
    if (!freshToken) return;
    try {
      await navigator.clipboard.writeText(freshToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const active = tokens.filter((t) => !t.revoked_at);

  return (
    <div className="space-y-5">
      {/* Create */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          placeholder="Token name (e.g. Zapier, my-script)"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !creating) {
              e.preventDefault();
              void handleCreate();
            }
          }}
        />
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create token
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* One-time reveal */}
      {freshToken && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TriangleAlert className="h-4 w-4 text-primary" />
            Copy your token now — you won&apos;t be able to see it again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 font-mono text-xs">
              {freshToken}
            </code>
            <Button size="icon" variant="outline" onClick={copyFresh} aria-label="Copy token">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setFreshToken(null)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tokens…</p>
      ) : active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <KeyRound className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No active tokens yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name || "Untitled token"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{t.token_prefix}…</span> · created{" "}
                  {formatDate(t.created_at)} · last used {formatDate(t.last_used_at)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRevoke(t.id)}
                aria-label="Revoke token"
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
