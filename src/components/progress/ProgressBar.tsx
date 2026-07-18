import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** Fill percentage, 0–100. */
  pct: number;
  /** Tailwind bg-* class for the fill (e.g. "bg-primary"). */
  fillClassName: string;
  /** Track height class. */
  heightClass?: string;
  className?: string;
}

/**
 * Chunky, glossy progress bar with a Duolingo-style 3D tube look: an inset track,
 * a rounded solid fill, a top gloss highlight and a subtle bottom shade.
 */
export function ProgressBar({
  pct,
  fillClassName,
  heightClass = "h-3",
  className,
}: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-foreground/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]",
        heightClass,
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
          fillClassName,
        )}
        style={{ width: `${width}%` }}
      >
        {/* top gloss highlight */}
        <span className="pointer-events-none absolute left-1.5 right-1.5 top-[3px] h-[3px] rounded-full bg-white/45" />
        {/* bottom shade for depth */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-full bg-black/10" />
      </div>
    </div>
  );
}
