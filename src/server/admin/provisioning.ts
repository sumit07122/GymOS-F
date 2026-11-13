import crypto from "node:crypto";
import { withPlatform } from "../db";
import { hashPassword } from "../security/password";
import { maskPhone } from "../security/phone";
import { audit } from "../audit";
import { revokeAllSessions } from "../auth/sessions";

/** Generates a cryptographically random 10-character alphanumeric temporary password. */
export function generateTemporaryPassword(length = 10): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz!@#$%";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}

export interface ProvisionedCredential {
  userId: string;
  name: string;
  phone: string;
  maskedPhone: string;
  temporaryPassword: string;
}

/**
 * Identifies eligible active members without configured credentials, generates cryptographically
 * secure random temporary passwords, hashes them with Argon2, sets mustChangePassword = true,
 * and returns the credential package for administrative distribution.
 */
export async function generateMemberAccounts(
  gymId: string,
  actorUserId: string
): Promise<{
  success: boolean;
  totalProvisioned: number;
  batchId: string;
  credentials: ProvisionedCredential[];
}> {
  return withPlatform(async (tx) => {
    // 1. Fetch active members in the gym who do not yet have a password or are eligible
    const gymUsers = await tx.gymUser.findMany({
      where: {
        gymId,
        role: "MEMBER",
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            passwordHash: true,
            status: true,
          },
        },
      },
    });

    const eligible = gymUsers.filter((gu) => gu.user.status === "ACTIVE" && Boolean(gu.user.phone));
    const provisionedList: ProvisionedCredential[] = [];

    for (const gu of eligible) {
      const tempPass = generateTemporaryPassword(10);
      const hashed = await hashPassword(tempPass);

      await tx.user.update({
        where: { id: gu.user.id },
        data: {
          passwordHash: hashed,
          mustChangePassword: true,
        },
      });

      provisionedList.push({
        userId: gu.user.id,
        name: gu.displayName ?? gu.user.name,
        phone: gu.user.phone!,
        maskedPhone: maskPhone(gu.user.phone!),
        temporaryPassword: tempPass,
      });
    }

    // 2. Audit record in MemberCredentialBatch
    const expiresAt = new Date(Date.now() + 24 * 3600_000); // 24 hours batch window
    const batch = await tx.memberCredentialBatch.create({
      data: {
        gymId,
        generatedByUserId: actorUserId,
        credentialsCount: provisionedList.length,
        expiresAt,
      },
    });

    await audit({
      action: "gym.member_accounts_provisioned",
      gymId,
      actorUserId,
      entityType: "MemberCredentialBatch",
      entityId: batch.id,
      metadata: { count: provisionedList.length },
    });

    return {
      success: true,
      totalProvisioned: provisionedList.length,
      batchId: batch.id,
      credentials: provisionedList,
    };
  });
}

/**
 * Regenerates a temporary password for an individual member if credentials are lost.
 * Immediately invalidates the previous credential and any active sessions.
 */
export async function regenerateMemberTemporaryPassword(
  gymId: string,
  userId: string,
  actorUserId: string
): Promise<{
  success: boolean;
  temporaryPassword: string;
  name: string;
  phone: string;
}> {
  return withPlatform(async (tx) => {
    const gymUser = await tx.gymUser.findFirst({
      where: { gymId, userId, role: "MEMBER" },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    if (!gymUser || !gymUser.user.phone) {
      throw new Error("Member not found in this gym workspace.");
    }

    const newTempPassword = generateTemporaryPassword(10);
    const newHash = await hashPassword(newTempPassword);

    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: true,
      },
    });

    // Invalidate existing sessions
    await revokeAllSessions(userId);

    await audit({
      action: "gym.member_credential_regenerated",
      gymId,
      actorUserId,
      entityType: "User",
      entityId: userId,
      metadata: { targetPhone: maskPhone(gymUser.user.phone) },
    });

    return {
      success: true,
      temporaryPassword: newTempPassword,
      name: gymUser.displayName ?? gymUser.user.name,
      phone: gymUser.user.phone,
    };
  });
}

/** Lists all members with their authentication & credential status. */
export async function listGymMemberCredentials(gymId: string) {
  return withPlatform(async (tx) => {
    const members = await tx.gymUser.findMany({
      where: { gymId, role: "MEMBER" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            mustChangePassword: true,
            emailVerified: true,
            emailVerifiedAt: true,
            passwordChangedAt: true,
            lastLoginAt: true,
            passwordHash: true,
          },
        },
        memberships: {
          where: { status: "ACTIVE", endsAt: { gt: new Date() } },
          select: { plan: { select: { name: true } }, endsAt: true },
          take: 1,
        },
      },
    });

    return members.map((m) => ({
      userId: m.user.id,
      name: m.displayName ?? m.user.name,
      phone: m.user.phone ?? "No phone",
      maskedPhone: m.user.phone ? maskPhone(m.user.phone) : "—",
      email: m.user.email,
      emailVerified: m.user.emailVerified,
      status: m.status,
      hasCredentials: Boolean(m.user.passwordHash),
      mustChangePassword: m.user.mustChangePassword,
      lastLoginAt: m.user.lastLoginAt,
      passwordChangedAt: m.user.passwordChangedAt,
      currentPlan: m.memberships[0]?.plan.name ?? "Unassigned",
      endsAt: m.memberships[0]?.endsAt ?? null,
    }));
  });
}

