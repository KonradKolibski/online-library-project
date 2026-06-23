import { useMemo, useState } from "react";
import { Coins, Snowflake, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/store/auth";
import { useLibrary } from "@/store/library";
import { useSettings } from "@/store/settings";
import { SHOP_PRICES, useProgression } from "@/lib/xp";
import { COIN_PACKS, COIN_BASELINE_KEY, type CoinPack } from "@/lib/coinPacks";
import { localDateString } from "@/lib/dates";
import { CoinBalance } from "./CoinBalance";

/** Redirect to a Stripe Payment Link, tagging the session with the user id so
 *  the webhook can credit the right account. Snapshots the current purchased
 *  total first so we can report the delta on return. */
function startCoinPurchase(
  pack: CoinPack,
  userId: string,
  coinsPurchased: number,
  email?: string | null,
) {
  try {
    localStorage.setItem(COIN_BASELINE_KEY, String(coinsPurchased));
  } catch {
    /* ignore quota / privacy mode */
  }
  const params = new URLSearchParams({ client_reference_id: userId });
  if (email) params.set("prefilled_email", email);
  window.location.href = `${pack.paymentUrl}?${params.toString()}`;
}

interface ShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Find the most recent past day that's neither read nor already frozen. */
function mostRecentMissedDay(
  readSet: Set<string>,
  frozenSet: Set<string>,
  today: Date,
): string | null {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  cursor.setDate(cursor.getDate() - 1); // start at yesterday
  for (let i = 0; i < 60; i++) {
    const key = localDateString(cursor);
    if (!readSet.has(key) && !frozenSet.has(key)) return key;
    cursor.setDate(cursor.getDate() - 1);
  }
  return null;
}

export function ShopDialog({ open, onOpenChange }: ShopDialogProps) {
  const { user } = useAuth();
  const { state } = useLibrary();
  const { settings, spendCoins, addFreeze, applyFreeze } = useSettings();
  const { coinBalance, coinsPurchased } = useProgression();
  const [flash, setFlash] = useState<string | null>(null);

  const inventory = settings.progression?.freezeInventory ?? 0;
  const frozenSet = useMemo(
    () => new Set(settings.progression?.frozenDates ?? []),
    [settings.progression?.frozenDates],
  );
  const readSet = useMemo(
    () => new Set(state.sessions.map((s) => s.date)),
    [state.sessions],
  );

  function buyFreeze() {
    if (coinBalance < SHOP_PRICES.freeze) return;
    spendCoins(SHOP_PRICES.freeze);
    addFreeze(1);
    setFlash("Streak freeze added to your inventory.");
  }

  const repairTarget = mostRecentMissedDay(readSet, frozenSet, new Date());
  function buyRepair() {
    if (coinBalance < SHOP_PRICES.repair || !repairTarget) return;
    spendCoins(SHOP_PRICES.repair);
    addFreeze(1);
    applyFreeze(repairTarget);
    setFlash(`Streak repaired — ${repairTarget} is now protected.`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Shop</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Your balance</p>
          <CoinBalance coins={coinBalance} />
        </div>

        {/* Get coins — Stripe-backed packs */}
        <section className="space-y-2 pt-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Get coins
          </h3>
          <ul className="grid grid-cols-2 gap-2">
            {COIN_PACKS.map((pack) => (
              <CoinPackCard
                key={pack.id}
                pack={pack}
                disabled={!user}
                onBuy={() =>
                  user && startCoinPurchase(pack, user.id, coinsPurchased, user.email)
                }
              />
            ))}
          </ul>
        </section>

        {/* Spend coins — consumables */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Spend coins
          </h3>
          <ul className="space-y-2.5">
            <ShopItem
              icon={Snowflake}
              title="Streak Freeze"
              description={
                inventory > 0
                  ? `Protects one missed day. You own ${inventory}.`
                  : "Protects one missed day from breaking your streak."
              }
              price={SHOP_PRICES.freeze}
              disabled={coinBalance < SHOP_PRICES.freeze}
              onBuy={buyFreeze}
            />
            <ShopItem
              icon={Wrench}
              title="Streak Repair"
              description={
                repairTarget
                  ? `Instantly protects your most recent missed day (${repairTarget}).`
                  : "No recent missed day to repair."
              }
              price={SHOP_PRICES.repair}
              disabled={coinBalance < SHOP_PRICES.repair || !repairTarget}
              onBuy={buyRepair}
            />
          </ul>
        </section>

        {flash && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 animate-rise-in">
            {flash}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CoinPackCard({
  pack,
  disabled,
  onBuy,
}: {
  pack: CoinPack;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <Coins className="h-4 w-4" />
        <span className="text-base font-semibold tabular-nums">
          {pack.coins.toLocaleString()}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-tight">{pack.name}</p>
      <Button
        size="sm"
        className="mt-auto w-full"
        disabled={disabled}
        onClick={onBuy}
      >
        {pack.priceLabel}
      </Button>
    </li>
  );
}

function ShopItem({
  icon: Icon,
  title,
  description,
  price,
  disabled,
  onBuy,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  price: number;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{description}</p>
      </div>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onBuy}>
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="tabular-nums">{price}</span>
      </Button>
    </li>
  );
}
