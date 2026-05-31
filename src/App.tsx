import { useState } from "react";
import { LibraryProvider } from "@/store/library";
import { SettingsProvider } from "@/store/settings";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryPage } from "@/pages/LibraryPage";
import { HomePage } from "@/pages/HomePage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { StatsPage } from "@/pages/StatsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { Blobs } from "@/components/illustrations/Blobs";

export type MainView = "home" | "library" | "discover" | "stats";
export type AppView = MainView | "settings";

export default function App() {
  const [view, setView] = useState<AppView>("library");
  const [prevMain, setPrevMain] = useState<MainView>("library");

  function openSettings() {
    if (view !== "settings") setPrevMain(view as MainView);
    setView("settings");
  }

  function navigate(v: MainView) {
    setView(v);
    setPrevMain(v);
  }

  return (
    <SettingsProvider>
      <LibraryProvider>
        <Blobs />
        <AppShell
          currentView={view}
          onNavigate={navigate}
          onOpenSettings={openSettings}
        >
          {view === "settings" ? (
            <SettingsPage onBack={() => setView(prevMain)} />
          ) : view === "home" ? (
            <HomePage />
          ) : view === "discover" ? (
            <DiscoverPage />
          ) : view === "stats" ? (
            <StatsPage />
          ) : (
            <LibraryPage />
          )}
        </AppShell>
      </LibraryProvider>
    </SettingsProvider>
  );
}
