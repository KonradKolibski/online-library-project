import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type SortOption = "title-asc" | "author-asc" | "rating-desc" | "date-desc" | "status";

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  "title-asc": "Title (A–Z)",
  "author-asc": "Author (A–Z)",
  "rating-desc": "Rating (High–Low)",
  "date-desc": "Date Added (Newest)",
  status: "Reading Status",
};

const DEFAULT_SORT: SortOption = "date-desc";

export function SortSelector({ value, onChange }: SortSelectorProps) {
  const isActive = value !== DEFAULT_SORT;

  return (
    <Select value={value} onValueChange={onChange}>
      <div className="relative shrink-0 w-8">
        <SelectTrigger
          className="h-8 w-8 rounded-full bg-card p-0 flex items-center justify-center [&>span]:hidden [&>svg:last-child]:hidden"
          aria-label={`Sort: ${SORT_LABELS[value]}`}
        >
          <ArrowUpDown className="h-4 w-4" />
        </SelectTrigger>
        {isActive && (
          <span className="pointer-events-none absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
        )}
      </div>
      <SelectContent>
        {Object.entries(SORT_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
