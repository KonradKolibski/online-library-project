import { Check, Coins, Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { ACHIEVEMENTS, DIFFICULTY_META, type TrackProgress } from "@/lib/achievements";
import { cn } from "@/lib/utils";

const REWARD_BY_ID = new Map(
  ACHIEVEMENTS.map((a) => [a.id, { xp: a.xpReward, coins: a.coinReward }]),
);

/** Format a YYYY-MM-DD string as a friendly local date. */
function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface AchievementDetailDialogProps {
  tp: TrackProgress | null;
  unlockDate: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Reddit-style achievement detail: badge, difficulty, unlock date, level breakdown. */
export function AchievementDetailDialog({
  tp,
  unlockDate,
  open,
  onOpenChange,
}: AchievementDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="s">
        {tp ? <Body tp={tp} unlockDate={unlockDate} /> : <DialogTitle className="sr-only">Achievement</DialogTitle>}
      </DialogContent>
    </Dialog>
  );
}

function Body({ tp, unlockDate }: { tp: TrackProgress; unlockDate: string | null }) {
  const { track, accent, maxed } = tp;
  const Icon = track.icon;
  const diff = DIFFICULTY_META[track.difficulty];

  return (
    <div className="flex flex-col items-center text-center">
      {/* Large badge */}
      <div className="h-24 w-24 overflow-hidden rounded-3xl shadow-[0_6px_0_0_rgba(0,0,0,0.16)]">
        {track.illustration ? (
          <img src={track.illustration} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", accent.badge)}>
            <Icon className="h-10 w-10" />
          </div>
        )}
      </div>

      <DialogTitle className="mt-4 text-xl">{track.title}</DialogTitle>
      <p className="mt-1 text-sm text-muted-foreground max-w-[34ch]">
        {maxed ? "You've completed every level of this achievement." : tp.goal}
      </p>

      {/* Difficulty + unlock date */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", diff.classes)}>
          {diff.label}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {unlockDate ? `Unlocked ${formatDate(unlockDate)}` : "Not yet unlocked"}
        </span>
      </div>

      {/* Current progress */}
      <div className="mt-5 w-full">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium">{maxed ? "Max level" : `Level ${tp.displayLevel}`}</span>
          <span className="text-muted-foreground tabular-nums">
            {maxed ? "Maxed" : `${tp.value.toLocaleString()} / ${tp.nextThreshold.toLocaleString()}`}
          </span>
        </div>
        <ProgressBar pct={tp.pct} fillClassName={maxed ? "bg-amber-500" : accent.bar} />
      </div>

      {/* Level breakdown */}
      <ul className="mt-5 w-full space-y-1.5 text-left">
        {track.levels.map((lvl, i) => {
          const done = i < tp.completed;
          const current = i === tp.completed && !maxed;
          const reward = REWARD_BY_ID.get(lvl.id);
          return (
            <li
              key={lvl.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5",
                done
                  ? "border-border bg-muted/40"
                  : current
                    ? cn("border-transparent", accent.badge)
                    : "border-border bg-muted/20 opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                  done
                    ? "bg-emerald-500 text-white"
                    : current
                      ? "bg-white/25 text-white"
                      : "bg-foreground/5 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : current ? i + 1 : <Lock className="h-3.5 w-3.5" />}
              </span>
              <p className="min-w-0 flex-1 text-xs font-medium leading-tight">{lvl.label}</p>
              {reward && (
                <span className="flex shrink-0 items-center gap-2 text-[11px] font-medium tabular-nums">
                  <span className="inline-flex items-center gap-0.5">
                    <Sparkles className="h-3 w-3" />
                    {reward.xp}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Coins className="h-3 w-3" />
                    {reward.coins}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
