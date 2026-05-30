import { useState } from "react";
import { LibraryProvider } from "@/store/library";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryPage } from "@/pages/LibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";

type View = "library" | "settings";

export default function App() {
  const [view, setView] = useState<View>("library");
  return (
    <LibraryProvider>
      <AppShell onOpenSettings={() => setView(view === "settings" ? "library" : "settings")}>
        {view === "settings" ? (
          <SettingsPage onBack={() => setView("library")} />
        ) : (
          <LibraryPage />
        )}
      </AppShell>
    </LibraryProvider>
  );
}
