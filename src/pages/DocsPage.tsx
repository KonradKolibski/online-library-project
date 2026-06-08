import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiTokenManager } from "@/components/docs/ApiTokenManager";
import { DocsReference, type DocGroup } from "@/components/docs/DocsReference";
import { apiSections } from "@/components/docs/ApiReference";
import { mcpSections } from "@/components/docs/McpReference";

interface DocsPageProps {
  onBack: () => void;
}

const GROUPS: DocGroup[] = [
  {
    label: "API",
    title: "REST API",
    description:
      "Control a user's library over HTTP — add books, log sessions, read the collection, and ask for recommendations.",
    sections: apiSections,
  },
  {
    label: "MCP",
    title: "MCP server",
    description:
      "Connect an AI agent directly to the library through the Model Context Protocol.",
    sections: mcpSections,
  },
];

export function DocsPage({ onBack }: DocsPageProps) {
  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Developer documentation</h1>
      </div>

      <DocsReference groups={GROUPS} sidebarTop={<ApiTokenManager />} />
    </div>
  );
}
