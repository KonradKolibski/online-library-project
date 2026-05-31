import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TagOption {
  id: string;
  name: string;
}

interface TagMultiSelectProps {
  options: TagOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onCreateAndAdd: (name: string) => string;
  placeholder?: string;
  /** Singular noun for the empty-create line (e.g. "category", "shelf") */
  noun?: string;
}

export function TagMultiSelect({
  options,
  selected,
  onChange,
  onCreateAndAdd,
  placeholder = "Search or create…",
  noun = "tag",
}: TagMultiSelectProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = options.filter(
    (o) =>
      !selected.includes(o.id) &&
      o.name.toLowerCase().includes(draft.toLowerCase()),
  );

  const draftMatchesExisting = options.some(
    (o) => o.name.toLowerCase() === draft.trim().toLowerCase(),
  );

  function addById(id: string) {
    if (!selected.includes(id)) onChange([...selected, id]);
    setDraft("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function commitDraft() {
    const name = draft.trim();
    if (!name) {
      setOpen(false);
      return;
    }
    const match = options.find(
      (o) => o.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) {
      addById(match.id);
    } else {
      const id = onCreateAndAdd(name);
      onChange([...selected, id]);
      setDraft("");
      setOpen(false);
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (suggestions.length === 1 && draft) {
        addById(suggestions[0].id);
      } else {
        commitDraft();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !draft && selected.length) {
      onChange(selected.slice(0, -1));
    } else if (e.key === "ArrowDown" && (suggestions.length || draft.trim())) {
      e.preventDefault();
      const first = wrapperRef.current?.querySelector<HTMLButtonElement>(
        "[data-suggestion]",
      );
      first?.focus();
    }
  }

  function handleSuggestionKeyDown(
    e: ReactKeyboardEvent<HTMLButtonElement>,
    id: string | null,
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (id) addById(id);
      else commitDraft();
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLButtonElement | null)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = e.currentTarget
        .previousElementSibling as HTMLButtonElement | null;
      if (prev) prev.focus();
      else inputRef.current?.focus();
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedOptions = selected
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean) as TagOption[];

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background px-2 py-2 min-h-10 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedOptions.map((o) => (
          <Badge key={o.id} variant="secondary" className="gap-1">
            {o.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(selected.filter((id) => id !== o.id));
              }}
              aria-label={`Remove ${o.name}`}
              className="hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[10ch] bg-transparent outline-none text-sm py-1 px-1"
          placeholder={selected.length ? "" : placeholder}
          value={draft}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (suggestions.length > 0 || (draft.trim() && !draftMatchesExisting)) && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-input bg-popover shadow-md overflow-y-auto max-h-48">
          {suggestions.map((o) => (
            <button
              key={o.id}
              type="button"
              data-suggestion
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent outline-none"
              onMouseDown={(e) => {
                e.preventDefault();
                addById(o.id);
              }}
              onKeyDown={(e) => handleSuggestionKeyDown(e, o.id)}
            >
              {o.name}
            </button>
          ))}
          {draft.trim() && !draftMatchesExisting && (
            <button
              type="button"
              data-suggestion
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent focus:bg-accent outline-none border-t border-input"
              onMouseDown={(e) => {
                e.preventDefault();
                commitDraft();
              }}
              onKeyDown={(e) => handleSuggestionKeyDown(e, null)}
            >
              Create {noun} &ldquo;{draft.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
