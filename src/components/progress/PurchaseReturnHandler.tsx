import { useEffect, useRef, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { useSettings } from "@/store/settings";
import { useProgression } from "@/lib/xp";

interface PurchaseReturnHandlerProps {
  /** Called when we detect a successful return, so the app can show Progress. */
  onSuccess?: () => void;
}

type Status = null | "confirming" | "done" | "pending" | "cancelled";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Detects `?purchase=success|cancelled` after returning from a Stripe Payment
 * Link. Coins are credited server-side by the webhook, so on success we poll
 * `reload()` a few times until the credited balance shows up, then surface a
 * small confirmation banner. Renders nothing when there's no purchase to handle.
 */
export function PurchaseReturnHandler({ onSuccess }: PurchaseReturnHandlerProps) {
  const { reload } = useSettings();
  const { coinsPurchased } = useProgression();
  const [status, setStatus] = useState<Status>(null);
  const startedRef = useRef(false);

  // Keep the latest credited total readable inside the (run-once) poll loop.
  const coinsRef = useRef(coinsPurchased);
  useEffect(() => {
    coinsRef.current = coinsPurchased;
  }, [coinsPurchased]);

  useEffect(() => {
    if (startedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get("purchase");
    if (!purchase) return;
    startedRef.current = true;

    // Strip the param so a refresh / back button doesn't re-trigger this.
    params.delete("purchase");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));

    if (purchase === "cancelled") {
      setStatus("cancelled");
      void sleep(4000).then(() => setStatus(null));
      return;
    }
    if (purchase !== "success") return;

    onSuccess?.();
    setStatus("confirming");

    void (async () => {
      const baseline = coinsRef.current;
      for (let i = 0; i < 8; i++) {
        await reload();
        await sleep(2000);
        if (coinsRef.current > baseline) {
          setStatus("done");
          await sleep(5000);
          setStatus(null);
          return;
        }
      }
      // Payment confirmed by Stripe; webhook may still be catching up.
      setStatus("pending");
      await sleep(8000);
      setStatus(null);
    })();
    // Run exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!status) return null;

  const content = {
    confirming: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: "Confirming your purchase…",
      tone: "text-foreground",
    },
    done: {
      icon: <Coins className="h-4 w-4 text-amber-500" />,
      text: "Coins added to your balance!",
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    pending: {
      icon: <Coins className="h-4 w-4 text-amber-500" />,
      text: "Payment received — your coins will appear shortly.",
      tone: "text-foreground",
    },
    cancelled: {
      icon: null,
      text: "Purchase cancelled.",
      tone: "text-muted-foreground",
    },
  }[status];

  return (
    <div className="fixed inset-x-0 top-3 z-[60] flex justify-center px-4 animate-rise-in">
      <div
        className={`flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-lg ${content.tone}`}
        role="status"
      >
        {content.icon}
        {content.text}
      </div>
    </div>
  );
}
