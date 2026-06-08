import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiTokenManager } from "@/components/docs/ApiTokenManager";
import { ApiReference } from "@/components/docs/ApiReference";
import { McpReference } from "@/components/docs/McpReference";
import { cn } from "@/lib/utils";

export type DocsTab = "api" | "mcp";

interface DocsPageProps {
  onBack: () => void;
  tab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
}

const TABS: { id: DocsTab; label: string }[] = [
  { id: "api", label: "REST API" },
  { id: "mcp", label: "MCP server" },
];

export function DocsPage({ onBack, tab, onTabChange }: DocsPageProps) {
  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Developer documentation</h1>
      </div>

      {/* Shared token generator — present on both tabs */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">API tokens</p>
            <p className="text-xs text-muted-foreground">
              Generate a Personal Access Token to use with the API and MCP server.
            </p>
          </div>
        </div>
        <ApiTokenManager />
      </div>

      {/* API / MCP tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={tab === t.id ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active reference */}
      {tab === "api" ? <ApiReference /> : <McpReference />}
    </div>
  );
}
