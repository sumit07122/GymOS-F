import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  OTP_SECRET: z.string().min(32).optional(),
  SMS_PROVIDER: z.enum(["console", "none"]).default("none"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("FIXIA GymOS <onboarding@resend.dev>"),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default("uploads"),
  STORAGE_REGION: z.string().default("ap-southeast-1"),
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

/** Parsed lazily so that `next build` never needs runtime secrets. */
export function env(): Env {
  return (cached ??= schema.parse(process.env));
}

export function otpSecret(): string {
  const s = env().OTP_SECRET;
  if (!s) throw new Error("OTP_SECRET (32+ chars) is required for OTP login");
  return s;
}

export const isProd = () => env().NODE_ENV === "production";
