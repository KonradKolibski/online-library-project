import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadingIllustration } from "@/components/illustrations/ReadingIllustration";

interface WelcomeHeroProps {
  /** First name shown in the greeting. Empty/undefined falls back to a generic line. */
  name?: string;
  /** "empty" — onboarding hero with the Add CTA. "returning" — greeting only. */
  variant: "empty" | "returning";
  /** Required when variant="empty". Opens the global Add Book dialog. */
  onAddBook?: () => void;
}

export function WelcomeHero({ name, variant, onAddBook }: WelcomeHeroProps) {
  const firstName = name?.trim().split(" ")[0];

  // ── Empty library — full onboarding hero with illustration + CTA ──
  if (variant === "empty") {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100/60 via-pink-100/50 to-amber-100/50 px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div className="space-y-3 max-w-md">
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              {firstName ? `Welcome, ${firstName}` : "Welcome to capy.books"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Build your personal shelf. Add titles, rate what you've read, and
              find anything in seconds.
            </p>
            {onAddBook && (
              <Button size="lg" onClick={onAddBook}>
                <Plus className="h-4 w-4" />
                Add your first book
              </Button>
            )}
          </div>
          <ReadingIllustration className="w-full max-w-md justify-self-center" />
        </div>
      </div>
    );
  }

  // ── Returning user — slim banner, one greeting line ──
  return (
    <div className="rounded-2xl bg-gradient-to-r from-indigo-100/60 via-pink-100/50 to-amber-100/50 px-4 py-3 sm:px-5">
      <p className="text-base sm:text-lg font-semibold tracking-tight">
        {firstName ? `Hi, ${firstName} 👋` : "Welcome back 👋"}
      </p>
    </div>
  );
}
