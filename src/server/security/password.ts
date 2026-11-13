import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

// OWASP minimum for argon2id: 19 MiB, 2 iterations, 1 lane.
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

export const hashPassword = (plain: string) => hash(plain, OPTS);

export async function verifyPassword(stored: string | null | undefined, plain: string): Promise<boolean> {
  // Always do one full verification so unknown users cost the same as wrong passwords.
  const target = stored ?? (await dummyHash());
  try {
    const ok = await verify(target, plain);
    return stored ? ok : false;
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hash("not-a-real-password", OPTS));
