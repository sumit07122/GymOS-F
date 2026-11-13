"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Button } from "./ui";

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scanning || !video.current) return;
    let active = true;
    let stop: (() => void) | undefined;
    const reader = new BrowserQRCodeReader();
    reader.decodeFromVideoDevice(undefined, video.current, (result, _decodeError, controls) => {
      stop = () => controls.stop();
      if (!active || !result) return;
      onScan(result.getText());
      setScanning(false);
      controls.stop();
    }).catch(() => {
      if (active) {
        setError("Camera unavailable. Check camera permission or enter the code manually.");
        setScanning(false);
      }
    });
    return () => {
      active = false;
      stop?.();
    };
  }, [onScan, scanning]);

  return (
    <div className="grid gap-3">
      <Button type="button" variant="ghost" onClick={() => { setError(""); setScanning((value) => !value); }}>{scanning ? "Stop camera" : "Scan gym QR"}</Button>
      {scanning && <video ref={video} className="aspect-video w-full max-w-md bg-forest object-cover" muted playsInline aria-label="Camera view for scanning the gym QR code" />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}