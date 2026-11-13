import { cookies } from "next/headers";

const prod = process.env.NODE_ENV === "production";
/** __Host- prefix (prod): HTTPS only, no Domain attribute, path=/ — the cookie cannot be set or overwritten by sibling subdomains. */
export const SESSION_COOKIE = prod ? "__Host-gymos_session" : "gymos_session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
