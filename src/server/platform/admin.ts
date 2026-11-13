import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { auditTx } from "../audit";
import { withPlatform } from "../db";
import { hashPassword, passwordSchema } from "../security/password";

const gymInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  ownerName: z.string().trim().min(2).max(80),
  ownerEmail: z.string().trim().toLowerCase().email(),
  ownerPassword: passwordSchema,
});

const planInput = z.object({
  name: z.string().trim().min(2).max(80),
  priceInr: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  durationDays: z.coerce.number().int().min(1).max(3650),
});

export type GymInput = z.infer<typeof gymInput>;
export type PlanInput = z.input<typeof planInput>;

export async function getAdminOverview() {
  return withPlatform(async (tx) => {
    const [gyms, plans, activity] = await Promise.all([
      tx.gym.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          gymUsers: { where: { role: "OWNER" }, include: { user: { select: { name: true, email: true } } } },
          subscriptions: { orderBy: { endsAt: "desc" }, include: { plan: { select: { name: true } } } },
        },
      }),
      tx.subscriptionPlan.findMany({ orderBy: [{ active: "desc" }, { priceInr: "asc" }] }),
      tx.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, select: { id: true, action: true, createdAt: true } }),
    ]);
    return { gyms, plans, activity };
  });
}

export async function createGymAndOwner(raw: unknown, actorUserId: string) {
  const input = gymInput.parse(raw);
  const passwordHash = await hashPassword(input.ownerPassword);
  return withPlatform(async (tx) => {
    if (await tx.gym.findUnique({ where: { slug: input.slug }, select: { id: true } })) throw new Error("SLUG_TAKEN");
    if (await tx.user.findUnique({ where: { email: input.ownerEmail }, select: { id: true } })) throw new Error("EMAIL_TAKEN");

    const gym = await tx.gym.create({
      data: {
        name: input.name,
        slug: input.slug,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
      },
    });
    const owner = await tx.user.create({ data: { name: input.ownerName, email: input.ownerEmail, passwordHash } });
    await tx.gymUser.create({ data: { gymId: gym.id, userId: owner.id, role: "OWNER" } });
    await auditTx(tx, {
      action: "platform.gym.created",
      gymId: gym.id,
      actorUserId,
      entityType: "Gym",
      entityId: gym.id,
      metadata: { slug: gym.slug, ownerUserId: owner.id },
    });
    return gym;
  });
}

export async function createSubscriptionPlan(raw: unknown, actorUserId: string) {
  const input = planInput.parse(raw);
  return withPlatform(async (tx) => {
    const plan = await tx.subscriptionPlan.create({
      data: { name: input.name, priceInr: new Prisma.Decimal(input.priceInr), durationDays: input.durationDays },
    });
    await auditTx(tx, { action: "platform.plan.created", actorUserId, entityType: "SubscriptionPlan", entityId: plan.id });
    return plan;
  });
}

export async function activateOrRenewGym(gymId: string, planId: string, actorUserId: string) {
  return withPlatform(async (tx) => {
    const [gym, plan] = await Promise.all([
      tx.gym.findUnique({ where: { id: gymId }, select: { id: true, status: true } }),
      tx.subscriptionPlan.findFirst({ where: { id: planId, active: true } }),
    ]);
    if (!gym || !plan) throw new Error("NOT_FOUND");

    const latest = await tx.subscription.findFirst({ where: { gymId }, orderBy: { endsAt: "desc" }, select: { endsAt: true } });
    const now = new Date();
    const startsAt = latest && latest.endsAt > now ? latest.endsAt : now;
    const endsAt = new Date(startsAt.getTime() + plan.durationDays * 86_400_000);
    const subscription = await tx.subscription.create({
      data: {
        gymId,
        planId,
        startsAt,
        endsAt,
        priceInr: plan.priceInr,
        createdByUserId: actorUserId,
      },
    });
    if (gym.status !== "SUSPENDED") await tx.gym.update({ where: { id: gymId }, data: { status: "ACTIVE" } });
    await auditTx(tx, {
      action: "platform.subscription.activated",
      gymId,
      actorUserId,
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: { planId, endsAt: endsAt.toISOString() },
    });
    return subscription;
  });
}

export async function setGymSuspended(gymId: string, suspended: boolean, actorUserId: string) {
  return withPlatform(async (tx) => {
    const gym = await tx.gym.update({ where: { id: gymId }, data: { status: suspended ? "SUSPENDED" : "ACTIVE" } });
    await auditTx(tx, {
      action: suspended ? "platform.gym.suspended" : "platform.gym.reactivated",
      gymId,
      actorUserId,
      entityType: "Gym",
      entityId: gym.id,
    });
    return gym;
  });
}

export async function setSubscriptionPlanActive(planId: string, active: boolean, actorUserId: string) {
  return withPlatform(async (tx) => {
    const result = await tx.subscriptionPlan.updateMany({ where: { id: planId }, data: { active } });
    if (!result.count) throw new Error("PLAN_NOT_FOUND");
    await auditTx(tx, { action: active ? "platform.plan.activated" : "platform.plan.archived", actorUserId, entityType: "SubscriptionPlan", entityId: planId });
  });
}

export async function createAdditionalOwner(gymId: string, raw: unknown, actorUserId: string) {
  const input = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password: passwordSchema.optional() }).parse(raw);
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  return withPlatform(async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) throw new Error("GYM_NOT_FOUND");
    let owner = await tx.user.findUnique({ where: { email: input.email }, select: { id: true, status: true } });
    if (owner?.status !== undefined && owner.status !== "ACTIVE") throw new Error("ACCOUNT_DISABLED");
    if (owner) {
      if (await tx.gymUser.findUnique({ where: { gymId_userId: { gymId, userId: owner.id } }, select: { id: true } })) throw new Error("ALREADY_IN_GYM");
    } else {
      if (!passwordHash) throw new Error("PASSWORD_REQUIRED");
      owner = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash }, select: { id: true, status: true } });
    }
    await tx.gymUser.create({ data: { gymId, userId: owner.id, role: "OWNER" } });
    await auditTx(tx, { action: "platform.owner.created", gymId, actorUserId, entityType: "User", entityId: owner.id });
    return owner;
  });
}

export async function resetGymOwnerPassword(gymId: string, ownerUserId: string, password: string, actorUserId: string) {
  const cleanPassword = passwordSchema.parse(password);
  const passwordHash = await hashPassword(cleanPassword);
  return withPlatform(async (tx) => {
    const owner = await tx.gymUser.findFirst({ where: { gymId, userId: ownerUserId, role: "OWNER" }, select: { userId: true } });
    if (!owner) throw new Error("OWNER_NOT_FOUND");
    await tx.user.update({ where: { id: ownerUserId }, data: { passwordHash, status: "ACTIVE" } });
    await tx.session.updateMany({ where: { userId: ownerUserId, revokedAt: null }, data: { revokedAt: new Date() } });
    await auditTx(tx, { action: "platform.owner.password_reset", gymId, actorUserId, entityType: "User", entityId: ownerUserId });
  });
}