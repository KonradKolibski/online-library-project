import { Clock, Coins, Sparkles, Target, Trophy } from "lucide-react";
import { useChallenges } from "@/store/challenges";
import {
  daysLeft,
  goalUnit,
  timeLeftLabel,
  type ChallengeProgress,
} from "@/lib/challenges";
import { cn } from "@/lib/utils";

/**
 * Reading challenges as a Progress-section group — styled to match
 * AchievementsGrid (card-boxed section, header + count), but kept as its own
 * distinct group. Challenges are authored in the CMS and evaluated server-side;
 * this just renders the result.
 */
export function ChallengesGrid() {
  const { challenges, loading } = useChallenges();

  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold">Challenges</h3>
        {challenges.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {completedCount} / {challenges.length}
          </span>
        )}
      </div>

      {challenges.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {challenges.map((c) => (
            <ChallengeRow key={c.id} challenge={c} />
          ))}
        </ul>
      ) : loading ? (
        <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
      ) : (
        <EmptyState />
      )}
    </section>
  );
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

function ChallengeRow({ challenge: c }: { challenge: ChallengeProgress }) {
  const pct = Math.max(0, Math.min(100, Math.round((c.progress / c.target) * 100)));
  const unit = goalUnit(c.goalType);

  // Time remaining — hidden once completed. Highlight when the deadline is close.
  const timeLabel = c.completed ? null : timeLeftLabel(c.endDate);
  const remaining = daysLeft(c.endDate);
  const urgent = remaining !== null && remaining <= 2;

  return (
    <li
      className={cn(
        "rounded-xl border p-3 flex flex-col gap-2.5 transition-colors",
        c.completed
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        {c.coverUrl ? (
          <img
            src={c.coverUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              c.completed
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/15 text-primary",
            )}
          >
            {c.completed ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight line-clamp-1">{c.title}</p>
            {timeLabel && (
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums",
                  urgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}
              >
                <Clock className="h-3 w-3" />
                {timeLabel}
              </span>
            )}
          </div>
          {c.description && (
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
              {c.description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", c.completed ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground tabular-nums">
            {c.completed ? "Completed" : `${c.progress} / ${c.target} ${unit}`}
          </span>
          <div className="flex items-center gap-2">
            {c.coinReward > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                <Coins className="h-3 w-3" />
                {c.coinReward}
              </span>
            )}
            {c.xpReward > 0 && (
              <span className="inline-flex items-center gap-0.5 text-primary font-medium tabular-nums">
                <Sparkles className="h-3 w-3" />
                {c.xpReward}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
