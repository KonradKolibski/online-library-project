import { useMemo, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { evaluateTracks, type ReadingStats, type TrackProgress } from "@/lib/achievements";
import { reconstructUnlockDate } from "@/lib/xp";
import type { Book, ReadingSession } from "@/types/book";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { AchievementDetailDialog } from "@/components/progress/AchievementDetailDialog";
import { cn } from "@/lib/utils";

interface AchievementsGridProps {
  stats: ReadingStats;
  /** Reading history, used to reconstruct each achievement's unlock date. */
  books: Book[];
  sessions: ReadingSession[];
  frozenDates: Set<string>;
}

/**
 * Leveled achievement tracks (Duolingo-style). One row per track: a level badge
 * plus a progress bar toward the next threshold. Rows are clickable and open a
 * detail dialog with difficulty, unlock date, and the full level breakdown.
 */
export function AchievementsGrid({ stats, books, sessions, frozenDates }: AchievementsGridProps) {
  const tracks = evaluateTracks(stats);
  const done = tracks.reduce((n, t) => n + t.completed, 0);
  const total = tracks.reduce((n, t) => n + t.totalLevels, 0);

  const [selected, setSelected] = useState<TrackProgress | null>(null);

  const unlockDate = useMemo(
    () =>
      selected ? reconstructUnlockDate(selected.track, books, sessions, frozenDates) : null,
    [selected, books, sessions, frozenDates],
  );

  return (
    <section className="rounded-2xl bg-card border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold">Achievements</h3>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {done} / {total}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {tracks.map((tp) => (
          <TrackRow key={tp.track.id} tp={tp} onClick={() => setSelected(tp)} />
        ))}
      </ul>

      <AchievementDetailDialog
        tp={selected}
        unlockDate={unlockDate}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      />
    </section>
  );
}

function TrackRow({ tp, onClick }: { tp: TrackProgress; onClick: () => void }) {
  const { track, accent, maxed } = tp;
  const Icon = track.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${track.title} — view details`}
        className="flex w-full items-center gap-4 rounded-xl -mx-2 px-2 py-4 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Level badge — illustration above an 18px accent LEVEL strip. */}
        <div className="flex h-20 w-16 shrink-0 flex-col overflow-hidden rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.16)]">
          {track.illustration ? (
            <div className="relative min-h-0 flex-1">
              <img src={track.illustration} alt="" className="absolute inset-0 h-full w-full object-contain" />
            </div>
          ) : (
            <div
              className={cn(
                "flex min-h-0 flex-1 items-center justify-center",
                maxed ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white" : accent.badge,
              )}
            >
              <Icon className="h-7 w-7" />
            </div>
          )}
          <div
            className={cn(
              "flex h-[18px] items-center justify-center",
              maxed ? "bg-amber-500 text-white" : accent.badge,
            )}
          >
            <span className="text-[9px] font-extrabold uppercase tracking-wider leading-none">
              {maxed ? "Max" : `Level ${tp.displayLevel}`}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-sm font-semibold leading-tight">{track.title}</p>
            <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
              {maxed
                ? "Maxed"
                : `${tp.value.toLocaleString()} / ${tp.nextThreshold.toLocaleString()}`}
            </span>
          </div>

          <ProgressBar
            pct={tp.pct}
            fillClassName={maxed ? "bg-amber-500" : accent.bar}
            className="mt-1.5"
          />

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground leading-snug min-w-0 truncate">
              {maxed ? "All levels complete" : tp.goal}
            </p>
            {tp.nextReward && (
              <span className="shrink-0 flex items-center gap-2 text-[11px] font-medium tabular-nums">
                <span className="inline-flex items-center gap-0.5 text-primary">
                  <Sparkles className="h-3 w-3" />
                  {tp.nextReward.xp}
                </span>
                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <Coins className="h-3 w-3" />
                  {tp.nextReward.coins}
                </span>
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
