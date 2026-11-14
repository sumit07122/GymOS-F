import { randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { auditTx } from "../audit";
import { withTenant, type Tx } from "../db";
import { normalizeIndianPhone } from "../security/phone";

const money = z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter an amount with at most two decimal places.");
const memberInput = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(10).max(20) });
const planInput = z.object({ name: z.string().trim().min(2).max(80), durationDays: z.coerce.number().int().min(1).max(3650), priceInr: money });

export function localDateKey(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function localMidnight(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = Date.UTC(year!, month! - 1, day!);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = formatter.formatToParts(new Date(guess));
    const part = (type: string) => Number(parts.find((value) => value.type === type)?.value ?? 0);
    const localAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    guess += target - localAsUtc;
  }
  return new Date(guess);
}

export const dateOnly = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);
const dayMs = 86_400_000;

async function assignMembershipTx(tx: Tx, gymId: string, userId: string, planId: string, now: Date) {
  const [member, plan] = await Promise.all([
    tx.gymUser.findFirst({ where: { gymId, userId, role: "MEMBER", status: "ACTIVE" }, select: { id: true } }),
    tx.membershipPlan.findFirst({ where: { gymId, id: planId, active: true } }),
  ]);
  if (!member || !plan) throw new Error("MEMBER_OR_PLAN_NOT_FOUND");
  const latest = await tx.membership.findFirst({
    where: { gymId, userId, status: "ACTIVE" },
    orderBy: { endsAt: "desc" },
    select: { endsAt: true },
  });
  const startsAt = latest && latest.endsAt > now ? latest.endsAt : now;
  const endsAt = new Date(startsAt.getTime() + plan.durationDays * dayMs);
  return tx.membership.create({
    data: { gymId, userId, planId, startsAt, endsAt, priceInr: plan.priceInr },
  });
}

export async function getOwnerDashboard(gymId: string, now = new Date()) {
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, city: true, status: true, timezone: true } });
    if (!gym) return null;
    const todayKey = localDateKey(now, gym.timezone);
    const monthKey = `${todayKey.slice(0, 7)}-01`;
    const [totalMembers, newMembers, todayAttendance, memberships, collections, activity] = await Promise.all([
      tx.gymUser.count({ where: { gymId, role: "MEMBER", status: "ACTIVE" } }),
      tx.gymUser.count({ where: { gymId, role: "MEMBER", status: "ACTIVE", createdAt: { gte: localMidnight(todayKey, gym.timezone) } } }),
      tx.attendance.count({ where: { gymId, localDate: dateOnly(todayKey) } }),
      tx.membership.findMany({
        where: { gymId, status: "ACTIVE" },
        select: { userId: true, priceInr: true, startsAt: true, endsAt: true, payments: { where: { voidedAt: null }, select: { amountInr: true } } },
      }),
      tx.payment.aggregate({
        where: { gymId, voidedAt: null, createdAt: { gte: localMidnight(monthKey, gym.timezone) } },
        _sum: { amountInr: true },
      }),
      tx.auditLog.findMany({ where: { gymId }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, action: true, createdAt: true } }),
    ]);
    const activeMembers = new Set(memberships.filter((item) => item.startsAt <= now && item.endsAt > now).map((item) => item.userId)).size;
    const expiring = memberships.filter((item) => item.startsAt <= now && item.endsAt > now && item.endsAt <= new Date(now.getTime() + 7 * dayMs)).length;
    const expired = memberships.filter((item) => item.endsAt <= now).length;
    const outstandingInr = memberships.reduce((sum, item) => {
      const paid = item.payments.reduce((total, payment) => total.plus(payment.amountInr), new Prisma.Decimal(0));
      return sum.plus(Prisma.Decimal.max(item.priceInr.minus(paid), 0));
    }, new Prisma.Decimal(0));
    return {
      gym,
      totalMembers,
      activeMembers,
      newMembers,
      todayAttendance,
      expiring,
      expired,
      collectionsInr: collections._sum.amountInr ?? new Prisma.Decimal(0),
      outstandingInr,
      activity,
    };
  });
}

export async function listMembers(gymId: string, search = "", requestedPage = 1) {
  const term = search.trim().slice(0, 80);
  const where: Prisma.GymUserWhereInput = {
    gymId,
    role: "MEMBER",
    ...(term ? { user: { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }] } } : {}),
  };
  return withTenant(gymId, async (tx) => {
    const total = await tx.gymUser.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / 50));
    const page = Math.max(1, Math.min(pageCount, Math.floor(requestedPage) || 1));
    const members = await tx.gymUser.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 50,
      take: 50,
      include: {
        user: { select: { id: true, name: true, phone: true, status: true } },
        memberships: { where: { status: "ACTIVE", endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, take: 10, include: { plan: { select: { name: true } } } },
      },
    });
    return { members, total, page, pageCount };
  });
}

export async function getMemberDetails(gymId: string, userId: string) {
  return withTenant(gymId, (tx) => tx.gymUser.findFirst({
    where: { gymId, userId, role: "MEMBER" },
    include: {
      user: { select: { id: true, name: true, phone: true, status: true } },
      memberships: {
        orderBy: { createdAt: "desc" },
        include: { plan: { select: { name: true, durationDays: true } }, payments: { orderBy: { createdAt: "desc" }, include: { corrections: true } } },
      },
      attendance: { orderBy: { checkedInAt: "desc" }, take: 90 },
    },
  }));
}

export async function getMembershipPlans(gymId: string) {
  return withTenant(gymId, (tx) => tx.membershipPlan.findMany({ where: { gymId }, orderBy: [{ active: "desc" }, { createdAt: "desc" }] }));
}

export async function createMember(gymId: string, raw: unknown, actorUserId: string, planId?: string) {
  const input = memberInput.parse(raw);
  const phone = normalizeIndianPhone(input.phone);
  if (!phone) throw new Error("INVALID_PHONE");
  return withTenant(gymId, async (tx) => {
    let user = await tx.user.findUnique({ where: { phone }, select: { id: true, status: true } });
    if (user?.status !== undefined && user.status !== "ACTIVE") throw new Error("ACCOUNT_DISABLED");
    if (!user) user = await tx.user.create({ data: { name: input.name, phone }, select: { id: true, status: true } });

    const existing = await tx.gymUser.findUnique({ where: { gymId_userId: { gymId, userId: user.id } } });
    if (existing?.role === "OWNER") throw new Error("ROLE_CONFLICT");
    if (existing) {
      if (existing.status === "ACTIVE") throw new Error("ALREADY_MEMBER");
      await tx.gymUser.update({ where: { id: existing.id }, data: { status: "ACTIVE", role: "MEMBER", displayName: input.name } });
    } else await tx.gymUser.create({ data: { gymId, userId: user.id, role: "MEMBER", displayName: input.name } });

    const membership = planId ? await assignMembershipTx(tx, gymId, user.id, planId, new Date()) : null;
    await auditTx(tx, { action: "member.created", gymId, actorUserId, entityType: "User", entityId: user.id });
    return { userId: user.id, membershipId: membership?.id };
  });
}

export async function setMemberStatus(gymId: string, userId: string, active: boolean, actorUserId: string) {
  return withTenant(gymId, async (tx) => {
    const result = await tx.gymUser.updateMany({ where: { gymId, userId, role: "MEMBER" }, data: { status: active ? "ACTIVE" : "INACTIVE" } });
    if (!result.count) throw new Error("MEMBER_NOT_FOUND");
    await auditTx(tx, { action: active ? "member.activated" : "member.deactivated", gymId, actorUserId, entityType: "User", entityId: userId });
  });
}

export async function createMembershipPlan(gymId: string, raw: unknown, actorUserId: string) {
  const input = planInput.parse(raw);
  return withTenant(gymId, async (tx) => {
    const plan = await tx.membershipPlan.create({ data: { gymId, name: input.name, durationDays: input.durationDays, priceInr: new Prisma.Decimal(input.priceInr) } });
    await auditTx(tx, { action: "membership_plan.created", gymId, actorUserId, entityType: "MembershipPlan", entityId: plan.id });
    return plan;
  });
}

export async function setMembershipPlanActive(gymId: string, planId: string, active: boolean, actorUserId: string) {
  return withTenant(gymId, async (tx) => {
    const result = await tx.membershipPlan.updateMany({ where: { gymId, id: planId }, data: { active } });
    if (!result.count) throw new Error("PLAN_NOT_FOUND");
    await auditTx(tx, { action: active ? "membership_plan.activated" : "membership_plan.archived", gymId, actorUserId, entityType: "MembershipPlan", entityId: planId });
  });
}

export async function assignMembership(gymId: string, userId: string, planId: string, actorUserId: string) {
  return withTenant(gymId, async (tx) => {
    const membership = await assignMembershipTx(tx, gymId, userId, planId, new Date());
    await auditTx(tx, { action: "membership.assigned", gymId, actorUserId, entityType: "Membership", entityId: membership.id });
    return membership;
  });
}

export async function listPayments(gymId: string) {
  return withTenant(gymId, (tx) => tx.payment.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { member: { include: { user: { select: { name: true, phone: true } } } }, membership: { include: { plan: { select: { name: true } } } }, corrections: true },
  }));
}

export async function recordPayment(gymId: string, userId: string, membershipId: string, raw: unknown, actorUserId: string) {
  const input = z.object({ amountInr: money, method: z.enum(["CASH", "UPI", "BANK_TRANSFER"]), reference: z.string().trim().max(120).optional() }).parse(raw);
  const amount = new Prisma.Decimal(input.amountInr);
  if (amount.lte(0)) throw new Error("INVALID_AMOUNT");
  return withTenant(gymId, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Membership" WHERE "gymId" = ${gymId}::uuid AND "id" = ${membershipId}::uuid FOR UPDATE`;
    const membership = await tx.membership.findFirst({
      where: { gymId, id: membershipId, userId, status: "ACTIVE" },
      include: { payments: { where: { voidedAt: null }, select: { amountInr: true } } },
    });
    if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");
    const paid = membership.payments.reduce((sum, payment) => sum.plus(payment.amountInr), new Prisma.Decimal(0));
    const balance = membership.priceInr.minus(paid);
    if (amount.gt(balance)) throw new Error("OVERPAYMENT");
    const payment = await tx.payment.create({
      data: { gymId, userId, membershipId, amountInr: amount, method: input.method, reference: input.reference || null, recordedByUserId: actorUserId },
    });
    await auditTx(tx, { action: "payment.recorded", gymId, actorUserId, entityType: "Payment", entityId: payment.id, metadata: { amountInr: amount.toString(), method: input.method } });
    return payment;
  });
}

export async function voidPayment(gymId: string, paymentId: string, reason: string, actorUserId: string) {
  const cleanReason = z.string().trim().min(5).max(300).parse(reason);
  return withTenant(gymId, async (tx) => {
    const payment = await tx.payment.findFirst({ where: { gymId, id: paymentId, voidedAt: null } });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND_OR_VOIDED");
    const now = new Date();
    await tx.paymentCorrection.create({ data: { gymId, paymentId, changedByUserId: actorUserId, amountBefore: payment.amountInr, reason: cleanReason } });
    await tx.payment.update({ where: { id: paymentId }, data: { voidedAt: now, voidedByUserId: actorUserId, voidReason: cleanReason } });
    await auditTx(tx, { action: "payment.voided", gymId, actorUserId, entityType: "Payment", entityId: paymentId, metadata: { reason: cleanReason } });
  });
}

export async function getAttendanceOverview(gymId: string, now = new Date()) {
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, timezone: true, attendanceToken: true } });
    if (!gym) return null;
    const localDate = dateOnly(localDateKey(now, gym.timezone));
    const [today, recent] = await Promise.all([
      tx.attendance.findMany({ where: { gymId, localDate }, orderBy: { checkedInAt: "desc" }, include: { member: { include: { user: { select: { id: true, name: true, phone: true } } } } } }),
      tx.attendance.findMany({ where: { gymId }, orderBy: { checkedInAt: "desc" }, take: 30, include: { member: { include: { user: { select: { id: true, name: true } } } } } }),
    ]);
    return { gym, today, recent };
  });
}

export async function rotateAttendanceToken(gymId: string, actorUserId: string) {
  return withTenant(gymId, async (tx) => {
    const attendanceToken = randomBytes(32).toString("base64url");
    await tx.gym.update({ where: { id: gymId }, data: { attendanceToken } });
    await auditTx(tx, { action: "attendance.qr_rotated", gymId, actorUserId, entityType: "Gym", entityId: gymId });
    return attendanceToken;
  });
}

export async function markAttendance(gymId: string, userId: string, token: string, now = new Date()) {
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { attendanceToken: true, timezone: true } });
    if (!gym || token.length !== gym.attendanceToken.length || !timingSafeEqual(Buffer.from(token), Buffer.from(gym.attendanceToken))) return "INVALID_QR" as const;
    const [member, currentMembership] = await Promise.all([
      tx.gymUser.findFirst({ where: { gymId, userId, role: "MEMBER", status: "ACTIVE" }, select: { id: true } }),
      tx.membership.findFirst({ where: { gymId, userId, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } }, select: { id: true } }),
    ]);
    if (!member || !currentMembership) return "MEMBERSHIP_REQUIRED" as const;
    const inserted = await tx.attendance.createMany({
      data: [{ gymId, userId, localDate: dateOnly(localDateKey(now, gym.timezone)), checkedInAt: now }],
      skipDuplicates: true,
    });
    if (!inserted.count) return "ALREADY_CHECKED_IN" as const;
    await auditTx(tx, { action: "attendance.checked_in", gymId, actorUserId: userId, entityType: "Attendance", metadata: { membershipId: currentMembership.id } });
    return "CHECKED_IN" as const;
  });
}

export async function getMemberPortal(gymId: string, userId: string, now = new Date()) {
  return withTenant(gymId, async (tx) => {
    const [membership, payments, attendance, membershipUser] = await Promise.all([
      tx.membership.findMany({ where: { gymId, userId }, orderBy: { createdAt: "desc" }, include: { plan: { select: { name: true } }, payments: { orderBy: { createdAt: "desc" }, include: { corrections: true } } } }),
      tx.payment.findMany({ where: { gymId, userId }, orderBy: { createdAt: "desc" }, take: 100, include: { membership: { include: { plan: { select: { name: true } } } }, corrections: true } }),
      tx.attendance.findMany({ where: { gymId, userId }, orderBy: { checkedInAt: "desc" }, take: 90 }),
      tx.gymUser.findFirst({ where: { gymId, userId, role: "MEMBER" }, include: { user: { select: { name: true, phone: true } } } }),
    ]);
    const current = membership.find((item) => item.status === "ACTIVE" && item.startsAt <= now && now < item.endsAt) ?? null;
    const balance = (item: (typeof membership)[number]) => {
      const paid = item.payments.filter((payment) => !payment.voidedAt).reduce((sum, payment) => sum.plus(payment.amountInr), new Prisma.Decimal(0));
      return Prisma.Decimal.max(item.priceInr.minus(paid), 0);
    };
    const outstanding = membership
      .filter((item) => item.status === "ACTIVE")
      .reduce((sum, item) => sum.plus(balance(item)), new Prisma.Decimal(0));
    return { member: membershipUser ? { ...membershipUser.user, name: membershipUser.displayName ?? membershipUser.user.name } : null, memberships: membership, current, balance: outstanding, payments, attendance };
  });
}

export async function getPaymentReceipt(gymId: string, paymentId: string, userId?: string) {
  return withTenant(gymId, (tx) => tx.payment.findFirst({
    where: { gymId, id: paymentId, ...(userId ? { userId } : {}) },
    include: {
      member: { include: { user: { select: { name: true, phone: true } } } },
      membership: { include: { plan: { select: { name: true } } } },
      gym: { select: { name: true, city: true, address: true, phone: true } },
      corrections: true,
    },
  }));
}

export async function updateMemberProfile(gymId: string, userId: string, name: string, actorUserId: string) {
  const cleanName = z.string().trim().min(2).max(80).parse(name);
  return withTenant(gymId, async (tx) => {
    const membership = await tx.gymUser.findFirst({ where: { gymId, userId, role: "MEMBER", status: "ACTIVE" }, select: { id: true } });
    if (!membership) throw new Error("MEMBER_NOT_FOUND");
    await tx.gymUser.update({ where: { gymId_userId: { gymId, userId } }, data: { displayName: null } });
    const user = await tx.user.update({ where: { id: userId }, data: { name: cleanName }, select: { name: true } });
    await auditTx(tx, { action: "member.self_profile_updated", gymId, actorUserId, entityType: "User", entityId: userId });
    return user;
  });
}

export async function getGymSettings(gymId: string) {
  return withTenant(gymId, (tx) => tx.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, slug: true, phone: true, address: true, city: true, timezone: true, attendanceToken: true } }));
}

export async function updateGymSettings(gymId: string, raw: unknown, actorUserId: string) {
  const input = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30), address: z.string().trim().max(200), city: z.string().trim().max(80), timezone: z.string().trim().min(1).max(80) }).parse(raw);
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  } catch {
    throw new Error("INVALID_TIMEZONE");
  }
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.update({ where: { id: gymId }, data: { ...input, phone: input.phone || null, address: input.address || null, city: input.city || null } });
    await auditTx(tx, { action: "gym.settings_updated", gymId, actorUserId, entityType: "Gym", entityId: gymId });
    return gym;
  });
}

export async function getGymReport(gymId: string, from: string, to: string) {
  const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const fromKey = dateKeySchema.parse(from);
  const toKey = dateKeySchema.parse(to);
  const startDate = dateOnly(fromKey);
  const endDate = new Date(dateOnly(toKey).getTime() + dayMs);
  if ([fromKey, toKey].some((key) => dateOnly(key).toISOString().slice(0, 10) !== key) || endDate <= startDate || endDate.getTime() - startDate.getTime() > 366 * dayMs) throw new Error("INVALID_REPORT_RANGE");
  const endKey = endDate.toISOString().slice(0, 10);
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { timezone: true } });
    if (!gym) return null;
    const start = localMidnight(fromKey, gym.timezone);
    const end = localMidnight(endKey, gym.timezone);
    const attendanceStart = dateOnly(fromKey);
    const attendanceEnd = dateOnly(endKey);
    const [collections, attendance, signups] = await Promise.all([
      tx.$queryRaw<{ day: string; total: Prisma.Decimal; count: number }[]>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE ${gym.timezone}), 'YYYY-MM-DD') AS day,
          coalesce(sum("amountInr"), 0) AS total, count(*)::int AS count
        FROM "Payment"
        WHERE "gymId" = ${gymId}::uuid AND "voidedAt" IS NULL AND "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1 ORDER BY 1 DESC`,
      tx.$queryRaw<{ day: string; count: number }[]>`
        SELECT to_char("localDate", 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM "Attendance"
        WHERE "gymId" = ${gymId}::uuid AND "localDate" >= ${attendanceStart}::date AND "localDate" < ${attendanceEnd}::date
        GROUP BY 1 ORDER BY 1 DESC`,
      tx.$queryRaw<{ day: string; count: number }[]>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE ${gym.timezone}), 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM "GymUser"
        WHERE "gymId" = ${gymId}::uuid AND "role" = 'MEMBER' AND "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1 ORDER BY 1 DESC`,
    ]);
    const totalCollections = collections.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
    const totalAttendance = attendance.reduce((sum, item) => sum + item.count, 0);
    const totalSignups = signups.reduce((sum, item) => sum + item.count, 0);
    return { collections, attendance, signups, totalCollections, totalAttendance, totalSignups };
  });
}

export async function updateMemberName(gymId: string, userId: string, name: string, actorUserId: string) {
  const cleanName = z.string().trim().min(2).max(80).parse(name);
  return withTenant(gymId, async (tx) => {
    const membership = await tx.gymUser.findFirst({ where: { gymId, userId, role: "MEMBER" }, select: { id: true } });
    if (!membership) throw new Error("MEMBER_NOT_FOUND");
    await tx.gymUser.update({ where: { gymId_userId: { gymId, userId } }, data: { displayName: cleanName } });
    await auditTx(tx, { action: "member.profile_updated", gymId, actorUserId, entityType: "User", entityId: userId });
    return { id: userId, name: cleanName };
  });
}