"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function GymQr({ token, label }: { token: string; label: string }) {
  const [image, setImage] = useState<string>();
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token, { errorCorrectionLevel: "H", margin: 2, width: 320, color: { dark: "#123b28", light: "#ffffff" } })
      .then((value) => { if (active) setImage(value); })
      .catch(() => { if (active) setImage(undefined); });
    return () => { active = false; };
  }, [token]);
  if (!image) return <div role="status" className="grid aspect-square w-64 place-items-center border border-line text-sm text-muted">Preparing gym QR code…</div>;
  return <img src={image} alt={`Attendance QR code for ${label}`} className="aspect-square w-64 border border-line bg-white p-2" />;
}