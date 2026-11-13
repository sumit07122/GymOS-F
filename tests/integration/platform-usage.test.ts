import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// withPlatform bypasses tenant isolation. Anything added here must be reviewed as security-sensitive.
const ALLOWED = new Set([
  "src/server/db.ts",
  "src/server/audit.ts",
  "src/server/auth/sessions.ts",
  "src/server/auth/otp.ts",
  "src/server/auth/member-auth.ts",
  "src/server/platform/admin.ts",
  "src/server/platform/registration.ts",
  "src/server/admin/import.ts",
  "src/server/admin/onboarding.ts",
  "src/server/admin/provisioning.ts",
]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });

describe("tenant-bypass allow-list", () => {
  it("withPlatform is used only by reviewed modules", () => {
    const offenders = walk("src")
      .filter((f) => !f.includes("src/generated"))
      .filter((f) => /\bwithPlatform\s*\(/.test(readFileSync(f, "utf8")))
      .filter((f) => !ALLOWED.has(f));
    expect(offenders).toEqual([]);
  });

  it("app code never imports the raw db client outside the server layer", () => {
    const offenders = walk("src/app").filter((f) => /from ["']@\/server\/db["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
