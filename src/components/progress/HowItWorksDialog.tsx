import { BookOpen, Coins, Snowflake, Sparkles, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHOP_PRICES, XP_CONFIG } from "@/lib/xp";

interface HowItWorksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Short explainer for the XP / level / coin loop. */
export function HowItWorksDialog({ open, onOpenChange }: HowItWorksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="s">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
        </DialogHeader>

        <ol className="space-y-3.5 pt-1">
          <Step
            icon={BookOpen}
            title="1 · Earn XP by reading"
            tone="text-primary bg-primary/10"
          >
            Log a session and you earn{" "}
            <strong>+{XP_CONFIG.sessionBase} XP</strong> for the day,{" "}
            <strong>+{XP_CONFIG.xpPerPage} XP per page</strong> read, and a bit
            more for time spent. Fill in your mood, notes and a quote for a{" "}
            <strong>+{XP_CONFIG.completenessBonus} XP</strong> bonus. Keeping a
            daily streak and finishing books pile on even more.
          </Step>

          <Step
            icon={TrendingUp}
            title="2 · Level up"
            tone="text-indigo-500 bg-indigo-500/10"
          >
            Your total XP raises your level — each level needs a little more than
            the last. Every level you reach grants{" "}
            <strong>{XP_CONFIG.coinsPerLevel} coins</strong>, and unlocking
            achievements drops bonus XP and coins too.
          </Step>

          <Step
            icon={Coins}
            title="3 · Spend coins in the shop"
            tone="text-amber-600 bg-amber-400/15"
          >
            Open the <strong>Shop</strong> to spend your coins. A{" "}
            <span className="inline-flex items-center gap-1 align-middle">
              <Snowflake className="h-3.5 w-3.5 text-sky-500" />
              <strong>Streak Freeze</strong>
            </span>{" "}
            ({SHOP_PRICES.freeze} coins) protects a missed day, and a{" "}
            <strong>Streak Repair</strong> ({SHOP_PRICES.repair} coins) instantly
            saves your most recent missed day so your streak lives on.
          </Step>
        </ol>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          XP only ever goes up — spending coins never lowers your level.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground leading-snug mt-0.5">{children}</p>
      </div>
    </li>
  );
}
