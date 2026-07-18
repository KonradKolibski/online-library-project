import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinBalanceProps {
  coins: number;
  /** Render as a button (e.g. to open the shop). */
  onClick?: () => void;
  className?: string;
}

/** Small amber coin pill used in the header and the Progress page. */
export function CoinBalance({ coins, onClick, className }: CoinBalanceProps) {
  const content = (
    <>
      <Coins className="h-4 w-4" aria-hidden="true" />
      <span className="tabular-nums">{coins.toLocaleString()}</span>
    </>
  );
  const base =
    "inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-600 dark:text-amber-400";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${coins} coins — open shop`}
        className={cn(
          base,
          "transition-all duration-100 hover:bg-amber-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "shadow-[0_3px_0_0_rgba(245,158,11,0.35)] active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(245,158,11,0.35)]",
          className,
        )}
      >
        {content}
      </button>
    );
  }
  return (
    <span aria-label={`${coins} coins`} className={cn(base, className)}>
      {content}
    </span>
  );
}
