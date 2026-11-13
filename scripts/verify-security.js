const { readFileSync, readdirSync, statSync } = require("fs");
const { join } = require("path");

const ALLOWED = new Set([
  "src/server/db.ts",
  "src/server/audit.ts",
  "src/server/auth/sessions.ts",
  "src/server/auth/otp.ts",
  "src/server/platform/admin.ts",
  "src/server/platform/registration.ts",
]);

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f).replace(/\\/g, "/");
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });

const o1 = walk("src")
  .filter((f) => !f.includes("src/generated"))
  .filter((f) => /\bwithPlatform\s*\(/.test(readFileSync(f, "utf8")))
  .filter((f) => !ALLOWED.has(f));

console.log("withPlatform offenders:", o1);

const o2 = walk("src/app").filter((f) => /from ["']@\/server\/db["']/.test(readFileSync(f, "utf8")));
console.log("src/app db offenders:", o2);

if (o1.length === 0 && o2.length === 0) {
  console.log("ALL SECURITY CHECKS PASSED!");
} else {
  process.exit(1);
}

