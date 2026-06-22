import { Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";

interface AchievementsGridProps {
  earned: Set<string>;
}

/** Grid of all achievements — unlocked ones are coloured, locked ones dimmed. */
export function AchievementsGrid({ earned }: AchievementsGridProps) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;

  return (
    <section className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold">Achievements</h3>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {unlockedCount} / {ACHIEVEMENTS.length}
        </span>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {ACHIEVEMENTS.map((a) => {
          const isEarned = earned.has(a.id);
          const Icon = isEarned ? a.icon : Lock;
          return (
            <li
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                isEarned
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/40 opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isEarned ? "bg-primary/15 text-primary" : "bg-foreground/5 text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{a.title}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {a.description}
                </p>
                {isEarned && (
                  <p className="text-[11px] font-medium text-primary mt-1 tabular-nums">
                    +{a.xpReward} XP · +{a.coinReward} coins
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
