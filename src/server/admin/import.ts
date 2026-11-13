import { Prisma } from "@/generated/prisma/client";
import { withPlatform, withTenant } from "../db";
import { normalizeIndianPhone } from "../security/phone";
import { audit } from "../audit";

export interface ParsedMemberRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  normalizedPhone: string | null;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  planName?: string;
  planId?: string;
  startDate?: string;
  expiryDate?: string;
  joiningDate?: string;
  paymentStatus: "PAID" | "PENDING";
  membershipStatus: "ACTIVE" | "EXPIRED" | "INACTIVE";
  emergencyContact?: string;
  notes?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface ImportPreviewResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  activeCount: number;
  expiredCount: number;
  eligibleForLoginCount: number;
  rows: ParsedMemberRow[];
}

/** Robust CSV text splitter that handles commas, double quotes, and line breaks. */
export function parseCsvRows(csvContent: string): string[][] {
  const content = csvContent.replace(/^\uFEFF/, "").trim(); // Remove UTF-8 BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++; // handle CRLF
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/** Standard downloadable sample CSV template for bulk imports. */
export function getImportTemplateCsv(): string {
  const headers = [
    "full_name",
    "phone",
    "email",
    "gender",
    "dob",
    "address",
    "plan_name",
    "start_date",
    "expiry_date",
    "joining_date",
    "payment_status",
    "membership_status",
    "emergency_contact",
    "notes",
  ].join(",");

  const sampleRows = [
    'Rahul Sharma,9876543210,rahul@example.com,MALE,1995-05-15,"B-402 Green Acres, Mumbai",Monthly Gold,2026-11-01,2026-12-01,2026-11-01,PAID,ACTIVE,+919876500000,Prefers morning session',
    'Priya Patel,9876543211,priya@example.com,FEMALE,1998-08-20,"Flat 12 Sunrise Apt, Pune",Quarterly,2026-10-15,2027-01-15,2026-10-15,PAID,ACTIVE,+919876500001,Personal training client',
    'Amit Kumar,9876543212,,MALE,1990-01-10,"Sector 14 Gurgaon",Annual VIP,2025-01-01,2026-01-01,2025-01-01,PAID,EXPIRED,,Former annual member',
  ].join("\n");

  return `${headers}\n${sampleRows}\n`;
}

/** Parse date string in YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY format. */
function parseDateFlexible(val?: string): Date | null {
  if (!val || !val.trim()) return null;
  const s = val.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    const year = dmy[3]!;
    const d = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Parses, validates and detects duplicates for an uploaded CSV before commit. */
export async function previewMemberImport(
  gymId: string,
  csvContent: string
): Promise<ImportPreviewResult> {
  const rawRows = parseCsvRows(csvContent);
  if (rawRows.length < 2) {
    throw new Error("CSV file must contain a header row and at least one member record.");
  }

  const rawHeaders = rawRows[0]!.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (r: string[], names: string[]): string => {
    for (const name of names) {
      const idx = headerMap[name];
      if (idx !== undefined && r[idx] !== undefined) return r[idx]!;
    }
    return "";
  };

  // Fetch gym's configured membership plans & existing members for duplicate detection
  const [plans, existingMembers] = await withPlatform(async (tx) => {
    const p = await tx.membershipPlan.findMany({
      where: { gymId },
      select: { id: true, name: true, durationDays: true, priceInr: true, active: true },
    });
    const m = await tx.gymUser.findMany({
      where: { gymId },
      select: { user: { select: { phone: true } } },
    });
    return [p, m];
  });

  const existingPhoneSet = new Set(
    existingMembers
      .map((m) => m.user.phone)
      .filter((p): p is string => Boolean(p))
  );

  const parsedRows: ParsedMemberRow[] = [];
  const phoneSeenInFile = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i]!;
    const fullName = getCol(r, ["fullname", "full_name", "name", "membername"]);
    const rawPhone = getCol(r, ["phone", "phonenumber", "mobile", "mobilenumber", "contact"]);
    const email = getCol(r, ["email", "emailaddress"]) || undefined;
    const gender = getCol(r, ["gender", "sex"]) || undefined;
    const dob = getCol(r, ["dob", "dateofbirth", "birthdate"]) || undefined;
    const address = getCol(r, ["address", "city", "location"]) || undefined;
    const rawPlanName = getCol(r, ["planname", "plan", "membership_plan", "membershipplan"]);
    const startDateStr = getCol(r, ["startdate", "start_date", "membershipstartdate"]);
    const expiryDateStr = getCol(r, ["expirydate", "expiry_date", "membershipexpirydate", "enddate"]);
    const joiningDateStr = getCol(r, ["joiningdate", "joining_date", "joindate"]);
    const rawPayment = getCol(r, ["paymentstatus", "payment_status", "payment"]).toUpperCase();
    const rawStatus = getCol(r, ["membershipstatus", "membership_status", "status"]).toUpperCase();
    const emergencyContact = getCol(r, ["emergencycontact", "emergency_contact"]) || undefined;
    const notes = getCol(r, ["notes", "remarks", "comment"]) || undefined;

    const errors: string[] = [];

    // Validate Name
    if (!fullName || fullName.length < 2) {
      errors.push("Full name is required (minimum 2 characters).");
    }

    // Validate Phone
    const normalizedPhone = normalizeIndianPhone(rawPhone);
    if (!normalizedPhone) {
      errors.push(`Invalid mobile phone format: "${rawPhone}". Must be a valid 10-digit number.`);
    }

    // Duplicate Checks
    let isDuplicate = false;
    if (normalizedPhone) {
      if (phoneSeenInFile.has(normalizedPhone)) {
        isDuplicate = true;
        errors.push(`Duplicate phone number within this import file.`);
      } else {
        phoneSeenInFile.add(normalizedPhone);
      }

      if (existingPhoneSet.has(normalizedPhone)) {
        isDuplicate = true;
        errors.push(`Mobile number already registered in this gym workspace.`);
      }
    }

    // Plan matching
    let matchedPlanId: string | undefined;
    if (rawPlanName) {
      const match = plans.find(
        (p) => p.name.trim().toLowerCase() === rawPlanName.trim().toLowerCase()
      );
      if (match) {
        matchedPlanId = match.id;
      } else {
        errors.push(`Plan "${rawPlanName}" does not match any configured membership tier in this gym.`);
      }
    }

    // Status normalization
    const membershipStatus: "ACTIVE" | "EXPIRED" | "INACTIVE" =
      rawStatus === "EXPIRED"
        ? "EXPIRED"
        : rawStatus === "INACTIVE" || rawStatus === "CANCELLED"
        ? "INACTIVE"
        : "ACTIVE";

    const paymentStatus: "PAID" | "PENDING" =
      rawPayment === "PAID" ? "PAID" : "PENDING";

    parsedRows.push({
      rowNumber: i + 1,
      fullName,
      phone: rawPhone,
      normalizedPhone,
      email,
      gender,
      dob,
      address,
      planName: rawPlanName || undefined,
      planId: matchedPlanId,
      startDate: startDateStr || undefined,
      expiryDate: expiryDateStr || undefined,
      joiningDate: joiningDateStr || undefined,
      paymentStatus,
      membershipStatus,
      emergencyContact,
      notes,
      isValid: errors.length === 0,
      isDuplicate,
      errors,
    });
  }

  const totalRecords = parsedRows.length;
  const validRecords = parsedRows.filter((r) => r.isValid).length;
  const invalidRecords = parsedRows.filter((r) => !r.isValid && !r.isDuplicate).length;
  const duplicateRecords = parsedRows.filter((r) => r.isDuplicate).length;
  const activeCount = parsedRows.filter((r) => r.isValid && r.membershipStatus === "ACTIVE").length;
  const expiredCount = parsedRows.filter(
    (r) => r.isValid && (r.membershipStatus === "EXPIRED" || r.membershipStatus === "INACTIVE")
  ).length;
  const eligibleForLoginCount = activeCount;

  return {
    totalRecords,
    validRecords,
    invalidRecords,
    duplicateRecords,
    activeCount,
    expiredCount,
    eligibleForLoginCount,
    rows: parsedRows,
  };
}

/** Executes transactional bulk import of verified member records into Neon database. */
export async function commitMemberImport(params: {
  gymId: string;
  actorUserId: string;
  filename: string;
  validRows: ParsedMemberRow[];
}): Promise<{
  success: boolean;
  importedCount: number;
  importJobId: string;
}> {
  const { gymId, actorUserId, filename, validRows } = params;

  // Filter only valid records
  const toImport = validRows.filter((r) => r.isValid && r.normalizedPhone);
  if (toImport.length === 0) {
    throw new Error("No valid member records found to import.");
  }

  const now = new Date();

  return withPlatform(async (tx) => {
    // 1. Fetch gym plans
    const plans = await tx.membershipPlan.findMany({
      where: { gymId },
    });
    const defaultPlan = plans.find((p) => p.active) ?? plans[0];

    let importedCount = 0;

    for (const row of toImport) {
      const phone = row.normalizedPhone!;

      // Find or create User
      let user = await tx.user.findUnique({ where: { phone } });
      if (!user) {
        user = await tx.user.create({
          data: {
            name: row.fullName,
            phone,
            email: row.email ? row.email.toLowerCase().trim() : null,
            status: "ACTIVE",
          },
        });
      }

      // Parse DOB if available
      const parsedDob = parseDateFlexible(row.dob);

      // Create or update GymUser association
      const gymUser = await tx.gymUser.upsert({
        where: { gymId_userId: { gymId, userId: user.id } },
        create: {
          gymId,
          userId: user.id,
          displayName: row.fullName,
          role: "MEMBER",
          status: row.membershipStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",
          gender: row.gender ?? null,
          dateOfBirth: parsedDob ?? null,
          address: row.address ?? null,
          emergencyContact: row.emergencyContact ?? null,
          notes: row.notes ?? null,
        },
        update: {
          displayName: row.fullName,
          status: row.membershipStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",
          gender: row.gender ?? undefined,
          dateOfBirth: parsedDob ?? undefined,
          address: row.address ?? undefined,
          emergencyContact: row.emergencyContact ?? undefined,
          notes: row.notes ?? undefined,
        },
      });

      // If member has plan or dates, assign membership
      const targetPlan = row.planId ? plans.find((p) => p.id === row.planId) : defaultPlan;
      if (targetPlan) {
        const start = parseDateFlexible(row.startDate) ?? now;
        const end =
          parseDateFlexible(row.expiryDate) ??
          new Date(start.getTime() + targetPlan.durationDays * 86_400_000);

        const membership = await tx.membership.create({
          data: {
            gymId,
            userId: user.id,
            planId: targetPlan.id,
            startsAt: start,
            endsAt: end > start ? end : new Date(start.getTime() + 86_400_000),
            priceInr: targetPlan.priceInr,
            status: row.membershipStatus === "EXPIRED" ? "CANCELLED" : "ACTIVE",
          },
        });

        // Record initial payment if marked as PAID
        if (row.paymentStatus === "PAID") {
          await tx.payment.create({
            data: {
              gymId,
              userId: user.id,
              membershipId: membership.id,
              amountInr: targetPlan.priceInr,
              method: "CASH",
              reference: `CSV_IMPORT_${now.toISOString().slice(0, 10)}`,
              recordedByUserId: actorUserId,
            },
          });
        }
      }

      importedCount++;
    }

    // 2. Log MemberImportJob
    const job = await tx.memberImportJob.create({
      data: {
        gymId,
        filename,
        totalRecords: toImport.length,
        validRecords: importedCount,
        invalidRecords: 0,
        duplicateRecords: 0,
        status: "COMPLETED",
        createdByUserId: actorUserId,
        summary: {
          importedAt: now.toISOString(),
          activeImported: toImport.filter((r) => r.membershipStatus === "ACTIVE").length,
          expiredImported: toImport.filter((r) => r.membershipStatus !== "ACTIVE").length,
        },
      },
    });

    await audit({
      action: "gym.bulk_member_imported",
      gymId,
      actorUserId,
      entityType: "MemberImportJob",
      entityId: job.id,
      metadata: { importedCount, filename },
    });

    return {
      success: true,
      importedCount,
      importJobId: job.id,
    };
  });
}

