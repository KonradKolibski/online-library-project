import { useRef, useState, type FormEvent } from "react";
import { Upload, Loader2 } from "lucide-react";
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
import { OpenLibraryTitleInput, type OpenLibraryPick } from "./OpenLibraryTitleInput";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { fetchWorkDescription } from "@/lib/openLibrary";
import { cn } from "@/lib/utils";

function LabelWithInfo({
  htmlFor,
  children,
  tooltip,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
    </div>
  );
}

type FormTab = "basic" | "additional";

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
  // Open Library metadata
  const [isbn, setIsbn] = useState<string | undefined>(initial?.isbn);
  const [pages, setPages] = useState<number | undefined>(initial?.pages);
  const [publishYear, setPublishYear] = useState<number | undefined>(
    initial?.publishYear,
  );
  const [description, setDescription] = useState<string | undefined>(
    initial?.description,
  );
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const descriptionAbortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FormTab>("basic");

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
    setIsbn(undefined);
    setPages(undefined);
    setPublishYear(undefined);
    setDescription(undefined);
    descriptionAbortRef.current?.abort();
    setDescriptionLoading(false);
    setError(null);
  }

  function handleOpenLibraryPick(p: OpenLibraryPick) {
    // Cancel any in-flight description request from a previous pick
    descriptionAbortRef.current?.abort();

    // Overwrite form state with the suggestion's fields
    setTitle(p.title);
    if (p.author) setAuthor(p.author);
    if (p.coverUrl) setCoverUrl(p.coverUrl);
    if (p.pages !== undefined) setPages(p.pages);
    if (p.publishYear !== undefined) setPublishYear(p.publishYear);
    if (p.isbn) setIsbn(p.isbn);

    // If the suggestion already came with a description (Google Books),
    // use it directly — no extra fetch needed.
    if (p.description) {
      setDescription(p.description);
      setDescriptionLoading(false);
      return;
    }

    setDescription(undefined);

    // Open Library work keys: fetch the description asynchronously.
    if (!p.workKey.startsWith("/works/")) {
      setDescriptionLoading(false);
      return;
    }

    const controller = new AbortController();
    descriptionAbortRef.current = controller;
    setDescriptionLoading(true);

    fetchWorkDescription(p.workKey, controller.signal)
      .then((desc) => {
        if (controller.signal.aborted) return;
        setDescription(desc);
        setDescriptionLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Silent failure — description is non-critical
        setDescriptionLoading(false);
      });
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
      isbn,
      pages,
      publishYear,
      description,
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
      {/* Tabs */}
      <AnimatedTabs
        tabs={[
          { id: "basic", label: "Basic info" },
          { id: "additional", label: "Additional details" },
        ]}
        activeId={tab}
        onChange={(id) => setTab(id as FormTab)}
      />

      {/* ── Basic info ──────────────────────────── */}
      <div className={cn("flex flex-col gap-5", tab !== "basic" && "hidden")}>
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

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <OpenLibraryTitleInput
            id="title"
            value={title}
            onChange={setTitle}
            onPick={handleOpenLibraryPick}
            required
            placeholder="Start typing to search Open Library…"
          />
          {descriptionLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching book details…
            </p>
          )}
        </div>

        {/* Author */}
        <div className="space-y-1.5">
          <Label htmlFor="author">Author *</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
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
        </div>

        {/* Progress (when reading) */}
        {status === "reading" && (
          <div className="space-y-2">
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

        {/* Rating (only for reading/finished) */}
        {(status === "reading" || status === "finished") && (
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>
        )}

        {/* Categories */}
        <div className="space-y-1.5">
          <LabelWithInfo
            tooltip="Pick from existing or type a new name and press Enter to create it."
          >
            Categories
          </LabelWithInfo>
          <TagMultiSelect
            options={state.categories}
            selected={categoryIds}
            onChange={setCategoryIds}
            onCreateAndAdd={addCategoryAndGetId}
            placeholder="Search or create a category…"
            noun="category"
          />
        </div>

        {/* Shelves */}
        <div className="space-y-1.5">
          <LabelWithInfo
            tooltip={
              <>
                Shelves are your personal collections — e.g. &ldquo;Favourites&rdquo;,
                &ldquo;Lent out&rdquo;, &ldquo;Reading list&rdquo;.
              </>
            }
          >
            Shelves
          </LabelWithInfo>
          <TagMultiSelect
            options={state.shelves}
            selected={shelfIds}
            onChange={setShelfIds}
            onCreateAndAdd={addShelfAndGetId}
            placeholder="Add to a shelf…"
            noun="shelf"
          />
        </div>
      </div>

      {/* ── Additional details ──────────────────── */}
      <div className={cn("flex flex-col gap-5", tab !== "additional" && "hidden")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="publishYear">Year of publish</Label>
            <Input
              id="publishYear"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              placeholder="e.g. 1997"
              value={publishYear ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) return setPublishYear(undefined);
                const n = parseInt(v, 10);
                setPublishYear(isNaN(n) ? undefined : n);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pages">Pages</Label>
            <Input
              id="pages"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 320"
              value={pages ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) return setPages(undefined);
                const n = parseInt(v, 10);
                setPages(isNaN(n) ? undefined : n);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="isbn">ISBN</Label>
            <Input
              id="isbn"
              placeholder="e.g. 9788373191891"
              value={isbn ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setIsbn(v.trim() ? v : undefined);
              }}
            />
          </div>
        </div>

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
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error}
          {tab !== "basic" && (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setTab("basic")}
            >
              Go to Basic info
            </button>
          )}
        </p>
      )}

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

