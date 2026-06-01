import { useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  User,
  BookOpen,
  Library,
  Bell,
  Database,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { ShelfManager } from "@/components/settings/ShelfManager";
import { useSettings } from "@/store/settings";
import { useLibrary } from "@/store/library";
import { load } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
  onBack: () => void;
}

type ActiveSection = "profile" | "library" | "shelves" | "notifications" | "data" | null;

// ─── Menu list ────────────────────────────────────────────────────────────────

const MENU_ITEMS: {
  id: ActiveSection & string;
  icon: React.ElementType;
  title: string;
  description: string;
  comingSoon?: boolean;
}[] = [
  {
    id: "profile",
    icon: User,
    title: "Profile",
    description: "Your name and personal reading goal",
  },
  {
    id: "library",
    icon: BookOpen,
    title: "Categories",
    description: "Manage the categories you use to tag books",
  },
  {
    id: "shelves",
    icon: Library,
    title: "Shelves",
    description: "Create and manage your personal collections",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    description: "Reading reminders and streak alerts",
    comingSoon: true,
  },
  {
    id: "data",
    icon: Database,
    title: "Data",
    description: "Export, import or clear your library",
  },
];

// ─── Section wrapper (used inside each sub-screen) ───────────────────────────

function SectionContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-6 pb-8">{children}</div>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { settings, update } = useSettings();
  const [name, setName] = useState(settings.name);
  const [goal, setGoal] = useState(
    settings.readingGoal !== null ? String(settings.readingGoal) : "",
  );

  function handleSave() {
    const parsedGoal = parseInt(goal, 10);
    update({
      name: name.trim(),
      readingGoal:
        goal.trim() && !isNaN(parsedGoal) && parsedGoal > 0 ? parsedGoal : null,
    });
  }

  const initials = name.trim()
    ? name
        .trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <SectionContent>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xl shrink-0">
          {initials}
        </div>
        <p className="text-sm text-muted-foreground">
          {name.trim()
            ? `Hi, ${name.trim().split(" ")[0]}!`
            : "Add your name to personalise the app."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            placeholder="e.g. Konrad"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reading-goal">Reading goal (books / year)</Label>
          <Input
            id="reading-goal"
            type="number"
            min={1}
            max={999}
            placeholder="e.g. 24"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="sm">
          Save profile
        </Button>
      </div>
    </SectionContent>
  );
}

// ─── Library ──────────────────────────────────────────────────────────────────

function LibrarySection() {
  return (
    <SectionContent>
      <CategoryManager />
    </SectionContent>
  );
}

// ─── Shelves ──────────────────────────────────────────────────────────────────

function ShelvesSection() {
  return (
    <SectionContent>
      <ShelfManager />
    </SectionContent>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection() {
  return (
    <SectionContent>
      <div className="rounded-2xl bg-muted/60 border border-border px-6 py-10 text-center space-y-2">
        <Bell className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="font-medium text-muted-foreground">Coming soon</p>
        <p className="text-sm text-muted-foreground/70">
          Reading reminders and streak alerts will be available in a future update.
        </p>
      </div>
    </SectionContent>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function DataSection() {
  const { state, importState, clearAll } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function handleExport() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capy-books-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = JSON.parse(reader.result as string) as any;
        const v = parsed?.schemaVersion;
        if (
          (v !== 1 && v !== 2 && v !== 3 && v !== 4) ||
          !Array.isArray(parsed.books) ||
          !Array.isArray(parsed.categories)
        ) {
          setImportError("Invalid file format. Please use a capy.books export.");
          return;
        }
        localStorage.setItem("online-library:v1", JSON.stringify(parsed));
        importState(load());
      } catch {
        setImportError("Could not parse the file. Make sure it's a valid JSON export.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <SectionContent>
      <div className="space-y-3">
        {/* Export */}
        <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
          <div>
            <p className="font-medium text-sm">Export library</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download all your books and categories as a JSON file.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Import */}
        <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
          <div>
            <p className="font-medium text-sm">Import library</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Restore from a previous export. This replaces your current library.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {importError && (
          <p className="text-sm text-destructive px-1">{importError}</p>
        )}

        {/* Clear all */}
        <div className="flex items-center justify-between rounded-xl bg-destructive/5 border border-destructive/20 p-4">
          <div>
            <p className="font-medium text-sm text-destructive">Clear all data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete all {state.books.length} book
              {state.books.length !== 1 ? "s" : ""} and categories. Cannot be undone.
            </p>
          </div>
          {confirmClear ? (
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
              >
                Delete all
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </SectionContent>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<string, React.ElementType> = {
  profile: ProfileSection,
  library: LibrarySection,
  shelves: ShelvesSection,
  notifications: NotificationsSection,
  data: DataSection,
};

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [active, setActive] = useState<ActiveSection>(null);

  const activeItem = MENU_ITEMS.find((m) => m.id === active);
  const ActiveIcon = activeItem ? activeItem.icon : null;
  const ActiveSection = active ? SECTION_COMPONENTS[active] : null;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={active ? () => setActive(null) : onBack}
          aria-label={active ? "Back to settings" : "Back"}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {ActiveIcon && <ActiveIcon className="h-5 w-5 text-primary" />}
          <h2 className="text-2xl font-semibold tracking-tight">
            {activeItem ? activeItem.title : "Settings"}
          </h2>
        </div>
      </div>

      {/* Menu list */}
      {!active && (
        <ul className="flex flex-col gap-2">
          {MENU_ITEMS.map(({ id, icon: Icon, title, description, comingSoon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => !comingSoon && setActive(id as ActiveSection)}
                className={cn(
                  "w-full flex items-center gap-4 rounded-2xl bg-card border border-border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  comingSoon
                    ? "cursor-default opacity-60"
                    : "hover:bg-accent/40 hover:border-primary/30",
                )}
              >
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {description}
                  </p>
                </div>
                {comingSoon ? (
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Active section content */}
      {ActiveSection && <ActiveSection />}
    </div>
  );
}
