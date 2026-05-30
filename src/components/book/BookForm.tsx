import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { X, Upload } from "lucide-react";
import type { Book, ReadingStatus } from "@/types/book";
import { useLibrary, type BookInput } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { StarRating } from "./StarRating";
import { CoverImage } from "./CoverImage";

interface BookFormProps {
  initial?: Book;
  onSubmit: (input: BookInput) => void;
  onCancel: () => void;
}

const STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
];

export function BookForm({ initial, onSubmit, onCancel }: BookFormProps) {
  const { state } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? state.categories[0]?.id ?? "",
  );
  const [status, setStatus] = useState<ReadingStatus>(initial?.status ?? "to-read");
  const [progress, setProgress] = useState<number>(initial?.progress ?? 0);
  const [rating, setRating] = useState<number | undefined>(initial?.rating);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  function commitTagDraft() {
    const value = tagDraft.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (!tags.includes(value)) setTags([...tags, value]);
    setTagDraft("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTagDraft();
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCoverUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError("Title and author are required.");
      return;
    }
    if (!categoryId) {
      setError("Please pick a category.");
      return;
    }
    const input: BookInput = {
      title: title.trim(),
      author: author.trim(),
      coverUrl: coverUrl.trim() || undefined,
      tags,
      categoryId,
      status,
      progress: status === "reading" ? progress : undefined,
      rating,
      notes: notes.trim() || undefined,
    };
    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
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

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {state.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background px-2 py-2 min-h-10">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            id="tags"
            className="flex-1 min-w-[8ch] bg-transparent outline-none text-sm py-1 px-1"
            placeholder={tags.length ? "" : "Add a tag and press Enter"}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={commitTagDraft}
          />
        </div>
      </div>

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
              <span className="text-sm text-muted-foreground tabular-nums">{progress}%</span>
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

      <div className="space-y-2">
        <Label>Rating</Label>
        <StarRating value={rating} onChange={setRating} />
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add book"}</Button>
      </div>
    </form>
  );
}
