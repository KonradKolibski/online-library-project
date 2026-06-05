import { useState } from "react";
import { LibraryProvider } from "@/store/library";
import { SettingsProvider } from "@/store/settings";
import { AddBookProvider } from "@/store/addBook";
import { AuthProvider, useAuth } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryPage } from "@/pages/LibraryPage";
import { HomePage } from "@/pages/HomePage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { StatsPage } from "@/pages/StatsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AuthPage } from "@/pages/AuthPage";
import { Blobs } from "@/components/illustrations/Blobs";
import { Onboarding, hasOnboarded } from "@/components/onboarding/Onboarding";

export type MainView = "home" | "library" | "discover" | "stats";
export type AppView = MainView | "settings";

function AuthedApp() {
  const [view, setView] = useState<AppView>("library");
  const [prevMain, setPrevMain] = useState<MainView>("library");
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded());

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
        <AddBookProvider>
          <Blobs />
          <AppShell
            currentView={view}
            onNavigate={navigate}
            onOpenSettings={openSettings}
          >
            {view === "settings" ? (
              <SettingsPage onBack={() => setView(prevMain)} />
            ) : view === "home" ? (
              <HomePage onNavigate={navigate} onOpenSettings={openSettings} />
            ) : view === "discover" ? (
              <DiscoverPage />
            ) : view === "stats" ? (
              <StatsPage />
            ) : (
              <LibraryPage />
            )}
          </AppShell>
          {showOnboarding && (
            <Onboarding onDone={() => setShowOnboarding(false)} />
          )}
        </AddBookProvider>
      </LibraryProvider>
    </SettingsProvider>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <AuthPage />;
  return <AuthedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
