import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedTab {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: AnimatedTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Underline-style tabs with a single floating indicator that smoothly
 * slides between tabs on change (same UX as the shelf tabs).
 */
export function AnimatedTabs({
  tabs,
  activeId,
  onChange,
  className,
}: AnimatedTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(
    null,
  );
  const [ready, setReady] = useState(false);

  function measure() {
    const el = tabRefs.current.get(activeId);
    const container = containerRef.current;
    if (!el || !container) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setIndicator({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    });
  }

  useLayoutEffect(() => {
    measure();
    requestAnimationFrame(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, tabs.length]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return (
    <div ref={containerRef} className={cn("relative flex", className)}>
      {indicator && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary",
            ready && "transition-[left,width] duration-300 ease-out",
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {tabs.map((t) => {
        const active = activeId === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) tabRefs.current.set(t.id, el);
              else tabRefs.current.delete(t.id);
            }}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 border-transparent transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
