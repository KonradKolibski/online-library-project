import { useEffect, useRef, useState } from "react";
import { Coins, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSettings } from "@/store/settings";
import { useProgression } from "@/lib/xp";
import { COIN_BASELINE_KEY } from "@/lib/coinPacks";

interface PurchaseReturnHandlerProps {
  /** Called on a successful return, so the app can show the Progress page. */
  onSuccess?: () => void;
}

type Status = null | "confirming" | "success" | "error";
type ErrorKind = "cancelled" | "unconfirmed";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Handles the return from a Stripe Payment Link (`?purchase=success|cancelled`).
 * Coins are credited server-side by the webhook, so on success we poll
 * `reload()` until the credited balance shows up, then present a success modal;
 * a cancelled return or a timed-out confirmation shows a failure modal.
 */
export function PurchaseReturnHandler({ onSuccess }: PurchaseReturnHandlerProps) {
  const { reload } = useSettings();
  const { coinsPurchased, coinBalance } = useProgression();

  const [status, setStatus] = useState<Status>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>("cancelled");
  const [creditedCoins, setCreditedCoins] = useState(0);

  const startedRef = useRef(false);
  const baselineRef = useRef(0);
  // Keep the latest credited total readable inside the poll loop.
  const coinsRef = useRef(coinsPurchased);
  useEffect(() => {
    coinsRef.current = coinsPurchased;
  }, [coinsPurchased]);

  async function pollForCredit() {
    setStatus("confirming");
    for (let i = 0; i < 8; i++) {
      await reload();
      await sleep(2000);
      if (coinsRef.current > baselineRef.current) {
        setCreditedCoins(coinsRef.current - baselineRef.current);
        setStatus("success");
        return;
      }
    }
    setErrorKind("unconfirmed");
    setStatus("error");
  }

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

    if (purchase === "success") {
      onSuccess?.();
      const stored = localStorage.getItem(COIN_BASELINE_KEY);
      baselineRef.current = stored != null ? Number(stored) : coinsRef.current;
      try {
        localStorage.removeItem(COIN_BASELINE_KEY);
      } catch {
        /* ignore */
      }
      void pollForCredit();
    } else {
      setErrorKind("cancelled");
      setStatus("error");
    }
    // Run exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!status) return null;

  const dismiss = () => setStatus(null);

  return (
    <Dialog open onOpenChange={(o) => !o && status !== "confirming" && dismiss()}>
      <DialogContent size="s">
        {status === "confirming" && <ConfirmingView />}
        {status === "success" && (
          <SuccessView
            creditedCoins={creditedCoins}
            balance={coinBalance}
            onDone={dismiss}
          />
        )}
        {status === "error" && (
          <ErrorView
            kind={errorKind}
            onRetry={() => void pollForCredit()}
            onClose={dismiss}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmingView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <DialogTitle className="sr-only">Confirming your purchase</DialogTitle>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Confirming your purchase…</p>
        <p className="text-sm text-muted-foreground">
          This only takes a moment — we&apos;re adding your coins.
        </p>
      </div>
    </div>
  );
}

function SuccessView({
  creditedCoins,
  balance,
  onDone,
}: {
  creditedCoins: number;
  balance: number;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <DialogTitle className="sr-only">Purchase complete</DialogTitle>
      <div className="relative flex items-center justify-center">
        <span className="absolute h-16 w-16 rounded-full bg-amber-400/30 animate-success-ring" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg animate-pop-in">
          <Coins className="h-8 w-8" />
        </span>
      </div>
      <div className="space-y-1 animate-rise-in">
        <p className="text-lg font-semibold">Purchase complete!</p>
        <p className="text-sm text-muted-foreground">
          {creditedCoins > 0
            ? `${creditedCoins.toLocaleString()} coins added to your balance.`
            : "Your coins have been added to your balance."}
        </p>
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">
          New balance: {balance.toLocaleString()} coins
        </p>
      </div>
      <Button onClick={onDone} className="mt-1 animate-rise-in">
        Done
      </Button>
    </div>
  );
}

function ErrorView({
  kind,
  onRetry,
  onClose,
}: {
  kind: ErrorKind;
  onRetry: () => void;
  onClose: () => void;
}) {
  const cancelled = kind === "cancelled";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <DialogTitle className="sr-only">
        {cancelled ? "Payment not completed" : "Couldn't confirm purchase"}
      </DialogTitle>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="h-8 w-8" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">
          {cancelled ? "Payment not completed" : "We couldn't confirm it yet"}
        </p>
        <p className="text-sm text-muted-foreground">
          {cancelled
            ? "No coins were added and you haven't been charged. You can try again from the shop anytime."
            : "If your payment went through, your coins will appear shortly. You can check again now."}
        </p>
      </div>
      <div className="flex gap-2">
        {!cancelled && (
          <Button onClick={onRetry}>Check again</Button>
        )}
        <Button variant={cancelled ? "default" : "outline"} onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
