import { Home, Library, Compass, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MainView, AppView } from "@/App";

const ITEMS = [
  { id: "home" as MainView, icon: Home, label: "Home" },
  { id: "library" as MainView, icon: Library, label: "Library" },
  { id: "discover" as MainView, icon: Compass, label: "Discover" },
  { id: "stats" as MainView, icon: BarChart2, label: "Stats" },
];

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: MainView) => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-md">
      <ul className="mx-auto max-w-md flex items-center justify-around px-2 py-2">
        {ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = currentView === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onNavigate(id)}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
