import type { ReactNode } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  onOpenSettings?: () => void;
}

export function AppShell({ children, onOpenSettings }: AppShellProps) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-2xl shadow-sm"
            />
            <span className="font-display font-semibold text-lg tracking-tight">capy.books</span>
          </div>
          {onOpenSettings && (
            <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pb-28 md:pb-10 pt-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
