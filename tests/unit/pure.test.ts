import { describe, expect, it } from "vitest";
import { normalizeIndianPhone } from "@/server/security/phone";
import { formatInr } from "@/server/money";
import { deriveGymAccess } from "@/server/subscriptions/access";
import { authorize, type AuthContext } from "@/server/auth/authorize";

describe("normalizeIndianPhone", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
  ])("accepts %s", (input, out) => expect(normalizeIndianPhone(input)).toBe(out));

  it.each(["", "12345", "5876543210", "+1 415 555 0100", "98765432100", "abcdefghij"])("rejects %j", (input) =>
    expect(normalizeIndianPhone(input)).toBeNull(),
  );
});

describe("formatInr", () => {
  it("formats large rupee amounts with exact paise and Indian grouping", () => {
    expect(formatInr("1234567.8")).toBe("₹12,34,567.80");
    expect(formatInr("0.05")).toBe("₹0.05");
  });
});

describe("deriveGymAccess", () => {
  const now = new Date("2026-11-12T00:00:00Z");
  const sub = (s: string, e: string, status: "ACTIVE" | "CANCELLED" = "ACTIVE") => ({ status, startsAt: new Date(s), endsAt: new Date(e) });
  it("suspended always wins", () => expect(deriveGymAccess({ gymStatus: "SUSPENDED", subscriptions: [sub("2026-11-01", "2026-12-01")], now })).toBe("SUSPENDED"));
  it("pending gyms stay pending even with a subscription row", () => expect(deriveGymAccess({ gymStatus: "PENDING", subscriptions: [sub("2026-11-01", "2026-12-01")], now })).toBe("PENDING"));
  it("active inside the period", () => expect(deriveGymAccess({ gymStatus: "ACTIVE", subscriptions: [sub("2026-11-01", "2026-12-01")], now })).toBe("ACTIVE"));
  it("end date is exclusive", () => expect(deriveGymAccess({ gymStatus: "ACTIVE", subscriptions: [sub("2026-10-01", "2026-11-12")], now })).toBe("EXPIRED"));
  it("not started yet is not active", () => expect(deriveGymAccess({ gymStatus: "ACTIVE", subscriptions: [sub("2026-11-13", "2026-12-13")], now })).toBe("EXPIRED"));
  it("cancelled subscriptions do not count", () => expect(deriveGymAccess({ gymStatus: "ACTIVE", subscriptions: [sub("2026-11-01", "2026-12-01", "CANCELLED")], now })).toBe("EXPIRED"));
});

describe("authorize", () => {
  const base = { userId: "u", sessionId: "s", name: "n" };
  const gym = (kind: "OWNER" | "MEMBER", gymAccess: "ACTIVE" | "PENDING" | "EXPIRED" | "SUSPENDED"): AuthContext => ({ kind, ...base, gymId: "g", gymAccess });
  const ownerOps = { who: "GYM", roles: ["OWNER"], access: "operational" } as const;
  const ownerLimited = { who: "GYM", roles: ["OWNER"], access: "limited" } as const;
  const anyState = { who: "GYM", roles: ["OWNER", "MEMBER"], access: "any" } as const;
  const memberOps = { who: "GYM", roles: ["MEMBER"], access: "operational" } as const;
  const reason = (c: AuthContext | null, p: Parameters<typeof authorize>[1]) => { const d = authorize(c, p); return d.ok ? "ok" : d.reason; };

  it("unauthenticated is denied everywhere", () => expect(reason(null, ownerOps)).toBe("UNAUTHENTICATED"));
  it("owner operations need an active gym", () => {
    expect(reason(gym("OWNER", "ACTIVE"), ownerOps)).toBe("ok");
    expect(reason(gym("OWNER", "PENDING"), ownerOps)).toBe("GYM_PENDING");
    expect(reason(gym("OWNER", "EXPIRED"), ownerOps)).toBe("GYM_EXPIRED");
    expect(reason(gym("OWNER", "SUSPENDED"), ownerOps)).toBe("GYM_SUSPENDED");
  });
  it("limited access lets owners in while pending/expired, never when suspended", () => {
    expect(reason(gym("OWNER", "PENDING"), ownerLimited)).toBe("ok");
    expect(reason(gym("OWNER", "EXPIRED"), ownerLimited)).toBe("ok");
    expect(reason(gym("OWNER", "SUSPENDED"), ownerLimited)).toBe("GYM_SUSPENDED");
  });
  it("members get nothing unless the gym is active", () => {
    expect(reason(gym("MEMBER", "ACTIVE"), memberOps)).toBe("ok");
    expect(reason(gym("MEMBER", "PENDING"), { ...memberOps, access: "limited" })).toBe("GYM_PENDING");
  });
  it("status screens are reachable in every state", () => {
    for (const a of ["ACTIVE", "PENDING", "EXPIRED", "SUSPENDED"] as const) expect(reason(gym("OWNER", a), anyState)).toBe("ok");
  });
  it("roles do not cross", () => {
    expect(reason(gym("MEMBER", "ACTIVE"), ownerOps)).toBe("FORBIDDEN");
    expect(reason(gym("OWNER", "ACTIVE"), memberOps)).toBe("FORBIDDEN");
    expect(reason({ kind: "PLATFORM_ADMIN", ...base }, ownerOps)).toBe("FORBIDDEN");
    expect(reason(gym("OWNER", "ACTIVE"), { who: "PLATFORM_ADMIN" })).toBe("FORBIDDEN");
    expect(reason({ kind: "PLATFORM_ADMIN", ...base }, { who: "PLATFORM_ADMIN" })).toBe("ok");
  });
  it("a session without a chosen gym is told to choose one", () => expect(reason({ kind: "NEEDS_GYM", ...base }, ownerOps)).toBe("NEEDS_GYM"));
});
