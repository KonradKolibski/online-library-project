import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  /** Right-aligned secondary text (e.g. "12 books"). */
  meta?: string;
  /** Right-aligned link with chevron — overrides `meta` when provided. */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SectionHeader({ title, meta, action }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-0.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : meta ? (
        <span className="text-sm text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}
