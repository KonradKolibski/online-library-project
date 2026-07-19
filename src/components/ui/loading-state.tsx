import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Text shown under the animation. */
  label?: string;
  size?: "sm" | "md" | "lg";
  /** Fill the viewport — for the app-boot screen. */
  fullScreen?: boolean;
  className?: string;
}

const SIZES = {
  sm: { img: "h-16 w-16", text: "text-xs" },
  md: { img: "h-28 w-28", text: "text-sm" },
  lg: { img: "h-44 w-44", text: "text-base" },
} as const;

/**
 * Shared loading state: the animated capybara plus a label with a shine sweep.
 * The SVG animates itself (and honours prefers-reduced-motion internally), so
 * it can be rendered as a plain <img>.
 */
export function LoadingState({
  label = "Organizing your books…",
  size = "md",
  fullScreen = false,
  className,
}: LoadingStateProps) {
  const s = SIZES[size];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        fullScreen && "min-h-screen",
        className,
      )}
    >
      <img
        src="/illustrations/capy-loading.svg"
        alt=""
        aria-hidden="true"
        className={cn("select-none", s.img)}
      />
      <p
        className={cn(
          "font-display font-semibold bg-clip-text text-transparent animate-shine motion-reduce:animate-none",
          "bg-[length:200%_100%] bg-[linear-gradient(100deg,hsl(var(--muted-foreground))_35%,hsl(var(--foreground))_50%,hsl(var(--muted-foreground))_65%)]",
          s.text,
        )}
      >
        {label}
      </p>
    </div>
  );
}
