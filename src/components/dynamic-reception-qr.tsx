"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { RefreshCw, ShieldCheck, Maximize2, Minimize2, Sparkles } from "lucide-react";

export function DynamicReceptionQr({
  fallbackToken,
  gymName,
}: {
  fallbackToken: string;
  gymName: string;
}) {
  const [token, setToken] = useState<string>(fallbackToken);
  const [qrImage, setQrImage] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isRotating, setIsRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchFreshToken = async () => {
    try {
      setIsRotating(true);
      const res = await fetch("/api/attendance/reception-qr");
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setSecondsLeft(data.expiresInSeconds || 30);
      }
    } catch {
      // Keep existing token on error
    } finally {
      setIsRotating(false);
    }
  };

  // Render QR image whenever token changes
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: isFullscreen ? 480 : 320,
      color: { dark: "#17251d", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQrImage(url);
      })
      .catch(() => {
        if (active) setQrImage("");
      });
    return () => {
      active = false;
    };
  }, [token, isFullscreen]);

  // Initial fetch and 1-second interval countdown
  useEffect(() => {
    let unmounted = false;
    const load = async () => {
      try {
        const res = await fetch("/api/attendance/reception-qr");
        if (res.ok && !unmounted) {
          const data = await res.json();
          setToken(data.token);
          setSecondsLeft(data.expiresInSeconds || 30);
        }
      } catch {}
    };
    load();

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          load();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      unmounted = true;
      clearInterval(interval);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center justify-center transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#f3f6f2] p-8 min-h-screen"
          : "p-6 rounded-3xl neu-card bg-surface"
      }`}
    >
      {/* Header Badge */}
      <div className="w-full flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-ink">
            Live Reception QR
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFreshToken}
            title="Refresh code now"
            className="p-1.5 rounded-lg border border-line bg-canvas-subtle text-ink-muted hover:text-ink transition-colors"
          >
            <RefreshCw className={`size-3.5 ${isRotating ? "animate-spin text-brand" : ""}`} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen Kiosk" : "Open Fullscreen Kiosk"}
            className="p-1.5 rounded-lg border border-line bg-canvas-subtle text-ink-muted hover:text-ink transition-colors"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* QR Display Frame */}
      <div className="relative p-5 rounded-2xl bg-white border border-line shadow-inner inline-block">
        {qrImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrImage}
            alt={`Rotating attendance QR code for ${gymName}`}
            className={`transition-all rounded-xl ${isFullscreen ? "size-96" : "size-64"}`}
          />
        ) : (
          <div className="size-64 grid place-items-center text-xs text-ink-muted">
            Generating cryptographic pass…
          </div>
        )}

        {/* Brand Center Overlay Badge */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="size-10 rounded-xl bg-surface border border-line/80 shadow-md grid place-items-center text-brand font-black text-xs font-display">
            F
          </div>
        </div>
      </div>

      {/* Rotation Progress & Instructions */}
      <div className="mt-5 w-full max-w-xs space-y-2 text-center">
        <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted">
          <span>Anti-Replay Security</span>
          <span className="font-mono text-brand font-bold">Rotates in {secondsLeft}s</span>
        </div>

        {/* Dynamic Countdown Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/80">
          <div
            className="h-full bg-brand transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(secondsLeft / 30) * 100}%` }}
          />
        </div>

        <p className="text-[11px] text-ink-muted pt-1">
          Members scan with their phone camera to record entry or exit.
        </p>
      </div>
    </div>
  );
}
