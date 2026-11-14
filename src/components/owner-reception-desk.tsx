"use client";

import { useState } from "react";
import { Button, Card, Badge, Field } from "./ui";
import { QrScanner } from "./qr-scanner";
import { ownerCheckMemberAction, manualAttendanceAction } from "@/app/owner/actions";
import {
  QrCode,
  Search,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Camera,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface MemberItem {
  userId: string;
  name: string;
  phone?: string | null;
  planName?: string;
  isCheckedInToday: boolean;
  checkedInAt?: Date | null;
  checkedOutAt?: Date | null;
}

export function OwnerReceptionDesk({
  members = [],
}: {
  members: MemberItem[];
}) {
  const [tab, setTab] = useState<"manual" | "scanner">("manual");
  const [search, setSearch] = useState("");
  const [scannedToken, setScannedToken] = useState("");

  const filtered = members.filter((m) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      m.name.toLowerCase().includes(term) ||
      (m.phone && m.phone.includes(term)) ||
      m.userId.toLowerCase().includes(term)
    );
  });

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 mb-5">
        <div>
          <h3 className="font-display text-base font-bold text-ink">
            Front Desk Operations
          </h3>
          <p className="text-xs text-ink-muted">
            Scan member passes or perform manual check-in / check-out
          </p>
        </div>

        {/* Segmented Tab Switch */}
        <div className="flex items-center rounded-xl bg-canvas-subtle p-1 border border-line">
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "manual"
                ? "bg-white text-ink shadow-xs border border-line/50"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <UserCheck className="size-3.5" />
            Manual Desk
          </button>
          <button
            type="button"
            onClick={() => setTab("scanner")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "scanner"
                ? "bg-white text-ink shadow-xs border border-line/50"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Camera className="size-3.5" />
            Pass Scanner
          </button>
        </div>
      </div>

      {tab === "scanner" ? (
        <div className="space-y-4 max-w-md mx-auto text-center py-2">
          <p className="text-xs text-ink-muted">
            Point camera at the member&apos;s dynamic pass on their phone screen:
          </p>
          <QrScanner onScan={setScannedToken} />

          {scannedToken && (
            <form action={ownerCheckMemberAction} className="pt-2">
              <input type="hidden" name="token" value={scannedToken} />
              <div className="p-3 rounded-xl bg-brand-light/60 border border-brand/30 text-xs text-brand-dark mb-3">
                Scanned token verified! Click below to process check:
              </div>
              <Button type="submit" className="w-full" size="md">
                Process Member Scan &rarr;
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Member Search Bar */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
              <Search className="size-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member by name, phone or ID…"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-4 text-xs text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
            />
          </div>

          {/* Members Fast-Action List */}
          <div className="divide-y divide-line/60 max-h-80 overflow-y-auto rounded-xl border border-line/60 bg-surface">
            {filtered.slice(0, 15).map((m) => {
              const isInside = m.isCheckedInToday && !m.checkedOutAt;
              return (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-canvas-subtle/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink truncate">{m.name}</p>
                      {isInside ? (
                        <Badge tone="success" size="sm" dot>
                          Inside
                        </Badge>
                      ) : m.isCheckedInToday ? (
                        <Badge tone="neutral" size="sm">
                          Completed
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-ink-muted font-mono truncate">
                      {m.phone || "No phone"} &middot; {m.planName || "Active"}
                    </p>
                  </div>

                  <form action={manualAttendanceAction} className="shrink-0 flex items-center gap-2">
                    <input type="hidden" name="userId" value={m.userId} />
                    <input type="hidden" name="reason" value="Front desk quick action" />

                    {isInside ? (
                      <button
                        type="submit"
                        name="action"
                        value="CHECK_OUT"
                        className="inline-flex items-center gap-1 rounded-lg border border-warning/40 bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-[#9c6114] hover:bg-warning/20 transition-colors cursor-pointer"
                      >
                        <Clock className="size-3" /> Check Out
                      </button>
                    ) : (
                      <button
                        type="submit"
                        name="action"
                        value="CHECK_IN"
                        className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-light px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand/20 transition-colors cursor-pointer"
                      >
                        <UserCheck className="size-3" /> Check In
                      </button>
                    )}
                  </form>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-muted">
                No active members found matching &quot;{search}&quot;.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
