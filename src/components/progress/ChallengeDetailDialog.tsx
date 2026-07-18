import { Clock, Coins, Sparkles, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/progress/ProgressBar";
import {
  daysLeft,
  goalUnit,
  timeLeftLabel,
  type ChallengeProgress,
} from "@/lib/challenges";
import { cn } from "@/lib/utils";

/** Format a YYYY-MM-DD string as a friendly local date. */
function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ChallengeDetailDialogProps {
  challenge: ChallengeProgress | null;
  art: string;
  bg: string;
  bar: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Achievement-style challenge detail: illustration, status, dates, progress. */
export function ChallengeDetailDialog({
  challenge: c,
  art,
  bg,
  bar,
  open,
  onOpenChange,
}: ChallengeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="s">
        {c ? (
          <Body challenge={c} art={art} bg={bg} bar={bar} />
        ) : (
          <DialogTitle className="sr-only">Challenge</DialogTitle>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  challenge: c,
  art,
  bg,
  bar,
}: {
  challenge: ChallengeProgress;
  art: string;
  bg: string;
  bar: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((c.progress / c.target) * 100)));
  const unit = goalUnit(c.goalType);
  const remaining = daysLeft(c.endDate);
  const timeLabel = c.completed ? null : timeLeftLabel(c.endDate);
  const urgent = remaining !== null && remaining <= 2 && !c.completed;

  return (
    <div className="flex flex-col items-center text-center">
      {/* Large illustration on the card's own gradient */}
      <div
        className={cn(
          "flex h-28 w-28 items-center justify-center rounded-3xl shadow-[0_6px_0_0_rgba(0,0,0,0.16)]",
          bg,
          c.completed && "opacity-60",
        )}
      >
        <img src={art} alt="" className="h-20 w-20 object-contain" />
      </div>

      <DialogTitle className="mt-4 text-xl">{c.title}</DialogTitle>
      {c.description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-[34ch]">{c.description}</p>
      )}

      {/* Status + time */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            c.completed
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 text-primary",
          )}
        >
          {c.completed && <Trophy className="h-3 w-3" />}
          {c.completed ? "Completed" : "In progress"}
        </span>
        {timeLabel && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium",
              urgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            <Clock className="h-3 w-3" />
            {timeLabel}
          </span>
        )}
        {c.completed && c.endDate && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Ends {formatDate(c.endDate)}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mt-5 w-full">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium">
            {c.completed ? "Goal reached" : `Progress`}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {c.progress.toLocaleString()} / {c.target.toLocaleString()} {unit}
          </span>
        </div>
        <ProgressBar pct={pct} fillClassName={c.completed ? "bg-emerald-500" : bar} />
      </div>

      {/* Reward */}
      {(c.xpReward > 0 || c.coinReward > 0) && (
        <div className="mt-5 flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {c.completed ? "Reward earned" : "Reward on completion"}
          </p>
          <span className="flex items-center gap-3 text-xs font-semibold tabular-nums">
            {c.xpReward > 0 && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {c.xpReward}
              </span>
            )}
            {c.coinReward > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Coins className="h-3.5 w-3.5" />
                {c.coinReward}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
