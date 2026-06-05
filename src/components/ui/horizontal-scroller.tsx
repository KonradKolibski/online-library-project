import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollerProps {
  children: ReactNode;
  className?: string;
  /** Pixel threshold above which a pointer move counts as a drag (suppressing
   *  any child onClick). Default 4 — same as ShelfTabs. */
  dragThreshold?: number;
}

/**
 * Drag-to-scroll horizontal container. Children render in a flex row that
 * overflows horizontally; users can scroll by wheel, touch, or click-drag.
 *
 * To make children that should *not* fire onClick when the user is dragging
 * (e.g. tappable book cards), wrap their click handler in the `data-dragging`
 * guard: this scroller sets `data-dragging="true"` on the root once the
 * pointer has moved past the threshold; readers can check the attribute or
 * use the `onClickCapture` pattern shown in the dashboard rows.
 */
export function HorizontalScroller({
  children,
  className,
  dragThreshold = 4,
}: HorizontalScrollerProps) {
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
    if (Math.abs(dx) > dragThreshold) {
      didDrag.current = true;
      scrollRef.current.dataset.dragging = "true";
    }
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }

  function endDrag() {
    dragStart.current = null;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      // Clear *after* the click event has a chance to fire and inspect it.
      requestAnimationFrame(() => {
        if (scrollRef.current) delete scrollRef.current.dataset.dragging;
        didDrag.current = false;
      });
    }
  }

  // Capture-phase click: if a drag just happened, swallow the click so child
  // cards don't open. We do this on capture so we win the race against the
  // child's bubbling onClick.
  function onClickCapture(e: React.MouseEvent) {
    if (didDrag.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex overflow-x-auto scrollbar-none select-none cursor-grab gap-3",
        className,
      )}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
