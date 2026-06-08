import { useEffect, useState } from "react";
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
import { DocsPage } from "@/pages/DocsPage";
import { AuthPage } from "@/pages/AuthPage";
import { Blobs } from "@/components/illustrations/Blobs";
import { Onboarding, hasOnboarded } from "@/components/onboarding/Onboarding";
import { isSupabaseConfigured } from "@/lib/supabase";

export type MainView = "home" | "library" | "discover" | "stats";
export type AppView = MainView | "settings" | "docs";

function AuthedApp() {
  // The Docs page is the one view with its own URL (`/docs`); everything else
  // lives at `/`. We keep `view` as the source of truth and sync the path with
  // the History API so /docs is shareable and survives reload.
  const [view, setView] = useState<AppView>(() =>
    window.location.pathname.startsWith("/docs") ? "docs" : "library",
  );
  const [prevMain, setPrevMain] = useState<MainView>("library");
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded());

  // Keep the URL in sync with the current view.
  useEffect(() => {
    const target = view === "docs" ? "/docs" : "/";
    if (window.location.pathname !== target) {
      window.history.pushState({}, "", target);
    }
  }, [view]);

  // React to browser back/forward.
  useEffect(() => {
    function onPop() {
      setView(window.location.pathname.startsWith("/docs") ? "docs" : prevMain);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [prevMain]);

  function openSettings() {
    if (view !== "settings" && view !== "docs") setPrevMain(view as MainView);
    setView("settings");
  }

  function openDocs() {
    if (view !== "settings" && view !== "docs") setPrevMain(view as MainView);
    setView("docs");
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
            onOpenDocs={openDocs}
          >
            {view === "settings" ? (
              <SettingsPage onBack={() => setView(prevMain)} />
            ) : view === "docs" ? (
              <DocsPage onBack={() => setView(prevMain)} />
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

function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 space-y-3 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Configuration needed</h1>
        <p className="text-sm text-muted-foreground">
          The app can&apos;t reach its backend because the Supabase environment
          variables are missing.
        </p>
        <div className="text-left text-xs bg-muted/60 rounded-lg p-3 font-mono leading-relaxed">
          VITE_SUPABASE_URL
          <br />
          VITE_SUPABASE_PUBLISHABLE_KEY
        </div>
        <p className="text-xs text-muted-foreground">
          Add them in Vercel → Settings → Environment Variables (all
          environments), then redeploy. For local dev, copy{" "}
          <code>.env.example</code> to <code>.env.local</code>.
        </p>
      </div>
    </div>
  );
}

function AppRouter() {
  if (!isSupabaseConfigured) return <ConfigError />;
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
