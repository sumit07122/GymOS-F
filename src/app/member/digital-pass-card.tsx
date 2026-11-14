"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck, Sparkles, RefreshCw, Smartphone, QrCode } from "lucide-react";
import { Badge } from "@/components/ui";

interface DigitalPassProps {
  memberName: string;
  phone?: string | null;
  planName?: string;
  endsAt?: Date | null;
  status: "ACTIVE" | "EXPIRED" | "NONE";
}

export function DigitalPassCard({
  memberName,
  phone,
  planName = "General Membership",
  endsAt,
  status,
}: DigitalPassProps) {
  const [token, setToken] = useState<string>("");
  const [qrImage, setQrImage] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(60);

  const fetchPassToken = async () => {
    try {
      const res = await fetch("/api/attendance/member-pass-qr");
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setSecondsLeft(data.expiresInSeconds || 60);
      }
    } catch {
      // Keep existing token on error
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: { dark: "#0f5a32", light: "#ffffff" },
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
  }, [token]);

  useEffect(() => {
    let unmounted = false;
    const load = async () => {
      try {
        const res = await fetch("/api/attendance/member-pass-qr");
        if (res.ok && !unmounted) {
          const data = await res.json();
          setToken(data.token);
          setSecondsLeft(data.expiresInSeconds || 60);
        }
      } catch {}
    };
    load();
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          load();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      unmounted = true;
      clearInterval(interval);
    };
  }, []);

  const formattedExpiry = endsAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(endsAt))
    : "No active plan";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f5a32] via-[#16834a] to-[#24a766] p-6 text-white shadow-xl sm:p-8">
      {/* Decorative Atmosphere Glows */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute left-0 bottom-0 -ml-16 -mb-16 size-48 rounded-full bg-emerald-400/10 blur-xl" />

      <div className="relative z-10 grid gap-6 sm:grid-cols-12 sm:items-center">
        {/* Pass Info Left */}
        <div className="sm:col-span-7 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-light">
            <ShieldCheck className="size-4" />
            <span>Official Member Digital Pass</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              {memberName}
            </h2>
            <p className="mt-1 text-xs text-white/85 font-mono">
              {phone || "Registered Member"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge
              tone={status === "ACTIVE" ? "success" : "danger"}
              size="md"
              dot
              className="bg-white/20 text-white border-white/30 backdrop-blur-md"
            >
              {status === "ACTIVE" ? "Active Access" : status === "EXPIRED" ? "Expired" : "No Plan"}
            </Badge>
            <span className="text-xs text-white/80 font-medium">
              Tier: <strong className="text-white">{planName}</strong>
            </span>
          </div>

          <div className="pt-2 text-xs text-white/75 border-t border-white/15">
            <span>Valid through: </span>
            <strong className="text-white font-semibold">{formattedExpiry}</strong>
          </div>
        </div>

        {/* Dynamic Rotating QR Pass Right */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white/95 text-ink shadow-lg">
          <div className="flex items-center justify-between w-full px-1 pb-2 border-b border-line/60 text-[11px] font-semibold text-ink-muted">
            <span className="flex items-center gap-1">
              <QrCode className="size-3 text-brand" />
              Scan at Desk
            </span>
            <span className="font-mono text-brand font-bold">{secondsLeft}s</span>
          </div>

          <div className="p-1 my-1">
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrImage}
                alt="Member dynamic pass QR"
                className="size-36 sm:size-40 rounded-lg"
              />
            ) : (
              <div className="size-36 grid place-items-center text-xs text-ink-muted">
                Generating pass…
              </div>
            )}
          </div>

          <p className="text-[10px] text-ink-muted text-center leading-tight">
            Cryptographically signed &amp; rotates every 60s
          </p>
        </div>
      </div>
    </div>
  );
}
