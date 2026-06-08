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

/**
 * Vercel-docs-style two-column reference: a sticky left section nav (with a
 * mobile horizontal selector) and a scroll-spy-highlighted content column.
 * Shared by the API and MCP reference pages.
 */
export function DocsReference({
  navLabel,
  sections,
}: {
  navLabel: string;
  sections: DocSection[];
}) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const refMap = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = refMap.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  function go(id: string) {
    setActive(id);
    refMap.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Mobile section selector */}
      <nav className="md:hidden -mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {sections.map((s) => (
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
              {navLabel}
            </p>
            <ul className="space-y-0.5">
              {sections.map((s) => (
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
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              ref={(el) => (refMap.current[s.id] = el)}
              className="scroll-mt-20 space-y-4 border-b border-border/60 pb-10 last:border-0"
            >
              <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
              {s.content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
