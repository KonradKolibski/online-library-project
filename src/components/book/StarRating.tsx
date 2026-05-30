import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, readOnly, size = "md" }: StarRatingProps) {
  const stars = Array.from({ length: 10 }, (_, i) => i + 1);
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  function handleClick(n: number) {
    if (readOnly || !onChange) return;
    onChange(value === n ? undefined : n);
  }

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating from 1 to 10">
      {stars.map((n) => {
        const filled = value !== undefined && n <= value;
        return (
          <button
            type="button"
            key={n}
            onClick={() => handleClick(n)}
            disabled={readOnly}
            aria-label={`${n} out of 10`}
            aria-checked={value === n}
            role="radio"
            className={cn(
              "p-0.5 rounded-md transition-colors",
              readOnly ? "cursor-default" : "hover:scale-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Star
              className={cn(
                dim,
                filled ? "fill-primary text-primary" : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
      {value !== undefined && (
        <span className="ml-2 text-xs font-medium text-muted-foreground tabular-nums">
          {value}/10
        </span>
      )}
    </div>
  );
}
