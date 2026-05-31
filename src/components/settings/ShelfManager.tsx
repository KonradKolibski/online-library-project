import { useState } from "react";
import { Pencil, Trash2, Check, X, Plus, Palette } from "lucide-react";
import { useLibrary } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorSwatches } from "./ColorSwatches";

export function ShelfManager() {
  const { state, addShelf, renameShelf, setShelfColor, deleteShelf } = useLibrary();
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [colorOpenFor, setColorOpenFor] = useState<string | null>(null);

  function handleAdd() {
    const name = draft.trim();
    if (!name) return;
    addShelf(name, draftColor);
    setDraft("");
    setDraftColor(undefined);
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditValue(current);
  }

  function commitEdit() {
    if (!editingId) return;
    const name = editValue.trim();
    if (name) renameShelf(editingId, name);
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-input bg-card p-3 space-y-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="New shelf name"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button onClick={handleAdd} disabled={!draft.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Colour
          </p>
          <ColorSwatches value={draftColor} onChange={setDraftColor} size="sm" />
        </div>
      </div>

      {state.shelves.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any shelves yet. Create one above or add a book to a new shelf from the book form.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {state.shelves.map((s) => {
            const count = state.books.filter((b) => b.shelfIds.includes(s.id)).length;
            const isEditing = editingId === s.id;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 shadow-sm"
              >
                {isEditing ? (
                  <>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitEdit();
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={commitEdit} aria-label="Save">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Colour dot */}
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full shrink-0 border border-border"
                      style={{ backgroundColor: s.color ?? "transparent" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "book" : "books"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setColorOpenFor(colorOpenFor === s.id ? null : s.id)
                      }
                      aria-label={`Change colour of ${s.name}`}
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(s.id, s.name)}
                      aria-label={`Rename ${s.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const ok =
                          count === 0 ||
                          window.confirm(
                            `Delete "${s.name}"? ${count} book(s) will be removed from this shelf.`,
                          );
                        if (ok) deleteShelf(s.id);
                      }}
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {/* Colour picker drawer */}
                {colorOpenFor === s.id && !isEditing && (
                  <div className="basis-full pt-3 mt-1 border-t border-border">
                    <ColorSwatches
                      value={s.color}
                      onChange={(c) => setShelfColor(s.id, c)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
