import { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { useLibrary } from "@/store/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CategoryManager() {
  const { state, addCategory, renameCategory, deleteCategory } = useLibrary();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function handleAdd() {
    const name = draft.trim();
    if (!name) return;
    addCategory(name);
    setDraft("");
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditValue(current);
  }

  function commitEdit() {
    if (!editingId) return;
    const name = editValue.trim();
    if (name) renameCategory(editingId, name);
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="New category name"
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
      <ul className="space-y-2">
        {state.categories.map((c) => {
          const count = state.books.filter((b) => b.categoryId === c.id).length;
          const isEditing = editingId === c.id;
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-sm"
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "book" : "books"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(c.id, c.name)}
                    aria-label={`Rename ${c.name}`}
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
                          `Delete "${c.name}"? ${count} book(s) will move to "Uncategorized".`,
                        );
                      if (ok) deleteCategory(c.id);
                    }}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
