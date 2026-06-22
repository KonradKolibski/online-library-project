import { Sparkles } from "lucide-react";
import type { Progression } from "@/lib/xp";

interface LevelCardProps {
  progression: Progression;
}

/** Hero card for the Progress hub: current level + XP progress to the next. */
export function LevelCard({ progression }: LevelCardProps) {
  const { level, totalXp, xpIntoLevel, xpForNextLevel } = progression;
  const pct = Math.max(
    0,
    Math.min(100, xpForNextLevel > 0 ? (xpIntoLevel / xpForNextLevel) * 100 : 100),
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-indigo-500 p-5 text-primary-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">Level {level}</p>
            <p className="text-sm text-primary-foreground/80 mt-1">
              {totalXp.toLocaleString()} XP total
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/25">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-primary-foreground/80 tabular-nums text-right">
          {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP to level {level + 1}
        </p>
      </div>
    </div>
  );
}
