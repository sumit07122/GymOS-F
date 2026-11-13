// HTTP smoke test against a RUNNING app (no browser needed: forms are posted the way a no-JS browser would).
//   BASE_URL=http://localhost:3100 ADMIN_EMAIL=… ADMIN_PASSWORD=… OWNER_EMAIL=… OWNER_PASSWORD=… \
//   PENDING_OWNER_EMAIL=… MEMBER_PHONE=… OTP_LOG=/path/to/server.log node scripts/smoke.mjs
import { readFileSync } from "node:fs";

const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v; };
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let failures = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`); if (!ok) failures++; };

const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
class Browser {
  jar = new Map();
  async req(path, init = {}) {
    const cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + path, { redirect: "manual", ...init, headers: { ...(init.headers ?? {}), cookie, origin: BASE } });
    for (const c of res.headers.getSetCookie()) {
      const [kv, ...attrs] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(attrs.join(";")) || v === "") this.jar.delete(k); else this.jar.set(k, v);
    }
    return res;
  }
  /** Finds the form containing `needle`, fills it, and posts it. */
  async submit(path, needle, fields, fromHtml) {
    const html = fromHtml ?? (await (await this.req(path)).text());
    const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((m) => m[0]);
    const form = forms.find((f) => f.includes(needle));
    if (!form) throw new Error(`no form containing ${needle} on ${path}`);
    const fd = new FormData();
    for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
      const name = /name="([^"]*)"/.exec(m[0])?.[1]; const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
      if (name) fd.append(unesc(name), unesc(value));
    }
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return this.req(path, { method: "POST", body: fd });
  }
}
const where = (r) => (r.headers.get("location") ?? "").replace(BASE, "");
const page = async (b, p) => { const r = await b.req(p); return { status: r.status, to: where(r), html: r.status === 200 ? await r.text() : "" }; };

// ── Platform admin
{
  const b = new Browser();
  const bad = await b.submit("/login?as=staff", "Password", { email: env("ADMIN_EMAIL"), password: "definitely-wrong-1" });
  check("admin: wrong password shows a generic error and sets no session", (await bad.text()).includes("Incorrect email or password") && b.jar.size === 0);
  const ok = await b.submit("/login?as=staff", "Password", { email: env("ADMIN_EMAIL"), password: env("ADMIN_PASSWORD") });
  check("admin: login redirects and sets an httpOnly cookie", ok.status === 303 && b.jar.size === 1 && /httponly/i.test(ok.headers.getSetCookie().join(";")));
  const a = await page(b, "/admin"); check("admin: /admin renders", a.status === 200 && a.html.includes("FIXIA Admin"));
  check("admin: gym pages are forbidden for admins", (await page(b, "/owner")).to === "/admin" && (await page(b, "/member")).to === "/admin");
  await b.submit("/admin", "Sign out", {});
  check("admin: sign-out ends the session", (await page(b, "/admin")).to === "/login");
}

// ── Owner of an active gym
{
  const b = new Browser();
  await b.submit("/login?as=staff", "Password", { email: env("OWNER_EMAIL"), password: env("OWNER_PASSWORD") });
  const o = await page(b, "/owner");
  check("owner: dashboard shows own gym, active", o.status === 200 && o.html.includes("Iron Works") && o.html.includes("workspace is active"));
  check("owner: cannot open admin or member areas", (await page(b, "/admin")).to === "/owner" && (await page(b, "/member")).to === "/owner");
}

// ── Owner of a pending gym: limited access
{
  const b = new Browser();
  await b.submit("/login?as=staff", "Password", { email: env("PENDING_OWNER_EMAIL"), password: env("OWNER_PASSWORD") });
  const o = await page(b, "/owner");
  check("pending owner: limited dashboard with activation notice", o.status === 200 && o.html.includes("waiting for activation"));
  const s = await page(b, "/gym-status"); check("pending owner: status page reachable", s.status === 200 && s.html.includes("waiting to be activated"));
}

// ── Member via phone + OTP
{
  const b = new Browser();
  const sent = await b.submit("/login", "Mobile number", { phone: env("MEMBER_PHONE") });
  const codeStep = await sent.text(); // the code form only exists in the response to the first POST
  check("member: code request moves to the code step", sent.status === 200 && codeStep.includes("6-digit code"));
  const log = readFileSync(env("OTP_LOG"), "utf8");
  const code = [...log.matchAll(/\[sms:console\][^\n]*?(\d{6}) is your FIXIA GymOS login code/g)].at(-1)?.[1];
  check("member: a code was delivered to the SMS provider", !!code);
  const wrong = await b.submit("/login", "Enter your login code", { phone: env("MEMBER_PHONE"), code: code === "000000" ? "111111" : "000000" }, codeStep);
  const wrongHtml = await wrong.text();
  check("member: wrong code is rejected", wrongHtml.includes("incorrect or has expired") && b.jar.size === 0);
  const good = await b.submit("/login", "6-digit code", { phone: env("MEMBER_PHONE"), code }, wrongHtml);
  check("member: correct code logs in", good.status === 303 && b.jar.size === 1);
  const m = await page(b, "/member"); check("member: portal renders for their gym", m.status === 200 && m.html.includes("Hi, Asha") && m.html.includes("Iron Works"));
  check("member: owner and admin areas are closed", (await page(b, "/owner")).to === "/member" && (await page(b, "/admin")).to === "/member");
  const replay = new Browser();
  const again = await replay.submit("/login", "6-digit code", { phone: env("MEMBER_PHONE"), code }, codeStep);
  check("member: the used code cannot be replayed", replay.jar.size === 0 && (await again.text()).includes("incorrect or has expired"));
  await b.submit("/member", "Sign out", {});
  check("member: sign-out ends the session", (await page(b, "/member")).to === "/login");
}

process.exit(failures ? 1 : 0);
