import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  children: React.ReactNode;
  /** Optional accessible label (otherwise uses tooltip content as aria-label). */
  label?: string;
}

interface Pos {
  top: number;
  left: number;
}

export function InfoTooltip({ children, label }: InfoTooltipProps) {
  const [pos, setPos] = useState<Pos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function open() {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
  }

  function close() {
    setPos(null);
  }

  useEffect(() => {
    if (!pos) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        aria-label={label ?? "More info"}
        className="cursor-help text-muted-foreground hover:text-foreground focus-visible:text-foreground transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            className="fixed z-[60] max-w-xs rounded-lg bg-foreground text-background text-xs leading-relaxed px-3 py-2 shadow-lg pointer-events-none"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
