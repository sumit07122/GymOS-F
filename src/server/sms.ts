import { env, isProd } from "./env";

export interface SmsProvider {
  send(toE164: string, message: string): Promise<void>;
}

export class OtpDisabledError extends Error {
  constructor() {
    super("OTP delivery is not configured (SMS_PROVIDER)");
  }
}

/** Development & staging console provider: logs the OTP to server console / Vercel runtime logs. */
const consoleProvider: SmsProvider = {
  async send(to, message) {
    console.info(`[sms:otp] → ${to}: ${message}`);
  },
};

/** Production MSG91 DLT-compliant Indian SMS provider. */
const msg91Provider: SmsProvider = {
  async send(to, message) {
    const authKey = env().MSG91_AUTH_KEY;
    const templateId = env().MSG91_TEMPLATE_ID;

    if (!authKey) {
      console.error("[sms:msg91] MSG91_AUTH_KEY is not configured.");
      throw new OtpDisabledError();
    }

    // Extract 6-digit OTP code from message
    const otpMatch = message.match(/\b\d{6}\b/);
    const otp = otpMatch ? otpMatch[0] : "";
    const mobile = to.replace(/^\+/, ""); // e.g. 919876543210

    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("authkey", authKey);
    if (templateId) url.searchParams.set("template_id", templateId);
    if (otp) url.searchParams.set("otp", otp);

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile,
          otp,
        }),
      });

      const data = (await res.json().catch(() => null)) as { type?: string; message?: string } | null;
      if (!res.ok || (data && data.type === "error")) {
        console.error("[sms:msg91:error]", data || res.statusText);
        throw new Error(`MSG91_DELIVERY_FAILED: ${data?.message || res.statusText}`);
      }

      console.info(`[sms:msg91] OTP dispatched successfully to ${to}`);
    } catch (err) {
      console.error("[sms:msg91:exception]", err);
      throw err;
    }
  },
};

let override: SmsProvider | undefined;
/** Test hook. */
export const setSmsProviderForTests = (p: SmsProvider | undefined) => void (override = p);

export function getSmsProvider(): SmsProvider {
  if (override) return override;
  if (env().SMS_PROVIDER === "msg91") return msg91Provider;
  if (env().SMS_PROVIDER === "console") return consoleProvider;
  throw new OtpDisabledError();
}
