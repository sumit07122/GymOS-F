/**
 * Client IP for rate limiting and audit. On Vercel the platform sets x-vercel-forwarded-for /
 * x-real-ip itself, so those are trusted first; a raw x-forwarded-for is the last resort.
 */
export function clientIp(h?: { get(name: string): string | null } | null): string {
  if (!h || typeof h.get !== "function") return "unknown";
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
