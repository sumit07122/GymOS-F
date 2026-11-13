import { withPlatform } from "../db";
import { hashPassword } from "../security/password";
import { normalizeIndianPhone } from "../security/phone";
import { audit } from "../audit";
import { sendRegistrationApprovedEmail } from "../email";

export interface CreateOnboardingGymInput {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstNumber?: string;
  logo?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
  actorUserId: string;
  operatingHours?: Record<string, string>;
  plans?: Array<{ name: string; durationDays: number; priceInr: number; description?: string }>;
}

/** Step 1: Provisions a new gym workspace, owner account, and starter membership plans. */
export async function createOnboardingGym(input: CreateOnboardingGymInput) {
  const cleanSlug = input.slug
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const cleanOwnerEmail = input.ownerEmail.toLowerCase().trim();
  const cleanOwnerPhone = normalizeIndianPhone(input.ownerPhone);

  return withPlatform(async (tx) => {
    // Check slug collision
    const existingSlug = await tx.gym.findUnique({ where: { slug: cleanSlug } });
    if (existingSlug) {
      throw new Error(`The workspace URL slug "/${cleanSlug}" is already in use.`);
    }

    // Check existing owner email
    const existingOwner = await tx.user.findUnique({ where: { email: cleanOwnerEmail } });
    if (existingOwner && existingOwner.status !== "ACTIVE") {
      throw new Error("An account with that owner email is disabled.");
    }

    const passwordHash = await hashPassword(input.ownerPassword);

    // 1. Create Gym
    const gym = await tx.gym.create({
      data: {
        name: input.name,
        slug: cleanSlug,
        phone: input.phone || cleanOwnerPhone,
        address: input.address,
        city: input.city,
        state: input.state,
        pinCode: input.pinCode,
        gstNumber: input.gstNumber,
        logo: input.logo,
        status: "PENDING",
        timezone: "Asia/Kolkata",
      },
    });

    // 2. Create or link Owner User
    let owner = existingOwner;
    if (!owner) {
      owner = await tx.user.create({
        data: {
          name: input.ownerName,
          email: cleanOwnerEmail,
          phone: cleanOwnerPhone,
          passwordHash,
          status: "ACTIVE",
        },
      });
    }

    // 3. Link as OWNER
    await tx.gymUser.create({
      data: {
        gymId: gym.id,
        userId: owner.id,
        role: "OWNER",
        status: "ACTIVE",
        displayName: input.ownerName,
      },
    });

    // 4. Create starter membership plans
    const starterPlans =
      input.plans && input.plans.length > 0
        ? input.plans.map((p) => ({
            gymId: gym.id,
            name: p.name,
            durationDays: p.durationDays,
            priceInr: p.priceInr,
            active: true,
          }))
        : [
            {
              gymId: gym.id,
              name: "Monthly Standard",
              durationDays: 30,
              priceInr: 1500.0,
              active: true,
            },
            {
              gymId: gym.id,
              name: "Quarterly VIP",
              durationDays: 90,
              priceInr: 4000.0,
              active: true,
            },
            {
              gymId: gym.id,
              name: "Annual Elite",
              durationDays: 365,
              priceInr: 14000.0,
              active: true,
            },
          ];

    await tx.membershipPlan.createMany({
      data: starterPlans,
    });

    await audit({
      action: "platform.gym_onboarding_created",
      gymId: gym.id,
      actorUserId: input.actorUserId,
      entityType: "Gym",
      entityId: gym.id,
      metadata: { slug: gym.slug, ownerEmail: cleanOwnerEmail },
    });

    return {
      gymId: gym.id,
      slug: gym.slug,
      name: gym.name,
      ownerId: owner.id,
    };
  });
}

/** Fetches onboarding status, member counts, and active plans for an onboarded gym. */
export async function getOnboardingProgress(gymId: string) {
  return withPlatform(async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      include: {
        membershipPlans: true,
        importJobs: { orderBy: { createdAt: "desc" }, take: 5 },
        credentialBatches: { orderBy: { createdAt: "desc" }, take: 1 },
        subscriptions: { where: { status: "ACTIVE" }, take: 1 },
      },
    });

    if (!gym) return null;

    const totalMembers = await tx.gymUser.count({
      where: { gymId, role: "MEMBER" },
    });

    const activeMembers = await tx.gymUser.count({
      where: { gymId, role: "MEMBER", status: "ACTIVE" },
    });

    const membersWithAccounts = await tx.gymUser.count({
      where: {
        gymId,
        role: "MEMBER",
        user: { passwordHash: { not: null } },
      },
    });

    const owners = await tx.gymUser.findMany({
      where: { gymId, role: "OWNER" },
      include: { user: { select: { name: true, email: true, phone: true } } },
    });

    return {
      gym,
      totalMembers,
      activeMembers,
      membersWithAccounts,
      owners,
      hasPlans: gym.membershipPlans.length > 0,
      hasImport: gym.importJobs.length > 0,
      isActivated: gym.status === "ACTIVE",
    };
  });
}

/** Lists active platform subscription tiers for onboarding assignment. */
export async function listActiveSubscriptionPlans() {
  return withPlatform(async (tx) => {
    return tx.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceInr: "asc" },
      select: { id: true, name: true, priceInr: true, durationDays: true },
    });
  });
}

/** Activates an onboarded gym workspace and dispatches welcome approval email to owner. */
export async function activateOnboardedGymWorkspace(params: {
  gymId: string;
  planId?: string;
  actorUserId: string;
  appUrl?: string;
}) {
  const { gymId, planId, actorUserId, appUrl } = params;

  return withPlatform(async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      include: {
        gymUsers: {
          where: { role: "OWNER" },
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (!gym) throw new Error("Gym workspace not found.");

    // If subscription plan specified, assign it
    let subPlanId = planId;
    if (!subPlanId) {
      const activePlatformPlan = await tx.subscriptionPlan.findFirst({
        where: { active: true },
        orderBy: { durationDays: "desc" },
      });
      subPlanId = activePlatformPlan?.id;
    }

    if (subPlanId) {
      const plan = await tx.subscriptionPlan.findUnique({ where: { id: subPlanId } });
      if (plan) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + plan.durationDays * 86_400_000);
        await tx.subscription.create({
          data: {
            gymId,
            planId: plan.id,
            startsAt: now,
            endsAt,
            priceInr: plan.priceInr,
            status: "ACTIVE",
            createdByUserId: actorUserId,
          },
        });
      }
    }

    // Activate gym status
    await tx.gym.update({
      where: { id: gymId },
      data: { status: "ACTIVE" },
    });

    // Notify owner
    const primaryOwner = gym.gymUsers[0]?.user;
    if (primaryOwner && primaryOwner.email) {
      await sendRegistrationApprovedEmail({
        ownerEmail: primaryOwner.email,
        ownerName: primaryOwner.name,
        gymName: gym.name,
        slug: gym.slug,
        appUrl,
      });
    }

    await audit({
      action: "platform.gym_workspace_activated",
      gymId,
      actorUserId,
      entityType: "Gym",
      entityId: gymId,
      metadata: { gymName: gym.name, slug: gym.slug },
    });

    return { success: true };
  });
}

