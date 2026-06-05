import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookHeart,
  Library,
  CalendarHeart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "capy-books:onboarded";

/** Returns true if the user has already completed (or skipped) onboarding. */
export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true; // if storage is unavailable, don't nag
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface Step {
  icon: React.ElementType;
  illustration: string;
  /** Gradient classes for the illustration backdrop. */
  gradient: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: BookHeart,
    illustration: "/illustrations/capy-armchair.svg",
    gradient: "from-indigo-100/70 via-purple-100/50 to-pink-100/60",
    eyebrow: "Your library",
    title: "Welcome to capy.books",
    body: (
      <>
        Your cosy personal library. Add every book you own, are reading, or
        dream of reading — all in one calm place. Search a title to auto-fill
        the cover and details, or just{" "}
        <span className="font-medium text-foreground">scan the barcode</span> on
        the back.
      </>
    ),
  },
  {
    icon: Library,
    illustration: "/illustrations/capy-bookcase.svg",
    gradient: "from-amber-100/70 via-orange-100/40 to-rose-100/60",
    eyebrow: "Stay organised",
    title: "Organise it your way",
    body: (
      <>
        Sort books into <span className="font-medium text-foreground">categories</span>,
        build custom <span className="font-medium text-foreground">shelves</span>{" "}
        like “Favourites” or “Lent out”, and colour-code them. Every book tracks
        its own status — to read, reading, or finished.
      </>
    ),
  },
  {
    icon: CalendarHeart,
    illustration: "/illustrations/capy-sleeping-on-books.svg",
    gradient: "from-emerald-100/60 via-teal-100/40 to-sky-100/60",
    eyebrow: "Build the habit",
    title: "Track every reading day",
    body: (
      <>
        Log your daily reading, watch your{" "}
        <span className="font-medium text-foreground">weekly streak</span> grow,
        nudge progress along, and rate the books you finish. Your dashboard pulls
        it all together at a glance.
      </>
    ),
  },
  {
    icon: Sparkles,
    illustration: "/illustrations/capy-chilling.svg",
    gradient: "from-fuchsia-100/60 via-pink-100/50 to-amber-100/50",
    eyebrow: "On the horizon",
    title: "And we're just getting started",
    body: (
      <>
        Coming soon — reading{" "}
        <span className="font-medium text-foreground">streaks &amp; rewards</span>,
        a mood-based{" "}
        <span className="font-medium text-foreground">Discover</span> engine to
        find your next read, richer{" "}
        <span className="font-medium text-foreground">stats</span>, a fully
        customisable dashboard, and a capybara companion to cheer you on.
      </>
    ),
  },
];

interface OnboardingProps {
  /** Called when onboarding is finished or skipped. */
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  function finish() {
    markOnboarded();
    onDone();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6">
      {/* Dimmed, blurred backdrop */}
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Card — fixed height so every step looks identical regardless of how
        much body copy it carries. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className={cn(
          "relative bg-card shadow-2xl overflow-hidden flex flex-col",
          // Mobile: fill the screen, no rounded corners.
          "w-full h-full rounded-none",
          // Desktop (sm+): centred fixed-height card.
          "sm:w-full sm:max-w-md sm:h-[560px] sm:max-h-[90vh] sm:rounded-3xl",
        )}
      >
        {/* Illustration panel */}
        <div
          className={cn(
            "relative shrink-0 bg-gradient-to-br flex items-center justify-center px-8 pt-8 pb-4",
            current.gradient,
          )}
        >
          <img
            src={current.illustration}
            alt=""
            aria-hidden="true"
            className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-sm"
          />
        </div>

        {/* Content — flexes to fill the remaining space so the footer stays
          pinned to the bottom at a constant position across steps. */}
        <div className="flex-1 flex flex-col gap-3 px-6 sm:px-8 py-5 overflow-y-auto">
          <div className="flex items-center gap-2 text-primary">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {current.eyebrow}
            </span>
          </div>
          <h2
            id="onboarding-title"
            className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight"
          >
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {current.body}
          </p>
        </div>

        {/* Footer — dots + Skip on the left, nav on the right */}
        <div className="flex items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-border/60">
          {/* Left: progress dots + Skip */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-foreground/20 hover:bg-foreground/30",
                  )}
                />
              ))}
            </div>
            {!isLast && (
              <button
                type="button"
                onClick={finish}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          {/* Right: nav */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                Get started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
