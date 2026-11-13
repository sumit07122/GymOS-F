import { Prisma } from "@/generated/prisma/client";

export function formatInr(value: Prisma.Decimal | string) {
  const [whole, fraction] = new Prisma.Decimal(value).toFixed(2).split(".") as [string, string];
  return `₹${new Intl.NumberFormat("en-IN").format(BigInt(whole))}.${fraction}`;
}