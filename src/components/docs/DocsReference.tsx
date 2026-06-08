import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Coloured HTTP-method + path pill used in endpoint docs. */
export function Endpoint({ method, path }: { method: string; path: string }) {
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

export interface DocSection {
  id: string;
  label: string;
  title: string;
  content: ReactNode;
}

export interface DocGroup {
  /** Short label shown as the nav heading, e.g. "API". */
  label: string;
  /** Large page title shown at the top of the content, e.g. "REST API". */
  title: string;
  /** Optional one-line intro under the page title. */
  description?: string;
  sections: DocSection[];
}

/**
 * Vercel-docs-style docs shell. The left column holds the access-token panel and
 * a grouped nav that switches between separate pages (API / MCP) — only the
 * active page's sections render, and scroll-spy highlights the section in view.
 */
export function DocsReference({
  groups,
  sidebarTop,
}: {
  groups: DocGroup[];
  sidebarTop?: ReactNode;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSection, setActiveSection] = useState(groups[0]?.sections[0]?.id ?? "");
  const pendingScroll = useRef<string | null>(null);
  const refMap = useRef<Record<string, HTMLElement | null>>({});
  const activeGroup = groups[activeIdx];

  // After switching page, jump to the requested section (or the top).
  useEffect(() => {
    const id = pendingScroll.current;
    if (id) {
      pendingScroll.current = null;
      setActiveSection(id);
      requestAnimationFrame(() =>
        refMap.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } else {
      setActiveSection(activeGroup?.sections[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Scroll-spy across the active page's sections only.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSection(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const s of activeGroup?.sections ?? []) {
      const el = refMap.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  function go(groupIdx: number, id: string) {
    if (groupIdx !== activeIdx) {
      pendingScroll.current = id;
      setActiveIdx(groupIdx);
    } else {
      setActiveSection(id);
      refMap.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Left column: token panel + grouped nav */}
      <aside className="w-full shrink-0 md:w-64">
        <div className="md:sticky md:top-20 space-y-6">
          {sidebarTop}
          {groups.map((g, gi) => (
            <div key={g.label}>
              <button
                type="button"
                onClick={() => go(gi, g.sections[0]?.id ?? "")}
                className={cn(
                  "px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                  gi === activeIdx
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g.label}
              </button>
              <ul className="space-y-0.5">
                {g.sections.map((s) => {
                  const isActive = gi === activeIdx && activeSection === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => go(gi, s.id)}
                        className={cn(
                          "w-full rounded-lg border-l-2 px-3 py-1.5 text-left text-sm transition-colors",
                          isActive
                            ? "border-primary bg-primary/5 font-medium text-primary"
                            : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Content — only the active page */}
      <div className="min-w-0 flex-1">
        <div className="mb-8 space-y-1.5 border-b border-border pb-5">
          <h2 className="text-3xl font-bold tracking-tight">{activeGroup?.title}</h2>
          {activeGroup?.description && (
            <p className="text-sm text-muted-foreground">{activeGroup.description}</p>
          )}
        </div>
        <div className="space-y-10">
          {activeGroup?.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              ref={(el) => (refMap.current[s.id] = el)}
              className="scroll-mt-20 space-y-4 border-b border-border/60 pb-10 last:border-0"
            >
              <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
              {s.content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
