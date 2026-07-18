import { useState } from "react";
import { Clock, Target } from "lucide-react";
import { useChallenges } from "@/store/challenges";
import {
  daysLeft,
  goalUnit,
  timeLeftLabel,
  type ChallengeGoalType,
  type ChallengeProgress,
} from "@/lib/challenges";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { ChallengeDetailDialog } from "@/components/progress/ChallengeDetailDialog";
import { cn } from "@/lib/utils";

/** Colourful card themes, cycled by challenge index. */
const PALETTES = [
  { bg: "bg-[radial-gradient(120%_110%_at_50%_22%,#ffc6be,#ff9e9e)]", bar: "bg-rose-500" },
  { bg: "bg-[radial-gradient(120%_110%_at_50%_22%,#f1ffb2,#e3ff8a)]", bar: "bg-lime-500" },
  { bg: "bg-[radial-gradient(120%_110%_at_50%_22%,#c9e1ff,#9ec4ff)]", bar: "bg-sky-500" },
  { bg: "bg-[radial-gradient(120%_110%_at_50%_22%,#ffe6b4,#ffcf87)]", bar: "bg-amber-500" },
  { bg: "bg-[radial-gradient(120%_110%_at_50%_22%,#e7d6ff,#cbb4ff)]", bar: "bg-violet-500" },
];
const COMPLETED_PALETTE = {
  bg: "bg-[radial-gradient(120%_110%_at_50%_22%,#c2f2d1,#86e0a3)]",
  bar: "bg-emerald-500",
};

/** Transparent illustration per goal type. */
function challengeArt(goalType: ChallengeGoalType): string {
  switch (goalType) {
    case "days_logged":
    case "minutes_read":
      return "/illustrations/challenge-clock.png";
    default: // books_finished, pages_read, distinct_genres
      return "/illustrations/challenge-stack-of-books.png";
  }
}

/**
 * Reading challenges as colourful ~square cards (design-matched): a transparent
 * illustration, title, progress bar, and a floating time-left pill. Authored in
 * the CMS and evaluated server-side; this just renders the result.
 */
export function ChallengesGrid() {
  const { challenges, loading } = useChallenges();
  const [selected, setSelected] = useState<{ challenge: ChallengeProgress; index: number } | null>(
    null,
  );

  // A completed challenge stays visible until its deadline passes, then drops off
  // so the section doesn't pile up. Incomplete challenges always come first.
  const visible = challenges
    .filter((c) => {
      if (!c.completed) return true;
      const remaining = daysLeft(c.endDate);
      return remaining === null || remaining >= 0;
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  if (visible.length > 0) {
    const palette = selected
      ? selected.challenge.completed
        ? COMPLETED_PALETTE
        : PALETTES[selected.index % PALETTES.length]
      : null;

    return (
      <>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-2 lg:gap-x-4">
          {visible.map((c, i) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              index={i}
              onClick={() => setSelected({ challenge: c, index: i })}
            />
          ))}
        </ul>

        <ChallengeDetailDialog
          challenge={selected?.challenge ?? null}
          art={selected ? challengeArt(selected.challenge.goalType) : ""}
          bg={palette?.bg ?? ""}
          bar={palette?.bar ?? ""}
          open={selected !== null}
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
        />
      </>
    );
  }
  if (loading) return <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />;
  return <EmptyState />;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 flex flex-col items-center text-center gap-1.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
        <Target className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">No active challenges right now</p>
      <p className="text-xs text-muted-foreground">
        New reading challenges show up here when they&apos;re live.
      </p>
    </div>
  );
}

function ChallengeCard({
  challenge: c,
  index,
  onClick,
}: {
  challenge: ChallengeProgress;
  index: number;
  onClick: () => void;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((c.progress / c.target) * 100)));
  const unit = goalUnit(c.goalType);
  const palette = c.completed ? COMPLETED_PALETTE : PALETTES[index % PALETTES.length];

  const timeLabel = c.completed ? null : timeLeftLabel(c.endDate);
  const remaining = daysLeft(c.endDate);
  const urgent = remaining !== null && remaining <= 2;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${c.title} — view details`}
        className={cn(
          "flex h-full w-full flex-col gap-2 rounded-2xl p-3 text-left shadow-[0_4px_0_0_rgba(0,0,0,0.18)] transition-transform lg:flex-row lg:items-start lg:gap-3",
          "hover:brightness-[1.03] active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          palette.bg,
          c.completed && "opacity-60",
        )}
      >
        <img
          src={challengeArt(c.goalType)}
          alt=""
          aria-hidden
          className="h-[72px] w-[72px] shrink-0 object-contain"
        />

        <div className="flex min-h-0 w-full flex-1 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="font-display text-sm font-bold leading-tight text-black/80 line-clamp-1">
              {c.title}
            </p>
            {c.description && (
              <p className="text-xs font-medium leading-snug text-black/70 line-clamp-2">
                {c.description}
              </p>
            )}
          </div>

          <ProgressBar pct={pct} fillClassName={palette.bar} />
          <p className="text-xs font-medium tabular-nums text-black/80">
            {c.completed ? "Completed" : `${c.progress} / ${c.target} ${unit}`}
          </p>
        </div>
      </button>

      {timeLabel && (
        <span
          className={cn(
            "pointer-events-none absolute -top-2 right-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm tabular-nums",
            urgent ? "text-amber-600" : "text-black/80",
          )}
        >
          <Clock className="h-3 w-3" />
          {timeLabel}
        </span>
      )}
    </li>
  );
}
