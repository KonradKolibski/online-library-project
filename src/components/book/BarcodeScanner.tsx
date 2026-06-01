import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
import { CameraOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  /** Called with the raw decoded text (typically an EAN-13 / ISBN-13). */
  onDetect: (code: string) => void;
  /** User dismisses the scanner without scanning anything. */
  onCancel: () => void;
}

/**
 * Camera-based barcode scanner targeted at book ISBN codes.
 *
 * Uses `@zxing/browser` to decode frames from the back camera (`environment`
 * facingMode). Hinted to EAN-13 / EAN-8 only so we don't waste cycles trying
 * QR / Code-128 / etc. — every book's printed barcode is EAN-13.
 *
 * Lifecycle:
 *  - Mount: ask for camera permission, attach decoder loop to the <video>
 *  - First valid decode → call onDetect(code) and stop the loop
 *  - Unmount / cancel → stop the loop and release the camera tracks
 */
export function BarcodeScanner({ onDetect, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  /** Guard so we don't call onDetect twice if zxing fires a second result
   *  between detection and unmount. */
  const detectedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result, err) => {
          if (detectedRef.current) return;
          if (result) {
            detectedRef.current = true;
            // Stop the camera immediately so the user gets visual feedback
            // and the device's torch / shutter LED goes off.
            controlsRef.current?.stop();
            onDetect(result.getText());
            return;
          }
          // NotFoundException is fired every frame zxing doesn't find a code —
          // ignore it. Anything else is a real problem.
          if (err && !(err instanceof NotFoundException)) {
            // eslint-disable-next-line no-console
            console.warn("Barcode decode error:", err);
          }
        },
      )
      .then((controls) => {
        controlsRef.current = controls;
        setStarting(false);
      })
      .catch((e: unknown) => {
        // Common reasons: permission denied, no camera, HTTP (not HTTPS) origin.
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /permission|denied|notallowed/i.test(msg)
            ? "Camera permission was denied. You'll need to allow camera access in your browser settings."
            : /notfound|devices/i.test(msg)
              ? "No camera was found on this device."
              : "Couldn't start the camera. Try reloading the page.",
        );
        setStarting(false);
      });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scan a barcode</h2>
          <p className="text-sm text-muted-foreground">
            Point your camera at the ISBN barcode on the back of the book.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Aim guide — a horizontal band centred on the frame.
          Books' EAN-13 codes are wider than tall, so a wide reticle reads more
          naturally than a square one. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-3/4 h-1/3 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>

        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white p-6 text-center">
            <CameraOff className="h-8 w-8" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
