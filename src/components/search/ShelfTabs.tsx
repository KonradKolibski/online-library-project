import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Shelf } from "@/types/book";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ColorSwatches } from "@/components/settings/ColorSwatches";

interface MenuPos {
  id: string;
  top: number;
  right: number;
}

interface ShelfTabsProps {
  shelves: Shelf[];
  activeId: string | null; // null = "All books"
  onChange: (id: string | null) => void;
  onCreate: (name: string, color?: string) => void;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: string | undefined) => void;
  onDelete: (id: string) => void;
  bookCounts: Map<string | null, number>;
}

interface CreatePos {
  top: number;
  left: number;
}

export function ShelfTabs({
  shelves,
  activeId,
  onChange,
  onCreate,
  onRename,
  onSetColor,
  onDelete,
  bookCounts,
}: ShelfTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const didDrag = useRef(false);

  const [createPos, setCreatePos] = useState<CreatePos | null>(null);
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<string | undefined>(undefined);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const menuOpenFor = menuPos?.id ?? null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Close menu on outside click or scroll
  useEffect(() => {
    if (!menuOpenFor) return;
    function handler(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-shelf-menu]") && !t.closest("[data-shelf-menu-popover]")) {
        setMenuPos(null);
      }
    }
    function closeOnScroll() {
      setMenuPos(null);
    }
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [menuOpenFor]);

  // Close create popover on outside click or scroll
  useEffect(() => {
    if (!createPos) return;
    function handler(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (
        !t.closest("[data-shelf-create-trigger]") &&
        !t.closest("[data-shelf-create-popover]")
      ) {
        cancelCreate();
      }
    }
    function closeOnScroll() {
      cancelCreate();
    }
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPos]);

  // Drag-to-scroll
  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    dragStart.current = { x: e.pageX, scrollLeft: el.scrollLeft };
    didDrag.current = false;
    el.style.cursor = "grabbing";
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current || !scrollRef.current) return;
    const dx = e.pageX - dragStart.current.x;
    if (Math.abs(dx) > 4) didDrag.current = true;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }
  function onMouseUp() {
    dragStart.current = null;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }
  function onTabClick(cb: () => void) {
    if (!didDrag.current) cb();
  }

  function commitCreate() {
    const name = draft.trim();
    if (name) onCreate(name, draftColor);
    setDraft("");
    setDraftColor(undefined);
    setCreatePos(null);
  }

  function cancelCreate() {
    setDraft("");
    setDraftColor(undefined);
    setCreatePos(null);
  }

  function startRename(s: Shelf) {
    setEditingId(s.id);
    setEditValue(s.name);
    setMenuPos(null);
  }

  function commitRename() {
    if (!editingId) return;
    const name = editValue.trim();
    if (name) onRename(editingId, name);
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div
      ref={scrollRef}
      className="relative flex items-center gap-1 overflow-x-auto scrollbar-none select-none cursor-grab"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* "All books" — always first */}
      <Tab
        active={activeId === null}
        count={bookCounts.get(null)}
        onClick={() => onTabClick(() => onChange(null))}
      >
        All books
      </Tab>

      {/* User shelves */}
      {shelves.map((s) => {
        const isActive = activeId === s.id;
        const isEditing = editingId === s.id;

        if (isEditing) {
          return (
            <div
              key={s.id}
              className="flex items-center px-2"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                onBlur={commitRename}
                autoFocus
                className="h-8 w-32"
              />
            </div>
          );
        }

        return (
          <div key={s.id} className="relative flex items-center" data-shelf-menu>
            <Tab
              active={isActive}
              count={bookCounts.get(s.id)}
              color={s.color}
              onClick={() => onTabClick(() => onChange(s.id))}
            >
              {s.name}
            </Tab>
            {/* Menu trigger — appears only on active shelf or on hover */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (menuOpenFor === s.id) {
                  setMenuPos(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({
                    id: s.id,
                    top: rect.bottom + 4,
                    right: window.innerWidth - rect.right,
                  });
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "absolute right-0.5 top-1/2 -translate-y-1/2 -mt-1 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              aria-label={`Options for ${s.name}`}
              style={{ display: isActive || menuOpenFor === s.id ? "flex" : undefined }}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* "+" — opens create popover */}
      <button
        type="button"
        data-shelf-create-trigger
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (didDrag.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setCreatePos({ top: rect.bottom + 4, left: rect.left });
        }}
        className="shrink-0 flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent transition-colors"
        aria-label="New shelf"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* Portal menu (rendered outside the scroll container) */}
      {menuPos &&
        (() => {
          const shelf = shelves.find((s) => s.id === menuPos.id);
          if (!shelf) return null;
          return createPortal(
            <div
              data-shelf-menu-popover
              className="fixed z-50 rounded-xl border border-input bg-popover shadow-md py-1 min-w-[200px]"
              style={{ top: menuPos.top, right: menuPos.right }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Colour swatches */}
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Colour
                </p>
                <ColorSwatches
                  value={shelf.color}
                  onChange={(c) => onSetColor(shelf.id, c)}
                  size="sm"
                />
              </div>
              <button
                type="button"
                onClick={() => startRename(shelf)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(shelf.id);
                  setMenuPos(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>,
            document.body,
          );
        })()}

      {/* Create-shelf popover */}
      {createPos &&
        createPortal(
          <div
            data-shelf-create-popover
            className="fixed z-50 rounded-xl border border-input bg-popover shadow-md p-3 w-[260px] space-y-3"
            style={{ top: createPos.top, left: createPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCreate();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelCreate();
                }
              }}
              placeholder="Shelf name"
              autoFocus
              className="h-9"
            />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Colour
              </p>
              <ColorSwatches value={draftColor} onChange={setDraftColor} size="sm" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelCreate}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitCreate}
                disabled={!draft.trim()}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Tab({
  active,
  count,
  color,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group shrink-0 flex items-center justify-center gap-1.5 px-6 py-2.5 text-sm font-medium border-b-2 transition-colors relative",
        active
          ? "text-primary border-primary"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {color && (
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span>{children}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "text-xs tabular-nums rounded-full px-1.5 py-0.5",
            active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
