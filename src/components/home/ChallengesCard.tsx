import { Coins, Sparkles, Target, Trophy } from "lucide-react";
import { useChallenges } from "@/store/challenges";
import { goalUnit, type ChallengeProgress } from "@/lib/challenges";
import { SectionHeader } from "./SectionHeader";

/**
 * Reading challenges authored in the CMS (Strapi) with this user's live progress.
 * Progress + reward grants are computed server-side by the `challenges` edge
 * function; this card just renders the result. It renders nothing when there are
 * no active/completed challenges, so the dashboard is unchanged until challenges
 * are published.
 */
export function ChallengesCard() {
  const { challenges, loading } = useChallenges();

  if (challenges.length === 0) {
    // Show a slim skeleton while the first evaluation is in flight; otherwise
    // render nothing so we don't take up space when there's no content.
    if (loading) {
      return (
        <section className="space-y-3">
          <SectionHeader title="Reading challenges" meta="Loading…" />
          <div className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
        </section>
      );
    }
    return null;
  }

  const completedCount = challenges.filter((c) => c.completed).length;
  const meta =
    completedCount > 0
      ? `${completedCount}/${challenges.length} done`
      : `${challenges.length} active`;

  return (
    <section className="space-y-3">
      <SectionHeader title="Reading challenges" meta={meta} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {challenges.map((c) => (
          <ChallengeRow key={c.id} challenge={c} />
        ))}
      </ul>
    </section>
  );
}

function ChallengeRow({ challenge: c }: { challenge: ChallengeProgress }) {
  const pct = Math.max(0, Math.min(100, Math.round((c.progress / c.target) * 100)));
  const unit = goalUnit(c.goalType);

  return (
    <li
      className={`rounded-2xl border p-4 flex flex-col gap-3 ${
        c.completed
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            c.completed
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 text-primary"
          }`}
        >
          {c.completed ? (
            <Trophy className="h-4 w-4" />
          ) : (
            <Target className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight line-clamp-1">{c.title}</p>
          {c.description && (
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
              {c.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              c.completed ? "bg-emerald-500" : "bg-primary"
            }`}
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
