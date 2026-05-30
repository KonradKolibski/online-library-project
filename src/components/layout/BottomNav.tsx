import { Home, Heart, ShoppingBag, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Home", active: true },
  { icon: ShoppingBag, label: "Saved" },
  { icon: Heart, label: "Liked" },
  { icon: LayoutGrid, label: "Browse" },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-md">
      <ul className="mx-auto max-w-md flex items-center justify-around px-2 py-3">
        {items.map(({ icon: Icon, label, active }) => (
          <li key={label}>
            <button
              className={cn(
                "flex items-center justify-center h-11 w-11 rounded-2xl",
                active ? "text-foreground" : "text-muted-foreground",
              )}
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
