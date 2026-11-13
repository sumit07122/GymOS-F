import { z } from "zod";
import { auditTx } from "../audit";
import { withPlatform } from "../db";
import { hitAll } from "../security/ratelimit";
import { normalizeIndianPhone } from "../security/phone";
import { hashPassword, passwordSchema } from "../security/password";

const requestSchema = z.object({
  gymName: z.string().trim().min(2).max(100),
  ownerName: z.string().trim().min(2).max(80),
  ownerEmail: z.string().trim().toLowerCase().email(),
  ownerPhone: z.string().trim().min(10).max(20),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

const approvalSchema = z.object({
  requestId: z.string().uuid(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  ownerPassword: passwordSchema.optional(),
});

export async function submitRegistrationRequest(raw: unknown, ip: string) {
  const input = requestSchema.parse(raw);
  const ownerPhone = normalizeIndianPhone(input.ownerPhone);
  if (!ownerPhone) throw new Error("INVALID_PHONE");
  const limit = await hitAll([
    [`registration:ip:${ip}`, { limit: 5, windowSec: 3600 }],
    [`registration:email:${input.ownerEmail}`, { limit: 3, windowSec: 86400 }],
  ]);
  if (limit) throw new Error("RATE_LIMITED");
  return withPlatform(async (tx) => {
    const request = await tx.gymRegistrationRequest.create({
      data: {
        gymName: input.gymName,
        ownerName: input.ownerName,
        ownerEmail: input.ownerEmail,
        ownerPhone,
        city: input.city || null,
        address: input.address || null,
        notes: input.notes || null,
      },
    });
    await auditTx(tx, {
      action: "platform.registration.requested",
      entityType: "GymRegistrationRequest",
      entityId: request.id,
      metadata: { gymName: input.gymName, city: input.city || "" },
      ip,
    });
    return request.id;
  });
}

export async function getPendingRegistrationRequests() {
  return withPlatform((tx) => tx.gymRegistrationRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }));
}

export async function approveRegistrationRequest(raw: unknown, actorUserId: string) {
  const input = approvalSchema.parse(raw);
  return withPlatform(async (tx) => {
    const request = await tx.gymRegistrationRequest.findFirst({ where: { id: input.requestId, status: "PENDING" } });
    if (!request) throw new Error("REQUEST_NOT_FOUND");
    if (await tx.gym.findUnique({ where: { slug: input.slug }, select: { id: true } })) throw new Error("SLUG_TAKEN");
    let owner = await tx.user.findUnique({ where: { email: request.ownerEmail }, select: { id: true, globalRole: true, status: true } });
    if (owner?.globalRole) throw new Error("ACCOUNT_ROLE_CONFLICT");
    if (owner?.status !== undefined && owner.status !== "ACTIVE") throw new Error("ACCOUNT_DISABLED");

    const gym = await tx.gym.create({
      data: { name: request.gymName, slug: input.slug, phone: request.ownerPhone, address: request.address, city: request.city },
    });
    if (!owner) {
      if (!input.ownerPassword) throw new Error("PASSWORD_REQUIRED");
      const passwordHash = await hashPassword(input.ownerPassword);
      owner = await tx.user.create({ data: { name: request.ownerName, email: request.ownerEmail, phone: request.ownerPhone, passwordHash }, select: { id: true, globalRole: true, status: true } });
    }
    await tx.gymUser.create({ data: { gymId: gym.id, userId: owner.id, role: "OWNER" } });
    await tx.gymRegistrationRequest.update({ where: { id: request.id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedByUserId: actorUserId } });
    await auditTx(tx, {
      action: "platform.registration.approved",
      gymId: gym.id,
      actorUserId,
      entityType: "GymRegistrationRequest",
      entityId: request.id,
      metadata: { gymId: gym.id, ownerUserId: owner.id },
    });
    return gym;
  });
}

export async function rejectRegistrationRequest(requestId: string, actorUserId: string) {
  if (!z.string().uuid().safeParse(requestId).success) throw new Error("INVALID_REQUEST");
  return withPlatform(async (tx) => {
    const result = await tx.gymRegistrationRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedByUserId: actorUserId },
    });
    if (!result.count) throw new Error("REQUEST_NOT_FOUND");
    await auditTx(tx, { action: "platform.registration.rejected", actorUserId, entityType: "GymRegistrationRequest", entityId: requestId });
  });
}