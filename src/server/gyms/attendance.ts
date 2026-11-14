import crypto from "node:crypto";
import { withTenant, type Tx } from "../db";
import { otpSecret } from "../env";
import { auditTx } from "../audit";
import { localDateKey, dateOnly } from "./operations";

const HMAC_KEY = () => otpSecret();

/** Generates a dynamically rotating, cryptographically signed reception QR code (30s window). */
export function generateDynamicReceptionQr(gymId: string, now = new Date()) {
  const epoch = Math.floor(now.getTime() / 30_000);
  const sig = crypto
    .createHmac("sha256", HMAC_KEY())
    .update(`RECEPTION:${gymId}:${epoch}`)
    .digest("hex")
    .slice(0, 16);

  const secondsRemaining = 30 - Math.floor((now.getTime() % 30_000) / 1000);
  return {
    token: `GYMOS:RECEPTION:${gymId}:${epoch}:${sig}`,
    expiresInSeconds: secondsRemaining,
    epoch,
  };
}

/** Verifies whether a scanned reception QR token is mathematically authentic and unexpired. */
export function verifyReceptionQr(gymId: string, token: string, now = new Date()): boolean {
  const parts = token.split(":");
  if (parts.length !== 5 || parts[0] !== "GYMOS" || parts[1] !== "RECEPTION") {
    return false;
  }
  const [, , tokenGymId, epochStr, sig] = parts;
  if (tokenGymId !== gymId) return false;

  const epoch = parseInt(epochStr ?? "", 10);
  if (isNaN(epoch)) return false;

  const currentEpoch = Math.floor(now.getTime() / 30_000);
  // Allow ±2 epochs (up to 60-90s window to absorb minor clock drift or network delays)
  if (Math.abs(currentEpoch - epoch) > 2) return false;

  const expectedSig = crypto
    .createHmac("sha256", HMAC_KEY())
    .update(`RECEPTION:${gymId}:${epoch}`)
    .digest("hex")
    .slice(0, 16);

  try {
    return crypto.timingSafeEqual(Buffer.from(sig ?? ""), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

/** Generates a member's dynamic personal digital pass QR token (60s rotating window). */
export function generateMemberPassQr(gymId: string, userId: string, now = new Date()) {
  const epoch = Math.floor(now.getTime() / 60_000);
  const sig = crypto
    .createHmac("sha256", HMAC_KEY())
    .update(`MEMBER:${gymId}:${userId}:${epoch}`)
    .digest("hex")
    .slice(0, 16);

  const secondsRemaining = 60 - Math.floor((now.getTime() % 60_000) / 1000);
  return {
    token: `GYMOS:MEMBER:${gymId}:${userId}:${epoch}:${sig}`,
    expiresInSeconds: secondsRemaining,
  };
}

/** Verifies a scanned member personal pass QR token. */
export function verifyMemberPassQr(gymId: string, token: string, now = new Date()) {
  const parts = token.split(":");
  if (parts.length !== 6 || parts[0] !== "GYMOS" || parts[1] !== "MEMBER") {
    return { ok: false as const, reason: "MALFORMED_TOKEN" };
  }
  const [, , tokenGymId, userId, epochStr, sig] = parts;
  if (tokenGymId !== gymId) {
    return { ok: false as const, reason: "WRONG_GYM" };
  }

  const epoch = parseInt(epochStr ?? "", 10);
  if (isNaN(epoch)) return { ok: false as const, reason: "INVALID_EPOCH" };

  const currentEpoch = Math.floor(now.getTime() / 60_000);
  if (Math.abs(currentEpoch - epoch) > 2) {
    return { ok: false as const, reason: "EXPIRED_QR" };
  }

  const expectedSig = crypto
    .createHmac("sha256", HMAC_KEY())
    .update(`MEMBER:${gymId}:${userId}:${epoch}`)
    .digest("hex")
    .slice(0, 16);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig ?? ""), Buffer.from(expectedSig))) {
      return { ok: false as const, reason: "FORGED_SIGNATURE" };
    }
    return { ok: true as const, userId: userId! };
  } catch {
    return { ok: false as const, reason: "VERIFICATION_ERROR" };
  }
}

export type ScanResult =
  | { status: "CHECKED_IN"; memberName: string; planName: string; checkedInAt: Date }
  | { status: "CHECKED_OUT"; memberName: string; durationMinutes: number }
  | { status: "ALREADY_CHECKED_IN"; memberName: string; checkedInAt: Date }
  | { status: "MEMBERSHIP_REQUIRED"; memberName?: string }
  | { status: "MEMBERSHIP_EXPIRED"; memberName?: string; endsAt?: Date }
  | { status: "INVALID_QR" }
  | { status: "MEMBER_NOT_FOUND" };

/**
 * Member Flow: Member scans the dynamic reception QR poster on reception desk.
 * Validates cryptographic signature, membership status, and records check-in or check-out.
 */
export async function recordMemberReceptionScan(
  gymId: string,
  userId: string,
  token: string,
  now = new Date()
): Promise<ScanResult> {
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      select: { attendanceToken: true, timezone: true, name: true },
    });
    if (!gym) return { status: "INVALID_QR" };

    // Support both dynamic rotating HMAC token and static fallback attendanceToken
    const isDynamicValid = verifyReceptionQr(gymId, token, now);
    const isStaticValid =
      token.length === gym.attendanceToken.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(gym.attendanceToken));

    if (!isDynamicValid && !isStaticValid) {
      return { status: "INVALID_QR" };
    }

    // Verify member role & active status
    const member = await tx.gymUser.findFirst({
      where: { gymId, userId, role: "MEMBER", status: "ACTIVE" },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (!member) return { status: "MEMBER_NOT_FOUND" };
    const memberName = member.displayName || member.user.name;

    // Verify active membership plan covering today
    const currentMembership = await tx.membership.findFirst({
      where: {
        gymId,
        userId,
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      include: { plan: { select: { name: true } } },
      orderBy: { endsAt: "desc" },
    });

    if (!currentMembership) {
      const pastMembership = await tx.membership.findFirst({
        where: { gymId, userId },
        orderBy: { endsAt: "desc" },
      });
      if (pastMembership && pastMembership.endsAt <= now) {
        return { status: "MEMBERSHIP_EXPIRED", memberName, endsAt: pastMembership.endsAt };
      }
      return { status: "MEMBERSHIP_REQUIRED", memberName };
    }

    const todayLocalDate = dateOnly(localDateKey(now, gym.timezone));

    // Check existing attendance record for today
    const existing = await tx.attendance.findUnique({
      where: { gymId_userId_localDate: { gymId, userId, localDate: todayLocalDate } },
    });

    if (!existing) {
      // First check-in of the day
      await tx.attendance.create({
        data: {
          gymId,
          userId,
          localDate: todayLocalDate,
          checkedInAt: now,
          method: "RECEPTION_QR",
        },
      });

      await auditTx(tx, {
        action: "attendance.checked_in",
        gymId,
        actorUserId: userId,
        entityType: "Attendance",
        metadata: { method: "RECEPTION_QR", plan: currentMembership.plan.name },
      });

      return {
        status: "CHECKED_IN",
        memberName,
        planName: currentMembership.plan.name,
        checkedInAt: now,
      };
    }

    // Member already checked in today: determine if this is a check-out
    if (!existing.checkedOutAt) {
      const minutesSinceCheckIn = (now.getTime() - existing.checkedInAt.getTime()) / 60_000;

      // Duplicate scan prevention: ignore accidental double-taps within 2 minutes
      if (minutesSinceCheckIn < 2) {
        return {
          status: "ALREADY_CHECKED_IN",
          memberName,
          checkedInAt: existing.checkedInAt,
        };
      }

      // Check-out!
      const duration = Math.max(1, Math.round(minutesSinceCheckIn));
      await tx.attendance.update({
        where: { id: existing.id },
        data: {
          checkedOutAt: now,
          durationMinutes: duration,
        },
      });

      await auditTx(tx, {
        action: "attendance.checked_out",
        gymId,
        actorUserId: userId,
        entityType: "Attendance",
        metadata: { durationMinutes: duration, method: "RECEPTION_QR" },
      });

      return {
        status: "CHECKED_OUT",
        memberName,
        durationMinutes: duration,
      };
    }

    // Already checked out earlier today -> Re-entry / second session
    await tx.attendance.update({
      where: { id: existing.id },
      data: {
        checkedInAt: now,
        checkedOutAt: null,
        durationMinutes: null,
      },
    });

    await auditTx(tx, {
      action: "attendance.re_entered",
      gymId,
      actorUserId: userId,
      entityType: "Attendance",
    });

    return {
      status: "CHECKED_IN",
      memberName,
      planName: currentMembership.plan.name,
      checkedInAt: now,
    };
  });
}

/**
 * Owner Scanner Flow: Reception desk scans a member's personal digital pass QR.
 * Validates member identity, active membership status, and records check-in or check-out.
 */
export async function recordOwnerScannerCheck(
  gymId: string,
  token: string,
  actorUserId: string,
  now = new Date()
): Promise<ScanResult> {
  const verified = verifyMemberPassQr(gymId, token, now);
  if (!verified.ok) {
    return { status: "INVALID_QR" };
  }

  const userId = verified.userId;

  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      select: { timezone: true, name: true },
    });
    if (!gym) return { status: "INVALID_QR" };

    const member = await tx.gymUser.findFirst({
      where: { gymId, userId, role: "MEMBER", status: "ACTIVE" },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (!member) return { status: "MEMBER_NOT_FOUND" };
    const memberName = member.displayName || member.user.name;

    const currentMembership = await tx.membership.findFirst({
      where: {
        gymId,
        userId,
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      include: { plan: { select: { name: true } } },
      orderBy: { endsAt: "desc" },
    });

    if (!currentMembership) {
      const past = await tx.membership.findFirst({
        where: { gymId, userId },
        orderBy: { endsAt: "desc" },
      });
      if (past && past.endsAt <= now) {
        return { status: "MEMBERSHIP_EXPIRED", memberName, endsAt: past.endsAt };
      }
      return { status: "MEMBERSHIP_REQUIRED", memberName };
    }

    const todayLocalDate = dateOnly(localDateKey(now, gym.timezone));
    const existing = await tx.attendance.findUnique({
      where: { gymId_userId_localDate: { gymId, userId, localDate: todayLocalDate } },
    });

    if (!existing) {
      await tx.attendance.create({
        data: {
          gymId,
          userId,
          localDate: todayLocalDate,
          checkedInAt: now,
          method: "MEMBER_QR",
          checkedInByUserId: actorUserId,
        },
      });

      await auditTx(tx, {
        action: "attendance.owner_scanned_check_in",
        gymId,
        actorUserId,
        entityType: "Attendance",
        metadata: { memberUserId: userId, memberName },
      });

      return {
        status: "CHECKED_IN",
        memberName,
        planName: currentMembership.plan.name,
        checkedInAt: now,
      };
    }

    if (!existing.checkedOutAt) {
      const minutes = (now.getTime() - existing.checkedInAt.getTime()) / 60_000;
      if (minutes < 2) {
        return { status: "ALREADY_CHECKED_IN", memberName, checkedInAt: existing.checkedInAt };
      }

      const duration = Math.max(1, Math.round(minutes));
      await tx.attendance.update({
        where: { id: existing.id },
        data: {
          checkedOutAt: now,
          durationMinutes: duration,
        },
      });

      await auditTx(tx, {
        action: "attendance.owner_scanned_check_out",
        gymId,
        actorUserId,
        entityType: "Attendance",
        metadata: { memberUserId: userId, memberName, durationMinutes: duration },
      });

      return { status: "CHECKED_OUT", memberName, durationMinutes: duration };
    }

    // Re-entry
    await tx.attendance.update({
      where: { id: existing.id },
      data: { checkedInAt: now, checkedOutAt: null, durationMinutes: null },
    });

    return {
      status: "CHECKED_IN",
      memberName,
      planName: currentMembership.plan.name,
      checkedInAt: now,
    };
  });
}

/**
 * Manual Attendance Desk: Check-in or Check-out logged by front-desk staff with mandatory reason.
 */
export async function recordManualAttendance(params: {
  gymId: string;
  userId: string;
  action: "CHECK_IN" | "CHECK_OUT";
  reason: string;
  actorUserId: string;
  now?: Date;
}) {
  const { gymId, userId, action, reason, actorUserId } = params;
  const now = params.now ?? new Date();

  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      select: { timezone: true },
    });
    if (!gym) throw new Error("Gym not found.");

    const member = await tx.gymUser.findFirst({
      where: { gymId, userId, role: "MEMBER" },
      include: { user: { select: { name: true } } },
    });
    if (!member) throw new Error("Member not found in workspace.");
    const memberName = member.displayName || member.user.name;

    const todayLocalDate = dateOnly(localDateKey(now, gym.timezone));
    const existing = await tx.attendance.findUnique({
      where: { gymId_userId_localDate: { gymId, userId, localDate: todayLocalDate } },
    });

    if (action === "CHECK_IN") {
      if (!existing) {
        await tx.attendance.create({
          data: {
            gymId,
            userId,
            localDate: todayLocalDate,
            checkedInAt: now,
            method: "MANUAL",
            notes: reason,
            checkedInByUserId: actorUserId,
          },
        });
      } else {
        await tx.attendance.update({
          where: { id: existing.id },
          data: {
            checkedInAt: now,
            checkedOutAt: null,
            durationMinutes: null,
            notes: `Manual adjustment: ${reason}`,
            checkedInByUserId: actorUserId,
          },
        });
      }

      await auditTx(tx, {
        action: "attendance.manual_check_in",
        gymId,
        actorUserId,
        entityType: "Attendance",
        metadata: { memberUserId: userId, memberName, reason },
      });
      return { success: true, memberName, action: "CHECKED_IN" };
    }

    // CHECK_OUT action
    if (!existing) {
      throw new Error("Cannot check out a member who has not checked in today.");
    }

    const duration = Math.max(
      1,
      Math.round((now.getTime() - existing.checkedInAt.getTime()) / 60_000)
    );

    await tx.attendance.update({
      where: { id: existing.id },
      data: {
        checkedOutAt: now,
        durationMinutes: duration,
        notes: existing.notes ? `${existing.notes} | Checkout: ${reason}` : `Checkout: ${reason}`,
      },
    });

    await auditTx(tx, {
      action: "attendance.manual_check_out",
      gymId,
      actorUserId,
      entityType: "Attendance",
      metadata: { memberUserId: userId, memberName, durationMinutes: duration, reason },
    });

    return { success: true, memberName, action: "CHECKED_OUT", durationMinutes: duration };
  });
}

/** Fetches real-time reception desk metrics, live occupancy, and today's audit log. */
export async function getReceptionDeskData(gymId: string, now = new Date()) {
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      select: { timezone: true, name: true, attendanceToken: true },
    });
    if (!gym) return null;

    const todayLocalDate = dateOnly(localDateKey(now, gym.timezone));

    // Fetch all check-ins for today
    const todayRecords = await tx.attendance.findMany({
      where: { gymId, localDate: todayLocalDate },
      include: {
        member: {
          include: {
            user: { select: { name: true, phone: true } },
            memberships: {
              where: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
              take: 1,
              include: { plan: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { checkedInAt: "desc" },
    });

    // Reconcile stale sessions: members who checked in > 3.5 hours ago without checking out
    const STALE_THRESHOLD_MS = 3.5 * 3600_000;
    const staleRecords = todayRecords.filter(
      (r) => !r.checkedOutAt && now.getTime() - r.checkedInAt.getTime() > STALE_THRESHOLD_MS
    );

    for (const stale of staleRecords) {
      await tx.attendance.update({
        where: { id: stale.id },
        data: {
          checkedOutAt: new Date(stale.checkedInAt.getTime() + 90 * 60_000), // Default standard 90m session
          durationMinutes: 90,
          notes: stale.notes
            ? `${stale.notes} | Auto-closed (exceeded 3.5 hrs)`
            : "Auto-closed (exceeded 3.5 hrs)",
        },
      });
      stale.checkedOutAt = new Date(stale.checkedInAt.getTime() + 90 * 60_000);
      stale.durationMinutes = 90;
    }

    // Active occupancy: currently checked in and not checked out
    const activeSessions = todayRecords.filter((r) => !r.checkedOutAt);
    const completedSessions = todayRecords.filter((r) => Boolean(r.checkedOutAt));

    // Calculate hourly attendance distribution
    const hourlyDistribution: Record<number, number> = {};
    for (let h = 5; h <= 23; h++) hourlyDistribution[h] = 0;

    for (const r of todayRecords) {
      const hour = new Date(r.checkedInAt).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] ?? 0) + 1;
    }

    // Find peak hour
    let peakHour = 6;
    let maxHourCount = 0;
    for (const [hourStr, count] of Object.entries(hourlyDistribution)) {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = parseInt(hourStr, 10);
      }
    }

    return {
      gymName: gym.name,
      totalToday: todayRecords.length,
      currentOccupancy: activeSessions.length,
      completedToday: completedSessions.length,
      peakHour: `${peakHour % 12 || 12} ${peakHour >= 12 ? "PM" : "AM"}`,
      activeSessions: activeSessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.member.displayName || s.member.user.name,
        phone: s.member.user.phone,
        plan: s.member.memberships[0]?.plan.name || "Active Member",
        checkedInAt: s.checkedInAt,
        method: s.method,
      })),
      recentCheckIns: todayRecords.slice(0, 30).map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.member.displayName || r.member.user.name,
        phone: r.member.user.phone,
        plan: r.member.memberships[0]?.plan.name || "Active Member",
        checkedInAt: r.checkedInAt,
        checkedOutAt: r.checkedOutAt,
        durationMinutes: r.durationMinutes,
        method: r.method,
        notes: r.notes,
      })),
    };
  });
}
