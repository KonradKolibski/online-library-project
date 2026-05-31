import { Check, Ban } from "lucide-react";
import { SHELF_COLORS } from "@/lib/shelfColors";
import { cn } from "@/lib/utils";

interface ColorSwatchesProps {
  value: string | undefined;
  onChange: (color: string | undefined) => void;
  /** When false, the "No colour" swatch is hidden. */
  allowClear?: boolean;
  size?: "sm" | "md";
}

export function ColorSwatches({
  value,
  onChange,
  allowClear = true,
  size = "md",
}: ColorSwatchesProps) {
  const dim = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const checkSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className="flex flex-wrap gap-1.5">
      {allowClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(undefined);
          }}
          aria-label="No colour"
          title="No colour"
          className={cn(
            "rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110",
            dim,
            value === undefined
              ? "border-foreground bg-muted"
              : "border-input bg-muted/50",
          )}
        >
          <Ban className={cn("text-muted-foreground", checkSize)} />
        </button>
      )}
      {SHELF_COLORS.map((c) => {
        const selected = value?.toLowerCase() === c.value.toLowerCase();
        return (
          <button
            key={c.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(c.value);
            }}
            aria-label={c.name}
            title={c.name}
            className={cn(
              "rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110",
              dim,
              selected ? "border-foreground" : "border-transparent",
            )}
            style={{ backgroundColor: c.value }}
          >
            {selected && <Check className={cn("text-white", checkSize)} />}
          </button>
        );
      })}
    </div>
  );
}
