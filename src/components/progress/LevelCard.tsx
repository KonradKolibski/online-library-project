import type { Progression } from "@/lib/xp";

interface LevelCardProps {
  progression: Progression;
}

/**
 * Hero card for the Progress hub: current level + XP progress to the next.
 * Compact horizontal layout on mobile; medallion-on-top layout on desktop.
 */
export function LevelCard({ progression }: LevelCardProps) {
  const { level, totalXp, xpIntoLevel, xpForNextLevel } = progression;
  const pct = Math.max(
    0,
    Math.min(100, xpForNextLevel > 0 ? (xpIntoLevel / xpForNextLevel) * 100 : 100),
  );
  const xpToGo = Math.max(0, xpForNextLevel - xpIntoLevel);

  return (
    <div className="flex flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-indigo-500 p-4 text-primary-foreground shadow-sm">
      {/* Mobile: medallion beside a compact stack */}
      <div className="flex items-center gap-4 sm:hidden">
        <Medallion level={level} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-bold leading-none">Your reading level</p>
            <p className="shrink-0 text-xs text-primary-foreground/85 tabular-nums">
              {totalXp.toLocaleString()} XP total
            </p>
          </div>
          <Bar pct={pct} />
          <Labels level={level} xpToGo={xpToGo} into={xpIntoLevel} forNext={xpForNextLevel} />
        </div>
      </div>

      {/* Desktop: medallion + title on top, full-width bar below */}
      <div className="hidden flex-col gap-4 sm:flex">
        <div className="flex items-center gap-4">
          <Medallion level={level} />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight">Your reading level</p>
            <p className="mt-0.5 text-xs text-primary-foreground/85 tabular-nums">
              {totalXp.toLocaleString()} XP total
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Bar pct={pct} />
          <Labels level={level} xpToGo={xpToGo} into={xpIntoLevel} forNext={xpForNextLevel} />
        </div>
      </div>
    </div>
  );
}

function Medallion({ level }: { level: number }) {
  return (
    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/15">
      <span className="text-[10px] font-medium uppercase tracking-wider text-primary-foreground/70">
        Level
      </span>
      <span className="font-display text-2xl font-bold leading-none tabular-nums">{level}</span>
    </span>
  );
}

/** 3D glossy XP bar with a bright blue fill on a dark inset track. */
function Bar({ pct }: { pct: number }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[#382dff] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      >
        <span className="pointer-events-none absolute left-1.5 right-1.5 top-[3px] h-[3px] rounded-full bg-white/45" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-full bg-black/10" />
      </div>
    </div>
  );
}

function Labels({
  level,
  xpToGo,
  into,
  forNext,
}: {
  level: number;
  xpToGo: number;
  into: number;
  forNext: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-primary-foreground/85 tabular-nums">
      <span className="font-medium">
        {xpToGo.toLocaleString()} XP to level {level + 1}
      </span>
      <span>
        {into.toLocaleString()} / {forNext.toLocaleString()}
      </span>
    </div>
  );
}
