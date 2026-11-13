import { env, isProd } from "./env";

export interface SmsProvider {
  send(toE164: string, message: string): Promise<void>;
}

export class OtpDisabledError extends Error {
  constructor() {
    super("OTP delivery is not configured (SMS_PROVIDER)");
  }
}

/** Development only: prints the message to the server console. Refuses to run in production. */
const consoleProvider: SmsProvider = {
  async send(to, message) {
    if (isProd()) throw new OtpDisabledError();
    console.info(`[sms:console] → ${to}: ${message}`);
  },
};

let override: SmsProvider | undefined;
/** Test hook. */
export const setSmsProviderForTests = (p: SmsProvider | undefined) => void (override = p);

/**
 * Real delivery (e.g. MSG91) is deliberately not implemented yet: it needs DLT registration and an approved
 * template. Add it here as another branch; OTP login stays disabled in production until then.
 */
export function getSmsProvider(): SmsProvider {
  if (override) return override;
  if (env().SMS_PROVIDER === "console") return consoleProvider;
  throw new OtpDisabledError();
}
