import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ChipOption {
  id: string;
  label: string;
}

interface FilterChipsProps {
  options: ChipOption[];
  activeId: string | null;
  onChange: (id: string | null) => void;
  allLabel?: string;
  prefix?: string;
}

export function FilterChips({
  options,
  activeId,
  onChange,
  allLabel = "All",
  prefix,
}: FilterChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const didDrag = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    dragStart.current = { x: e.pageX, scrollLeft: el.scrollLeft };
    didDrag.current = false;
    el.style.cursor = "grabbing";
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current || !scrollRef.current) return;
    const dx = e.pageX - dragStart.current.x;
    if (Math.abs(dx) > 4) didDrag.current = true;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }

  function onMouseUp() {
    dragStart.current = null;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }

  function onChipClick(cb: () => void) {
    if (!didDrag.current) cb();
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none select-none cursor-grab"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <Chip
        active={activeId === null}
        onClick={() => onChipClick(() => onChange(null))}
      >
        {allLabel}
      </Chip>
      {options.map((opt) => (
        <Chip
          key={opt.id}
          active={activeId === opt.id}
          onClick={() => onChipClick(() => onChange(activeId === opt.id ? null : opt.id))}
        >
          {prefix}
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-foreground hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
