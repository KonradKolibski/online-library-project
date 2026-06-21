import { type ReactNode, useState } from "react";
import {
  Settings as SettingsIcon,
  FileText,
  Home,
  Library,
  Compass,
  BarChart2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "./BottomNav";
import { useAddBook } from "@/store/addBook";
import { cn } from "@/lib/utils";
import type { MainView, AppView } from "@/App";

const SEEN_KEY = "capy-books:seen-tabs";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string, seen: Set<string>): Set<string> {
  const next = new Set(seen);
  next.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  return next;
}

interface NavItem {
  id: MainView;
  label: string;
  icon: React.ElementType;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, comingSoon: true },
  { id: "library", label: "My Library", icon: Library },
  { id: "discover", label: "Discover", icon: Compass, comingSoon: true },
  { id: "stats", label: "Stats", icon: BarChart2, comingSoon: true },
];

interface AppShellProps {
  children: ReactNode;
  currentView: AppView;
  onNavigate: (view: MainView) => void;
  onOpenSettings?: () => void;
  onOpenDocs?: () => void;
}

export function AppShell({
  children,
  currentView,
  onNavigate,
  onOpenSettings,
  onOpenDocs,
}: AppShellProps) {
  const [seen, setSeen] = useState<Set<string>>(loadSeen);
  const { openAddBook } = useAddBook();

  function handleNavigate(id: MainView) {
    setSeen((prev) => markSeen(id, prev));
    onNavigate(id);
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo — returns to Home */}
          <button
            type="button"
            onClick={() => handleNavigate("home")}
            aria-label="Go to home"
            className="flex items-center gap-2 shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/logo.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-2xl shadow-sm"
            />
            <span className="font-display font-semibold text-lg tracking-tight hidden sm:block">
              capy.books
            </span>
          </button>

          {/* Nav tabs — desktop only (mobile uses BottomNav) */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon, comingSoon }) => {
              const isActive = currentView === id;
              const showDot = comingSoon && !seen.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate(id)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                  {showDot && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenDocs && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenDocs}
                aria-label="API docs"
                className={cn(currentView === "docs" && "text-primary bg-primary/10")}
              >
                <FileText className="h-5 w-5" />
              </Button>
            )}
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                aria-label="Settings"
                className={cn(currentView === "settings" && "text-primary bg-primary/10")}
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pb-28 md:pb-10 pt-4">
        {children}
      </main>

      <BottomNav currentView={currentView} onNavigate={handleNavigate} />

      {/*
        Global Add-Book FAB — always visible on mobile, regardless of which
        section is active. Anchored so its centre sits exactly on the bottom
        nav's top edge (nav is 66px tall, FAB is 56px, so bottom = 38px).
        Hidden on the Settings screen where it would feel out of place.
      */}
      {currentView !== "settings" && currentView !== "docs" && (
        <button
          type="button"
          onClick={() => openAddBook()}
          className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-[38px] z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Add book"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
