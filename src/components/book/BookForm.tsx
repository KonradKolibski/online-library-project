import { useRef, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import type { Book, ReadingStatus } from "@/types/book";
import { useLibrary, type BookInput } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { StarRating } from "./StarRating";
import { CoverImage } from "./CoverImage";
import { TagMultiSelect } from "./TagMultiSelect";

interface BookFormProps {
  initial?: Book;
  /** Used when adding a new book on a specific shelf, to pre-select it. */
  initialShelfIds?: string[];
  onSubmit: (input: BookInput) => void;
  onCancel: () => void;
  /** When provided, a "Save & add another" button is shown in the bottom-left. */
  onAddAnother?: (input: BookInput) => void;
}

const STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
];

export function BookForm({
  initial,
  initialShelfIds,
  onSubmit,
  onCancel,
  onAddAnother,
}: BookFormProps) {
  const { state, addCategoryAndGetId, addShelfAndGetId } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categoryIds ?? [],
  );
  const [shelfIds, setShelfIds] = useState<string[]>(
    initial?.shelfIds ?? initialShelfIds ?? [],
  );
  const [status, setStatus] = useState<ReadingStatus>(
    initial?.status ?? "to-read",
  );
  const [progress, setProgress] = useState<number>(initial?.progress ?? 0);
  const [rating, setRating] = useState<number | undefined>(initial?.rating);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setAuthor("");
    setCoverUrl("");
    setCategoryIds([]);
    setShelfIds(initialShelfIds ?? []);
    setStatus("to-read");
    setProgress(0);
    setRating(undefined);
    setNotes("");
    setError(null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCoverUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function buildInput(): BookInput {
    return {
      title: title.trim(),
      author: author.trim(),
      coverUrl: coverUrl.trim() || undefined,
      categoryIds,
      shelfIds,
      status,
      progress: status === "reading" ? progress : undefined,
      rating,
      notes: notes.trim() || undefined,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError("Title and author are required.");
      return;
    }
    onSubmit(buildInput());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Cover */}
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <CoverImage title={title || "Untitled"} src={coverUrl} rounded="rounded-lg" />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload cover
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Input
            placeholder="…or paste an image URL"
            value={coverUrl.startsWith("data:") ? "" : coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
          {coverUrl && (
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="text-xs text-muted-foreground hover:text-foreground self-start"
            >
              Remove cover
            </button>
          )}
        </div>
      </div>

      {/* Title & Author */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="author">Author *</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-1.5">
        <Label>Categories</Label>
        <TagMultiSelect
          options={state.categories}
          selected={categoryIds}
          onChange={setCategoryIds}
          onCreateAndAdd={addCategoryAndGetId}
          placeholder="Search or create a category…"
          noun="category"
        />
        <p className="text-xs text-muted-foreground">
          Pick from existing or type a new name and press Enter to create it.
        </p>
      </div>

      {/* Shelves */}
      <div className="space-y-1.5">
        <Label>Shelves</Label>
        <TagMultiSelect
          options={state.shelves}
          selected={shelfIds}
          onChange={setShelfIds}
          onCreateAndAdd={addShelfAndGetId}
          placeholder="Add to a shelf…"
          noun="shelf"
        />
        <p className="text-xs text-muted-foreground">
          Shelves are your personal collections — e.g. &ldquo;Favourites&rdquo;, &ldquo;Lent out&rdquo;, &ldquo;Reading list&rdquo;.
        </p>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <RadioGroup
          value={status}
          onValueChange={(v) => setStatus(v as ReadingStatus)}
          className="grid grid-cols-3 gap-2"
        >
          {STATUSES.map((s) => (
            <label
              key={s.value}
              className="flex items-center gap-2 rounded-xl border border-input px-3 py-2 cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem value={s.value} id={`status-${s.value}`} />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </RadioGroup>
        {status === "reading" && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="progress">Progress</Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {progress}%
              </span>
            </div>
            <Slider
              id="progress"
              value={[progress]}
              onValueChange={([v]) => setProgress(v ?? 0)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        )}
      </div>

      {/* Rating — only for reading or finished books */}
      {(status === "reading" || status === "finished") && (
        <div className="space-y-2">
          <Label>Rating</Label>
          <StarRating value={rating} onChange={setRating} />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Thoughts, quotes, anything you want to remember…"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {onAddAnother && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!title.trim() || !author.trim()) {
                  setError("Title and author are required.");
                  return;
                }
                onAddAnother(buildInput());
                resetForm();
              }}
            >
              Save &amp; add another
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save changes" : "Save"}</Button>
        </div>
      </div>
    </form>
  );
}
