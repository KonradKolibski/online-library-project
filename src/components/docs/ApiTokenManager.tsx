import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  type ApiTokenRecord,
  createToken,
  listTokens,
  revokeToken,
} from "@/lib/apiTokens";

function lastUsed(iso: string | null): string {
  if (!iso) return "last used never";
  return `last used ${new Date(iso).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/**
 * Compact "Your access token" panel shown in the docs sidebar. Generates,
 * lists and revokes the user's Personal Access Tokens. The full secret is
 * revealed once, on creation.
 */
export function ApiTokenManager() {
  const [tokens, setTokens] = useState<ApiTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const { token } = await createToken("default");
      setFreshToken(token);
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Your access token</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Send as <code className="font-mono">Authorization: Bearer …</code>
      </p>

      <Button onClick={handleCreate} disabled={creating} className="mt-3 w-full">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Generate token
      </Button>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {/* One-time reveal */}
      {freshToken && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <TriangleAlert className="h-3.5 w-3.5 text-primary" />
            Copy it now — shown once.
          </div>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 font-mono text-[11px]">
              {freshToken}
            </code>
            <Button size="icon" variant="outline" onClick={copyFresh} aria-label="Copy token" className="h-7 w-7 shrink-0">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Active tokens */}
      <p className="mt-4 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Active tokens
      </p>
      {loading ? (
        <LoadingState size="sm" label="Loading tokens…" className="py-4" />
      ) : active.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active tokens yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {active.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-semibold">{t.name || "default"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{lastUsed(t.last_used_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(t.id)}
                aria-label="Revoke token"
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
