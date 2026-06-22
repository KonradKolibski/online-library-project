import { useMemo, useState } from "react";
import { HelpCircle, Store } from "lucide-react";
import { useLibrary } from "@/store/library";
import { useProgression } from "@/lib/xp";
import { Button } from "@/components/ui/button";
import { StatsHighlights } from "@/components/home/StatsHighlights";
import { LevelCard } from "@/components/progress/LevelCard";
import { AchievementsGrid } from "@/components/progress/AchievementsGrid";
import { ShopDialog } from "@/components/progress/ShopDialog";
import { HowItWorksDialog } from "@/components/progress/HowItWorksDialog";

export function StatsPage() {
  const { state } = useLibrary();
  const progression = useProgression();
  const [shopOpen, setShopOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const { booksThisYear, pagesThisYear, totalMinutes } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const finishedYr = state.books.filter(
      (b) => b.status === "finished" && new Date(b.updatedAt).getFullYear() === currentYear,
    );
    return {
      booksThisYear: finishedYr.length,
      pagesThisYear: finishedYr.reduce(
        (acc, b) => (typeof b.pages === "number" ? acc + b.pages : acc),
        0,
      ),
      totalMinutes: state.sessions.reduce(
        (acc, s) => acc + (typeof s.minutes === "number" ? s.minutes : 0),
        0,
      ),
    };
  }, [state.books, state.sessions]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Progress</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHowOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">How it works</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShopOpen(true)}>
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Shop</span>
          </Button>
        </div>
      </div>

      <LevelCard progression={progression} />

      <AchievementsGrid earned={progression.earnedAchievements} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Reading stats</h3>
        <StatsHighlights
          booksThisYear={booksThisYear}
          pagesThisYear={pagesThisYear}
          totalBooks={state.books.length}
          totalMinutes={totalMinutes}
        />
      </div>

      <ShopDialog open={shopOpen} onOpenChange={setShopOpen} />
      <HowItWorksDialog open={howOpen} onOpenChange={setHowOpen} />
    </div>
  );
}
