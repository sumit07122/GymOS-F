import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDb, withTenant } from "@/server/db";
import {
  assignMembership,
  createMember,
  createMembershipPlan,
  getMemberPortal,
  markAttendance,
  recordPayment,
  setMemberStatus,
  updateMemberName,
  voidPayment,
} from "@/server/gyms/operations";
import { admin, join, makeGym, makeUser, resetDb } from "../helpers/admin";

let gymA: string;
let gymB: string;
let ownerA: string;
let memberPlan: string;

beforeEach(async () => {
  await resetDb();
  gymA = await makeGym({ name: "Gym A" });
  gymB = await makeGym({ name: "Gym B" });
  ownerA = await makeUser({ email: "owner-a@example.test" });
  await join(gymA, ownerA, "OWNER");
  memberPlan = await withTenant(gymA, async (tx) => (await tx.membershipPlan.create({
    data: { gymId: gymA, name: "Monthly", durationDays: 30, priceInr: "1000.00" },
  })).id);
});

afterAll(async () => { await disconnectDb(); await admin.end(); });

describe("gym operations", () => {
  it("creates a member, assigns a membership, accepts partial payments, and keeps corrections auditable", async () => {
    const sharedUser = await makeUser({ name: "Global profile", phone: "+919876543210" });
    await join(gymB, sharedUser, "MEMBER");
    const member = await createMember(gymA, { name: "Asha Member", phone: "9876543210" }, ownerA, memberPlan);
    await updateMemberName(gymA, member.userId, "Asha Updated", ownerA);
    const portalBefore = await getMemberPortal(gymA, member.userId);
    expect(portalBefore?.member?.name).toBe("Asha Updated");
    expect(await withTenant(gymB, (tx) => tx.user.findUnique({ where: { id: sharedUser }, select: { name: true } }))).toEqual({ name: "Global profile" });
    expect(await withTenant(gymB, (tx) => tx.gymUser.findUnique({ where: { gymId_userId: { gymId: gymB, userId: sharedUser } }, select: { displayName: true } }))).toEqual({ displayName: null });
    expect(portalBefore?.balance.toString()).toBe("1000");

    const payment = await recordPayment(gymA, member.userId, member.membershipId!, {
      amountInr: "350.50", method: "UPI", reference: "UPI-TEST-1",
    }, ownerA);
    expect(payment.amountInr.toString()).toBe("350.5");
    await expect(recordPayment(gymA, member.userId, member.membershipId!, { amountInr: "700", method: "CASH" }, ownerA)).rejects.toThrow("OVERPAYMENT");
    expect((await getMemberPortal(gymA, member.userId))?.balance.toString()).toBe("649.5");

    await voidPayment(gymA, payment.id, "Duplicate payment entry", ownerA);
    const portalAfter = await getMemberPortal(gymA, member.userId);
    expect(portalAfter?.balance.toString()).toBe("1000");
    expect(portalAfter?.payments[0]?.voidedAt).toBeInstanceOf(Date);
    expect(await withTenant(gymA, (tx) => tx.paymentCorrection.count({ where: { paymentId: payment.id } }))).toBe(1);
    await expect(withTenant(gymA, (tx) => tx.payment.update({ where: { id: payment.id }, data: { amountInr: "1" } }))).rejects.toThrow();
    await expect(withTenant(gymA, (tx) => tx.paymentCorrection.updateMany({ where: { paymentId: payment.id }, data: { reason: "rewritten" } }))).rejects.toThrow();
  });

  it("prevents duplicate same-day attendance and refuses inactive gym memberships", async () => {
    const member = await createMember(gymA, { name: "Asha Member", phone: "9876543211" }, ownerA, memberPlan);
    const gym = await withTenant(gymA, (tx) => tx.gym.findUniqueOrThrow({ where: { id: gymA }, select: { attendanceToken: true } }));
    const day = new Date("2026-11-12T10:00:00.000Z");
    expect(await markAttendance(gymA, member.userId, gym.attendanceToken, day)).toBe("CHECKED_IN");
    expect(await markAttendance(gymA, member.userId, gym.attendanceToken, new Date("2026-11-12T22:00:00.000Z"))).toBe("ALREADY_CHECKED_IN");
    expect(await markAttendance(gymA, member.userId, "not-the-gym-code", new Date("2026-11-13T10:00:00.000Z"))).toBe("INVALID_QR");
    expect(await markAttendance(gymB, member.userId, gym.attendanceToken, new Date("2026-11-13T10:00:00.000Z"))).toBe("INVALID_QR");
    await setMemberStatus(gymA, member.userId, false, ownerA);
    expect(await markAttendance(gymA, member.userId, gym.attendanceToken, new Date("2026-11-13T10:00:00.000Z"))).toBe("MEMBERSHIP_REQUIRED");
  });

  it("renewal begins after the current term and tenant-scoped lookups cannot cross gyms", async () => {
    const member = await createMember(gymA, { name: "Asha Member", phone: "9876543212" }, ownerA, memberPlan);
    const first = await withTenant(gymA, (tx) => tx.membership.findUniqueOrThrow({ where: { id: member.membershipId! } }));
    const second = await assignMembership(gymA, member.userId, memberPlan, ownerA);
    expect(second.startsAt.getTime()).toBe(first.endsAt.getTime());
    expect(await withTenant(gymB, (tx) => tx.membership.findMany({ where: { userId: member.userId } }))).toHaveLength(0);
    await expect(createMembershipPlan(gymB, { name: "Other gym", durationDays: 30, priceInr: "1" }, ownerA)).resolves.toBeDefined();
  });
});